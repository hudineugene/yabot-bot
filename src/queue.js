// Орієнтовний старт нового проєкту: показуємо клієнту в заявці Mini App.
// auto — з кількості відкритих заявок, скільки проєктів студія веде одночасно й скільки днів у середньому триває проєкт;
// manual — власник сам вказує «почнемо приблизно через N днів»; off — не показуємо.
import { store } from './store.js';

export const QUEUE_DEFAULTS = { mode: 'off', parallel: 3, avgDays: 7, days: 3 };

export function queueSettings() {
  const c = store.data.config;
  c.queue = { ...QUEUE_DEFAULTS, ...(c.queue || {}) };
  return c.queue;
}

/** { open, days } — скільки відкритих заявок і через скільки днів орієнтовно старт; null — вимкнено. */
export function queueEstimate() {
  const q = queueSettings();
  if (q.mode !== 'auto' && q.mode !== 'manual') return null;
  const open = store.data.inquiries.filter((o) => o.status === 'new' || o.status === 'in_progress').length;
  if (q.mode === 'manual') return { open, days: Math.max(0, Number(q.days) || 0), manual: true };
  const parallel = Math.max(1, Number(q.parallel) || 1);
  const ahead = Math.max(0, open - parallel + 1); // скільки заявок мають звільнити місце
  const days = ahead ? Math.ceil((ahead / parallel) * Math.max(1, Number(q.avgDays) || 1)) : 0;
  return { open, days, manual: false };
}

export function saveQueue(body) {
  const q = queueSettings();
  q.mode = ['off', 'auto', 'manual'].includes(body.mode) ? body.mode : 'off';
  q.parallel = Math.min(50, Math.max(1, Math.round(Number(body.parallel) || 3)));
  q.avgDays = Math.min(180, Math.max(1, Math.round(Number(body.avgDays) || 7)));
  q.days = Math.min(180, Math.max(0, Math.round(Number(body.days) || 0)));
  store.saveNow();
  return q;
}
