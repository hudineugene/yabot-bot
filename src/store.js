// Дані бота в одному JSON-файлі (BOT_DATA_FILE). Формат сумісний з панеллю YABOT:
// config.botToken, users{}, inquiries[], stats, errors[], bot.username.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_FILE, DATA_DIR, BACKUP_DIR } from './config.js';
import { todayKey } from './util.js';
import { log } from './log.js';

const DAILY_KEEP = 14;
const MAX_ERRORS = 100;
const ARCHIVE_FILE = path.join(DATA_DIR, 'archive.json');
// Що прибираємо з основного файлу в архівованих заявках (повна версія лежить в archive.json)
const HEAVY_KEYS = ['messages', 'history', 'sketches', 'refs', 'emotions', 'quotes', 'dueAlerts', 'checklist', 'cardNote', 'adminMessage', 'designerMessage', 'billing',
  // нові поля 3.7–4.1: журнал, етапи, правки — повна версія лишається в архіві
  'audit', 'auditSnap', 'stageInfo', 'fixes', 'replyAlert', 'voices', 'payRemind', 'exampled'];

function skeleton() {
  return {
    format: 1,
    config: {
      botToken: null,
      passwordSalt: null,
      passwordHash: null,
      adminChatId: null,
      active: true,
      prices: { static: {}, animated: {}, note: '' },
      workHours: { enabled: false, days: [1, 2, 3, 4, 5], from: '10:00', to: '19:00', message: '' },
      referral: { enabled: false, percent: 10 },
      channels: [],
      channelSignature: '',
      // Оплата авансу через monobank — вимкнена, доки власник не ввімкне на сторінці бота
      payments: {
        enabled: false, token: '', mode: 'percent', percent: 50, fixed: 1000, validityHours: 24,
        destination: 'Аванс за стікерпак, замовлення #{номер}', autoStart: true,
      },
      // ІІ-помічник (Claude API): працює лише з ключем
      ai: { key: '', model: 'claude-opus-5-5', briefIdeas: true, channelWriter: true },
      // ІІ-агент студії (GenAgent): бот надсилає йому ціни, послуги й FAQ
      genagent: { url: '', key: '', enabled: false, comments: false, chat: false, lastSyncAt: null, lastError: '', lastHash: '', commentsError: '', chatError: '' },
      // Англійська версія для клієнтів з неукраїнським/неросійським інтерфейсом Telegram
      english: true,
      // Ранкова зведення власнику в Telegram і сповіщення про збої
      digest: { enabled: true, hour: 9 },
      alerts: { enabled: true },
      // Архів: закриті заявки старші N днів — повні дані в archive.json, у робочому файлі лише головне
      archive: { enabled: true, days: 180 },
      // Режим відпустки: до якої дати, чи приймати заявки, свій текст
      vacation: { enabled: false, until: '', acceptOrders: true, message: '' },
      promos: [],
      team: [],
    },
    channelPosts: [],
    channelQueue: [],
    channelTemplates: [],
    broadcasts: [],
    bot: {},
    stats: { messagesReceived: 0, messagesSent: 0, startedAt: null, lastUpdateAt: null },
    telegramOffset: 0,
    nextOrderId: 1,
    users: {},
    inquiries: [],
    catalog: [],
    drafts: {},
    media: {},
    errors: [],
  };
}

/** Доповнює файл відсутніми полями (наприклад, якщо панель заздалегідь записала лише токен). */
function normalize(data) {
  const base = skeleton();
  const out = { ...base, ...data };
  out.config = { ...base.config, ...(data.config || {}) };
  out.config.prices = { ...base.config.prices, ...(out.config.prices || {}) };
  out.config.workHours = { ...base.config.workHours, ...(out.config.workHours || {}) };
  out.config.referral = { ...base.config.referral, ...(out.config.referral || {}) };
  out.config.payments = { ...base.config.payments, ...(out.config.payments || {}) };
  out.config.ai = { ...base.config.ai, ...(out.config.ai || {}) };
  out.config.genagent = { ...base.config.genagent, ...(out.config.genagent || {}) };
  for (const key of ['digest', 'alerts', 'vacation', 'archive']) out.config[key] = { ...base.config[key], ...(out.config[key] || {}) };
  for (const key of ['promos', 'team']) if (!Array.isArray(out.config[key])) out.config[key] = [];
  out.stats = { ...base.stats, ...(data.stats || {}) };
  for (const key of ['users', 'drafts', 'media', 'bot', 'relay']) if (!out[key] || typeof out[key] !== 'object') out[key] = {};
  for (const key of ['inquiries', 'errors', 'catalog', 'broadcasts', 'channelPosts', 'channelQueue', 'channelTemplates']) if (!Array.isArray(out[key])) out[key] = [];
  if (!Array.isArray(out.config.channels)) out.config.channels = [];
  if (!Number.isInteger(out.nextOrderId) || out.nextOrderId < 1) {
    out.nextOrderId = out.inquiries.reduce((m, o) => Math.max(m, o.id || 0), 0) + 1;
  }
  return out;
}

export const store = {
  data: skeleton(),
  saveTimer: null,

  load() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      this.data = skeleton();
      this.saveNow();
      return;
    }
    try {
      this.data = normalize(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
    } catch (err) {
      const broken = `${DATA_FILE}.corrupt-${Date.now()}`;
      fs.copyFileSync(DATA_FILE, broken);
      log.error(`Файл даних пошкоджено (${err.message}). Копія: ${broken}. Пробую резервну копію.`);
      this.data = normalize(this.latestBackup() || {});
      this.saveNow();
    }
  },

  latestBackup() {
    const dir = path.join(BACKUP_DIR, 'daily');
    try {
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().reverse();
      for (const f of files) {
        try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { /* наступна */ }
      }
    } catch { /* немає копій */ }
    return null;
  },

  /** Збереження з невеликою затримкою, щоб пачка оновлень писалася одним разом. */
  save() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => { this.saveTimer = null; this.saveNow(); }, 300);
  },

  saveNow() {
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    const tmp = `${DATA_FILE}.tmp`;
    const started = Date.now();
    // Без відступів: файл на третину менший і швидше пишеться (читається так само)
    fs.writeFileSync(tmp, JSON.stringify(this.data), { mode: 0o600 });
    fs.renameSync(tmp, DATA_FILE);
    this.lastSaveMs = Date.now() - started;
  },

  /** Щоденна копія даних (зберігаємо останні 14 днів). */
  dailyBackup() {
    try {
      const dir = path.join(BACKUP_DIR, 'daily');
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `bot-data-${todayKey()}.json`);
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(this.data), { mode: 0o600 });
        log.info(`Резервна копія: ${path.basename(file)}`);
        // Раз на день — перенести старі закриті заявки в архів
        if (this.data.config.archive?.enabled !== false) {
          const { archived } = this.archiveOld();
          if (archived) log.info(`В архив перенесено заявок: ${archived}`);
        }
      }
      const old = fs.readdirSync(dir).filter((f) => /^bot-data-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
      for (const f of old.slice(0, Math.max(0, old.length - DAILY_KEEP))) fs.unlinkSync(path.join(dir, f));
    } catch (err) {
      this.addError('backup', err);
    }
  },

  /**
   * Очищення історії замовлень (наприклад, перед запуском після налаштування).
   * Спершу — повна копія даних у backups/pre-clear-*.json; нумерація знову з 0001.
   */
  clearHistory({ stats = false, clients = false, drafts = false } = {}) {
    const d = this.data;
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const backup = path.join(BACKUP_DIR, `pre-clear-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backup, JSON.stringify(d), { mode: 0o600 });

    // Архів заявок теж переносимо в резервні копії — нумерація почнеться заново
    if (fs.existsSync(ARCHIVE_FILE)) fs.renameSync(ARCHIVE_FILE, path.join(BACKUP_DIR, `pre-clear-archive-${new Date().toISOString().replace(/[:.]/g, '-')}.json`));
    const removed = { orders: d.inquiries.length, clients: clients ? Object.keys(d.users).length : 0, drafts: drafts ? Object.keys(d.drafts).length : 0 };
    d.inquiries = [];
    d.relay = {};
    d.sketchSession = null;
    d.sketchSessions = {};
    d.packSession = null;
    d.paySession = null;
    d.revisionWaits = {};
    d.reviewWaits = {};
    d.nextOrderId = 1;
    // Нова мітка історії: кнопки старих карток у Telegram більше не спрацюють
    d.orderEpoch = crypto.randomBytes(2).toString('hex');
    if (stats) {
      Object.assign(d.stats, { daily: {}, funnel: {}, remindersSent: 0, remindersResumed: 0 });
    }
    if (clients) d.users = {};
    if (drafts) d.drafts = {};
    d.historyClearedAt = new Date().toISOString();
    this.saveNow();
    return { backup: path.basename(backup), removed };
  },

  /**
   * Відновлення з резервної копії. Токен бота, пароль сторінки й отримувач заявок лишаються поточними,
   * щоб не втратити доступ. Поточні дані спершу зберігаються в backups/pre-restore-*.json.
   */
  restore(raw) {
    if (!raw || typeof raw !== 'object' || !raw.config || !Array.isArray(raw.inquiries) || typeof raw.users !== 'object') {
      throw new Error('Это не резервная копия бота YABOT.');
    }
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backup = path.join(BACKUP_DIR, `pre-restore-${stamp}.json`);
    fs.writeFileSync(backup, JSON.stringify(this.data), { mode: 0o600 });
    // Копія з Telegram несе архів заявок і не містить секретів
    const archive = Array.isArray(raw.archive) ? raw.archive : null;
    raw = { ...raw };
    delete raw.archive;
    delete raw.backupMeta;
    const c = this.data.config;
    const payToken = c.payments?.token || '';
    const aiKeyNow = c.ai?.key || '';
    // Доступи лишаються поточними: токен, пароль, отримувач, вхід з кодом і команда дизайнерів
    const keep = { botToken: c.botToken, passwordSalt: c.passwordSalt, passwordHash: c.passwordHash, adminChatId: c.adminChatId, twoFactor: c.twoFactor, team: c.team };
    const offset = this.data.telegramOffset;
    const bot = this.data.bot;
    this.data = normalize(raw);
    Object.assign(this.data.config, keep);
    if (!this.data.config.payments.token) this.data.config.payments.token = payToken;
    if (!this.data.config.ai.key) this.data.config.ai.key = aiKeyNow;
    if (archive) {
      if (fs.existsSync(ARCHIVE_FILE)) fs.copyFileSync(ARCHIVE_FILE, path.join(BACKUP_DIR, `pre-restore-archive-${stamp}.json`));
      fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive), { mode: 0o600 });
    }
    this.data.telegramOffset = offset;
    this.data.bot = bot;
    // Сесії збору ескізів/пака/рахунку з копії вже неактуальні
    this.data.sketchSession = null;
    this.data.sketchSessions = {};
    this.data.packSession = null;
    this.data.paySession = null;
    this.saveNow();
    return { backup: path.basename(backup), orders: this.data.inquiries.length, clients: Object.keys(this.data.users).length };
  },

  /** Копія для Telegram: без токенів і паролів, разом з архівом заявок. */
  telegramBackup() {
    const d = JSON.parse(JSON.stringify(this.data));
    const c = d.config;
    for (const k of ['botToken', 'passwordSalt', 'passwordHash', 'twoFactor']) delete c[k];
    if (c.payments) c.payments.token = '';
    if (c.ai) c.ai.key = '';
    c.team = (c.team || []).map(({ passwordSalt, passwordHash, ...m }) => m);
    d.telegramOffset = null;
    d.archive = this.readArchive();
    d.backupMeta = { at: new Date().toISOString(), kind: 'telegram', noSecrets: true };
    return Buffer.from(JSON.stringify(d));
  },

  /** Резервні копії на сервері: щоденні й ті, що зроблено перед очищенням/відновленням. */
  backups() {
    const list = [];
    const add = (dir, kind) => {
      try {
        for (const name of fs.readdirSync(dir)) {
          if (!name.endsWith('.json')) continue;
          const st = fs.statSync(path.join(dir, name));
          list.push({ name, kind, size: st.size, at: st.mtime.toISOString() });
        }
      } catch { /* папки ще немає */ }
    };
    add(path.join(BACKUP_DIR, 'daily'), 'daily');
    add(BACKUP_DIR, 'manual');
    return list.sort((a, b) => b.at.localeCompare(a.at));
  },

  backupPath(name) {
    if (!/^[\w.-]+\.json$/.test(String(name))) return null;
    for (const dir of [path.join(BACKUP_DIR, 'daily'), BACKUP_DIR]) {
      const file = path.join(dir, name);
      if (fs.existsSync(file)) return file;
    }
    return null;
  },

  // --- Архів заявок ---

  readArchive() {
    try { return JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8')); } catch { return []; }
  },

  /** Повна версія архівованої заявки (з перепискою, історією, ескізами) або null. */
  archivedFull(id) {
    return this.readArchive().find((o) => o.id === id && o.archiveEpoch === (this.data.orderEpoch || null)) || null;
  },

  /**
   * Переносить закриті заявки, завершені понад days днів тому, в archive.json.
   * У робочому файлі заявка лишається «легкою» (без переписки, історії, ескізів) —
   * тож фінанси, клієнти, «Мої замовлення» й «Доповнити пак» працюють як раніше.
   */
  archiveOld(days = this.data.config.archive?.days || 180) {
    const limit = Date.now() - days * 86400000;
    const candidates = this.data.inquiries.filter((o) => !o.archived && ['done', 'rejected', 'cancelled'].includes(o.status)
      && o.doneAt && Date.parse(o.doneAt) < limit);
    if (!candidates.length) return { archived: 0 };
    const archive = this.readArchive();
    const epoch = this.data.orderEpoch || null;
    for (const o of candidates) archive.push({ ...JSON.parse(JSON.stringify(o)), archiveEpoch: epoch });
    const tmp = `${ARCHIVE_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(archive), { mode: 0o600 });
    fs.renameSync(tmp, ARCHIVE_FILE);
    const at = new Date().toISOString();
    for (const o of candidates) {
      for (const key of HEAVY_KEYS) delete o[key];
      o.archived = at;
    }
    this.data.archivedAt = at;
    this.saveNow();
    return { archived: candidates.length };
  },

  archiveInfo() {
    let archiveSize = 0;
    let dataSize = 0;
    try { archiveSize = fs.statSync(ARCHIVE_FILE).size; } catch { /* немає */ }
    try { dataSize = fs.statSync(DATA_FILE).size; } catch { /* немає */ }
    return { archived: this.data.inquiries.filter((o) => o.archived).length, archiveSize, dataSize, lastAt: this.data.archivedAt || null };
  },

  addError(area, err) {
    const message = String(err?.message || err).slice(0, 500);
    this.data.errors.unshift({
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      area,
      message,
      ...(err?.code ? { code: String(err.code) } : {}),
      createdAt: new Date().toISOString(),
    });
    this.data.errors.length = Math.min(this.data.errors.length, MAX_ERRORS);
    this.save();
  },

  get configured() {
    const c = this.data.config;
    return Boolean(c.botToken && c.passwordHash && c.passwordSalt);
  },
};
