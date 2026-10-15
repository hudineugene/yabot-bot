// Журнал переписки для «Діалогів» GenAgent: усе, що людина написала боту, і все, що бот надіслав людині
// (меню, бриф, замовлення, відповіді студії, сповіщення, розсилки…), — з номерами повідомлень і часом.
// Запис — у двох точках: вхідні оновлення (record*) і кожне надсилання через Telegram.call (Telegram.onSent).
// Надсилаємо фоном пачками на {url}/sync з повтором при збої; черга зберігається в даних бота і переживає перезапуск.
// GenAgent відкидає повтори за номером і впізнає те, що вже прийшло через помічника.
import { AsyncLocalStorage } from 'node:async_hooks';
import { store } from './store.js';
import { log } from './log.js';
import { Telegram } from './telegram.js';
import { memberByChat } from './orders.js';

const FLUSH_EVERY_MS = 4000;
const BATCH = 100;
const MAX_PENDING = 20000;
const TIMEOUT_MS = 20000;

// Хто пише людині: agent — відповідь помічника, manager — студія/менеджер, інакше — сам бот (меню, шаблони)
const author = new AsyncLocalStorage();

/** Виконати fn так, що все, що вона надішле людині, підписано як від помічника чи менеджера. */
export function asAuthor(by, fn) {
  return author.run(by, fn);
}

function settings() {
  const s = store.data.config.genagent;
  return s && s.enabled && s.url && s.key ? s : null;
}

function queue() {
  return (store.data.agentJournal ||= []);
}

function isClientChat(chatId) {
  const id = Number(chatId);
  if (!Number.isFinite(id) || id <= 0) return false;
  if (String(chatId) === String(store.data.config.adminChatId)) return false;
  return !memberByChat(chatId);
}

function userInfo(id, from) {
  const u = store.data.users[String(id)] || {};
  const name = [from?.first_name ?? u.firstName, from?.last_name ?? u.lastName].filter(Boolean).join(' ').slice(0, 200);
  const username = from?.username ?? u.username;
  return { id: String(id), ...(name ? { name } : {}), ...(username ? { username } : {}) };
}

function push(userId, item, from) {
  if (!settings() || !userId) return;
  const q = queue();
  q.push({ user: userInfo(userId, from), item: { ...item, text: String(item.text || '').slice(0, 4000) } });
  if (q.length > MAX_PENDING) q.splice(0, q.length - MAX_PENDING);
}

const plain = (html) => String(html || '')
  .replace(/<[^>]+>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

const duration = (s) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '');

/** Вміст повідомлення Telegram для журналу: { kind, text }. */
export function describe(m) {
  const caption = m.caption ? plain(m.caption) : '';
  if (m.text) return { kind: 'text', text: m.text };
  if (m.sticker) return { kind: 'sticker', text: m.sticker.emoji || '' };
  if (m.photo) return { kind: 'photo', text: caption };
  if (m.video_note) return { kind: 'video_note', text: duration(m.video_note.duration) };
  if (m.video) return { kind: 'video', text: caption };
  if (m.animation) return { kind: 'animation', text: caption };
  if (m.voice) return { kind: 'voice', text: duration(m.voice.duration) };
  if (m.audio) return { kind: 'audio', text: [m.audio.performer, m.audio.title].filter(Boolean).join(' — ') || caption };
  if (m.document) return { kind: 'document', text: [m.document.file_name, caption].filter(Boolean).join('\n') };
  if (m.venue) return { kind: 'location', text: [m.venue.title, m.venue.address].filter(Boolean).join(', ') };
  if (m.location) return { kind: 'location', text: `${m.location.latitude.toFixed(5)}, ${m.location.longitude.toFixed(5)}` };
  if (m.contact) return { kind: 'contact', text: [m.contact.first_name, m.contact.last_name, m.contact.phone_number].filter(Boolean).join(' ') };
  if (m.dice) return { kind: 'sticker', text: m.dice.emoji || '🎲' };
  if (m.poll) return { kind: 'other', text: m.poll.question || '' };
  return { kind: 'other', text: caption };
}

/** Повідомлення людини в приватному чаті. id — той самий, що бот передає помічнику (messageId). */
export function recordIncoming(m) {
  if (!m || m.chat?.type !== 'private' || !m.from || m.from.is_bot || !isClientChat(m.chat.id)) return;
  const { kind, text } = describe(m);
  push(m.chat.id, { id: incomingId(m), dir: 'in', kind, text, at: (m.date || Date.now() / 1000) * 1000 }, m.from);
}

export const incomingId = (m) => `in:${m.message_id}`;

/** Реакція людини на повідомлення (👍, ❤️…). Зняту реакцію не записуємо. */
export function recordReaction(r) {
  if (!r?.chat || r.chat.type !== 'private' || !r.user || !isClientChat(r.chat.id)) return;
  const emojis = (r.new_reaction || []).map((x) => (x.type === 'emoji' ? x.emoji : '⭐')).join(' ');
  if (!emojis) return;
  push(r.chat.id, { id: `re:${r.message_id}:${r.date}`, dir: 'in', kind: 'reaction', text: emojis, at: (r.date || Date.now() / 1000) * 1000 }, r.user);
}

/** Людина виправила своє повідомлення — новий текст окремим рядком. */
export function recordEdit(m) {
  if (!m || m.chat?.type !== 'private' || !m.from || !isClientChat(m.chat.id)) return;
  const { text } = describe(m);
  if (!text) return;
  push(m.chat.id, { id: `ed:${m.message_id}:${m.edit_date || m.date}`, dir: 'in', kind: 'edit', text, at: (m.edit_date || m.date || Date.now() / 1000) * 1000 }, m.from);
}

/** Натискання кнопки: підпис кнопки, яку людина бачила. */
export function recordCallback(cb) {
  const chat = cb.message?.chat;
  if (!chat || chat.type !== 'private' || !isClientChat(chat.id)) return;
  const rows = cb.message?.reply_markup?.inline_keyboard || [];
  const button = rows.flat().find((b) => b.callback_data === cb.data);
  const label = button?.text || cb.data;
  push(chat.id, { id: `cb:${cb.id}`, dir: 'in', kind: 'button', text: label, at: Date.now() }, cb.from);
}

/** Повідомлення в Mini App (не повідомлення Telegram): свій номер, той самий передається помічнику. */
export function recordApp(userId, dir, text, { by, id } = {}) {
  const itemId = id || `app:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
  push(userId, { id: itemId, dir, ...(dir === 'out' && by ? { by } : {}), kind: 'text', text, at: Date.now() });
  return itemId;
}

const SENDS = {
  sendMessage: 'text', sendPhoto: 'photo', sendDocument: 'document', sendVideo: 'video', sendAnimation: 'animation',
  sendVoice: 'voice', sendAudio: 'audio', sendSticker: 'sticker', sendVideoNote: 'video_note', sendLocation: 'location',
  sendVenue: 'location', sendContact: 'contact', sendMediaGroup: 'photo', copyMessage: 'other', sendInvoice: 'other',
};

const field = (params, key) => (params instanceof FormData ? params.get(key) : params?.[key]);

function buttonsOf(params) {
  let markup = field(params, 'reply_markup');
  if (typeof markup === 'string') { try { markup = JSON.parse(markup); } catch { markup = null; } }
  const labels = (markup?.inline_keyboard || []).flat().map((b) => b.text).filter(Boolean).slice(0, 8);
  return labels.length ? `\n\n[${labels.join(' · ')}]` : '';
}

// Кожне успішне надсилання людині — в журнал (усі екземпляри Telegram: бот, сторінка бота, Mini App)
Telegram.onSent = (method, params, result) => {
  const kind = SENDS[method];
  if (!kind) return;
  const chatId = field(params, 'chat_id');
  if (!isClientChat(chatId)) return;
  const by = author.getStore();
  const base = { dir: 'out', ...(by ? { by } : {}), at: Date.now() };
  if (method === 'sendMediaGroup') {
    const media = (() => { try { const v = field(params, 'media'); return typeof v === 'string' ? JSON.parse(v) : v || []; } catch { return []; } })();
    (Array.isArray(result) ? result : []).forEach((r, i) => {
      push(chatId, { ...base, id: `out:${r.message_id}`, kind: media[i]?.type || 'photo', text: plain(media[i]?.caption || '') });
    });
    return;
  }
  const id = result?.message_id;
  if (!id) return;
  let text = plain(field(params, 'text') || field(params, 'caption') || '');
  if (method === 'sendInvoice') text = [field(params, 'title'), field(params, 'description')].filter(Boolean).join('\n');
  if (method === 'sendDocument' && params instanceof FormData) {
    const doc = params.get('document');
    if (doc && typeof doc === 'object' && doc.name) text = [doc.name, text].filter(Boolean).join('\n');
  }
  if (method === 'sendContact') text = [field(params, 'first_name'), field(params, 'phone_number')].filter(Boolean).join(' ');
  if (method === 'sendLocation') text = `${field(params, 'latitude')}, ${field(params, 'longitude')}`;
  push(chatId, { ...base, id: `out:${id}`, kind, text: (text + buttonsOf(params)).trim() });
};

// --- Надсилання в GenAgent ---

let busy = false;
let backoffUntil = 0;
let failures = 0;

export async function flushJournal() {
  // За один прохід — кілька людей (пачка на людину), щоб черга після збою швидко розійшлася
  for (let i = 0; i < 20; i++) {
    if (!(await flushOne())) break;
  }
}

async function flushOne() {
  const s = settings();
  const q = queue();
  if (!s || busy || !q.length || Date.now() < backoffUntil) return false;
  busy = true;
  try {
    // Пачка — повідомлення однієї людини, у порядку надходження
    const uid = q[0].user.id;
    const batch = [];
    for (const entry of q) {
      if (entry.user.id !== uid) continue;
      batch.push(entry);
      if (batch.length >= BATCH) break;
    }
    const user = batch[batch.length - 1].user;
    const res = await fetch(`${s.url}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${s.key}` },
      body: JSON.stringify({ user, items: batch.map((e) => e.item) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 400) {
      // Пачку не прийнято через вміст — не блокуємо чергу назавжди
      log.warn('GenAgent: журнал переписки — пачку не прийнято (400), пропускаю');
    } else if (!res.ok) {
      throw new Error(res.status === 404 ? 'GenAgent ще не вміє приймати журнал (/sync)' : `ответ ${res.status}`);
    }
    const sent = new Set(batch);
    store.data.agentJournal = queue().filter((e) => !sent.has(e));
    store.save();
    failures = 0;
    return true;
  } catch (err) {
    failures++;
    backoffUntil = Date.now() + Math.min(60000, 4000 * 2 ** Math.min(failures, 4));
    if (failures === 1 || failures % 20 === 0) log.warn(`GenAgent: журнал переписки не надіслано — ${err.message}`);
    return false;
  } finally {
    busy = false;
  }
}

/**
 * Один раз: минуле листування, яке бот зберіг сам, — переписка по замовленнях (людина ↔ студія) і розмова
 * з помічником (users[].ai). Що в GenAgent уже є, він упізнає за текстом і часом — дублів не буде.
 */
export function backfillJournal() {
  if (!settings() || store.data.agentJournalBackfilled) return 0;
  let n = 0;
  for (const o of store.data.inquiries || []) {
    if (!o.userId || !isClientChat(o.userId)) continue;
    (o.messages || []).forEach((m, i) => {
      const at = Date.parse(m.at);
      if (!Number.isFinite(at) || (!m.text && !m.media?.length)) return;
      const kind = m.media?.[0]?.type || 'text';
      push(o.userId, { id: `ord:${o.id}:${i}`, dir: m.from === 'client' ? 'in' : 'out', ...(m.from === 'client' ? {} : { by: 'manager' }), kind, text: plain(m.text || ''), at });
      n++;
    });
  }
  for (const [uid, u] of Object.entries(store.data.users || {})) {
    if (!isClientChat(uid)) continue;
    for (const m of u.ai || []) {
      const at = Date.parse(m.at);
      if (!Number.isFinite(at) || !m.text) continue;
      const out = m.from !== 'client';
      push(uid, { id: `ai:${uid}:${at}:${m.from}`, dir: out ? 'out' : 'in', ...(out ? { by: m.from === 'ai' ? 'agent' : 'manager' } : {}), kind: 'text', text: m.text, at });
      n++;
    }
  }
  // У черзі — за часом, щоб пачки однієї людини йшли по порядку
  queue().sort((a, b) => a.item.at - b.item.at);
  store.data.agentJournalBackfilled = new Date().toISOString();
  store.save();
  log.info(`GenAgent: журнал переписки — до відправки минулих повідомлень: ${n}`);
  return n;
}

export function startJournal() {
  setTimeout(() => { try { backfillJournal(); } catch (err) { log.warn(`GenAgent: минуле листування не зібрано — ${err.message}`); } }, 30000).unref();
  const timer = setInterval(() => void flushJournal(), FLUSH_EVERY_MS);
  timer.unref();
  return { close: () => clearInterval(timer) };
}
