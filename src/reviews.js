// Відгуки: після «Готово» бот просить оцінку 1–5 і короткий коментар; найкращі власник публікує в каталозі.
// order.review = { rating, comment, at, published }
import { store } from './store.js';
import { log } from './log.js';
import crypto from 'node:crypto';
import { orderNo, todayKey, dateText } from './util.js';
import { promoList } from './promos.js';
import * as T from './texts.js';

export const REVIEW_PROMO_DEFAULTS = { enabled: false, percent: 10, days: 60 };

export function reviewPromoSettings() {
  const c = store.data.config;
  c.reviewPromo = { ...REVIEW_PROMO_DEFAULTS, ...(c.reviewPromo || {}) };
  return c.reviewPromo;
}

export function saveReviewPromo(body) {
  const percent = Math.round(Number(body.percent)), days = Math.round(Number(body.days));
  if (!(percent >= 1 && percent <= 50)) throw new Error('Скидка — от 1 до 50%.');
  if (!(days >= 7 && days <= 365)) throw new Error('Срок действия — от 7 до 365 дней.');
  Object.assign(reviewPromoSettings(), { enabled: Boolean(body.enabled), percent, days });
  store.saveNow();
  return reviewPromoView();
}

export function reviewPromoView() {
  const all = promoList().filter((p) => p.reviewOrder);
  return { ...reviewPromoSettings(), stats: { given: all.length, used: all.filter((p) => p.uses > 0).length } };
}

export function publishedReviews() {
  return store.data.inquiries
    .filter((o) => o.review?.published && o.review.rating)
    .map((o) => ({ rating: o.review.rating, comment: o.review.comment, at: o.review.at, name: o.fullName?.split(' ')[0] || 'клієнт', service: o.service || 'stickers' }))
    .sort((a, b) => (b.at || '').localeCompare(a.at || ''));
}

export class ReviewFlow {
  constructor(handlers) {
    this.h = handlers;
  }

  get data() { return store.data; }

  epochOk(epoch) {
    return (epoch || undefined) === (this.data.orderEpoch || undefined);
  }

  /** Після «Готово»: попросити оцінку (один раз на замовлення). */
  async ask(order) {
    if (order.review || order.reviewAskedAt) return;
    order.reviewAskedAt = new Date().toISOString();
    try {
      const L = this.h.t(order.userId);
      await this.h.send(order.userId, L.REVIEW_ASK, L.reviewKeyboard(this.data.orderEpoch, order.id));
    } catch (err) {
      log.warn(`Запрос отзыва по #${orderNo(order.id)} не отправлен: ${err.message}`);
    }
    store.save();
  }

  async onRate(cb, epoch, id, ratingText) {
    const order = this.data.inquiries.find((o) => o.id === Number(id));
    const rating = Number(ratingText);
    const L = this.h.t(cb.from.id);
    if (!this.epochOk(epoch) || !order || order.userId !== cb.from.id || !(rating >= 1 && rating <= 5)) {
      return this.h.answer(cb, L.MSG.rateStale, true);
    }
    if (order.review) return this.h.answer(cb, L.REVIEW_ALREADY, true);
    await this.h.answer(cb, '💛');
    order.review = { rating, comment: '', at: new Date().toISOString(), published: false };
    await this.h.tg.call('editMessageText', {
      chat_id: cb.message.chat.id, message_id: cb.message.message_id, parse_mode: 'HTML',
      text: `${L.REVIEW_ASK}\n\n${L.MSG.yourRating} ${T.stars(rating)}`, reply_markup: { inline_keyboard: [] },
    }).catch(() => {});
    (this.data.reviewWaits ||= {})[String(order.userId)] = { orderId: order.id, epoch: this.data.orderEpoch, at: new Date().toISOString() };
    await this.h.send(cb.message.chat.id, L.reviewAskComment(rating), L.reviewSkipKeyboard(this.data.orderEpoch, order.id));
    await this.notifyStudio(order);
    store.saveNow();
    log.info(`Отзыв по #${orderNo(order.id)}: ${rating}/5`);
    return undefined;
  }

  async onSkip(cb, epoch, id) {
    const waits = this.data.reviewWaits || {};
    const wait = waits[String(cb.from.id)];
    await this.h.answer(cb);
    await this.h.removeButtons(cb.message);
    if (wait && wait.orderId === Number(id) && this.epochOk(epoch)) {
      delete waits[String(cb.from.id)];
      store.save();
      await this.h.send(cb.message.chat.id, this.h.t(cb.from.id).REVIEW_SKIPPED);
      const order = this.data.inquiries.find((o) => o.id === wait.orderId);
      if (order?.review && order.review.rating > 3) await this.notifyStudio(order, true);
    }
  }

  /** Перше повідомлення після оцінки — коментар до відгуку. Повертає true, якщо оброблено. */
  async onComment(m) {
    const waits = this.data.reviewWaits || {};
    const wait = waits[String(m.from.id)];
    if (!wait) return false;
    delete waits[String(m.from.id)];
    const order = this.data.inquiries.find((o) => o.id === wait.orderId);
    if (!order?.review || !this.epochOk(wait.epoch) || !m.text) return false;
    order.review.comment = m.text.trim().slice(0, 1000);
    order.review.at = new Date().toISOString();
    store.saveNow();
    await this.h.send(m.chat.id, this.h.t(m.from.id).REVIEW_THANKS);
    await this.notifyStudio(order, true);
    await this.reward(order).catch((err) => log.warn(`Промокод за отзыв: ${err.message}`));
    return true;
  }

  /** Відгук із Mini App: оцінка й коментар однією дією (або коментар до оцінки, поставленої в чаті). */
  async submitFromApp(order, rating, comment) {
    if (order.review?.comment) return false;
    const now = new Date().toISOString();
    order.review = { ...(order.review || {}), rating: order.review?.rating || rating, comment, at: now, published: Boolean(order.review?.published), via: 'app' };
    const waits = this.data.reviewWaits || {};
    if (waits[String(order.userId)]?.orderId === order.id) delete waits[String(order.userId)];
    store.saveNow();
    log.info(`Отзыв по #${orderNo(order.id)} из Mini App: ${order.review.rating}/5`);
    await this.notifyStudio(order, true).catch(() => {});
    await this.reward(order).catch((err) => log.warn(`Промокод за отзыв: ${err.message}`));
    return true;
  }

  /** Подяка за відгук із коментарем: персональний промокод на наступне замовлення (один раз на замовлення). */
  async reward(order) {
    const s = reviewPromoSettings();
    if (!s.enabled || !order.review?.comment || order.reviewPromo) return null;
    const code = `THANKS${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const until = todayKey(new Date(Date.now() + s.days * 86400000));
    promoList().push({
      code, percent: s.percent, userId: order.userId, until, maxUses: 1, uses: 0, active: true,
      note: `за отзыв к #${orderNo(order.id)} (создан ботом)`, createdAt: new Date().toISOString(), auto: true, reviewOrder: order.id,
    });
    order.reviewPromo = code;
    const user = this.data.users[String(order.userId)];
    if (user && !user.pendingPromo) user.pendingPromo = code; // сам підставиться в наступну заявку
    store.saveNow();
    await this.h.send(order.userId, this.h.t(order.userId).reviewPromoText(s.percent, code, dateText(until))).catch(() => {});
    log.info(`Промокод за отзыв по #${orderNo(order.id)}: ${code} (−${s.percent}%)`);
    return code;
  }

  async notifyStudio(order, withComment = false) {
    const studio = this.data.config.adminChatId;
    if (!studio) return;
    // Без коментаря повідомляємо одразу лише про низьку оцінку — інакше чекаємо на текст відгуку
    if (!withComment && order.review.rating > 3) return;
    const reply = order.adminMessage && String(order.adminMessage.chatId) === String(studio)
      ? { reply_parameters: { message_id: order.adminMessage.messageId, allow_sending_without_reply: true } } : {};
    const msg = await this.h.send(studio, T.studioReviewText(order, order.review), null, reply).catch(() => null);
    if (msg) this.h.mapRelay(msg.message_id, order);
  }
}
