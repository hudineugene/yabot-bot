// Для студії в Telegram: команди /today, /orders, /find, /o, /stats, /help (власник і дизайнери — по своїх заявках),
// а також повернення клієнтів (через N днів після «Готово» — пропозиція доповнити пак зі знижкою).
import crypto from 'node:crypto';
import { packageItems } from './services.js';
import { store } from './store.js';
import { log } from './log.js';
import { escapeHtml, orderNo, todayKey, kyivHour, dateText } from './util.js';
import { isOpen, dueState, orderAmount, isPaid, paidValue } from './orders.js';
import { promoList } from './promos.js';
import { langOf } from './lang.js';
import * as T from './texts.js';

const DAY = 24 * 60 * 60 * 1000;

export const STUDIO_COMMANDS = [
  { command: 'today', description: 'Что горит сегодня (сводка)' },
  { command: 'orders', description: 'Открытые заявки' },
  { command: 'find', description: 'Найти заявку: /find олена' },
  { command: 'o', description: 'Карточка заявки: /o 12' },
  { command: 'stats', description: 'Цифры за неделю' },
  { command: 'quote', description: 'Смета: /quote 12 3500 7' },
  { command: 'due', description: 'Срок: /due 12 20.10' },
  { command: 'price', description: 'Цена: /price 12 3500' },
  { command: 'pay', description: 'Счёт или реквизиты: /pay 12' },
  { command: 'r', description: 'Быстрые ответы' },
  { command: 'help', description: 'Команды студии' },
];

const STUDIO_HELP =
  '🛠 <b>Команды студии</b>\n\n' +
  '/today — что горит сегодня (как утренняя сводка)\n' +
  '/orders — открытые заявки со сроками\n' +
  '/find <i>текст</i> — поиск по номеру, имени, @username, герою, контакту\n' +
  '/o <i>номер</i> — карточка заявки с кнопками (например /o 12)\n' +
  '/stats — цифры за 7 дней\n' +
  '/quote <i>номер сумма [дни или дата]</i> — смета клиенту: /quote 12 3500 7\n' +
  '/due <i>номер дата</i> — срок: /due 12 20.10\n' +
  '/price <i>номер сумма</i> — согласованная цена\n' +
  '/pay <i>номер</i> — счёт monobank или реквизиты карты\n' +
  '/r — быстрые ответы (ответом на сообщение клиента: /r 2)\n\n' +
  'Ответить клиенту — «Ответить» на его сообщение или на карточку заявки.';

const client = (o) => (o.username ? `@${escapeHtml(o.username)}` : escapeHtml(o.fullName || String(o.userId)));
const STATUS_ICON = { new: '🆕', in_progress: '🎨', done: '✅', rejected: '❌', cancelled: '🚫' };

export class StudioCommands {
  constructor(handlers) {
    this.h = handlers;
  }

  get data() { return store.data; }

  /** Заявки, які бачить цей чат: власник — усі, дизайнер — свої. */
  visible(member) {
    return this.data.inquiries.filter((o) => !member || o.assignee === member.id);
  }

  line(o) {
    const due = o.studio?.due && isOpen(o) ? ` · до ${dateText(o.studio.due).slice(0, 5)}${{ overdue: ' ⚠️', today: ' 🔥', tomorrow: ' ⏰' }[dueState(o)] || ''}` : '';
    const hero = o.hero.length > 40 ? `${o.hero.slice(0, 40)}…` : o.hero;
    return `${STATUS_ICON[o.status] || ''} <b>#${orderNo(o.id)}</b> ${client(o)} — ${escapeHtml(hero)}${due}${o.assigneeName ? ` · 👤${escapeHtml(o.assigneeName)}` : ''}${o.unread ? ` · 💬${o.unread}` : ''}`;
  }

  /** Повертає true, якщо команду оброблено. */
  async handle(m, cmd, arg, member) {
    const chatId = m.chat.id;
    const send = (text, markup) => this.h.send(chatId, text, markup);
    if (cmd === 'help' || cmd === 'start') {
      await send(STUDIO_HELP);
      return true;
    }
    if (cmd === 'today') {
      await send(this.h.digest.build(member));
      return true;
    }
    if (cmd === 'orders') {
      const open = this.visible(member).filter(isOpen).sort((a, b) => (a.studio?.due || '9999').localeCompare(b.studio?.due || '9999') || a.id - b.id);
      const groups = [['new', '🆕 Новые'], ['in_progress', '🎨 В работе']].map(([st, title]) => {
        const items = open.filter((o) => o.status === st);
        return items.length ? `<b>${title} (${items.length})</b>\n${items.slice(0, 25).map((o) => this.line(o)).join('\n')}` : '';
      }).filter(Boolean);
      await send(groups.length ? `${groups.join('\n\n')}\n\nКарточка заявки: /o номер` : 'Открытых заявок нет 🙂');
      return true;
    }
    if (cmd === 'find') {
      const q = String(arg || '').trim().toLowerCase().replace(/^[#@]/, '');
      if (!q) { await send('Напишите, что искать: /find олена или /find 12'); return true; }
      const found = this.visible(member).filter((o) => [String(o.id), orderNo(o.id), o.username, o.fullName, o.hero, o.contact, o.assigneeName]
        .some((v) => v && String(v).toLowerCase().includes(q))).reverse();
      if (found.length === 1) return this.card(chatId, found[0], member);
      await send(found.length ? `🔎 Найдено: ${found.length}\n\n${found.slice(0, 15).map((o) => this.line(o)).join('\n')}\n\nКарточка заявки: /o номер` : `Ничего не нашлось по «${escapeHtml(q)}».`);
      return true;
    }
    if (cmd === 'o') {
      const id = Number(String(arg || '').replace(/\D/g, ''));
      const order = this.visible(member).find((o) => o.id === id);
      if (!order) { await send(id ? `Заявка #${orderNo(id)} не найдена${member ? ' среди ваших' : ''}.` : 'Укажите номер: /o 12'); return true; }
      return this.card(chatId, order, member);
    }
    if (cmd === 'stats') {
      await send(this.stats(member));
      return true;
    }
    if (['quote', 'due', 'price', 'pay'].includes(cmd)) {
      await send(await this.orderCommand(cmd, String(arg || '').trim().split(/\s+/).filter(Boolean), member, chatId));
      return true;
    }
    return false;
  }

  /** /quote, /due, /price, /pay — повертає текст відповіді для чату студії. */
  async orderCommand(cmd, args, member, chatId) {
    const usage = {
      quote: 'Формат: /quote 12 3500 7 — номер, сумма, срок (дней после согласования или дата 20.10).',
      due: 'Формат: /due 12 20.10 (или /due 12 7 — через 7 дней, /due 12 0 — убрать срок).',
      price: 'Формат: /price 12 3500',
      pay: 'Формат: /pay 12 (сумма по подсказке) или /pay 12 1750',
    }[cmd];
    const id = Number(String(args[0] || '').replace(/\D/g, ''));
    const order = this.visible(member).find((o) => o.id === id);
    if (!id) return usage;
    if (!order) return `Заявка #${orderNo(id)} не найдена${member ? ' среди ваших' : ''}.`;
    if (!isOpen(order) && !(cmd === 'pay' && order.status === 'done')) return `Заявка #${orderNo(id)} закрыта.`;
    if (member && (cmd === 'price' || cmd === 'pay')) return 'Цену и оплату задаёт владелец студии.';
    const num = (v) => Number(String(v || '').replace(/\s/g, '').replace(',', '.').replace(/грн|uah/gi, ''));
    // «20.10», «20.10.2026» або кількість днів
    const parseDue = (v) => {
      const m = /^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/.exec(String(v || ''));
      if (!m) return null;
      const now = new Date();
      let year = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : now.getFullYear();
      let key = `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      if (!m[3] && key < todayKey()) { year += 1; key = `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
      return Number.isNaN(Date.parse(key)) ? null : key;
    };
    const who = member ? member.name : 'Telegram';
    try {
      if (cmd === 'quote') {
        const amount = num(args[1]);
        if (!(amount >= 1)) return usage;
        const due = parseDue(args[2]);
        const days = !due && /^\d{1,3}$/.test(args[2] || '') ? Number(args[2]) : 0;
        const items = packageItems(order) || `${order.quantity} — ${String(order.stickerType || '').toLowerCase()} стікери\nДо 2 раундів правок ескізів\nГотовий стікерпак у Telegram`;
        await this.h.quotes.send(order, { amount, due: due || '', days, items }, who, { designer: Boolean(member) });
        return `🧾 Смета по #${orderNo(id)} отправлена: ${T.money(amount)}${due ? `, срок до ${dateText(due)}` : days ? `, срок ${days} дн. после согласования` : ''}.`;
      }
      if (cmd === 'due') {
        const raw = args[1];
        let due = parseDue(raw);
        if (!due && /^\d{1,3}$/.test(raw || '')) due = Number(raw) ? todayKey(new Date(Date.now() + Number(raw) * DAY)) : '';
        if (due === null || due === undefined) return usage;
        order.studio = { ...(order.studio || {}), due, deadline: due ? dateText(due) : '' };
        store.saveNow();
        await this.h.updateCard(order);
        return due ? `📅 Срок по #${orderNo(id)}: до ${dateText(due)}.` : `Срок по #${orderNo(id)} убран.`;
      }
      if (cmd === 'price') {
        const amount = num(args[1]);
        if (!(amount >= 1)) return usage;
        order.studio = { ...(order.studio || {}), price: T.money(amount), amount };
        store.saveNow();
        await this.h.updateCard(order);
        return `💰 Цена по #${orderNo(id)}: ${T.money(amount)}.`;
      }
      if (cmd === 'pay') {
        const pay = this.h.payments;
        if (!pay.canRequest) return 'Оплата не настроена: включите monobank или перевод на карту на странице бота.';
        const amount = args[1] ? num(args[1]) : pay.suggest(order).amount;
        if (!(amount >= 1)) return `Не знаю сумму — укажите её: /pay ${id} 1750 (или задайте цену: /price ${id} 3500).`;
        const p = pay.enabled ? await pay.createInvoice(order, amount, { who }) : await pay.requestCard(order, amount, { who });
        return `${p.method === 'card' ? `📤 Реквизиты карты на ${T.money(p.amount)} отправлены клиенту (#${orderNo(id)}). Когда он нажмёт «Я оплатив», придёт уведомление.` : T.paySentStudio(order, p.amount)}${p.deliveryError ? `\n⚠️ Клиенту не доставлено: ${escapeHtml(p.deliveryError)}` : ''}`;
      }
    } catch (err) {
      return `⚠️ ${escapeHtml(err.description || err.message)}`;
    }
    return usage;
  }

  /** Свіжа картка заявки з кнопками — стає основною (кнопки й відповіді працюють з неї). */
  async card(chatId, order, member) {
    const pay = !member && this.h.payments.canRequest && (isOpen(order) || order.status === 'done');
    const msg = await this.h.send(chatId, T.adminOrderText(order, order.cardNote || '', { designer: Boolean(member) }), this.h.withApp(T.adminOrderKeyboard(order.id, order.status, this.data.orderEpoch, pay, Boolean(member)), chatId, order.id));
    if (member) order.designerMessage = { chatId, messageId: msg.message_id };
    else order.adminMessage = { chatId, messageId: msg.message_id };
    store.save();
    return true;
  }

  stats(member) {
    const now = Date.now();
    const orders = this.visible(member);
    const week = (iso) => iso && now - Date.parse(iso) < 7 * DAY;
    const created = orders.filter((o) => week(o.createdAt));
    const done = orders.filter((o) => o.status === 'done' && week(o.doneAt));
    const lines = [
      `📊 <b>За 7 дней</b>${member ? ` · ${escapeHtml(member.name)}` : ''}`,
      '',
      `📥 Новых заявок: ${created.length}`,
      `✅ Готово: ${done.length}`,
      `🎨 Сейчас в работе: ${orders.filter((o) => o.status === 'in_progress').length}, новых без ответа: ${orders.filter((o) => o.status === 'new').length}`,
    ];
    if (!member) {
      const daily = this.data.stats.daily || {};
      let starts = 0;
      let users = 0;
      for (let i = 0; i < 7; i++) {
        const d = daily[todayKey(new Date(now - i * DAY))] || {};
        starts += d.starts || 0;
        users += d.users || 0;
      }
      const received = [
        ...this.data.inquiries.flatMap((o) => (o.payments || []).filter((p) => isPaid(p) && p.kind !== 'gift' && week(p.paidAt))),
        ...(this.data.gifts || []).filter((g) => g.paid && week(g.paidAt)).map((g) => ({ amount: g.amount })),
      ];
      const revenue = done.reduce((s, o) => s + orderAmount(o), 0);
      const rated = done.filter((o) => o.review?.rating);
      lines.push(
        `👤 Новых людей в боте: ${users}, начали бриф: ${starts}${starts ? ` (заявок — ${Math.round((created.length / starts) * 100)}%)` : ''}`,
        `💰 Получено: ${T.money(received.reduce((s, p) => s + paidValue(p), 0))} · выручка готовых: ${T.money(revenue)}`,
        ...(rated.length ? [`⭐ Средняя оценка: ${(rated.reduce((s, o) => s + o.review.rating, 0) / rated.length).toFixed(1)}`] : []),
      );
    }
    return lines.join('\n');
  }
}

// --- Повернення клієнтів ---

export const WINBACK_DEFAULTS = { enabled: false, days: 45, percent: 10, message: '' };

export function winbackSettings() {
  const c = store.data.config;
  c.winback = { ...WINBACK_DEFAULTS, ...(c.winback || {}) };
  return c.winback;
}

/** Персональний промокод на одне використання, 30 днів. */
function personalPromo(userId, percent) {
  const code = `BACK${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  promoList().push({
    code, percent, userId, until: todayKey(new Date(Date.now() + 30 * DAY)), maxUses: 1, uses: 0, active: true,
    note: 'возврат клиента (создан ботом)', createdAt: new Date().toISOString(), auto: true,
  });
  return code;
}

export class Winback {
  constructor(handlers) {
    this.h = handlers;
  }

  get data() { return store.data; }

  /** Раз на кілька годин удень: клієнтам, чиє останнє замовлення готове N днів тому і нових не було. */
  async run({ force = false } = {}) {
    const s = winbackSettings();
    if (!s.enabled) return;
    const hour = kyivHour();
    if (!force && (hour < 11 || hour >= 19)) return;
    const now = Date.now();
    const byUser = new Map();
    for (const o of this.data.inquiries) byUser.set(o.userId, o); // останнє замовлення кожного клієнта
    let sent = 0;
    for (const [userId, last] of byUser) {
      if (sent >= 20) break; // не більше 20 за раз — щоб не схоже на спам
      if (last.status !== 'done' || last.winbackAt || !last.doneAt) continue;
      if (now - Date.parse(last.doneAt) < s.days * DAY) continue;
      const user = this.data.users[String(userId)];
      if (!user || user.blocked || user.unsubscribed || this.data.drafts[String(userId)]) continue;
      last.winbackAt = new Date().toISOString();
      const code = s.percent ? personalPromo(userId, s.percent) : '';
      if (code) user.pendingPromo = code;
      const L = this.h.t(userId);
      const name = user.firstName || '';
      const custom = langOf(userId) === 'uk' ? s.message : ''; // свій текст власника — українською
      try {
        await this.h.send(userId, L.winbackMessage(name, s.percent, code, custom), L.winbackKeyboard(this.data.orderEpoch, last.pack ? last : null));
        user.winbackAt = last.winbackAt;
        const st = (this.data.stats.winback ||= { sent: 0, returned: 0 });
        st.sent++;
        sent++;
      } catch (err) {
        log.warn(`Предложение вернуться для ${userId} не отправлено: ${err.message}`);
      }
    }
    if (sent) {
      store.save();
      log.info(`Предложения вернуться отправлены: ${sent}`);
    }
  }

  /** Нова заявка від клієнта, якому писали «повертайтеся» за останні 60 днів. */
  markReturn(order, userId) {
    const user = this.data.users[String(userId)];
    if (!user?.winbackAt || Date.now() - Date.parse(user.winbackAt) > 60 * DAY) return;
    order.winback = true;
    delete user.winbackAt;
    (this.data.stats.winback ||= { sent: 0, returned: 0 }).returned++;
  }
}
