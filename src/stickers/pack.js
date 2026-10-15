// Готовий стікерпак прямо в боті: студія надсилає фінальні файли — бот створює пак на ім'я клієнта
// (або доповнює існуючий) і надсилає клієнту кнопку «Додати стікерпак».
// order.pack = { name, title, count, createdAt, updatedAt }
import crypto from 'node:crypto';
import { store } from '../store.js';
import { log } from '../log.js';
import { escapeHtml, orderNo } from '../util.js';
import { prepareSticker, emojisFrom, StickerFileError } from './prepare.js';
import * as T from '../texts.js';

const MAX_ITEMS = 120;
const CREATE_BATCH = 50; // createNewStickerSet приймає до 50 стікерів за раз

export class PackFlow {
  constructor(handlers) {
    this.h = handlers;
  }

  get data() { return store.data; }
  get tg() { return this.h.tg; }

  epochOk(epoch) {
    return (epoch || undefined) === (this.data.orderEpoch || undefined);
  }

  /** Пак, у який додаємо: власний пак замовлення або пак замовлення, яке доповнюємо. */
  existingPack(order) {
    if (order.pack) return { name: order.pack.name, title: order.pack.title };
    if (order.repeatOf?.packName) return { name: order.repeatOf.packName, title: order.repeatOf.packTitle || order.repeatOf.packName };
    return null;
  }

  async startSession(cb, epoch, id) {
    const order = this.data.inquiries.find((o) => o.id === Number(id));
    if (!this.epochOk(epoch) || !order) return this.h.answer(cb, 'Цієї заявки вже немає.', true);
    if (order.status === 'rejected' || order.status === 'cancelled') return this.h.answer(cb, 'Заявку закрито.', true);
    await this.h.answer(cb);
    const existing = this.existingPack(order);
    const title = `${order.hero.replace(/\s+/g, ' ').slice(0, 52).trim()} · YABOT`;
    if (this.data.sketchSessions) delete this.data.sketchSessions[String(cb.message.chat.id)]; // одночасно збираємо щось одне
    this.data.packSession = { orderId: order.id, epoch: this.data.orderEpoch, items: [], title, existing, lastGroup: null };
    store.save();
    return this.h.send(cb.message.chat.id, T.packSessionStart(order, existing, title), T.packSessionKeyboard(Boolean(existing)));
  }

  /** Повідомлення в чаті студії під час збору стікерпака. Повертає true, якщо оброблено. */
  async captureStudio(m) {
    const s = this.data.packSession;
    if (!s) return false;
    let item = null;
    if (m.document) {
      item = { fileId: m.document.file_id, name: m.document.file_name || 'файл', emoji: emojisFrom(m.caption) };
    } else if (m.sticker) {
      item = { fileId: m.sticker.file_id, name: 'стикер', emoji: m.sticker.emoji ? [m.sticker.emoji] : emojisFrom(m.caption) };
    } else if (m.photo) {
      await this.h.send(m.chat.id, T.PACK_PHOTO_WARNING);
      return true;
    } else if (m.text && !m.text.startsWith('/')) {
      if (s.existing) return false; // назву існуючого пака не змінюємо — текст піде як звичайне повідомлення
      s.title = m.text.trim().slice(0, 64);
      store.save();
      await this.h.send(m.chat.id, T.packTitleSaved(s.title), T.packSessionKeyboard(false));
      return true;
    } else {
      return false;
    }
    if (s.items.length >= MAX_ITEMS) return true;
    s.items.push(item);
    const group = m.media_group_id || null;
    const first = !group || group !== s.lastGroup;
    s.lastGroup = group;
    store.save();
    if (first) {
      setTimeout(() => {
        if (this.data.packSession === s) this.h.send(m.chat.id, T.packAdded(s.items.length), T.packSessionKeyboard(Boolean(s.existing))).catch(() => {});
      }, group ? 1500 : 0);
    }
    return true;
  }

  async cancel(cb) {
    await this.h.answer(cb, 'Скасовано');
    this.data.packSession = null;
    store.save();
    await this.h.removeButtons(cb.message);
  }

  async build(cb) {
    const s = this.data.packSession;
    if (!s) return this.h.answer(cb, 'Немає файлів для пака.', true);
    if (!s.items.length) return this.h.answer(cb, 'Додайте хоча б один файл стікера.', true);
    const order = this.data.inquiries.find((o) => o.id === s.orderId);
    if (!order || !this.epochOk(s.epoch)) {
      this.data.packSession = null;
      return this.h.answer(cb, 'Цієї заявки вже немає.', true);
    }
    const bot = this.data.bot.username;
    if (!bot) return this.h.answer(cb, 'Бот ще не підключився до Telegram.', true);
    await this.h.answer(cb, 'Збираю…');
    await this.h.removeButtons(cb.message);
    this.data.packSession = null;
    store.save();

    const chatId = cb.message.chat.id;
    const progress = await this.h.send(chatId, `⏳ Готовлю стикеры: 0/${s.items.length}…`);
    const setProgress = (text) => this.tg.call('editMessageText', { chat_id: chatId, message_id: progress.message_id, text }).catch(() => {});

    // 1. Підготовка й завантаження кожного файлу від імені клієнта
    const ready = [];
    const problems = [];
    for (const [i, item] of s.items.entries()) {
      try {
        const raw = await this.tg.download(item.fileId);
        if (!raw) throw new StickerFileError(`${item.name}: файл больше 20 МБ`);
        const st = prepareSticker(raw, item.name);
        const file = await this.tg.upload('uploadStickerFile', { user_id: order.userId, sticker_format: st.format }, 'sticker', st.buffer, st.filename, st.mime);
        ready.push({ sticker: file.file_id, format: st.format, emoji_list: item.emoji });
      } catch (err) {
        problems.push(err instanceof StickerFileError ? err.message : `${item.name}: ${err.description || err.message}`);
      }
      if ((i + 1) % 3 === 0 || i === s.items.length - 1) await setProgress(`⏳ Готовлю стикеры: ${i + 1}/${s.items.length}…`);
    }
    if (!ready.length) {
      return this.h.send(chatId, `❌ Ни один стикер не подошёл:\n${problems.map((p) => `• ${escapeHtml(p)}`).join('\n')}`);
    }

    // 2. Створення пака або додавання в існуючий
    let name = s.existing?.name;
    let title = s.existing?.title || s.title;
    let added = 0;
    try {
      let rest = ready;
      if (!name) {
        await setProgress('⏳ Создаю стикерпак…');
        const first = ready.slice(0, CREATE_BATCH);
        rest = ready.slice(CREATE_BATCH);
        for (let attempt = 0; ; attempt++) {
          name = `yabot_${orderNo(order.id)}_${crypto.randomBytes(2).toString('hex')}_by_${bot}`.toLowerCase();
          try {
            await this.tg.call('createNewStickerSet', { user_id: order.userId, name, title, stickers: first }, { timeoutMs: 120000 });
            break;
          } catch (err) {
            if (attempt < 2 && /occupied|invalid/i.test(err.description || '')) continue; // назва зайнята — нова
            throw err;
          }
        }
        added = first.length;
      }
      for (const st of rest) {
        try {
          await this.tg.call('addStickerToSet', { user_id: order.userId, name, sticker: st }, { timeoutMs: 60000 });
          added++;
        } catch (err) {
          problems.push(`стикер не добавлен: ${err.description || err.message}`);
        }
      }
    } catch (err) {
      log.error(`Стикерпак для #${orderNo(order.id)} не создан: ${err.message}`);
      store.addError('stickerpack', err);
      const hint = /USER|PEER|chat not found/i.test(err.description || '') ? ' (клиент должен был хотя бы раз написать боту)' : '';
      return this.h.send(chatId, `❌ Telegram не создал стикерпак: ${escapeHtml(err.description || err.message)}${hint}`);
    }

    // 3. Підсумок
    const set = await this.tg.call('getStickerSet', { name }).catch(() => null);
    const count = set?.stickers?.length || added;
    const now = new Date().toISOString();
    order.pack = { name, title, count, createdAt: order.pack?.createdAt || now, updatedAt: now };
    const source = order.repeatOf && this.data.inquiries.find((o) => o.id === order.repeatOf.id);
    if (source?.pack?.name === name) Object.assign(source.pack, { count, updatedAt: now });
    (order.messages ||= []).push({ at: now, from: 'studio', via: 'telegram', text: `[стикерпак: ${title}, ${count} шт.]` });
    store.saveNow();

    await this.tg.call('deleteMessage', { chat_id: chatId, message_id: progress.message_id }).catch(() => {});
    const link = `https://t.me/addstickers/${name}`;
    await this.h.send(chatId,
      `✅ ${s.existing ? `В пак добавлено ${added}` : `Стикерпак создан (${added})`}: «${escapeHtml(title)}»\n${link}` +
      (problems.length ? `\n\n⚠️ Не вошли:\n${problems.map((p) => `• ${escapeHtml(p)}`).join('\n')}` : '') +
      '\n\nКлиенту отправлена кнопка «Додати стікерпак».');

    try {
      const L = this.h.t(order.userId);
      await this.h.send(order.userId, s.existing ? L.packUpdated(title, added) : L.packReady(title, count), L.packKeyboard(name));
      const preview = set?.stickers?.at(s.existing ? -1 : 0)?.file_id;
      if (preview) await this.tg.call('sendSticker', { chat_id: order.userId, sticker: preview });
    } catch (err) {
      await this.h.send(chatId, `⚠️ Клиенту не доставлено: ${escapeHtml(err.description || err.message)}`).catch(() => {});
    }
    log.info(`Стикерпак ${name} для #${orderNo(order.id)}: +${added}, всего ${count}`);

    // Пак готовий — замовлення виконане (клієнт отримає «готове» і запит відгуку)
    if (order.status !== 'done') await this.h.setOrderStatus(order, 'done', { who: 'стикерпак', notifyClient: true });
    else await this.h.updateCard(order);
    return undefined;
  }
}
