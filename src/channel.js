// Публікації в канали й групи, де бот — адміністратор: форматований текст (HTML Telegram),
// медіа (фото/відео/GIF/файли, альбоми), кнопки-посилання, підпис, тихе/закріплене/захищене,
// відкладена публікація. Дані: config.channels, config.channelSignature, channelPosts, channelQueue.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { store } from './store.js';
import { log } from './log.js';
import { DATA_DIR } from './config.js';
import { escapeHtml } from './util.js';

const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
export const MAX_UPLOAD = 20 * 1024 * 1024;
const PHOTO_MAX = 10 * 1024 * 1024; // більші фото Telegram не приймає як фото — шлемо файлом
const CAPTION_MAX = 1024;
const TEXT_MAX = 4096;
const HISTORY_KEEP = 60;
const UPLOAD_TTL = 3 * 24 * 60 * 60 * 1000;
const RETRY_MAX = 4; // скільки разів повторюємо запланований пост після збою мережі
const RETRY_STEP = 2 * 60 * 1000; // 2, 4, 6, 8 хвилин

export class ChannelError extends Error {}

// Помилки, коли з'єднання з Telegram навіть не встановилося — запит точно не дійшов
const CONNECT_ERRORS = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH', 'UND_ERR_CONNECT_TIMEOUT']);

/**
 * Чи можна повторити відправку: з'єднання не встановилося, Telegram перевантажений (5xx) або просить почекати (429).
 * Таймаут і обрив посеред запиту не повторюємо — запит міг дійти, і пост вийшов би двічі.
 */
function retryable(err) {
  if (!err) return false;
  if (err.status === 429 || (Number(err.status) >= 500 && Number(err.status) < 600)) return true;
  return err.status === 'NETWORK' && CONNECT_ERRORS.has(err.code);
}

/** Файл із завантажень сторінки бота (медіа постів, картинки стилів). */
export function readUpload(id) {
  if (!/^[0-9a-f]{16}$/.test(String(id))) throw new ChannelError('Неизвестный файл.');
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(UPLOAD_DIR, `${id}.json`), 'utf8'));
    return { ...meta, buffer: fs.readFileSync(path.join(UPLOAD_DIR, `${id}.bin`)) };
  } catch {
    throw new ChannelError('Файл не найден — загрузите его ещё раз.');
  }
}

const VISITORS_KEEP = 2000;

/**
 * Статистика поста: кнопки й посилання на бота без своєї мітки (t.me/<бот> або ?start=channel)
 * отримують мітку поста ?start=p_<id> — так видно, скільки людей прийшло з поста і скільки замовили.
 */
export function tagPost(post, postId, bot) {
  if (!bot) return post;
  const plain = new RegExp(`^https?://t\\.me/${bot}/?(\\?start=(channel)?)?$`, 'i');
  const url = `https://t.me/${bot}?start=p_${postId}`;
  const buttons = post.buttons.map((row) => row.map((b) => (plain.test(b.url) ? { ...b, url } : b)));
  const html = post.html.replace(/href="([^"]*)"/g, (m, href) => (plain.test(href.replace(/&amp;/g, '&')) ? `href="${url}"` : m));
  return { ...post, buttons, html };
}

/** Перехід у бот з поста (/start p_<id>). Повертає запис поста або null. */
export function recordPostVisit(postId, userId, isNew) {
  const entry = (store.data.channelPosts || []).find((p) => p.id === postId);
  if (!entry) return null;
  const st = (entry.stats ||= { starts: 0, people: 0, newPeople: 0 });
  st.starts++;
  const visitors = (entry.visitors ||= []);
  if (!visitors.includes(userId)) {
    visitors.push(userId);
    st.people++;
    if (visitors.length > VISITORS_KEEP) visitors.shift();
  }
  if (isNew) st.newPeople++;
  return entry;
}

/**
 * Підпис до постів → HTML Telegram.
 * Підтримує посилання у форматі [текст](адреса) (адресу без https:// доповнюємо)
 * і коди символів U+1F7E0 → 🟠. Решта — звичайний текст.
 */
export function signatureHtml(raw) {
  const s = String(raw || '').trim()
    .replace(/U\+([0-9A-Fa-f]{4,6})/g, (m, hex) => {
      const cp = parseInt(hex, 16);
      return cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    });
  // **жирний** — усередині звичайного тексту й назв посилань
  const inline = (t) => escapeHtml(t).replace(/\*\*([^*\n]{1,100})\*\*/g, '<b>$1</b>');
  let out = '';
  let last = 0;
  for (const m of s.matchAll(/\[([^\]\n]{1,100})\]\(([^)\s]{1,300})\)/g)) {
    out += inline(s.slice(last, m.index));
    const url = /^(https?|tg):\/\//i.test(m[2]) ? m[2] : `https://${m[2].replace(/^\/+/, '')}`;
    out += `<a href="${escapeHtml(url)}">${inline(m[1])}</a>`;
    last = m.index + m[0].length;
  }
  return out + inline(s.slice(last));
}

/** Довжина тексту так, як її рахує Telegram: без тегів, з розкодованими сутностями. */
export function plainLength(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&(lt|gt|amp|quot|#\d+);/g, 'x')
    .length;
}

const ALLOWED = new Set(['b', 'strong', 'i', 'em', 'u', 'ins', 's', 'strike', 'del', 'code', 'pre', 'blockquote', 'tg-spoiler', 'a']);

/**
 * Лишає тільки теги, які розуміє Telegram, і стежить за парністю:
 * зайві закривальні теги відкидаємо, незакриті — закриваємо в кінці.
 */
export function sanitizeHtml(html) {
  const src = String(html || '');
  const stack = [];
  let out = '';
  let last = 0;
  for (const m of src.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g)) {
    out += src.slice(last, m.index).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    last = m.index + m[0].length;
    const closing = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (!ALLOWED.has(tag)) continue;
    if (!closing) {
      if (tag === 'a') {
        const href = m[3].match(/^\s+href="((?:https?|tg):\/\/[^"<>\s]+)"\s*$/i);
        if (!href) { stack.push('#skip-a'); continue; }
        out += `<a href="${href[1]}">`;
      } else {
        out += `<${tag}>`;
      }
      stack.push(tag);
    } else {
      const i = stack.lastIndexOf(tag);
      const skipA = tag === 'a' ? stack.lastIndexOf('#skip-a') : -1;
      if (skipA > i) { stack.splice(skipA, 1); continue; } // закриває відкинуте посилання
      if (i < 0) continue; // зайвий закривальний тег
      // закриваємо все, що відкрито всередині, у правильному порядку
      while (stack.length > i) {
        const t = stack.pop();
        if (t !== '#skip-a') out += `</${t}>`;
      }
    }
  }
  out += src.slice(last).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  while (stack.length) { const t = stack.pop(); if (t !== '#skip-a') out += `</${t}>`; }
  return out;
}

function mediaKind(mime, name, size) {
  const lower = String(name).toLowerCase();
  if (/^image\/gif$/.test(mime) || lower.endsWith('.gif')) return 'animation';
  if (/^image\/(jpeg|png|webp)$/.test(mime) && size <= PHOTO_MAX) return 'photo';
  if (/^video\/mp4$/.test(mime) || lower.endsWith('.mp4') || lower.endsWith('.mov')) return 'video';
  return 'document';
}

export class ChannelPoster {
  constructor(runtime) {
    this.runtime = runtime;
    this.timer = null;
  }

  get data() { return store.data; }

  tg() {
    const h = this.runtime.handlers;
    if (!h || !this.runtime.ready) throw new ChannelError('Бот ещё не подключился к Telegram — попробуйте через минуту.');
    return h.tg;
  }

  channels() { return (this.data.config.channels ||= []); }

  // --- Канали ---

  async addChannel(ref) {
    let chatRef = String(ref || '').trim().replace(/^https?:\/\/t\.me\//i, '@').replace(/\/$/, '');
    if (/^[A-Za-z][A-Za-z0-9_]{3,}$/.test(chatRef)) chatRef = `@${chatRef}`;
    if (!/^@[A-Za-z][A-Za-z0-9_]{3,}$|^-?\d{5,20}$/.test(chatRef)) {
      throw new ChannelError('Укажите @username канала/группы или числовой ID (например -1001234567890).');
    }
    const tg = this.tg();
    let chat;
    try { chat = await tg.call('getChat', { chat_id: chatRef }); } catch (err) {
      throw new ChannelError(`Telegram не нашёл чат (${err.description || err.message}). Добавьте бота в канал/группу.`);
    }
    if (!['channel', 'supergroup', 'group'].includes(chat.type)) throw new ChannelError('Это не канал и не группа.');
    const me = this.data.bot.id;
    const member = await tg.call('getChatMember', { chat_id: chat.id, user_id: me }).catch(() => null);
    if (!member || ['left', 'kicked'].includes(member.status)) throw new ChannelError('Бота нет в этом чате — добавьте его.');
    if (chat.type === 'channel' && !(member.status === 'administrator' && member.can_post_messages)) {
      throw new ChannelError('В канале бот должен быть администратором с правом «Публикация сообщений».');
    }
    if (member.status === 'restricted' && member.can_send_messages === false) throw new ChannelError('Боту запрещено писать в эту группу.');
    const entry = {
      id: chat.id, title: chat.title, username: chat.username || null, type: chat.type,
      canPin: member.status === 'administrator' && (chat.type === 'channel' ? Boolean(member.can_edit_messages) : Boolean(member.can_pin_messages)),
      canDelete: member.status === 'administrator' && Boolean(member.can_delete_messages),
      addedAt: new Date().toISOString(),
    };
    const list = this.channels();
    const i = list.findIndex((c) => c.id === chat.id);
    if (i >= 0) list[i] = entry; else list.push(entry);
    store.saveNow();
    log.info(`Канал добавлен: ${chat.title} (${chat.id})`);
    return entry;
  }

  removeChannel(id) {
    this.data.config.channels = this.channels().filter((c) => String(c.id) !== String(id));
    store.saveNow();
  }

  // --- Завантаження файлів ---

  saveUpload(buffer, name, mime) {
    if (!buffer.length) throw new ChannelError('Пустой файл.');
    if (buffer.length > MAX_UPLOAD) throw new ChannelError('Файл больше 20 МБ.');
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    this.cleanupUploads();
    const id = crypto.randomBytes(8).toString('hex');
    const safeName = String(name || 'file').replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 80) || 'file';
    const meta = { id, name: safeName, mime: String(mime || 'application/octet-stream').slice(0, 80), size: buffer.length, at: Date.now() };
    meta.kind = mediaKind(meta.mime, meta.name, meta.size);
    fs.writeFileSync(path.join(UPLOAD_DIR, `${id}.bin`), buffer);
    fs.writeFileSync(path.join(UPLOAD_DIR, `${id}.json`), JSON.stringify(meta));
    return meta;
  }

  loadUpload(id) {
    return readUpload(id);
  }

  /** Прибирає завантаження старші 3 днів (крім тих, що чекають у черзі або збережені в шаблонах). */
  cleanupUploads() {
    const keep = new Set([
      ...(this.data.channelQueue || []).flatMap((q) => q.post.files || []),
      ...(this.data.channelTemplates || []).flatMap((t) => (t.files || []).map((f) => f.id)),
      ...(this.data.config.styles || []).map((x) => x.image).filter(Boolean),
      ...Object.values(this.data.config.services || {}).flatMap((x) => (x.examples || []).map((e) => e.image)).filter(Boolean),
    ]);
    try {
      for (const f of fs.readdirSync(UPLOAD_DIR)) {
        const full = path.join(UPLOAD_DIR, f);
        const id = f.split('.')[0];
        if (!keep.has(id) && Date.now() - fs.statSync(full).mtimeMs > UPLOAD_TTL) fs.unlinkSync(full);
      }
    } catch { /* немає папки */ }
  }

  // --- Шаблони постів ---

  templates() { return (this.data.channelTemplates ||= []); }

  /** Стартові шаблони — один раз, коли список ще порожній і відоме ім'я бота. */
  seedTemplates() {
    if (this.data.templatesSeeded || this.templates().length) return;
    const bot = this.data.bot.username;
    if (!bot) return;
    const order = [{ text: '🚀 Замовити стікери', url: `https://t.me/${bot}?start=channel`, sameRow: false }];
    const opts = { signature: true, silent: false, noPreview: false, pin: false, protect: false };
    const t = (name, html, buttons = []) => ({
      id: crypto.randomBytes(4).toString('hex'), name, html, buttons, options: { ...opts }, files: [], updatedAt: new Date().toISOString(),
    });
    this.data.channelTemplates = [
      t('🆕 Новий пак у каталозі',
        '<b>🆕 Новий стікерпак у нашому каталозі!</b>\n\n«Назва пака» — 20 емоцій для <i>кого / для чого</i>.\n\n' +
        'Подивитися й додати собі — у боті {бот} → «🎨 Наші роботи».\n\nХочете такий самий для своєї команди? Тисніть кнопку 👇', order),
      t('🔥 Акція',
        '<b>🔥 Акція до неділі!</b>\n\nЗнижка <b>10%</b> на анімовані стікерпаки.\n' +
        'Встигніть заповнити бриф — це займе 3 хвилини 🙂\n\n<i>Акція діє для нових замовлень.</i>', order),
      t('⭐ Відгук клієнта',
        '⭐⭐⭐⭐⭐\n<blockquote>«Текст відгуку клієнта»</blockquote>\n— Ім\'я, компанія\n\nДякуємо за довіру! 💛'),
      t('🎨 Як ми працюємо',
        '<b>Як народжується стікерпак</b> 🎨\n\n1️⃣ Ви заповнюєте короткий бриф у боті\n2️⃣ Ми надсилаємо ескізи на погодження\n' +
        '3️⃣ Вносимо правки\n4️⃣ Готовий пак — одразу у вашому Telegram\n\nСтарт — за кнопкою 👇', order),
      t('📣 Замовте стікери',
        'Хочете власні стікери для команди, бренду чи друзів? 🤖\n\n' +
        'Заповніть короткий бриф у нашому боті — дизайнер зв\'яжеться з вами та назве вартість.', order),
    ];
    this.data.templatesSeeded = true;
    store.save();
  }

  saveTemplate(input) {
    const name = String(input.name || '').trim().slice(0, 60);
    if (!name) throw new ChannelError('Назовите шаблон.');
    const html = sanitizeHtml(input.html).slice(0, 8000);
    const files = (Array.isArray(input.files) ? input.files : []).slice(0, 10).map((id) => {
      const f = this.loadUpload(id); // перевіряємо, що файл є
      return { id: f.id, name: f.name, kind: f.kind };
    });
    const buttons = (Array.isArray(input.buttons) ? input.buttons : []).slice(0, 12).map((b) => ({
      text: String(b.text || '').slice(0, 64), url: String(b.url || '').slice(0, 300), sameRow: Boolean(b.sameRow),
    }));
    if (!html && !files.length) throw new ChannelError('В шаблоне нет ни текста, ни медиа.');
    const o = input.options || {};
    const options = { signature: o.signature !== false, silent: Boolean(o.silent), noPreview: Boolean(o.noPreview), pin: Boolean(o.pin), protect: Boolean(o.protect) };
    const list = this.templates();
    const existing = list.find((t) => t.id === input.id) || list.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (!existing && list.length >= 30) throw new ChannelError('Шаблонов уже 30 — удалите лишние.');
    const tpl = { id: existing?.id || crypto.randomBytes(4).toString('hex'), name, html, buttons, options, files, updatedAt: new Date().toISOString() };
    if (existing) Object.assign(existing, tpl); else list.push(tpl);
    store.saveNow();
    return tpl;
  }

  renameTemplate(id, name) {
    const tpl = this.templates().find((t) => t.id === id);
    if (!tpl) throw new ChannelError('Шаблон не найден.');
    const clean = String(name || '').trim().slice(0, 60);
    if (!clean) throw new ChannelError('Пустое название.');
    tpl.name = clean;
    store.saveNow();
  }

  deleteTemplate(id) {
    this.data.channelTemplates = this.templates().filter((t) => t.id !== id);
    store.saveNow();
  }

  // --- Публікація ---

  /** Перевіряє й нормалізує пост з форми. */
  validate(input) {
    const html = sanitizeHtml(input.html).replace(/\n{3,}/g, '\n\n').trim();
    const files = (Array.isArray(input.files) ? input.files : []).slice(0, 10).map(String);
    // Підпис: текст, посилання [текст](адреса), коди символів U+XXXX; @згадки Telegram зробить посиланнями сам
    const sig = input.signature !== false && this.data.config.channelSignature?.trim();
    const full = sig ? `${html}${html ? '\n\n' : ''}${signatureHtml(this.data.config.channelSignature)}` : html;
    if (!plainLength(full) && !files.length && !input.allowEmpty) throw new ChannelError('Пост пустой — добавьте текст или медиа.');
    if (plainLength(full) > TEXT_MAX) throw new ChannelError(`Текст длиннее ${TEXT_MAX} символов.`);
    const buttons = (Array.isArray(input.buttons) ? input.buttons : [])
      .map((row) => (Array.isArray(row) ? row : []).slice(0, 4)
        .map((b) => ({ text: String(b.text || '').trim().slice(0, 64), url: String(b.url || '').trim() }))
        .filter((b) => b.text && b.url))
      .filter((row) => row.length).slice(0, 8);
    for (const b of buttons.flat()) {
      if (!/^(https?:\/\/|tg:\/\/)\S+$/i.test(b.url)) throw new ChannelError(`Ссылка кнопки «${b.text}» должна начинаться с https://`);
    }
    return {
      html: full, files, buttons,
      silent: Boolean(input.silent), noPreview: Boolean(input.noPreview), pin: Boolean(input.pin), protect: Boolean(input.protect),
      source: { html, signature: Boolean(sig) },
    };
  }

  /** Надсилає пост. ids — куди складати id вже надісланих повідомлень (видно й після помилки посередині). */
  async send(chatId, rawPost, ids = []) {
    const tg = this.tg();
    // Підстановки рахуємо в момент відправки (для запланованих постів — дата публікації)
    const post = { ...rawPost, html: fillPlaceholders(rawPost.html, this.data.bot.username) };
    const files = post.files.map((id) => this.loadUpload(id));
    const common = {
      chat_id: chatId,
      disable_notification: post.silent || undefined,
      protect_content: post.protect || undefined,
    };
    const markup = post.buttons.length ? { inline_keyboard: post.buttons } : undefined;
    const textLen = plainLength(post.html);
    // Де лежать текст і кнопки поста — для подальшого редагування
    const info = { textId: null, kind: null, markupId: null, mediaId: null };
    const sendText = async (withMarkup) => {
      const m = await tg.call('sendMessage', {
        ...common, text: post.html, parse_mode: 'HTML',
        link_preview_options: { is_disabled: post.noPreview },
        ...(withMarkup && markup ? { reply_markup: markup } : {}),
      });
      ids.push(m.message_id);
      Object.assign(info, { textId: m.message_id, kind: 'text' });
      if (withMarkup && markup) info.markupId = m.message_id;
    };

    if (!files.length) {
      await sendText(true);
    } else if (files.length === 1) {
      const f = files[0];
      const fitsCaption = textLen <= CAPTION_MAX;
      const method = { photo: 'sendPhoto', video: 'sendVideo', animation: 'sendAnimation', document: 'sendDocument' }[f.kind];
      const m = await tg.callWithFiles(method, {
        ...common,
        ...(fitsCaption && textLen ? { caption: post.html, parse_mode: 'HTML' } : {}),
        ...(fitsCaption && markup ? { reply_markup: markup } : {}),
      }, [{ field: f.kind, buffer: f.buffer, filename: f.name, mime: f.mime }]);
      ids.push(m.message_id);
      info.mediaId = m.message_id;
      if (fitsCaption && textLen) Object.assign(info, { textId: m.message_id, kind: 'caption' });
      if (fitsCaption && markup) info.markupId = m.message_id;
      if (!fitsCaption) await sendText(true);
    } else {
      // Альбом: фото й відео разом, документи — окремим альбомом (так вимагає Telegram)
      const visual = files.filter((f) => f.kind === 'photo' || f.kind === 'video');
      const docs = files.filter((f) => f.kind === 'document' || f.kind === 'animation');
      const groups = [visual, docs].filter((g) => g.length);
      const captionHere = textLen && textLen <= CAPTION_MAX && !markup;
      for (const [gi, group] of groups.entries()) {
        if (group.length === 1) {
          const f = group[0];
          const method = { photo: 'sendPhoto', video: 'sendVideo', animation: 'sendAnimation', document: 'sendDocument' }[f.kind];
          const m = await tg.callWithFiles(method, {
            ...common, ...(captionHere && gi === 0 ? { caption: post.html, parse_mode: 'HTML' } : {}),
          }, [{ field: f.kind, buffer: f.buffer, filename: f.name, mime: f.mime }]);
          ids.push(m.message_id);
          if (captionHere && gi === 0) Object.assign(info, { textId: m.message_id, kind: 'caption' });
          continue;
        }
        const media = group.map((f, i) => ({
          type: f.kind === 'animation' ? 'document' : f.kind,
          media: `attach://f${i}`,
          ...(captionHere && gi === 0 && i === 0 ? { caption: post.html, parse_mode: 'HTML' } : {}),
        }));
        const msgs = await tg.callWithFiles('sendMediaGroup', { ...common, media },
          group.map((f, i) => ({ field: `f${i}`, buffer: f.buffer, filename: f.name, mime: f.mime })));
        ids.push(...msgs.map((x) => x.message_id));
        if (captionHere && gi === 0) Object.assign(info, { textId: msgs[0].message_id, kind: 'caption' });
      }
      // Кнопки до альбому не чіпляються — текст і кнопки окремим повідомленням
      if (!captionHere && (textLen || markup)) await sendText(true);
    }

    if (post.pin && ids.length) {
      await tg.call('pinChatMessage', { chat_id: chatId, message_id: ids[0], disable_notification: true })
        .catch((err) => log.warn(`Не удалось закрепить пост: ${err.description || err.message}`));
    }
    return { ids, info };
  }

  /** Публікація (або тест у чат студії). Повертає запис історії. */
  async publish(input) {
    const post = this.validate(input);
    if (input.test) {
      const studio = this.data.config.adminChatId;
      if (!studio) throw new ChannelError('Не указан получатель заявок — тест отправить некуда.');
      await this.wrap(() => this.send(studio, { ...post, pin: false }));
      return null;
    }
    const channel = this.channels().find((c) => String(c.id) === String(input.chatId));
    if (!channel) throw new ChannelError('Выберите канал или группу из списка.');

    if (input.scheduleAt) {
      const at = Date.parse(input.scheduleAt);
      if (!Number.isFinite(at)) throw new ChannelError('Неверная дата публикации.');
      if (at < Date.now() + 30 * 1000) throw new ChannelError('Время публикации должно быть в будущем.');
      const item = { id: crypto.randomBytes(4).toString('hex'), at: new Date(at).toISOString(), chatId: channel.id, chatTitle: channel.title, post, createdAt: new Date().toISOString() };
      (this.data.channelQueue ||= []).push(item);
      this.data.channelQueue.sort((a, b) => a.at.localeCompare(b.at));
      store.saveNow();
      log.info(`Пост в «${channel.title}» запланирован на ${item.at}`);
      return { scheduled: item };
    }
    return { sent: await this.publishNow(channel, post) };
  }

  async publishNow(channel, rawPost, sent = []) {
    const id = crypto.randomBytes(4).toString('hex');
    const post = tagPost(rawPost, id, this.data.bot.username);
    const { ids, info } = await this.wrap(() => this.send(channel.id, post, sent));
    const entry = {
      id, chatId: channel.id, chatTitle: channel.title, messageIds: ids,
      // Для редагування: вихідний текст без підпису, кнопки без мітки поста, де текст і кнопки в Telegram
      edit: {
        html: rawPost.source?.html ?? rawPost.html, signature: rawPost.source ? rawPost.source.signature : false,
        buttons: rawPost.buttons, noPreview: rawPost.noPreview, files: rawPost.files.length,
        textId: info.textId, kind: info.kind, markupId: info.markupId, mediaId: info.mediaId,
      },
      tracked: JSON.stringify(post) !== JSON.stringify(rawPost), stats: { starts: 0, people: 0, newPeople: 0 },
      sentAt: new Date().toISOString(), text: plainText(post.html).slice(0, 160), files: post.files.length,
      link: channel.username ? `https://t.me/${channel.username}/${ids[0]}` : null,
      pinned: post.pin, deleted: false,
    };
    (this.data.channelPosts ||= []).unshift(entry);
    this.data.channelPosts.length = Math.min(this.data.channelPosts.length, HISTORY_KEEP);
    store.saveNow();
    log.info(`Пост опубликован в «${channel.title}» (${ids.length} сообщ.)`);
    return entry;
  }

  /**
   * Змінити опублікований пост: текст, кнопки, підпис, превʼю посилань. Медіа не змінюються.
   * Кнопки на бота знову отримують мітку цього поста (статистика зберігається).
   */
  async editPost(id, input) {
    const entry = (this.data.channelPosts || []).find((p) => p.id === id);
    if (!entry || entry.deleted) throw new ChannelError('Пост не найден.');
    if (!entry.edit) throw new ChannelError('Этот пост опубликован до обновления 2.13 — изменить его можно только в Telegram.');
    const e = entry.edit;
    const valid = this.validate({ ...input, files: [], allowEmpty: e.files > 0 });
    const post = tagPost(valid, id, this.data.bot.username);
    const tg = this.tg();
    const markup = post.buttons.length ? { inline_keyboard: post.buttons } : { inline_keyboard: [] };
    const text = fillPlaceholders(post.html, this.data.bot.username);
    const len = plainLength(text);
    const call = (method, params) => this.wrap(() => tg.call(method, { chat_id: entry.chatId, ...params }))
      .catch((err) => { if (!/not modified/i.test(err.message)) throw err; });
    // Кнопки — туди, де вони були, або до повідомлення з текстом чи одиночного медіа (до альбому Telegram кнопки не дозволяє)
    const markupTarget = e.markupId || (e.kind === 'text' ? e.textId : e.mediaId) || null;
    if (post.buttons.length && !markupTarget) throw new ChannelError('К альбому кнопки не добавить — Telegram это не позволяет.');
    let textTarget = null;
    if (e.kind === 'text') {
      if (!len) throw new ChannelError('У поста без медиа должен остаться текст.');
      textTarget = e.textId;
      await call('editMessageText', {
        message_id: textTarget, text, parse_mode: 'HTML', link_preview_options: { is_disabled: post.noPreview },
        ...(markupTarget === textTarget ? { reply_markup: markup } : {}),
      });
    } else if (e.kind === 'caption' || (!e.kind && e.mediaId)) {
      if (len > CAPTION_MAX) throw new ChannelError(`У поста с медиа текст — не длиннее ${CAPTION_MAX} символов.`);
      textTarget = e.textId || e.mediaId;
      await call('editMessageCaption', { message_id: textTarget, caption: text, parse_mode: 'HTML', ...(markupTarget === textTarget ? { reply_markup: markup } : {}) });
      Object.assign(e, { textId: textTarget, kind: 'caption' });
    } else if (len) {
      throw new ChannelError('К альбому без текста подпись не добавить — Telegram это не позволяет.');
    }
    if (markupTarget && markupTarget !== textTarget) await call('editMessageReplyMarkup', { message_id: markupTarget, reply_markup: markup });
    if (markupTarget && post.buttons.length) e.markupId = markupTarget;
    Object.assign(e, { html: valid.source.html, signature: valid.source.signature, buttons: valid.buttons, noPreview: valid.noPreview });
    entry.text = plainText(text).slice(0, 160);
    entry.editedAt = new Date().toISOString();
    store.saveNow();
    log.info(`Пост в «${entry.chatTitle}» изменён`);
    return entry;
  }

  // --- Вітрина: готова робота й відгуки ---

  /** Текст поста «Нова робота» за замовчуванням. */
  showcaseDraft(order) {
    const title = order.pack?.title || order.hero;
    const hero = order.hero.length > 200 ? `${order.hero.slice(0, 200)}…` : order.hero;
    return `🎨 <b>Нова робота: «${escapeHtml(title)}»</b>\n\n${escapeHtml(hero)}\n${escapeHtml(order.quantity)} · ${escapeHtml(String(order.stickerType || '').toLowerCase())}\n\n` +
      'Хочете такий самий для себе чи команди? Тисніть кнопку 👇';
  }

  /**
   * Пост із готовою роботою: кілька живих стікерів з пака, потім текст із кнопками
   * «Додати стікерпак» і «Замовити стікери» (з міткою поста для статистики).
   */
  async publishShowcase(order, input) {
    if (!order.pack?.name) throw new ChannelError('У заявки ещё нет собранного стикерпака.');
    const channel = this.channels().find((c) => String(c.id) === String(input.chatId));
    if (!channel) throw new ChannelError('Выберите канал или группу.');
    const bot = this.data.bot.username;
    const post = this.validate({
      html: input.html || this.showcaseDraft(order), files: [], signature: input.signature !== false,
      buttons: [
        [{ text: '➕ Додати стікерпак', url: `https://t.me/addstickers/${order.pack.name}` }],
        ...(bot ? [[{ text: '🚀 Замовити стікери', url: `https://t.me/${bot}?start=channel` }]] : []),
      ],
    });
    const tg = this.tg();
    const count = Math.max(0, Math.min(5, Number(input.stickers ?? 3)));
    const stickerIds = [];
    if (count) {
      const set = await this.wrap(() => tg.call('getStickerSet', { name: order.pack.name }));
      for (const st of (set.stickers || []).slice(0, count)) {
        const m = await this.wrap(() => tg.call('sendSticker', { chat_id: channel.id, sticker: st.file_id, disable_notification: true }));
        stickerIds.push(m.message_id);
      }
    }
    const entry = await this.publishNow(channel, post);
    entry.messageIds = [...stickerIds, ...entry.messageIds];
    entry.showcase = { orderId: order.id };
    order.showcase = { ...(order.showcase || {}), postId: entry.id, postedAt: entry.sentAt, link: entry.link };
    store.saveNow();
    log.info(`Работа #${String(order.id).padStart(4, '0')} опубликована в «${channel.title}»`);
    return entry;
  }

  /** Пост з відгуком клієнта. */
  async publishReview(order, chatId) {
    const r = order.review;
    if (!r?.rating) throw new ChannelError('У заявки нет отзыва.');
    const channel = this.channels().find((c) => String(c.id) === String(chatId));
    if (!channel) throw new ChannelError('Выберите канал или группу.');
    const name = (order.fullName || '').split(' ')[0] || 'клієнт';
    const bot = this.data.bot.username;
    const html = `${'⭐'.repeat(r.rating)} <b>Відгук клієнта</b>\n\n` +
      (r.comment ? `<i>«${escapeHtml(r.comment)}»</i>\n` : '') + `— ${escapeHtml(name)}\n\n` +
      `Замовлення: ${escapeHtml(order.quantity)}, ${escapeHtml(String(order.stickerType || '').toLowerCase())}` +
      (order.pack?.name ? `\n<a href="https://t.me/addstickers/${order.pack.name}">Подивитися стікерпак</a>` : '');
    const post = this.validate({ html, files: [], buttons: bot ? [[{ text: '🚀 Замовити стікери', url: `https://t.me/${bot}?start=channel` }]] : [] });
    const entry = await this.publishNow(channel, post);
    r.postedAt = entry.sentAt;
    r.postLink = entry.link;
    store.saveNow();
    return entry;
  }

  async wrap(fn) {
    try { return await fn(); } catch (err) {
      if (err instanceof ChannelError) throw err;
      throw new ChannelError(`Telegram не принял пост: ${err.description || err.message}`, { cause: err });
    }
  }

  async deletePost(id) {
    const entry = (this.data.channelPosts || []).find((p) => p.id === id);
    if (!entry || entry.deleted) throw new ChannelError('Пост не найден.');
    const tg = this.tg();
    try {
      if (entry.messageIds.length > 1) await tg.call('deleteMessages', { chat_id: entry.chatId, message_ids: entry.messageIds });
      else await tg.call('deleteMessage', { chat_id: entry.chatId, message_id: entry.messageIds[0] });
    } catch (err) {
      throw new ChannelError(`Не удалось удалить (${err.description || err.message}). Telegram разрешает ботам удалять сообщения не старше 48 часов в группах.`);
    }
    entry.deleted = true;
    store.saveNow();
  }

  cancelScheduled(id) {
    const q = this.data.channelQueue || [];
    const i = q.findIndex((x) => x.id === id);
    if (i < 0) throw new ChannelError('Запланированный пост не найден.');
    q.splice(i, 1);
    store.saveNow();
  }

  /** Раз на 30 секунд — публікуємо запланові пости, час яких настав. */
  startScheduler() {
    this.timer = setInterval(() => this.tick().catch((err) => log.error(`Планировщик постов: ${err.message}`)), 30 * 1000);
    this.timer.unref();
  }

  async tick() {
    // Альбом вантажиться до 3 хвилин, а таймер — кожні 30 секунд: не запускаємо другий прохід поверх першого
    if (!this.runtime.ready || this.ticking) return;
    this.ticking = true;
    try { await this.publishDue(); } finally { this.ticking = false; }
  }

  async publishDue() {
    const q = this.data.channelQueue || [];
    const now = Date.now();
    while (q.length && Date.parse(q[0].at) <= now) {
      const item = q.shift();
      store.saveNow();
      const channel = this.channels().find((c) => String(c.id) === String(item.chatId)) || { id: item.chatId, title: item.chatTitle };
      const sent = [];
      try {
        await this.publishNow(channel, item.post, sent);
      } catch (err) {
        // Збій мережі до першого надісланого повідомлення — пост точно не вийшов, пробуємо ще раз пізніше
        const attempts = item.attempts || 0;
        if (!sent.length && attempts < RETRY_MAX && retryable(err.cause)) {
          item.attempts = attempts + 1;
          item.at = new Date(Date.now() + RETRY_STEP * item.attempts).toISOString();
          q.push(item);
          q.sort((a, b) => a.at.localeCompare(b.at));
          store.saveNow();
          log.warn(`Запланированный пост в «${item.chatTitle}» отложен (${err.message}), попытка ${item.attempts + 1} в ${item.at}`);
          continue;
        }
        log.error(`Запланированный пост в «${item.chatTitle}» не опубликован: ${err.message}`);
        store.addError('channel', err);
        const studio = this.data.config.adminChatId;
        if (studio) {
          await this.runtime.handlers?.send(studio, `⚠️ Запланированный пост в «${item.chatTitle}» не опубликован: ${err.message.replace(/</g, '&lt;')}`).catch(() => {});
        }
      }
    }
  }
}

/** {дата} → 08.10.2026 (Київ), {бот} → @username бота. */
export function fillPlaceholders(html, botUsername) {
  const date = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  return String(html || '')
    .replace(/\{дата\}/gi, date)
    .replace(/\{бот\}/gi, botUsername ? `@${botUsername}` : '');
}

function plainText(html) {
  return String(html || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}
