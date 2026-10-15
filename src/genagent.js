// Синхронізація з ІІ-агентом студії (GenAgent): ціни, послуги, графік і часті питання з цього бота
// автоматично потрапляють у базу знань агента на сайті. Власник змінив ціну тут — агент знає нову за кілька хвилин.
// Ще бот пересилає агенту коментарі під постами каналу (з групи обговорень) і публікує його відповіді своїм іменем.
// І відповідає клієнтам без замовлення в чаті бота та в Mini App (users[id].ai — спільна історія розмови).
// config.genagent = { url, key, enabled, comments, chat, lastSyncAt, lastError, lastHash, commentsError, chatError }
import crypto from 'node:crypto';
import { store } from './store.js';
import { log } from './log.js';
import { activeServices } from './services.js';
import { faqList } from './faq.js';
import { PRICE_TYPE_KEYS, PRICE_QTY_KEYS, priceFor } from './texts.js';
import { textsFor } from './lang.js';
import { escapeHtml, isWorkingTime, todayKey } from './util.js';
import { TIME_ZONE } from './config.js';
import { clientReplyTime } from './sla.js';
import { langOf } from './lang.js';
import { asAuthor } from './journal.js';

const SYNC_EVERY_MS = 5 * 60 * 1000;
const RESEND_MS = 6 * 60 * 60 * 1000; // навіть без змін — раз на 6 год (якщо базу в агенті почистили)
const TIMEOUT_MS = 20 * 1000;
const TYPE_LABELS = { static: 'Статичні', animated: 'Анімовані' };
const QTY_LABELS = { 5: '5 стікерів', 10: '10 стікерів', '15-20': '15–20 стікерів' };
const DAY_NAMES = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

export const URL_PATTERN = /^https:\/\/[^\s/]+\/api\/agent\/[A-Za-z0-9_-]{6,64}$/;

export function genagentSettings() {
  const c = store.data.config;
  c.genagent = { url: '', key: '', enabled: false, comments: false, chat: false, lastSyncAt: null, lastError: '', lastHash: '', commentsError: '', chatError: '', ...(c.genagent || {}) };
  return c.genagent;
}

const money = (n) => `${Number(n).toLocaleString('uk-UA')} грн`;
const price = (v) => (/^\d+$/.test(v) ? money(v) : v);

/** Дні роботи «Пн–Пт» або «Пн, Ср, Пт». */
function daysText(days = []) {
  const list = [...new Set(days)].filter((d) => d >= 1 && d <= 7).sort();
  if (!list.length) return '';
  const consecutive = list.every((d, i) => i === 0 || d === list[i - 1] + 1);
  return consecutive && list.length > 2 ? `${DAY_NAMES[list[0]]}–${DAY_NAMES[list.at(-1)]}` : list.map((d) => DAY_NAMES[d]).join(', ');
}

/** Документи для бази знань агента: { key, title, content }. */
export function buildKnowledge() {
  const c = store.data.config;
  const services = activeServices();
  const lines = ['# Послуги студії YABOT', '', '_Дані з бота замовлень @yabotuabot — оновлюються автоматично._'];

  for (const s of services) {
    lines.push('', `## ${s.name}`, s.intro || s.tagline);
    if (s.chips?.length) lines.push(`- ${s.chips.join(', ')}.`);
    if (s.includes?.length) lines.push(`- Що входить: ${s.includes.map((x) => x.charAt(0).toLowerCase() + x.slice(1)).join(', ')}.`);
    if (s.steps?.length) lines.push(`- Етапи: ${s.steps.map((x) => x.toLowerCase()).join(' → ')}.`);

    if (s.id === 'stickers') {
      const rows = PRICE_QTY_KEYS.map((q) => [q, ...PRICE_TYPE_KEYS.map((t) => priceFor(c.prices, t, q))])
        .filter(([, ...p]) => p.some(Boolean));
      if (rows.length) {
        lines.push('', '### Орієнтовна вартість стікерпака', `| Кількість | ${PRICE_TYPE_KEYS.map((t) => TYPE_LABELS[t]).join(' | ')} |`, `|---|${PRICE_TYPE_KEYS.map(() => '---').join('|')}|`);
        for (const [q, ...p] of rows) lines.push(`| ${QTY_LABELS[q] || q} | ${p.map((v) => (v ? price(v) : '—')).join(' | ')} |`);
        lines.push('', 'Це орієнтир. Точну суму дизайнер називає після брифу: вона залежить від кількості стікерів, складності героя й анімації.');
        if (c.prices?.note?.trim()) lines.push(c.prices.note.trim());
      } else {
        lines.push(s.priceFrom ? `- Вартість: від ${money(s.priceFrom)}. Точну суму дизайнер назве після брифу.` : '- Вартість — індивідуально, дизайнер назве після брифу.');
      }
    } else if (s.packages?.length) {
      lines.push('', '### Пакети');
      for (const p of s.packages) {
        lines.push(`- **${p.name}**${p.price ? ` — від ${money(p.price)}` : ''}${p.items ? `: ${p.items.split('\n').join('; ')}` : ''}`);
      }
      lines.push('Точна вартість і терміни — після обговорення задачі.');
    } else if (s.priceFrom) {
      lines.push(`- Вартість: від ${money(s.priceFrom)}. Точна сума — після обговорення задачі.`);
    } else {
      lines.push('- Вартість і терміни — індивідуально, після обговорення задачі.');
    }
  }
  if (!services.length) lines.push('', 'Зараз студія тимчасово не приймає нові замовлення через бот.');

  const wh = c.workHours || {};
  lines.push('', '## Графік роботи');
  if (wh.enabled && daysText(wh.days)) {
    lines.push(`${daysText(wh.days)}, ${wh.from}–${wh.to} за Києвом. Повідомлення поза графіком теж приймаємо — дизайнер відповість, щойно повернеться до роботи.`);
  } else {
    lines.push('Повідомлення приймаємо будь-коли — дизайнер відповість, щойно зможе.');
  }
  const v = c.vacation || {};
  if (v.enabled) {
    lines.push('', `**Зараз студія у відпустці${v.until ? ` до ${v.until}` : ''}.** ${v.acceptOrders !== false ? 'Замовлення приймаємо, але в роботу візьмемо після повернення.' : 'Нові замовлення тимчасово не приймаємо.'}`);
    if (v.message?.trim()) lines.push(v.message.trim());
  }

  const faq = faqList().filter((f) => f.q?.trim() && f.a?.trim());
  const faqText = ['# Часті питання', '', '_Відповіді з бота замовлень @yabotuabot: «тут», «у боті» й кнопки на кшталт «💰 Вартість» — це бот https://t.me/yabotuabot._']
    .concat(faq.flatMap((f) => ['', f.q.trim(), f.a.trim()]))
    .join('\n');

  return [
    { key: 'services', title: 'Послуги та ціни', content: lines.join('\n') },
    { key: 'faq', title: 'Часті питання', content: faqText },
  ];
}

/** Надіслати базу знань агенту. force — навіть якщо нічого не змінилось. */
export async function syncGenagent({ force = false } = {}) {
  const s = genagentSettings();
  if (!s.enabled || !s.url || !s.key) return { skipped: true };
  const sources = buildKnowledge();
  const body = JSON.stringify({ sources });
  const hash = crypto.createHash('sha256').update(s.url + body).digest('hex').slice(0, 16);
  const fresh = s.lastSyncAt && Date.now() - Date.parse(s.lastSyncAt) < RESEND_MS;
  if (!force && hash === s.lastHash && fresh && !s.lastError) return { skipped: true, unchanged: true };

  try {
    const res = await fetch(`${s.url}/knowledge`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${s.key}` },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(res.status === 401 ? 'агент не принял ключ — проверьте адрес и ключ канала «Свой бот (API)»' : `ответ ${res.status}${data.error ? ` (${data.error})` : ''}`);
    }
    const changed = Boolean(data.created || data.updated || data.removed);
    if (changed || s.lastError) log.info(`GenAgent: база знаний обновлена (новых ${data.created || 0}, изменено ${data.updated || 0})`);
    Object.assign(s, { lastHash: hash, lastSyncAt: new Date().toISOString(), lastError: '' });
    store.save();
    return { ok: true, ...data };
  } catch (err) {
    const message = err.name === 'TimeoutError' ? 'агент не ответил за 20 секунд' : err.message === 'fetch failed' ? 'нет связи с агентом — проверьте адрес' : err.message;
    if (s.lastError !== message) log.warn(`GenAgent: не удалось обновить базу знаний — ${message}`);
    s.lastError = message.slice(0, 300);
    store.save();
    return { ok: false, error: s.lastError };
  }
}

// --- ІІ-помічник у чаті бота й у Mini App ---

const CHAT_TIMEOUT_MS = 60 * 1000;
const HISTORY_MAX = 40;

/** Помічник увімкнений: є адреса й ключ агента і стоїть галочка «Отвечать клиентам». */
export const chatOn = () => {
  const s = genagentSettings();
  return s.enabled && s.chat && s.url && s.key ? s : null;
};

/** Розмова людини з помічником (і відповіді студії на передані питання) — для показу в Mini App. */
export function aiHistory(userId) {
  return store.data.users[String(userId)]?.ai || [];
}

export function addAiHistory(userId, from, text) {
  const user = store.data.users[String(userId)];
  if (!user || !text) return;
  user.ai = [...(user.ai || []), { from, text: String(text).slice(0, 4000), at: new Date().toISOString() }].slice(-HISTORY_MAX);
}

const DAY_WORDS = {
  uk: { today: 'сьогодні', tomorrow: 'завтра', from: 'з', days: ['', 'у понеділок', 'у вівторок', 'у середу', 'у четвер', 'у пʼятницю', 'у суботу', 'у неділю'], after: 'після відпустки' },
  en: { today: 'today', tomorrow: 'tomorrow', from: 'from', days: ['', 'on Monday', 'on Tuesday', 'on Wednesday', 'on Thursday', 'on Friday', 'on Saturday', 'on Sunday'], after: 'after the vacation' },
};

/** Коли студія відкриється, словами: «завтра з 10:00», «у понеділок з 10:00». */
export function nextOpening(hours, lang = 'uk', now = new Date()) {
  const w = DAY_WORDS[lang] || DAY_WORDS.uk;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(now).map((p) => [p.type, p.value]));
  const today = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[parts.weekday];
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const [fh, fm] = String(hours.from).split(':').map(Number);
  for (let offset = 0; offset <= 7; offset++) {
    const day = ((today - 1 + offset) % 7) + 1;
    if (!hours.days?.includes(day)) continue;
    if (offset === 0 && minutes >= fh * 60 + (fm || 0)) continue;
    const when = offset === 0 ? w.today : offset === 1 ? w.tomorrow : w.days[day];
    return `${when} ${w.from} ${hours.from}`;
  }
  return '';
}

/**
 * Чи працює студія зараз — для чесного строку відповіді, коли помічник передає людину студії:
 * відпустка, неробочий час (і коли відкриємося) або звичайний час відповіді (медіана, якщо власник дозволив показувати).
 */
export function teamNow(userId, now = new Date()) {
  const cfg = store.data.config;
  const lang = langOf(userId) === 'en' ? 'en' : 'uk';
  const v = cfg.vacation || {};
  if (v.enabled && (!v.until || v.until >= todayKey())) {
    return { open: false, next: v.until ? `${DAY_WORDS[lang].after} (${v.until.split('-').reverse().join('.')})` : DAY_WORDS[lang].after };
  }
  const hours = cfg.workHours;
  if (hours?.enabled && !isWorkingTime(hours, now)) {
    const next = nextOpening(hours, lang, now);
    return { open: false, ...(next ? { next } : {}) };
  }
  const minutes = clientReplyTime();
  return { open: true, ...(minutes ? { minutes: Math.round(minutes) } : {}) };
}

/**
 * Запитати агента. Повертає { reply, handoff, summary } або null (вимкнено, агент недоступний чи не відповів) —
 * тоді бот поводиться як раніше: частi питання й передача питання студії.
 */
export async function askAgent(from, text, context, messageId, image) {
  const s = chatOn();
  if (!s) return null;
  try {
    const res = await fetch(s.url, {
      method: 'POST',
      headers: authHeaders(s),
      body: JSON.stringify({
        user: { id: from.id, name: [from.first_name, from.last_name].filter(Boolean).join(' ').slice(0, 200), username: from.username },
        text: String(text).slice(0, 4000),
        ...(context ? { context: String(context).slice(0, 2000) } : {}),
        // номер у журналі переписки (journal.js) — щоб GenAgent не записав це повідомлення двічі
        ...(messageId ? { messageId } : {}),
        // фото людини: GenAgent опише його, і помічник відповість з урахуванням
        ...(image ? { image } : {}),
        // чи працює студія зараз — помічник назве чесний строк, коли передає людину студії
        team: teamNow(from.id),
      }),
      signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(res.status === 401 ? 'агент не принял ключ' : `ответ ${res.status}`);
    const data = await res.json();
    if (s.chatError) { s.chatError = ''; store.save(); }
    const actions = Array.isArray(data.actions) ? data.actions.filter((a) => a && typeof a.type === 'string') : [];
    // upset — помічник передав незадоволену людину: студія бачить позначку «першочергово»
    const upset = Boolean(data.upset);
    if (!data.reply) return data.handoff ? { reply: null, handoff: true, summary: data.summary || null, upset, actions } : null;
    return { reply: String(data.reply), handoff: Boolean(data.handoff), summary: data.summary || null, upset, actions };
  } catch (err) {
    const message = err.name === 'TimeoutError' ? 'агент не ответил за минуту' : err.message === 'fetch failed' ? 'нет связи с агентом' : err.message;
    if (s.chatError !== message) log.warn(`GenAgent (помощник): ${message}`);
    s.chatError = String(message).slice(0, 300);
    store.save();
    return null;
  }
}

// --- Відповідь менеджера з GenAgent («Діалоги» чи кнопка «Відповісти» в Telegram) ---

// Менеджер написав людині з GenAgent — розмову веде він: помічник мовчить, повідомлення людини йдуть
// менеджеру в «Діалоги». Поки менеджер не поверне людину помічнику або не мовчить довше MANAGER_HOLD_MS.
const MANAGER_HOLD_MS = 12 * 60 * 60 * 1000;

export function managerTalking(userId, now = Date.now()) {
  const user = store.data.users[String(userId)];
  const at = user?.managerAt ? Date.parse(user.managerAt) : 0;
  if (!at || now - at > MANAGER_HOLD_MS) return false;
  return !(user.aiResumedAt && Date.parse(user.aiResumedAt) >= at);
}

/**
 * Записати в «Діалоги» GenAgent те, що агенту не надсилалось: user — людина пише, поки розмову веде менеджер;
 * media — людина надіслала не текст (стікер, фото…), text — підпис на кшталт «Стикер». Агент на це не відповідає.
 */
export async function logToAgent(from, role, text, messageId) {
  const s = chatOn();
  if (!s || !from?.id) return false;
  try {
    const res = await fetch(`${s.url}/log`, {
      method: 'POST',
      headers: authHeaders(s),
      body: JSON.stringify({
        user: { id: from.id, name: [from.first_name, from.last_name].filter(Boolean).join(' ').slice(0, 200) || undefined, username: from.username },
        role,
        text: String(text || '').slice(0, 4000),
        ...(messageId ? { messageId } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Що надіслала людина, якщо не текст — для «Діалогів» (мова адмінки GenAgent — російська). */
export function mediaLabel(m) {
  const kind = m.sticker ? `Стикер${m.sticker.emoji ? ' ' + m.sticker.emoji : ''}` : m.photo ? 'Фотография' : m.video ? 'Видео'
    : m.animation ? 'GIF' : m.voice ? 'Голосовое сообщение' : m.video_note ? 'Видеосообщение' : m.audio ? 'Аудиофайл'
    : m.document ? `Документ${m.document.file_name ? ': ' + m.document.file_name : ''}` : m.location ? 'Геолокация' : m.contact ? 'Контакт' : 'Нетекстовое сообщение';
  return m.caption ? `${kind}: ${m.caption}` : kind;
}

/** Відповідь менеджера з GenAgent — людині від імені студії, як відповідь студії на питання. */
async function sendManagerReply(tg, item) {
  const user = store.data.users[String(item.userId)];
  if (!user) return { error: 'людини немає в боті' };
  try {
    const sent = await asAuthor('manager', () => tg.call('sendMessage', { chat_id: item.userId, text: `${textsFor(item.userId).STUDIO_ANSWER}\n\n${escapeHtml(item.text)}`, parse_mode: 'HTML' }));
    user.managerAt = new Date().toISOString();
    addAiHistory(item.userId, 'studio', item.text);
    store.save();
    return { messageId: sent.message_id };
  } catch (err) {
    if (err?.status === 403) { user.blocked = true; store.save(); }
    return { error: (err.description || err.message || 'не надіслано').slice(0, 300) };
  }
}

/**
 * Розшифрувати голосове людини (OGG/Opus з Telegram) — GenAgent робить це на нашому сервері, без оплати за хвилини.
 * Повертає { text } (text: null — слів не розібрати) з reason, або null, якщо помічник вимкнений чи GenAgent недоступний.
 */
/**
 * Людина прийшла з чату на сайті («Продовжити в Telegram», /start w_<код>): GenAgent переносить розмову
 * із сайту в розмову бота — помічник продовжує з того ж місця. true — перенесено.
 */
export async function linkFromSite(token, from) {
  const s = chatOn();
  if (!s || !token) return false;
  try {
    const res = await fetch(`${s.url}/link`, {
      method: 'POST', headers: authHeaders(s),
      body: JSON.stringify({ token, user: { id: from.id, name: [from.first_name, from.last_name].filter(Boolean).join(' ').slice(0, 200), username: from.username } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`ответ ${res.status}`);
    return Boolean((await res.json()).linked);
  } catch (err) {
    log.warn(`GenAgent (перехід із сайту): ${err.message}`);
    return false;
  }
}

export const VOICE_MAX_SEC = 120;
/** Голосове з Mini App (WAV, записаний у браузері; base64) → текст. Як transcribeVoice, але формат wav. */
export async function transcribeWav(base64, userId) {
  return transcribeVoice(Buffer.from(base64, 'base64'), userId, 'wav');
}

export async function transcribeVoice(audio, userId, format = 'ogg') {
  const s = chatOn();
  if (!s || !audio?.length) return null;
  try {
    const res = await fetch(`${s.url}/transcribe`, {
      method: 'POST', headers: authHeaders(s),
      body: JSON.stringify({ user: { id: String(userId) }, audio: Buffer.from(audio).toString('base64'), format, language: store.data.users[String(userId)]?.lang || 'uk' }),
      // перше голосове після паузи чекає завантаження моделі (~30 с)
      signal: AbortSignal.timeout(90 * 1000),
    });
    if (!res.ok) throw new Error(`ответ ${res.status}`);
    const data = await res.json();
    return { text: data.text ? String(data.text).slice(0, 2000) : null, reason: data.reason || (data.text ? '' : 'no_speech') };
  } catch (err) {
    log.warn(`GenAgent (голосове): ${err.name === 'TimeoutError' ? 'не розшифрував за 90 с' : err.message}`);
    return null;
  }
}

/**
 * Дістати з розмови людини з помічником поля для брифу (GenAgent /extract, дешева модель).
 * fields — [{ key, description, options? }]. Повертає { key: значення | null } або null (помилка / вимкнено).
 */
export async function extractFromAgent(userId, fields) {
  const s = chatOn();
  if (!s || !userId) return null;
  try {
    const res = await fetch(`${s.url}/extract`, {
      method: 'POST', headers: authHeaders(s),
      body: JSON.stringify({ user: { id: String(userId) }, fields }),
      signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.values && typeof data.values === 'object' ? data.values : null;
  } catch {
    return null;
  }
}

/** Чи говорила людина з помічником нещодавно (14 днів) — тоді є сенс заповнювати бриф із розмови. */
export function talkedRecently(userId) {
  const last = aiHistory(userId).filter((m) => m.from === 'client').at(-1);
  return Boolean(last && Date.now() - Date.parse(last.at) < 14 * 24 * 60 * 60 * 1000);
}

// --- Воронка й оцінки відповідей ---

/**
 * Подія для воронки агента в GenAgent (бриф, оплата…) або оцінка відповіді (rating_up / rating_down).
 * Тихо: без мережі чи ключа нічого не ламаємо. Надсилаємо, лише коли підключено агента.
 */
export function sendAgentEvent(userId, type, label = '', value = undefined) {
  const s = genagentSettings();
  if (!s.enabled || !s.url || !s.key || !userId) return;
  const body = { user: { id: String(userId) }, type, ...(label ? { label } : {}), ...(Number(value) > 0 ? { value: Number(value) } : {}) };
  fetch(`${s.url}/event`, { method: 'POST', headers: authHeaders(s), body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) })
    .catch(() => {});
}

/**
 * Агент супроводжує замовлення: новий статус → GenAgent (стрічка замовлення в контексті агента).
 * write — попросити в агента живе повідомлення замість шаблону (fallback): повертає текст або null —
 * тоді шлемо свій шаблон. Живий текст чекаємо не довше 9 с; без мережі чи ключа — просто null.
 */
export async function orderUpdate(userId, order, fallback = '', write = false) {
  const s = genagentSettings();
  if (!s.enabled || !s.url || !s.key || !userId) return null;
  const ask = Boolean(write && fallback);
  try {
    const res = await fetch(`${s.url}/order`, {
      method: 'POST',
      headers: authHeaders(s),
      body: JSON.stringify({ user: { id: String(userId) }, order, ...(ask ? { fallback: fallback.slice(0, 2000), write: true } : {}) }),
      signal: AbortSignal.timeout(ask ? 9000 : TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return typeof j.text === 'string' && j.text.trim() ? j.text.trim() : null;
  } catch {
    return null;
  }
}

/** Кнопки оцінки під відповіддю помічника в чаті бота. */
export const ratingKeyboard = () => ({ inline_keyboard: [[{ text: '👍', callback_data: 'air:up' }, { text: '👎', callback_data: 'air:down' }]] });

// --- Коментарі під постами каналу ---

const commentsOn = () => {
  const s = genagentSettings();
  return s.enabled && s.comments && s.url && s.key ? s : null;
};
const authHeaders = (s) => ({ 'content-type': 'application/json', authorization: `Bearer ${s.key}` });

function commentsFailed(s, message) {
  if (s.commentsError !== message) log.warn(`GenAgent (комментарии): ${message}`);
  s.commentsError = String(message).slice(0, 300);
  store.save();
}

/**
 * Повідомлення з групи обговорень: агенту йдуть коментарі до постів і відповіді людей на повідомлення бота.
 * Розмови людей між собою, загальний чат групи, повідомлення від імені каналу й інших ботів — ні.
 */
export async function forwardComment(m, botId) {
  const s = commentsOn();
  if (!s || (m.chat.type !== 'group' && m.chat.type !== 'supergroup')) return false;
  if (m.is_automatic_forward || m.sender_chat || !m.from || m.from.is_bot || !m.message_thread_id) return false;
  const parent = m.reply_to_message;
  const toPost = Boolean(parent?.is_automatic_forward);
  const toBot = Boolean(botId) && parent?.from?.id === botId;
  if (!toPost && !toBot) return false;
  const text = (m.text || m.caption || '').trim();
  if (!text) return false;

  const origin = toPost ? parent.forward_origin : null;
  const channel = origin?.chat?.username || parent?.sender_chat?.username;
  const body = {
    chatId: m.chat.id,
    threadId: m.message_thread_id,
    messageId: m.message_id,
    user: { id: m.from.id, name: [m.from.first_name, m.from.last_name].filter(Boolean).join(' '), username: m.from.username },
    text: text.slice(0, 4000),
    ...(toPost ? {
      post: {
        text: (parent.text || parent.caption || '').slice(0, 4000) || undefined,
        url: channel && origin?.message_id ? `https://t.me/${channel}/${origin.message_id}` : undefined,
      },
    } : {}),
  };
  try {
    const res = await fetch(`${s.url}/comment`, { method: 'POST', headers: authHeaders(s), body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(res.status === 401 ? 'агент не принял ключ' : `ответ ${res.status}`);
    if (s.commentsError) { s.commentsError = ''; store.save(); }
    return true;
  } catch (err) {
    commentsFailed(s, err.name === 'TimeoutError' ? 'агент не ответил за 20 секунд' : err.message === 'fetch failed' ? 'нет связи с агентом' : err.message);
    return false;
  }
}

let outboxBusy = false;

/**
 * Нагадування від помічника (GenAgent) людині, яка поговорила з ним і не дійшла до брифу.
 * Не надсилаємо, якщо людина заблокувала бота чи студія її заблокувала, або вона вже має замовлення.
 */
async function sendFollowUp(tg, item) {
  const user = store.data.users[String(item.userId)];
  if (!user) return { error: 'людини немає в боті' };
  if (user.blocked || user.studioBlocked) return { error: 'людина заблокувала бота або заблокована' };
  if (store.data.inquiries.some((o) => String(o.userId) === String(item.userId))) return { error: 'вже є замовлення' };
  if (store.data.drafts[String(item.userId)]) return { error: 'людина саме заповнює бриф' };
  try {
    const en = user.lang === 'en';
    const sent = await asAuthor('agent', () => tg.call('sendMessage', {
      chat_id: item.userId,
      text: item.text,
      reply_markup: { inline_keyboard: [[{ text: en ? '🚀 Start the brief' : '🚀 Розпочати бриф', callback_data: 'brief_start' }]] },
    }));
    addAiHistory(item.userId, 'ai', item.text);
    store.save();
    return { messageId: sent.message_id };
  } catch (err) {
    if (err?.status === 403) { user.blocked = true; store.save(); }
    return { error: (err.description || err.message || 'не надіслано').slice(0, 300) };
  }
}

/** Готові (або схвалені менеджером) відповіді агента — публікуємо в гілці коментаря від імені бота. */
export async function publishOutbox(tg) {
  // Коментарі каналу (якщо ввімкнено) і нагадування людям, які поговорили з помічником і пішли (якщо ввімкнено помічника)
  const s = commentsOn() || chatOn();
  if (!s || !tg || outboxBusy) return;
  const kinds = [s.comments ? 'comment' : '', s.chat ? 'followup,dm,resume' : ''].filter(Boolean).join(',');
  outboxBusy = true;
  try {
    const res = await fetch(`${s.url}/outbox?kinds=${kinds}`, { headers: authHeaders(s), signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(res.status === 401 ? 'агент не принял ключ' : `ответ ${res.status}`);
    const { items = [] } = await res.json();
    for (const item of items) {
      const ack = { id: item.id };
      if (item.kind === 'dm' || item.kind === 'resume') {
        if (item.kind === 'dm') Object.assign(ack, item.text ? await sendManagerReply(tg, item) : { done: true });
        else {
          // Менеджер повернув людину помічнику («Вернуть агенту» в GenAgent)
          const user = store.data.users[String(item.userId)];
          if (user) { user.aiResumedAt = new Date().toISOString(); store.save(); }
          ack.done = true;
        }
        await fetch(`${s.url}/outbox`, { method: 'POST', headers: authHeaders(s), body: JSON.stringify(ack), signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(() => {});
        continue;
      }
      if (item.kind === 'followup') {
        Object.assign(ack, await sendFollowUp(tg, item));
        await fetch(`${s.url}/outbox`, { method: 'POST', headers: authHeaders(s), body: JSON.stringify(ack), signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(() => {});
        continue;
      }
      try {
        const sent = await tg.call('sendMessage', {
          chat_id: item.chatId,
          text: item.text,
          ...(item.replyTo ? { reply_parameters: { message_id: Number(item.replyTo), allow_sending_without_reply: true } } : {}),
        });
        ack.messageId = sent.message_id;
      } catch (err) {
        ack.error = (err.description || err.message || 'ошибка').slice(0, 300);
        log.warn(`GenAgent: ответ в комментариях не опубликован — ${ack.error}`);
      }
      await fetch(`${s.url}/outbox`, { method: 'POST', headers: authHeaders(s), body: JSON.stringify(ack), signal: AbortSignal.timeout(TIMEOUT_MS) });
    }
    if (s.commentsError) { s.commentsError = ''; store.save(); }
  } catch (err) {
    commentsFailed(s, err.name === 'TimeoutError' ? 'агент не ответил за 20 секунд' : err.message === 'fetch failed' ? 'нет связи с агентом' : err.message);
  } finally {
    outboxBusy = false;
  }
}

/**
 * Фонова синхронізація: через 20 с після старту, далі раз на 5 хв (відправляє лише зміни).
 * getTg — поточний клієнт Telegram (або null, поки бот не готовий): для публікації відповідей у коментарях раз на 10 с.
 */
export function startGenagentSync(getTg = () => null) {
  const run = () => syncGenagent().catch((err) => log.warn(`GenAgent: ${err.message}`));
  setTimeout(run, 20 * 1000).unref();
  const timer = setInterval(run, SYNC_EVERY_MS);
  timer.unref();
  const outbox = setInterval(() => void publishOutbox(getTg()), 10 * 1000);
  outbox.unref();
  return { close: () => { clearInterval(timer); clearInterval(outbox); } };
}
