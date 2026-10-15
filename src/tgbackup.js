// Резервна копія в Telegram: раз на день або на тиждень бот надсилає власнику файл із даними.
// У файлі немає токенів і паролів (доступи при відновленні лишаються поточними), зате є архів заявок.
import { store } from './store.js';
import { log } from './log.js';
import { kyivHour, todayKey } from './util.js';

export const TG_BACKUP_DEFAULTS = { enabled: true, every: 'week' };
const MAX_SIZE = 45 * 1024 * 1024; // Telegram приймає документи до 50 МБ
const SEND_FROM_HOUR = 9;
const SEND_TO_HOUR = 22;

export function tgBackupSettings() {
  const c = store.data.config;
  c.tgBackup = { ...TG_BACKUP_DEFAULTS, ...(c.tgBackup || {}) };
  if (!['day', 'week'].includes(c.tgBackup.every)) c.tgBackup.every = 'week';
  return c.tgBackup;
}

export function tgBackupView() {
  const s = tgBackupSettings();
  const st = store.data.stats;
  return { enabled: Boolean(s.enabled), every: s.every, lastAt: st.tgBackupAt || null, lastSize: st.tgBackupSize || 0, lastError: st.tgBackupError || '' };
}

/** Чи час надсилати автоматичну копію (вдень, не частіше, ніж обрано). */
function due() {
  const s = tgBackupSettings();
  if (!s.enabled) return false;
  const hour = kyivHour();
  if (hour < SEND_FROM_HOUR || hour >= SEND_TO_HOUR) return false;
  const last = Date.parse(store.data.stats.tgBackupAt || '') || 0;
  const gap = s.every === 'day' ? 20 * 3600 * 1000 : 6.5 * 24 * 3600 * 1000;
  return Date.now() - last >= gap;
}

/**
 * Надіслати копію власнику. force — кнопка «Отправить сейчас» (без перевірки розкладу).
 * Повертає { size } або null, якщо не час.
 */
export async function sendTelegramBackup(tg, { force = false } = {}) {
  if (!force && !due()) return null;
  const chatId = store.data.config.adminChatId;
  if (!tg || !chatId) throw new Error('Не задан получатель заявок — копию некому отправить.');
  const st = store.data.stats;
  const buf = store.telegramBackup();
  if (buf.length > MAX_SIZE) {
    st.tgBackupError = `Копия ${Math.round(buf.length / 1048576)} МБ — больше лимита Telegram, скачайте её на странице.`;
    st.tgBackupAt = new Date().toISOString(); // не пробуємо щогодини
    store.save();
    log.warn(st.tgBackupError);
    return null;
  }
  const d = store.data;
  const caption = '💾 <b>Резервна копія даних YABOT</b>\n' +
    `Заявок: ${d.inquiries.length}, клієнтів: ${Object.keys(d.users).length}.\n\n` +
    'Без токенів і паролів. Відновити: сторінка бота → «Настройки» → «Резервные копии» → «Восстановить».';
  try {
    await tg.sendFile('sendDocument', 'document', chatId, buf, `YABOT_backup_${todayKey()}.json`, 'application/json',
      { caption, parse_mode: 'HTML', disable_notification: true });
  } catch (err) {
    st.tgBackupError = `Telegram: ${err.description || err.message}`;
    store.save();
    throw err;
  }
  st.tgBackupAt = new Date().toISOString();
  st.tgBackupSize = buf.length;
  st.tgBackupError = '';
  store.save();
  log.info(`Резервная копия отправлена в Telegram (${Math.round(buf.length / 1024)} КБ)`);
  return { size: buf.length };
}
