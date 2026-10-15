// Подарункові сертифікати: клієнт купує через monobank (або студія випускає вручну),
// отримує PDF-листівку з кодом; той, кому подарували, відкриває посилання ?start=gift_КОД
// або вводить код — і сума сертифіката зараховується як оплата його заявки.
// data.gifts = [{ code, amount, status: 'pending'|'active'|'redeemed'|'failed'|'cancelled', until, createdAt, paidAt,
//                 buyerId, buyerName, from, source: 'mono'|'manual', paid, invoiceId, pageUrl, redeemedBy, orderId, redeemedAt }]
import crypto from 'node:crypto';
import { store } from './store.js';
import { log } from './log.js';
import { todayKey, dateText, orderNo, escapeHtml } from './util.js';
import { renderCertificatePdf } from './pdf/certificate.js';
import { langOf } from './lang.js';
import * as T from './texts.js';

const ACTIVE_INVOICE = new Set(['created', 'processing', 'hold']);
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без схожих символів (0/O, 1/I)

export class GiftError extends Error {}

export const GIFT_DEFAULTS = { enabled: false, amounts: [1500, 3000, 5000], validityDays: 180 };

export function giftSettings() {
  const c = store.data.config;
  c.gifts = { ...GIFT_DEFAULTS, ...(c.gifts || {}) };
  return c.gifts;
}

export function giftList() {
  return (store.data.gifts ||= []);
}

function newCode() {
  const part = () => Array.from(crypto.randomBytes(4), (b) => ALPHABET[b % ALPHABET.length]).join('');
  let code;
  do code = `GIFT-${part()}-${part()}`; while (giftList().some((g) => g.code === code));
  return code;
}

const normCode = (code) => String(code || '').trim().toUpperCase();

/** Чинний сертифікат за кодом (активний і не прострочений) або null. */
export function findGift(code) {
  const g = giftList().find((x) => x.code === normCode(code));
  if (!g || g.status !== 'active') return null;
  if (g.until && g.until < todayKey()) return null;
  return g;
}

export const giftLink = (code) => (store.data.bot.username ? `https://t.me/${store.data.bot.username}?start=gift_${code}` : code);

export function certificatePdf(g, lang = 'uk') {
  return renderCertificatePdf({ code: g.code, amount: g.amount, until: g.until, from: g.from || '' }, giftLink(g.code), lang);
}

function activate(g) {
  g.code = g.code || newCode();
  g.status = 'active';
  g.until = todayKey(new Date(Date.now() + giftSettings().validityDays * 86400000));
}

/** Сертифікат, випущений студією вручну (продали за готівку чи даруєте самі). */
export function issueManual({ amount, from = '', paid = true, note = '' }) {
  const value = Math.round(Number(amount));
  if (!(value >= 100 && value <= 100000)) throw new GiftError('Сумма сертификата — от 100 до 100 000 грн.');
  const g = { amount: value, status: 'pending', createdAt: new Date().toISOString(), source: 'manual', paid: Boolean(paid), from: String(from).trim().slice(0, 40), note: String(note).trim().slice(0, 100) };
  activate(g);
  if (g.paid) g.paidAt = g.createdAt;
  giftList().unshift(g);
  store.saveNow();
  log.info(`Выпущен сертификат ${g.code} на ${g.amount} грн (вручную)`);
  return g;
}

/** Погасити сертифікат на заявку: його сума стає оплатою заявки. */
export function redeem(g, order) {
  g.status = 'redeemed';
  g.redeemedBy = order.userId;
  g.orderId = order.id;
  g.redeemedAt = new Date().toISOString();
  order.gift = { code: g.code, amount: g.amount };
  (order.payments ||= []).push({
    invoiceId: null, amount: g.amount, kind: 'gift', status: 'manual',
    createdAt: g.redeemedAt, paidAt: g.redeemedAt, by: `сертификат ${g.code}`,
  });
}

export class GiftFlow {
  constructor(handlers) {
    this.h = handlers;
    this.polling = false;
  }

  get data() { return store.data; }

  /** Чи може клієнт купити сертифікат сам (потрібна ввімкнена оплата monobank). */
  get available() {
    return giftSettings().enabled && this.h.payments.enabled;
  }

  async offer(chatId) {
    const L = this.h.t(chatId);
    const s = giftSettings();
    if (!this.available) return this.h.send(chatId, L.GIFT_UNAVAILABLE);
    return this.h.send(chatId, L.giftOffer(s.amounts, s.validityDays), L.giftAmountsKeyboard(s.amounts));
  }

  /** Клієнт обрав суму — виставляємо рахунок monobank. */
  async buy(cb, amountText) {
    const L = this.h.t(cb.from.id);
    const amount = Number(amountText);
    if (!this.available || !giftSettings().amounts.includes(amount)) return this.h.answer(cb, L.GIFT_UNAVAILABLE, true);
    await this.h.answer(cb);
    // Не більше одного неоплаченого рахунку на людину: та сама сума — той самий рахунок
    const open = giftList().find((g) => g.status === 'pending' && !g.replaced && g.buyerId === cb.from.id && ACTIVE_INVOICE.has(g.invoiceStatus || 'created')
      && Date.now() - Date.parse(g.createdAt) < 23 * 3600 * 1000);
    if (open && open.amount === amount) return this.h.send(cb.message.chat.id, L.giftInvoice(amount), L.payKeyboard(open.pageUrl, amount));
    if (open) {
      // Старий рахунок відкликаємо, але не позначаємо скасованим наосліп: якщо його встигли оплатити,
      // перевірка оплат (poll) побачить це й видасть сертифікат; інакше monobank сам закриє рахунок.
      open.replaced = true;
      this.h.payments.client().remove(open.invoiceId).catch(() => {});
    }
    const reference = `YABOT-GIFT-${crypto.randomBytes(4).toString('hex')}`;
    let invoice;
    try {
      invoice = await this.h.payments.client().create({
        amount: amount * 100, ccy: 980,
        merchantPaymInfo: { reference, destination: 'Подарунковий сертифікат YABOT' },
        redirectUrl: this.data.bot.username ? `https://t.me/${this.data.bot.username}` : undefined,
        validity: 24 * 3600, paymentType: 'debit',
      });
    } catch (err) {
      log.warn(`Счёт на сертификат не создан: ${err.message}`);
      store.addError('payments', err);
      return this.h.send(cb.message.chat.id, L.GIFT_UNAVAILABLE);
    }
    const name = [cb.from.first_name, cb.from.last_name].filter(Boolean).join(' ');
    const g = {
      amount, status: 'pending', createdAt: new Date().toISOString(), source: 'mono', paid: false,
      buyerId: cb.from.id, buyerName: cb.from.username ? `@${cb.from.username}` : name, from: cb.from.first_name || '',
      invoiceId: invoice.invoiceId, pageUrl: invoice.pageUrl, invoiceStatus: 'created',
    };
    giftList().unshift(g);
    store.saveNow();
    return this.h.send(cb.message.chat.id, L.giftInvoice(amount), L.payKeyboard(invoice.pageUrl, amount));
  }

  /** Перевірка оплати сертифікатів (разом з рахунками заявок, раз на 30 с). */
  async poll() {
    if (this.polling) return;
    const pending = giftList().filter((g) => g.status === 'pending' && g.invoiceId && ACTIVE_INVOICE.has(g.invoiceStatus || 'created'));
    if (!pending.length || !this.h.payments.token()) return;
    this.polling = true;
    try {
      const mono = this.h.payments.client();
      for (const g of pending) {
        // Замінений рахунок довше доби (термін рахунку) — точно не оплачено
        if (g.replaced && Date.now() - Date.parse(g.createdAt) > 25 * 3600 * 1000) { g.status = 'cancelled'; store.save(); continue; }
        let st;
        try { st = await mono.status(g.invoiceId); } catch (err) {
          if (g.replaced && /not found|invalid/i.test(err.message)) { g.status = 'cancelled'; store.save(); continue; }
          log.warn(`Статус сертификата не получен: ${err.message}`);
          continue;
        }
        if (!st.status || st.status === g.invoiceStatus) continue;
        g.invoiceStatus = st.status;
        if (st.status === 'success') {
          activate(g);
          g.paid = true;
          g.paidAt = new Date().toISOString();
          store.saveNow();
          await this.deliver(g).catch((err) => log.warn(`Сертификат ${g.code} не доставлен: ${err.message}`));
          const studio = this.data.config.adminChatId;
          if (studio) await this.h.send(studio, `🎁 <b>Продан сертификат</b> на ${T.money(g.amount)} — ${escapeHtml(g.buyerName || String(g.buyerId))}. Код ${escapeHtml(g.code)}.`).catch(() => {});
          log.info(`Сертификат ${g.code} оплачен: ${g.amount} грн`);
        } else if (['failure', 'expired', 'reversed'].includes(st.status)) {
          g.status = g.replaced ? 'cancelled' : 'failed';
          store.saveNow();
        } else store.save();
      }
    } finally {
      this.polling = false;
    }
  }

  /** Надіслати покупцеві PDF-листівку й посилання для подарунка. */
  async deliver(g, chatId = g.buyerId) {
    const lang = langOf(chatId);
    const L = this.h.t(chatId);
    const link = giftLink(g.code);
    await this.h.send(chatId, L.giftReady(g, link, dateText(g.until)), L.giftShareKeyboard(link, g.amount));
    await this.h.tg.sendFile('sendDocument', 'document', chatId, certificatePdf(g, lang), `YABOT_gift_${g.code}.pdf`, 'application/pdf');
  }

  /** /start gift_КОД — зберегти сертифікат за людиною до наступної заявки. */
  async claim(chatId, userId, code) {
    const L = this.h.t(userId);
    const g = findGift(code);
    if (!g) return this.h.send(chatId, L.GIFT_BAD);
    this.data.users[String(userId)].pendingGift = g.code;
    store.save();
    return this.h.send(chatId, L.giftSaved(g, dateText(g.until)), L.mainMenu());
  }

  /** При відправці заявки: погасити збережений сертифікат. Повертає примітку для клієнта або ''. */
  applyOnSubmit(order, userId) {
    const user = this.data.users[String(userId)];
    const g = user?.pendingGift && findGift(user.pendingGift);
    if (!g) return '';
    redeem(g, order);
    delete user.pendingGift;
    log.info(`Сертификат ${g.code} погашен заявкой #${orderNo(order.id)}`);
    return this.h.t(userId).giftApplied(g);
  }
}
