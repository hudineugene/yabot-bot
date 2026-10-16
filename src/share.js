// Інлайн-режим: у будь-якому чаті людина пише @бот — і надсилає другу роботу студії живим стікером
// з кнопками «Додати стікерпак» і «Хочу такий самий» (?start=work_<id> — одразу бриф з цією роботою за орієнтир).
// Без робіт у каталозі — картка студії з кнопкою в бота (?start=share).
// Працює, лише коли в @BotFather увімкнено /setinline (getMe → supports_inline_queries).
import { store } from './store.js';
import { log } from './log.js';
import { catalog } from './catalog.js';
import { textsFor, detectLang, langOf } from './lang.js';

export const WORK_START = /^work_([0-9a-f]{8})$/;
const MAX_RESULTS = 50; // ліміт Telegram на одну відповідь
const CACHE_SECONDS = 300;

/** Чи ввімкнено інлайн-режим у @BotFather (запам'ятовуємо з getMe при старті). */
export const inlineEnabled = () => Boolean(store.data.bot?.inline);

export function botLink(start) {
  const name = store.data.bot?.username;
  return name ? `https://t.me/${name}?start=${start}` : null;
}

/**
 * Кнопка «Надіслати другу» під карткою роботи. З інлайн-режимом — вибір чату й живий стікер з кнопками;
 * без нього — стандартне вікно Telegram «Поділитися» з посиланням на роботу (працює без налаштувань).
 */
export function shareButton(item, L) {
  if (inlineEnabled()) return { text: L.SHARE_WORK, switch_inline_query: item.title };
  const url = shareUrl(item, L);
  return url ? { text: L.SHARE_WORK, url } : null;
}

export function shareUrl(item, L) {
  const link = botLink(`work_${item.id}`);
  return link ? `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(L.shareText(item))}` : null;
}

/** Мова відповіді: того, хто ділиться (якщо він уже був у боті), інакше — з налаштувань Telegram. */
function textsForSender(from) {
  return textsFor(store.data.users[String(from.id)] ? langOf(from.id) : detectLang(from.language_code));
}

/** Роботи для інлайн-запиту: збіг у назві чи описі, без запиту — усі. */
export function matchWorks(query) {
  const q = String(query || '').trim().toLowerCase();
  return catalog()
    .filter((item) => item.previewIds?.length)
    .filter((item) => !q || `${item.title} ${item.name} ${item.description || ''}`.toLowerCase().includes(q))
    .slice(0, MAX_RESULTS);
}

export function inlineResults(query, from) {
  const L = textsForSender(from);
  const works = matchWorks(query);
  if (works.length) {
    return works.map((item) => ({
      type: 'sticker',
      id: item.id,
      sticker_file_id: item.previewIds[0],
      reply_markup: {
        inline_keyboard: [
          [{ text: L.INLINE_ADD_PACK, url: `https://t.me/addstickers/${item.name}` }],
          ...(botLink(`work_${item.id}`) ? [[{ text: L.INLINE_WANT_SAME, url: botLink(`work_${item.id}`) }]] : []),
        ],
      },
    }));
  }
  const link = botLink('share');
  return [{
    type: 'article',
    id: 'studio',
    title: L.INLINE_STUDIO_TITLE,
    description: L.INLINE_STUDIO_DESCRIPTION,
    input_message_content: { message_text: L.INLINE_STUDIO_TEXT, parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
    ...(link ? { reply_markup: { inline_keyboard: [[{ text: L.INLINE_STUDIO_BUTTON, url: link }]] } } : {}),
  }];
}

/** Відповідь на інлайн-запит. Помилки не роняють обробку оновлень — лише в журнал. */
export async function answerInline(h, q) {
  try {
    await h.tg.call('answerInlineQuery', {
      inline_query_id: q.id,
      results: inlineResults(q.query, q.from),
      cache_time: CACHE_SECONDS,
      is_personal: false,
    });
    h.bump('inlineQueries');
  } catch (err) {
    // Запит застарів (людина вже закрила список) — нормально, не помилка
    if (!/query is too old|QUERY_ID_INVALID/i.test(err.description || err.message)) log.warn(`Инлайн-ответ не отправлен: ${err.description || err.message}`);
  }
}
