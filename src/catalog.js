// Каталог готових робіт: стікерпаки Telegram (посилання t.me/addstickers/…).
// Зберігається в bot-data.json → catalog[]; превʼю — file_id кількох стікерів із пака.
import crypto from 'node:crypto';
import { store } from './store.js';

export const MAX_ITEMS = 30;
const PREVIEW_COUNT = 3;
const MAX_DESCRIPTION = 500;

/** Назва пака з посилання (t.me/addstickers/NAME, tg://addstickers?set=NAME) або сама назва. */
export function parsePackName(input) {
  const text = String(input || '').trim();
  const match =
    text.match(/addstickers\/([A-Za-z0-9_]{1,64})/i) ||
    text.match(/[?&]set=([A-Za-z0-9_]{1,64})/i) ||
    text.match(/^([A-Za-z][A-Za-z0-9_]{0,63})$/);
  return match ? match[1] : null;
}

/** Дані пака з Telegram: назва, формат, кількість і кілька стікерів для превʼю. */
export async function fetchPack(tg, name) {
  const set = await tg.call('getStickerSet', { name });
  const stickers = set.stickers || [];
  if (!stickers.length) throw new Error('В стикерпаке нет стикеров');
  const first = stickers[0];
  const format = first.is_video ? 'video' : first.is_animated ? 'animated' : 'static';
  // Беремо стікери рівномірно по паку: початок, середина, кінець
  const picks = [...new Set(
    Array.from({ length: Math.min(PREVIEW_COUNT, stickers.length) },
      (_, i) => Math.round((i * (stickers.length - 1)) / Math.max(1, PREVIEW_COUNT - 1))),
  )];
  return {
    name: set.name,
    title: set.title,
    format,
    count: stickers.length,
    previewIds: picks.map((i) => stickers[i].file_id),
  };
}

export function catalog() {
  return store.data.catalog;
}

export function findItem(id) {
  return store.data.catalog.find((item) => item.id === id);
}

export async function addItem(tg, { link, description }) {
  const name = parsePackName(link);
  if (!name) throw userError('Не удалось прочитать название стикерпака. Вставьте ссылку вида t.me/addstickers/название.');
  if (catalog().length >= MAX_ITEMS) throw userError(`В каталоге уже ${MAX_ITEMS} работ — удалите лишние.`);
  if (catalog().some((item) => item.name.toLowerCase() === name.toLowerCase())) {
    throw userError('Этот стикерпак уже есть в каталоге.');
  }
  let pack;
  try {
    pack = await fetchPack(tg, name);
  } catch (err) {
    if (err.status === 400) throw userError('Telegram не нашёл такой стикерпак. Проверьте ссылку.');
    throw err;
  }
  const item = {
    id: crypto.randomBytes(4).toString('hex'),
    ...pack,
    description: String(description || '').trim().slice(0, MAX_DESCRIPTION),
    addedAt: new Date().toISOString(),
  };
  catalog().push(item);
  store.saveNow();
  return item;
}

export function removeItem(id) {
  const list = catalog();
  const index = list.findIndex((item) => item.id === id);
  if (index < 0) throw userError('Работа не найдена.');
  list.splice(index, 1);
  store.saveNow();
}

export function moveItem(id, direction) {
  const list = catalog();
  const index = list.findIndex((item) => item.id === id);
  const target = index + (direction < 0 ? -1 : 1);
  if (index < 0 || target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  store.saveNow();
}

export function updateDescription(id, description) {
  const item = findItem(id);
  if (!item) throw userError('Работа не найдена.');
  item.description = String(description || '').trim().slice(0, MAX_DESCRIPTION);
  store.saveNow();
}

/** Оновлює дані пака (нові стікери, нова назва, нові file_id після зміни токена). */
export async function refreshItem(tg, item) {
  Object.assign(item, await fetchPack(tg, item.name));
  store.save();
  return item;
}

function userError(message) {
  return Object.assign(new Error(message), { userFacing: true });
}
