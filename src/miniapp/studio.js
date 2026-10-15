// Студійна частина Mini App: власник і дизайнери працюють із заявками з телефона.
// Дії йдуть через той самий обробник, що й на сторінці бота (studioOrdersCall), — права однакові:
// дизайнер бачить і змінює лише свої заявки, без грошей.
import { store } from '../store.js';
import { memberByChat } from '../orders.js';
import { isOpen } from '../orders.js';
import { ordersList, financeView } from '../admin/views.js';
import { MiniError, mediaUrl, refsFrom } from './api.js';

// Дії, доступні з Mini App (решта — лише на сторінці бота)
const ACTIONS = new Set(['fix-done', 'pay-plan', 'to-examples', 'status', 'message', 'quote', 'studio', 'assign', 'stage', 'project-stage', 'invoice', 'card-request', 'card-confirm', 'mark-paid', 'cancel-invoice', 'final-link', 'final-remove']);
const IMAGE_DOC = /^image\/(jpeg|png|webp|gif)$/;

function mediaOf(item) {
  const url = mediaUrl({ k: 'tg', f: item.fileId });
  if (item.type === 'photo' || (item.type === 'document' && IMAGE_DOC.test(item.mime || ''))) return { url, kind: 'img' };
  if (item.type === 'video' || item.type === 'animation' || item.type === 'video_note') return { url, kind: 'video' };
  if (item.type === 'voice' || item.type === 'audio') return { url, kind: 'audio' };
  if (item.type === 'sticker') return { url, kind: 'img' };
  return { url, kind: 'file', name: item.name || 'файл' };
}

export class StudioApi {
  constructor(runtime) {
    this.runtime = runtime;
  }

  get h() {
    const h = this.runtime.handlers;
    if (!h || !this.runtime.ready) throw new MiniError('Бот перезапускается — попробуйте через минуту.', 503);
    return h;
  }

  /** Сесія для handleOrders: власник (чат отримувача заявок) або активний дизайнер із Telegram ID. */
  session(from) {
    if (this.h.isOwnerChat(from.id)) return { role: 'owner', name: 'Telegram', via: 'app' };
    const m = memberByChat(from.id);
    return m ? { role: 'designer', memberId: m.id, name: m.name, via: 'app' } : null;
  }

  role(from) {
    try { return this.session(from)?.role || null; } catch { return null; }
  }

  need(from) {
    const s = this.session(from);
    if (!s) throw new MiniError('Раздел только для студии.', 403);
    return s;
  }

  async call(s, method, path, body) {
    const { studioOrdersCall } = await import('../admin/server.js');
    const r = await studioOrdersCall(s, method, path, body, this.runtime);
    if (r.status >= 400) throw new MiniError(r.body?.error || 'Ошибка', r.status);
    return r.body;
  }

  boot(from) {
    const s = this.need(from);
    const list = ordersList(s);
    const open = list.filter(isOpen);
    const pay = this.h.payments;
    const counts = {
      new: open.filter((o) => o.status === 'new').length,
      overdue: open.filter((o) => o.dueState === 'overdue').length,
      today: open.filter((o) => o.dueState === 'today').length,
      unread: list.filter((o) => o.unread > 0).length,
      waiting: open.filter((o) => o.waiting).length,
      fixes: list.filter((o) => o.fixOpen).length,
      sketches: open.filter((o) => o.sketch?.status === 'pending').length,
      reported: s.role === 'owner' ? open.filter((o) => o.pay?.status === 'reported').length : 0,
      awaitingPay: s.role === 'owner' ? list.filter((o) => ['created', 'processing', 'hold', 'awaiting'].includes(o.pay?.status)).length : 0,
      open: open.length,
    };
    const strip = (o) => {
      const x = { ...o };
      if (s.role === 'designer') { delete x.amount; delete x.paid; delete x.pay; delete x.studioPrice; delete x.promo; delete x.tags; }
      return x;
    };
    return {
      role: s.role, name: s.role === 'owner' ? '' : s.name,
      counts,
      orders: list.slice(0, 300).map(strip),
      pay: s.role === 'owner' ? { mono: pay.enabled, card: pay.cardEnabled } : null,
    };
  }

  /** Картка заявки + медіа (референси, голосові, ескізи) за підписаними посиланнями. */
  async order(from, body) {
    const s = this.need(from);
    const id = Number(body.id);
    const detail = await this.call(s, 'GET', `/api/orders/${id}`);
    const o = store.data.inquiries.find((x) => x.id === id);
    if (o && !o.archived) {
      detail.media = {
        refs: (o.refs || []).slice(0, 20).map(mediaOf),
        voices: (o.voices || []).map((v) => ({ ...mediaOf({ type: v.type, fileId: v.fileId }), step: v.step, duration: v.duration || 0 })),
        sketches: (o.sketches || []).map((sk) => ({ round: sk.round, items: (sk.items || []).slice(0, 10).map((it, index) => ({ ...mediaOf(it), index, done: (o.exampled || []).includes(it.fileId) })) })),
      };
    }
    if (o?.username) detail.tgLink = `https://t.me/${o.username}`;
    // Вкладення в переписці — посиланнями для перегляду
    detail.messages = (detail.messages || []).map((m) => (m.media?.length ? { ...m, media: m.media.slice(0, 10).map(mediaOf) } : m));
    return detail;
  }

  /** Ескізи з Mini App: фото, завантажені цим же членом студії, — клієнту новою версією. */
  async sendSketches(from, s, body) {
    const id = Number(body.id);
    const o = store.data.inquiries.find((x) => x.id === id);
    if (!o || o.archived) throw new MiniError('Заявка не найдена.', 404);
    if (s.role === 'designer' && o.assignee !== s.memberId) throw new MiniError('Эта заявка вам не назначена.', 403);
    if (!isOpen(o)) throw new MiniError('Заявка закрыта.');
    const items = refsFrom(from.id, body.data?.items, 10);
    if (!items.length) throw new MiniError('Добавьте хотя бы одно фото эскиза.');
    const comment = String(body.data?.comment || '').trim().slice(0, 1000);
    const member = s.role === 'designer' ? memberByChat(from.id) : null;
    try {
      await this.h.sketches.deliver(o, items, comment, member, 'app');
    } catch (err) {
      throw new MiniError(err.status === 403 ? 'Клиент заблокировал бота — эскизы не доставлены.' : `Не доставлено: ${err.description || err.message}`, 502);
    }
    return { ok: true, order: await this.order(from, { id }), state: this.boot(from) };
  }

  /** Фінанси для власника: отримано, очікуємо, середній чек, хто винен залишок. */
  finance(from, body) {
    const s = this.need(from);
    if (s.role !== 'owner') throw new MiniError('Финансы видит только владелец.', 403);
    const period = ['month', 'prev', 'year', 'all'].includes(body.period) ? body.period : 'month';
    const f = financeView(period);
    return {
      period, label: f.label, received: f.received, revenue: f.revenue, done: f.done, avgCheck: f.avgCheck,
      pipeline: f.pipeline, months: f.months, services: f.services,
      debts: { total: f.debts.total, list: f.debts.list.slice(0, 30).map((x) => ({ id: x.id, client: x.client, status: x.status, amount: x.amount, paid: x.paid, remaining: x.remaining })) },
    };
  }

  async action(from, body) {
    const s = this.need(from);
    const action = String(body.action || '');
    if (action === 'sketch-send') return this.sendSketches(from, s, body);
    if (!ACTIONS.has(action)) throw new MiniError('Это действие доступно только на странице бота.');
    const id = Number(body.id);
    const result = await this.call(s, 'POST', `/api/orders/${id}/${action}`, body.data || {});
    return { ok: true, warning: result?.warning || null, order: await this.order(from, { id }), state: this.boot(from) };
  }
}
