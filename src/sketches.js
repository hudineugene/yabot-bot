// Погодження ескізів: студія надсилає ескізи з картки заявки, клієнт погоджує або просить правки.
// order.sketches = [{ round, sentAt, items:[{type,fileId}], comment, status:'pending'|'approved'|'changes', decidedAt, feedback, reminded }]
import { store } from './store.js';
import { log } from './log.js';
import { escapeHtml, orderNo, kyivHour } from './util.js';
import * as T from './texts.js';
import { isOpen } from './orders.js';

const MAX_ITEMS = 20;
const REMIND_AFTER = 24 * 60 * 60 * 1000;

export class SketchFlow {
  constructor(handlers) {
    this.h = handlers;
  }

  get data() { return store.data; }
  get tg() { return this.h.tg; }

  epochOk(epoch) {
    return (epoch || undefined) === (this.data.orderEpoch || undefined);
  }

  findOrder(id) {
    return this.data.inquiries.find((o) => o.id === Number(id));
  }

  /** Сесії збору ескізів — окремо для кожного чату студії (власник і дизайнери працюють паралельно). */
  sessions() {
    const all = (this.data.sketchSessions ||= {});
    // Сесія зі старої версії (одна на всіх) — належала власнику
    if (this.data.sketchSession) {
      if (this.data.config.adminChatId) all[String(this.data.config.adminChatId)] = this.data.sketchSession;
      this.data.sketchSession = null;
    }
    return all;
  }

  session(chatId) { return this.sessions()[String(chatId)] || null; }

  setSession(chatId, value) {
    if (value) this.sessions()[String(chatId)] = value;
    else delete this.sessions()[String(chatId)];
  }

  // --- Студія: збір ескізів ---

  async startSession(cb, epoch, id) {
    const order = this.findOrder(id);
    if (!this.epochOk(epoch) || !order) return this.h.answer(cb, 'Цієї заявки вже немає.', true);
    if (!isOpen(order)) return this.h.answer(cb, 'Заявку вже закрито.', true);
    if (!this.h.canWork(cb.message.chat.id, order)) return this.h.answer(cb, 'Заявка назначена другому дизайнеру.', true);
    await this.h.answer(cb);
    const round = (order.sketches?.length || 0) + 1;
    const chatId = cb.message.chat.id;
    if (String(chatId) === String(this.data.config.adminChatId)) this.data.packSession = null; // одночасно збираємо щось одне
    this.setSession(chatId, { orderId: order.id, epoch: this.data.orderEpoch, items: [], comment: '', lastGroup: null, startedAt: new Date().toISOString() });
    store.save();
    return this.h.send(cb.message.chat.id, T.sketchSessionStart(order, round), T.sketchSessionKeyboard());
  }

  /** Повідомлення в чаті студії під час збору ескізів. Повертає true, якщо оброблено. */
  async captureStudio(m) {
    const s = this.session(m.chat.id);
    if (!s) return false;
    const item = mediaItem(m);
    if (item) {
      if (s.items.length >= MAX_ITEMS) return true;
      s.items.push(item);
      if (m.caption) s.comment = [s.comment, m.caption].filter(Boolean).join('\n');
      const group = m.media_group_id || null;
      const first = !group || group !== s.lastGroup;
      s.lastGroup = group;
      store.save();
      if (first) {
        // Альбом приходить частинами — рахунок покажемо трохи згодом, коли дійдуть усі файли
        setTimeout(() => {
          const cur = this.session(m.chat.id);
          if (cur === s) this.h.send(m.chat.id, T.sketchAdded(s.items.length), T.sketchSessionKeyboard()).catch(() => {});
        }, group ? 1500 : 0);
      }
      return true;
    }
    if (m.text && !m.text.startsWith('/')) {
      s.comment = m.text.trim().slice(0, 2000);
      store.save();
      await this.h.send(m.chat.id, T.SKETCH_COMMENT_SAVED, T.sketchSessionKeyboard());
      return true;
    }
    return false;
  }

  async cancelSession(cb) {
    await this.h.answer(cb, 'Скасовано');
    this.setSession(cb.message.chat.id, null);
    store.save();
    await this.h.removeButtons(cb.message);
  }

  async sendSession(cb) {
    const chatId = cb.message.chat.id;
    const s = this.session(chatId);
    if (!s) return this.h.answer(cb, 'Немає ескізів для надсилання.', true);
    if (!s.items.length) return this.h.answer(cb, 'Додайте хоча б одне зображення або файл.', true);
    const order = this.findOrder(s.orderId);
    if (!order || !this.epochOk(s.epoch)) {
      this.setSession(chatId, null);
      return this.h.answer(cb, 'Цієї заявки вже немає.', true);
    }
    if (!this.h.canWork(chatId, order)) {
      this.setSession(chatId, null);
      return this.h.answer(cb, 'Заявка назначена другому дизайнеру.', true);
    }
    await this.h.answer(cb, 'Надсилаю…');
    await this.h.removeButtons(cb.message);
    let round;
    try {
      round = await this.deliver(order, s.items, s.comment, this.h.memberOfChat(chatId), 'telegram');
    } catch (err) {
      const reason = err.status === 403 ? 'клиент заблокировал бота' : err.description || err.message;
      return this.h.send(cb.message.chat.id, `⚠️ Эскизы не доставлены клиенту: ${escapeHtml(reason)}. Можно попробовать ещё раз.`, T.sketchSessionKeyboard());
    }
    this.setSession(chatId, null);
    store.saveNow();
    return this.h.send(cb.message.chat.id, T.sketchSent(order, round));
  }

  /**
   * Надіслати клієнту ескізи (нова версія) і записати в заявку. Спільне для кнопки в чаті й Mini App.
   * Помилку доставки кидає далі — нічого не записавши.
   */
  async deliver(order, items, comment, member = null, via = 'telegram') {
    const round = (order.sketches?.length || 0) + 1;
    const L = this.h.t(order.userId);
    await this.h.send(order.userId, L.sketchIntro(order, round, comment));
    await this.sendItems(order.userId, items);
    await this.h.send(order.userId, L.SKETCH_DECIDE, this.h.withClientApp(L.sketchDecisionKeyboard(this.data.orderEpoch, order.id, round), order.id, order.userId));
    (order.sketches ||= []).push({
      round, sentAt: new Date().toISOString(), items, comment, status: 'pending',
    });
    (order.messages ||= []).push({ at: new Date().toISOString(), from: 'studio', via, ...(member ? { by: member.name } : {}), text: `[эскизы, версия ${round}: ${items.length} файл.]${comment ? ` ${comment}` : ''}`,
      media: items.slice(0, 10).map((i) => ({ type: i.type, fileId: i.fileId, ...(i.name ? { name: i.name } : {}) })) });
    // Ескізи надіслано — заявка точно в роботі
    if (order.status === 'new') await this.h.setOrderStatus(order, 'in_progress', { who: 'эскизы', notifyClient: false });
    order.pipelineStage = 'sketches';
    await this.h.updateCard(order);
    store.saveNow();
    log.info(`Эскизы по заявке #${orderNo(order.id)} (версия ${round}) отправлены клиенту${via === 'app' ? ' из Mini App' : ''}`);
    return round;
  }

  async sendItems(chatId, items) {
    const visual = items.filter((i) => i.type === 'photo' || i.type === 'video');
    const docs = items.filter((i) => i.type === 'document');
    for (let i = 0; i < visual.length; i += 10) {
      const chunk = visual.slice(i, i + 10);
      if (chunk.length === 1) await this.tg.call(chunk[0].type === 'photo' ? 'sendPhoto' : 'sendVideo', { chat_id: chatId, [chunk[0].type]: chunk[0].fileId });
      else await this.tg.call('sendMediaGroup', { chat_id: chatId, media: chunk.map((it) => ({ type: it.type, media: it.fileId })) });
    }
    for (let i = 0; i < docs.length; i += 10) {
      const chunk = docs.slice(i, i + 10);
      if (chunk.length === 1) await this.tg.call('sendDocument', { chat_id: chatId, document: chunk[0].fileId });
      else await this.tg.call('sendMediaGroup', { chat_id: chatId, media: chunk.map((it) => ({ type: 'document', media: it.fileId })) });
    }
    for (const it of items.filter((x) => x.type === 'animation')) await this.tg.call('sendAnimation', { chat_id: chatId, animation: it.fileId });
    this.data.stats.messagesSent += 1;
  }

  // --- Клієнт: рішення ---

  async onDecision(cb, kind, epoch, id, roundText) {
    const order = this.findOrder(id);
    const round = Number(roundText);
    const current = order?.sketches?.at(-1);
    const L = this.h.t(cb.from.id);
    if (!this.epochOk(epoch) || !order || order.userId !== cb.from.id || !current || current.round !== round || current.status !== 'pending') {
      return this.h.answer(cb, L.SKETCH_STALE, true);
    }
    await this.h.answer(cb);
    current.decidedAt = new Date().toISOString();
    const note = kind === 'ap' ? L.MSG.approvedNote : L.MSG.changesNote;
    await this.tg.call('editMessageText', {
      chat_id: cb.message.chat.id, message_id: cb.message.message_id, parse_mode: 'HTML',
      text: `${L.SKETCH_DECIDE}\n\n<b>${note}</b>`, reply_markup: { inline_keyboard: [] },
    }).catch(() => {});

    if (kind === 'ap') {
      current.status = 'approved';
      order.pipelineStage = 'final';
      (order.messages ||= []).push({ at: current.decidedAt, from: 'client', text: `[согласовал эскизы, версия ${round}]` });
      await this.h.send(cb.message.chat.id, L.SKETCH_APPROVED_CLIENT);
      await this.h.notifyTeam(order, T.sketchApprovedStudio(order, round));
      log.info(`Заявка #${orderNo(order.id)}: клиент согласовал эскизы (версия ${round})`);
    } else {
      current.status = 'changes';
      order.pipelineStage = 'sketches';
      (order.messages ||= []).push({ at: current.decidedAt, from: 'client', text: `[просит правки к эскизам, версия ${round}]` });
      (this.data.revisionWaits ||= {})[String(order.userId)] = { orderId: order.id, round, epoch: this.data.orderEpoch, at: current.decidedAt };
      await this.h.send(cb.message.chat.id, L.SKETCH_ASK_CHANGES);
      await this.h.notifyTeam(order, T.sketchChangesStudio(order, round));
      log.info(`Заявка #${orderNo(order.id)}: клиент просит правки (версия ${round})`);
    }
    order.unread = (order.unread || 0) + 1;
    await this.h.updateCard(order);
    store.saveNow();
    return undefined;
  }

  /** Перше повідомлення клієнта після «Є правки» — це опис правок. Повертає true, якщо оброблено. */
  async onRevisionMessage(m) {
    const waits = this.data.revisionWaits || {};
    const wait = waits[String(m.from.id)];
    if (!wait) return false;
    delete waits[String(m.from.id)];
    const order = this.findOrder(wait.orderId);
    if (!order || !this.epochOk(wait.epoch)) return false;
    const round = order.sketches?.find((s) => s.round === wait.round);
    const text = describe(m);
    if (round) round.feedback = [round.feedback, text].filter(Boolean).join('\n');

    try {
      await this.h.forwardToTeam(order, T.sketchChangesHeader(order, wait.round, m.from), m);
    } catch (err) {
      log.warn(`Правки по заявке #${orderNo(order.id)} не переданы: ${err.message}`);
      store.addError('sketches', err);
    }
    (order.messages ||= []).push({ at: new Date().toISOString(), from: 'client', text: `[правки v${wait.round}] ${text}` });
    order.unread = (order.unread || 0) + 1;
    store.saveNow();
    await this.h.send(m.chat.id, this.h.t(m.from.id).SKETCH_CHANGES_ACK);
    return true;
  }

  /** Нагадування клієнту: ескізи чекають рішення понад добу (один раз, удень). */
  async remind() {
    const hour = kyivHour();
    if (hour < 10 || hour >= 20) return;
    const now = Date.now();
    for (const order of this.data.inquiries) {
      const s = order.sketches?.at(-1);
      if (!s || s.status !== 'pending' || s.reminded || now - Date.parse(s.sentAt) < REMIND_AFTER) continue;
      if (!isOpen(order)) continue;
      s.reminded = true;
      try {
        const L = this.h.t(order.userId);
        await this.h.send(order.userId, L.sketchReminder(order, s.round), this.h.withClientApp(L.sketchDecisionKeyboard(this.data.orderEpoch, order.id, s.round), order.id, order.userId));
      } catch (err) {
        log.warn(`Напоминание об эскизах #${orderNo(order.id)} не отправлено: ${err.message}`);
      }
    }
    store.save();
  }
}

function mediaItem(m) {
  if (m.photo?.length) return { type: 'photo', fileId: m.photo.at(-1).file_id };
  if (m.video) return { type: 'video', fileId: m.video.file_id };
  if (m.animation) return { type: 'animation', fileId: m.animation.file_id };
  if (m.document) return { type: 'document', fileId: m.document.file_id, name: m.document.file_name || null, mime: m.document.mime_type || null };
  return null;
}

function describe(m) {
  if (m.text) return m.text;
  const kind = m.photo ? 'фото' : m.voice ? 'голосовое' : m.video ? 'видео' : m.document ? 'файл' : m.sticker ? 'стикер' : 'сообщение';
  return `[${kind}]${m.caption ? ` ${m.caption}` : ''}`;
}
