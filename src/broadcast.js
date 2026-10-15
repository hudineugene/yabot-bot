// Розсилка клієнтам: новини, нові роботи, акції. Іде у фоні з безпечною швидкістю,
// у кожному повідомленні — кнопка відписки. Історія — store.data.broadcasts.
import crypto from 'node:crypto';
import { store } from './store.js';
import { log } from './log.js';
import { escapeHtml, sleep } from './util.js';
import { textsFor, langOf } from './lang.js';

const DELAY_MS = 70; // ~14 повідомлень на секунду — нижче ліміту Telegram (30/с)
const HISTORY_KEEP = 30;
const MAX_TEXT = 3500;

export class Broadcaster {
  constructor(runtime) {
    this.runtime = runtime;
    this.current = null; // { job, cancel }
  }

  get data() { return store.data; }

  /** Після перезапуску незавершені розсилки позначаємо як перервані (повторно не шлемо, щоб не дублювати). */
  markInterrupted() {
    for (const job of this.data.broadcasts) {
      if (job.status === 'sending') { job.status = 'interrupted'; job.finishedAt = new Date().toISOString(); }
    }
    store.save();
  }

  /** Отримувачі: усі / з замовленнями / без замовлень / за міткою джерела. Без заблокованих (ботом чи студією) і відписаних. */
  recipients({ type = 'all', source = '' } = {}) {
    const withOrders = new Set(this.data.inquiries.map((o) => o.userId));
    const studio = String(this.data.config.adminChatId || '');
    return Object.values(this.data.users)
      .filter((u) => !u.blocked && !u.studioBlocked && !u.unsubscribed && String(u.id) !== studio)
      .filter((u) => {
        if (type === 'orders') return withOrders.has(u.id);
        if (type === 'no_orders') return !withOrders.has(u.id);
        if (type === 'source') return (u.source || '') === source;
        if (type === 'lang_uk') return langOf(u.id) === 'uk';
        if (type === 'lang_en') return langOf(u.id) === 'en';
        return true;
      })
      .map((u) => u.id);
  }

  validate(input) {
    const text = String(input.text || '').trim().slice(0, MAX_TEXT);
    if (!text) throw userError('Напишите текст рассылки.');
    const photo = String(input.photo || '').trim();
    if (photo && !/^https:\/\/\S+$/i.test(photo)) throw userError('Ссылка на картинку должна начинаться с https://');
    const kind = ['none', 'works', 'brief', 'url'].includes(input.buttonKind) ? input.buttonKind : 'none';
    const button = { kind };
    if (kind === 'url') {
      button.url = String(input.buttonUrl || '').trim();
      button.text = String(input.buttonText || '').trim().slice(0, 40) || 'Детальніше';
      if (!/^https:\/\/\S+$/i.test(button.url)) throw userError('Ссылка кнопки должна начинаться с https://');
    }
    const audience = { type: ['all', 'orders', 'no_orders', 'source', 'lang_uk', 'lang_en'].includes(input.audience) ? input.audience : 'all', source: String(input.source || '') };
    return { text, photo, button, audience };
  }

  /** Кнопки мовою отримувача (текст розсилки — як написав власник). */
  markup(job, chatId) {
    const L = textsFor(chatId);
    const rows = [];
    if (job.button.kind === 'works') rows.push([{ text: L.BROADCAST_WORKS, callback_data: 'wl' }]);
    if (job.button.kind === 'brief') rows.push([{ text: L.BROADCAST_BRIEF, callback_data: 'brief_start' }]);
    if (job.button.kind === 'url') rows.push([{ text: job.button.text, url: job.button.url }]);
    rows.push([L.UNSUBSCRIBE_BUTTON]);
    return { inline_keyboard: rows };
  }

  async sendTo(tg, chatId, job) {
    const text = escapeHtml(job.text);
    const reply_markup = this.markup(job, chatId);
    if (job.photo) {
      if (text.length <= 1024) {
        return tg.call('sendPhoto', { chat_id: chatId, photo: job.photo, caption: text, parse_mode: 'HTML', reply_markup });
      }
      await tg.call('sendPhoto', { chat_id: chatId, photo: job.photo });
    }
    return tg.call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', reply_markup, link_preview_options: { is_disabled: true } });
  }

  tg() {
    const h = this.runtime.handlers;
    if (!h || !this.runtime.ready) throw userError('Бот ещё не подключился к Telegram — попробуйте через минуту.');
    return h.tg;
  }

  async test(input) {
    const job = this.validate(input);
    const studio = this.data.config.adminChatId;
    if (!studio) throw userError('Не указан получатель заявок — тест отправить некуда.');
    try {
      await this.sendTo(this.tg(), studio, job);
    } catch (err) {
      if (err.userFacing) throw err;
      throw userError(`Telegram не принял сообщение: ${err.description || err.message}`);
    }
  }

  start(input) {
    if (this.current) throw userError('Уже идёт рассылка — дождитесь окончания или остановите её.');
    const spec = this.validate(input);
    const tg = this.tg();
    const queue = this.recipients(spec.audience);
    if (!queue.length) throw userError('По этому фильтру некому отправлять.');
    const job = {
      id: crypto.randomBytes(4).toString('hex'), createdAt: new Date().toISOString(), ...spec,
      total: queue.length, sent: 0, failed: 0, blocked: 0, status: 'sending', finishedAt: null,
    };
    this.data.broadcasts.unshift(job);
    this.data.broadcasts.length = Math.min(this.data.broadcasts.length, HISTORY_KEEP);
    store.saveNow();
    const state = { job, cancelled: false };
    this.current = state;
    log.info(`Рассылка ${job.id}: начата, получателей ${job.total}`);
    this.run(tg, state, queue).catch((err) => {
      log.error(`Рассылка ${job.id} прервана: ${err.message}`);
      store.addError('broadcast', err);
      job.status = 'interrupted';
      this.current = null;
      store.save();
    });
    return job;
  }

  async run(tg, state, queue) {
    const { job } = state;
    for (const chatId of queue) {
      if (state.cancelled) break;
      try {
        await this.sendTo(tg, chatId, job);
        job.sent++;
        this.data.stats.messagesSent++;
      } catch (err) {
        if (err.status === 403) {
          job.blocked++;
          const user = this.data.users[String(chatId)];
          if (user) user.blocked = true;
        } else job.failed++;
      }
      if ((job.sent + job.failed + job.blocked) % 20 === 0) store.save();
      await sleep(DELAY_MS);
    }
    job.status = state.cancelled ? 'cancelled' : 'done';
    job.finishedAt = new Date().toISOString();
    this.current = null;
    store.saveNow();
    log.info(`Рассылка ${job.id}: ${job.status}, доставлено ${job.sent} из ${job.total}`);
  }

  cancel() {
    if (!this.current) throw userError('Сейчас рассылка не идёт.');
    this.current.cancelled = true;
  }
}

function userError(message) {
  return Object.assign(new Error(message), { userFacing: true });
}
