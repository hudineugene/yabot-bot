// Мова клієнта: українська (за замовчуванням) або англійська для іноземних клієнтів.
// Мову визначаємо з налаштувань Telegram при першому візиті; клієнт може перемкнути кнопкою чи /language.
import { store } from './store.js';
import * as UK from './texts.js';
import * as EN_ONLY from './texts_en.js';

const EN = { ...UK, ...EN_ONLY };

/** Мови, носіям яких зручніше українська версія. */
const UK_CODES = new Set(['uk', 'ru', 'be']);

export function englishEnabled() {
  return store.data.config.english !== false;
}

/** Мова за language_code з Telegram (наприклад 'en', 'de', 'uk', 'ru'). */
export function detectLang(code) {
  if (!code || !englishEnabled()) return 'uk';
  return UK_CODES.has(String(code).slice(0, 2).toLowerCase()) ? 'uk' : 'en';
}

export function langOf(userId) {
  if (!englishEnabled()) return 'uk';
  return store.data.users[String(userId)]?.lang === 'en' ? 'en' : 'uk';
}

/** Тексти для мови або для клієнта (id). */
export function textsFor(langOrUserId) {
  const lang = langOrUserId === 'en' || langOrUserId === 'uk' ? langOrUserId : langOf(langOrUserId);
  return lang === 'en' && englishEnabled() ? EN : UK;
}

/** Чи це текст кнопки меню (будь-якою мовою). */
export function isMenuButton(text, name) {
  return Boolean(text) && (text === UK[name] || text === EN[name]);
}
