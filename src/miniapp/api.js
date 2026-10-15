// Дані й дії Mini App для клієнта: вітрина, ціни, бриф однією формою, «Мої замовлення»
// (кошторис, ескізи, оплата). Дії використовують ті самі методи, що й кнопки в чаті.
import crypto from 'node:crypto';
import { store } from '../store.js';
import { log } from '../log.js';
import { orderNo, todayKey, dateText } from '../util.js';
import { langOf, textsFor, englishEnabled } from '../lang.js';
import { isOpen, orderAmount, paidTotal } from '../orders.js';
import { activePackages, activeStyles } from '../offer.js';
import { catalog } from '../catalog.js';
import { faqList } from '../faq.js';
import { findPromo } from '../promos.js';
import * as T from '../texts.js';
import { activeServices, findService, findServicePackage, projectStage, serviceSettings, NEEDS, NEEDS_EN } from '../services.js';
import { publishedReviews, reviewPromoSettings } from '../reviews.js';
import { validDate } from '../orders.js';
import { aiAvailable, suggestEmotions, suggestProjectBrief, ideasText, takeClientAi, returnClientAi } from '../ai.js';
import { queueEstimate } from '../queue.js';
import { clientReplyTime } from '../sla.js';
import { stagePlanView } from '../payments.js';
import { fixAllowed, openFix } from '../fixes.js';
import { chatOn, aiHistory } from '../genagent.js';

const AI_DAILY = 10; // ІІ-підказок на день на клієнта (спільний лічильник із ботом)
const aiBusy = new Set();

const MAX_TEXT = 2000;
const MAX_SHORT = 200;
const PAY_OPEN = new Set(['created', 'processing', 'hold', 'awaiting', 'reported']);

// --- Воронка Mini App: унікальні люди за день на кожному етапі ---
export const FUNNEL_STEPS = ['open', 's1', 's2', 's3', 's4', 'sent'];
const FUNNEL_KEEP_DAYS = 60;
export function funnelHit(userId, step) {
  if (!FUNNEL_STEPS.includes(step)) return;
  const all = (store.data.stats.miniFunnel ||= {});
  const day = (all[todayKey()] ||= {});
  const list = (day[step] ||= []);
  if (!list.includes(userId) && list.length < 5000) list.push(userId);
  const days = Object.keys(all).sort();
  for (const k of days.slice(0, Math.max(0, days.length - FUNNEL_KEEP_DAYS))) delete all[k];
}
/** Підсумок за N днів: скільки різних людей дійшли до кожного етапу. */
export function funnelSummary(days = 30) {
  const all = store.data.stats.miniFunnel || {};
  const from = todayKey(new Date(Date.now() - (days - 1) * 86400000));
  const sets = Object.fromEntries(FUNNEL_STEPS.map((s) => [s, new Set()]));
  for (const [day, v] of Object.entries(all)) {
    if (day < from) continue;
    for (const s of FUNNEL_STEPS) for (const id of v[s] || []) sets[s].add(id);
  }
  return Object.fromEntries(FUNNEL_STEPS.map((s) => [s, sets[s].size]));
}

/**
 * Воронка Mini App за джерелами (мітка ?start= / ?startapp= з першого входу): хто відкрив, хто надіслав заявку,
 * скільки заявок із Mini App і виручка готових.
 */
export function funnelBySource(days = 30) {
  const all = store.data.stats.miniFunnel || {};
  const from = todayKey(new Date(Date.now() - (days - 1) * 86400000));
  const opened = new Set(), sent = new Set();
  for (const [day, v] of Object.entries(all)) {
    if (day < from) continue;
    for (const id of v.open || []) opened.add(id);
    for (const id of v.sent || []) sent.add(id);
  }
  const users = store.data.users;
  const rows = {};
  const row = (k) => (rows[k] ||= { source: k, open: 0, sent: 0, orders: 0, revenue: 0 });
  for (const id of opened) row(users[String(id)]?.source || '').open++;
  for (const id of sent) row(users[String(id)]?.source || '').sent++;
  for (const o of store.data.inquiries) {
    if (o.via !== 'app' || todayKey(new Date(o.createdAt)) < from) continue;
    const r = row(o.source || '');
    r.orders++;
    if (o.status === 'done') r.revenue += orderAmount(o);
  }
  return Object.values(rows).map((r) => ({ ...r, revenue: Math.round(r.revenue) })).sort((a, b) => b.open - a.open || b.orders - a.orders);
}

const RESERVED_START = /^(order|orders|o\d+|\d+)$/;

export class MiniError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const plain = (html) => String(html || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const clean = (v, max) => String(v ?? '').replace(/\r/g, '').trim().slice(0, max);

// --- Підписані посилання на медіа (стікери вітрини, приклади стилів, ескізи) ---

function secret() {
  const c = (store.data.config.miniapp ||= {});
  if (!c.secret) { c.secret = crypto.randomBytes(24).toString('hex'); store.save(); }
  return c.secret;
}
export function mediaUrl(ref) {
  const body = Buffer.from(JSON.stringify(ref)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url').slice(0, 22);
  return `m/${body}.${sig}`;
}
export function readMediaToken(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig || body.length > 600) return null;
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url').slice(0, 22);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
}

/** Талон на завантажене фото: лише той, хто завантажив, може вкласти його в бриф чи ескізи. */
export function refToken(uid, fileId) {
  const body = Buffer.from(fileId).toString('base64url');
  return `${body}.${crypto.createHmac('sha256', secret()).update(`ref:${uid}:${body}`).digest('base64url').slice(0, 22)}`;
}
export function readRefToken(uid, token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig || body.length > 400) return null;
  const expected = crypto.createHmac('sha256', secret()).update(`ref:${uid}:${body}`).digest('base64url').slice(0, 22);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return Buffer.from(body, 'base64url').toString('utf8');
}
export function refsFrom(uid, tokens, max = 10) {
  return (Array.isArray(tokens) ? tokens : []).slice(0, max).map((t) => readRefToken(uid, t)).filter(Boolean)
    .map((fileId) => ({ type: 'photo', fileId }));
}

/** Вкладення повідомлення → посилання для Mini App (файли понад 20 МБ бот завантажити не може). */
export function mediaItem(x) {
  const big = (x.size || 0) > 20 * 1024 * 1024;
  if (x.type === 'photo' || x.type === 'sticker') return { kind: 'img', url: mediaUrl({ k: 'tg', f: x.fileId }) };
  if (['video', 'animation', 'video_note'].includes(x.type)) return big ? { kind: 'file', name: 'video' } : { kind: 'video', url: mediaUrl({ k: 'tg', f: x.fileId }) };
  if (x.type === 'voice' || x.type === 'audio') return { kind: 'audio', url: mediaUrl({ k: 'tg', f: x.fileId }) };
  return { kind: 'file', name: x.name || 'file', size: x.size || 0, ...(big ? {} : { url: mediaUrl({ k: 'doc', f: x.fileId, n: x.name || 'file' }) }) };
}

/** Рахунок і акт для клієнта: якщо власник увімкнув, є реквізити студії й ціна. */
function clientDocsFor(o) {
  const c = store.data.config.company || {};
  if (!c.clientDocs || !c.name || !orderAmount(o) || ['rejected', 'cancelled'].includes(o.status)) return null;
  const b = o.billing || {};
  return {
    billing: { name: b.name || '', code: b.code || '', address: b.address || '', signer: b.signer || '' },
    invoice: mediaUrl({ k: 'docpdf', o: o.id, d: 'invoice', u: o.userId }),
    act: o.status === 'done' ? mediaUrl({ k: 'docpdf', o: o.id, d: 'act', u: o.userId }) : null,
  };
}

// --- Подання замовлення для клієнта ---

function steps(o) {
  if (o.status === 'rejected' || o.status === 'cancelled') return [{ key: 'brief', state: 'done' }, { key: o.status, state: 'fail' }];
  const s = o.sketches?.at(-1);
  const sketch = !s ? 'todo' : s.status === 'approved' ? 'done' : 'now';
  return [
    { key: 'brief', state: 'done' },
    { key: 'designer', state: o.status === 'new' ? 'now' : 'done' },
    ...(o.status === 'done' && !s ? [] : [{ key: s?.status === 'changes' ? 'changes' : 'sketches', state: o.status === 'done' ? 'done' : sketch }]),
    { key: 'done', state: o.status === 'done' ? 'done' : 'todo' },
  ];
}

/**
 * Скільки повідомлень студії клієнт ще не бачив: після останнього відкриття чату в Mini App
 * чи його власної відповіді. Лише для відкритих замовлень і лише нові (з моменту появи функції).
 */
function unreadFor(o) {
  if (!isOpen(o)) return 0;
  const since = (store.data.stats.clientUnreadSince ||= new Date().toISOString());
  const lastClient = (o.messages || []).filter((m) => m.from === 'client').at(-1)?.at || '';
  const seen = [since, o.clientSeenAt || '', lastClient].sort().at(-1);
  return (o.messages || []).filter((m) => m.from !== 'client' && m.at > seen).length;
}

function clientOrder(o, settings) {
  const q = (o.quotes || []).filter((x) => x.status === 'sent' || x.status === 'question').at(-1);
  const s = o.sketches?.at(-1);
  const idx = (o.payments || []).length - 1;
  const p = o.payments?.[idx];
  const pay = p && PAY_OPEN.has(p.status) ? {
    idx, method: p.method === 'card' ? 'card' : 'mono', amount: p.amount, kind: p.kind || 'advance', status: p.status,
    ...(p.method === 'card' ? { card: { number: settings.cardNumber, recipient: settings.cardRecipient, note: String(settings.cardNote || '').replace(/\{номер\}/g, orderNo(o.id)) } } : { url: p.pageUrl || null }),
  } : null;
  const files = [
    ...(o.refs || []).filter((r) => r.type === 'photo').slice(0, 30).map((r) => ({ url: mediaUrl({ k: 'tg', f: r.fileId }), from: 'client', kind: 'img' })),
    ...(o.sketches || []).flatMap((sk) => (sk.items || []).filter((i) => i.type === 'photo' || i.type === 'video')
      .map((i) => ({ url: mediaUrl({ k: 'tg', f: i.fileId }), from: 'studio', kind: i.type === 'video' ? 'video' : 'img', round: sk.round, at: sk.sentAt }))),
  ];
  return {
    service: o.service || 'stickers', project: o.project || null, files,
    about: o.service && o.service !== 'stickers' ? o.emotions : '',
    review: o.review ? { rating: o.review.rating, comment: o.review.comment || '', promo: o.reviewPromo || '' } : null,
    docs: clientDocsFor(o),
    canReview: o.status === 'done' && !o.review?.comment,
    finals: (o.finals || []).map((f) => ({
      kind: f.kind, name: f.name, size: f.size || 0, at: f.at,
      ...(f.kind === 'link' ? { url: f.url } : f.fileId && (f.size || 0) <= 20 * 1024 * 1024 ? { dl: mediaUrl({ k: 'doc', f: f.fileId, n: f.name }) } : {}),
    })),
    messages: (o.messages || []).slice(-60).map((m) => ({
      at: m.at, from: m.from === 'client' ? 'client' : 'studio', by: m.by || '',
      // «[фото] підпис» → лише підпис, бо саме фото покажемо
      text: m.media?.length ? String(m.text || '').replace(/^\[[^\]]*\]\s?/, '') : m.text,
      media: (m.media || []).slice(0, 10).map(mediaItem),
    })),
    id: o.id, no: orderNo(o.id), type: o.stickerType, qty: o.quantity, hero: o.hero, status: o.status,
    typeKey: o.typeKey || (/аніма|animat/i.test(o.stickerType || '') ? 'animated' : 'static'), styleId: o.style?.id || '', contact: o.contact || '',
    createdAt: o.createdAt, takenAt: o.takenAt || null, doneAt: o.doneAt || null, sketchAt: o.sketches?.at(-1)?.sentAt || null, steps: steps(o), repeatOf: o.repeatOf ? orderNo(o.repeatOf.id) : null,
    deadline: isOpen(o) ? o.studio?.deadline || '' : '',
    unread: unreadFor(o),
    fixUntil: fixAllowed(o) ? dateText(fixAllowed(o).slice(0, 10)) : null,
    fixOpen: openFix(o) ? { at: openFix(o).at, text: openFix(o).text } : null,
    fixDone: (o.fixes || []).filter((f) => f.status === 'done').length,
    payPlan: ['rejected', 'cancelled'].includes(o.status) ? null : stagePlanView(o),
    stage: ['rejected', 'cancelled'].includes(o.status) ? null : projectStage(o),
    pack: o.pack ? { name: o.pack.name, title: o.pack.title } : null,
    price: orderAmount(o) || null, paid: paidTotal(o),
    quote: q && isOpen(o) ? { n: q.n, amount: q.amount, items: q.items || '', comment: q.comment || '', due: q.due ? dateText(q.due) : '', days: q.days || 0, status: q.status } : null,
    sketch: s && s.status === 'pending' && isOpen(o) ? {
      round: s.round, comment: s.comment || '',
      media: (s.items || []).filter((i) => i.type === 'photo' || i.type === 'video').slice(0, 10)
        .map((i) => ({ url: mediaUrl({ k: 'tg', f: i.fileId }), video: i.type === 'video' })),
      files: (s.items || []).filter((i) => i.type !== 'photo' && i.type !== 'video').length,
    } : null,
    pay,
    canCancel: o.status === 'new',
  };
}

export class MiniApi {
  constructor(runtime) {
    this.runtime = runtime;
  }

  get h() {
    const h = this.runtime.handlers;
    if (!h || !this.runtime.ready) throw new MiniError('Бот перезапускается — попробуйте через минуту.', 503);
    return h;
  }

  get data() { return store.data; }

  /** Чи може людина зараз надіслати заявку; повертає текст причини або null. */
  briefBlocked(userId) {
    const h = this.h;
    const L = textsFor(userId);
    if (this.data.config.active === false) return plain(L.PAUSED);
    const v = h.vacation();
    if (v.active && !v.acceptOrders) return plain(h.vacationText(userId, true));
    const today = todayKey();
    const n = this.data.inquiries.filter((o) => String(o.userId) === String(userId) && todayKey(new Date(o.createdAt)) === today).length;
    if (n >= 3 && !h.isOwnerChat(userId)) return plain(L.MSG.tooManyOrders).replace('напишіть сюди', 'напишіть у чат бота').replace('write here', 'write in the bot chat');
    return null;
  }

  boot(from) {
    const h = this.h;
    h.touchUser(from);
    const aiChat = chatOn() ? aiHistory(from.id) : null;
    funnelHit(from.id, 'open');
    store.save();
    const uid = from.id;
    const lang = langOf(uid);
    const prices = this.data.config.prices || {};
    const priceRows = {};
    for (const t of T.PRICE_TYPE_KEYS) {
      priceRows[t] = Object.fromEntries(Object.keys(T.OPTIONS.qty).filter((q) => q !== T.CUSTOM)
        .map((q) => [q, T.priceFor(prices, t, q)]).filter(([, v]) => v));
    }
    const settings = h.payments.settings();
    const v = h.vacation();
    return {
      aiChat,
      lang, english: englishEnabled(), firstName: from.first_name || '',
      support: (this.data.config.miniapp || {}).support || '',
      aiIdeas: aiAvailable('briefIdeas'),
      queue: queueEstimate(),
      replyTime: clientReplyTime(),
      reviewPromo: reviewPromoSettings().enabled ? reviewPromoSettings().percent : null,
      banner: (() => {
        const b = (this.data.config.miniapp || {}).banner;
        if (!b?.enabled || !b.title || (b.until && b.until < todayKey())) return null;
        return { id: b.id || '', title: b.title, titleEn: b.titleEn || '', text: b.text || '', textEn: b.textEn || '', promo: b.promo || '', until: b.until ? dateText(b.until) : '' };
      })(),
      referral: (() => {
        const ref = this.data.config.referral;
        if (!ref?.enabled || !this.data.bot?.username) return null;
        const u = this.data.users[String(uid)] || {};
        // Посилання — лише після першого готового замовлення
        if (!h.canInvite(uid)) return { locked: true, percent: ref.percent || 10 };
        return {
          link: h.referralLink(uid), percent: ref.percent || 10,
          invited: Object.values(this.data.users).filter((x) => String(x.referredBy) === String(uid)).length,
          ordered: this.data.inquiries.filter((o) => String(o.referral?.by) === String(uid)).length,
          bonuses: u.bonuses || 0,
        };
      })(),
      reviews: (() => {
        const list = publishedReviews();
        const all = this.data.inquiries.filter((o) => o.review?.rating);
        return {
          avg: all.length ? Math.round((all.reduce((s, o) => s + o.review.rating, 0) / all.length) * 10) / 10 : null,
          count: all.length,
          items: list.slice(0, 20).map((r) => ({ rating: r.rating, comment: (r.comment || '').slice(0, 400), name: r.name, service: r.service, at: r.at })),
        };
      })(),
      bot: this.data.bot?.username || '',
      brief: { blocked: this.briefBlocked(uid), vacation: v.active ? plain(h.vacationText(uid)) : null },
      contact: from.username ? `@${from.username}` : '',
      prices: { rows: priceRows, note: clean(prices.note, 500) },
      packages: activePackages().map((p) => ({ id: p.id, name: p.name, nameEn: p.nameEn || '', type: p.type, qty: p.qty, price: p.price, days: p.days || 0, items: p.items || '', itemsEn: p.itemsEn || '' })),
      styles: activeStyles().map((s) => ({ id: s.id, name: s.name, nameEn: s.nameEn || '', img: mediaUrl({ k: 'up', u: s.image }) })),
      works: catalog().map((c) => ({
        id: c.id, name: c.name, title: c.title, count: c.count, format: c.format, description: c.description || '',
        // Відеостікер: саме відео + прозора мініатюра (iPhone/Mac не показують прозорість у WebM — їм мініатюра)
        previews: (c.previewIds || []).slice(0, 4).map((f) => ({
          url: mediaUrl({ k: 'st', f, s: c.name, fmt: c.format }), video: c.format === 'video',
          ...(c.format === 'video' ? { thumb: mediaUrl({ k: 'st', f, s: c.name, fmt: 'thumb' }) } : {}),
        })),
      })),
      faq: faqList().map((f) => ({ id: f.id, q: f.q, a: f.a, qEn: f.qEn || '', aEn: f.aEn || '' })),
      services: activeServices().map((s) => ({
        id: s.id, img: `a/${s.img}`, priceFrom: s.priceFrom, name: s.name, nameEn: s.nameEn, one: s.one, oneEn: s.oneEn,
        tagline: s.tagline, taglineEn: s.taglineEn, chips: s.chips, chipsEn: s.chipsEn, intro: s.intro, introEn: s.introEn,
        perks: s.perks, perksEn: s.perksEn, includes: s.includes, includesEn: s.includesEn, steps: s.steps, stepsEn: s.stepsEn, packages: s.packages || [],
        examples: (s.examples || []).map((e, idx) => ({ idx, img: mediaUrl({ k: 'up', u: e.image }), caption: e.caption, captionEn: e.captionEn })),
      })),
      profile: (() => {
        const u = this.data.users[String(uid)] || {};
        return { firstName: from.first_name || '', lastName: from.last_name || '', username: from.username || '', photo: from.photo_url || '', contact: u.contact || '', notify: !u.unsubscribed, since: u.firstSeenAt || null };
      })(),
      orders: this.data.inquiries.filter((o) => o.userId === uid).slice(-20).reverse().map((o) => clientOrder(o, settings)),
    };
  }

  /** Бриф однією формою — та сама заявка, що й з чату. */
  async brief(from, body) {
    const h = this.h;
    const uid = from.id;
    h.touchUser(from);
    const blocked = this.briefBlocked(uid);
    if (blocked) throw new MiniError(blocked);
    const L = textsFor(uid);
    if (body.service && body.service !== 'stickers') return this.projectBrief(from, body);
    const repeatOf = this.repeatSource(uid, body.repeatOf);
    const typeKey = ['static', 'animated'].includes(body.typeKey) ? body.typeKey : null;
    if (!typeKey) throw new MiniError(lang(uid, 'Оберіть тип стікерів.', 'Choose the sticker type.'));
    const d = { refs: refsFrom(uid, body.refs), typeKey, stickerType: L.OPTIONS.type[typeKey], ...(repeatOf ? { repeatOf } : {}), ...this.likeFrom(body.like, 'stickers') };
    const pkg = body.packageId && activePackages(typeKey).find((p) => p.id === body.packageId);
    if (pkg) {
      Object.assign(d, { package: { id: pkg.id, name: pkg.name, nameEn: pkg.nameEn || '', price: pkg.price }, quantity: L.OPTIONS.qty[pkg.qty] || pkg.qty, priceHint: L.money(pkg.price) });
      if (L.OPTIONS.qty[pkg.qty]) d.qtyKey = pkg.qty;
    } else if (Object.hasOwn(T.OPTIONS.qty, String(body.qtyKey)) && body.qtyKey !== T.CUSTOM) {
      d.qtyKey = String(body.qtyKey);
      d.quantity = L.OPTIONS.qty[d.qtyKey];
      const price = T.priceFor(this.data.config.prices, typeKey, d.qtyKey);
      if (price) d.priceHint = price;
    } else {
      d.quantity = clean(body.qtyCustom, MAX_SHORT);
      if (!d.quantity) throw new MiniError(lang(uid, 'Вкажіть кількість стікерів.', 'Specify the number of stickers.'));
    }
    d.hero = clean(body.hero, MAX_TEXT);
    d.emotions = clean(body.emotions, MAX_TEXT);
    if (d.hero.length < 2) throw new MiniError(lang(uid, 'Опишіть головного героя.', 'Describe the main character.'));
    if (d.emotions.length < 2) throw new MiniError(lang(uid, 'Опишіть емоції та фрази.', 'Describe the emotions and phrases.'));
    const styles = activeStyles();
    if (styles.length) {
      const st = styles.find((s) => s.id === body.styleId);
      d.style = st ? { id: st.id, name: st.name, nameEn: st.nameEn || '' } : { id: 'any', name: T.STYLE_ANY, nameEn: textsFor('en').STYLE_ANY };
    }
    d.contact = clean(body.contact, MAX_SHORT) || (from.username ? `@${from.username}` : '');
    if (body.aiIdeas) d.aiIdeas = true;
    const user = this.data.users[String(uid)] || {};
    const code = clean(body.promo, 40) || user.pendingPromo;
    const promo = code && findPromo(code, uid);
    if (clean(body.promo, 40) && !promo) throw new MiniError(lang(uid, 'Промокод не діє.', 'The promo code is not valid.'));
    if (promo) d.promo = { code: promo.code, percent: promo.percent };
    if (user.pendingGift) d.gift = { code: user.pendingGift };
    delete this.data.drafts[String(uid)]; // незавершений бриф у чаті більше не потрібен
    if (this.data.users[String(uid)]) delete this.data.users[String(uid)].appDraft;
    h.bump('starts');
    h.funnel('start');
    h.funnel('type');
    const order = await h.submitOrder(from, uid, d);
    if (order) { order.via = 'app'; funnelHit(uid, 'sent'); store.save(); }
    log.info(`Заявка #${order ? orderNo(order.id) : '?'} отправлена из Mini App`);
    return { ok: true, no: order ? orderNo(order.id) : null };
  }

  /**
   * «Хочу так само»: приклад роботи послуги (за номером у списку) чи стікерпак із каталогу.
   * Повертає поля для заявки: likeExample (картинка з прикладів) або catalogRef (стікерпак).
   */
  likeFrom(like, service) {
    if (!like || typeof like !== 'object') return {};
    if (like.kind === 'pack') {
      const c = catalog().find((x) => String(x.id) === String(like.id));
      return c && service === 'stickers' ? { catalogRef: { name: c.name, title: c.title } } : {};
    }
    if (like.kind === 'example' && like.service === service) {
      const e = (serviceSettings()[service]?.examples || [])[Number(like.idx)];
      if (e?.image) return { likeExample: { service, image: e.image, caption: e.caption || '' } };
    }
    return {};
  }

  /** Заявка на Telegram-бота чи персонажа: назва, опис, дедлайн, бюджет, що потрібно, референси. */
  async projectBrief(from, body) {
    const h = this.h;
    const uid = from.id;
    const svc = activeServices().find((s) => s.id === body.service);
    if (!svc) throw new MiniError(lang(uid, 'Ця послуга зараз недоступна.', 'This service is not available now.'));
    const title = clean(body.title, 120);
    const description = clean(body.description, MAX_TEXT);
    if (title.length < 2) throw new MiniError(lang(uid, 'Вкажіть назву проєкту.', 'Enter the project name.'));
    if (description.length < 10) throw new MiniError(lang(uid, 'Опишіть проєкт трохи детальніше.', 'Describe the project in a bit more detail.'));
    const need = Object.hasOwn(NEEDS, body.need) ? body.need : 'new';
    const deadline = validDate(body.deadline) && body.deadline >= todayKey() ? dateText(body.deadline) : '';
    const budget = clean(body.budget, 60);
    const pkg = findServicePackage(svc.id, body.packageId);
    const d = {
      service: svc.id, project: { need, deadline, budget },
      stickerType: svc.one, typeKey: null, quantity: NEEDS[need], hero: title, emotions: description,
      priceHint: pkg?.price ? `${T.money(pkg.price)}+` : budget || null, refs: refsFrom(uid, body.refs),
      ...(pkg ? { package: { id: pkg.id, name: pkg.name, nameEn: pkg.nameEn || '', price: pkg.price } } : {}),
      ...this.likeFrom(body.like, svc.id),
      ...(this.repeatSource(uid, body.repeatOf) ? { repeatOf: this.repeatSource(uid, body.repeatOf) } : {}),
      contact: clean(body.contact, MAX_SHORT) || (from.username ? `@${from.username}` : ''),
      ...(body.aiIdeas ? { aiIdeas: true } : {}),
    };
    const user = this.data.users[String(uid)] || {};
    const code = clean(body.promo, 40) || user.pendingPromo;
    const promo = code && findPromo(code, uid);
    if (clean(body.promo, 40) && !promo) throw new MiniError(lang(uid, 'Промокод не діє.', 'The promo code is not valid.'));
    if (promo) d.promo = { code: promo.code, percent: promo.percent };
    h.bump('starts');
    h.funnel('start');
    if (this.data.users[String(uid)]) delete this.data.users[String(uid)].appDraft;
    const order = await h.submitOrder(from, uid, d);
    if (order) { order.via = 'app'; funnelHit(uid, 'sent'); store.save(); }
    log.info(`Заявка #${order ? orderNo(order.id) : '?'} (${svc.name}) отправлена из Mini App`);
    return { ok: true, no: order ? orderNo(order.id) : null, id: order?.id || null };
  }

  /** Реквізити компанії-замовника для рахунку й акта. */
  /** «💡 Допоможіть з ідеями»: емоції для стікерів або опис проєкту. Ліміт — 10 на день. */
  async ideas(from, body) {
    const uid = from.id;
    if (!aiAvailable('briefIdeas')) throw new MiniError(lang(uid, 'Підказки зараз недоступні.', 'Suggestions are not available right now.'));
    const user = this.data.users[String(uid)];
    if (!user) throw new MiniError('Not found', 404);
    const today = todayKey();
    if (user.aiDay !== today) { user.aiDay = today; user.aiCount = 0; }
    if ((user.aiCount || 0) >= AI_DAILY) throw new MiniError(lang(uid, 'На сьогодні підказки закінчились 🙂 Спробуйте завтра або напишіть своїми словами.', 'That is all the suggestions for today 🙂 Try tomorrow or write it in your own words.'));
    if (aiBusy.has(uid)) throw new MiniError(lang(uid, 'Вже думаю над ідеями…', 'Already thinking…'));
    const lng = langOf(uid) === 'en' ? 'en' : 'uk';
    const stickers = (body.service || 'stickers') === 'stickers';
    if (stickers && clean(body.hero, MAX_TEXT).length < 2) throw new MiniError(lang(uid, 'Спершу опишіть головного героя — під нього підберемо емоції.', 'Describe the main character first — we will match emotions to it.'));
    if (!stickers && clean(body.title, 120).length < 2) throw new MiniError(lang(uid, 'Спершу вкажіть назву проєкту.', 'Enter the project name first.'));
    if (!takeClientAi()) throw new MiniError(lang(uid, 'Підказки на сьогодні закінчились 🙂 Спробуйте завтра або напишіть своїми словами.', 'That is all the suggestions for today 🙂 Try tomorrow or write it in your own words.'));
    aiBusy.add(uid);
    user.aiCount = (user.aiCount || 0) + 1;
    try {
      let text;
      if (stickers) {
        const avoid = String(body.current || '').split('\n').map((x) => x.replace(/^\d+\.\s*/, '').replace(/\s*[(«“].*$/, '').trim()).filter(Boolean).slice(0, 30).map((x) => x.slice(0, 40));
        const ideas = await suggestEmotions({
          hero: clean(body.hero, MAX_TEXT), stickerType: (lng === 'en' ? textsFor('en') : T).OPTIONS.type[body.typeKey] || '',
          quantity: clean(body.quantity, MAX_SHORT), lang: lng, avoid,
        });
        text = ideasText(ideas, lng);
      } else {
        const svc = findService(body.service);
        if (!svc || svc.id === 'stickers') throw new MiniError('Not found', 404);
        text = await suggestProjectBrief({
          service: svc.id, title: clean(body.title, 120), need: (lng === 'en' ? NEEDS_EN : NEEDS)[body.need] || '',
          current: clean(body.current, MAX_TEXT), lang: lng,
        });
      }
      log.info(`ИИ-подсказка в Mini App для ${uid} (${stickers ? 'эмоции' : 'описание проекта'})`);
      return { ok: true, text, left: Math.max(0, AI_DAILY - user.aiCount) };
    } catch (err) {
      if (err instanceof MiniError) throw err;
      user.aiCount = Math.max(0, user.aiCount - 1);
      returnClientAi();
      log.warn(`ИИ-подсказка в Mini App не удалась: ${err.message}`);
      store.addError('ai', err);
      throw new MiniError(lang(uid, 'Не вдалося підібрати ідеї — спробуйте ще раз трохи згодом.', 'Could not get suggestions — please try again a bit later.'));
    } finally {
      aiBusy.delete(uid);
    }
  }

  billing(from, body) {
    const o = this.ownOrder(from.id, body.orderId);
    if (!clientDocsFor(o)) throw new MiniError(lang(from.id, 'Документи для цього замовлення недоступні.', 'Documents are not available for this order.'));
    o.billing = { name: clean(body.name, 150), code: clean(body.code, 20), address: clean(body.address, 200), signer: clean(body.signer, 100) };
    store.saveNow();
    return { ok: true };
  }

  /** Відгук про готове замовлення. */
  async review(from, body) {
    const o = this.ownOrder(from.id, body.orderId);
    if (o.status !== 'done') throw new MiniError(lang(from.id, 'Відгук можна залишити, коли замовлення готове.', 'You can leave a review once the order is done.'));
    const rating = Math.round(Number(body.rating));
    if (!(rating >= 1 && rating <= 5) && !o.review?.rating) throw new MiniError(lang(from.id, 'Оберіть оцінку від 1 до 5.', 'Choose a rating from 1 to 5.'));
    const ok = await this.h.reviews.submitFromApp(o, rating, clean(body.comment, 1000));
    if (!ok) throw new MiniError(lang(from.id, 'Відгук уже залишено — дякуємо!', 'Review already left — thank you!'));
    return { ok: true };
  }

  /** Повідомлення дизайнеру з чату замовлення в Mini App. */
  async message(from, body) {
    const o = this.ownOrder(from.id, body.orderId);
    const text = clean(body.text, MAX_TEXT);
    if (!text) throw new MiniError(lang(from.id, 'Напишіть повідомлення.', 'Type a message.'));
    this.h.touchUser(from);
    await this.h.relayToStudio({ message_id: null, from, chat: { id: from.id, type: 'private' }, text }, o);
    return { ok: true };
  }

  /** Джерело з посилання на Mini App (?startapp=мітка) — лише для нових людей без джерела. */
  setSource(from, startParam) {
    const p = String(startParam || '');
    if (!p || RESERVED_START.test(p) || !/^[A-Za-z0-9_-]{1,64}$/.test(p)) return;
    const u = this.data.users[String(from.id)];
    if (u && !u.source) { u.source = p; store.save(); }
  }

  /** «Потрібна правка» після здачі: текст + до 10 фото. */
  async fix(from, body) {
    const o = this.ownOrder(from.id, body.orderId);
    const text = clean(body.text, MAX_TEXT);
    if (text.length < 3) throw new MiniError(lang(from.id, 'Опишіть, що потрібно виправити.', 'Describe what needs fixing.'));
    if (!fixAllowed(o)) throw new MiniError(lang(from.id, 'Правку для цього замовлення вже не можна запросити — напишіть дизайнеру в чат.', 'A fix can no longer be requested for this order — please message the designer.'));
    this.h.touchUser(from);
    await this.h.requestFix(o, text, refsFrom(from.id, body.refs, 10));
    return { ok: true };
  }

  /** Клієнт відкрив чат замовлення — усе прочитано. */
  seen(from, body) {
    const o = this.ownOrder(from.id, body.orderId);
    o.clientSeenAt = new Date().toISOString();
    store.save();
    return { ok: true };
  }

  /** Клієнт приймає етап проєкту або залишає зауваження (з Mini App). */
  async stageAnswer(from, body) {
    const o = this.ownOrder(from.id, body.orderId);
    this.h.touchUser(from);
    const ok = body.ok === true;
    const done = await this.h.answerStage(o, Number(body.idx), ok, { text: ok ? '' : clean(body.text, MAX_TEXT), via: 'app' });
    if (!done) throw new MiniError(lang(from.id, 'Відповідь уже надіслано.', 'The answer has already been sent.'));
    return { ok: true };
  }

  /** Додати фото до замовлення (з екрана «Файли»): у заявку й дизайнеру. */
  async files(from, body) {
    const o = this.ownOrder(from.id, body.orderId);
    const refs = refsFrom(from.id, body.refs, 10);
    if (!refs.length) throw new MiniError(lang(from.id, 'Додайте фото.', 'Add photos.'));
    if ((o.refs || []).length + refs.length > 40) throw new MiniError(lang(from.id, 'Забагато файлів у замовленні.', 'Too many files in the order.'));
    (o.refs ||= []).push(...refs);
    const head = `📎 <b>Нові файли від клієнта</b> · #${orderNo(o.id)}`;
    for (const t of this.h.teamTargets(o)) {
      const extra = t.replyTo ? { reply_parameters: { message_id: t.replyTo, allow_sending_without_reply: true } } : {};
      await this.h.send(t.chatId, head, null, extra).catch(() => {});
      await this.h.sendAlbum(t.chatId, refs.map((r) => ({ type: 'photo', fileId: r.fileId }))).catch(() => {});
    }
    (o.messages ||= []).push({ at: new Date().toISOString(), from: 'client', text: `[файли: ${refs.length} фото]`, media: refs.map((r) => ({ type: 'photo', fileId: r.fileId })) });
    o.unread = (o.unread || 0) + 1;
    store.saveNow();
    return { ok: true };
  }

  /** Крок заявки в Mini App — щоб нагадати, якщо людина не завершить. */
  draft(from, body) {
    this.h.touchUser(from);
    const user = this.data.users[String(from.id)];
    const service = ['stickers', 'bots', 'characters'].includes(body.service) ? body.service : '';
    const step = Math.max(1, Math.min(4, Number(body.step) || 1));
    if (body.clear) delete user.appDraft;
    else {
      user.appDraft = { service, step, at: new Date().toISOString(), reminded: false };
      for (let i = 1; i <= step; i++) funnelHit(from.id, `s${i}`);
    }
    store.save();
    return { ok: true };
  }

  /** Профіль: контакт, сповіщення (розсилки), мова. */
  async profile(from, body) {
    this.h.touchUser(from);
    const user = this.data.users[String(from.id)];
    if ('contact' in body) user.contact = clean(body.contact, MAX_SHORT);
    if ('notify' in body) user.unsubscribed = !body.notify;
    if (body.lang === 'uk' || body.lang === 'en') {
      if (englishEnabled() && user.lang !== body.lang) await this.h.switchLanguage(from.id, from.id, body.lang).catch(() => {});
    }
    store.saveNow();
    return { ok: true };
  }

  /** «Замовити ще» / «Доповнити пак»: посилання на попереднє готове замовлення цієї ж людини. */
  repeatSource(uid, id) {
    if (!id) return null;
    const src = this.data.inquiries.find((x) => x.id === Number(id) && x.userId === uid && x.status === 'done');
    return src ? { id: src.id, packName: src.pack?.name || null, packTitle: src.pack?.title || null } : null;
  }

  ownOrder(uid, id) {
    const o = this.data.inquiries.find((x) => x.id === Number(id) && x.userId === uid);
    if (!o) throw new MiniError(lang(uid, 'Замовлення не знайдено.', 'Order not found.'), 404);
    return o;
  }

  /** «Кнопка» від імені клієнта — для методів, що чекають callback_query. */
  fakeCb(uid) {
    return { id: null, from: { id: uid }, message: { chat: { id: uid }, message_id: null }, data: '' };
  }

  async quote(from, body) {
    const o = this.ownOrder(from.id, body.orderId);
    await this.h.quotes.onDecision(this.fakeCb(from.id), body.accept ? 'qa' : 'qq', this.data.orderEpoch, o.id, String(body.n));
    return { ok: true };
  }

  async sketch(from, body) {
    const o = this.ownOrder(from.id, body.orderId);
    const text = clean(body.text, MAX_TEXT);
    if (!body.approve && text.length < 2) throw new MiniError(lang(from.id, 'Опишіть, що змінити.', 'Describe what to change.'));
    await this.h.sketches.onDecision(this.fakeCb(from.id), body.approve ? 'ap' : 'rv', this.data.orderEpoch, o.id, String(body.round));
    if (!body.approve && this.data.revisionWaits?.[String(from.id)]) {
      await this.h.sketches.onRevisionMessage({ message_id: null, from, chat: { id: from.id, type: 'private' }, text });
    }
    return { ok: true };
  }

  async paid(from, body) {
    const o = this.ownOrder(from.id, body.orderId);
    await this.h.payments.onCardReported(this.fakeCb(from.id), this.data.orderEpoch, o.id, String(body.idx));
    return { ok: true };
  }

  async cancel(from, body) {
    const o = this.ownOrder(from.id, body.orderId);
    if (o.status !== 'new') throw new MiniError(lang(from.id, 'Замовлення вже в роботі — напишіть дизайнеру в чат.', 'The order is already in progress — message the designer in the chat.'));
    const reason = Math.max(0, Math.min(T.CANCEL_REASONS.length - 1, Number(body.reason) || T.CANCEL_REASONS.length - 1));
    await this.h.onCancelButton(this.fakeCb(from.id), `cxr:${this.data.orderEpoch || ''}:${o.id}:${reason}`);
    return { ok: true };
  }

  /** Чат з ІІ-помічником у Mini App (спільна історія з чатом бота). Є відкрите замовлення — пишемо дизайнеру, як раніше. */
  async consult(from, body) {
    const text = clean(body.text, 1000);
    if (text.length < 2) throw new MiniError(lang(from.id, 'Напишіть питання.', 'Type your question.'));
    this.h.touchUser(from);
    const open = this.data.inquiries.filter((o) => o.userId === from.id && isOpen(o)).at(-1);
    if (open || !chatOn()) {
      await this.question(from, { text });
      return { relayed: Boolean(open), forwarded: !open, messages: aiHistory(from.id) };
    }
    const r = await this.h.consult(null, from, text, 'Клієнт пише в Mini App бота (міні-застосунок).');
    if (!r) {
      // Помічник не відповів — передаємо питання студії, як раніше
      const ok = await this.h.forwardQuestion(from.id, from, text);
      if (!ok) throw new MiniError(lang(from.id, 'Не вдалося надіслати — напишіть у чат бота.', 'Could not send — write in the bot chat.'));
      return { forwarded: true, messages: aiHistory(from.id) };
    }
    const suggest = (r.actions || []).filter((a) => a.type === 'suggest').map((a) => String(a.value).trim()).filter((t) => t.length >= 3 && t.length <= 60).slice(0, 3);
    // Розрахунок помічника — картка з ціною й кнопкою оформлення
    const quote = this.h.aiQuote(from.id, r.actions);
    return { messages: aiHistory(from.id), handoff: r.handoff, suggest, quote };
  }

  async question(from, body) {
    const text = clean(body.text, 1000);
    if (text.length < 3) throw new MiniError(lang(from.id, 'Напишіть питання.', 'Type your question.'));
    this.h.touchUser(from);
    const open = this.data.inquiries.filter((o) => o.userId === from.id && isOpen(o)).at(-1);
    if (open) {
      // Є відкрите замовлення — питання йде дизайнеру як звичайне повідомлення по ньому
      await this.h.relayToStudio({ message_id: null, from, chat: { id: from.id, type: 'private' }, text }, open);
      return { ok: true };
    }
    const ok = await this.h.forwardQuestion(from.id, from, text);
    if (!ok) throw new MiniError(lang(from.id, 'Не вдалося надіслати — напишіть у чат бота.', 'Could not send — write in the bot chat.'));
    return { ok: true };
  }
}

function lang(uid, uk, en) {
  return langOf(uid) === 'en' ? en : uk;
}
