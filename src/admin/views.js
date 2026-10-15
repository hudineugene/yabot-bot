// Дані для сторінки бота: огляд, заявки, клієнти, брифи в процесі, система.
import fs from 'node:fs';
import path from 'node:path';
import { store } from '../store.js';
import { DATA_FILE, BACKUP_DIR, APP_DIR } from '../config.js';
import { STATUS_LABELS, PAY_STATUS } from '../texts.js';
import { PaymentFlow } from '../payments.js';
import { replyList, fillReply } from '../replies.js';
import { todayKey, plural, formatDate, dateText } from '../util.js';
import {
  isOpen, orderAmount, paidTotal, remaining, isPaid, paidValue, dueState, stageOf, team, memberById,
} from '../orders.js';
import { QUOTE_STATUS } from '../texts.js';
import { aiAvailable } from '../ai.js';
import { findService, projectStage, packageItems, serviceSettings } from '../services.js';
import { stagePlanView } from '../payments.js';
import { waitingSince } from '../sla.js';
import { openFix } from '../fixes.js';

const DAY = 24 * 60 * 60 * 1000;
const STEP_LABELS = {
  type: 'Тип стикеров', qty: 'Количество', hero: 'Главный герой', emotions: 'Эмоции и фразы',
  refs: 'Референсы', contact: 'Контакт', confirm: 'Проверка брифа',
};
const FUNNEL_STEPS = [
  ['start', 'Начали бриф'], ['qty', 'Выбрали тип'], ['hero', 'Выбрали количество'], ['style', 'Описали героя'], ['emotions', 'Дошли до эмоций'],
  ['refs', 'Описали эмоции'], ['contact', 'Прошли референсы'], ['confirm', 'Оставили контакт'], ['sent', 'Отправили заявку'],
];
const STYLE_FUNNEL_FIX = (list) => list.filter((f) => f.key !== 'style' || f.value > 0);

export const DEFAULT_CHECKLIST = ['Ескізи погоджено', 'Відрисовка', 'Анімація / доопрацювання', 'Експорт і перевірка', 'Стікерпак зібрано'];
export function checklistSteps() {
  const c = store.data.config;
  if (!Array.isArray(c.checklist)) c.checklist = DEFAULT_CHECKLIST.slice();
  return c.checklist;
}
const checkProgress = (o) => {
  const steps = checklistSteps();
  return { done: steps.filter((st) => o.checklist?.[st]).length, total: steps.length };
};

let version = null;
function appVersion() {
  if (!version) {
    try { version = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'package.json'), 'utf8')).version; } catch { version = '?'; }
  }
  return version;
}

const clientName = (o) => (o.username ? `@${o.username}` : o.fullName || String(o.userId));

function dayKeys(n) {
  const keys = [];
  for (let i = n - 1; i >= 0; i--) keys.push(todayKey(new Date(Date.now() - i * DAY)));
  return keys;
}

export function overview(runtime) {
  const d = store.data;
  const now = Date.now();
  const counts = { new: 0, in_progress: 0, done: 0, rejected: 0, cancelled: 0 };
  for (const o of d.inquiries) counts[o.status] = (counts[o.status] || 0) + 1;

  const since = (ms) => d.inquiries.filter((o) => now - Date.parse(o.createdAt) < ms).length;
  const daily = d.stats.daily || {};
  const series = dayKeys(30).map((day) => ({ day, ...{ users: 0, starts: 0, orders: 0, done: 0 }, ...(daily[day] || {}) }));
  const sum = (key, days) => series.slice(-days).reduce((s, r) => s + (r[key] || 0), 0);

  const funnelRaw = d.stats.funnel || {};
  const funnel = STYLE_FUNNEL_FIX(FUNNEL_STEPS.map(([key, label]) => ({ key, label, value: funnelRaw[key] || 0 })));

  const staleNew = d.inquiries
    .filter((o) => o.status === 'new' && now - Date.parse(o.createdAt) > DAY)
    .map((o) => ({ id: o.id, client: clientName(o), createdAt: o.createdAt }));
  const longInProgress = d.inquiries
    .filter((o) => o.status === 'in_progress' && o.takenAt && now - Date.parse(o.takenAt) > 14 * DAY)
    .map((o) => ({ id: o.id, client: clientName(o), takenAt: o.takenAt }));
  const errors24h = d.errors.filter((e) => now - Date.parse(e.createdAt) < DAY).length;
  const lastSketch = (o) => o.sketches?.at(-1);
  const sketchChanges = d.inquiries
    .filter((o) => lastSketch(o)?.status === 'changes' && o.status !== 'done' && o.status !== 'rejected')
    .map((o) => ({ id: o.id, client: clientName(o), round: lastSketch(o).round }));
  const sketchWaiting = d.inquiries
    .filter((o) => lastSketch(o)?.status === 'pending' && now - Date.parse(lastSketch(o).sentAt) > 2 * DAY)
    .map((o) => ({ id: o.id, client: clientName(o), round: lastSketch(o).round }));
  const awaitingPayment = d.inquiries
    .filter((o) => ['created', 'processing', 'hold', 'awaiting', 'reported'].includes(o.payments?.at(-1)?.status))
    .map((o) => ({ id: o.id, client: clientName(o), amount: o.payments.at(-1).amount }));
  const paid30 = d.inquiries.flatMap((o) => o.payments || [])
    .filter((p) => (p.status === 'success' || p.status === 'manual') && now - Date.parse(p.paidAt) < 30 * DAY)
    .reduce((s, p) => s + (p.finalAmount || p.amount), 0);
  const unreadChats = d.inquiries
    .filter((o) => o.unread > 0)
    .map((o) => ({ id: o.id, client: clientName(o), unread: o.unread }));
  const dueList = (state) => d.inquiries.filter((o) => dueState(o) === state).map((o) => ({ id: o.id, client: clientName(o), due: o.studio.due }));
  const quoteWaiting = d.inquiries
    .filter((o) => isOpen(o) && o.quotes?.at(-1)?.status === 'question')
    .map((o) => ({ id: o.id, client: clientName(o) }));
  const v = d.config.vacation || {};
  const outage = d.stats.lastOutage && now - Date.parse(d.stats.lastOutage.to) < DAY && d.stats.lastOutage.minutes >= 3 ? d.stats.lastOutage : null;

  return {
    bot: d.bot.username ? `@${d.bot.username}` : null,
    active: d.config.active !== false,
    adminChatId: d.config.adminChatId,
    telegram: runtime.status(),
    lastUpdateAt: d.stats.lastUpdateAt,
    counts,
    orders: { today: d.inquiries.filter((o) => todayKey(new Date(o.createdAt)) === todayKey()).length, week: since(7 * DAY), month: since(30 * DAY), total: d.inquiries.length },
    clients: { total: Object.keys(d.users).length, week: sum('users', 7), blocked: Object.values(d.users).filter((u) => u.blocked).length },
    briefs: { week: sum('starts', 7), active: Object.keys(d.drafts).length },
    reminders: { sent: d.stats.remindersSent || 0, resumed: d.stats.remindersResumed || 0 },
    series,
    funnel,
    unread: unreadChats.reduce((s, o) => s + o.unread, 0),
    reviews: (() => {
      const rated = d.inquiries.filter((o) => o.review?.rating);
      return { count: rated.length, avg: rated.length ? Math.round((rated.reduce((s, o) => s + o.review.rating, 0) / rated.length) * 10) / 10 : null };
    })(),
    historyClearedAt: d.historyClearedAt || null,
    payments: { enabled: Boolean(d.config.payments?.enabled), paid30 },
    attention: {
      staleNew, longInProgress, unreadChats, sketchChanges, sketchWaiting, awaitingPayment, errors24h,
      noRecipient: !d.config.adminChatId, paused: d.config.active === false,
      overdue: dueList('overdue'), dueToday: dueList('today'), dueTomorrow: dueList('tomorrow'), quoteWaiting, outage,
      vacation: v.enabled && (!v.until || v.until >= todayKey()) ? { until: v.until || null, acceptOrders: v.acceptOrders !== false } : null,
    },
  };
}

function orderSummary(o) {
  return {
    id: o.id,
    createdAt: o.createdAt,
    status: o.status,
    statusLabel: STATUS_LABELS[o.status] || o.status,
    client: clientName(o),
    userId: o.userId,
    contact: o.contact,
    stickerType: o.stickerType,
    quantity: o.quantity,
    hero: o.hero,
    source: o.source || null,
    studioPrice: o.studio?.price || '',
    deadline: o.studio?.deadline || '',
    hasNote: Boolean(o.studio?.note),
    refs: (o.refs || []).length,
    unread: o.unread || 0,
    waiting: waitingSince(o),
    fixOpen: Boolean(openFix(o)),
    messagesCount: (o.messages || []).length,
    sketch: o.sketches?.length ? { round: o.sketches.length, status: o.sketches.at(-1).status } : null,
    pack: o.pack ? { name: o.pack.name, title: o.pack.title, count: o.pack.count } : null,
    repeatOf: o.repeatOf?.id || null,
    referral: Boolean(o.referral),
    pay: o.payments?.length ? { status: o.payments.at(-1).status, amount: o.payments.at(-1).amount } : null,
    due: o.studio?.due || null,
    dueState: dueState(o),
    stage: stageOf(o),
    assignee: o.assignee || null,
    assigneeName: o.assigneeName || null,
    amount: orderAmount(o) || null,
    paid: paidTotal(o),
    promo: o.promo?.code || null,
    quote: o.quotes?.length ? o.quotes.at(-1).status : null,
    tags: d().users[String(o.userId)]?.tags || [],
    check: isOpen(o) ? checkProgress(o) : null,
    archived: Boolean(o.archived),
    scheduled: (d().scheduledMessages || []).filter((x) => x.orderId === o.id && x.epoch === (d().orderEpoch || null)).length,
    packageName: o.package?.name || null,
    service: o.service || 'stickers',
    serviceName: findService(o.service || 'stickers')?.name || '',
  };
}

const IMAGE_MIME = /^image\/(jpeg|png|webp)$/;

function sketchesView(o) {
  return (o.sketches || []).map((s) => ({
    round: s.round,
    sentAt: s.sentAt,
    status: s.status,
    decidedAt: s.decidedAt || null,
    comment: s.comment || '',
    feedback: s.feedback || '',
    reminded: Boolean(s.reminded),
    items: s.items.map((it, i) => ({
      index: i,
      type: it.type,
      name: it.name || null,
      preview: it.type === 'photo' || (it.type === 'document' && IMAGE_MIME.test(it.mime || '')),
      inExamples: (o.exampled || []).includes(it.fileId),
    })),
  }));
}

/** Список заявок; дизайнер бачить лише призначені йому. Архівні — лише на запит. */
export function ordersList(session = null, { archived = false } = {}) {
  const all = d().inquiries.slice().reverse().filter((o) => archived || !o.archived);
  if (session?.role !== 'designer') return all.map(orderSummary);
  // Дизайнеру — як у картці заявки: без оплат, промокодів, рефералів, нотаток власника й міток клієнта
  return all.filter((o) => o.assignee === session.memberId).map((o) => {
    const { hasNote, referral, pay, amount, paid, promo, tags, ...rest } = orderSummary(o);
    return { ...rest, tags: [] };
  });
}

export function orderDetail(o) {
  // Архівна заявка — повна версія з archive.json (переписка, історія, ескізи), лише для перегляду
  if (o.archived && !o.archiveEpoch) {
    const full = store.archivedFull(o.id);
    if (full) return { ...orderDetail(full), archived: o.archived };
  }
  const user = d().users[String(o.userId)] || {};
  return {
    ...orderSummary(o),
    username: o.username,
    fullName: o.fullName,
    projectStage: projectStage(o),
    exampled: o.exampled || [],
    audit: (o.audit || []).slice(-40).reverse(),
    fixes: (o.fixes || []).map((f) => ({ at: f.at, text: f.text, photos: (f.refs || []).length, status: f.status, doneAt: f.doneAt || null, by: f.by || '' })),
    payPlan: stagePlanView(o),
    servicePlan: o.service && o.service !== 'stickers' ? serviceSettings()[o.service]?.payPlan || [] : [],
    showcaseConsent: o.showcase?.consent || '',
    emotions: o.emotions,
    priceHint: o.priceHint,
    catalogRef: o.catalogRef,
    likeExample: o.likeExample || null,
    refsList: (o.refs || []).map((r) => ({ type: r.type, name: r.name || null })),
    takenAt: o.takenAt,
    doneAt: o.doneAt,
    history: o.history || [{ at: o.createdAt, status: 'new', by: 'клієнт' }],
    studio: { price: '', deadline: '', note: '', ...(o.studio || {}) },
    messages: o.messages || [],
    sketches: sketchesView(o),
    packInfo: o.pack || null,
    repeatInfo: o.repeatOf || null,
    referralInfo: o.referral ? { ...o.referral, byName: userName(d().users[String(o.referral.by)]) } : null,
    bonusUsed: Boolean(o.bonusUsed),
    clientBonuses: user.bonuses || 0,
    referralPercent: d().config.referral?.percent || 10,
    payments: (o.payments || []).map((p) => ({
      amount: p.amount, finalAmount: p.finalAmount || null, status: p.status, statusLabel: PAY_STATUS[p.status] || p.status, kind: p.kind || 'advance',
      createdAt: p.createdAt, expiresAt: p.expiresAt || null, paidAt: p.paidAt || null, pageUrl: p.pageUrl || null,
      by: p.by || '', deliveryError: p.deliveryError || null, failureReason: p.failureReason || null, voidedAt: p.voidedAt || null,
      method: p.method || null, reportedAt: p.reportedAt || null,
    })),
    payEnabled: Boolean(d().config.payments?.enabled),
    cardEnabled: Boolean(d().config.payments?.cardEnabled && d().config.payments?.cardNumber),
    paySuggest: new PaymentFlow(null).suggest(o),
    clientBlocked: Boolean(user.blocked),
    clientOrders: d().inquiries.filter((x) => x.userId === o.userId).length,
    lang: o.lang === 'en' ? 'en' : 'uk',
    viaPost: o.viaPost || null,
    aiIdeas: Boolean(o.aiIdeas),
    quickReplies: replyList().map((r) => ({ id: r.id, title: r.title, text: fillReply(r, o) })),
    quotes: (o.quotes || []).map((q) => ({ ...q, statusLabel: QUOTE_STATUS[q.status] || q.status })),
    quoteDefaults: {
      amount: orderAmount(o) || o.package?.price || '', due: o.studio?.due || '',
      items: packageItems(o)
        || (o.service && o.service !== 'stickers'
          ? `${o.stickerType}: ${o.hero}\n${(findService(o.service)?.includes || []).join('\n')}`
          : `${o.quantity} — ${String(o.stickerType || '').toLowerCase()} стікери\nДо 2 раундів правок ескізів\nГотовий стікерпак у Telegram`),
    },
    package: o.package || null,
    project: o.project || null,
    finals: (o.finals || []).map((f) => ({ id: f.id, kind: f.kind, name: f.name, size: f.size || 0, url: f.url || null, at: f.at, by: f.by || '', inExamples: (o.exampled || []).includes(f.fileId) })),
    style: o.style || null,
    gift: o.gift || null,
    showcase: o.showcase || null,
    checklist: checklistSteps().map((st) => ({ step: st, at: o.checklist?.[st]?.at || null, by: o.checklist?.[st]?.by || null })),
    billing: o.billing || { name: '', code: '', address: '', signer: '' },
    companySet: Boolean(store.data.config.company?.name),
    channels: (store.data.config.channels || []).map((c) => ({ id: c.id, title: c.title })),
    scheduledList: (store.data.scheduledMessages || []).filter((x) => x.orderId === o.id && x.epoch === (store.data.orderEpoch || null))
      .sort((a, b) => a.at.localeCompare(b.at)).map((x) => ({ id: x.id, text: x.text, at: x.at, by: x.by })),
    packages: (store.data.config.packages || []).filter((p) => p.price > 0).map((p) => ({ id: p.id, name: p.name, price: p.price, days: p.days || 0, items: p.items })),
    aiWriter: aiAvailable('channelWriter'),
    remaining: remaining(o),
    cancel: o.cancel || null,
    team: team().filter((m) => m.active).map((m) => ({ id: m.id, name: m.name })),
    clientTags: user.tags || [],
    clientNote: user.note || '',
    payKinds: { advance: 'Аванс', final: 'Остаток', full: 'Полная оплата', stage: 'Этап', gift: 'Сертификат' },
  };
}

const DESIGNER_FIELDS = [
  'id', 'createdAt', 'status', 'statusLabel', 'client', 'userId', 'contact', 'stickerType', 'quantity', 'hero', 'source', 'refs',
  'unread', 'waiting', 'fixOpen', 'fixes', 'messagesCount', 'sketch', 'pack', 'repeatOf', 'due', 'dueState', 'stage', 'assignee', 'assigneeName', 'check', 'archived',
  'scheduled', 'username', 'fullName', 'emotions', 'priceHint', 'catalogRef', 'likeExample', 'refsList', 'takenAt', 'doneAt', 'history', 'messages',
  'sketches', 'packInfo', 'repeatInfo', 'lang', 'aiIdeas', 'quickReplies', 'quoteDefaults', 'checklist', 'package', 'style',
  'scheduledList', 'packages', 'clientOrders', 'clientBlocked', 'quotes', 'service', 'serviceName', 'project', 'finals', 'projectStage',
];

/** Деталі заявки для дизайнера — лише робочі поля: без оплат, нотаток власника, бонусів, міток клієнта. */
export function orderDetailForDesigner(o) {
  const full = orderDetail(o);
  const out = Object.fromEntries(DESIGNER_FIELDS.filter((k) => k in full).map((k) => [k, full[k]]));
  out.studio = { price: full.studio.price, deadline: full.studio.deadline, due: full.studio.due };
  return { ...out, clientTags: [], payEnabled: false, designerView: true };
}

export function clientsList() {
  const data = d();
  const byUser = new Map();
  for (const o of data.inquiries) {
    const s = byUser.get(o.userId) || { orders: 0, done: 0, last: null };
    s.orders++;
    if (o.status === 'done') s.done++;
    s.last = o.createdAt;
    byUser.set(o.userId, s);
  }
  return Object.values(data.users)
    .map((u) => {
      const s = byUser.get(u.id) || { orders: 0, done: 0, last: null };
      return {
        id: u.id,
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || String(u.id),
        username: u.username || null,
        source: u.source || null,
        firstSeenAt: u.firstSeenAt || null,
        lastSeenAt: u.lastSeenAt || null,
        blocked: Boolean(u.blocked),
        orders: s.orders,
        done: s.done,
        lastOrderAt: s.last,
        inBrief: Boolean(data.drafts[String(u.id)]),
        lang: u.lang === 'en' ? 'en' : 'uk',
        tags: u.tags || [],
        hasNote: Boolean(u.note),
        studioBlocked: Boolean(u.studioBlocked),
        invited: u.invited || 0,
        bonuses: u.bonuses || 0,
        referredBy: u.referredBy ? userName(data.users[String(u.referredBy)]) : null,
        unsubscribed: Boolean(u.unsubscribed),
      };
    })
    .sort((a, b) => (b.lastSeenAt || '').localeCompare(a.lastSeenAt || ''));
}

export function draftsList() {
  const data = d();
  return Object.entries(data.drafts)
    .map(([userId, dr]) => {
      const u = data.users[userId] || {};
      return {
        userId,
        client: u.username ? `@${u.username}` : [u.firstName, u.lastName].filter(Boolean).join(' ') || userId,
        step: STEP_LABELS[dr.step] || dr.step,
        stepIndex: Object.keys(STEP_LABELS).indexOf(dr.step) + 1,
        steps: Object.keys(STEP_LABELS).length,
        startedAt: dr.startedAt,
        updatedAt: dr.updatedAt || dr.startedAt,
        reminded: Boolean(dr.reminded),
        stickerType: dr.data?.stickerType || null,
        quantity: dr.data?.quantity || null,
        hero: dr.data?.hero || null,
        catalogRef: dr.data?.catalogRef?.title || null,
      };
    })
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

export function systemInfo(runtime) {
  const data = d();
  let dataSize = 0;
  try { dataSize = fs.statSync(DATA_FILE).size; } catch { /* немає */ }
  let backups = [];
  try {
    backups = fs.readdirSync(path.join(BACKUP_DIR, 'daily')).filter((f) => f.endsWith('.json')).sort().reverse();
  } catch { /* немає */ }
  return {
    version: appVersion(),
    node: process.version,
    startedAt: data.stats.startedAt,
    uptimeSec: Math.round(process.uptime()),
    dataFile: DATA_FILE,
    dataSize,
    saveMs: store.lastSaveMs || 0,
    orders: data.inquiries.length,
    nextOrderId: data.nextOrderId,
    clients: Object.keys(data.users).length,
    historyClearedAt: data.historyClearedAt || null,
    backups: backups.slice(0, 14),
    telegram: runtime.status(),
    messagesReceived: data.stats.messagesReceived,
    messagesSent: data.stats.messagesSent,
    errors: data.errors.slice(0, 50),
  };
}

/** Скільки людей прийшло за кожною міткою ?start=…, скільки з них надіслали заявки й скільки замовлень готово. */
export function sourcesView() {
  const data = d();
  const rows = new Map();
  const row = (source) => {
    const key = source || '';
    if (!rows.has(key)) rows.set(key, { source: key, users: 0, buyers: new Set(), orders: 0, done: 0 });
    return rows.get(key);
  };
  for (const user of Object.values(data.users)) row(user.source).users++;
  for (const o of data.inquiries) {
    const r = row(o.source);
    r.orders++;
    r.buyers.add(o.userId);
    if (o.status === 'done') r.done++;
  }
  return {
    bot: data.bot.username || null,
    reminders: { sent: data.stats.remindersSent || 0, resumed: data.stats.remindersResumed || 0 },
    rows: [...rows.values()]
      .map(({ buyers, ...r }) => ({ ...r, buyers: buyers.size, title: sourceTitle(data, r.source) }))
      .sort((a, b) => b.users - a.users || b.orders - a.orders),
  };
}

/** Підпис до мітки: p_<id> — пост у каналі, ref — запрошення. */
function sourceTitle(data, source) {
  if (source === 'ref') return 'по приглашению друга';
  if (source === 'channel') return 'кнопка в канале (до статистики постов)';
  const m = /^p_([0-9a-f]{8})$/.exec(source || '');
  if (!m) return null;
  const post = (data.channelPosts || []).find((p) => p.id === m[1]);
  return post ? `пост в «${post.chatTitle}» от ${formatDate(post.sentAt)}: ${(post.text || '').slice(0, 50)}` : 'пост в канале (уже не в истории)';
}

const FORMAT_LABELS = { static: 'статичные', animated: 'анимированные', video: 'видео' };

export function catalogView(items) {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    title: item.title,
    format: FORMAT_LABELS[item.format] || item.format,
    count: `${item.count} ${plural(item.count, ['стикер', 'стикера', 'стикеров'])}`,
    description: item.description,
  }));
}

function userName(u) {
  if (!u) return null;
  return u.username ? `@${u.username}` : [u.firstName, u.lastName].filter(Boolean).join(' ') || String(u.id);
}

const XL_DATE = (iso) => (iso ? new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Kyiv', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(iso)) : '');

/** Аркуші для Excel: заявки й клієнти. */
export function exportSheets() {
  const data = d();
  const SK = { pending: 'на согласовании', approved: 'согласованы', changes: 'правки' };
  const orders = data.inquiries.slice().reverse().map((o) => [
    `#${String(o.id).padStart(4, '0')}`, XL_DATE(o.createdAt), (STATUS_LABELS[o.status] || o.status).replace(/^\S+\s/, ''),
    o.fullName || '', o.username ? `@${o.username}` : '', o.contact || '', o.stickerType, o.quantity, o.hero, o.emotions,
    (o.refs || []).length, o.priceHint || '', o.studio?.price || '', o.studio?.deadline || '', o.studio?.note || '',
    o.source || '', o.sketches?.length ? `v${o.sketches.length}: ${SK[o.sketches.at(-1).status] || ''}` : '',
    o.pack ? `t.me/addstickers/${o.pack.name}` : '', o.review?.rating || '', o.review?.comment || '',
    o.repeatOf ? `#${String(o.repeatOf.id).padStart(4, '0')}` : '', o.referral ? `${o.referral.percent}%` : '',
    XL_DATE(o.doneAt),
    o.payments?.length ? o.payments.at(-1).finalAmount || o.payments.at(-1).amount : '',
    o.payments?.length ? (PAY_STATUS[o.payments.at(-1).status] || '').replace(/^\S+\s/, '') : '',
    XL_DATE(o.payments?.at(-1)?.paidAt),
    orderAmount(o) || '', paidTotal(o) || '', remaining(o) || '', o.studio?.due ? dateText(o.studio.due) : '',
    o.assigneeName || '', o.promo ? `${o.promo.code} (${o.promo.percent}%)` : '', o.cancel?.reason || '',
  ]);
  const byUser = new Map();
  for (const o of data.inquiries) {
    const s = byUser.get(o.userId) || { orders: 0, done: 0 };
    s.orders++;
    if (o.status === 'done') s.done++;
    byUser.set(o.userId, s);
  }
  const clients = Object.values(data.users).map((u) => {
    const s = byUser.get(u.id) || { orders: 0, done: 0 };
    return [
      u.id, [u.firstName, u.lastName].filter(Boolean).join(' '), u.username ? `@${u.username}` : '', u.source || '',
      XL_DATE(u.firstSeenAt), XL_DATE(u.lastSeenAt), s.orders, s.done,
      u.referredBy ? userName(data.users[String(u.referredBy)]) : '', u.invited || 0, u.bonuses || 0,
      u.unsubscribed ? 'да' : '', u.blocked ? 'да' : '', (u.tags || []).join(', '), u.note || '',
    ];
  });
  const col = (header, width) => ({ header, width });
  return [
    {
      name: 'Заявки',
      columns: [col('№', 8), col('Дата', 17), col('Статус', 12), col('Клиент', 20), col('Telegram', 18), col('Контакт', 20),
        col('Тип', 12), col('Кол-во', 10), col('Герой', 34), col('Эмоции и фразы', 46), col('Референсов', 11),
        col('Ориентир цены', 15), col('Цена (студия)', 14), col('Срок', 12), col('Заметка', 30), col('Источник', 11),
        col('Эскизы', 18), col('Стикерпак', 34), col('Оценка', 8), col('Отзыв', 34), col('Доп. к заказу', 12),
        col('Реферал', 9), col('Выполнен', 17), col('Последний платёж, грн', 13), col('Оплата', 18), col('Оплачен', 17),
        col('Цена, грн', 11), col('Оплачено, грн', 12), col('Остаток, грн', 12), col('Срок до', 11), col('Дизайнер', 14),
        col('Промокод', 14), col('Причина отмены', 22)],
      rows: orders,
    },
    {
      name: 'Клиенты',
      columns: [col('Telegram ID', 13), col('Имя', 22), col('Username', 18), col('Источник', 11), col('Первый визит', 17),
        col('Последний визит', 17), col('Заявок', 8), col('Выполнено', 10), col('Пригласил', 16), col('Привёл друзей', 13),
        col('Бонусов', 9), col('Отписан', 9), col('Заблокировал', 13), col('Метки', 20), col('Заметка', 34)],
      rows: clients,
    },
  ];
}

function d() {
  return store.data;
}

// --- Фінанси ---

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function periodRange(period) {
  const today = todayKey();
  const [y, m] = today.split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  if (period === 'prev') {
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    return { from: `${py}-${pad(pm)}-01`, to: `${y}-${pad(m)}-01`, label: `${MONTHS[pm - 1]} ${py}` };
  }
  if (period === '30') return { from: todayKey(new Date(Date.now() - 29 * DAY)), to: '9999', label: 'последние 30 дней' };
  if (period === 'year') return { from: `${y}-01-01`, to: '9999', label: `${y} год` };
  if (period === 'all') return { from: '0000', to: '9999', label: 'всё время' };
  return { from: `${y}-${pad(m)}-01`, to: '9999', label: `${MONTHS[m - 1]} ${y}` };
}

/** Гроші студії за період: отримано, виручка готових заявок, середній чек, борги клієнтів, динаміка за 6 місяців. */
export function financeView(period = 'month') {
  const data = d();
  const range = periodRange(period);
  const inRange = (iso) => {
    if (!iso) return false;
    const k = todayKey(new Date(iso));
    return k >= range.from && k < range.to;
  };
  // Оплата сертифікатом не рахується вдруге — гроші надійшли при продажу сертифіката
  const payments = [
    ...data.inquiries.flatMap((o) => (o.payments || []).filter((p) => isPaid(p) && p.kind !== 'gift').map((p) => ({ o, p }))),
    ...(data.gifts || []).filter((g) => g.paid && g.paidAt).map((g) => ({ o: null, p: { amount: g.amount, paidAt: g.paidAt, status: 'success' } })),
  ];
  const received = payments.filter(({ p }) => inRange(p.paidAt));
  const done = data.inquiries.filter((o) => o.status === 'done' && inRange(o.doneAt));
  const priced = done.filter((o) => orderAmount(o) > 0);
  const revenue = priced.reduce((s, o) => s + orderAmount(o), 0);
  const pipeline = data.inquiries.filter((o) => o.status === 'in_progress' && orderAmount(o) > 0);
  const debts = data.inquiries
    .filter((o) => (o.status === 'in_progress' || o.status === 'done') && remaining(o) > 0)
    .map((o) => ({ id: o.id, client: clientName(o), status: o.status, amount: orderAmount(o), paid: paidTotal(o), remaining: remaining(o), doneAt: o.doneAt }))
    .sort((a, b) => b.remaining - a.remaining);

  // Останні 6 місяців
  const months = [];
  const [y, m] = todayKey().split('-').map(Number);
  for (let i = 5; i >= 0; i--) {
    const mm = ((m - 1 - i) % 12 + 12) % 12;
    const yy = y + Math.floor((m - 1 - i) / 12);
    const key = `${yy}-${String(mm + 1).padStart(2, '0')}`;
    const monthOf = (iso) => (iso ? todayKey(new Date(iso)).slice(0, 7) : '');
    months.push({
      key, label: MONTHS[mm],
      received: Math.round(payments.filter(({ p }) => monthOf(p.paidAt) === key).reduce((s, { p }) => s + paidValue(p), 0)),
      revenue: Math.round(data.inquiries.filter((o) => o.status === 'done' && monthOf(o.doneAt) === key).reduce((s, o) => s + orderAmount(o), 0)),
    });
  }

  // За джерелами — виручка готових заявок за період
  const bySource = {};
  for (const o of priced) {
    const k = o.source || '';
    bySource[k] ||= { source: k, orders: 0, revenue: 0 };
    bySource[k].orders++;
    bySource[k].revenue += orderAmount(o);
  }

  // За послугами — виручка й середній чек готових заявок за період
  const byService = {};
  for (const o of priced) {
    const k = o.service || 'stickers';
    byService[k] ||= { service: k, name: findService(k)?.name || k, orders: 0, revenue: 0 };
    byService[k].orders++;
    byService[k].revenue += orderAmount(o);
  }
  const services = Object.values(byService).map((x) => ({ ...x, revenue: Math.round(x.revenue), avg: Math.round(x.revenue / x.orders) })).sort((a, b) => b.revenue - a.revenue);

  return {
    period, label: range.label, services,
    received: { sum: Math.round(received.reduce((s, { p }) => s + paidValue(p), 0)), count: received.length },
    revenue: Math.round(revenue),
    done: done.length,
    doneNoPrice: done.length - priced.length,
    avgCheck: priced.length ? Math.round(revenue / priced.length) : 0,
    pipeline: { sum: Math.round(pipeline.reduce((s, o) => s + orderAmount(o), 0)), count: pipeline.length },
    debts: { total: Math.round(debts.reduce((s, x) => s + x.remaining, 0)), list: debts.slice(0, 50) },
    months,
    sources: Object.values(bySource).sort((a, b) => b.revenue - a.revenue),
  };
}

// --- Картка клієнта ---

export function clientDetail(u) {
  const data = d();
  const orders = data.inquiries.filter((o) => o.userId === u.id).slice().reverse();
  const reviews = orders.filter((o) => o.review?.rating);
  const allTags = [...new Set(Object.values(data.users).flatMap((x) => x.tags || []))].sort();
  return {
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(' ') || String(u.id),
    username: u.username || null,
    lang: u.lang === 'en' ? 'en' : 'uk',
    source: u.source || null,
    firstSeenAt: u.firstSeenAt || null,
    lastSeenAt: u.lastSeenAt || null,
    blocked: Boolean(u.blocked),
    unsubscribed: Boolean(u.unsubscribed),
    referredBy: u.referredBy ? userName(data.users[String(u.referredBy)]) : null,
    invited: u.invited || 0,
    bonuses: u.bonuses || 0,
    tags: u.tags || [],
    note: u.note || '',
    studioBlocked: Boolean(u.studioBlocked),
    allTags,
    stats: {
      orders: orders.length,
      done: orders.filter((o) => o.status === 'done').length,
      amount: Math.round(orders.filter((o) => o.status !== 'rejected' && o.status !== 'cancelled').reduce((s, o) => s + orderAmount(o), 0)),
      paid: Math.round(orders.reduce((s, o) => s + paidTotal(o), 0)),
      rating: reviews.length ? Math.round((reviews.reduce((s, o) => s + o.review.rating, 0) / reviews.length) * 10) / 10 : null,
    },
    orders: orders.map(orderSummary),
    reviews: reviews.map((o) => ({ orderId: o.id, rating: o.review.rating, comment: o.review.comment || '' })),
  };
}

// --- Команда ---

export function teamView() {
  const data = d();
  return {
    bot: data.bot.username || null,
    members: team().map((m) => {
      const mine = data.inquiries.filter((o) => o.assignee === m.id);
      return {
        id: m.id, name: m.name, login: m.login, telegramId: m.telegramId || null, active: m.active !== false, createdAt: m.createdAt, services: m.services || [],
        open: mine.filter(isOpen).length, done: mine.filter((o) => o.status === 'done').length,
      };
    }),
  };
}

export { memberById };

// --- Показники роботи студії ---

const median = (arr) => {
  if (!arr.length) return null;
  const a = arr.slice().sort((x, y) => x - y);
  return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
};
const avg = (arr) => (arr.length ? arr.reduce((s2, x) => s2 + x, 0) / arr.length : null);
const round1 = (x) => (x === null ? null : Math.round(x * 10) / 10);

/** Перша дія студії по заявці: зміна статусу, повідомлення, кошторис, ескізи. */
function firstResponseAt(o) {
  const times = [
    ...(o.history || []).filter((h) => h.by !== 'клієнт' && h.by !== 'клиент' && h.status !== 'new').map((h) => h.at),
    ...(o.messages || []).filter((m) => m.from === 'studio').map((m) => m.at),
    ...(o.quotes || []).map((q) => q.sentAt),
    ...(o.sketches || []).map((x) => x.sentAt),
  ].map((t) => Date.parse(t)).filter((t) => t > Date.parse(o.createdAt));
  return times.length ? Math.min(...times) : null;
}

export function analyticsView(period = 'month') {
  const data = d();
  const { from, to, label } = (function range() {
    const today = todayKey();
    const [y, m] = today.split('-').map(Number);
    const pad = (n) => String(n).padStart(2, '0');
    if (period === 'prev') { const py = m === 1 ? y - 1 : y; const pm = m === 1 ? 12 : m - 1; return { from: `${py}-${pad(pm)}-01`, to: `${y}-${pad(m)}-01`, label: 'прошлый месяц' }; }
    if (period === '30') return { from: todayKey(new Date(Date.now() - 29 * DAY)), to: '9999', label: '30 дней' };
    if (period === 'year') return { from: `${y}-01-01`, to: '9999', label: `${y} год` };
    if (period === 'all') return { from: '0000', to: '9999', label: 'всё время' };
    return { from: `${y}-${pad(m)}-01`, to: '9999', label: 'этот месяц' };
  }());
  const inRange = (iso) => { if (!iso) return false; const k = todayKey(new Date(iso)); return k >= from && k < to; };
  const created = data.inquiries.filter((o) => inRange(o.createdAt));
  const done = data.inquiries.filter((o) => o.status === 'done' && inRange(o.doneAt));

  const responseHours = created.map((o) => { const t = firstResponseAt(o); return t ? (t - Date.parse(o.createdAt)) / 3600000 : null; }).filter((x) => x !== null);
  const quotes = data.inquiries.flatMap((o) => (o.quotes || []).filter((q) => inRange(q.sentAt)));
  const decided = quotes.filter((q) => q.status === 'accepted' || q.status === 'question' || q.status === 'superseded');
  const accepted = quotes.filter((q) => q.status === 'accepted').length;
  const rounds = done.filter((o) => o.sketches?.length).map((o) => o.sketches.length);
  const days = done.map((o) => (Date.parse(o.doneAt) - Date.parse(o.createdAt)) / DAY);
  const cancelled = data.inquiries.filter((o) => o.status === 'cancelled' && inRange(o.doneAt));
  const rejected = data.inquiries.filter((o) => o.status === 'rejected' && inRange(o.doneAt));
  const reasons = {};
  for (const o of cancelled) reasons[o.cancel?.reason || '—'] = (reasons[o.cancel?.reason || '—'] || 0) + 1;
  let starts = 0;
  for (const [day, v] of Object.entries(data.stats.daily || {})) if (day >= from && day < to) starts += v.starts || 0;

  const designers = team().map((m) => {
    const mine = done.filter((o) => o.assignee === m.id);
    const rated = mine.filter((o) => o.review?.rating);
    return {
      name: m.name, done: mine.length, open: data.inquiries.filter((o) => o.assignee === m.id && isOpen(o)).length,
      avgDays: round1(avg(mine.map((o) => (Date.parse(o.doneAt) - Date.parse(o.createdAt)) / DAY))),
      rating: rated.length ? round1(avg(rated.map((o) => o.review.rating))) : null,
    };
  });
  const rated = done.filter((o) => o.review?.rating);
  return {
    label,
    orders: created.length,
    starts,
    briefConversion: starts ? Math.round((created.length / starts) * 100) : null,
    firstResponse: { avg: round1(avg(responseHours)), median: round1(median(responseHours)), count: responseHours.length },
    quotes: { sent: quotes.length, accepted, rate: decided.length ? Math.round((accepted / decided.length) * 100) : null },
    sketchRounds: round1(avg(rounds)),
    daysToDone: { avg: round1(avg(days)), median: round1(median(days)) },
    done: done.length,
    rating: rated.length ? round1(avg(rated.map((o) => o.review.rating))) : null,
    cancelled: cancelled.length, rejected: rejected.length,
    reasons: Object.entries(reasons).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    designers,
    winback: data.stats.winback || { sent: 0, returned: 0 },
  };
}
