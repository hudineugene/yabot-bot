// Послуги студії для Mini App: стікерпаки, Telegram-боти з miniApp, персонажі.
// Тексти — у коді (укр./англ.), власник на сторінці бота вмикає послуги й задає ціну «від …» (грн).
// config.services = { stickers: { active, priceFrom }, bots: {…}, characters: {…} }
import crypto from 'node:crypto';
import { store } from './store.js';

export const SERVICES = [
  {
    id: 'stickers', img: 'svc_stickers.webp',
    name: 'Стікерпаки', nameEn: 'Sticker packs', one: 'Стікерпак', oneEn: 'Sticker pack',
    tagline: 'Унікальні стікери для вашого бренду чи особистого стилю.',
    taglineEn: 'Unique stickers for your brand or personal style.',
    chips: ['Статичні й анімовані', 'Для Telegram'], chipsEn: ['Static & animated', 'For Telegram'],
    intro: 'Створюємо унікальні стікерпаки з вашим героєм: людиною, улюбленцем, персонажем бренду. Ідеально для бізнесу, спільнот, особистого використання чи подарунка.',
    introEn: 'We create unique sticker packs with your character: a person, a pet or a brand mascot. Perfect for business, communities, personal use or as a gift.',
    perks: [['star', 'Ексклюзивний дизайн'], ['check', 'Готовий пак у Telegram'], ['send', 'Правки ескізів у боті']],
    perksEn: [['star', 'Exclusive design'], ['check', 'Ready pack in Telegram'], ['send', 'Sketch changes in the bot']],
    includes: ['Ескізи героя й емоцій на погодження', 'Раунди правок ескізів', 'Статичні або анімовані стікери', 'Готовий стікерпак у Telegram на ваше імʼя'],
    includesEn: ['Sketches of the character and emotions for approval', 'Rounds of sketch changes', 'Static or animated stickers', 'A ready Telegram sticker pack in your name'],
    steps: ['Бриф', 'Кошторис', 'Ескізи', 'Правки', 'Готовий пак'],
    stepsEn: ['Brief', 'Quote', 'Sketches', 'Changes', 'Ready pack'],
  },
  {
    id: 'bots', img: 'svc_bots.webp',
    name: 'Телеграм-боти з miniApp', nameEn: 'Telegram bots with miniApp', one: 'Телеграм-бот з miniApp', oneEn: 'Telegram bot with miniApp',
    tagline: 'Функціональні боти з сучасним інтерфейсом та автоматизацією.',
    taglineEn: 'Functional bots with a modern interface and automation.',
    chips: ['UI/UX', 'Логіка', 'Telegram API'], chipsEn: ['UI/UX', 'Logic', 'Telegram API'],
    intro: 'Автоматизація бізнесу, продажі та сервіс у Telegram. Під ключ: від ідеї й дизайну інтерфейсу до запуску, оплат та інтеграцій.',
    introEn: 'Business automation, sales and service in Telegram. Turnkey: from the idea and interface design to launch, payments and integrations.',
    perks: [['bot', 'Боти для продажів'], ['catalog', 'Міні-додатки (miniApp)'], ['settings', 'Інтеграції та API']],
    perksEn: [['bot', 'Sales bots'], ['catalog', 'Mini apps (miniApp)'], ['settings', 'Integrations & API']],
    includes: ['Аналіз задачі й сценарії', 'Дизайн інтерфейсу miniApp', 'Розробка бота й сторінки керування', 'Оплати, заявки, сповіщення', 'Запуск і супровід'],
    includesEn: ['Task analysis and scenarios', 'miniApp interface design', 'Bot and admin page development', 'Payments, requests, notifications', 'Launch and support'],
    steps: ['Брифінг', 'Концепція', 'Дизайн', 'Розробка', 'Тестування', 'Запуск'],
    stepsEn: ['Briefing', 'Concept', 'Design', 'Development', 'Testing', 'Launch'],
  },
  {
    id: 'characters', img: 'svc_characters.webp',
    name: 'Персонажі', nameEn: 'Characters', one: 'Персонаж', oneEn: 'Character',
    tagline: 'Унікальні персонажі та маскоти для вашого бренду, продукту чи кампанії.',
    taglineEn: 'Unique characters and mascots for your brand, product or campaign.',
    chips: ['Маскот', 'PNG', 'Для бренду'], chipsEn: ['Mascot', 'PNG', 'For brands'],
    intro: 'Розробляємо харизматичних персонажів, які підкреслюють цінності вашого бренду та легко адаптуються до будь-яких носіїв.',
    introEn: 'We design charismatic characters that highlight your brand values and adapt easily to any media.',
    perks: [['help', 'Унікальна концепція'], ['heart', 'Емоції та вирази'], ['files', 'Готові файли у PNG']],
    perksEn: [['help', 'Unique concept'], ['heart', 'Emotions & expressions'], ['files', 'Ready PNG files']],
    includes: ['Концепція й характер персонажа', 'Ескізи на погодження', 'Емоції, пози та сцени', 'Готові файли у PNG'],
    includesEn: ['Character concept and personality', 'Sketches for approval', 'Emotions, poses and scenes', 'Ready PNG files'],
    steps: ['Бриф', 'Концепція', 'Ескізи', 'Фінал', 'Файли'],
    stepsEn: ['Brief', 'Concept', 'Sketches', 'Final', 'Files'],
  },
];

export const NEEDS = { new: 'Новий проєкт', redesign: 'Редизайн', consult: 'Консультація' };
export const NEEDS_EN = { new: 'New project', redesign: 'Redesign', consult: 'Consultation' };

export const findService = (id) => SERVICES.find((s) => s.id === id) || null;
export const isProject = (o) => Boolean(o?.service && o.service !== 'stickers');

// Тексти, які власник може змінити на сторінці бота (порожнє — текст за замовчуванням з коду)
export const TEXT_FIELDS = ['tagline', 'intro', 'includes', 'steps', 'chips'];
const LIST_FIELDS = new Set(['includes', 'steps', 'chips']);
const MAX_EXAMPLES = 8;

export function serviceSettings() {
  const c = (store.data.config.services ||= {});
  for (const s of SERVICES) c[s.id] = { active: true, priceFrom: 0, examples: [], texts: {}, packages: [], payPlan: [], ...(c[s.id] || {}) };
  return c;
}

/** Опис послуги з урахуванням текстів, які задав власник. */
function withTexts(s, texts = {}) {
  const out = { ...s };
  for (const f of TEXT_FIELDS) {
    for (const k of [f, `${f}En`]) {
      const v = texts[k];
      if (LIST_FIELDS.has(f) ? Array.isArray(v) && v.length : typeof v === 'string' && v.trim()) out[k] = v;
    }
  }
  return out;
}

/** Послуги для клієнта: увімкнені, з ціною «від» (0 — не показуємо), текстами й прикладами робіт. */
export function activeServices() {
  const c = serviceSettings();
  return SERVICES.filter((s) => c[s.id].active)
    .map((s) => ({ ...withTexts(s, c[s.id].texts), priceFrom: Number(c[s.id].priceFrom) || 0, examples: c[s.id].examples || [], packages: s.id === 'stickers' ? [] : c[s.id].packages || [] }));
}

/** Картинки прикладів (щоб прибирання завантажень їх не видалило). */
export function exampleImages() {
  const c = serviceSettings();
  return SERVICES.flatMap((s) => (c[s.id].examples || []).map((e) => e.image)).filter(Boolean);
}

const MAX_PACKAGES = 4;

/** Пакети проєкту (боти, персонажі): назва, ціна «від», склад робіт (укр./англ.). */
function cleanPackages(list, old = []) {
  if (!Array.isArray(list)) return old;
  return list.slice(0, MAX_PACKAGES).map((p) => {
    const name = String(p?.name || '').trim().slice(0, 40);
    if (!name) return null;
    const lines = (v) => String(v || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 8).map((x) => x.slice(0, 120)).join('\n');
    return {
      id: /^[0-9a-f]{6}$/.test(p.id || '') ? p.id : crypto.randomBytes(3).toString('hex'),
      name, nameEn: String(p.nameEn || '').trim().slice(0, 40),
      price: Math.max(0, Math.min(10000000, Math.round(Number(p.price) || 0))),
      items: lines(p.items), itemsEn: lines(p.itemsEn),
    };
  }).filter(Boolean);
}

/**
 * План оплати за етапами: [{ idx, percent }] — idx етапу зростає, відсотки цілі, разом 100.
 * Повертає очищений план або кидає помилку з поясненням. Порожній список — плану немає.
 */
export function cleanPayPlan(list, stepsCount) {
  if (!Array.isArray(list)) return [];
  const plan = list.map((e) => ({ idx: Number(e?.idx), percent: Math.round(Number(e?.percent)) }))
    .filter((e) => e.percent > 0)
    .sort((a, b) => a.idx - b.idx);
  if (!plan.length) return [];
  if (plan.length > 6) throw new Error('В плане оплаты — не больше 6 платежей.');
  for (const [i, e] of plan.entries()) {
    if (!Number.isInteger(e.idx) || e.idx < 0 || e.idx >= stepsCount) throw new Error('В плане оплаты есть неизвестный этап.');
    if (i && plan[i - 1].idx === e.idx) throw new Error('На один этап — один платёж.');
    if (e.percent > 100) throw new Error('Процент платежа — до 100.');
  }
  const sum = plan.reduce((s, e) => s + e.percent, 0);
  if (sum !== 100) throw new Error(`Сумма процентов в плане оплаты — ${sum}%, а должна быть 100%.`);
  return plan;
}

/** Пакет послуги-проєкту за id. */
export function findServicePackage(serviceId, pkgId) {
  if (!pkgId || serviceId === 'stickers') return null;
  return (serviceSettings()[serviceId]?.packages || []).find((p) => p.id === pkgId) || null;
}

/** Склад робіт пакета замовлення (для кошторису): пакет стікерів чи пакет проєкту. */
export function packageItems(o) {
  if (!o?.package?.id) return '';
  const list = isProject(o) ? serviceSettings()[o.service]?.packages || [] : store.data.config.packages || [];
  return list.find((p) => p.id === o.package.id)?.items || '';
}

function cleanTexts(input = {}) {
  const t = {};
  for (const f of TEXT_FIELDS) {
    for (const k of [f, `${f}En`]) {
      const v = input[k];
      if (LIST_FIELDS.has(f)) {
        const list = (Array.isArray(v) ? v : String(v || '').split(f === 'chips' ? /[,\n]/ : /\n/))
          .map((x) => String(x).trim()).filter(Boolean).slice(0, f === 'chips' ? 4 : 8).map((x) => x.slice(0, f === 'chips' ? 30 : 140));
        if (list.length) t[k] = list;
      } else {
        const str = String(v || '').trim().slice(0, f === 'tagline' ? 140 : 600);
        if (str) t[k] = str;
      }
    }
  }
  return t;
}

export function saveServices(input) {
  const c = serviceSettings();
  for (const s of SERVICES) {
    const v = input?.[s.id];
    if (!v) continue;
    const examples = (Array.isArray(v.examples) ? v.examples : c[s.id].examples || []).slice(0, MAX_EXAMPLES)
      .filter((e) => /^[0-9a-f]{16}$/.test(e?.image || ''))
      .map((e) => ({ image: e.image, caption: String(e.caption || '').trim().slice(0, 80), captionEn: String(e.captionEn || '').trim().slice(0, 80) }));
    c[s.id] = {
      active: Boolean(v.active),
      priceFrom: Math.max(0, Math.min(10000000, Math.round(Number(v.priceFrom) || 0))),
      examples,
      texts: 'texts' in v ? cleanTexts(v.texts) : c[s.id].texts || {},
      packages: s.id === 'stickers' ? [] : cleanPackages(v.packages, c[s.id].packages || []),
      payPlan: s.id === 'stickers' ? [] : 'payPlan' in v
        ? cleanPayPlan(v.payPlan, (withTexts(s, 'texts' in v ? cleanTexts(v.texts) : c[s.id].texts || {}).steps || []).length)
        : c[s.id].payPlan || [],
    };
  }
  if (!SERVICES.some((s) => c[s.id].active)) throw new Error('Оставьте включённой хотя бы одну услугу.');
  store.saveNow();
  return c;
}

/**
 * Етапи проєкту (боти, персонажі): назви з урахуванням текстів власника й поточний етап.
 * idx — індекс поточного етапу; для готового замовлення = steps.length (усе пройдено).
 */
export function projectStage(o) {
  if (!isProject(o)) return null;
  const s = findService(o.service);
  if (!s) return null;
  const t = withTexts(s, serviceSettings()[s.id].texts);
  const steps = t.steps || [];
  if (!steps.length) return null;
  const stepsEn = t.stepsEn?.length === steps.length ? t.stepsEn : steps;
  const last = steps.length - 1;
  const idx = o.status === 'done' ? steps.length : o.status === 'new' ? 0
    : Math.max(0, Math.min(last, Number.isInteger(o.projectStage) ? o.projectStage : Math.min(1, last)));
  return { idx, steps, stepsEn, at: o.projectStageAt || {}, info: o.stageInfo || {} };
}
