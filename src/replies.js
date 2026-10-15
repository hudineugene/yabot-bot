// Швидкі відповіді клієнту: шаблони частих фраз (config.quickReplies).
// На сторінці бота — кнопки над полем відповіді, у Telegram — /r <номер> у відповідь на повідомлення клієнта.
// Підстановки: {ім'я} — ім'я клієнта, {номер} — номер заявки, {ціна} і {термін} — з полів студії.
import crypto from 'node:crypto';
import { store } from './store.js';
import { orderNo } from './util.js';

const MAX_REPLIES = 30;

export const DEFAULT_REPLIES = [
  { title: 'Вітання', text: "Вітаю, {ім'я}! Дякуємо за заявку #{номер} 🙌 Я дизайнер YABOT, ознайомився з брифом — зараз поставлю кілька уточнюючих питань.", textEn: 'Hi, {ім\'я}! Thank you for request #{номер} 🙌 I am a YABOT designer and I have read your brief — I will ask a few clarifying questions now.' },
  { title: 'Вартість', text: 'За вашим брифом вартість стікерпаку — {ціна}. Якщо все влаштовує, беремося до роботи!', textEn: 'Based on your brief, the sticker pack costs {ціна}. If that works for you, we will get started!' },
  { title: 'Терміни', text: 'Орієнтовний термін — {термін}. Ескізи надішлю сюди ж на погодження.', textEn: 'The estimated deadline is {термін}. I will send the sketches here for approval.' },
  { title: 'Потрібні файли', text: 'Надішліть, будь ласка, логотип або фото персонажа файлом (бажано у векторі або PNG без фону) — так результат буде точнішим.', textEn: 'Please send the logo or a photo of the character as a file (vector or PNG without background preferred) — the result will be more accurate.' },
  { title: 'Ескізи скоро', text: 'Працюю над ескізами — надішлю найближчим часом 🎨', textEn: 'Working on the sketches — will send them soon 🎨' },
  { title: 'Дякуємо', text: 'Дякуємо, що обрали YABOT 💛 Звертайтеся, коли захочете доповнити пак!', textEn: 'Thank you for choosing YABOT 💛 Come back whenever you want to extend the pack!' },
];

export function replyList() {
  const c = store.data.config;
  if (!Array.isArray(c.quickReplies)) {
    c.quickReplies = DEFAULT_REPLIES.map((r) => ({ id: crypto.randomBytes(3).toString('hex'), ...r }));
    store.save();
  }
  return c.quickReplies;
}

/** Шаблон за номером у списку (1, 2…) або за назвою. */
export function findReply(key) {
  const list = replyList();
  const n = Number(key);
  if (Number.isInteger(n) && n >= 1 && n <= list.length) return list[n - 1];
  const k = String(key).trim().toLowerCase();
  return list.find((r) => r.title.toLowerCase() === k) || list.find((r) => r.title.toLowerCase().startsWith(k)) || null;
}

/** Текст шаблону для клієнта заявки: мова клієнта + підстановки. */
export function fillReply(reply, order) {
  const base = order.lang === 'en' && reply.textEn?.trim() ? reply.textEn : reply.text;
  const name = (order.fullName || '').split(' ')[0] || (order.username ? `@${order.username}` : '');
  return base
    .replace(/\{ім['ʼ’]я\}/g, name)
    .replace(/\{номер\}/g, orderNo(order.id))
    .replace(/\{ціна\}/g, order.studio?.price || '…')
    .replace(/\{термін\}/g, order.studio?.deadline || '…')
    .trim();
}

/** Збереження списку зі сторінки бота. */
export function saveReplies(input) {
  if (!Array.isArray(input)) throw new Error('Неверный формат.');
  const list = input.slice(0, MAX_REPLIES).map((r) => ({
    id: /^[0-9a-f]{6}$/.test(r?.id) ? r.id : crypto.randomBytes(3).toString('hex'),
    title: String(r?.title || '').trim().slice(0, 40),
    text: String(r?.text || '').trim().slice(0, 2000),
    textEn: String(r?.textEn || '').trim().slice(0, 2000),
  })).filter((r) => r.title && r.text);
  store.data.config.quickReplies = list;
  store.saveNow();
  return list;
}
