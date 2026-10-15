// Пропозиція супроводу після запуску бота: через N днів після «Готово» клієнту — «Як працює бот?»
// з кнопками «Хочу обговорити» (створює заявку-консультацію) / «Все чудово».
import { store } from './store.js';

export const SUPPORT_DEFAULTS = { enabled: false, days: 30, message: '', messageEn: '' };

export function supportSettings() {
  const c = store.data.config;
  c.supportOffer = { ...SUPPORT_DEFAULTS, ...(c.supportOffer || {}) };
  return c.supportOffer;
}

export function supportView() {
  const st = store.data.stats.supportOffer || {};
  return { ...supportSettings(), stats: { sent: st.sent || 0, yes: st.yes || 0, no: st.no || 0 } };
}

export function saveSupport(body) {
  const days = Math.round(Number(body.days));
  if (!(days >= 7 && days <= 365)) throw new Error('Через сколько дней — от 7 до 365.');
  const s = supportSettings();
  Object.assign(s, {
    enabled: Boolean(body.enabled), days,
    message: String(body.message || '').trim().slice(0, 800),
    messageEn: String(body.messageEn || '').trim().slice(0, 800),
  });
  store.saveNow();
  return supportView();
}
