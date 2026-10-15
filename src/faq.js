// Часті питання: кнопка «❓ Питання» в меню, а на довільне питання людини без заявки бот
// підбирає схожу відповідь; не знайшов — передає питання студії.
// config.faq = [{ id, q, a, qEn, aEn, keywords }]
import crypto from 'node:crypto';
import { store } from './store.js';

const MAX_FAQ = 20;

export const DEFAULT_FAQ = [
  {
    q: 'Скільки коштує стікерпак?', qEn: 'How much does a sticker pack cost?', keywords: 'ціна вартість скільки коштує прайс price cost',
    a: 'Орієнтовні ціни — у «💰 Вартість». Точну суму дизайнер назве після брифу: вона залежить від кількості стікерів, складності героя й анімації.',
    aEn: 'Approximate prices are in «💰 Prices». The designer will quote the exact price after the brief: it depends on the number of stickers, the character and the animation.',
  },
  {
    q: 'Скільки триває робота?', qEn: 'How long does it take?', keywords: 'термін строк довго швидко днів час коли deadline time',
    a: 'Залежить від кількості стікерів і анімації. Точний термін дизайнер вкаже в кошторисі після брифу.',
    aEn: 'It depends on the number of stickers and the animation. The designer will state the exact deadline in the quote after the brief.',
  },
  {
    q: 'Чи можна вносити правки?', qEn: 'Can I request changes?', keywords: 'правки змінити виправити ескіз не сподобається changes',
    a: 'Так. Спершу ми надсилаємо ескізи — ви погоджуєте їх або пишете правки прямо тут, у боті.',
    aEn: 'Yes. First we send sketches — you approve them or write your changes right here in the bot.',
  },
  {
    q: 'Як оплатити?', qEn: 'How do I pay?', keywords: 'оплата оплатити карта картка рахунок передоплата аванс pay payment',
    a: 'Після погодження кошторису дизайнер надішле рахунок або реквізити для оплати сюди, в бот.',
    aEn: 'After you approve the quote, the designer will send an invoice or payment details here in the bot.',
  },
  {
    q: 'Як я отримаю стікери?', qEn: 'How will I get the stickers?', keywords: 'отримати отримаю готовий стікерпак додати телеграм get receive',
    a: 'Готовий стікерпак прийде сюди кнопкою «Додати стікерпак» — він одразу з’явиться у вашому Telegram.',
    aEn: 'The finished sticker pack will come here with an «Add sticker pack» button — it appears in your Telegram right away.',
  },
  {
    q: 'Чи працюєте з компаніями?', qEn: 'Do you work with companies?', keywords: 'компанія бренд команда корпоратив офіс рахунок акт фоп company brand',
    a: 'Так, робимо стікери для команд і брендів. Розкажіть про задачу в брифі — дизайнер усе уточнить.',
    aEn: 'Yes, we make stickers for teams and brands. Describe the task in the brief — the designer will clarify everything.',
  },
];

export function faqList() {
  const c = store.data.config;
  if (!Array.isArray(c.faq)) {
    c.faq = DEFAULT_FAQ.map((f) => ({ id: crypto.randomBytes(3).toString('hex'), ...f }));
    store.save();
  }
  return c.faq;
}

export const findFaq = (id) => faqList().find((f) => f.id === id) || null;

/** Корені слів: нижній регістр, без розділових знаків, перші 5 літер слів від 3 літер. */
function stems(text) {
  return new Set(String(text || '').toLowerCase().replace(/[’'ʼ`]/g, '').split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3).map((w) => w.slice(0, 5)));
}

/** Найсхожіше питання до тексту людини або null. */
export function matchFaq(text) {
  const words = stems(text);
  if (!words.size) return null;
  let best = null;
  for (const f of faqList()) {
    const target = stems(`${f.q} ${f.qEn || ''} ${f.keywords || ''}`);
    let score = 0;
    for (const w of words) if (target.has(w)) score++;
    if (score && (!best || score > best.score)) best = { f, score };
  }
  if (!best) return null;
  return best.score >= 2 || (best.score >= 1 && words.size <= 4) ? best.f : null;
}

export function saveFaq(input) {
  if (!Array.isArray(input)) throw new Error('Неверный формат.');
  const list = input.slice(0, MAX_FAQ).map((f) => ({
    id: /^[0-9a-f]{6}$/.test(f?.id) ? f.id : crypto.randomBytes(3).toString('hex'),
    q: String(f?.q || '').trim().slice(0, 120),
    a: String(f?.a || '').trim().slice(0, 1500),
    qEn: String(f?.qEn || '').trim().slice(0, 120),
    aEn: String(f?.aEn || '').trim().slice(0, 1500),
    keywords: String(f?.keywords || '').trim().slice(0, 200),
  })).filter((f) => f.q && f.a);
  store.data.config.faq = list;
  store.saveNow();
  return list;
}
