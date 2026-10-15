// Пакети (готові пропозиції з ціною) і стилі з прикладами — для брифу.
// config.packages = [{ id, name, nameEn, type: 'any'|'static'|'animated', qty, price, items, itemsEn, active }]
// config.styles = [{ id, name, nameEn, image (id завантаження), fileId (кеш Telegram), active }]
import crypto from 'node:crypto';
import { store } from './store.js';
import { log } from './log.js';

const MAX_PACKAGES = 6;
const MAX_STYLES = 8;

export class OfferError extends Error {}

export const DEFAULT_PACKAGES = [
  { name: 'Базовий', nameEn: 'Basic', type: 'static', qty: '5', price: 0, items: '5 статичних стікерів\n1 раунд правок ескізів', itemsEn: '5 static stickers\n1 round of sketch changes', active: false },
  { name: 'Стандарт', nameEn: 'Standard', type: 'any', qty: '10', price: 0, items: '10 стікерів\n2 раунди правок ескізів\nСтікерпак на ваше імʼя', itemsEn: '10 stickers\n2 rounds of sketch changes\nSticker pack in your name', active: false },
  { name: 'Преміум', nameEn: 'Premium', type: 'animated', qty: '15-20', price: 0, items: '15–20 анімованих стікерів\n3 раунди правок\nВихідні файли', itemsEn: '15–20 animated stickers\n3 rounds of changes\nSource files', active: false },
];

export function packages() {
  const c = store.data.config;
  if (!Array.isArray(c.packages)) {
    c.packages = DEFAULT_PACKAGES.map((p) => ({ id: crypto.randomBytes(3).toString('hex'), ...p }));
    store.save();
  }
  return c.packages;
}

/** Пакети, які бачить клієнт для обраного типу (лише ввімкнені й з ціною). */
export function activePackages(typeKey) {
  return packages().filter((p) => p.active && p.price > 0 && (p.type === 'any' || !typeKey || p.type === typeKey));
}

export const findPackage = (id) => packages().find((p) => p.id === id) || null;

export function savePackages(input) {
  if (!Array.isArray(input)) throw new OfferError('Неверный формат.');
  const list = input.slice(0, MAX_PACKAGES).map((p) => ({
    id: /^[0-9a-f]{6}$/.test(p?.id) ? p.id : crypto.randomBytes(3).toString('hex'),
    name: String(p?.name || '').trim().slice(0, 30),
    nameEn: String(p?.nameEn || '').trim().slice(0, 30),
    type: ['static', 'animated'].includes(p?.type) ? p.type : 'any',
    qty: String(p?.qty || '').trim().slice(0, 20),
    price: Math.max(0, Math.round(Number(p?.price) || 0)),
    days: Math.max(0, Math.min(365, Math.round(Number(p?.days) || 0))),
    items: String(p?.items || '').trim().slice(0, 600),
    itemsEn: String(p?.itemsEn || '').trim().slice(0, 600),
    active: Boolean(p?.active),
  }));
  for (const p of list) {
    if (!p.name) throw new OfferError('У каждого пакета должно быть название.');
    if (p.active && !(p.price > 0)) throw new OfferError(`Укажите цену пакета «${p.name}» — без цены его не показать клиентам.`);
  }
  store.data.config.packages = list;
  store.saveNow();
  return list;
}

// --- Стилі ---

export function styles() {
  return (store.data.config.styles ||= []);
}

export const activeStyles = () => styles().filter((s) => s.active && s.image);
export const findStyle = (id) => styles().find((s) => s.id === id) || null;

export function saveStyles(input) {
  if (!Array.isArray(input)) throw new OfferError('Неверный формат.');
  const old = new Map(styles().map((s) => [s.id, s]));
  const list = input.slice(0, MAX_STYLES).map((s) => {
    const id = /^[0-9a-f]{6}$/.test(s?.id) ? s.id : crypto.randomBytes(3).toString('hex');
    const image = /^[0-9a-f]{16}$/.test(s?.image) ? s.image : null;
    const prev = old.get(id);
    return {
      id, image,
      name: String(s?.name || '').trim().slice(0, 30),
      nameEn: String(s?.nameEn || '').trim().slice(0, 30),
      active: Boolean(s?.active),
      // Картинку не міняли — лишаємо кешований file_id Telegram
      fileId: prev && prev.image === image ? prev.fileId || null : null,
    };
  });
  for (const s of list) {
    if (!s.name) throw new OfferError('У каждого стиля должно быть название.');
    if (s.active && !s.image) throw new OfferError(`Загрузите картинку-пример для стиля «${s.name}».`);
  }
  store.data.config.styles = list;
  store.saveNow();
  return list;
}

/**
 * Надсилає приклади стилів альбомом (підписи з номерами). file_id запам'ятовуємо,
 * щоб наступного разу не завантажувати картинки знову.
 */
export async function sendStyleExamples(tg, chatId, list, lang, loadUpload) {
  const media = [];
  const files = [];
  list.forEach((s, i) => {
    const caption = `${i + 1}. ${lang === 'en' && s.nameEn ? s.nameEn : s.name}`;
    if (s.fileId) media.push({ type: 'photo', media: s.fileId, caption });
    else {
      const f = loadUpload(s.image);
      media.push({ type: 'photo', media: `attach://f${i}`, caption });
      files.push({ field: `f${i}`, buffer: f.buffer, filename: f.name, mime: f.mime });
    }
  });
  let msgs;
  if (media.length === 1) {
    const one = media[0];
    const m = files.length
      ? await tg.callWithFiles('sendPhoto', { chat_id: chatId, caption: one.caption }, [{ ...files[0], field: 'photo' }])
      : await tg.call('sendPhoto', { chat_id: chatId, photo: one.media, caption: one.caption });
    msgs = [m];
  } else {
    msgs = files.length
      ? await tg.callWithFiles('sendMediaGroup', { chat_id: chatId, media }, files)
      : await tg.call('sendMediaGroup', { chat_id: chatId, media });
  }
  let changed = false;
  (Array.isArray(msgs) ? msgs : [msgs]).forEach((m, i) => {
    const id = m?.photo?.at(-1)?.file_id;
    if (id && list[i] && list[i].fileId !== id) { list[i].fileId = id; changed = true; }
  });
  if (changed) store.save();
  return msgs;
}

export function logOfferError(err) {
  log.warn(`Примеры стилей не отправлены: ${err.message}`);
}
