// Кошторис: студія надсилає клієнту ціну, термін і склад робіт; клієнт погоджує або ставить питання.
// order.quotes = [{ n, amount, due, items, comment, sentAt, status: 'sent'|'accepted'|'question'|'superseded', decidedAt, by }]
import { store } from './store.js';
import { log } from './log.js';
import { orderNo, todayKey } from './util.js';
import { isOpen, validDate, dateText } from './orders.js';
import { money } from './texts.js';
import * as T from './texts.js';

export class QuoteError extends Error {}

export class QuoteFlow {
  constructor(handlers) {
    this.h = handlers;
  }

  get data() { return store.data; }

  /** Надіслати кошторис клієнту. Попередній непідтверджений кошторис стає неактуальним. */
  async send(order, input, who = 'страница бота', { designer = false } = {}) {
    if (!isOpen(order)) throw new QuoteError('Заявка закрыта — смету отправить нельзя.');
    const amount = Math.round(Number(input.amount) * 100) / 100;
    if (!(amount >= 1 && amount <= 1000000)) throw new QuoteError('Укажите стоимость в гривнах.');
    const due = validDate(input.due) ? input.due : '';
    // Або строк у днях — дата порахується від дня погодження
    const days = !due && Number(input.days) > 0 ? Math.min(365, Math.round(Number(input.days))) : 0;
    const items = String(input.items || '').trim().slice(0, 1500);
    const comment = String(input.comment || '').trim().slice(0, 1000);
    for (const q of order.quotes || []) if (q.status === 'sent' || q.status === 'question') q.status = 'superseded';
    const q = { n: (order.quotes?.length || 0) + 1, amount, due, days, items, comment, sentAt: new Date().toISOString(), status: 'sent', by: who, ...(designer ? { byDesigner: true } : {}) };
    const L = this.h.t(order.userId);
    const pay = this.h.payments;
    const advance = pay.canRequest && pay.settings().mode === 'percent' ? Math.round((amount * pay.settings().percent) / 100) : 0;
    await this.h.send(order.userId, L.quoteMessage(order, q, advance ? L.quoteAdvanceNote(advance) : ''),
      this.h.withClientApp(L.quoteKeyboard(this.data.orderEpoch, order.id, q.n), order.id, order.userId));
    (order.quotes ||= []).push(q);
    (order.messages ||= []).push({ at: q.sentAt, from: 'studio', via: who === 'Telegram' ? 'telegram' : 'page', text: `[смета: ${money(amount)}${due ? `, срок до ${dateText(due)}` : ''}]` });
    await this.h.updateCard(order);
    store.saveNow();
    log.info(`Смета по #${orderNo(order.id)} отправлена: ${money(amount)}`);
    return q;
  }

  /** Клієнт натиснув «Погоджую» або «Є питання». */
  async onDecision(cb, kind, epoch, id, nText) {
    const L = this.h.t(cb.from.id);
    const order = this.data.inquiries.find((o) => o.id === Number(id));
    const q = order?.quotes?.find((x) => x.n === Number(nText));
    if ((epoch || undefined) !== (this.data.orderEpoch || undefined) || !order || order.userId !== cb.from.id || !q
      || !['sent', 'question'].includes(q.status) || !isOpen(order)) {
      return this.h.answer(cb, L.QUOTE_STALE, true);
    }
    const accepted = kind === 'qa';
    if (!accepted && q.status === 'question') return this.h.answer(cb);
    await this.h.answer(cb);
    q.status = accepted ? 'accepted' : 'question';
    q.decidedAt = new Date().toISOString();
    await this.h.tg.call('editMessageReplyMarkup', {
      chat_id: cb.message.chat.id, message_id: cb.message.message_id,
      reply_markup: accepted ? { inline_keyboard: [] } : { inline_keyboard: [[{ text: L.quoteKeyboard('', 0, 0).inline_keyboard[0][0].text, callback_data: `qa:${epoch || ''}:${order.id}:${q.n}` }]] },
    }).catch(() => {});
    (order.messages ||= []).push({ at: q.decidedAt, from: 'client', text: accepted ? `[согласовал смету: ${money(q.amount)}]` : '[вопросы по смете]' });
    order.unread = (order.unread || 0) + 1;

    if (accepted) {
      // Погоджені ціна й термін стають полями студії
      order.studio = { ...(order.studio || {}), price: money(q.amount), amount: q.amount };
      if (!q.due && q.days) q.due = todayKey(new Date(Date.now() + q.days * 86400000));
      if (q.due) Object.assign(order.studio, { due: q.due, deadline: dateText(q.due) });
      await this.h.send(cb.message.chat.id, L.QUOTE_ACCEPTED_CLIENT);
      const pay = this.h.payments;
      // Кошторис дизайнера рахунок автоматично не виставляє — власник вирішує сам
      const auto = pay.canRequest && pay.settings().autoInvoice && !q.byDesigner;
      const offer = pay.canRequest && !auto
        ? { inline_keyboard: [[{ text: '💳 Рахунок на аванс', callback_data: `py:${this.data.orderEpoch || ''}:${order.id}` }]] } : null;
      await this.h.notifyTeam(order, T.quoteAcceptedStudio(order, q), { ownerMarkup: offer });
      if (order.status === 'new') await this.h.setOrderStatus(order, 'in_progress', { who: 'смета', notifyClient: false });
      else await this.h.updateCard(order);
      // Автоматичний рахунок на аванс після погодження (якщо ввімкнено в налаштуваннях оплати)
      if (auto && !pay.hasActive(order)) {
        const s = pay.suggest(order);
        if (s.amount > 0) {
          const request = pay.enabled ? pay.createInvoice(order, s.amount, { who: 'смета', note: s.note, kind: s.kind })
            : pay.requestCard(order, s.amount, { who: 'смета', kind: s.kind });
          await request.catch((err) => {
            log.warn(`Автосчёт по #${orderNo(order.id)} не выставлен: ${err.message}`);
            store.addError('payments', err);
          });
        }
      }
      log.info(`Смета по #${orderNo(order.id)} согласована клиентом`);
    } else {
      await this.h.send(cb.message.chat.id, L.QUOTE_QUESTION_CLIENT);
      await this.h.notifyTeam(order, T.quoteQuestionStudio(order));
      await this.h.updateCard(order);
    }
    store.saveNow();
    return undefined;
  }
}
