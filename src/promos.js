// Промокоди: знижка у відсотках, термін дії, ліміт використань. config.promos = [{ code, percent, until, maxUses, uses, active, note, createdAt }]
import { store } from './store.js';
import { todayKey } from './util.js';
import { validDate } from './orders.js';

export class PromoError extends Error {}

const CODE_RE = /^[A-Z0-9_-]{3,20}$/;

export function promoList() {
  return (store.data.config.promos ||= []);
}

export const normCode = (code) => String(code || '').trim().toUpperCase();

/** Чинний промокод або null (немає, вимкнений, закінчився термін чи ліміт, персональний для іншої людини). */
export function findPromo(code, userId = null) {
  const c = normCode(code);
  const p = promoList().find((x) => x.code === c);
  if (!p || !p.active) return null;
  if (p.userId && String(p.userId) !== String(userId)) return null;
  if (p.until && p.until < todayKey()) return null;
  if (p.maxUses && (p.uses || 0) >= p.maxUses) return null;
  return p;
}

/** Зарахувати використання (при відправці заявки). */
export function usePromo(code) {
  const p = promoList().find((x) => x.code === normCode(code));
  if (p) p.uses = (p.uses || 0) + 1;
}

export function savePromo(input) {
  const code = normCode(input.code);
  if (!CODE_RE.test(code)) throw new PromoError('Код — 3–20 символов: латинские буквы, цифры, «_» или «-».');
  const percent = Math.round(Number(input.percent));
  if (!(percent >= 1 && percent <= 90)) throw new PromoError('Скидка — от 1 до 90%.');
  const until = input.until ? String(input.until) : '';
  if (until && !validDate(until)) throw new PromoError('Неверная дата окончания.');
  const maxUses = input.maxUses ? Math.max(1, Math.round(Number(input.maxUses))) : null;
  const list = promoList();
  const existing = list.find((x) => x.code === code);
  const data = { code, percent, until, maxUses, note: String(input.note || '').trim().slice(0, 100), active: input.active !== false };
  if (existing) Object.assign(existing, data);
  else list.push({ ...data, uses: 0, createdAt: new Date().toISOString() });
  store.saveNow();
  return list;
}

export function deletePromo(code) {
  store.data.config.promos = promoList().filter((x) => x.code !== normCode(code));
  store.saveNow();
  return store.data.config.promos;
}
