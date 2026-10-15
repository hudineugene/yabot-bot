// Журнал дій по заявці: хто й коли змінив статус, ціну, термін, дизайнера, етап, оплату, кошторис, план оплати.
// Порівнюємо «знімок» заявки до й після дії. Зміни, що сталися поза сторінкою й студією Mini App
// (кнопки в Telegram, рішення клієнта, перевірка оплати), записуються під час наступної перевірки з позначкою «Telegram / клиент».
import { store } from './store.js';
import { orderAmount } from './orders.js';
import { dateText } from './util.js';
import { projectStage } from './services.js';

const STATUS = { new: 'новая', in_progress: 'в работе', done: 'готово', rejected: 'отклонена', cancelled: 'отменена' };
const PAY = { created: 'счёт выставлен', processing: 'оплата идёт', hold: 'оплата идёт', awaiting: 'ждём перевод', reported: 'клиент сообщил об оплате', success: 'оплачено', manual: 'отмечено вручную', expired: 'счёт истёк', failure: 'не прошла', cancelled: 'отменён', reversed: 'возврат', voided: 'отметка отменена' };
const QUOTE = { sent: 'отправлена', accepted: 'согласована', question: 'у клиента вопрос', cancelled: 'отменена', replaced: 'заменена' };
export const VIA = { page: 'страница', app: 'студия Mini App', other: 'Telegram / клиент' };
const MAX = 200;

export function auditSnap(o) {
  return {
    status: o.status,
    price: orderAmount(o) || 0,
    due: o.studio?.due || '',
    assignee: o.assigneeName || '',
    stage: Number.isInteger(o.projectStage) ? o.projectStage : null,
    pays: (o.payments || []).map((p) => [p.amount, p.status]),
    quotes: (o.quotes || []).map((q) => [q.amount, q.status]),
    plan: (o.payPlan || []).map((e) => e.percent).join('/'),
    fix: (o.fixes || []).filter((f) => f.status === 'open').length,
  };
}

const money = (n) => `${Number(n).toLocaleString('ru-RU')} грн`;

export function auditDiff(a, b, o) {
  const out = [];
  if (a.status !== b.status) out.push(`статус: ${STATUS[a.status] || a.status} → ${STATUS[b.status] || b.status}`);
  if (a.price !== b.price) out.push(`цена: ${a.price ? money(a.price) : '—'} → ${b.price ? money(b.price) : '—'}`);
  if (a.due !== b.due) out.push(`срок: ${a.due ? dateText(a.due) : '—'} → ${b.due ? dateText(b.due) : '—'}`);
  if (a.assignee !== b.assignee) out.push(`дизайнер: ${a.assignee || '—'} → ${b.assignee || '—'}`);
  if (a.stage !== b.stage && b.stage !== null) out.push(`этап: ${projectStage(o)?.steps[b.stage] || b.stage + 1}`);
  b.pays.forEach(([amount, st], i) => {
    const old = a.pays[i];
    if (!old) out.push(`оплата ${money(amount)}: ${PAY[st] || st}`);
    else if (old[1] !== st) out.push(`оплата ${money(amount)}: ${PAY[old[1]] || old[1]} → ${PAY[st] || st}`);
  });
  b.quotes.forEach(([amount, st], i) => {
    const old = a.quotes[i];
    if (!old) out.push(`смета ${money(amount)}: ${QUOTE[st] || st}`);
    else if (old[1] !== st) out.push(`смета ${money(amount)}: ${QUOTE[st] || st}`);
  });
  if (a.plan !== b.plan) out.push(b.plan ? `план оплаты: ${b.plan.split('/').map((x) => `${x}%`).join(' / ')}` : 'план оплаты убран');
  if (a.fix !== b.fix) out.push(b.fix > a.fix ? 'клиент запросил правку' : 'правка готова');
  return out;
}

/** Порівняти з попереднім знімком і записати зміни (перший раз — лише запам'ятати знімок). */
export function auditRecord(o, who, via) {
  if (!o || o.archived) return false;
  const cur = auditSnap(o);
  const prev = o.auditSnap;
  o.auditSnap = cur;
  if (!prev) return false;
  const changes = auditDiff(prev, cur, o);
  if (!changes.length) return false;
  (o.audit ||= []).push({ at: new Date().toISOString(), who: who || '', via: VIA[via] ? via : 'other', changes });
  if (o.audit.length > MAX) o.audit.splice(0, o.audit.length - MAX);
  return true;
}

/** Загальний журнал: останні записи всіх заявок. */
export function auditFeed(limit = 100) {
  const all = [];
  for (const o of store.data.inquiries) {
    for (const e of o.audit || []) all.push({ ...e, orderId: o.id, client: o.fullName || (o.username ? `@${o.username}` : String(o.userId)) });
  }
  return all.sort((x, y) => y.at.localeCompare(x.at)).slice(0, limit).map((e) => ({ ...e, viaLabel: VIA[e.via] || e.via }));
}
