// Оплата авансу через monobank (Plata by mono, API еквайрингу).
// Рахунок: POST /api/merchant/invoice/create → посилання на сторінку оплати.
// Статус перевіряємо самі (GET /api/merchant/invoice/status) раз на 30 с — вебхук не потрібен,
// бо бот доступний лише через Tailscale і monobank до нього не достукається.
// order.payments = [{ invoiceId, pageUrl, amount, note, status, createdAt, expiresAt, paidAt, reference, by }]
import crypto from 'node:crypto';
import { store } from './store.js';
import { log } from './log.js';
import { orderNo, formatDate, escapeHtml } from './util.js';
import * as T from './texts.js';
import { paidTotal, remaining, orderAmount, isOpen } from './orders.js';
import { projectStage } from './services.js';
import { langOf } from './lang.js';
import { sendAgentEvent } from './genagent.js';

/**
 * План оплати за етапами для показу: суми, статуси (paid — оплачено, awaiting — рахунок виставлено,
 * due — етап настав, later — пізніше). Оплачене рахуємо накопичено: ручні позначки теж зараховуються.
 */
export function stagePlanView(order) {
  const plan = order.payPlan;
  if (!plan?.length) return null;
  const ps = projectStage(order);
  const price = orderAmount(order);
  const paid = paidTotal(order);
  let cum = 0;
  return plan.map((e, i) => {
    const before = cum;
    cum += e.percent;
    const amount = price ? Math.round((price * cum) / 100) - Math.round((price * before) / 100) : null;
    const reached = order.status === 'done' || Boolean(ps && ps.idx >= e.idx);
    const p = Number.isInteger(e.pay) ? order.payments?.[e.pay] : null;
    const status = price && paid >= Math.round((price * cum) / 100) - 0.5 ? 'paid'
      : p && (ACTIVE.has(p.status) || CARD_OPEN.has(p.status)) ? 'awaiting' : reached ? 'due' : 'later';
    return { idx: e.idx, percent: e.percent, amount, status, stage: ps?.steps[e.idx] || '', stageEn: ps?.stepsEn[e.idx] || '' };
  });
}

const API = process.env.MONOBANK_API || 'https://api.monobank.ua';
const ACTIVE = new Set(['created', 'processing', 'hold']);
// Переказ на картку: чекаємо оплату / клієнт написав, що оплатив
const CARD_OPEN = new Set(['awaiting', 'reported']);
const FINAL_BAD = new Set(['failure', 'reversed', 'expired']);

export class PaymentError extends Error {}

export const PAYMENT_DEFAULTS = {
  enabled: false, token: '', mode: 'percent', percent: 50, fixed: 1000, validityHours: 24,
  destination: 'Аванс за стікерпак, замовлення #{номер}', autoStart: true, autoInvoice: false,
  // Оплата переказом на картку (без ФОП): реквізити показуються клієнту, оплату підтверджує студія
  cardEnabled: false, cardNumber: '', cardRecipient: '', cardNote: '',
  // Автонагадування про залишок готового замовлення: через N днів (0 — вимкнено), не більше remindTimes разів
  remindDays: 0, remindTimes: 2,
};
const AUTO_BY = 'автонапоминание';

export class MonoClient {
  constructor(token) { this.token = token; }

  async call(method, path, body) {
    let res;
    try {
      res = await fetch(`${API}${path}`, {
        method,
        headers: { 'X-Token': this.token, ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20000),
      });
    } catch (err) {
      throw new PaymentError(`Нет связи с monobank (${err.cause?.code || err.name})`);
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const text = json.errText || json.errorDescription || `HTTP ${res.status}`;
      throw new PaymentError(res.status === 403 || res.status === 401 ? `monobank не принял токен (${text})` : `monobank: ${text}`);
    }
    return json;
  }

  details() { return this.call('GET', '/api/merchant/details'); }
  create(body) { return this.call('POST', '/api/merchant/invoice/create', body); }
  status(invoiceId) { return this.call('GET', `/api/merchant/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`); }
  remove(invoiceId) { return this.call('POST', '/api/merchant/invoice/remove', { invoiceId }); }
}

export class PaymentFlow {
  constructor(handlers) {
    this.h = handlers;
    this.polling = false;
  }

  get data() { return store.data; }

  settings() {
    return (this.data.config.payments = { ...PAYMENT_DEFAULTS, ...(this.data.config.payments || {}) });
  }

  /** Токен: секрет панелі MONOBANK_TOKEN має пріоритет над збереженим на сторінці. */
  token() {
    return (process.env.MONOBANK_TOKEN || this.settings().token || '').trim();
  }

  tokenSource() {
    if (process.env.MONOBANK_TOKEN) return 'env';
    return this.settings().token ? 'page' : null;
  }

  client() {
    const token = this.token();
    if (!token) throw new PaymentError('Не задан токен monobank (Настройки → Оплата аванса).');
    return new MonoClient(token);
  }

  get enabled() { return Boolean(this.settings().enabled); }

  /** Переказ на картку налаштовано. */
  get cardEnabled() {
    const s = this.settings();
    return Boolean(s.cardEnabled && String(s.cardNumber || '').trim());
  }

  /** Можна запросити оплату: monobank або картка. */
  get canRequest() { return this.enabled || this.cardEnabled; }

  current(order) { return order.payments?.at(-1) || null; }

  hasActive(order) {
    const st = this.current(order)?.status;
    return ACTIVE.has(st) || CARD_OPEN.has(st);
  }

  /**
   * Рекомендована сума: якщо аванс уже сплачено — залишок до погодженої ціни,
   * інакше аванс (% від ціни або фіксована сума).
   */
  suggest(order) {
    const s = this.settings();
    const priceText = order.studio?.price || '';
    const price = orderAmount(order);
    const paid = paidTotal(order);
    if (paid > 0 && price > paid) {
      const rest = remaining(order);
      return { amount: Math.round(rest), basis: `остаток: ${price} − оплачено ${paid}`, note: 'залишок', kind: 'final' };
    }
    if (paid > 0) return { amount: 0, basis: 'уже оплачено полностью', note: '', kind: 'final' };
    if (s.mode === 'percent' && price > 0) {
      return { amount: Math.round((price * s.percent) / 100), basis: `${s.percent}% от «${priceText}»`, note: `${s.percent}% від вартості`, kind: 'advance' };
    }
    if (s.mode === 'fixed' && s.fixed > 0) return { amount: Math.round(s.fixed), basis: 'фиксированный аванс', note: '', kind: 'advance' };
    return { amount: 0, basis: '', note: '', kind: 'advance' };
  }

  async createInvoice(order, amountUah, { who = 'страница бота', note, kind, intro = '' } = {}) {
    if (!this.enabled) throw new PaymentError('Оплата выключена (Настройки → Оплата аванса).');
    const amount = Math.round(Number(amountUah) * 100) / 100;
    if (!(amount >= 1 && amount <= 500000)) throw new PaymentError('Сумма — от 1 до 500 000 грн.');
    if (!isOpen(order) && order.status !== 'done') throw new PaymentError('Заявка закрыта.');
    const payKind = ['advance', 'final', 'full', 'stage'].includes(kind) ? kind : this.suggest(order).kind;
    if (this.hasActive(order)) throw new PaymentError('По заявке уже есть неоплаченный счёт — отмените его или дождитесь оплаты.');

    const s = this.settings();
    const reference = `YABOT-${orderNo(order.id)}-${crypto.randomBytes(3).toString('hex')}`;
    const template = payKind === 'advance' ? String(s.destination || PAYMENT_DEFAULTS.destination) : 'Оплата стікерпаку, замовлення #{номер}';
    const destination = template.replace(/\{номер\}/g, orderNo(order.id)).slice(0, 280);
    const validity = Math.max(1, Math.min(24 * 30, Number(s.validityHours) || 24)) * 3600;
    const invoice = await this.client().create({
      amount: Math.round(amount * 100), // у копійках
      ccy: 980,
      merchantPaymInfo: { reference, destination },
      redirectUrl: this.data.bot.username ? `https://t.me/${this.data.bot.username}` : undefined,
      validity,
      paymentType: 'debit',
    });
    if (!invoice.invoiceId || !invoice.pageUrl) throw new PaymentError('monobank не вернул ссылку на оплату.');

    const p = {
      invoiceId: invoice.invoiceId, pageUrl: invoice.pageUrl, amount, note: note ?? this.suggest(order).note, kind: payKind,
      status: 'created', reference, createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + validity * 1000).toISOString(), by: who,
    };
    (order.payments ||= []).push(p);
    store.saveNow();
    try {
      const L = this.h.t(order.userId);
      await this.h.send(order.userId, (intro ? intro + '\n\n' : '') + L.payInvoiceMessage(order, p, formatDate(p.expiresAt)), this.h.withClientApp(L.payKeyboard(p.pageUrl, amount), order.id, order.userId));
    } catch (err) {
      p.deliveryError = err.description || err.message;
      log.warn(`Счёт по #${orderNo(order.id)} создан, но клиенту не доставлен: ${p.deliveryError}`);
    }
    (order.messages ||= []).push({ at: p.createdAt, from: 'studio', via: 'telegram', text: `[счёт${payKind === 'advance' ? ' на аванс' : ''}: ${T.money(amount)}]` });
    await this.h.updateCard(order);
    store.saveNow();
    log.info(`Счёт на аванс ${T.money(amount)} по #${orderNo(order.id)} выставлен (${who})`);
    return p;
  }

  /**
   * Автонагадування про залишок: замовлення готове, ціна є, сплачено не все.
   * Перше — через remindDays після «Готово», друге — ще через стільки ж. Лише вдень.
   * Рахунок, який виставила сама студія, не чіпаємо; свій (автонагадування) — надсилаємо ще раз.
   */
  async remindRemaining(daytime) {
    const s = this.settings();
    const days = Number(s.remindDays) || 0;
    if (!days || !daytime || !this.canRequest) return 0;
    const times = Math.min(2, Math.max(1, Number(s.remindTimes) || 2));
    const gap = days * 24 * 3600 * 1000;
    const now = Date.now();
    let sent = 0;
    for (const o of this.data.inquiries) {
      if (o.status !== 'done' || o.archived || !(remaining(o) > 0)) continue;
      const r = o.payRemind || { n: 0 };
      if (r.n >= times || now - (Date.parse(r.at || o.doneAt) || now) < gap) continue;
      if (this.data.users[String(o.userId)]?.blocked) continue;
      const cur = this.current(o);
      const active = this.hasActive(o);
      if (active && (cur.by !== AUTO_BY || !['created', 'awaiting'].includes(cur.status))) continue;
      if (active && cur.expiresAt && Date.parse(cur.expiresAt) < now) continue; // прострочений рахунок закриє перевірка статусу
      const amount = remaining(o);
      const L = this.h.t(o.userId);
      const intro = L.payRemindIntro(o, amount);
      o.payRemind = { n: r.n + 1, at: new Date(now).toISOString() };
      store.saveNow();
      try {
        if (active) {
          const idx = o.payments.length - 1;
          const markup = cur.method === 'card' ? L.cardPaidKeyboard(this.data.orderEpoch, o.id, idx) : L.payKeyboard(cur.pageUrl, cur.amount);
          const text = cur.method === 'card' ? L.cardPayMessage(o, cur, s) : L.payInvoiceMessage(o, cur, cur.expiresAt ? formatDate(cur.expiresAt) : '');
          await this.h.send(o.userId, intro + '\n\n' + text, this.h.withClientApp(markup, o.id, o.userId));
          (o.messages ||= []).push({ at: new Date().toISOString(), from: 'studio', via: 'telegram', text: `[напоминание об оплате: ${T.money(cur.amount)}]` });
        } else if (this.enabled) {
          await this.createInvoice(o, amount, { who: AUTO_BY, kind: 'final', intro });
        } else {
          await this.requestCard(o, amount, { who: AUTO_BY, kind: 'final', intro });
        }
        this.data.stats.payReminders = (this.data.stats.payReminders || 0) + 1;
        sent++;
        log.info(`Напоминание об оплате остатка по #${orderNo(o.id)} (${o.payRemind.n}/${times})`);
      } catch (err) {
        log.warn(`Напоминание об оплате по #${orderNo(o.id)} не отправлено: ${err.description || err.message}`);
      }
    }
    if (sent) store.saveNow();
    return sent;
  }

  /**
   * План оплати: щойно настав етап із платежем, а попередні оплачено — бот сам виставляє рахунок
   * (monobank або реквізити картки). Автоматично — один раз на платіж плану.
   */
  async stagePlanCheck(order) {
    const plan = order.payPlan;
    if (!plan?.length || !this.canRequest || this.hasActive(order) || !isOpen(order)) return null;
    const price = orderAmount(order);
    if (!price) return null;
    const view = stagePlanView(order);
    const i = view.findIndex((v) => v.status !== 'paid');
    if (i < 0 || view[i].status !== 'due' || plan[i].invoicedAt) return null;
    const cum = plan.slice(0, i + 1).reduce((s, e) => s + e.percent, 0);
    const amount = i === plan.length - 1 ? remaining(order) : Math.round((price * cum) / 100) - paidTotal(order);
    if (!(amount >= 1)) return null;
    const L = this.h.t(order.userId);
    const name = langOf(order.userId) === 'en' ? view[i].stageEn : view[i].stage;
    const intro = L.stagePayIntro(name, plan[i].percent);
    plan[i].invoicedAt = new Date().toISOString();
    store.saveNow();
    const p = this.enabled
      ? await this.createInvoice(order, amount, { who: 'план оплаты', kind: 'stage', note: `${plan[i].percent}%`, intro })
      : await this.requestCard(order, amount, { who: 'план оплаты', kind: 'stage', intro });
    plan[i].pay = order.payments.indexOf(p);
    store.saveNow();
    log.info(`План оплаты #${orderNo(order.id)}: счёт ${T.money(amount)} за этап «${view[i].stage}»`);
    return p;
  }

  async cancelInvoice(order) {
    const cur = this.current(order);
    if (cur && CARD_OPEN.has(cur.status)) {
      cur.status = 'cancelled';
      cur.closedAt = new Date().toISOString();
      await this.h.updateCard(order);
      store.saveNow();
      return;
    }
    if (!cur || !ACTIVE.has(cur.status)) throw new PaymentError('Нет активного счёта.');
    try { await this.client().remove(cur.invoiceId); } catch (err) {
      // Якщо monobank уже закрив рахунок — просто позначаємо в себе
      if (!/not found|expired|invalid/i.test(err.message)) throw err;
    }
    cur.status = 'cancelled';
    cur.closedAt = new Date().toISOString();
    await this.h.updateCard(order);
    store.saveNow();
    log.info(`Счёт по #${orderNo(order.id)} отменён`);
  }

  /**
   * Ручна позначка «оплачено» (готівкою чи переказом). Працює й тоді, коли оплату через monobank вимкнено.
   * notifyClient — надіслати клієнту подяку за аванс.
   */
  async markPaid(order, amountUah, { notifyClient = false, kind } = {}) {
    const amount = Math.round(Number(amountUah) * 100) / 100;
    if (!(amount > 0 && amount <= 500000)) throw new PaymentError('Укажите сумму (до 500 000 грн).');
    if (!isOpen(order) && order.status !== 'done') throw new PaymentError('Заявка закрыта.');
    const payKind = ['advance', 'final', 'full', 'stage'].includes(kind) ? kind : this.suggest(order).kind;
    const cur = this.current(order);
    if (cur && (ACTIVE.has(cur.status) || CARD_OPEN.has(cur.status))) {
      await this.cancelInvoice(order).catch(() => { cur.status = 'cancelled'; });
    }
    (order.payments ||= []).push({ invoiceId: null, amount, kind: payKind, status: 'manual', createdAt: new Date().toISOString(), paidAt: new Date().toISOString(), by: 'вручную' });
    await this.afterPaid(order, amount, notifyClient, payKind);
  }

  /** Скасувати помилкову ручну позначку (запис лишається в історії як «отметка отменена»). */
  async unmarkPaid(order) {
    const cur = this.current(order);
    if (!cur || cur.status !== 'manual') throw new PaymentError('Последняя запись — не ручная отметка; отменять нечего.');
    cur.status = 'voided';
    cur.voidedAt = new Date().toISOString();
    (order.messages ||= []).push({ at: cur.voidedAt, from: 'studio', via: 'page', text: `[отметка об оплате ${T.money(cur.amount)} отменена]` });
    await this.h.updateCard(order);
    store.saveNow();
    log.info(`Ручная отметка аванса по #${orderNo(order.id)} отменена`);
  }

  async afterPaid(order, amount, notifyClient = true, kind = 'advance') {
    sendAgentEvent(order.userId, 'paid', 'Оплата', amount);
    store.saveNow();
    if (notifyClient) await this.h.send(order.userId, this.h.t(order.userId).payPaidClient(order, amount, kind)).catch(() => {});
    const studio = this.data.config.adminChatId;
    if (studio) {
      const reply = order.adminMessage && String(order.adminMessage.chatId) === String(studio)
        ? { reply_parameters: { message_id: order.adminMessage.messageId, allow_sending_without_reply: true } } : {};
      await this.h.send(studio, T.payPaidStudio(order, amount, kind), null, reply).catch(() => {});
    }
    if (this.settings().autoStart && order.status === 'new') {
      await this.h.setOrderStatus(order, 'in_progress', { who: 'оплата', notifyClient: false });
    } else {
      await this.h.updateCard(order);
    }
    (order.messages ||= []).push({ at: new Date().toISOString(), from: 'client', text: `[${kind === 'advance' ? 'аванс оплачен' : 'оплата получена'}: ${T.money(amount)}]` });
    store.saveNow();
    log.info(`${kind === 'advance' ? 'Аванс' : 'Оплата'} по #${orderNo(order.id)}: ${T.money(amount)}`);
    // План оплати: якщо вже настав наступний етап із платежем — одразу наступний рахунок
    await this.stagePlanCheck(order).catch((err) => log.warn(`План оплаты: ${err.message}`));
  }

  /** Перевірка статусів активних рахунків (раз на 30 с). */
  async poll() {
    if (this.polling) return;
    const pending = this.data.inquiries.filter((o) => ACTIVE.has(this.current(o)?.status));
    if (!pending.length || !this.token()) return;
    this.polling = true;
    try {
      const mono = this.client();
      for (const order of pending) {
        const p = this.current(order);
        let st;
        try { st = await mono.status(p.invoiceId); } catch (err) {
          log.warn(`Статус счёта #${orderNo(order.id)} не получен: ${err.message}`);
          continue;
        }
        if (!st.status || st.status === p.status) continue;
        // Поки чекали відповідь monobank, рахунок скасували (клієнт відмінив заявку чи студія відхилила).
        // Не «оживляємо» його — окрім випадку, коли гроші все ж надійшли: оплату треба зарахувати.
        if (!ACTIVE.has(p.status) && st.status !== 'success') continue;
        p.status = st.status;
        if (st.status === 'success') {
          p.paidAt = new Date().toISOString();
          if (st.finalAmount) p.finalAmount = st.finalAmount / 100;
          await this.afterPaid(order, p.finalAmount || p.amount, true, p.kind || 'advance');
        } else if (FINAL_BAD.has(st.status)) {
          p.closedAt = new Date().toISOString();
          p.failureReason = st.failureReason || null;
          store.saveNow();
          const studio = this.data.config.adminChatId;
          if (studio) await this.h.send(studio, T.payFailedStudio(order, st.status, st.failureReason)).catch(() => {});
          if (st.status === 'expired') await this.h.send(order.userId, this.h.t(order.userId).payExpiredClient(order)).catch(() => {});
          await this.h.updateCard(order);
        } else {
          store.save();
        }
      }
    } finally {
      this.polling = false;
    }
  }

  // --- Студія в Telegram: «💳 Рахунок на аванс» ---

  async startAsk(cb, epoch, id) {
    const order = this.data.inquiries.find((o) => o.id === Number(id));
    if ((epoch || undefined) !== (this.data.orderEpoch || undefined) || !order) return this.h.answer(cb, 'Цієї заявки вже немає.', true);
    if (!this.canRequest) return this.h.answer(cb, 'Оплата вимкнена в налаштуваннях.', true);
    const cur = this.current(order);
    if (this.hasActive(order)) return this.h.answer(cb, `Рахунок на ${T.money(cur.amount)} уже чекає оплати.`, true);
    await this.h.answer(cb);
    const s = this.suggest(order);
    this.data.paySession = { orderId: order.id, epoch: this.data.orderEpoch, note: s.note };
    store.save();
    return this.h.send(cb.message.chat.id, T.payAskAmount(order, s.amount, s.basis), T.payAskKeyboard(s.amount, order.id));
  }

  /** Сума, надіслана текстом під час запиту. Повертає true, якщо оброблено. */
  async captureStudio(m) {
    const s = this.data.paySession;
    if (!s || !m.text || m.text.startsWith('/')) return false;
    const amount = Number(m.text.replace(/\s/g, '').replace(',', '.').replace(/грн|uah/gi, ''));
    if (!(amount > 0)) {
      // Іде збір ескізів — текст належить їм, а не запиту суми
      if (this.h.sketches.session(m.chat.id)) return false;
      await this.h.send(m.chat.id, 'Пришлите сумму числом, например 1500 — или нажмите «Отмена».');
      return true;
    }
    await this.finishAsk(m.chat.id, amount, '');
    return true;
  }

  async onAskButton(cb, data) {
    const s = this.data.paySession;
    // pya:<заявка>:<сума>; кнопка без номера заявки (до 4.1.5) чи від іншого запиту — застаріла
    const [, idText, amountText] = data.split(':');
    if (data !== 'pyc' && (!s || amountText === undefined || Number(idText) !== s.orderId)) {
      await this.h.removeButtons(cb.message);
      return this.h.answer(cb, 'Этот запрос суммы уже неактуален — нажмите «💳» на карточке заявки ещё раз.', true);
    }
    await this.h.answer(cb);
    await this.h.removeButtons(cb.message);
    if (data === 'pyc') { this.data.paySession = null; store.save(); return; }
    await this.finishAsk(cb.message.chat.id, Number(amountText), s.note);
  }

  async finishAsk(chatId, amount, note) {
    const s = this.data.paySession;
    this.data.paySession = null;
    store.save();
    const order = s && this.data.inquiries.find((o) => o.id === s.orderId);
    if (!order || (s.epoch || undefined) !== (this.data.orderEpoch || undefined)) return;
    try {
      // monobank — якщо ввімкнено, інакше реквізити картки
      const p = this.enabled
        ? await this.createInvoice(order, amount, { who: 'Telegram', note })
        : await this.requestCard(order, amount, { who: 'Telegram' });
      await this.h.send(chatId, T.paySentStudio(order, p.amount) + (p.deliveryError ? `\n⚠️ Клиенту не доставлено: ${escapeHtml(p.deliveryError)}` : ''));
    } catch (err) {
      await this.h.send(chatId, `⚠️ ${escapeHtml(err.message)}`);
    }
  }
}

// --- Переказ на картку (окремо від monobank) ---

/** Додає до PaymentFlow запит оплати на картку та підтвердження. */
Object.assign(PaymentFlow.prototype, {
  /** Надіслати клієнту реквізити картки й кнопку «Я оплатив». */
  async requestCard(order, amountUah, { who = 'страница бота', kind, intro = '' } = {}) {
    if (!this.cardEnabled) throw new PaymentError('Не указаны реквизиты карты (Настройки → Оплата).');
    const amount = Math.round(Number(amountUah) * 100) / 100;
    if (!(amount >= 1 && amount <= 500000)) throw new PaymentError('Сумма — от 1 до 500 000 грн.');
    if (!isOpen(order) && order.status !== 'done') throw new PaymentError('Заявка закрыта.');
    if (this.hasActive(order)) throw new PaymentError('По заявке уже ждёт оплата — отмените её или подтвердите.');
    const payKind = ['advance', 'final', 'full', 'stage'].includes(kind) ? kind : this.suggest(order).kind;
    const p = { invoiceId: null, method: 'card', amount, kind: payKind, status: 'awaiting', createdAt: new Date().toISOString(), by: who };
    (order.payments ||= []).push(p);
    store.saveNow();
    const L = this.h.t(order.userId);
    const s = this.settings();
    const idx = order.payments.length - 1;
    try {
      await this.h.send(order.userId, (intro ? intro + '\n\n' : '') + L.cardPayMessage(order, p, s), this.h.withClientApp(L.cardPaidKeyboard(this.data.orderEpoch, order.id, idx), order.id, order.userId));
    } catch (err) {
      p.deliveryError = err.description || err.message;
    }
    (order.messages ||= []).push({ at: p.createdAt, from: 'studio', via: who === 'Telegram' ? 'telegram' : 'page', text: `[реквизиты для оплаты: ${T.money(amount)}]` });
    await this.h.updateCard(order);
    store.saveNow();
    log.info(`Реквизиты карты на ${T.money(amount)} по #${orderNo(order.id)} отправлены (${who})`);
    return p;
  },

  /** Клієнт натиснув «Я оплатив». */
  async onCardReported(cb, epoch, id, idxText) {
    const L = this.h.t(cb.from.id);
    const order = (epoch || undefined) === (this.data.orderEpoch || undefined)
      && this.data.inquiries.find((o) => o.id === Number(id) && o.userId === cb.from.id);
    const p = order?.payments?.[Number(idxText)];
    if (!order || !p || p.method !== 'card' || !CARD_OPEN.has(p.status)) return this.h.answer(cb, L.MSG.buttonGone, true);
    await this.h.answer(cb);
    await this.h.removeButtons(cb.message);
    if (p.status === 'reported') return undefined;
    p.status = 'reported';
    p.reportedAt = new Date().toISOString();
    store.saveNow();
    await this.h.send(cb.message.chat.id, L.CARD_REPORTED_CLIENT);
    const studio = this.data.config.adminChatId;
    if (studio) {
      const reply = order.adminMessage && String(order.adminMessage.chatId) === String(studio)
        ? { reply_parameters: { message_id: order.adminMessage.messageId, allow_sending_without_reply: true } } : {};
      await this.h.send(studio, T.cardReportedStudio(order, p), T.cardConfirmKeyboard(this.data.orderEpoch, order.id, Number(idxText)), reply).catch(() => {});
    }
    await this.h.updateCard(order);
    return undefined;
  },

  /** Студія підтверджує надходження (або «не прийшло»). */
  async confirmCard(order, idx, received, who = 'страница бота') {
    const p = order.payments?.[idx];
    if (!p || p.method !== 'card' || !CARD_OPEN.has(p.status)) throw new PaymentError('Этот платёж уже обработан.');
    if (received) {
      p.status = 'manual';
      p.paidAt = new Date().toISOString();
      p.by = `перевод на карту (${who})`;
      await this.afterPaid(order, p.amount, true, p.kind || 'advance');
      return p;
    }
    p.status = 'awaiting';
    delete p.reportedAt;
    store.saveNow();
    const L = this.h.t(order.userId);
    await this.h.send(order.userId, L.cardNotReceived(order, p), this.h.withClientApp(L.cardPaidKeyboard(this.data.orderEpoch, order.id, idx), order.id, order.userId)).catch(() => {});
    await this.h.updateCard(order);
    return p;
  },

  /** Кнопки «Підтвердити» / «Не прийшло» в чаті власника. */
  async onCardConfirmButton(cb, data) {
    const [kind, epoch, id, idxText] = data.split(':');
    const order = (epoch || undefined) === (this.data.orderEpoch || undefined) && this.data.inquiries.find((o) => o.id === Number(id));
    if (!order) return this.h.answer(cb, 'Цієї заявки вже немає.', true);
    try {
      await this.confirmCard(order, Number(idxText), kind === 'cpo', 'Telegram');
    } catch (err) {
      return this.h.answer(cb, err.message, true);
    }
    await this.h.answer(cb, kind === 'cpo' ? 'Оплату підтверджено' : 'Клієнту повідомлено');
    await this.h.removeButtons(cb.message);
    return undefined;
  },
});
