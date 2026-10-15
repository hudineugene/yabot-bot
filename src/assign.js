// Автоматичний розподіл нових заявок між дизайнерами: по черзі або тому, у кого менше відкритих заявок.
// Дизайнер бере лише свої послуги (member.services; порожньо — усі). Потрібен Telegram ID, щоб отримати картку.
import { store } from './store.js';
import { team, isOpen } from './orders.js';

export const ASSIGN_DEFAULTS = { mode: 'off', last: null };

export function assignSettings() {
  const c = store.data.config;
  c.autoAssign = { ...ASSIGN_DEFAULTS, ...(c.autoAssign || {}) };
  if (!['off', 'round', 'least'].includes(c.autoAssign.mode)) c.autoAssign.mode = 'off';
  return c.autoAssign;
}

export function saveAssign(body) {
  const s = assignSettings();
  s.mode = ['off', 'round', 'least'].includes(body.mode) ? body.mode : 'off';
  store.saveNow();
  return { mode: s.mode };
}

/** Кому віддати заявку (або null). Нічого не змінює. */
export function pickDesigner(order) {
  const s = assignSettings();
  if (s.mode === 'off') return null;
  const svc = order.service || 'stickers';
  const cand = team().filter((m) => m.active !== false && m.telegramId && (!m.services?.length || m.services.includes(svc)));
  if (!cand.length) return null;
  // Черга починається з наступного після останнього призначеного
  const start = Math.max(0, cand.findIndex((m) => m.id === s.last) + 1);
  const ordered = [...cand.slice(start), ...cand.slice(0, start)];
  if (s.mode === 'round') return ordered[0];
  const load = (m) => store.data.inquiries.filter((o) => o.assignee === m.id && isOpen(o)).length;
  return ordered.reduce((best, m) => (load(m) < load(best) ? m : best), ordered[0]);
}
