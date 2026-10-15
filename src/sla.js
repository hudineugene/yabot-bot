// Відповіді клієнтам: хто чекає відповіді, нагадування студії й «Зазвичай відповідаємо за ~N хв» для клієнта.
import { store } from './store.js';
import { isOpen } from './orders.js';

export const SLA_DEFAULTS = { enabled: true, hours: 2, escalateHours: 4, showTime: true };

export function slaSettings() {
  const c = store.data.config;
  c.replyAlert = { ...SLA_DEFAULTS, ...(c.replyAlert || {}) };
  return c.replyAlert;
}

// Службові записи студії («[рахунок…]», «[етап…]») — це не відповідь людини
const isService = (m) => /^\[/.test(String(m.text || '')) || /^🚀 /.test(String(m.text || ''));
// Події від клієнта, які не чекають відповіді: оплатив, погодив смету чи ескізи
const isClientEvent = (m) => /^\[(аванс оплачен|оплата получена|согласовал )/.test(String(m.text || ''));
const awaitsReply = (m) => m.from === 'client' && !isClientEvent(m);

/** Час першого повідомлення клієнта, на яке студія ще не відповіла (або null). */
export function waitingSince(o) {
  if (!isOpen(o) || o.archived) return null;
  let since = null;
  for (const m of o.messages || []) {
    if (m.from === 'client') { if (awaitsReply(m)) since ||= m.at; }
    else if (!isService(m)) since = null;
  }
  return since;
}

let cache = { at: 0, value: null };

/** Медіана часу відповіді студії за 30 днів (хвилини) і кількість випадків. */
export function responseStats(days = 30) {
  if (Date.now() - cache.at < 10 * 60 * 1000 && cache.value) return cache.value;
  const from = Date.now() - days * 86400000;
  const samples = [];
  for (const o of store.data.inquiries) {
    let start = null;
    for (const m of o.messages || []) {
      const t = Date.parse(m.at);
      if (!(t >= from)) { if (m.from === 'client') start = null; continue; }
      if (m.from === 'client') { if (awaitsReply(m)) start ??= t; continue; }
      if (start !== null && !isService(m)) { samples.push((t - start) / 60000); start = null; }
    }
  }
  samples.sort((a, b) => a - b);
  const median = samples.length ? samples[Math.floor((samples.length - 1) / 2)] : null;
  cache = { at: Date.now(), value: { median: median === null ? null : Math.round(median), samples: samples.length } };
  return cache.value;
}

export function resetResponseCache() { cache = { at: 0, value: null }; }

/** Для клієнта: орієнтовний час відповіді в хвилинах або null (вимкнено, мало даних чи довше доби). */
export function clientReplyTime() {
  if (!slaSettings().showTime) return null;
  const r = responseStats();
  if (r.samples < 5 || r.median === null || r.median > 24 * 60) return null;
  return Math.max(5, r.median);
}

export function slaView() {
  return { ...slaSettings(), stats: responseStats() };
}

export function saveSla(body) {
  const s = slaSettings();
  const hours = Number(body.hours), esc = Number(body.escalateHours);
  if (!(hours >= 0.5 && hours <= 48)) throw new Error('Через сколько часов напоминать — от 0,5 до 48.');
  if (!(esc >= hours && esc <= 96)) throw new Error('Владельцу — не раньше, чем дизайнеру, и не позже 96 часов.');
  Object.assign(s, { enabled: Boolean(body.enabled), hours: Math.round(hours * 2) / 2, escalateHours: Math.round(esc * 2) / 2, showTime: Boolean(body.showTime) });
  store.saveNow();
  return slaView();
}
