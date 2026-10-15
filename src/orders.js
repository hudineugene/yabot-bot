// Спільні правила для заявок: відкриті/закриті, гроші (ціна, оплачено, залишок), терміни, етап на дошці, команда.
import { store } from './store.js';
import { todayKey, dateText } from './util.js';

const DAY = 24 * 60 * 60 * 1000;

export const OPEN = new Set(['new', 'in_progress']);
export const CLOSED = new Set(['done', 'rejected', 'cancelled']);
export const isOpen = (o) => OPEN.has(o.status);

// --- Гроші ---

/** Погоджена ціна в гривнях: число з кошторису або перше число з поля «Согласованная цена». */
export function orderAmount(o) {
  if (Number(o.studio?.amount) > 0) return Number(o.studio.amount);
  const text = String(o.studio?.price || '').replace(/\s/g, '');
  const n = Number((text.match(/\d+(?:[.,]\d+)?/) || [''])[0].replace(',', '.'));
  return n > 0 ? n : 0;
}

export const isPaid = (p) => p.status === 'success' || p.status === 'manual';
export const paidValue = (p) => p.finalAmount || p.amount;

/** Скільки клієнт уже заплатив за заявку. */
export function paidTotal(o) {
  return Math.round((o.payments || []).filter(isPaid).reduce((s, p) => s + paidValue(p), 0) * 100) / 100;
}

/** Залишок до оплати (0, якщо ціни немає або все сплачено). */
export function remaining(o) {
  const price = orderAmount(o);
  return price > 0 ? Math.max(0, Math.round((price - paidTotal(o)) * 100) / 100) : 0;
}

// --- Терміни ---

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const validDate = (v) => DATE_RE.test(String(v || '')) && !Number.isNaN(Date.parse(v));

export { dateText };

export const tomorrowKey = () => todayKey(new Date(Date.now() + DAY));

/** Стан терміну відкритої заявки: overdue / today / tomorrow / null. */
export function dueState(o) {
  const due = o.studio?.due;
  if (!isOpen(o) || !validDate(due)) return null;
  const today = todayKey();
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  if (due === tomorrowKey()) return 'tomorrow';
  return null;
}

// --- Етап на дошці ---

export const STAGES = ['new', 'in_progress', 'sketches', 'final', 'done'];

/** Колонка дошки: нові → в роботі → ескізи → фінал → готово. */
export function stageOf(o) {
  if (o.status === 'new') return 'new';
  if (o.status === 'done') return 'done';
  if (o.status !== 'in_progress') return null;
  if (['sketches', 'final'].includes(o.pipelineStage)) return o.pipelineStage;
  if (o.pipelineStage === 'in_progress' && o.stageManual) return 'in_progress';
  const s = o.sketches?.at(-1);
  if (s?.status === 'approved') return 'final';
  if (s) return 'sketches';
  return 'in_progress';
}

// --- Команда ---

export function team() {
  return (store.data.config.team ||= []);
}

export function memberById(id) {
  return id ? team().find((m) => m.id === id) || null : null;
}

/** Активний дизайнер, якому належить цей Telegram-чат. */
export function memberByChat(chatId) {
  return team().find((m) => m.active && m.telegramId && String(m.telegramId) === String(chatId)) || null;
}

/** Дизайнер заявки (якщо призначено й активний). */
export function assigneeOf(o) {
  const m = memberById(o.assignee);
  return m && m.active ? m : null;
}
