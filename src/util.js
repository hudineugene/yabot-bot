import crypto from 'node:crypto';
import { TIME_ZONE } from './config.js';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Обрізає довгий текст до n символів з «…» (повідомлення Telegram — не більше 4096). */
export function clip(text, n) {
  const s = String(text ?? '');
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

/** 08.10.2026 16:20 за київським часом. */
export function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso ?? '');
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('uk-UA', {
      timeZone: TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d).map((p) => [p.type, p.value]),
  );
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}`;
}

export function kyivHour(date = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(date));
}

/** 2026-10-20 → 20.10.2026 */
export function dateText(key) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(key || '')) ? key.split('-').reverse().join('.') : '';
}

/** Дата у форматі 2026-10-08 за київським часом. */
export function todayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date);
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: crypto.scryptSync(password, salt, 64).toString('hex') };
}

export function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false;
  const actual = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Чи зараз робочий час студії (за Києвом). hours = { enabled, days:[1..7, Пн=1], from:'10:00', to:'19:00' }. */
export function isWorkingTime(hours, date = new Date()) {
  if (!hours?.enabled) return true;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  const day = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[parts.weekday];
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
  const from = toMin(hours.from);
  const to = toMin(hours.to);
  if (!hours.days?.includes(day)) return false;
  return from <= to ? minutes >= from && minutes < to : minutes >= from || minutes < to; // інтервал через північ
}

/** Номер замовлення для людей: 1 → «0001». */
export function orderNo(id) {
  return String(id).padStart(4, '0');
}

/** Форма слова за числом: plural(24, ['стікер', 'стікери', 'стікерів']) → «стікери». */
export function plural(n, [one, few, many]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export const TOKEN_PATTERN = /^\d{5,15}:[A-Za-z0-9_-]{30,64}$/;
