// Правка після здачі: N днів після «Готово» клієнт може попросити правку (текст + фото) у Mini App.
// Статус замовлення лишається «Готово» (фінанси не змінюються), а в замовлення додається відкрита правка.
import { store } from './store.js';

export const FIX_DEFAULTS = { enabled: true, days: 14, max: 3 };

export function fixSettings() {
  const c = store.data.config;
  c.fixes = { ...FIX_DEFAULTS, ...(c.fixes || {}) };
  return c.fixes;
}

export function saveFixSettings(body) {
  const days = Math.round(Number(body.days));
  if (!(days >= 1 && days <= 90)) throw new Error('Сколько дней после «Готово» — от 1 до 90.');
  Object.assign(fixSettings(), { enabled: Boolean(body.enabled), days });
  store.saveNow();
  return fixSettings();
}

export const openFix = (o) => (o.fixes || []).find((f) => f.status === 'open') || null;

/** Чи може клієнт зараз попросити правку (і до якої дати). */
export function fixAllowed(o) {
  const s = fixSettings();
  if (!s.enabled || o.status !== 'done' || !o.doneAt || openFix(o)) return null;
  if ((o.fixes || []).length >= s.max) return null;
  const until = Date.parse(o.doneAt) + s.days * 86400000;
  return Date.now() < until ? new Date(until).toISOString() : null;
}
