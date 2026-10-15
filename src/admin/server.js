// Веб-сторінка бота: перше налаштування, вхід і керування — огляд, заявки, клієнти, брифи, каталог, ціни, джерела.
// Слухає лише ADMIN_HOST (127.0.0.1); ззовні сюди веде посилання з панелі через Tailscale.
import http from 'node:http';
import { Readable } from 'node:stream';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { HOST, PORT, ALLOWED_HOSTS, ASSETS_DIR } from '../config.js';
import { store } from '../store.js';
import { log } from '../log.js';
import { Telegram } from '../telegram.js';
import { hashPassword, verifyPassword, safeEqual, orderNo, isWorkingTime, TOKEN_PATTERN } from '../util.js';
import { STATUS_LABELS, PRICE_TYPE_KEYS, PRICE_QTY_KEYS, offHoursMessage } from '../texts.js';
import { PAGE_HTML, PAGE_CSS, PAGE_JS } from './page.js';
import { PAGE2_CSS, PAGE2_JS } from './page2.js';
import { PAGE3_CSS, PAGE3_JS } from './page3.js';
import { PAGE4_CSS, PAGE4_JS } from './page4.js';

const APP_CSS = PAGE_CSS + PAGE2_CSS + PAGE3_CSS + PAGE4_CSS;
const APP_JS = PAGE_JS + PAGE2_JS + PAGE3_JS + PAGE4_JS;
import { renderBriefPdf } from '../pdf/brief.js';
import {
  MAX_ITEMS, catalog, findItem, addItem, removeItem, moveItem, updateDescription, refreshItem,
} from '../catalog.js';
import {
  overview, ordersList, orderDetail, orderDetailForDesigner, clientsList, draftsList, systemInfo, sourcesView, catalogView, exportSheets,
} from './views.js';
import { handleMore } from './routes2.js';
import { QuoteError } from '../quotes.js';
import { team, validDate, dateText, STAGES, orderAmount, remaining, isOpen } from '../orders.js';
import { renderDocPdf } from '../pdf/docs.js';
import { findService, projectStage, SERVICES, serviceSettings, cleanPayPlan } from '../services.js';
import { checklistSteps } from './views.js';
import { auditRecord } from '../audit.js';
import { buildXlsx } from '../xlsx.js';
import { ChannelError, MAX_UPLOAD, sanitizeHtml } from '../channel.js';
import { MonoClient, PaymentError } from '../payments.js';
import { AI_MODELS, AiError, aiSettings, aiKey, aiKeySource, aiAvailable, verifyKey, writePost } from '../ai.js';
import { replyList, saveReplies } from '../replies.js';
import { genagentSettings, syncGenagent, URL_PATTERN as GENAGENT_URL } from '../genagent.js';

const SESSION_COOKIE = 'yabot_admin';
const SESSION_TTL = 12 * 60 * 60 * 1000;
const MAX_BODY = 512 * 1024; // FAQ і послуги з довгими текстами двома мовами бувають понад 100 КБ

const sessions = new Map(); // токен → { expires, role: 'owner'|'designer', memberId }
const pendingLogins = new Map(); // квиток → { code, expires, attempts, role, memberId } — вхід з кодом з Telegram
const loginFailures = [];
let setupCode = newSetupCode();
let setupAttempts = 0;

function newSetupCode() {
  return String(crypto.randomInt(100000, 1000000));
}

/** Код першого налаштування друкується в журнал — його бачить лише власник у панелі. */
export function announceSetupCode() {
  if (store.configured) return;
  log.info('Требуется первичная настройка: откройте страницу бота из панели (ссылка «Админка»).');
  log.info(`Код первичной настройки: ${setupCode}`);
}

const SECURITY_HEADERS = {
  'content-security-policy':
    "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self'; script-src 'self'; " +
    "connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function hostAllowed(req) {
  const raw = String(req.headers.host || '').toLowerCase();
  const host = raw.startsWith('[') ? raw.slice(1, raw.indexOf(']')) : raw.split(':')[0];
  return ['localhost', '127.0.0.1', '::1'].includes(host) || ALLOWED_HOSTS.includes(host);
}

function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...SECURITY_HEADERS, ...extra });
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      // Лишок дочитуємо й відкидаємо: обірване з'єднання браузер показав би як «Failed to fetch» замість зрозумілої помилки
      if (size <= MAX_BODY) chunks.push(c);
    });
    req.on('end', () => {
      if (size > MAX_BODY) return reject(new HttpError(413, 'Слишком большой запрос — сократите текст.'));
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return reject(new HttpError(400, 'Некорректный запрос.')); }
      // Обробники чекають об'єкт: null, число чи масив — помилка запиту, а не збій сервера
      if (!body || typeof body !== 'object' || Array.isArray(body)) return reject(new HttpError(400, 'Некорректный запрос.'));
      return resolve(body);
    });
    req.on('error', reject);
  });
}

/** decodeURIComponent, що не падає на зламаному значенні. */
function safeDecode(v) {
  try { return decodeURIComponent(v); } catch { return v; }
}

function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map((c) => {
    const i = c.indexOf('=');
    return i < 0 ? [c.trim(), ''] : [c.slice(0, i).trim(), safeDecode(c.slice(i + 1).trim())];
  }));
}

/** Поточна сесія або null. Сесія дизайнера зникає, якщо його вимкнули чи видалили. */
function getSession(req) {
  const token = cookies(req)[SESSION_COOKIE];
  const s = token && sessions.get(token);
  if (!s) return null;
  if (s.expires < Date.now()) { sessions.delete(token); return null; }
  if (s.role === 'designer') {
    const m = team().find((x) => x.id === s.memberId);
    if (!m || m.active === false) { sessions.delete(token); return null; }
    s.name = m.name;
  }
  return s;
}

const isLoggedIn = (req) => Boolean(getSession(req));

/** Закрити всі сесії дизайнера (змінили пароль або вимкнули) і його незавершені входи з кодом. */
function dropSessions(memberId) {
  for (const [token, s] of sessions) if (s.memberId === memberId) sessions.delete(token);
  for (const [t, p] of pendingLogins) if (p.memberId === memberId) pendingLogins.delete(t);
}

function dropAllSessions() {
  sessions.clear();
  pendingLogins.clear();
}

function sessionCookie(req, role = 'owner', memberId = null) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { expires: Date.now() + SESSION_TTL, role, memberId });
  const secure = req.headers['x-forwarded-proto'] === 'https' || req.headers['x-forwarded-for'] ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL / 1000}${secure}`;
}

/** Захист від підробних запитів з чужих сайтів: свій заголовок + той самий Origin. */
function sameOrigin(req) {
  if (req.headers['x-yabot'] !== '1') return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host.toLowerCase() === String(req.headers.host || '').toLowerCase(); } catch { return false; }
}

function tooManyLoginFailures() {
  const since = Date.now() - 10 * 60 * 1000;
  while (loginFailures.length && loginFailures[0] < since) loginFailures.shift();
  return loginFailures.length >= 5;
}

function validChatId(value) {
  return /^-?\d{5,20}$/.test(String(value ?? '').trim());
}

const clean = (v, max) => String(v ?? '').trim().slice(0, max);

/** Тип картинки за першими байтами (віддаємо лише JPEG/PNG/WebP). */
function imageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf.readUInt32BE(0) === 0x89504e47) return 'image/png';
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

async function testRecipient(token, chatId) {
  await new Telegram(token).call('sendMessage', {
    chat_id: chatId,
    text: '✅ Сюди будуть приходити заявки YABOT (бриф, PDF і файли клієнтів).',
  });
}

function requireHandlers(runtime) {
  if (!runtime.handlers) throw new HttpError(503, 'Бот ещё не запустился — попробуйте через минуту.');
  return runtime.handlers;
}

function findOrder(id) {
  const order = store.data.inquiries.find((o) => o.id === Number(id));
  if (!order) throw new HttpError(404, 'Заявка не найдена.');
  return order;
}

// --- Маршрути до входу ---

async function handleSetup(req, res) {
  if (store.configured) return send(res, 409, { error: 'Бот уже настроен — войдите с паролем.' });
  if (setupAttempts >= 10) {
    setupAttempts = 0;
    setupCode = newSetupCode();
    log.warn('Слишком много попыток ввода кода настройки — код сменён.');
    announceSetupCode();
    return send(res, 429, { error: 'Слишком много попыток. Новый код — в журнале бота.' });
  }
  const body = await readJson(req);
  if (!safeEqual(String(body.code || '').trim(), setupCode)) {
    setupAttempts++;
    return send(res, 400, { error: 'Неверный код настройки. Он напечатан в журнале бота в панели.' });
  }
  const token = String(body.token || store.data.config.botToken || '').trim();
  const password = String(body.password || '');
  const adminChatId = String(body.adminChatId || '').trim();
  if (!TOKEN_PATTERN.test(token)) return send(res, 400, { error: 'Токен не похож на токен от @BotFather.' });
  if (password.length < 8) return send(res, 400, { error: 'Пароль — минимум 8 символов.' });
  if (adminChatId && !validChatId(adminChatId)) return send(res, 400, { error: 'ID получателя — это число, например 8310127198.' });

  let me;
  try {
    me = await new Telegram(token).call('getMe', {}, { timeoutMs: 15000 });
  } catch (err) {
    const msg = err.status === 401 ? 'Telegram не принял токен — проверьте его в @BotFather.' : `Не удалось проверить токен: ${err.message}`;
    return send(res, 400, { error: msg });
  }

  let warning = null;
  if (adminChatId) {
    try { await testRecipient(token, adminChatId); } catch (err) {
      warning = `Не удалось отправить проверочное сообщение получателю (${err.description || err.message}). ` +
        `Напишите боту @${me.username} команду /start с этого аккаунта и сохраните ID ещё раз.`;
    }
  }

  const { salt, hash } = hashPassword(password);
  Object.assign(store.data.config, { botToken: token, passwordSalt: salt, passwordHash: hash, adminChatId: adminChatId || null });
  store.data.bot = { id: me.id, username: me.username, firstName: me.first_name };
  store.data.telegramOffset = 0;
  store.saveNow();
  log.info(`Первичная настройка выполнена: бот @${me.username}`);
  return send(res, 200, { ok: true, warning }, undefined, { 'set-cookie': sessionCookie(req) });
}

/**
 * Другий крок входу: шестизначний код у Telegram (діє 5 хвилин, 5 спроб).
 * Якщо бот зараз не може написати — код друкується в журналі бота (його бачить лише власник у панелі).
 */
async function startSecondStep(res, runtime, role, memberId, chatId, who) {
  // Один незавершений вхід на людину; прострочені прибираємо
  for (const [t, p] of pendingLogins) if (p.expires < Date.now() || (p.role === role && p.memberId === memberId)) pendingLogins.delete(t);
  if (pendingLogins.size > 50) pendingLogins.clear();
  const ticket = crypto.randomBytes(16).toString('hex');
  const code = String(crypto.randomInt(100000, 1000000));
  pendingLogins.set(ticket, { code, expires: Date.now() + 5 * 60 * 1000, attempts: 0, role, memberId });
  let delivered = false;
  if (runtime.handlers && runtime.ready && chatId) {
    try {
      await runtime.handlers.send(chatId, `🔐 Код входа на страницу бота: <code>${code}</code>\nДействует 5 минут. Если это не вы — смените пароль.`);
      delivered = true;
    } catch { /* нижче — запасний шлях */ }
  }
  if (!delivered) log.warn(`Код входа на страницу бота (${who}): ${code} — Telegram сейчас недоступен, поэтому код в журнале.`);
  return send(res, 200, { need2fa: true, ticket, delivered });
}

async function handleSecondStep(req, res) {
  if (tooManyLoginFailures()) return send(res, 429, { error: 'Слишком много попыток. Подождите 10 минут.' });
  const body = await readJson(req);
  const p = pendingLogins.get(String(body.ticket || ''));
  if (!p || p.expires < Date.now()) return send(res, 400, { error: 'Код устарел — войдите ещё раз.' });
  if (!safeEqual(String(body.code || '').trim(), p.code)) {
    p.attempts++;
    loginFailures.push(Date.now());
    if (p.attempts >= 5) pendingLogins.delete(String(body.ticket));
    return send(res, 400, { error: p.attempts >= 5 ? 'Слишком много ошибок — войдите ещё раз.' : 'Неверный код.' });
  }
  pendingLogins.delete(String(body.ticket));
  return send(res, 200, { ok: true }, undefined, { 'set-cookie': sessionCookie(req, p.role, p.memberId) });
}

async function handleLogin(req, res, runtime) {
  if (!store.configured) return send(res, 409, { error: 'Сначала выполните первичную настройку.' });
  if (tooManyLoginFailures()) return send(res, 429, { error: 'Слишком много попыток. Подождите 10 минут.' });
  const body = await readJson(req);
  const c = store.data.config;
  const login = String(body.login || '').trim().toLowerCase();
  // Без логіна — власник студії; з логіном — дизайнер з команди
  if (!login) {
    if (verifyPassword(body.password, c.passwordSalt, c.passwordHash)) {
      if (c.twoFactor) return startSecondStep(res, runtime, 'owner', null, c.adminChatId, 'владелец');
      return send(res, 200, { ok: true }, undefined, { 'set-cookie': sessionCookie(req) });
    }
  } else {
    const m = team().find((x) => x.login === login && x.active !== false);
    if (m && verifyPassword(body.password, m.passwordSalt, m.passwordHash)) {
      if (c.twoFactor && !m.telegramId) return send(res, 403, { error: 'Включён вход с кодом из Telegram, а у вас не указан Telegram ID — попросите владельца добавить его.' });
      if (c.twoFactor) return startSecondStep(res, runtime, 'designer', m.id, m.telegramId, m.name);
      log.info(`Вход дизайнера: ${m.name}`);
      return send(res, 200, { ok: true }, undefined, { 'set-cookie': sessionCookie(req, 'designer', m.id) });
    }
  }
  loginFailures.push(Date.now());
  log.warn('Неудачная попытка входа на страницу бота');
  return send(res, 401, { error: login ? 'Неверный логин или пароль.' : 'Неверный пароль.' });
}

// --- Маршрути після входу ---

const DESIGNER_ACTIONS = new Set([undefined, 'sketch', 'pdf', 'status', 'studio', 'message', 'quote', 'stage', 'project-stage', 'fix-done', 'check', 'schedule', 'unschedule', 'final-file', 'final-link', 'final-remove']);
const MAX_FINAL = 45 * 1024 * 1024; // Bot API приймає документи до 50 МБ

/** PDF рахунку чи акту для заявки (також для клієнта в Mini App). */
export function orderDoc(order, kind, amountParam) {
  const company = store.data.config.company || {};
  if (!company.name) throw new HttpError(400, 'Сначала заполните реквизиты студии: «Настройки» → «Реквизиты для документов».');
  const amount = Number(amountParam) > 0 ? Math.round(Number(amountParam) * 100) / 100 : (kind === 'invoice' && remaining(order) > 0 ? remaining(order) : orderAmount(order));
  if (!(amount > 0)) throw new HttpError(400, 'Укажите цену заявки (смета или «Согласованная цена»).');
  const title = order.pack?.title || order.hero.slice(0, 60);
  const service = order.service === 'bots' ? `Розробка Telegram-бота з miniApp «${title}»`
    : order.service === 'characters' ? `Розробка персонажа «${title}»`
      : `Розробка стікерпаку «${title}» (${order.quantity}, ${String(order.stickerType || '').toLowerCase()})`;
  return { pdf: renderDocPdf(kind, { order, company, billing: order.billing, amount, service }), name: `YABOT_${kind === 'act' ? 'akt' : 'rakhunok'}_${orderNo(order.id)}.pdf` };
}

/** Дії із заявкою + журнал: знімок до (зміни «збоку» — Telegram / клієнт) і після (хто й звідки). */
async function handleOrders(req, res, url, runtime) {
  const parts = url.pathname.split('/').filter(Boolean);
  const o = req.method === 'POST' && parts[3] ? store.data.inquiries.find((x) => x.id === Number(parts[2])) : null;
  if (o) auditRecord(o, '', 'other');
  try {
    return await handleOrdersInner(req, res, url, runtime);
  } finally {
    if (o) {
      const s = req.session;
      if (auditRecord(o, s?.role === 'designer' ? s.name : 'владелец', s?.via === 'app' ? 'app' : 'page')) store.save();
    }
  }
}

async function handleOrdersInner(req, res, url, runtime) {
  const session = req.session;
  const designer = session?.role === 'designer';
  const parts = url.pathname.split('/').filter(Boolean); // api, orders, id?, action?
  if (parts.length === 2 && req.method === 'GET') return send(res, 200, { orders: ordersList(session, { archived: url.searchParams.get('archived') === '1' }) });
  const order = findOrder(parts[2]);
  const action = parts[3];
  if (designer && (order.assignee !== session.memberId || !DESIGNER_ACTIONS.has(action))) throw new HttpError(403, 'Эта заявка вам не назначена.');
  const detailOf = (o) => (designer ? orderDetailForDesigner(o) : orderDetail(o));
  const who = designer ? session.name : 'страница бота';

  if (!action && req.method === 'GET') {
    // Відкрили картку — нові повідомлення клієнта вважаємо прочитаними
    const detail = detailOf(order);
    if (order.unread) { order.unread = 0; store.save(); }
    return send(res, 200, detail);
  }

  // Превʼю ескізу: /api/orders/<id>/sketch/<версія>/<номер файлу>
  if (action === 'sketch' && req.method === 'GET') {
    const round = order.sketches?.find((s) => s.round === Number(parts[4]));
    const item = round?.items[Number(parts[5])];
    if (!item) throw new HttpError(404, 'Файл не найден.');
    const handlers = requireHandlers(runtime);
    let buf;
    try { buf = await handlers.tg.download(item.fileId); } catch (err) {
      throw new HttpError(502, `Telegram: ${err.description || err.message}`);
    }
    const type = imageType(buf);
    if (!type) throw new HttpError(415, 'Это не изображение.');
    return send(res, 200, buf, type, { 'cache-control': 'private, max-age=3600' });
  }

  if (action === 'doc' && req.method === 'GET') {
    const { pdf, name } = orderDoc(order, url.searchParams.get('kind') === 'act' ? 'act' : 'invoice', url.searchParams.get('amount'));
    return send(res, 200, pdf, 'application/pdf', { 'content-disposition': `attachment; filename="${name}"` });
  }
  if (action === 'pdf' && req.method === 'GET') {
    // Без зв'язку з Telegram збираємо PDF без превʼю картинок; архівна — з повної версії
    const src = order.archived ? store.archivedFull(order.id) || order : order;
    const pdf = runtime.handlers && runtime.ready ? await runtime.handlers.buildPdf(src) : renderBriefPdf(src, []);
    return send(res, 200, pdf, 'application/pdf', {
      'content-disposition': `attachment; filename="YABOT_brief_${orderNo(order.id)}.pdf"`,
    });
  }

  if (req.method !== 'POST') throw new HttpError(404, 'Не найдено');
  if (order.archived) throw new HttpError(400, 'Заявка в архиве — её можно только просматривать.');

  // Готовий файл для клієнта: тіло запиту — сам файл
  if (action === 'final-file') {
    const buf = await readRaw(req, MAX_FINAL);
    if (!buf.length) throw new HttpError(400, 'Пустой файл.');
    const name = safeDecode(String(req.headers['x-filename'] || 'file'));
    try {
      await requireHandlers(runtime).deliverFinalFile(order, buf, name, String(req.headers['content-type'] || ''), who);
    } catch (err) {
      if (err.status === 403) throw new HttpError(400, 'Клиент заблокировал бота — файл не доставлен.');
      if (err instanceof HttpError) throw err;
      throw new HttpError(502, `Telegram: ${err.description || err.message}`);
    }
    return send(res, 200, { order: detailOf(order) });
  }
  const body = await readJson(req);

  // Робота із замовлення → «Приклади робіт» послуги (ескіз чи готова картинка)
  if (action === 'to-examples') {
    let fileId, name;
    if (body.finalId) {
      const f = (order.finals || []).find((x) => x.id === String(body.finalId) && x.fileId);
      if (!f || !/\.(png|jpe?g|webp)$/i.test(f.name || '')) throw new HttpError(404, 'Картинка не найдена.');
      if ((f.size || 0) > 10 * 1024 * 1024) throw new HttpError(400, 'Картинка больше 10 МБ — загрузите её вручную в «Услуги Mini App».');
      ({ fileId, name } = f);
    } else {
      const round = order.sketches?.find((s) => s.round === Number(body.round));
      const item = round?.items?.[Number(body.index)];
      if (!item || !['photo', 'document'].includes(item.type)) throw new HttpError(404, 'Эскиз не найден.');
      fileId = item.fileId;
      name = `yabot_${orderNo(order.id)}_v${round.round}_${Number(body.index) + 1}.jpg`;
    }
    const svcId = SERVICES.some((s) => s.id === body.service) ? body.service : order.service || 'stickers';
    const settings = serviceSettings()[svcId];
    if ((settings.examples || []).length >= 8) throw new HttpError(400, 'У услуги уже 8 примеров — уберите лишний в «Настройки» → «Услуги Mini App».');
    if ((order.exampled || []).includes(fileId)) throw new HttpError(400, 'Эта картинка уже добавлена в примеры.');
    let buf;
    try { buf = await requireHandlers(runtime).tg.download(fileId); } catch (err) {
      throw new HttpError(502, `Telegram: ${err.description || err.message}`);
    }
    const type = imageType(buf);
    if (!type) throw new HttpError(415, 'Это не картинка (нужен JPG, PNG или WebP).');
    if (!runtime.channels) throw new HttpError(503, 'Бот перезапускается — попробуйте через минуту.');
    const meta = runtime.channels.saveUpload(buf, name, type);
    (settings.examples ||= []).push({ image: meta.id, caption: clean(body.caption, 80), captionEn: clean(body.captionEn, 80) });
    (order.exampled ||= []).push(fileId);
    store.saveNow();
    log.info(`Работа из #${orderNo(order.id)} добавлена в примеры услуги «${findService(svcId)?.name || svcId}» (${who})`);
    const warning = order.showcase?.consent === 'yes' ? '' : 'Добавлено. Клиент не давал согласия показывать работу — убедитесь, что он не против.';
    return send(res, 200, { order: detailOf(order), warning, added: { service: svcId, count: settings.examples.length } });
  }

  // Правка після здачі внесена
  if (action === 'fix-done') {
    const done = await requireHandlers(runtime).finishFix(order, { who, notifyClient: body.notifyClient !== false });
    if (!done) throw new HttpError(400, 'Открытой правки нет.');
    return send(res, 200, { order: detailOf(order) });
  }

  // План оплати за етапами (проєкти): [{ idx, percent }]; useDefault — план з налаштувань послуги; [] — прибрати
  if (action === 'pay-plan') {
    const ps = projectStage(order);
    if (!ps) throw new HttpError(400, 'План оплаты по этапам — только для проектов (боты, персонажи).');
    if (!isOpen(order)) throw new HttpError(400, 'Заявка закрыта.');
    let plan;
    try {
      plan = cleanPayPlan(body.useDefault ? serviceSettings()[order.service]?.payPlan || [] : body.plan, ps.steps.length);
    } catch (err) { throw new HttpError(400, err.message); }
    if (body.useDefault && !plan.length) throw new HttpError(400, 'У услуги нет плана оплаты — задайте его в «Услуги Mini App».');
    const old = order.payPlan || [];
    order.payPlan = plan.map((e) => { const o = old.find((x) => x.idx === e.idx); return o ? { ...e, invoicedAt: o.invoicedAt, pay: o.pay } : e; });
    if (!plan.length) delete order.payPlan;
    store.saveNow();
    const flow = requireHandlers(runtime).payments;
    const warnings = [];
    if (plan.length && !orderAmount(order)) warnings.push('Укажите цену заказа — без неё суммы платежей не посчитать.');
    if (plan.length && !flow.canRequest) warnings.push('Приём оплаты выключен — счета сами не выставятся, отмечайте оплату вручную.');
    try { if (plan.length) await flow.stagePlanCheck(order); } catch (err) { warnings.push(`Счёт не выставлен: ${err.message}`); }
    return send(res, 200, { order: detailOf(order), warning: warnings.join(' ') });
  }

  // Етап проєкту (боти, персонажі) — клієнт бачить «Етап N з M»
  if (action === 'project-stage') {
    const ps = projectStage(order);
    if (!ps) throw new HttpError(400, 'Этапы есть только у проектов (боты, персонажи).');
    if (order.status !== 'in_progress') throw new HttpError(400, 'Этап выбирается, когда заявка в работе.');
    const idx = Number(body.idx);
    if (!Number.isInteger(idx) || idx < 0 || idx >= ps.steps.length) throw new HttpError(400, 'Неизвестный этап.');
    const link = clean(body.link, 500);
    if (link && !/^https?:\/\/\S{4,}$/i.test(link)) throw new HttpError(400, 'Ссылка должна начинаться с https://');
    const opts = { who, notifyClient: body.notifyClient === true, ask: body.ask === true };
    if ('link' in body) opts.link = link;
    if ('note' in body) opts.note = clean(body.note, 500);
    try {
      const result = await requireHandlers(runtime).setProjectStage(order, idx, opts);
      return send(res, 200, { order: detailOf(order), ...result });
    } catch (err) {
      if (err.status === 403) return send(res, 200, { order: detailOf(order), warning: 'Этап сохранён, но клиент заблокировал бота — уведомление не доставлено.' });
      if (err.status) return send(res, 200, { order: detailOf(order), warning: `Этап сохранён, уведомление не ушло: ${err.description || err.message}` });
      throw err;
    }
  }

  if (action === 'final-link') {
    const link = String(body.url || '').trim();
    if (!/^https?:\/\/[^\s]{4,500}$/i.test(link)) throw new HttpError(400, 'Укажите ссылку, начинающуюся с https://');
    try {
      await requireHandlers(runtime).deliverFinalLink(order, link, clean(body.title, 120), who);
    } catch (err) {
      if (err.status === 403) throw new HttpError(400, 'Клиент заблокировал бота — ссылка не доставлена.');
      throw new HttpError(502, `Telegram: ${err.description || err.message}`);
    }
    return send(res, 200, { order: detailOf(order) });
  }
  if (action === 'final-remove') {
    order.finals = (order.finals || []).filter((f) => f.id !== String(body.id));
    store.saveNow();
    return send(res, 200, { order: detailOf(order) });
  }

  if (action === 'status') {
    const status = String(body.status || '');
    if (!STATUS_LABELS[status]) throw new HttpError(400, 'Неизвестный статус.');
    if (status === order.status) throw new HttpError(400, 'У заявки уже этот статус.');
    if (status === 'cancelled') throw new HttpError(400, 'Отменить заявку может только клиент — используйте «Отклонить».');
    const notifyClient = body.notifyClient !== false;
    const result = await requireHandlers(runtime).setOrderStatus(order, status, { who, notifyClient });
    const warning = [
      notifyClient && !result.clientNotified && ['in_progress', 'done', 'rejected'].includes(status)
        ? 'Статус сохранён, но уведомление клиенту не ушло (нет связи с Telegram или клиент заблокировал бота).' : '',
      result.lost?.length ? `Заявка снова открыта, но ${result.lost.join('; ')} — учтите это в расчёте.` : '',
    ].filter(Boolean).join(' ') || null;
    return send(res, 200, { order: detailOf(order), ...result, warning });
  }

  // Чек-лист етапів роботи
  if (action === 'check') {
    const step = String(body.step || '');
    if (!checklistSteps().includes(step)) throw new HttpError(400, 'Нет такого этапа.');
    order.checklist ||= {};
    if (body.done) order.checklist[step] = { at: new Date().toISOString(), by: who };
    else delete order.checklist[step];
    store.saveNow();
    return send(res, 200, { order: detailOf(order) });
  }

  // Реквізити замовника, рахунок і акт
  if (action === 'billing') {
    order.billing = { name: clean(body.name, 150), code: clean(body.code, 20), address: clean(body.address, 200), signer: clean(body.signer, 100) };
    store.saveNow();
    return send(res, 200, { order: detailOf(order) });
  }
  if (action === 'doc-send') {
    const kind = body.kind === 'act' ? 'act' : 'invoice';
    const { pdf, name } = orderDoc(order, kind, body.amount);
    const h = requireHandlers(runtime);
    try {
      await h.tg.sendFile('sendDocument', 'document', order.userId, pdf, name, 'application/pdf', {
        caption: kind === 'act' ? `📄 Акт наданих послуг за замовленням #${orderNo(order.id)}` : `📄 Рахунок на оплату за замовленням #${orderNo(order.id)}`,
      });
    } catch (err) {
      throw new HttpError(502, err.status === 403 ? 'Клиент заблокировал бота.' : `Telegram: ${err.description || err.message}`);
    }
    (order.messages ||= []).push({ at: new Date().toISOString(), from: 'studio', via: 'page', text: `[${kind === 'act' ? 'акт' : 'счёт'} PDF отправлен клиенту]` });
    store.saveNow();
    return send(res, 200, { order: detailOf(order) });
  }

  // Вітрина: згода клієнта й публікація готової роботи в канал
  if (action === 'showcase-ask') {
    if (!order.pack?.name) throw new HttpError(400, 'Сначала соберите стикерпак.');
    try { await requireHandlers(runtime).askShowcase(order); } catch (err) {
      throw new HttpError(502, err.status === 403 ? 'Клиент заблокировал бота.' : `Telegram: ${err.description || err.message}`);
    }
    return send(res, 200, { order: detailOf(order) });
  }
  if (action === 'showcase-draft') {
    let html = runtime.channels.showcaseDraft(order);
    if (body.ai) {
      if (!aiKey()) throw new HttpError(400, 'Нужен ключ Claude API: «Настройки» → «ИИ-помощник».');
      try {
        html = sanitizeHtml((await writePost({
          brief: `Пост-вітрина про щойно готовий стікерпак «${order.pack?.title || order.hero}»: головний герой — ${order.hero}; ${order.quantity}, ${order.stickerType}${order.style?.name ? `, стиль: ${order.style.name}` : ''}. Не згадуй імені клієнта. Наприкінці — заклик замовити такий самий через кнопку під постом.`,
          tone: 'friendly', length: 'short', lang: 'uk',
        })).replace(/<br\s*\/?>/gi, '\n'));
      } catch (err) {
        if (err instanceof AiError) throw new HttpError(400, err.message);
        throw err;
      }
    }
    return send(res, 200, { html });
  }
  if (action === 'showcase') {
    try {
      await runtime.channels.publishShowcase(order, body);
    } catch (err) {
      if (err instanceof ChannelError) throw new HttpError(400, err.message);
      throw err;
    }
    return send(res, 200, { order: detailOf(order) });
  }

  // Колонка на дошці: нові / в роботі / ескізи / фінал / готово
  if (action === 'stage') {
    const stage = String(body.stage || '');
    if (!STAGES.includes(stage)) throw new HttpError(400, 'Неизвестный этап.');
    const status = stage === 'new' ? 'new' : stage === 'done' ? 'done' : 'in_progress';
    const h = requireHandlers(runtime);
    let result = { clientNotified: false };
    if (status !== order.status) {
      if (!['new', 'in_progress', 'done'].includes(order.status)) throw new HttpError(400, 'Заявка закрыта.');
      result = await h.setOrderStatus(order, status, { who, notifyClient: body.notifyClient === true });
    }
    if (status === 'in_progress') {
      order.pipelineStage = stage;
      order.stageManual = true;
      store.saveNow();
    }
    return send(res, 200, { order: detailOf(order), ...result });
  }

  // Кошторис клієнту
  if (action === 'quote') {
    try {
      await requireHandlers(runtime).quotes.send(order, body, who, { designer });
    } catch (err) {
      if (err instanceof QuoteError) throw new HttpError(400, err.message);
      if (err.status === 403) throw new HttpError(400, 'Клиент заблокировал бота — смета не доставлена.');
      if (err.status) throw new HttpError(502, `Telegram: ${err.description || err.message}`);
      throw err;
    }
    return send(res, 200, { order: detailOf(order) });
  }

  // Призначити дизайнера (лише власник)
  if (action === 'assign') {
    const memberId = body.memberId ? String(body.memberId) : null;
    if (memberId && !team().some((m) => m.id === memberId && m.active !== false)) throw new HttpError(400, 'Дизайнер не найден или отключён.');
    await requireHandlers(runtime).assign(order, memberId, 'страница бота');
    return send(res, 200, { order: detailOf(order) });
  }

  // --- Аванс (monobank) ---
  if (['invoice', 'cancel-invoice', 'mark-paid', 'unmark-paid', 'card-request', 'card-confirm'].includes(action)) {
    const payments = requireHandlers(runtime).payments;
    try {
      if (action === 'invoice') await payments.createInvoice(order, body.amount, { who: 'страница бота', note: body.note ? String(body.note).slice(0, 60) : undefined, kind: body.kind });
      if (action === 'cancel-invoice') await payments.cancelInvoice(order);
      if (action === 'mark-paid') await payments.markPaid(order, body.amount, { notifyClient: body.notify === true, kind: body.kind });
      if (action === 'unmark-paid') await payments.unmarkPaid(order);
      if (action === 'card-request') await payments.requestCard(order, body.amount, { who: 'страница бота', kind: body.kind });
      if (action === 'card-confirm') await payments.confirmCard(order, Number(body.idx), body.received === true, 'страница бота');
    } catch (err) {
      if (err instanceof PaymentError) throw new HttpError(400, err.message);
      throw err;
    }
    return send(res, 200, { order: orderDetail(order) });
  }

  if (action === 'bonus') {
    // Списати один бонус клієнта (знижку за запрошеного друга) на це замовлення
    const user = store.data.users[String(order.userId)];
    if (order.bonusUsed) throw new HttpError(400, 'Бонус на этот заказ уже списан.');
    if (!isOpen(order) && order.status !== 'done') throw new HttpError(400, 'Заявка закрыта.');
    if (!user?.bonuses) throw new HttpError(400, 'У клиента нет бонусов.');
    user.bonuses--;
    order.bonusUsed = true;
    store.saveNow();
    log.info(`Заявка #${orderNo(order.id)}: списан бонус клиента`);
    return send(res, 200, { order: orderDetail(order) });
  }

  if (action === 'studio') {
    const price = clean(body.price, 100);
    const due = validDate(body.due) ? String(body.due) : '';
    const prev = order.studio || {};
    order.studio = {
      ...prev,
      price,
      // Число з кошторису лишаємо, лише якщо ціну в полі не міняли
      amount: price === prev.price ? prev.amount : undefined,
      due,
      deadline: due ? dateText(due) : body.due === '' ? '' : clean(body.deadline ?? prev.deadline, 100),
      note: designer ? prev.note || '' : clean(body.note, 3000),
    };
    store.saveNow();
    await requireHandlers(runtime).updateCard(order).catch(() => {});
    return send(res, 200, { order: detailOf(order) });
  }

  // Відкладене повідомлення клієнту
  if (action === 'schedule') {
    const text = clean(body.text, 3000);
    const at = Date.parse(body.at);
    if (!text) throw new HttpError(400, 'Напишите текст сообщения.');
    if (!Number.isFinite(at) || at < Date.now() + 60 * 1000) throw new HttpError(400, 'Время отправки должно быть в будущем.');
    if (at > Date.now() + 90 * 86400000) throw new HttpError(400, 'Не дальше чем на 90 дней вперёд.');
    const list = (store.data.scheduledMessages ||= []);
    if (list.filter((x) => x.orderId === order.id).length >= 10) throw new HttpError(400, 'По заявке уже 10 отложенных сообщений.');
    list.push({ id: crypto.randomBytes(4).toString('hex'), orderId: order.id, epoch: store.data.orderEpoch || null, text, at: new Date(at).toISOString(), by: designer ? session.name : null, createdAt: new Date().toISOString() });
    store.saveNow();
    return send(res, 200, { order: detailOf(order) });
  }
  if (action === 'unschedule') {
    store.data.scheduledMessages = (store.data.scheduledMessages || []).filter((x) => !(x.id === String(body.id) && x.orderId === order.id));
    store.saveNow();
    return send(res, 200, { order: detailOf(order) });
  }

  if (action === 'message') {
    const text = clean(body.text, 3000);
    if (!text) throw new HttpError(400, 'Напишите текст сообщения.');
    try {
      await requireHandlers(runtime).messageClient(order, text, 'page', designer ? session.name : null);
    } catch (err) {
      if (err.status === 403) throw new HttpError(400, 'Клиент заблокировал бота — сообщение не доставлено.');
      if (err instanceof HttpError) throw err;
      throw new HttpError(502, `Telegram: ${err.description || err.message}`);
    }
    log.info(`Сообщение клиенту по заявке #${orderNo(order.id)} отправлено со страницы бота${designer ? ` (${session.name})` : ''}`);
    return send(res, 200, { order: detailOf(order) });
  }

  throw new HttpError(404, 'Не найдено');
}

/**
 * Ті самі дії із заявками для студійної Mini App: власник чи дизайнер (session) викликає handleOrders,
 * тож права, перевірки й побічні дії однакові зі сторінкою. Повертає { status, body }.
 */
export async function studioOrdersCall(session, method, pathname, body, runtime) {
  const req = Readable.from(method === 'POST' ? [Buffer.from(JSON.stringify(body || {}))] : []);
  Object.assign(req, { method, headers: { 'content-type': 'application/json' }, session });
  const out = { status: 200, body: null };
  const res = {
    writeHead(status) { out.status = status; },
    end(payload) { out.body = payload; },
  };
  try {
    await handleOrders(req, res, new URL(pathname, 'http://localhost'), runtime);
  } catch (err) {
    if (!(err instanceof HttpError)) throw err;
    return { status: err.status, body: { error: err.message } };
  }
  const text = Buffer.isBuffer(out.body) ? null : out.body;
  return { status: out.status, body: text ? JSON.parse(text) : out.body };
}

async function handleCatalog(req, res, route) {
  const body = await readJson(req);
  const tg = new Telegram(store.data.config.botToken);
  const id = String(body.id || '');
  try {
    if (route === 'POST /api/catalog/add') {
      const item = await addItem(tg, { link: body.link, description: body.description });
      log.info(`Каталог: добавлен стикерпак «${item.title}» (${item.name})`);
    } else if (route === 'POST /api/catalog/delete') {
      removeItem(id);
    } else if (route === 'POST /api/catalog/move') {
      moveItem(id, Number(body.direction));
    } else if (route === 'POST /api/catalog/describe') {
      updateDescription(id, body.description);
    } else if (route === 'POST /api/catalog/refresh') {
      const item = findItem(id);
      if (!item) throw new HttpError(404, 'Работа не найдена.');
      await refreshItem(tg, item);
    } else {
      throw new HttpError(404, 'Не найдено');
    }
  } catch (err) {
    if (err.userFacing) throw new HttpError(400, err.message);
    if (err.status && !(err instanceof HttpError)) throw new HttpError(400, `Telegram: ${err.description || err.message}`);
    throw err;
  }
  return send(res, 200, { items: catalogView(catalog()), max: MAX_ITEMS });
}

function paymentsView() {
  const p = store.data.config.payments;
  const env = Boolean(process.env.MONOBANK_TOKEN);
  const token = env ? process.env.MONOBANK_TOKEN : p.token;
  const since = Date.now() - 30 * 24 * 3600 * 1000;
  const paid = store.data.inquiries.flatMap((o) => o.payments || []).filter((x) => (x.status === 'success' || x.status === 'manual') && Date.parse(x.paidAt) > since);
  return {
    enabled: p.enabled, mode: p.mode, percent: p.percent, fixed: p.fixed, validityHours: p.validityHours,
    destination: p.destination, autoStart: p.autoStart, autoInvoice: Boolean(p.autoInvoice),
    cardEnabled: Boolean(p.cardEnabled), cardNumber: p.cardNumber || '', cardRecipient: p.cardRecipient || '', cardNote: p.cardNote || '',
    remindDays: Number(p.remindDays) || 0, remindTimes: Number(p.remindTimes) || 2, payReminders: store.data.stats.payReminders || 0,
    tokenSource: env ? 'env' : p.token ? 'page' : null,
    tokenMasked: token ? `••••${token.slice(-4)}` : null,
    paid30: { count: paid.length, sum: paid.reduce((s, x) => s + (x.finalAmount || x.amount), 0) },
  };
}

function aiView() {
  const s = aiSettings();
  const key = aiKey();
  const usage = store.data.stats.ai || null;
  return {
    model: s.model, briefIdeas: s.briefIdeas !== false, channelWriter: s.channelWriter !== false,
    models: Object.entries(AI_MODELS).map(([id, m]) => ({ id, label: m.label })),
    keySource: aiKeySource(), keyMasked: key ? `••••${key.slice(-4)}` : null,
    usage: usage && usage.month === new Date().toISOString().slice(0, 7) ? usage : null,
    briefsWithAi: store.data.inquiries.filter((o) => o.aiIdeas).length,
  };
}

function genagentView() {
  const s = genagentSettings();
  return {
    url: s.url, enabled: s.enabled, comments: Boolean(s.comments), chat: Boolean(s.chat), chatError: s.chatError || '', keyMasked: s.key ? `••••${s.key.slice(-4)}` : null,
    lastSyncAt: s.lastSyncAt, lastError: s.lastError, commentsError: s.commentsError || '',
  };
}

function languageView() {
  const users = Object.values(store.data.users);
  return {
    english: store.data.config.english !== false,
    en: users.filter((u) => u.lang === 'en').length,
    uk: users.filter((u) => u.lang !== 'en').length,
    ordersEn: store.data.inquiries.filter((o) => o.lang === 'en').length,
  };
}

function referralView() {
  const users = Object.values(store.data.users);
  return {
    ...store.data.config.referral,
    bot: store.data.bot.username || null,
    invitedTotal: users.filter((u) => u.referredBy).length,
    converted: store.data.inquiries.filter((o) => o.referral).length,
    bonusesOpen: users.reduce((s, u) => s + (u.bonuses || 0), 0),
    top: users.filter((u) => u.invited).sort((a, b) => b.invited - a.invited).slice(0, 5)
      .map((u) => ({ name: u.username ? `@${u.username}` : u.firstName || String(u.id), invited: u.invited, bonuses: u.bonuses || 0 })),
  };
}

function reviewsView() {
  const items = store.data.inquiries
    .filter((o) => o.review?.rating)
    .map((o) => ({
      orderId: o.id, client: o.username ? `@${o.username}` : o.fullName || String(o.userId), name: o.fullName || '',
      rating: o.review.rating, comment: o.review.comment || '', at: o.review.at, published: Boolean(o.review.published),
      postedAt: o.review.postedAt || null, postLink: o.review.postLink || null,
      via: o.review.via || 'telegram', service: findService(o.service || 'stickers')?.name || '',
    }))
    .sort((a, b) => (b.at || '').localeCompare(a.at || ''));
  const avg = items.length ? Math.round((items.reduce((s, r) => s + r.rating, 0) / items.length) * 10) / 10 : null;
  const asked = store.data.inquiries.filter((o) => o.reviewAskedAt).length;
  return { avg, count: items.length, asked, published: items.filter((r) => r.published).length, items, channels: store.data.config.channels || [] };
}

/** Сирі байти тіла запиту (для завантаження файлів). */
function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, `Файл больше ${Math.round(limit / 1048576)} МБ.`)); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function channelView(poster) {
  const d = store.data;
  return {
    channels: d.config.channels,
    signature: d.config.channelSignature || '',
    signatureBuilder: d.config.signatureBuilder || null,
    templates: d.channelTemplates || [],
    bot: d.bot.username || null,
    posts: (d.channelPosts || []).slice(0, 30).map(({ visitors, ...p }) => {
      const orders = d.inquiries.filter((o) => o.viaPost?.id === p.id);
      return { ...p, orders: orders.length, done: orders.filter((o) => o.status === 'done').length };
    }),
    queue: (d.channelQueue || []).map((q) => ({ id: q.id, at: q.at, chatTitle: q.chatTitle, text: q.post.html.replace(/<[^>]+>/g, '').slice(0, 120), files: q.post.files.length })),
    ready: Boolean(poster.runtime.ready),
    aiWriter: aiAvailable('channelWriter'),
  };
}

async function handleChannel(req, res, route, runtime) {
  const poster = runtime.channels;
  try {
    if (route === 'GET /api/channel') {
      poster.seedTemplates();
      return send(res, 200, channelView(poster));
    }
    // Файл із завантажень (для медіа шаблону в редакторі)
    const fileMatch = route.match(/^GET \/api\/channel\/upload\/([0-9a-f]{16})$/);
    if (fileMatch) {
      const f = poster.loadUpload(fileMatch[1]);
      // Віддаємо як медіа лише картинки й відео; решту — як файл для завантаження (щоб нічого не виконалось на сторінці)
      const safe = /^(image\/(jpeg|png|gif|webp)|video\/(mp4|webm|quicktime))$/i.test(f.mime);
      return send(res, 200, f.buffer, safe ? f.mime : 'application/octet-stream', {
        'cache-control': 'private, max-age=86400',
        ...(safe ? {} : { 'content-disposition': `attachment; filename="${encodeURIComponent(f.name)}"` }),
      });
    }
    if (route === 'POST /api/channel/upload') {
      const buf = await readRaw(req, MAX_UPLOAD + 1);
      const name = safeDecode(String(req.headers['x-filename'] || 'file'));
      const meta = poster.saveUpload(buf, name, req.headers['content-type']);
      return send(res, 200, { id: meta.id, name: meta.name, kind: meta.kind, size: meta.size });
    }
    const body = await readJson(req);
    if (route === 'POST /api/channel/add') {
      await poster.addChannel(body.ref);
      return send(res, 200, channelView(poster));
    }
    if (route === 'POST /api/channel/remove') {
      poster.removeChannel(body.id);
      return send(res, 200, channelView(poster));
    }
    if (route === 'POST /api/channel/signature') {
      store.data.config.channelSignature = String(body.signature || '').slice(0, 500);
      // Поля конструктора — щоб наступного разу не заповнювати заново
      const b = body.builder || {};
      const str = (v, max) => String(v ?? '').slice(0, max);
      store.data.config.signatureBuilder = {
        intro: str(b.intro, 120), separator: str(b.separator, 8), layout: b.layout === 'column' ? 'column' : 'line',
        bold: Boolean(b.bold),
        links: (Array.isArray(b.links) ? b.links : []).slice(0, 3).map((l) => ({ label: str(l?.label, 40), url: str(l?.url, 300) })),
      };
      store.saveNow();
      return send(res, 200, channelView(poster));
    }
    if (route === 'POST /api/channel/post') {
      const result = await poster.publish(body);
      return send(res, 200, { ...channelView(poster), result });
    }
    if (route === 'POST /api/channel/edit') {
      await poster.editPost(String(body.id), body);
      return send(res, 200, channelView(poster));
    }
    if (route === 'POST /api/channel/delete') {
      await poster.deletePost(String(body.id));
      return send(res, 200, channelView(poster));
    }
    if (route === 'POST /api/channel/template/save') {
      const tpl = poster.saveTemplate(body);
      log.info(`Шаблон поста сохранён: «${tpl.name}»`);
      return send(res, 200, { ...channelView(poster), saved: tpl.id });
    }
    if (route === 'POST /api/channel/template/rename') {
      poster.renameTemplate(String(body.id), body.name);
      return send(res, 200, channelView(poster));
    }
    if (route === 'POST /api/channel/template/delete') {
      poster.deleteTemplate(String(body.id));
      return send(res, 200, channelView(poster));
    }
    if (route === 'POST /api/channel/cancel') {
      poster.cancelScheduled(String(body.id));
      return send(res, 200, channelView(poster));
    }
  } catch (err) {
    if (err instanceof ChannelError) throw new HttpError(400, err.message);
    throw err;
  }
  throw new HttpError(404, 'Не найдено');
}

async function handleBroadcast(req, res, route, runtime) {
  const b = runtime.broadcaster;
  const view = () => {
    const sources = [...new Set(Object.values(store.data.users).map((u) => u.source).filter(Boolean))].sort();
    return {
      running: b.current ? b.current.job : null,
      history: store.data.broadcasts,
      sources,
      counts: { all: b.recipients({ type: 'all' }).length, orders: b.recipients({ type: 'orders' }).length, no_orders: b.recipients({ type: 'no_orders' }).length },
      unsubscribed: Object.values(store.data.users).filter((u) => u.unsubscribed).length,
    };
  };
  try {
    if (route === 'GET /api/broadcast') return send(res, 200, view());
    const body = await readJson(req);
    if (route === 'POST /api/broadcast/count') {
      return send(res, 200, { count: b.recipients({ type: body.audience, source: body.source }).length });
    }
    if (route === 'POST /api/broadcast/test') {
      await b.test(body);
      return send(res, 200, { ok: true });
    }
    if (route === 'POST /api/broadcast/send') {
      b.start(body);
      return send(res, 200, view());
    }
    if (route === 'POST /api/broadcast/cancel') {
      b.cancel();
      return send(res, 200, view());
    }
  } catch (err) {
    if (err.userFacing) throw new HttpError(400, err.message);
    throw err;
  }
  throw new HttpError(404, 'Не найдено');
}

/** Що доступно дизайнеру: свої заявки, швидкі відповіді, свій пароль. */
async function handleDesignerApi(req, res, url, route, runtime) {
  const s = req.session;
  if (route === 'GET /api/me') return send(res, 200, { role: 'designer', name: s.name, bot: store.data.bot.username ? `@${store.data.bot.username}` : null });
  if (url.pathname.startsWith('/api/orders')) return handleOrders(req, res, url, runtime);
  if (route === 'GET /api/quick-replies') return send(res, 200, { replies: replyList() });
  // Картинка «Як у прикладі» — лише для заявок, призначених цьому дизайнеру
  const ex = /^GET \/api\/channel\/upload\/([0-9a-f]{16})$/.exec(route);
  if (ex && store.data.inquiries.some((o) => o.assignee === s.memberId && o.likeExample?.image === ex[1]) && runtime.channels) {
    const f = runtime.channels.loadUpload(ex[1]);
    if (f && /^image\/(jpeg|png|webp)$/.test(f.mime)) return send(res, 200, f.buffer, f.mime, { 'cache-control': 'private, max-age=86400' });
  }
  if (route === 'POST /api/password') {
    const body = await readJson(req);
    const m = team().find((x) => x.id === s.memberId);
    if (!verifyPassword(body.current, m.passwordSalt, m.passwordHash)) throw new HttpError(400, 'Текущий пароль неверный.');
    if (String(body.next || '').length < 8) throw new HttpError(400, 'Новый пароль — минимум 8 символов.');
    const { salt, hash } = hashPassword(String(body.next));
    Object.assign(m, { passwordSalt: salt, passwordHash: hash });
    store.saveNow();
    dropSessions(m.id);
    return send(res, 200, { ok: true }, undefined, { 'set-cookie': sessionCookie(req, 'designer', m.id) });
  }
  throw new HttpError(403, 'Раздел доступен только владельцу студии.');
}

async function handleApi(req, res, url, route, runtime) {
  if (route === 'POST /api/logout') {
    sessions.delete(cookies(req)[SESSION_COOKIE]);
    return send(res, 200, { ok: true }, undefined, { 'set-cookie': `${SESSION_COOKIE}=; Path=/; Max-Age=0` });
  }
  if (req.session.role === 'designer') return handleDesignerApi(req, res, url, route, runtime);
  if (route === 'GET /api/me') return send(res, 200, { role: 'owner', name: null, team: team().length });
  const more = await handleMore(req, res, url, route, runtime, { send, readJson, readRaw, HttpError, clean, requireHandlers, dropSessions, dropAllSessions });
  if (more) return undefined;
  if (route === 'GET /api/overview') return send(res, 200, overview(runtime));
  if (url.pathname.startsWith('/api/orders')) return handleOrders(req, res, url, runtime);
  if (route === 'GET /api/clients') return send(res, 200, { clients: clientsList() });
  if (route === 'GET /api/drafts') return send(res, 200, { drafts: draftsList() });
  if (route === 'POST /api/drafts/delete') {
    const body = await readJson(req);
    delete store.data.drafts[String(body.userId)];
    store.saveNow();
    return send(res, 200, { drafts: draftsList() });
  }
  if (route === 'GET /api/system') return send(res, 200, systemInfo(runtime));
  if (route === 'POST /api/history/clear') {
    const body = await readJson(req);
    const c = store.data.config;
    if (String(body.confirm || '').trim().toUpperCase() !== 'УДАЛИТЬ') throw new HttpError(400, 'Для подтверждения введите слово УДАЛИТЬ.');
    if (!verifyPassword(body.password, c.passwordSalt, c.passwordHash)) throw new HttpError(400, 'Неверный пароль.');
    const result = store.clearHistory({ stats: Boolean(body.stats), clients: Boolean(body.clients), drafts: Boolean(body.drafts) });
    log.warn(`История заказов очищена со страницы бота: удалено заявок ${result.removed.orders}` +
      `${body.clients ? `, клиентов ${result.removed.clients}` : ''}. Копия: ${result.backup}`);
    return send(res, 200, result);
  }

  if (route === 'POST /api/errors/clear') {
    store.data.errors = [];
    store.saveNow();
    return send(res, 200, systemInfo(runtime));
  }

  if (route === 'GET /api/settings') {
    const c = store.data.config;
    return send(res, 200, { adminChatId: c.adminChatId, active: c.active !== false, bot: store.data.bot.username || null });
  }
  if (route === 'POST /api/settings') {
    const body = await readJson(req);
    const chatId = String(body.adminChatId || '').trim();
    if (!validChatId(chatId)) throw new HttpError(400, 'ID получателя — это число, например 8310127198.');
    try {
      await testRecipient(store.data.config.botToken, chatId);
    } catch (err) {
      const bot = store.data.bot.username ? `@${store.data.bot.username}` : 'боту';
      throw new HttpError(400, `Бот не смог написать на этот ID (${err.description || err.message}). Сначала отправьте ${bot} команду /start с этого аккаунта.`);
    }
    store.data.config.adminChatId = chatId;
    store.saveNow();
    runtime.handlers?.syncStudioCommands().catch(() => {});
    log.info(`Получатель заявок изменён: ${chatId}`);
    return send(res, 200, { ok: true });
  }
  if (route === 'POST /api/active') {
    const body = await readJson(req);
    store.data.config.active = Boolean(body.active);
    store.saveNow();
    log.info(store.data.config.active ? 'Приём заказов включён' : 'Приём заказов приостановлен');
    return send(res, 200, { active: store.data.config.active });
  }
  if (route === 'POST /api/password') {
    const body = await readJson(req);
    const c = store.data.config;
    if (!verifyPassword(body.current, c.passwordSalt, c.passwordHash)) throw new HttpError(400, 'Текущий пароль неверный.');
    if (String(body.next || '').length < 8) throw new HttpError(400, 'Новый пароль — минимум 8 символов.');
    const { salt, hash } = hashPassword(String(body.next));
    Object.assign(c, { passwordSalt: salt, passwordHash: hash });
    store.saveNow();
    dropAllSessions();
    log.info('Пароль страницы бота изменён');
    return send(res, 200, { ok: true }, undefined, { 'set-cookie': sessionCookie(req) });
  }

  // --- Відгуки ---
  if (route === 'GET /api/reviews') return send(res, 200, reviewsView());
  if (route === 'POST /api/reviews/publish') {
    const body = await readJson(req);
    const order = findOrder(body.orderId);
    if (!order.review) throw new HttpError(404, 'Отзыва нет.');
    order.review.published = Boolean(body.published);
    store.saveNow();
    return send(res, 200, reviewsView());
  }

  // --- Робочі години ---
  if (route === 'GET /api/workhours') {
    return send(res, 200, { hours: store.data.config.workHours, working: isWorkingTime(store.data.config.workHours), preview: offHoursMessage(store.data.config.workHours) });
  }
  if (route === 'POST /api/workhours') {
    const body = await readJson(req);
    const time = (v, def) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v)) ? String(v) : def);
    const days = [...new Set((Array.isArray(body.days) ? body.days : []).map(Number).filter((d) => d >= 1 && d <= 7))];
    if (body.enabled && !days.length) throw new HttpError(400, 'Отметьте хотя бы один рабочий день.');
    store.data.config.workHours = {
      enabled: Boolean(body.enabled), days,
      from: time(body.from, '10:00'), to: time(body.to, '19:00'),
      message: clean(body.message, 1000),
    };
    store.saveNow();
    log.info('Рабочие часы обновлены');
    const hours = store.data.config.workHours;
    return send(res, 200, { hours, working: isWorkingTime(hours), preview: offHoursMessage(hours) });
  }

  // --- Розсилка ---
  if (url.pathname.startsWith('/api/broadcast')) return handleBroadcast(req, res, route, runtime);

  // --- Публікації в канали ---
  if (route === 'POST /api/channel/ai') {
    const body = await readJson(req);
    if (!aiKey()) throw new HttpError(400, 'Сначала укажите ключ Claude API: «Настройки» → «ИИ-помощник».');
    if (aiSettings().channelWriter === false) throw new HttpError(400, 'Помощник для постов выключен в «Настройках».');
    try {
      const html = await writePost({
        brief: clean(body.brief, 2000), tone: String(body.tone || ''), length: String(body.length || ''),
        lang: body.lang === 'en' ? 'en' : 'uk', current: String(body.current || '').slice(0, 4000),
      });
      return send(res, 200, { html: sanitizeHtml(html.replace(/<br\s*\/?>/gi, '\n')) });
    } catch (err) {
      if (err instanceof AiError) throw new HttpError(400, err.message);
      throw err;
    }
  }

  if (url.pathname.startsWith('/api/channel')) return handleChannel(req, res, route, runtime);

  // --- Оплата авансу: налаштування ---
  if (route === 'GET /api/payments') return send(res, 200, paymentsView(runtime));
  if (route === 'POST /api/payments') {
    const body = await readJson(req);
    const p = store.data.config.payments;
    if (typeof body.token === 'string' && body.token.trim()) p.token = body.token.trim().slice(0, 200);
    if (body.clearToken) p.token = '';
    p.mode = body.mode === 'fixed' ? 'fixed' : 'percent';
    p.percent = Math.min(100, Math.max(1, Math.round(Number(body.percent) || 50)));
    p.fixed = Math.min(500000, Math.max(1, Math.round(Number(body.fixed) || 1000)));
    p.validityHours = Math.min(720, Math.max(1, Math.round(Number(body.validityHours) || 24)));
    p.destination = clean(body.destination, 280) || 'Аванс за стікерпак, замовлення #{номер}';
    p.autoStart = Boolean(body.autoStart);
    // Поле може не прийти (наприклад, «Удалить токен») — тоді не скидаємо налаштування
    if ('autoInvoice' in body) p.autoInvoice = Boolean(body.autoInvoice);
    if ('remindDays' in body) {
      p.remindDays = Math.min(30, Math.max(0, Math.round(Number(body.remindDays) || 0)));
      p.remindTimes = Number(body.remindTimes) === 1 ? 1 : 2;
    }
    if ('cardNumber' in body) {
      p.cardNumber = clean(body.cardNumber, 40);
      p.cardRecipient = clean(body.cardRecipient, 80);
      p.cardNote = clean(body.cardNote, 200);
      if (body.cardEnabled && !p.cardNumber) throw new HttpError(400, 'Укажите номер карты или IBAN.');
      const cardWas = p.cardEnabled;
      p.cardEnabled = Boolean(body.cardEnabled);
      if (cardWas !== p.cardEnabled) log.info(`Оплата переводом на карту ${p.cardEnabled ? 'включена' : 'выключена'}`);
    }
    const flow = runtime.handlers?.payments;
    const hasToken = Boolean(process.env.MONOBANK_TOKEN || p.token);
    if (body.enabled && !hasToken) throw new HttpError(400, 'Сначала укажите токен monobank — без него оплату не включить.');
    const wasEnabled = p.enabled;
    p.enabled = Boolean(body.enabled);
    store.saveNow();
    if (wasEnabled !== p.enabled) log.info(`Оплата аванса ${p.enabled ? 'включена' : 'выключена'}`);
    // Кнопка «Рахунок на аванс» на картках відкритих заявок — оновлюємо у фоні:
    // без зв'язку з Telegram кожна картка чекала б до 30 с, і «Сохранить» висіло б хвилинами
    if (flow) {
      const open = store.data.inquiries.filter((x) => x.status === 'new' || x.status === 'in_progress');
      (async () => { for (const o of open) await runtime.handlers.updateCard(o).catch(() => {}); })();
    }
    return send(res, 200, paymentsView(runtime));
  }
  if (route === 'POST /api/payments/verify') {
    const body = await readJson(req);
    const token = String(body.token || '').trim() || process.env.MONOBANK_TOKEN || store.data.config.payments.token;
    if (!token) throw new HttpError(400, 'Токен не указан.');
    try {
      const d = await new MonoClient(token).details();
      return send(res, 200, { ok: true, merchantName: d.merchantName || d.merchantId || 'магазин' });
    } catch (err) {
      throw new HttpError(400, err.message);
    }
  }

  // --- ІІ-помічник (Claude API) ---
  if (route === 'GET /api/ai') return send(res, 200, aiView());
  if (route === 'POST /api/ai') {
    const body = await readJson(req);
    const s = aiSettings();
    if (typeof body.key === 'string' && body.key.trim()) {
      const key = body.key.trim();
      if (!/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(key)) throw new HttpError(400, 'Это не похоже на ключ Claude API — он начинается с «sk-ant-».');
      s.key = key.slice(0, 300);
    }
    if (body.clearKey) s.key = '';
    if (AI_MODELS[body.model]) s.model = body.model;
    s.briefIdeas = Boolean(body.briefIdeas);
    s.channelWriter = Boolean(body.channelWriter);
    store.saveNow();
    log.info(`ИИ-помощник: ${aiKey() ? `ключ задан, модель ${s.model}` : 'ключ не задан'}; идеи в брифе — ${s.briefIdeas ? 'вкл' : 'выкл'}, посты — ${s.channelWriter ? 'вкл' : 'выкл'}`);
    return send(res, 200, aiView());
  }
  if (route === 'POST /api/ai/verify') {
    const body = await readJson(req);
    try {
      return send(res, 200, { ok: true, ...(await verifyKey(body.key)) });
    } catch (err) {
      if (err instanceof AiError) throw new HttpError(400, err.message);
      throw err;
    }
  }
  // --- ІІ-агент студії (GenAgent) ---
  if (route === 'GET /api/genagent') return send(res, 200, genagentView());
  if (route === 'POST /api/genagent') {
    const body = await readJson(req);
    const s = genagentSettings();
    const url = String(body.url || '').trim().replace(/\/+$/, '');
    if (url && !GENAGENT_URL.test(url)) throw new HttpError(400, 'Адрес должен быть вида https://agents.yabotua.com/api/agent/… — скопируйте его из канала «Свой бот (API)».');
    const key = typeof body.key === 'string' ? body.key.trim() : '';
    if (key && !/^[A-Za-z0-9_-]{16,200}$/.test(key)) throw new HttpError(400, 'Ключ не похож на ключ канала — скопируйте его целиком.');
    if (url !== s.url || key) Object.assign(s, { lastHash: '', lastError: '' });
    s.url = url;
    if (key) s.key = key;
    if (body.clearKey) s.key = '';
    s.enabled = Boolean(body.enabled) && Boolean(s.url && s.key);
    if (typeof body.comments === 'boolean') s.comments = body.comments;
    if (typeof body.chat === 'boolean') s.chat = body.chat;
    if (!s.chat) s.chatError = '';
    if (!s.comments) s.commentsError = '';
    store.saveNow();
    log.info(`GenAgent: синхронизация ${s.enabled ? 'включена' : 'выключена'}, комментарии канала — ${s.enabled && s.comments ? 'вкл' : 'выкл'}, помощник в боте — ${s.enabled && s.chat ? 'вкл' : 'выкл'}`);
    if (s.enabled) await syncGenagent({ force: true });
    return send(res, 200, genagentView());
  }
  if (route === 'POST /api/genagent/sync') {
    const r = await syncGenagent({ force: true });
    if (r.skipped) throw new HttpError(400, 'Сначала укажите адрес и ключ агента и включите синхронизацию.');
    if (!r.ok) throw new HttpError(502, `Не получилось: ${r.error}`);
    return send(res, 200, genagentView());
  }
  // --- Англійська версія ---
  if (route === 'GET /api/language') return send(res, 200, languageView());
  if (route === 'POST /api/language') {
    const body = await readJson(req);
    store.data.config.english = Boolean(body.english);
    store.saveNow();
    log.info(`Английская версия бота ${store.data.config.english ? 'включена' : 'выключена'}`);
    return send(res, 200, languageView());
  }

  // --- Швидкі відповіді ---
  if (route === 'GET /api/quick-replies') return send(res, 200, { replies: replyList() });
  if (route === 'POST /api/quick-replies') {
    const body = await readJson(req);
    try {
      return send(res, 200, { replies: saveReplies(body.replies) });
    } catch (err) {
      throw new HttpError(400, err.message);
    }
  }

  // --- Реферальна програма ---
  if (route === 'GET /api/referral') return send(res, 200, referralView());
  if (route === 'POST /api/referral') {
    const body = await readJson(req);
    const percent = Math.round(Number(body.percent));
    if (!(percent >= 1 && percent <= 90)) throw new HttpError(400, 'Скидка — от 1 до 90%.');
    store.data.config.referral = { enabled: Boolean(body.enabled), percent };
    store.saveNow();
    log.info(`Реферальная программа: ${body.enabled ? `включена, ${percent}%` : 'выключена'}`);
    return send(res, 200, referralView());
  }

  // --- Вивантаження в Excel ---
  if (route === 'GET /api/export.xlsx') {
    const file = buildXlsx(exportSheets());
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv' }).format(new Date());
    return send(res, 200, file, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', {
      'content-disposition': `attachment; filename="YABOT_${date}.xlsx"`,
    });
  }

  if (route === 'GET /api/prices') return send(res, 200, { prices: store.data.config.prices });
  if (route === 'POST /api/prices') {
    const body = await readJson(req);
    const line = (v, max) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
    const prices = { note: line(body.note, 300) };
    for (const type of PRICE_TYPE_KEYS) {
      prices[type] = {};
      for (const qty of PRICE_QTY_KEYS) prices[type][qty] = line(body[type]?.[qty], 60);
    }
    store.data.config.prices = prices;
    store.saveNow();
    log.info('Цены обновлены');
    return send(res, 200, { prices });
  }

  if (route === 'GET /api/sources') return send(res, 200, sourcesView());
  if (route === 'GET /api/catalog') return send(res, 200, { items: catalogView(catalog()), max: MAX_ITEMS });
  if (url.pathname.startsWith('/api/catalog/') && req.method === 'POST') return handleCatalog(req, res, route);

  throw new HttpError(404, 'Не найдено');
}

export function startAdminServer(runtime) {
  const logo = fs.readFileSync(path.join(ASSETS_DIR, 'logo.jpg'));

  const server = http.createServer(async (req, res) => {
    try {
      if (!hostAllowed(req)) return send(res, 421, 'Misdirected request', 'text/plain; charset=utf-8');
      const url = new URL(req.url, 'http://localhost');
      const route = `${req.method} ${url.pathname}`;

      if (route === 'GET /') return send(res, 200, PAGE_HTML, 'text/html; charset=utf-8');
      if (route === 'GET /app.css') return send(res, 200, APP_CSS, 'text/css; charset=utf-8');
      if (route === 'GET /app.js') return send(res, 200, APP_JS, 'text/javascript; charset=utf-8');
      if (route === 'GET /logo.jpg') return send(res, 200, logo, 'image/jpeg', { 'cache-control': 'max-age=86400' });

      if (route === 'GET /api/status') {
        const c = store.data.config;
        return send(res, 200, {
          configured: store.configured,
          tokenPreset: Boolean(c.botToken) && !store.configured,
          loggedIn: store.configured && isLoggedIn(req),
          role: getSession(req)?.role || null,
          bot: store.data.bot.username ? `@${store.data.bot.username}` : null,
        });
      }

      if (req.method === 'POST' && !sameOrigin(req)) return send(res, 403, { error: 'Запрос отклонён (проверка источника).' });
      if (route === 'POST /api/setup') return await handleSetup(req, res);
      if (route === 'POST /api/login') return await handleLogin(req, res, runtime);
      if (route === 'POST /api/login/code') return await handleSecondStep(req, res);

      if (!url.pathname.startsWith('/api/')) return send(res, 404, { error: 'Не найдено' });
      req.session = getSession(req);
      if (!req.session) return send(res, 401, { error: 'Нужно войти.' });
      return await handleApi(req, res, url, route, runtime);
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      log.error(`Ошибка страницы бота: ${err.message}`);
      store.addError('admin', err);
      return send(res, 500, { error: 'Внутренняя ошибка.' });
    }
  });

  server.listen(PORT, HOST, () => log.info(`Страница бота: http://${HOST}:${PORT}/`));
  server.on('error', (err) => {
    log.error(`Не удалось открыть порт ${PORT}: ${err.message}`);
    process.exitCode = 1;
  });
  return server;
}
