// Окремий веб-сервер Mini App. Сторінку керування він не віддає: лише інтерфейс Mini App,
// API з перевіркою підпису Telegram і медіа за підписаними посиланнями.
// Слухає 127.0.0.1 і адреси мостів Docker (docker0, br-…) — щоб Caddy з контейнера міг проксувати app.yabotua.com.
import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { PORT, ASSETS_DIR } from '../config.js';
import { store } from '../store.js';
import { log } from '../log.js';
import { verifyInitData } from './auth.js';
import { MiniApi, MiniError, readMediaToken, mediaUrl, refToken } from './api.js';
import { StudioApi } from './studio.js';
import { readUpload } from '../channel.js';
import { CLIENT_HTML, CLIENT_CSS, CLIENT_JS } from './client.js';

const MAX_BODY = 64 * 1024;
const MAX_UPLOAD = 12 * 1024 * 1024;
const CACHE_LIMIT = 40 * 1024 * 1024;
const SET_TTL = 60 * 60 * 1000;
// Захист пам'яті (контейнер — 512 МБ): скільки байт завантажень одночасно тримаємо в пам'яті
// і скільки файлів одночасно качаємо з Telegram для /m/
const MAX_INFLIGHT = 96 * 1024 * 1024;
const MAX_DOWNLOADS = 4;

export const MINIAPP_DEFAULTS = { enabled: false, url: '', port: 0, menuText: 'YABOT' };

export function miniSettings() {
  return { ...MINIAPP_DEFAULTS, ...(store.data.config.miniapp || {}) };
}
export const miniPort = () => Number(miniSettings().port) || PORT + 100;

const HEADERS = {
  'content-security-policy':
    "default-src 'self'; script-src 'self' https://telegram.org; img-src 'self' data: blob:; media-src 'self' blob:; " +
    "style-src 'self'; connect-src 'self'; frame-ancestors 'self' https://*.telegram.org; base-uri 'none'; form-action 'none'",
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

function sniff(buf) {
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return 'image/png';
  if (buf.length > 8 && buf.toString('ascii', 4, 8) === 'ftyp') return 'video/mp4';
  if (buf.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  if (buf.toString('ascii', 0, 4) === 'OggS') return 'audio/ogg';
  if (buf.toString('ascii', 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  return null;
}

import { parseWebmOpus, buildOggOpus, audioKind } from './ogg.js';

export class MiniServer {
  constructor(runtime) {
    this.runtime = runtime;
    this.api = new MiniApi(runtime);
    this.studio = new StudioApi(runtime);
    this.servers = [];
    this.cache = new Map(); // ключ медіа → { buf, type }
    this.cacheSize = 0;
    this.sets = new Map(); // назва стікерпака → { at, set }
    this.hits = new Map(); // ліміт запитів: ключ → { at, n }
    this.boundKey = '';
    this.inflight = 0; // байт тіл запитів, що зараз читаються
    this.downloading = 0; // скільки файлів зараз качаємо з Telegram
    this.waiters = []; // черга на завантаження з Telegram
    this.pending = new Map(); // ключ медіа → проміс завантаження (однакові запити чекають один)
  }

  /**
   * Тіло запиту в пам'ять: не більше max байт, а всі одночасні завантаження разом — не більше MAX_INFLIGHT.
   * tooLarge — текст помилки для клієнта.
   */
  async readStream(req, max, tooLarge) {
    const declared = Number(req.headers['content-length']);
    if (declared > max) throw new MiniError(tooLarge, 413);
    const chunks = [];
    let size = 0;
    try {
      for await (const c of req) {
        size += c.length;
        if (size > max) throw new MiniError(tooLarge, 413);
        if (this.inflight + c.length > MAX_INFLIGHT) throw new MiniError('Сервер занят — попробуйте через минуту.', 503);
        this.inflight += c.length;
        chunks.push(c);
      }
      return Buffer.concat(chunks);
    } finally {
      this.inflight -= chunks.reduce((s, c) => s + c.length, 0);
    }
  }

  /** Завантаження з Telegram: не більше MAX_DOWNLOADS одночасно, однакові запити ділять одне завантаження. */
  async download(key, fn) {
    if (this.pending.has(key)) return this.pending.get(key);
    const job = (async () => {
      while (this.downloading >= MAX_DOWNLOADS) await new Promise((r) => this.waiters.push(r));
      this.downloading++;
      try { return await fn(); } finally {
        this.downloading--;
        this.waiters.shift()?.();
      }
    })();
    this.pending.set(key, job);
    try { return await job; } finally { this.pending.delete(key); }
  }

  /** 127.0.0.1 і адреси мостів Docker (docker0, br-…), щоб Caddy з контейнера дістав до бота. */
  addresses() {
    const list = ['127.0.0.1'];
    for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
      if (!/^(docker\d*|br-[0-9a-f]+)$/.test(name)) continue;
      for (const a of addrs || []) if (a.family === 'IPv4' && !a.internal && !list.includes(a.address)) list.push(a.address);
    }
    return list;
  }

  /** Запустити/зупинити за налаштуваннями (викликається при старті й після збереження). */
  apply() {
    // Мережі Docker можуть з'явитися пізніше (перезапуск Caddy) — раз на 5 хвилин перевіряємо адреси
    if (!this.timer) { this.timer = setInterval(() => this.apply(), 5 * 60 * 1000); this.timer.unref(); }
    // Раз на 10 хвилин — чи відкривається Mini App ззовні (через Caddy й брандмауер)
    if (!this.watchTimer) {
      this.watchTimer = setInterval(() => this.watchPublic().catch((err) => log.warn(`Проверка Mini App: ${err.message}`)), 10 * 60 * 1000);
      this.watchTimer.unref();
    }
    const s = miniSettings();
    const key = s.enabled ? `${miniPort()}|${this.addresses().join(',')}` : '';
    if (key === this.boundKey) return;
    for (const srv of this.servers) srv.close();
    this.servers = [];
    this.boundKey = key;
    if (!s.enabled) return;
    for (const host of this.addresses()) {
      const srv = http.createServer((req, res) => this.handle(req, res));
      srv.on('error', (err) => log.warn(`Mini App: не удалось слушать ${host}:${miniPort()} — ${err.message}`));
      srv.listen(miniPort(), host, () => log.info(`Mini App: http://${host}:${miniPort()}/`));
      this.servers.push(srv);
    }
  }

  /**
   * Перевірка публічної адреси (https://…/health). 3 невдачі поспіль (~30 хв) — повідомлення власнику
   * з підказкою, як полагодити; коли знову відкривається — теж повідомлення.
   */
  async watchPublic() {
    const s = miniSettings();
    const w = (this.watch ||= { fails: 0, alerted: false });
    if (!s.enabled || !/^https:\/\//.test(s.url || '') || !this.runtime.ready || !this.servers.length) { w.fails = 0; return null; }
    const base = s.url.replace(/\/+$/, '');
    let error = '';
    try {
      const r = await fetch(`${base}/health`, { signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'YABOT self-check' } });
      if (!r.ok) error = `HTTP ${r.status}`;
      else if (!/ok/i.test(await r.text())) error = 'неожиданный ответ';
    } catch (err) {
      error = err.name === 'TimeoutError' ? 'нет ответа 15 с' : err.cause?.code || err.message;
    }
    store.data.stats.miniWatch = { at: new Date().toISOString(), ok: !error, error };
    const owner = store.data.config.adminChatId;
    const h = this.runtime.handlers;
    if (!error) {
      if (w.alerted && owner && h) await h.send(owner, `✅ <b>Mini App снова открывается:</b> ${base}`).catch(() => {});
      w.fails = 0; w.alerted = false;
      return true;
    }
    w.fails++;
    log.warn(`Mini App снаружи не открывается (${w.fails}): ${error}`);
    if (w.fails >= 3 && !w.alerted && owner && h && store.data.config.alerts?.enabled !== false) {
      const host = base.replace(/^https:\/\//, '').split('/')[0];
      const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      await h.send(owner, `📱 <b>Mini App не открывается</b>\n${esc(base)} не отвечает уже ~30 минут (${esc(error)}). Клиенты не могут открыть приложение.\n\n` +
        'Частая причина — сброшено правило брандмауэра (например, после ssh-tailscale-only.sh). На сервере в папке панели выполните:\n' +
        `<code>./setup-miniapp.sh ${host} ${miniPort()}</code>\nСкрипт сам проверит Caddy и вернёт правило. Когда заработает — бот сообщит.`).catch(() => {});
      w.alerted = true;
    }
    return false;
  }

  /** Кнопка меню в чаті бота: Mini App або звичайний список команд. */
  async syncMenuButton(tg = this.runtime.tg) {
    if (!tg) return;
    const s = miniSettings();
    const menu = s.enabled && /^https:\/\//.test(s.url)
      ? { type: 'web_app', text: String(s.menuText || 'YABOT').slice(0, 64), web_app: { url: s.url } }
      : { type: 'commands' };
    await tg.call('setChatMenuButton', { menu_button: menu }).catch((err) => log.warn(`Кнопка меню не установлена: ${err.message}`));
  }

  limited(key, max) {
    const now = Date.now();
    const h = this.hits.get(key);
    if (!h || now - h.at > 60000) {
      this.hits.set(key, { at: now, n: 1 });
      // Прибираємо лише записи старші за хвилину — активні ліміти не скидаються
      if (this.hits.size > 5000) for (const [k, v] of this.hits) if (now - v.at > 60000) this.hits.delete(k);
      return false;
    }
    return ++h.n > max;
  }

  send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
    const data = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    res.writeHead(status, { ...HEADERS, 'content-type': type, 'content-length': data.length, ...extra });
    res.end(data);
  }

  async handle(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      if (this.limited(`ip:${ip}`, 600)) return this.send(res, 429, { error: 'Too many requests' });
      const route = `${req.method} ${url.pathname}`;
      if (route === 'GET /' || route === 'GET /index.html') return this.send(res, 200, CLIENT_HTML, 'text/html; charset=utf-8', { 'cache-control': 'no-cache' });
      if (route === 'GET /app.css') return this.send(res, 200, CLIENT_CSS, 'text/css; charset=utf-8', { 'cache-control': 'no-cache' });
      if (route === 'GET /app.js') return this.send(res, 200, CLIENT_JS, 'text/javascript; charset=utf-8', { 'cache-control': 'no-cache' });
      if (route === 'GET /logo.jpg') return this.send(res, 200, (this.logo ||= fs.readFileSync(path.join(ASSETS_DIR, 'logo.jpg'))), 'image/jpeg', { 'cache-control': 'max-age=86400' });
      if (route === 'GET /health') return this.send(res, 200, 'ok', 'text/plain');
      if (req.method === 'GET' && url.pathname.startsWith('/a/')) return this.asset(res, url.pathname.slice(3));
      if (req.method === 'GET' && url.pathname.startsWith('/m/')) {
        // Медіа качаються з Telegram — окремий, тугіший ліміт
        if (this.limited(`m:${ip}`, 300)) return this.send(res, 429, { error: 'Too many requests' });
        return await this.media(res, url.pathname.slice(3));
      }
      if (req.method === 'POST' && url.pathname.startsWith('/api/')) return await this.apiCall(req, res, url.pathname.slice(5));
      return this.send(res, 404, { error: 'Not found' });
    } catch (err) {
      if (!(err instanceof MiniError)) { log.warn(`Mini App: ${err.message}`); store.addError?.('miniapp', err); }
      if (!res.headersSent) this.send(res, err.status || 500, { error: err instanceof MiniError ? err.message : 'Ошибка сервера' });
    }
  }

  asset(res, name) {
    if (!/^[a-z_]+\.(webp|svg)$/.test(name)) return this.send(res, 404, { error: 'Not found' });
    this.assets ||= new Map();
    let buf = this.assets.get(name);
    if (!buf) {
      try { buf = fs.readFileSync(path.join(ASSETS_DIR, 'miniapp', name)); } catch { return this.send(res, 404, { error: 'Not found' }); }
      this.assets.set(name, buf);
    }
    return this.send(res, 200, buf, name.endsWith('.svg') ? 'image/svg+xml' : 'image/webp', { 'cache-control': 'public, max-age=604800' });
  }

  async readBody(req) {
    const buf = await this.readStream(req, MAX_BODY, 'Too large');
    let body;
    try { body = JSON.parse(buf.toString('utf8') || '{}'); } catch { throw new MiniError('Bad JSON'); }
    // Обробники чекають об'єкт: null, число чи масив — помилка запиту, а не збій сервера
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new MiniError('Bad JSON');
    return body;
  }

  async apiCall(req, res, name) {
    const auth = verifyInitData(String(req.headers['x-init-data'] || ''), store.data.config.botToken);
    if (!auth) throw new MiniError('Откройте приложение из Telegram заново.', 401);
    const from = auth.user;
    if (store.data.users[String(from.id)]?.studioBlocked) throw new MiniError('Forbidden', 403);
    if (this.limited(`u:${from.id}`, 120)) throw new MiniError('Too many requests', 429);
    if (name === 'upload') return this.upload(req, res, from);
    if (name === 'voice') return this.voice(req, res, from);
    if (name === 'studio/final') return this.studioFinal(req, res, from);
    const body = await this.readBody(req);
    // Студія: власник і дизайнери
    if (name.startsWith('studio/')) {
      const studio = { 'studio/boot': 'boot', 'studio/order': 'order', 'studio/action': 'action', 'studio/finance': 'finance' }[name];
      if (!studio) throw new MiniError('Not found', 404);
      if (studio === 'action' && this.limited(`sa:${from.id}`, 40)) throw new MiniError('Too many requests', 429);
      const result = await this.studio[studio](from, body);
      if (studio === 'action') store.saveNow();
      return this.send(res, 200, result);
    }
    const actions = { boot: 'boot', brief: 'brief', quote: 'quote', sketch: 'sketch', paid: 'paid', cancel: 'cancel', question: 'question', message: 'message', files: 'files', profile: 'profile', draft: 'draft', review: 'review', billing: 'billing', stage: 'stageAnswer', fix: 'fix' };
    // Чернетка — тихий фоновий запит, стан у відповідь не потрібен
    if (name === 'draft') { this.api.draft(from, body); return this.send(res, 200, { ok: true }); }
    if (name === 'seen') return this.send(res, 200, this.api.seen(from, body));
    // ІІ-підказка — відповідь лише з текстом, без стану
    if (name === 'ideas') {
      if (this.limited(`ai:${from.id}`, 6)) throw new MiniError('Too many requests', 429);
      const r = await this.api.ideas(from, body);
      store.save();
      return this.send(res, 200, r);
    }
    if (name === 'airate') {
      if (this.limited(`rate:${from.id}`, 10)) throw new MiniError('Too many requests', 429);
      const { sendAgentEvent } = await import('../genagent.js');
      sendAgentEvent(from.id, body.up ? 'rating_up' : 'rating_down');
      return this.send(res, 200, { ok: true });
    }
    // Чат з ІІ-помічником — відповідь з історією розмови, без повного стану
    if (name === 'consult') {
      if (this.limited(`ai:${from.id}`, 8)) throw new MiniError('Too many requests', 429);
      const r = await this.api.consult(from, body);
      store.saveNow();
      return this.send(res, 200, r);
    }
    if (!Object.hasOwn(actions, name)) throw new MiniError('Not found', 404);
    if (name !== 'boot' && this.limited(`a:${from.id}`, 20)) throw new MiniError('Too many requests', 429);
    const result = await this.api[actions[name]](from, body);
    // Мітка джерела з посилання на Mini App — після boot, коли профіль людини вже створено
    if (name === 'boot') this.api.setSource(from, auth.startParam);
    if (name !== 'boot') store.saveNow();
    const boot = (r) => ({ ...r, studioRole: this.studio.role(from) });
    return this.send(res, 200, name === 'boot' ? boot(result) : { ...result, state: boot(this.api.boot(from)) });
  }

  /**
   * Фото з Mini App (референс клієнта чи ескіз студії). Щоб отримати звичайний file_id Telegram,
   * бот надсилає фото в особистий чат того ж користувача й одразу видаляє повідомлення.
   */
  async upload(req, res, from) {
    if (this.limited(`up:${from.id}`, 30)) throw new MiniError('Слишком много файлов — подождите минуту.', 429);
    const tg = this.runtime.tg;
    if (!tg || !this.runtime.ready) throw new MiniError('Бот перезапускается — попробуйте через минуту.', 503);
    const buf = await this.readStream(req, MAX_UPLOAD, 'Файл больше 12 МБ.');
    const type = sniff(buf);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new MiniError('Можно загрузить только фото (JPG, PNG, WEBP).', 415);
    let msg;
    try {
      msg = await tg.sendFile('sendPhoto', 'photo', from.id, buf, `photo.${type.split('/')[1]}`, type, { disable_notification: true });
    } catch (err) {
      throw new MiniError(err.status === 403 ? 'Сначала запустите бота (/start), затем загрузите фото.' : `Telegram: ${err.description || err.message}`, 502);
    }
    const fileId = msg?.photo?.at(-1)?.file_id;
    await tg.call('deleteMessage', { chat_id: from.id, message_id: msg?.message_id }).catch(() => {});
    if (!fileId) throw new MiniError('Telegram не принял фото.', 502);
    this.remember(JSON.stringify({ k: 'tg', f: fileId }), buf, type);
    return this.send(res, 200, { token: refToken(from.id, fileId), url: mediaUrl({ k: 'tg', f: fileId }) });
  }

  /**
   * Голосове з чату замовлення в Mini App: WebM перепаковуємо в OGG/Opus, бот надсилає голосове
   * в особистий чат клієнта, пересилає студії звичайним шляхом (як повідомлення з чату) і видаляє в клієнта.
   */
  async voice(req, res, from) {
    if (this.limited(`vo:${from.id}`, 6)) throw new MiniError('Забагато голосових — зачекайте хвилину.', 429);
    const tg = this.runtime.tg;
    const h = this.runtime.handlers;
    if (!tg || !h || !this.runtime.ready) throw new MiniError('Бот перезапускается — попробуйте через минуту.', 503);
    const o = store.data.inquiries.find((x) => x.id === Number(req.headers['x-order-id']) && x.userId === from.id);
    if (!o || o.archived) throw new MiniError('Замовлення не знайдено.', 404);
    let buf = await this.readStream(req, 5 * 1024 * 1024, 'Голосове задовге (до 2 хвилин).');
    const kind = audioKind(buf);
    let duration = 0, name, mime;
    if (kind === 'webm') {
      const parsed = parseWebmOpus(buf);
      if (!parsed) throw new MiniError('Не вдалося обробити запис — спробуйте ще раз або надішліть голосове в чаті бота.', 415);
      ({ buffer: buf, duration } = buildOggOpus(parsed));
      [name, mime] = ['voice.ogg', 'audio/ogg'];
    } else if (kind === 'ogg') [name, mime] = ['voice.ogg', 'audio/ogg'];
    else if (kind === 'm4a') [name, mime] = ['voice.m4a', 'audio/mp4'];
    else if (kind === 'mp3') [name, mime] = ['voice.mp3', 'audio/mpeg'];
    else throw new MiniError('Невідомий формат запису.', 415);
    let msg;
    try {
      msg = await tg.sendFile('sendVoice', 'voice', from.id, buf, name, mime, { disable_notification: true, ...(duration ? { duration } : {}) });
    } catch (err) {
      throw new MiniError(err.status === 403 ? 'Спершу запустіть бота (/start), потім надішліть голосове.' : `Telegram: ${err.description || err.message}`, 502);
    }
    try {
      const media = msg?.voice ? { voice: msg.voice } : msg?.audio ? { audio: msg.audio } : null;
      if (!media) throw new MiniError('Telegram не прийняв голосове.', 502);
      h.touchUser(from);
      await h.relayToStudio({ message_id: msg.message_id, from, chat: { id: from.id, type: 'private' }, ...media }, o);
    } finally {
      await tg.call('deleteMessage', { chat_id: from.id, message_id: msg?.message_id }).catch(() => {});
    }
    store.saveNow();
    return this.send(res, 200, { ok: true, state: { ...this.api.boot(from), studioRole: this.studio.role(from) } });
  }

  /** Готовий файл для клієнта зі студії в Mini App (тіло — файл, заголовки x-order-id і x-filename). */
  async studioFinal(req, res, from) {
    const s = this.studio.need(from);
    if (this.limited(`sf:${from.id}`, 20)) throw new MiniError('Too many requests', 429);
    const id = Number(req.headers['x-order-id']);
    const o = store.data.inquiries.find((x) => x.id === id);
    if (!o || o.archived) throw new MiniError('Заявка не найдена.', 404);
    if (s.role === 'designer' && o.assignee !== s.memberId) throw new MiniError('Эта заявка вам не назначена.', 403);
    const buf = await this.readStream(req, 45 * 1024 * 1024, 'Файл больше 45 МБ — отправьте ссылкой.');
    let name = 'file';
    try { name = decodeURIComponent(String(req.headers['x-filename'] || 'file')); } catch { /* лишаємо file */ }
    try {
      await this.runtime.handlers.deliverFinalFile(o, buf, name, String(req.headers['content-type'] || ''), s.role === 'designer' ? s.name : 'Telegram');
    } catch (err) {
      throw new MiniError(err.status === 403 ? 'Клиент заблокировал бота — файл не доставлен.' : `Не доставлено: ${err.description || err.message}`, 502);
    }
    return this.send(res, 200, { ok: true, order: await this.studio.order(from, { id }), state: this.studio.boot(from) });
  }

  remember(key, buf, type) {
    if (buf.length > 8 * 1024 * 1024) return;
    this.cache.set(key, { buf, type });
    this.cacheSize += buf.length;
    for (const [k, v] of this.cache) {
      if (this.cacheSize <= CACHE_LIMIT) break;
      this.cache.delete(k);
      this.cacheSize -= v.buf.length;
    }
  }

  async stickerSet(name) {
    const hit = this.sets.get(name);
    if (hit && Date.now() - hit.at < SET_TTL) return hit.set;
    const set = await this.runtime.tg.call('getStickerSet', { name });
    this.sets.set(name, { at: Date.now(), set });
    return set;
  }

  async media(res, token) {
    const ref = readMediaToken(token);
    if (!ref) return this.send(res, 404, { error: 'Not found' });
    const key = JSON.stringify(ref);
    let item = this.cache.get(key);
    if (ref.k === 'docpdf') {
      // Рахунок або акт PDF — лише для власного замовлення й поки власник це дозволяє
      const o = store.data.inquiries.find((x) => x.id === Number(ref.o) && x.userId === Number(ref.u));
      const c = store.data.config.company || {};
      if (!o || !c.clientDocs || !c.name || (ref.d === 'act' && o.status !== 'done')) return this.send(res, 404, { error: 'Not found' });
      const { orderDoc } = await import('../admin/server.js');
      let doc;
      try { doc = orderDoc(o, ref.d === 'act' ? 'act' : 'invoice'); } catch { return this.send(res, 404, { error: 'Not available' }); }
      return this.send(res, 200, doc.pdf, 'application/pdf', { 'content-disposition': `attachment; filename="${doc.name}"`, 'cache-control': 'no-store' });
    }
    if (ref.k === 'doc') {
      // Готовий файл для клієнта — віддаємо на завантаження з іменем файлу
      if (!this.runtime.tg || !this.runtime.ready) return this.send(res, 503, { error: 'Try later' });
      const buf = await this.download(key, () => this.runtime.tg.download(ref.f)).catch(() => null);
      if (!buf) return this.send(res, 404, { error: 'Not found' });
      const name = String(ref.n || 'file').replace(/[^\w.\- ()\u0400-\u04ff]+/g, '_').slice(0, 120);
      return this.send(res, 200, buf, sniff(buf) || 'application/octet-stream', {
        'content-disposition': `attachment; filename="file${path.extname(name).slice(0, 10)}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        'cache-control': 'private, max-age=3600',
      });
    }
    if (!item) {
      let buf = null;
      if (ref.k === 'up') {
        try { buf = readUpload(ref.u).buffer; } catch { buf = null; }
      } else if (this.runtime.tg && this.runtime.ready) {
        let fileId = ref.f;
        // Анімовані стікери (.tgs) браузер не покаже — беремо їхню мініатюру
        if (ref.k === 'st' && (ref.fmt === 'animated' || ref.fmt === 'thumb')) {
          const set = await this.stickerSet(ref.s).catch(() => null);
          const st = set?.stickers?.find((x) => x.file_id === ref.f) || set?.stickers?.[0];
          fileId = st?.thumbnail?.file_id || null;
        }
        if (fileId) buf = await this.download(key, () => this.runtime.tg.download(fileId)).catch(() => null);
      }
      if (!buf) return this.send(res, 404, { error: 'Not found' });
      item = { buf, type: sniff(buf) || 'application/octet-stream' };
      this.remember(key, item.buf, item.type);
    }
    return this.send(res, 200, item.buf, item.type, { 'cache-control': 'private, max-age=86400' });
  }
}
