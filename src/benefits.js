// Сертифікат, промокод і бонус клієнта при закритті заявки без виконання (скасовано клієнтом / відхилено студією):
// повертаємо їх клієнту. Якщо студія знову відкриє заявку — застосовуємо повторно, наскільки це ще можливо.
// order.released = { gift, promo, bonus, at } — що саме повернули (щоб не повернути двічі й уміти застосувати знову).
import { store } from './store.js';
import { orderNo } from './util.js';
import { log } from './log.js';
import { giftList, findGift, redeem } from './gifts.js';
import { promoList, normCode } from './promos.js';

export const CLOSED = new Set(['rejected', 'cancelled']);

/** Повертає сертифікат, використання промокоду й бонус. Результат — що повернуто (для історії й повідомлень). */
export function releaseBenefits(order) {
  if (order.released) return null;
  const rel = {};
  const user = store.data.users[String(order.userId)];

  // Сертифікат знову активний і чекає наступної заявки клієнта
  const g = order.gift && giftList().find((x) => x.code === order.gift.code && x.status === 'redeemed' && x.orderId === order.id);
  if (g) {
    g.status = 'active';
    delete g.redeemedBy;
    delete g.orderId;
    delete g.redeemedAt;
    order.payments = (order.payments || []).filter((p) => !(p.kind === 'gift' && p.by === `сертификат ${g.code}`));
    delete order.gift;
    if (user && !user.pendingGift) user.pendingGift = g.code;
    rel.gift = { code: g.code, amount: g.amount };
  }

  // Використання промокоду не рахуємо — персональний код (на 1 раз) знову діє
  if (order.promo?.code) {
    const p = promoList().find((x) => x.code === normCode(order.promo.code));
    if (p && p.uses > 0) {
      p.uses -= 1;
      rel.promo = p.code;
    }
  }

  if (order.bonusUsed) {
    if (user) user.bonuses = (user.bonuses || 0) + 1;
    order.bonusUsed = false;
    rel.bonus = true;
  }

  if (!Object.keys(rel).length) return null;
  order.released = { ...rel, at: new Date().toISOString() };
  log.info(`Заявка #${orderNo(order.id)} закрыта: клиенту возвращено ${describeReleased(rel)}`);
  return rel;
}

/** Заявку знову відкрили: застосувати повернене ще раз. Повертає список того, що вже не вдалося. */
export function reclaimBenefits(order) {
  const rel = order.released;
  if (!rel) return [];
  const lost = [];
  const user = store.data.users[String(order.userId)];

  if (rel.gift) {
    const g = findGift(rel.gift.code);
    if (g) {
      redeem(g, order);
      if (user?.pendingGift === g.code) delete user.pendingGift;
    } else lost.push(`сертификат ${rel.gift.code} уже использован или истёк`);
  }
  if (rel.promo) {
    const p = promoList().find((x) => x.code === rel.promo);
    if (p) p.uses = (p.uses || 0) + 1;
  }
  if (rel.bonus) {
    if (user?.bonuses > 0) {
      user.bonuses -= 1;
      order.bonusUsed = true;
    } else lost.push('бонус клиента уже использован');
  }
  delete order.released;
  return lost;
}

export function describeReleased(rel) {
  return [
    rel.gift ? `сертификат ${rel.gift.code}` : '',
    rel.promo ? `промокод ${rel.promo}` : '',
    rel.bonus ? 'бонус' : '',
  ].filter(Boolean).join(', ');
}
