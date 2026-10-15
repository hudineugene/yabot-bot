// Обробка оновлень Telegram: бриф на стікерпак, «Мої замовлення», статуси замовлень для студії.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { store } from './store.js';
import { log } from './log.js';
import { ASSETS_DIR } from './config.js';
import { escapeHtml, kyivHour, todayKey, orderNo, isWorkingTime } from './util.js';
import { renderBriefPdf } from './pdf/brief.js';
import { loadImage } from './pdf/images.js';
import { catalog, findItem, refreshItem } from './catalog.js';
import { SketchFlow } from './sketches.js';
import { ReviewFlow, publishedReviews } from './reviews.js';
import { PackFlow } from './stickers/pack.js';
import { PaymentFlow } from './payments.js';
import { recordPostVisit } from './channel.js';
import { aiAvailable, suggestEmotions, ideasText, takeClientAi } from './ai.js';
import { replyList, fillReply, findReply } from './replies.js';
import { textsFor, langOf, detectLang, isMenuButton, englishEnabled } from './lang.js';
import { QuoteFlow } from './quotes.js';
import { activePackages, findPackage, activeStyles, findStyle, sendStyleExamples, logOfferError } from './offer.js';
import { readUpload } from './channel.js';
import { GiftFlow, findGift } from './gifts.js';
import { StudioCommands, Winback, STUDIO_COMMANDS } from './studio.js';
import { team } from './orders.js';
import { faqList, findFaq, matchFaq } from './faq.js';
import { findService, projectStage, NEEDS } from './services.js';
import { supportSettings } from './support.js';
import { slaSettings, waitingSince } from './sla.js';
import { fixAllowed, openFix } from './fixes.js';
import { pickDesigner, assignSettings } from './assign.js';
import { auditRecord } from './audit.js';
import { Digest } from './digest.js';
import { findPromo, usePromo, promoList } from './promos.js';
import { CLOSED, releaseBenefits, reclaimBenefits, describeReleased } from './benefits.js';
import { isOpen, remaining, memberByChat, memberById, assigneeOf, dateText } from './orders.js';
import * as T from './texts.js';
import { forwardComment, askAgent, chatOn, addAiHistory, sendAgentEvent, ratingKeyboard, extractFromAgent, talkedRecently, transcribeVoice, VOICE_MAX_SEC, linkFromSite, managerTalking, logToAgent, mediaLabel } from './genagent.js';

const FLOW = ['type', 'qty', 'hero', 'style', 'emotions', 'refs', 'contact', 'confirm'];
// Розділи бота, які ІІ-помічник може показати кнопкою під відповіддю: код → назва кнопки в текстах
const AI_SECTIONS = { brief: 'AI_BRIEF_BUTTON', prices: 'BTN_PRICES', works: 'BTN_WORKS', faq: 'BTN_FAQ', orders: 'BTN_MY_ORDERS', about: 'BTN_ABOUT' };
const MAX_REFS = 20;
const MAX_TEXT = 2000;
const MAX_SHORT = 200;
const MAX_PREVIEW_BYTES = 8 * 1024 * 1024;
const TRANSITIONS = { new: ['in_progress', 'rejected'], in_progress: ['done', 'rejected'] };
const HOUR = 60 * 60 * 1000;
const REMIND_AFTER = 24 * HOUR;
const DRAFT_TTL = 7 * 24 * HOUR;
const REMIND_FROM_HOUR = 10;
const REMIND_TO_HOUR = 20;
const DAILY_KEEP_DAYS = 120;
const MAX_RELAY = 3000; // скільки пересланих повідомлень пам'ятаємо для відповідей
const AI_TRIES = 3; // скільки разів за бриф клієнт може попросити ідеї
const AI_DAILY = 10; // і скільки разів на день
const POST_ORDER_WINDOW = 14 * 24 * HOUR; // заявка зараховується посту, якщо людина прийшла з нього за 14 днів до заявки
const WAIT_TTL = 48 * HOUR; // скільки чекаємо коментар до відгуку чи опис правок

/** Чи чекаємо від клієнта коментар/правки. Застарілі очікування (або без мітки часу) прибираємо. */
function waitFresh(waits, userId) {
  const wait = waits?.[userId];
  if (!wait) return false;
  if (wait.at && Date.now() - Date.parse(wait.at) < WAIT_TTL) return true;
  delete waits[userId];
  return false;
}

export class BotHandlers {
  constructor(tg) {
    this.tg = tg;
    this.sketches = new SketchFlow(this);
    this.reviews = new ReviewFlow(this);
    this.packs = new PackFlow(this);
    this.payments = new PaymentFlow(this);
    this.quotes = new QuoteFlow(this);
    this.digest = new Digest(this);
    this.gifts = new GiftFlow(this);
    this.studio = new StudioCommands(this);
    this.winback = new Winback(this);
  }

  /** Меню команд Telegram для чатів студії (власник і дизайнери) — окремо від клієнтського. */
  async syncStudioCommands() {
    const chats = [this.data.config.adminChatId, ...team().filter((m) => m.active && m.telegramId).map((m) => m.telegramId)].filter(Boolean);
    for (const chatId of chats) {
      await this.tg.call('setMyCommands', { commands: STUDIO_COMMANDS, scope: { type: 'chat', chat_id: Number(chatId) } }).catch(() => {});
    }
  }

  /** Режим відпустки: чи діє зараз (до дати включно). */
  vacation() {
    const v = this.data.config.vacation || {};
    const active = Boolean(v.enabled) && (!v.until || v.until >= todayKey());
    return { active, until: dateText(v.until), acceptOrders: v.acceptOrders !== false, message: (v.message || '').trim() };
  }

  /** Текст відпустки мовою клієнта (свій текст власника — лише для україномовних). */
  vacationText(userId, closed = false) {
    const v = this.vacation();
    const L = this.t(userId);
    const custom = langOf(userId) === 'uk' ? v.message : '';
    return closed ? L.vacationClosed(v.until, custom) : L.vacationNotice(v.until, custom);
  }

  /**
   * Автовідповідь у неробочий час або у відпустці (не частіше ніж раз на 12 годин для людини).
   * Повертає true, якщо відповідь надіслано.
   */
  async offHoursReply(chatId, userId) {
    const hours = this.data.config.workHours;
    const vacation = this.vacation().active;
    if (!vacation && isWorkingTime(hours)) return false;
    const user = this.data.users[String(userId)];
    const now = Date.now();
    if (user?.lastAutoReplyAt && now - Date.parse(user.lastAutoReplyAt) < 12 * 60 * 60 * 1000) return true;
    if (user) user.lastAutoReplyAt = new Date(now).toISOString();
    await this.send(chatId, vacation ? this.vacationText(userId) : this.t(userId).offHoursMessage(hours)).catch(() => {});
    return true;
  }

  // --- Команда студії: власник і дизайнери ---

  /** Дизайнер, якому належить цей чат (або null — власник чи клієнт). */
  memberOfChat(chatId) {
    if (String(chatId) === String(this.data.config.adminChatId)) return null;
    return memberByChat(chatId);
  }

  isOwnerChat(chatId) {
    return Boolean(this.data.config.adminChatId) && String(chatId) === String(this.data.config.adminChatId);
  }

  /** Чи може цей чат працювати із заявкою: власник — з усіма, дизайнер — лише зі своїми. */
  canWork(chatId, order) {
    if (this.isOwnerChat(chatId)) return true;
    const m = this.memberOfChat(chatId);
    return Boolean(m && order.assignee === m.id);
  }

  /** Чати, куди йдуть сповіщення по заявці: власник (відповіддю на картку) і дизайнер заявки. */
  teamTargets(order) {
    const targets = [];
    const owner = this.data.config.adminChatId;
    if (owner) {
      const card = order.adminMessage && String(order.adminMessage.chatId) === String(owner) ? order.adminMessage.messageId : null;
      targets.push({ chatId: owner, replyTo: card, owner: true });
    }
    const m = assigneeOf(order);
    if (m?.telegramId && String(m.telegramId) !== String(owner)) {
      targets.push({ chatId: m.telegramId, replyTo: order.designerMessage?.messageId || null, owner: false });
    }
    return targets;
  }

  /** Коротке повідомлення студії по заявці (обом: власнику й дизайнеру). */
  async notifyTeam(order, text, { ownerMarkup = null } = {}) {
    for (const t of this.teamTargets(order)) {
      const extra = t.replyTo ? { reply_parameters: { message_id: t.replyTo, allow_sending_without_reply: true } } : {};
      const msg = await this.send(t.chatId, text, t.owner ? ownerMarkup : null, extra).catch(() => null);
      if (msg) this.mapRelay(msg.message_id, order, t.chatId);
    }
  }

  /** Переслати повідомлення клієнта студії (власнику й дизайнеру) з підписом. Кидає помилку, якщо власнику не дійшло. */
  async forwardToTeam(order, header, m) {
    const targets = this.teamTargets(order);
    if (!targets.length) throw new Error('Не задано отримувача — повідомлення клієнта нікуди передати');
    for (const t of targets) {
      const extra = t.replyTo ? { reply_parameters: { message_id: t.replyTo, allow_sending_without_reply: true } } : {};
      try {
        if (m.text) {
          const sent = await this.send(t.chatId, `${header}\n\n${escapeHtml(m.text)}`, null, extra);
          this.mapRelay(sent.message_id, order, t.chatId);
        } else {
          const head = await this.send(t.chatId, header, null, extra);
          this.mapRelay(head.message_id, order, t.chatId);
          const copy = await this.tg.call('copyMessage', { chat_id: t.chatId, from_chat_id: m.chat.id, message_id: m.message_id });
          this.mapRelay(copy.message_id, order, t.chatId);
        }
      } catch (err) {
        if (t.owner) throw err;
        log.warn(`Сообщение по #${orderNo(order.id)} дизайнеру не передано: ${err.message}`);
      }
    }
  }

  get data() { return store.data; }

  /** Тексти мовою клієнта (українська або англійська). */
  t(userId) { return textsFor(userId); }

  // --- Відправка ---

  async send(chatId, text, replyMarkup, extra = {}) {
    const params = {
      chat_id: chatId, text, parse_mode: 'HTML',
      link_preview_options: { is_disabled: true }, ...extra,
    };
    if (replyMarkup) params.reply_markup = replyMarkup;
    try {
      const msg = await this.tg.call('sendMessage', params);
      this.data.stats.messagesSent++;
      return msg;
    } catch (err) {
      this.markBlocked(chatId, err);
      throw err;
    }
  }

  markBlocked(chatId, err) {
    const user = this.data.users[String(chatId)];
    if (user && err?.status === 403) { user.blocked = true; store.save(); }
  }

  answer(cb, text, alert = false) {
    if (!cb.id) return Promise.resolve(); // дія з Mini App — відповідати нікому
    return this.tg.call('answerCallbackQuery', {
      callback_query_id: cb.id, ...(text ? { text, show_alert: alert } : {}),
    }).catch(() => {});
  }

  removeButtons(msg) {
    if (!msg?.message_id) return Promise.resolve();
    return this.tg.call('editMessageReplyMarkup', {
      chat_id: msg.chat.id, message_id: msg.message_id, reply_markup: { inline_keyboard: [] },
    }).catch(() => {});
  }

  touchUser(from, source, referrer) {
    if (!from || from.is_bot) return;
    const id = String(from.id);
    const now = new Date().toISOString();
    const isNew = !this.data.users[id];
    const user = this.data.users[id] || { id: from.id, firstSeenAt: now, blocked: false, ...(source ? { source } : {}) };
    if (isNew) {
      this.bump('users');
      user.lang = detectLang(from.language_code);
    }
    // Хто запросив — лише для нових людей і не самого себе
    // …і лише якщо в того, хто запросив, є готове замовлення (інакше можна було б «запросити» самого себе з другого акаунта)
    if (isNew && referrer && referrer !== from.id && this.data.users[String(referrer)] && this.canInvite(referrer)) user.referredBy = referrer;
    Object.assign(user, {
      firstName: from.first_name, lastName: from.last_name || undefined,
      username: from.username || undefined, lastSeenAt: now, blocked: false,
    });
    // Перше джерело не перезаписуємо; людям, що прийшли до появи міток, — записуємо
    if (source && !user.source) user.source = source;
    this.data.users[id] = user;
    return isNew;
  }

  // --- Статистика для сторінки бота ---

  /** Лічильник за сьогодні (київська дата): users, starts, orders, done. */
  bump(kind) {
    const daily = (this.data.stats.daily ||= {});
    const day = (daily[todayKey()] ||= {});
    day[kind] = (day[kind] || 0) + 1;
    const days = Object.keys(daily).sort();
    for (const old of days.slice(0, Math.max(0, days.length - DAILY_KEEP_DAYS))) delete daily[old];
  }

  /** Воронка брифу: скільки людей дійшло до кожного кроку. */
  funnel(step) {
    const f = (this.data.stats.funnel ||= {});
    f[step] = (f[step] || 0) + 1;
  }

  // --- Вхідні оновлення ---

  async handleUpdate(update) {
    this.data.stats.messagesReceived++;
    this.data.stats.lastUpdateAt = new Date().toISOString();
    // Заблокованих студією бот мовчки ігнорує (крім чатів самої студії)
    const sender = update.message?.from || update.callback_query?.from;
    if (sender && this.data.users[String(sender.id)]?.studioBlocked && !this.isOwnerChat(sender.id) && !this.memberOfChat(sender.id)) {
      if (update.callback_query) await this.answer(update.callback_query);
      return;
    }
    if (update.message) await this.onMessage(update.message);
    else if (update.callback_query) await this.onCallback(update.callback_query);
    // Остання активність у брифі — від неї рахуємо, коли нагадати
    const from = update.message?.from || update.callback_query?.from;
    const draft = from && this.data.drafts[String(from.id)];
    if (draft) draft.updatedAt = new Date().toISOString();
    store.save();
  }

  async onMessage(m) {
    const chatId = m.chat.id;
    const text = m.text?.trim();
    const command = text?.match(/^\/([a-z_]+)(?:@\w+)?(?:\s+(.+))?$/i);
    const cmd = command?.[1].toLowerCase();

    if (cmd === 'chatid') {
      await this.send(chatId, `ID цього чату: <code>${chatId}</code>`);
      return;
    }
    // Чат студії: власник (отримувач заявок) або дизайнер з команди (свій Telegram ID)
    const isOwner = this.isOwnerChat(chatId);
    const isStudioChat = isOwner || (m.chat.type === 'private' && Boolean(this.memberOfChat(chatId)));
    // Швидкі відповіді: /r — список, /r 2 у відповідь на повідомлення клієнта — надіслати шаблон
    if (isStudioChat && (cmd === 'r' || cmd === 'replies')) return void (await this.onQuickReplyCommand(m, command[2]));
    // Команди студії: /today, /orders, /find, /o, /stats, /help
    if (isStudioChat && ['today', 'orders', 'find', 'o', 'stats', 'help', 'quote', 'due', 'price', 'pay'].includes(cmd)
      && (await this.studio.handle(m, cmd, command[2], this.memberOfChat(chatId)))) return;
    // Відповідь студії клієнту: «Відповісти» на його повідомлення чи на картку заявки
    if (isStudioChat && m.reply_to_message && !cmd && (await this.onStudioReply(m))) return;
    if (isOwner && m.reply_to_message && !cmd && (await this.onQuestionReply(m))) return;
    // Власник вводить суму рахунку
    if (isOwner && this.data.paySession && !cmd && (await this.payments.captureStudio(m))) return;
    // Збір ескізів для клієнта — файли й коментар ідуть у чернетку ескізів цього чату
    if (isStudioChat && this.sketches.session(chatId) && !cmd && (await this.sketches.captureStudio(m))) return;
    // Власник збирає фінальний стікерпак
    if (isOwner && this.data.packSession && !cmd && (await this.packs.captureStudio(m))) return;
    // Коментарі під постами каналу (група обговорень) — ІІ-агенту студії, якщо ввімкнено на сторінці бота
    if ((m.chat.type === 'group' || m.chat.type === 'supergroup') && !cmd) {
      void forwardComment(m, this.data.bot?.id).catch((err) => log.warn(`GenAgent: ${err.message}`));
      return;
    }
    if (m.chat.type !== 'private') return;
    // Мітка джерела з посилання t.me/<бот>?start=<мітка> — записується лише для нових людей
    // Реферальне посилання: ?start=ref_<id у base36>
    const payload = cmd === 'start' ? command[2] || '' : '';
    let source;
    let referrer;
    if (/^ref_[0-9a-z]{1,12}$/.test(payload)) {
      referrer = parseInt(payload.slice(4), 36);
      source = 'ref';
    } else if (/^w_[A-Za-z0-9]{8,40}$/.test(payload)) source = 'site'; // «Продовжити в Telegram» з чату на сайті
    else if (/^[A-Za-z0-9_-]{1,64}$/.test(payload)) source = payload;
    const isNew = this.touchUser(m.from, source, referrer);
    const userId = String(m.from.id);
    // Перехід з поста в каналі (?start=p_<id>) — для статистики поста
    if (/^p_[0-9a-f]{8}$/.test(payload)) {
      const post = recordPostVisit(payload.slice(2), m.from.id, isNew);
      if (post) this.data.users[userId].lastPost = { id: post.id, at: new Date().toISOString() };
    }
    const L = this.t(userId);

    if (cmd === 'start') {
      delete this.data.drafts[userId];
      // Перехід із чату на сайті: розмова переноситься в бота, помічник продовжує з того ж місця
      if (/^w_[A-Za-z0-9]{8,40}$/.test(payload) && (await linkFromSite(payload.slice(2), m.from))) {
        await this.send(chatId, L.SITE_CONTINUED, L.mainMenu());
        return;
      }
      // Привітальний текст після «Старт» можна вимкнути: тоді в людини лише кнопка YABOT.
      // Без увімкненої Mini App мовчати не можна — тоді в людини не було б жодної кнопки.
      const app = this.data.config.miniapp;
      const silent = this.data.config.welcome?.onStart === false && app?.enabled && /^https:\/\//.test(app.url || '');
      if (!silent) await this.sendWelcome(chatId);
      // Посилання з промокодом: ?start=promo_<КОД> — знижка застосується до наступної заявки
      const promo = /^promo_([A-Za-z0-9_-]{3,20})$/.exec(payload) && findPromo(payload.slice(6), m.from.id);
      if (promo) {
        this.data.users[userId].pendingPromo = promo.code;
        await this.send(chatId, L.promoSaved(promo.code, promo.percent));
      }
      // Подарунковий сертифікат: ?start=gift_КОД
      if (/^gift_[A-Za-z0-9-]{6,24}$/.test(payload)) await this.gifts.claim(chatId, userId, payload.slice(5));
      return;
    }
    if (cmd === 'gift') return void (await this.gifts.offer(chatId));
    if (cmd === 'help') return void (await this.send(chatId, L.HELP));
    if (cmd === 'language' || cmd === 'lang') return void (await this.switchLanguage(chatId, userId));
    if (cmd === 'invite') return void (await this.sendInvite(chatId, m.from.id));
    if (cmd === 'cancel') {
      const had = Boolean(this.data.drafts[userId]);
      delete this.data.drafts[userId];
      await this.send(chatId, had ? L.MSG.briefCancelled : L.MSG.nothingToCancel, L.mainMenu());
      return;
    }
    if (isMenuButton(text, 'BTN_ABOUT')) return void (await this.send(chatId, L.ABOUT));
    if (cmd === 'faq' || isMenuButton(text, 'BTN_FAQ')) return void (await this.showFaq(chatId));
    if (cmd === 'works' || isMenuButton(text, 'BTN_WORKS')) return void (await this.showWorks(chatId));
    if (cmd === 'prices' || isMenuButton(text, 'BTN_PRICES')) {
      const kb = L.pricesKeyboard();
      if (this.gifts.available) kb.inline_keyboard.push([{ text: L.GIFT_BUTTON, callback_data: 'gift' }]);
      return void (await this.send(chatId, L.pricesMessage(this.data.config.prices), kb));
    }
    if (cmd === 'my_orders' || isMenuButton(text, 'BTN_MY_ORDERS')) return void (await this.myOrders(chatId, m.from.id));
    if (cmd === 'order' || isMenuButton(text, 'BTN_ORDER') || text === T.BTN_ORDER_OLD) {
      await this.startBrief(chatId, userId);
      return;
    }

    const draft = this.data.drafts[userId];
    // Очікування коментаря чи правок не перехоплює бриф і живе не довше WAIT_TTL
    // Після оцінки перше текстове повідомлення — коментар до відгуку
    if (!cmd && !draft && waitFresh(this.data.reviewWaits, userId) && (await this.reviews.onComment(m))) return;
    // Після «Є правки» перше повідомлення клієнта — це опис правок
    if (!cmd && !draft && waitFresh(this.data.revisionWaits, userId) && (await this.sketches.onRevisionMessage(m))) return;

    if (draft) {
      await this.onDraftMessage(draft, m);
      return;
    }
    // Є замовлення — усе, що клієнт пише, йде дизайнеру
    const order = !cmd && this.chatOrderFor(m.from.id);
    if (order) {
      await this.relayToStudio(m, order);
      return;
    }
    if (isStudioChat && m.reply_to_message) return void (await this.send(chatId, T.STUDIO_REPLY_HINT));
    // Людина без заявки щось питає — шукаємо відповідь у частих питаннях, інакше передаємо студії
    if (!isStudioChat && !cmd && text && text.length >= 3 && (await this.answerQuestion(m))) return;
    // Голосове людини без заявки — розшифровуємо й відповідаємо, як на текст
    if (!isStudioChat && !text && m.voice && chatOn() && (await this.answerVoice(m))) return;
    // Стікер, фото тощо від людини без заявки — у «Діалоги» GenAgent позначкою (помічник на це не відповідає)
    if (!isStudioChat && !text && chatOn()) {
      void logToAgent(m.from, 'media', mediaLabel(m));
      if (managerTalking(m.from.id)) {
        await this.tg.call('setMessageReaction', { chat_id: chatId, message_id: m.message_id, reaction: [{ type: 'emoji', emoji: '👀' }] }).catch(() => {});
        return;
      }
    }
    await this.send(chatId, L.MSG.notUnderstood, L.mainMenu());
  }

  /** Голосове → текст (GenAgent) → звичайна відповідь помічника. Людина бачить, що бот почув. */
  async answerVoice(m) {
    const L = this.t(m.from.id);
    if ((m.voice.duration || 0) > VOICE_MAX_SEC) {
      await this.send(m.chat.id, L.MSG.voiceTooLong);
      return true;
    }
    this.tg.call('sendChatAction', { chat_id: m.chat.id, action: 'typing' }).catch(() => {});
    const audio = await this.tg.download(m.voice.file_id).catch((err) => log.warn(`Голосове не завантажилось: ${err.message}`));
    const r = audio ? await transcribeVoice(audio, m.from.id) : null;
    if (!r?.text) {
      void logToAgent(m.from, 'media', mediaLabel(m)); // у «Діалогах» видно, що людина щось надіслала
      await this.send(m.chat.id, r?.reason === 'too_long' ? L.MSG.voiceTooLong : r?.reason === 'no_speech' ? L.MSG.voiceUnclear : L.MSG.voiceFailed);
      return true;
    }
    await this.send(m.chat.id, `🎙 <i>${escapeHtml(r.text)}</i>`);
    if (r.text.length < 3) return false;
    return this.answerQuestion({ ...m, text: r.text });
  }

  // --- Часті питання ---

  async showFaq(chatId) {
    const L = this.t(chatId);
    const list = faqList();
    if (!list.length) return this.send(chatId, L.FAQ_EMPTY);
    return this.send(chatId, L.FAQ_LIST, L.faqListKeyboard(list));
  }

  faqStats() {
    return (this.data.stats.faq ||= { views: {}, matched: 0, forwarded: 0 });
  }

  /**
   * Питання людини без замовлення до ІІ-помічника (агент GenAgent). Повертає { reply, handoff } або null,
   * якщо помічник вимкнений чи не відповів. Потрібен менеджер — питання йде студії разом із підсумком розмови.
   */
  async consult(chatId, from, text, context) {
    if (!chatOn()) return null;
    // Розмову веде менеджер з GenAgent — помічник мовчить, повідомлення йде менеджеру в «Діалоги»
    if (managerTalking(from.id)) {
      addAiHistory(from.id, 'client', text);
      store.save();
      void logToAgent(from, 'user', text);
      return { reply: null, handoff: true, manager: true, actions: [] };
    }
    if (chatId) this.tg.call('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});
    const r = await askAgent(from, text, [context, this.clientProfile(from.id)].filter(Boolean).join('\n\n'));
    if (!r) return null;
    addAiHistory(from.id, 'client', text);
    if (r.reply) addAiHistory(from.id, 'ai', r.reply);
    if (r.handoff) await this.forwardQuestion(from.id, from, text, { summary: r.summary, quiet: Boolean(r.reply), upset: r.upset });
    store.save();
    return r;
  }

  /**
   * Кнопки під відповіддю помічника: бриф (якщо людина готова замовляти), розділи бота, які порадив помічник
   * ([[ACTION button: prices]]), підказки наступного питання ([[ACTION suggest: …]]) і оцінка 👍/👎.
   */
  /**
   * Розрахунок від помічника ([[ACTION quote: animated 10]]): тип і кількість стікерів → ціна з прайсу бота.
   * { typeKey, qtyKey, label, price } або null (не зрозуміли тип/кількість чи ціни немає в прайсі).
   */
  aiQuote(userId, actions) {
    const a = (actions || []).find((x) => x.type === 'quote' && x.value);
    if (!a) return null;
    const v = String(a.value).toLowerCase();
    const typeKey = /anim|аним|анім/.test(v) ? 'animated' : /stat|стат/.test(v) ? 'static' : null;
    const qtyKey = /15\s*[-–]\s*20|\b(15|20)\b/.test(v) ? '15-20' : /\b10\b/.test(v) ? '10' : /\b5\b/.test(v) ? '5' : null;
    if (!typeKey || !qtyKey) return null;
    const price = T.priceFor(this.data.config.prices, typeKey, qtyKey);
    if (!price) return null;
    const L = this.t(userId);
    return { typeKey, qtyKey, price, label: `${L.OPTIONS.type[typeKey]}, ${L.OPTIONS.qty[qtyKey]}` };
  }

  aiMarkup(userId, actions) {
    const L = this.t(userId);
    const rows = [];
    const quote = this.aiQuote(userId, actions);
    // Є розрахунок — кнопка оформлення одразу з цим типом і кількістю (решту брифу підставить помічник)
    if (quote) rows.push([{ text: L.AI_QUOTE_BUTTON, callback_data: `bq:${quote.typeKey}:${quote.qtyKey}` }]);
    // розрахунку немає (ціни нема в прайсі) — усе одно кнопка брифу
    else if (actions.some((a) => a.type === 'brief' || a.type === 'quote')) rows.push([{ text: L.AI_BRIEF_BUTTON, callback_data: 'brief_start' }]);
    const sections = [...new Set(actions.filter((a) => a.type === 'button').map((a) => String(a.value).trim().toLowerCase()))]
      .filter((code) => Object.hasOwn(AI_SECTIONS, code) && !(code === 'brief' && rows.length)).slice(0, 2);
    if (sections.length) rows.push(sections.map((code) => ({ text: L[AI_SECTIONS[code]], callback_data: 'ab:' + code })));
    const suggest = actions.filter((a) => a.type === 'suggest').map((a) => String(a.value).trim()).filter((t) => t.length >= 3 && t.length <= 60).slice(0, 3);
    const user = this.data.users[String(userId)];
    if (user) user.aiSuggest = suggest;
    suggest.forEach((t, i) => rows.push([{ text: '💬 ' + t, callback_data: 'sq:' + i }]));
    return { inline_keyboard: [...rows, ...ratingKeyboard().inline_keyboard] };
  }

  /** Розділ бота за кнопкою під відповіддю помічника. */
  async openSection(chatId, userId, code) {
    const L = this.t(userId);
    if (code === 'brief') return this.startBrief(chatId, userId);
    if (code === 'prices') {
      const kb = L.pricesKeyboard();
      if (this.gifts.available) kb.inline_keyboard.push([{ text: L.GIFT_BUTTON, callback_data: 'gift' }]);
      return this.send(chatId, L.pricesMessage(this.data.config.prices), kb);
    }
    if (code === 'works') return this.showWorks(chatId);
    if (code === 'faq') return this.showFaq(chatId);
    if (code === 'orders') return this.myOrders(chatId, Number(userId));
    if (code === 'about') return this.send(chatId, L.ABOUT);
    return null;
  }

  /**
   * Що бот знає про людину — помічник радить з урахуванням попередніх замовлень (наприклад, доповнити пак
   * з тим самим героєм). Без контактів і сум.
   */
  clientProfile(userId) {
    const own = this.data.inquiries.filter((o) => String(o.userId) === String(userId)).slice(-3).reverse();
    if (!own.length) return '';
    const lines = own.map((o) => {
      const what = o.service && o.service !== 'stickers'
        ? (findService(o.service)?.name || o.service)
        : ['стікерпак', o.stickerType, o.quantity].filter(Boolean).join(', ');
      const hero = o.hero ? `, герой: ${String(o.hero).slice(0, 80)}` : '';
      return `• #${orderNo(o.id)} ${String(o.createdAt || '').slice(0, 10)} — ${what}${hero} (${(T.STATUS_LABELS[o.status] || o.status).replace(/^\S+\s/, '')})`;
    });
    return 'Попередні замовлення людини (враховуй: можна запропонувати доповнити пак тим самим героєм; статус і деталі — у «📦 Мої замовлення»; не переказуй дослівно):\n' + lines.join('\n');
  }

  /** Повертає true, якщо відповіли (помічник або часті питання) чи передали питання студії. */
  async answerQuestion(m) {
    const L = this.t(m.from.id);
    const user = this.data.users[String(m.from.id)];
    if (user) user.lastQuestion = m.text.slice(0, 1000);
    const ai = await this.consult(m.chat.id, m.from, m.text);
    if (ai?.reply) {
      const quote = this.aiQuote(m.from.id, ai.actions);
      await this.send(m.chat.id, escapeHtml(ai.reply) + (quote ? L.aiQuoteLine(escapeHtml(quote.label), escapeHtml(quote.price)) : ''), this.aiMarkup(m.from.id, ai.actions || []));
      return true;
    }
    if (ai?.manager) {
      // Людина пише менеджеру: 👀 — повідомлення отримано, відповідь буде від студії
      if (m.message_id) await this.tg.call('setMessageReaction', { chat_id: m.chat.id, message_id: m.message_id, reaction: [{ type: 'emoji', emoji: '👀' }] }).catch(() => {});
      return true;
    }
    if (ai?.handoff) return true; // помічник одразу передав питання студії
    const f = matchFaq(m.text);
    if (f) {
      const st = this.faqStats();
      st.matched++;
      st.views[f.id] = (st.views[f.id] || 0) + 1;
      await this.send(m.chat.id, L.faqAnswer(f), L.faqAnswerKeyboard());
      return true;
    }
    return this.forwardQuestion(m.chat.id, m.from, m.text);
  }

  /**
   * Передати питання людини без заявки студії (не більше 5 на день від людини).
   * summary — підсумок розмови від ІІ-помічника; quiet — людині вже відповів помічник, окремо не повідомляємо.
   */
  async forwardQuestion(chatId, from, text, { summary = null, quiet = false, upset = false } = {}) {
    const L = this.t(from.id);
    const studio = this.data.config.adminChatId;
    if (!studio || !text) return false;
    const user = this.data.users[String(from.id)] || {};
    if (user.questionDay !== todayKey()) { user.questionDay = todayKey(); user.questions = 0; }
    if (user.questions >= 5) {
      if (!quiet) await this.send(chatId, L.QUESTION_LIMIT);
      return true;
    }
    try {
      const note = summary ? `\n\n🤖 <b>ИИ-помощник передал вопрос.</b>\n${escapeHtml(summary)}` : '';
      const urgent = upset ? '🔴 <b>Клієнт незадоволений — відповісти першочергово</b>\n' : '';
      const sent = await this.send(studio, `${urgent}${T.studioQuestionHeader(from)}\n\n${escapeHtml(text)}${note}`);
      const relay = (this.data.relay ||= {});
      relay[this.relayKey(sent.message_id, studio)] = { userId: from.id, question: true, epoch: this.data.orderEpoch };
    } catch (err) {
      log.warn(`Вопрос не передан студии: ${err.message}`);
      return false;
    }
    user.questions = (user.questions || 0) + 1;
    this.faqStats().forwarded++;
    store.save();
    if (!quiet) await this.send(chatId, L.QUESTION_FORWARDED);
    return true;
  }

  /** Відповідь студії на питання без заявки. Повертає true, якщо це була відповідь на таке питання. */
  async onQuestionReply(m) {
    const target = m.reply_to_message?.message_id;
    const mapped = target && this.data.relay?.[this.relayKey(target, m.chat.id)];
    if (!mapped?.question || !this.isOwnerChat(m.chat.id)) return false;
    const L = this.t(mapped.userId);
    try {
      if (m.text) {
        await this.send(mapped.userId, `${L.STUDIO_ANSWER}\n\n${escapeHtml(m.text)}`);
        // Відповідь студії — і в розмову помічника в Mini App
        if (chatOn()) { addAiHistory(mapped.userId, 'studio', m.text); store.save(); }
      }
      else {
        await this.send(mapped.userId, L.STUDIO_ANSWER);
        await this.tg.call('copyMessage', { chat_id: mapped.userId, from_chat_id: m.chat.id, message_id: m.message_id });
      }
    } catch (err) {
      const reason = err.status === 403 ? 'человек заблокировал бота' : err.description || err.message;
      await this.send(m.chat.id, `⚠️ Не доставлено: ${escapeHtml(reason)}`).catch(() => {});
      return true;
    }
    await this.tg.call('setMessageReaction', { chat_id: m.chat.id, message_id: m.message_id, reaction: [{ type: 'emoji', emoji: '👍' }] }).catch(() => {});
    return true;
  }

  // --- Мова ---

  /** Перемикає мову клієнта й показує меню новою мовою. */
  async switchLanguage(chatId, userId, lang) {
    const user = this.data.users[String(userId)];
    if (!user || !englishEnabled()) return this.send(chatId, T.LANG_SET, T.mainMenu());
    user.lang = lang || (user.lang === 'en' ? 'uk' : 'en');
    store.save();
    const L = this.t(userId);
    return this.send(chatId, `${L.LANG_SET}\n\n${L.WELCOME}`, L.mainMenu());
  }

  // --- Швидкі відповіді студії ---

  /** Ключ пересланого повідомлення: у чаті власника — номер повідомлення, у чаті дизайнера — «чат:номер». */
  relayKey(messageId, chatId) {
    return !chatId || this.isOwnerChat(chatId) ? String(messageId) : `${chatId}:${messageId}`;
  }

  /** Замовлення, якому адресована відповідь студії (за повідомленням, на яке відповіли). Дизайнер — лише свої. */
  orderForReply(m) {
    const target = m.reply_to_message?.message_id;
    if (!target) return null;
    let order = null;
    const mapped = this.data.relay?.[this.relayKey(target, m.chat.id)];
    if (mapped && mapped.epoch === this.data.orderEpoch) order = this.data.inquiries.find((o) => o.id === mapped.orderId) || null;
    if (!order) {
      order = this.data.inquiries.find((o) => (o.adminMessage?.messageId === target && String(o.adminMessage.chatId) === String(m.chat.id))
        || (o.designerMessage?.messageId === target && String(o.designerMessage.chatId) === String(m.chat.id))) || null;
    }
    return order && this.canWork(m.chat.id, order) ? order : null;
  }

  async onQuickReplyCommand(m, arg) {
    const list = replyList();
    const order = this.orderForReply(m);
    const key = String(arg || '').trim();
    if (!key || !order) {
      const lines = list.map((r, i) => `<b>${i + 1}.</b> ${escapeHtml(r.title)}`);
      const hint = order
        ? 'Чтобы отправить, ответьте на сообщение клиента командой <code>/r номер</code>, например <code>/r 1</code>.'
        : 'Ответьте командой <code>/r номер</code> на сообщение клиента или на карточку заявки — бот отправит шаблон этому клиенту.';
      return this.send(m.chat.id, list.length
        ? `💬 <b>Быстрые ответы</b>\n\n${lines.join('\n')}\n\n${hint}\nНастроить шаблоны — на странице бота: «Настройки» → «Быстрые ответы».`
        : 'Быстрых ответов пока нет — добавьте их на странице бота: «Настройки» → «Быстрые ответы».');
    }
    const reply = findReply(key);
    if (!reply) return this.send(m.chat.id, `Нет шаблона «${escapeHtml(key)}». Список — команда /r.`);
    const text = fillReply(reply, order);
    try {
      await this.messageClient(order, text, 'telegram', this.memberOfChat(m.chat.id)?.name);
    } catch (err) {
      const reason = err.status === 403 ? 'клиент заблокировал бота' : err.description || err.message;
      return this.send(m.chat.id, `⚠️ Не доставлено клиенту (#${orderNo(order.id)}): ${escapeHtml(reason)}`);
    }
    return this.tg.call('setMessageReaction', {
      chat_id: m.chat.id, message_id: m.message_id, reaction: [{ type: 'emoji', emoji: '👍' }],
    }).catch(() => this.send(m.chat.id, `✅ Отправлено клиенту: «${escapeHtml(reply.title)}»`).catch(() => {}));
  }

  // --- Переписка клієнта з дизайнером ---

  /** Замовлення, до якого прив'язуємо листування: останнє активне, інакше просто останнє. */
  chatOrderFor(userId) {
    const own = this.data.inquiries.filter((o) => o.userId === userId);
    const open = own.filter((o) => o.status === 'new' || o.status === 'in_progress').at(-1);
    if (open || !chatOn()) return open || own.at(-1) || null;
    // Увімкнено ІІ-помічника: дизайнеру йде лише відкрите замовлення або щойно здане (правки, питання по результату)
    // чи те, де студія писала нещодавно. Решту (питання постійних клієнтів) відповідає помічник.
    const last = own.at(-1);
    if (!last) return null;
    const now = Date.now();
    const doneRecently = last.doneAt && now - Date.parse(last.doneAt) < 7 * 24 * 60 * 60 * 1000;
    const lastStudio = (last.messages || []).filter((x) => x.from === 'studio').at(-1);
    const studioRecently = lastStudio && now - Date.parse(lastStudio.at) < 3 * 24 * 60 * 60 * 1000;
    return doneRecently || studioRecently || isOpen(last) ? last : null;
  }

  mapRelay(messageId, order, chatId = null) {
    const relay = (this.data.relay ||= {});
    relay[this.relayKey(messageId, chatId)] = { orderId: order.id, epoch: this.data.orderEpoch };
    const keys = Object.keys(relay);
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX_RELAY))) delete relay[k];
  }

  async relayToStudio(m, order) {
    try {
      await this.forwardToTeam(order, T.studioChatHeader(order, m.from), m);
    } catch (err) {
      log.warn(`Повідомлення клієнта по заявці #${orderNo(order.id)} не передано: ${err.message}`);
      store.addError('chat', err);
      return this.send(m.chat.id, this.t(m.from.id).CHAT_NO_STUDIO);
    }
    const media = messageMedia(m);
    (order.messages ||= []).push({ at: new Date().toISOString(), from: 'client', text: describeMessage(m), ...(media.length ? { media } : {}) });
    order.unread = (order.unread || 0) + 1;
    store.save();
    // Уночі/у вихідні — автовідповідь про робочий час замість звичайного підтвердження
    if (await this.offHoursReply(m.chat.id, m.from.id)) return undefined;
    // Підтвердження клієнту — не частіше ніж раз на 10 хвилин, щоб не засмічувати чат
    const now = Date.now();
    if (!order.lastAckAt || now - Date.parse(order.lastAckAt) > 10 * 60 * 1000) {
      order.lastAckAt = new Date(now).toISOString();
      await this.send(m.chat.id, this.t(m.from.id).CHAT_RELAYED);
    }
    return undefined;
  }

  /** Студія відповіла через «Відповісти». Повертає false, якщо це не відповідь на наше повідомлення. */
  async onStudioReply(m) {
    const order = this.orderForReply(m);
    if (!order) return false;
    const member = this.memberOfChat(m.chat.id);

    try {
      const header = this.t(order.userId).designerHeader(order);
      if (m.text) await this.send(order.userId, `${header}\n\n${escapeHtml(m.text)}`);
      else {
        await this.send(order.userId, header);
        await this.tg.call('copyMessage', { chat_id: order.userId, from_chat_id: m.chat.id, message_id: m.message_id });
      }
    } catch (err) {
      const reason = err.status === 403 ? 'клиент заблокировал бота' : err.description || err.message;
      await this.send(m.chat.id, `⚠️ Не доставлено клиенту (#${orderNo(order.id)}): ${escapeHtml(reason)}`, null, {
        reply_parameters: { message_id: m.message_id, allow_sending_without_reply: true },
      }).catch(() => {});
      return true;
    }
    const media = messageMedia(m);
    (order.messages ||= []).push({ at: new Date().toISOString(), from: 'studio', via: 'telegram', ...(member ? { by: member.name } : {}), text: describeMessage(m), ...(media.length ? { media } : {}) });
    order.unread = 0;
    store.save();
    // Позначка «доставлено» — реакція 👍 на повідомлення студії (або коротка відповідь, якщо реакції недоступні)
    await this.tg.call('setMessageReaction', {
      chat_id: m.chat.id, message_id: m.message_id, reaction: [{ type: 'emoji', emoji: '👍' }],
    }).catch(() => this.send(m.chat.id, '✅ Отправлено клиенту', null, {
      reply_parameters: { message_id: m.message_id, allow_sending_without_reply: true },
    }).catch(() => {}));
    return true;
  }

  /** Привітання після «Старт»: текст із кнопками «Відкрити miniApp» (якщо Mini App увімкнена) та перемикання мови. */
  async sendWelcome(chatId) {
    const L = this.t(chatId);
    const rows = [];
    const app = this.data.config.miniapp;
    if (app?.enabled && /^https:\/\//.test(app.url || '')) rows.push([{ text: L.OPEN_APP, web_app: { url: app.url } }]);
    // Без Mini App людині потрібне звичайне меню бота (мову можна змінити командою /language)
    if (rows.length && englishEnabled()) rows.push([{ text: L.LANG_SWITCH, callback_data: `lang:${langOf(chatId) === 'en' ? 'uk' : 'en'}` }]);
    try {
      await this.send(chatId, L.WELCOME, rows.length ? { inline_keyboard: rows } : L.mainMenu());
    } catch (err) {
      if (err.status === 403) return this.markBlocked(chatId, err);
      throw err;
    }
    return undefined;
  }

  async myOrders(chatId, userId) {
    const orders = this.data.inquiries.filter((o) => o.userId === userId).slice(-8).reverse();
    const ref = this.data.config.referral;
    const user = this.data.users[String(userId)];
    const L = this.t(userId);
    if (!orders.length) {
      await this.send(chatId, L.MSG.noOrders, L.myOrdersKeyboard([], this.data.orderEpoch, false));
      return;
    }
    const blocks = [L.MSG.yourOrders, ...orders.map((o) => L.myOrderBlock(o))];
    if (ref?.enabled && user?.bonuses > 0) blocks.push(L.bonusNote(ref.percent, user.bonuses));
    blocks.push(L.MY_ORDERS_FOOTER);
    await this.send(chatId, blocks.join('\n\n'), L.myOrdersKeyboard(orders, this.data.orderEpoch, ref?.enabled && this.canInvite(userId)));
  }

  // --- Доповнити пак ---

  async startRepeat(chatId, userId, source) {
    const L = this.t(userId);
    if (this.data.config.active === false) return this.send(chatId, L.PAUSED, L.mainMenu());
    await this.send(chatId, L.repeatIntro(source));
    const typeKey = source.typeKey || (/аніма|animat/i.test(source.stickerType) ? 'animated' : 'static');
    await this.startBrief(chatId, userId, null, {
      stickerType: L.OPTIONS.type[typeKey] || source.stickerType,
      typeKey,
      hero: source.hero,
      ...(source.style ? { style: source.style } : {}),
      ...(source.contact ? { contact: source.contact } : {}),
      repeatOf: { id: source.id, packName: source.pack?.name || null, packTitle: source.pack?.title || null },
      skip: ['type', 'hero', 'style', ...(source.contact ? ['contact'] : [])],
    });
    return undefined;
  }

  // --- Реферальна програма ---

  /** Запрошувати друзів можна лише після першого готового (закритого) замовлення. */
  canInvite(userId) {
    return this.data.inquiries.some((o) => String(o.userId) === String(userId) && o.status === 'done');
  }

  referralLink(userId) {
    return `https://t.me/${this.data.bot.username}?start=ref_${Number(userId).toString(36)}`;
  }

  async sendInvite(chatId, userId) {
    const ref = this.data.config.referral;
    const L = this.t(userId);
    if (!ref?.enabled || !this.data.bot.username) return this.send(chatId, L.MSG.referralOff);
    if (!this.canInvite(userId)) return this.send(chatId, L.referralLocked(ref.percent));
    const link = this.referralLink(userId);
    return this.send(chatId, L.inviteMessage(link, ref.percent), L.inviteKeyboard(link, ref.percent));
  }

  // --- Нагадування про незавершений бриф ---

  /** Один раз, через добу тиші, лише вдень за Києвом. Чернетки старші за 7 днів прибираємо. */
  async processReminders() {
    const now = Date.now();
    const hour = kyivHour();
    const daytime = hour >= REMIND_FROM_HOUR && hour < REMIND_TO_HOUR;
    for (const [userId, draft] of Object.entries(this.data.drafts)) {
      const idle = now - (Date.parse(draft.updatedAt || draft.startedAt) || now);
      if (idle > DRAFT_TTL) { delete this.data.drafts[userId]; continue; }
      if (draft.reminded || idle < REMIND_AFTER || !daytime) continue;
      if (this.data.users[userId]?.blocked) continue;
      draft.reminded = true;
      try {
        await this.send(Number(userId), this.t(userId).REMINDER, this.t(userId).reminderKeyboard());
        this.data.stats.remindersSent = (this.data.stats.remindersSent || 0) + 1;
        log.info(`Нагадування про бриф надіслано користувачу ${userId}`);
      } catch (err) {
        if (err.status === 403) delete this.data.drafts[userId];
        else log.warn(`Нагадування для ${userId} не надіслано: ${err.message}`);
      }
    }
    await this.remindAppDrafts(now, daytime);
    await this.payments.remindRemaining(daytime).catch((err) => log.warn(`payRemind: ${err.message}`));
    await this.supportOffers(now, daytime).catch((err) => log.warn(`supportOffer: ${err.message}`));
    await this.replyAlerts(now).catch((err) => log.warn(`replyAlert: ${err.message}`));
    // Журнал дій: зміни, зроблені в Telegram чи клієнтом (кнопки, оплата, кошторис)
    for (const o of this.data.inquiries) if (isOpen(o) || o.status === 'done') auditRecord(o, '', 'other');
    await this.sketches.remind();
    for (const job of ['vacationCheck', 'maybeSend', 'dueReminders', 'errorAlert']) {
      await this.digest[job]().catch((err) => log.warn(`${job}: ${err.message}`));
    }
    await this.winback.run().catch((err) => log.warn(`winback: ${err.message}`));
    store.save();
  }

  /** Незавершені заявки в Mini App: через добу простою — одне нагадування з кнопкою «Продовжити». */
  async remindAppDrafts(now, daytime) {
    const app = this.data.config.miniapp;
    const appOn = app?.enabled && /^https:\/\//.test(app.url || '');
    for (const [userId, user] of Object.entries(this.data.users)) {
      const d = user.appDraft;
      if (!d) continue;
      const idle = now - (Date.parse(d.at) || now);
      if (idle > DRAFT_TTL) { delete user.appDraft; continue; }
      if (d.reminded || idle < REMIND_AFTER || !daytime || !appOn) continue;
      // Уже надіслав заявку після того, як почав — нагадувати нема про що
      if (this.data.inquiries.some((o) => String(o.userId) === userId && o.createdAt > d.at)) { delete user.appDraft; continue; }
      if (user.blocked || user.studioBlocked) continue;
      d.reminded = true;
      const L = this.t(userId);
      const svc = findService(d.service);
      const url = `${app.url.replace(/\/+$/, '')}/?resume=1`;
      try {
        await this.send(Number(userId), L.appDraftReminder(svc ? (langOf(userId) === 'en' ? svc.nameEn : svc.name) : ''), { inline_keyboard: [[{ text: L.APP_DRAFT_BUTTON, web_app: { url } }]] });
        this.data.stats.remindersSent = (this.data.stats.remindersSent || 0) + 1;
        log.info(`Нагадування про незавершену заявку в Mini App надіслано користувачу ${userId}`);
      } catch (err) {
        if (err.status === 403) delete user.appDraft;
        else log.warn(`Нагадування (Mini App) для ${userId} не надіслано: ${err.message}`);
      }
    }
  }

  // --- Каталог робіт ---

  async showWorks(chatId) {
    const L = this.t(chatId);
    const items = catalog();
    const reviews = publishedReviews();
    if (!items.length && !reviews.length) return this.send(chatId, L.WORKS_EMPTY, L.mainMenu());
    const keyboard = L.worksListKeyboard(items);
    if (reviews.length) {
      const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
      keyboard.inline_keyboard.push([{ text: L.REVIEWS_BUTTON(avg, reviews.length), callback_data: 'rvw' }]);
    }
    return this.send(chatId, L.WORKS_LIST, keyboard);
  }

  async showWork(chatId, item) {
    // Живі стікери з пака. file_id прив'язані до токена — якщо не підходять, оновлюємо пак і пробуємо ще раз.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        for (const sticker of item.previewIds) {
          await this.tg.call('sendSticker', { chat_id: chatId, sticker });
          this.data.stats.messagesSent++;
        }
        break;
      } catch (err) {
        if (err.status === 403) throw err;
        if (attempt) { log.warn(`Превʼю пака ${item.name} не надіслано: ${err.message}`); break; }
        try { await refreshItem(this.tg, item); } catch (e) {
          log.warn(`Пак ${item.name} не оновлено: ${e.message}`);
          break;
        }
      }
    }
    return this.send(chatId, this.t(chatId).workCard(item), this.t(chatId).workKeyboard(item));
  }

  // --- Бриф ---

  async startBrief(chatId, userId, catalogRef = null, prefill = null) {
    sendAgentEvent(userId, 'brief_started', 'Почали бриф');
    if (this.data.config.active === false) {
      await this.send(chatId, this.t(userId).PAUSED, this.t(userId).mainMenu());
      return;
    }
    const vacation = this.vacation();
    if (vacation.active && !vacation.acceptOrders) {
      await this.send(chatId, this.vacationText(userId, true), this.t(userId).mainMenu());
      return;
    }
    // Не більше 3 заявок на добу від однієї людини — захист від спаму
    const today = todayKey();
    const todayOrders = this.data.inquiries.filter((o) => String(o.userId) === String(userId) && todayKey(new Date(o.createdAt)) === today).length;
    if (todayOrders >= 3 && !this.isOwnerChat(chatId)) {
      await this.send(chatId, this.t(userId).MSG.tooManyOrders, this.t(userId).mainMenu());
      return;
    }
    if (vacation.active) await this.send(chatId, this.vacationText(userId));
    this.bump('starts');
    this.funnel('start');
    this.funnel('type');
    const data = { refs: [], ...(catalogRef ? { catalogRef } : {}), ...(prefill || {}) };
    // Промокод з посилання ?start=promo_… — якщо ще діє
    const pending = this.data.users[String(userId)]?.pendingPromo;
    const promo = pending && findPromo(pending, Number(userId));
    if (promo) data.promo = { code: promo.code, percent: promo.percent };
    const savedGift = this.data.users[String(userId)]?.pendingGift;
    const gift = savedGift && findGift(savedGift);
    if (gift) data.gift = { code: gift.code, amount: gift.amount };
    const draft = { step: 'type', data, lastGroup: null, startedAt: new Date().toISOString() };
    this.data.drafts[userId] = draft;
    // Людина щойно говорила з ІІ-помічником — відоме з розмови (тип, кількість, герой, емоції) підставляємо
    if (!catalogRef && !prefill) await this.prefillFromAgent(chatId, userId, draft);
    // Доповнення пака: відомі кроки (тип, герой, контакт) пропускаємо
    if (data.skip?.includes('type') || draft.prefilled?.includes('type')) return this.advance(chatId, draft);
    await this.ask(chatId, draft);
  }

  /**
   * Бриф із розмови з помічником: поля, які людина вже назвала, заповнюємо й не питаємо вдруге
   * (у перевірці брифу їх можна змінити). Повідомляємо, що саме підставили.
   */
  async prefillFromAgent(chatId, userId, draft) {
    if (!chatOn() || !talkedRecently(userId)) return;
    const L = this.t(userId);
    this.tg.call('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});
    // Бриф у розмові: помічник розпитав усе — підставляємо й стиль, «без референсів» і контакт,
    // тоді людина одразу бачить підсумок брифу з кнопкою відправки.
    const styleList = activeStyles();
    let values = await extractFromAgent(userId, [
      { key: 'type', description: 'Які стікери хоче людина: статичні чи анімовані', options: ['static', 'animated'] },
      { key: 'qty', description: 'Скільки стікерів у паку хоче людина', options: ['5', '10', '15-20'] },
      { key: 'hero', description: 'Головний герой стікерів: хто це (людина, тварина, персонаж бренду) і який він — коротко' },
      { key: 'emotions', description: 'Емоції та фрази для стікерів, які людина назвала' },
      ...(styleList.length ? [{ key: 'style', description: 'Стиль, який людина обрала з запропонованих: ' + styleList.map((s) => `${s.id} — ${s.name}`).join('; '), options: styleList.map((s) => s.id) }] : []),
      { key: 'refs', description: 'Людина прямо сказала, що референсів (прикладів, фото героя) не буде або вони не потрібні', options: ['none'] },
      { key: 'contact', description: 'Телефон чи @username для звʼязку, якщо людина сама їх назвала' },
    ]);
    // Людина натиснула «Оформити» під розрахунком помічника — тип і кількість беремо з нього
    const user = this.data.users[String(userId)];
    const quote = user?.aiQuote && Date.now() - user.aiQuote.at < 60 * 60 * 1000 ? user.aiQuote : null;
    if (user) delete user.aiQuote;
    if (quote) values = { ...(values || {}), type: quote.typeKey, qty: quote.qtyKey };
    if (!values) return;
    const d = draft.data;
    const filled = [];
    if (values.type && Object.hasOwn(L.OPTIONS.type, values.type)) {
      d.typeKey = values.type; d.stickerType = L.OPTIONS.type[values.type]; filled.push('type');
    }
    if (values.qty && Object.hasOwn(L.OPTIONS.qty, values.qty)) {
      d.qtyKey = values.qty; d.quantity = L.OPTIONS.qty[values.qty]; filled.push('qty');
      const price = d.typeKey && T.priceFor(this.data.config.prices, d.typeKey, values.qty);
      if (price) d.priceHint = price;
    }
    if (values.hero) { d.hero = String(values.hero).slice(0, MAX_TEXT); filled.push('hero'); }
    if (values.emotions) { d.emotions = String(values.emotions).slice(0, MAX_TEXT); filled.push('emotions'); }
    const style = values.style && styleList.find((s) => s.id === values.style);
    if (style) { d.style = { id: style.id, name: style.name, nameEn: style.nameEn || '' }; filled.push('style'); }
    if (values.refs === 'none') { d.refs = []; filled.push('refs'); }
    // Контакт: названий у розмові, інакше — Telegram-нік (бот і так на звʼязку з людиною)
    const nick = this.data.users[String(userId)]?.username;
    const contact = values.contact ? String(values.contact).slice(0, MAX_SHORT) : nick ? '@' + nick : '';
    if (contact && filled.length) { d.contact = contact; filled.push('contact'); }
    if (!filled.length) return;
    draft.prefilled = filled;
    sendAgentEvent(userId, 'brief_prefilled', 'Бриф заповнено з розмови');
    const shown = (f) => (f === 'style' ? d.style.name : f === 'refs' ? L.REFS_NONE : d[{ type: 'stickerType', qty: 'quantity' }[f] || f]);
    const lines = filled.map((f) => `• ${L.EDIT_LABELS[f] || f}: <b>${escapeHtml(shown(f))}</b>`);
    const complete = ['type', 'qty', 'hero', 'emotions', 'refs', 'contact'].every((f) => filled.includes(f)) && (filled.includes('style') || !styleList.length);
    await this.send(chatId, L.aiPrefilled(lines.join('\n'), complete));
  }

  async ask(chatId, draft, { resume = false } = {}) {
    const L = this.t(chatId);
    if (resume && draft.step === 'refs') {
      return this.send(chatId, L.ASK_REFERENCES, L.refsKeyboard(draft.data.refs.length > 0));
    }
    switch (draft.step) {
      case 'type': return this.send(chatId, L.ASK_TYPE, L.choiceKeyboard('type'));
      case 'qty': {
        // Є готові пакети для цього типу — пропонуємо їх (і «Свій варіант»)
        const pkgs = draft.data.qtyManual ? [] : activePackages(draft.data.typeKey);
        if (pkgs.length) return this.send(chatId, L.packagesMessage(pkgs), L.packagesKeyboard(pkgs));
        return this.send(chatId, L.ASK_QUANTITY, L.choiceKeyboard('qty'));
      }
      case 'hero': return this.send(chatId, L.ASK_HERO);
      case 'style': {
        const list = activeStyles();
        try {
          await sendStyleExamples(this.tg, chatId, list, langOf(chatId), readUpload);
        } catch (err) { logOfferError(err); }
        return this.send(chatId, L.ASK_STYLE, L.styleKeyboard(list));
      }
      case 'emotions': {
        // ІІ-підказка: кнопка «Допоможіть з ідеями», якщо задано ключ Claude і є герой
        const ai = aiAvailable('briefIdeas') && draft.data.hero && (draft.aiTries || 0) < AI_TRIES;
        const keyboard = ai ? { inline_keyboard: [[{ text: L.AI_IDEAS_BUTTON, callback_data: 'ai_ideas' }]] } : undefined;
        return this.send(chatId, draft.data.repeatOf ? L.ASK_EMOTIONS_REPEAT : L.ASK_EMOTIONS, keyboard);
      }
      case 'refs':
        draft.data.refs = [];
        draft.lastGroup = null;
        return this.send(chatId, L.ASK_REFERENCES, L.refsKeyboard(false));
      case 'contact': return this.send(chatId, L.ASK_CONTACT, L.contactKeyboard());
      case 'confirm': {
        const promos = promoList().some((p) => p.active) && !draft.data.promo;
        return this.send(chatId, `${L.briefSummary(draft.data)}\n\n${L.MSG.allCorrect}`, L.confirmKeyboard(promos));
      }
      default: return undefined;
    }
  }

  // --- ІІ-підказка емоцій ---

  async onAiIdeas(cb, draft) {
    const chatId = cb.message.chat.id;
    const L = this.t(cb.from.id);
    if (!draft || draft.step !== 'emotions' || !aiAvailable('briefIdeas')) return this.answer(cb, L.MSG.buttonGone);
    const user = this.data.users[String(cb.from.id)] || {};
    const today = todayKey();
    if (user.aiDay !== today) { user.aiDay = today; user.aiCount = 0; }
    if ((draft.aiTries || 0) >= AI_TRIES || user.aiCount >= AI_DAILY || !takeClientAi()) {
      await this.answer(cb);
      return this.send(chatId, L.AI_LIMIT);
    }
    if (draft.aiBusy) return this.answer(cb);
    draft.aiBusy = true;
    draft.aiTries = (draft.aiTries || 0) + 1;
    user.aiCount = (user.aiCount || 0) + 1;
    await this.answer(cb, '💡');
    await this.removeButtons(cb.message);
    const wait = await this.send(chatId, L.AI_THINKING).catch(() => null);
    this.tg.call('sendChatAction', { chat_id: chatId, action: 'typing' }).catch(() => {});
    let ideas;
    try {
      ideas = await suggestEmotions({
        hero: draft.data.hero, stickerType: draft.data.stickerType, quantity: draft.data.quantity,
        catalogTitle: draft.data.catalogRef?.title, lang: langOf(cb.from.id),
        avoid: (draft.aiIdeas || []).map((i) => i.emotion),
      });
    } catch (err) {
      log.warn(`ІІ-підказка не вдалася: ${err.message}`);
      store.addError('ai', err);
      ideas = null;
    } finally {
      delete draft.aiBusy;
    }
    if (wait) this.tg.call('deleteMessage', { chat_id: chatId, message_id: wait.message_id }).catch(() => {});
    // Поки думали, клієнт міг піти далі — тоді ідеї вже не потрібні
    if (this.data.drafts[String(cb.from.id)] !== draft || draft.step !== 'emotions') return undefined;
    if (!ideas) return this.send(chatId, L.AI_FAILED);
    draft.aiIdeas = [...(draft.aiIdeas || []), ...ideas];
    draft.aiLast = ideasText(ideas, langOf(cb.from.id));
    store.save();
    return this.send(chatId, L.aiIdeasMessage(draft.aiLast), L.aiIdeasKeyboard(draft.aiTries < AI_TRIES && user.aiCount < AI_DAILY));
  }

  async onAiUse(cb, draft) {
    const L = this.t(cb.from.id);
    if (!draft || draft.step !== 'emotions' || !draft.aiLast) return this.answer(cb, L.MSG.buttonGone);
    await this.answer(cb, L.AI_USED);
    await this.removeButtons(cb.message);
    draft.data.emotions = draft.aiLast.slice(0, MAX_TEXT);
    draft.data.aiIdeas = true;
    return this.advance(cb.message.chat.id, draft);
  }

  async advance(chatId, draft) {
    // Змінювали одну відповідь — одразу назад до перевірки брифу
    if (draft.editing) {
      delete draft.editing;
      draft.step = 'confirm';
      return this.ask(chatId, draft);
    }
    draft.step = FLOW[FLOW.indexOf(draft.step) + 1];
    // Кроки, які пропускаємо: відомі з минулого замовлення, а «стиль» — якщо стилів не задано
    while (draft.data.skip?.includes(draft.step) || draft.prefilled?.includes(draft.step) || (draft.step === 'style' && !activeStyles().length)) {
      draft.step = FLOW[FLOW.indexOf(draft.step) + 1];
    }
    this.funnel(draft.step);
    return this.ask(chatId, draft);
  }

  /** Меню «Змінити відповідь» на кроці перевірки брифу. */
  editKeyboard(draft, L) {
    const fields = ['type', 'qty', 'hero', 'style', 'emotions', 'refs', 'contact']
      .filter((f) => !draft.data.skip?.includes(f) && (f !== 'style' || activeStyles().length));
    const rows = [];
    for (let i = 0; i < fields.length; i += 2) {
      rows.push(fields.slice(i, i + 2).map((f) => ({ text: L.EDIT_LABELS[f], callback_data: `edit:${f}` })));
    }
    rows.push([{ text: L.EDIT_BACK, callback_data: 'edit_back' }]);
    return { inline_keyboard: rows };
  }

  async tooLong(m, limit) {
    if (m.text.length <= limit) return false;
    await this.send(m.chat.id, this.t(m.from.id).MSG.tooLong(limit));
    return true;
  }

  async onDraftMessage(draft, m) {
    const chatId = m.chat.id;
    const { data } = draft;
    const L = this.t(m.from.id);
    switch (draft.step) {
      case 'type':
        return this.send(chatId, L.MSG.pickButton);
      case 'qty':
        if (!m.text) return this.send(chatId, L.MSG.pickButton);
        if (await this.tooLong(m, MAX_SHORT)) return undefined;
        data.quantity = m.text.trim();
        delete data.qtyKey; // своя кількість — ціну назве дизайнер
        delete data.priceHint;
        delete data.package;
        return this.advance(chatId, draft);
      case 'style':
        // Стиль можна описати словами замість кнопки
        if (!m.text) return this.send(chatId, L.MSG.pickButton);
        if (await this.tooLong(m, MAX_SHORT)) return undefined;
        data.style = { id: 'text', name: m.text.trim() };
        return this.advance(chatId, draft);
      case 'hero':
      case 'emotions': {
        // Можна відповісти голосовим (або відеокружком) — пересилаємо студії разом із заявкою
        const voice = m.voice || m.video_note || m.audio;
        if (voice) {
          const kind = m.voice ? 'voice' : m.video_note ? 'video_note' : 'audio';
          (data.voices ||= []).push({ step: draft.step, type: kind, fileId: voice.file_id, duration: voice.duration || 0 });
          data[draft.step] = L.voiceAnswer(voice.duration || 0);
          if (draft.step === 'emotions') delete data.aiIdeas;
          await this.send(chatId, L.VOICE_SAVED);
          return this.advance(chatId, draft);
        }
        if (!m.text) return this.send(chatId, L.MSG.textPlease);
        if (await this.tooLong(m, MAX_TEXT)) return undefined;
        data[draft.step] = m.text.trim();
        // Текстом замість голосового — старе голосове для цього кроку прибираємо
        if (data.voices) data.voices = data.voices.filter((v) => v.step !== draft.step);
        // Свій список замість ІІ-ідей (навіть якщо взятий за основу) — це вже текст клієнта
        if (draft.step === 'emotions') delete data.aiIdeas;
        return this.advance(chatId, draft);
      }
      case 'refs':
        return this.onReference(draft, m);
      case 'contact': {
        let contact = null;
        if (m.contact) contact = m.contact.phone_number;
        else if (m.text) {
          if (await this.tooLong(m, MAX_SHORT)) return undefined;
          contact = m.text.trim();
        }
        if (!contact) return this.send(chatId, L.MSG.contactAsk, L.contactKeyboard());
        data.contact = contact;
        await this.send(chatId, L.MSG.thanks, { remove_keyboard: true });
        return this.advance(chatId, draft);
      }
      case 'confirm':
        // Клієнт натиснув «Маю промокод» і надіслав код
        if (draft.awaitPromo && m.text) {
          delete draft.awaitPromo;
          // Не більше 10 невдалих спроб коду на день — щоб не підбирали
          const user = this.data.users[String(m.from.id)] || {};
          if (user.promoFailDay !== todayKey()) { user.promoFailDay = todayKey(); user.promoFails = 0; }
          const blocked = user.promoFails >= 10;
          const promo = !blocked && findPromo(m.text, m.from.id);
          const gift = !blocked && !promo && findGift(m.text);
          if (!promo && !gift) user.promoFails = (user.promoFails || 0) + 1;
          if (promo) {
            data.promo = { code: promo.code, percent: promo.percent };
            await this.send(chatId, L.promoApplied(promo.code, promo.percent));
          } else if (gift) {
            data.gift = { code: gift.code, amount: gift.amount };
            await this.send(chatId, L.giftApplied(gift));
          } else await this.send(chatId, L.PROMO_BAD);
          return this.ask(chatId, draft);
        }
        return this.send(chatId, L.MSG.pressBriefButton);
      default:
        return undefined;
    }
  }

  async onReference(draft, m) {
    const L = this.t(m.from.id);
    const ref = extractRef(m);
    if (!ref) return this.send(m.chat.id, L.MSG.refAsk, L.refsKeyboard(false));
    // Альбом приходить окремими повідомленнями — відповідаємо один раз на всю групу.
    const group = m.media_group_id || null;
    const firstInGroup = !group || group !== draft.lastGroup;
    draft.lastGroup = group;
    if (draft.data.refs.length >= MAX_REFS) {
      if (firstInGroup) await this.send(m.chat.id, L.MSG.refMax(MAX_REFS), L.refsKeyboard(true));
      return undefined;
    }
    draft.data.refs.push(ref);
    if (firstInGroup) await this.send(m.chat.id, L.MSG.refGot, L.refsKeyboard(true));
    return undefined;
  }

  // --- Кнопки ---

  async onCallback(cb) {
    const data = cb.data || '';
    const msg = cb.message;
    if (!msg) return this.answer(cb);
    this.touchUser(cb.from);
    const userId = String(cb.from.id);
    const draft = this.data.drafts[userId];
    const L = this.t(userId);
    const stale = () => this.answer(cb, L.MSG.staleButton, true);

    if (data.startsWith('oa:')) return this.onStatusButton(cb);
    if (data === 'lang:en' || data === 'lang:uk') {
      await this.answer(cb);
      await this.removeButtons(msg);
      return this.switchLanguage(msg.chat.id, userId, data.slice(5));
    }
    // Розділ бота за порадою помічника
    if (data.startsWith('ab:') && Object.hasOwn(AI_SECTIONS, data.slice(3))) {
      await this.answer(cb);
      return this.openSection(msg.chat.id, userId, data.slice(3));
    }
    // Підказка наступного питання — ніби людина написала його сама
    if (/^sq:[0-2]$/.test(data)) {
      const text = this.data.users[userId]?.aiSuggest?.[Number(data.slice(3))];
      if (!text) return stale();
      await this.answer(cb);
      await this.tg.call('editMessageReplyMarkup', { chat_id: msg.chat.id, message_id: msg.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
      await this.send(msg.chat.id, '💬 <i>' + escapeHtml(text) + '</i>');
      const answered = await this.answerQuestion({ message_id: null, from: cb.from, chat: msg.chat, text });
      if (!answered) await this.send(msg.chat.id, L.MSG.notUnderstood, L.mainMenu());
      return;
    }
    // Оцінка відповіді ІІ-помічника — у воронку агента (GenAgent), кнопки прибираємо
    if (data === 'air:up' || data === 'air:down') {
      sendAgentEvent(userId, data === 'air:up' ? 'rating_up' : 'rating_down');
      await this.answer(cb, data === 'air:up' ? '🧡 Дякуємо!' : 'Дякуємо — передамо, щоб помічник відповідав краще.');
      await this.tg.call('editMessageReplyMarkup', { chat_id: msg.chat.id, message_id: msg.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
      return;
    }
    if (data === 'ai_ideas') return this.onAiIdeas(cb, draft);
    if (data === 'ai_use') return this.onAiUse(cb, draft);

    // Кошторис: рішення клієнта
    if (data.startsWith('qa:') || data.startsWith('qq:')) {
      const [kind, epoch, id, n] = data.split(':');
      return this.quotes.onDecision(cb, kind, epoch, id, n);
    }
    // Скасування заявки клієнтом
    if (data.startsWith('cx:') || data.startsWith('cxr:') || data === 'cxn') return this.onCancelButton(cb, data);
    // Згода показати роботу в каналі
    if (data.startsWith('sc:')) return this.onShowcaseAnswer(cb, data);
    // Приймання етапу проєкту клієнтом
    if (data.startsWith('pv:')) return this.onStageAnswer(cb, data);
    // Пропозиція супроводу після запуску бота
    if (data.startsWith('so:')) return this.onSupportAnswer(cb, data);
    // Оплата на картку: клієнт «Я оплатив», власник «Гроші прийшли / Не прийшло»
    if (data.startsWith('cp:')) {
      const [, epoch, id, idx] = data.split(':');
      return this.payments.onCardReported(cb, epoch, id, idx);
    }
    if (data.startsWith('cpo:') || data.startsWith('cpn:')) {
      if (!this.isOwnerChat(msg.chat.id)) return this.answer(cb, 'Недостатньо прав', true);
      return this.payments.onCardConfirmButton(cb, data);
    }
    // Часті питання
    if (data.startsWith('fq:')) {
      await this.answer(cb);
      const id = data.slice(3);
      if (id === 'list') return this.showFaq(msg.chat.id);
      if (id === 'ask') {
        const q = this.data.users[userId]?.lastQuestion;
        if (!q) return this.send(msg.chat.id, L.FAQ_EMPTY);
        delete this.data.users[userId].lastQuestion;
        return this.forwardQuestion(msg.chat.id, cb.from, q);
      }
      const f = findFaq(id);
      if (!f) return this.showFaq(msg.chat.id);
      const st = this.faqStats();
      st.views[f.id] = (st.views[f.id] || 0) + 1;
      return this.send(msg.chat.id, L.faqAnswer(f), L.faqAnswerKeyboard());
    }
    // Подарункові сертифікати
    if (data === 'gift') { await this.answer(cb); return this.gifts.offer(msg.chat.id); }
    if (data.startsWith('gf:')) return this.gifts.buy(cb, data.slice(3));

    // Зміна відповіді та промокод на кроці перевірки брифу
    if (data === 'edit_menu' || data === 'edit_back' || data.startsWith('edit:') || data === 'promo_ask') {
      if (!draft || draft.step !== 'confirm') return stale();
      await this.answer(cb);
      if (data === 'edit_menu') {
        return this.tg.call('editMessageReplyMarkup', { chat_id: msg.chat.id, message_id: msg.message_id, reply_markup: this.editKeyboard(draft, L) }).catch(() => {});
      }
      if (data === 'edit_back') {
        const promos = promoList().some((p) => p.active) && !draft.data.promo;
        return this.tg.call('editMessageReplyMarkup', { chat_id: msg.chat.id, message_id: msg.message_id, reply_markup: L.confirmKeyboard(promos) }).catch(() => {});
      }
      await this.removeButtons(msg);
      if (data === 'promo_ask') {
        draft.awaitPromo = true;
        return this.send(msg.chat.id, L.PROMO_ASK);
      }
      const field = data.slice(5);
      if (!Object.hasOwn(L.EDIT_LABELS, field) || draft.data.skip?.includes(field)) return this.ask(msg.chat.id, draft);
      draft.editing = true;
      draft.step = field;
      if (field === 'qty') delete draft.data.qtyManual; // знову показати пакети
      if (field === 'refs') await this.send(msg.chat.id, L.EDIT_REFS_NOTE);
      return this.ask(msg.chat.id, draft);
    }

    // Кнопки студії: власник — усі, дизайнер — лише ескізи своїх заявок
    const inStudio = this.isOwnerChat(msg.chat.id);
    if (data.startsWith('py:') || data.startsWith('pya:') || data === 'pyc') {
      if (!inStudio) return this.answer(cb, 'Недостатньо прав', true);
      if (data.startsWith('py:')) {
        const [, epoch, id] = data.split(':');
        return this.payments.startAsk(cb, epoch, id);
      }
      return this.payments.onAskButton(cb, data);
    }
    if (data.startsWith('pk:') || data === 'pks' || data === 'pkc') {
      if (!inStudio) return this.answer(cb, 'Недостатньо прав', true);
      if (data === 'pks') return this.packs.build(cb);
      if (data === 'pkc') return this.packs.cancel(cb);
      const [, epoch, id] = data.split(':');
      return this.packs.startSession(cb, epoch, id);
    }
    if (data.startsWith('rep:')) {
      const [, epoch, id] = data.split(':');
      const source = (epoch || undefined) === (this.data.orderEpoch || undefined)
        && this.data.inquiries.find((o) => o.id === Number(id) && o.userId === cb.from.id);
      // Доповнити можна лише стікерпак: бриф на бота чи персонажа так не повторюється
      if (!source || !T.isStickerOrder(source)) return this.answer(cb, L.MSG.orderGone, true);
      await this.answer(cb);
      return this.startRepeat(msg.chat.id, userId, source);
    }
    if (data === 'invite') {
      await this.answer(cb);
      return this.sendInvite(msg.chat.id, cb.from.id);
    }
    if (data.startsWith('sk:') || data === 'sks' || data === 'skc') {
      if (!inStudio && !this.memberOfChat(msg.chat.id)) return this.answer(cb, 'Недостатньо прав', true);
      if (data === 'sks') return this.sketches.sendSession(cb);
      if (data === 'skc') return this.sketches.cancelSession(cb);
      const [, epoch, id] = data.split(':');
      return this.sketches.startSession(cb, epoch, id);
    }
    if (data.startsWith('ap:') || data.startsWith('rv:')) {
      const [kind, epoch, id, round] = data.split(':');
      return this.sketches.onDecision(cb, kind, epoch, id, round);
    }

    // Відгуки
    if (data.startsWith('rt:')) {
      const [, epoch, id, rating] = data.split(':');
      return this.reviews.onRate(cb, epoch, id, rating);
    }
    if (data.startsWith('rs:')) {
      const [, epoch, id] = data.split(':');
      return this.reviews.onSkip(cb, epoch, id);
    }
    if (data === 'rvw') {
      await this.answer(cb);
      const reviews = publishedReviews();
      if (!reviews.length) return this.send(msg.chat.id, L.MSG.noReviews);
      return this.send(msg.chat.id, L.reviewsMessage(reviews));
    }

    // Розсилка: відписка / повторна підписка
    if (data === 'unsub' || data === 'resub') {
      const user = this.data.users[userId];
      if (user) user.unsubscribed = data === 'unsub';
      await this.answer(cb, data === 'unsub' ? L.MSG.unsubscribedShort : L.MSG.subscribedShort);
      if (data === 'unsub') return this.send(msg.chat.id, L.UNSUBSCRIBED, L.resubscribeKeyboard());
      await this.removeButtons(msg);
      return this.send(msg.chat.id, L.RESUBSCRIBED);
    }

    if (data === 'wl') {
      await this.answer(cb);
      return this.showWorks(msg.chat.id);
    }
    if (data.startsWith('wv:') || data.startsWith('wo:')) {
      const item = findItem(data.slice(3));
      if (!item) return this.answer(cb, L.MSG.workGone, true);
      await this.answer(cb);
      if (data.startsWith('wv:')) return this.showWork(msg.chat.id, item);
      await this.send(msg.chat.id, L.workOrderIntro(item));
      return this.startBrief(msg.chat.id, userId, { name: item.name, title: item.title });
    }

    if (data.startsWith('ch:')) {
      const [, field, key] = data.split(':');
      const label = Object.hasOwn(L.OPTIONS, field) && Object.hasOwn(L.OPTIONS[field], key) ? L.OPTIONS[field][key] : null;
      if (!draft || draft.step !== field || !label) return this.answer(cb, L.MSG.buttonGone);
      await this.answer(cb);
      const prompt = field === 'type' ? L.ASK_TYPE : L.ASK_QUANTITY;
      await this.tg.call('editMessageText', {
        chat_id: msg.chat.id, message_id: msg.message_id,
        text: `${prompt}\n\n➡️ <b>${label}</b>`, parse_mode: 'HTML',
      }).catch(() => {});
      if (key === T.CUSTOM) return this.send(msg.chat.id, L.ASK_QUANTITY_CUSTOM);
      if (field === 'type') {
        draft.data.stickerType = label;
        draft.data.typeKey = key;
        // Змінили тип при редагуванні — орієнтир ціни перераховуємо під ту ж кількість
        if (draft.editing && draft.data.qtyKey) {
          const price = T.priceFor(this.data.config.prices, key, draft.data.qtyKey);
          if (price) draft.data.priceHint = price; else delete draft.data.priceHint;
        }
      } else {
        delete draft.data.package;
        draft.data.quantity = label;
        draft.data.qtyKey = key;
        const price = T.priceFor(this.data.config.prices, draft.data.typeKey, key);
        if (price) {
          draft.data.priceHint = price;
          await this.send(msg.chat.id, L.priceHintMessage(price));
        } else delete draft.data.priceHint;
      }
      return this.advance(msg.chat.id, draft);
    }

    // Пакет у брифі
    if (data.startsWith('pg:')) {
      if (!draft || draft.step !== 'qty') return this.answer(cb, L.MSG.buttonGone);
      await this.answer(cb);
      const id = data.slice(3);
      const pkg = id !== 'custom' && findPackage(id);
      await this.removeButtons(msg);
      if (!pkg) {
        draft.data.qtyManual = true;
        return this.ask(msg.chat.id, draft);
      }
      const qtyLabel = L.OPTIONS.qty[pkg.qty] || pkg.qty;
      Object.assign(draft.data, {
        package: { id: pkg.id, name: pkg.name, nameEn: pkg.nameEn || '', price: pkg.price },
        quantity: qtyLabel, priceHint: L.money(pkg.price),
      });
      if (L.OPTIONS.qty[pkg.qty]) draft.data.qtyKey = pkg.qty; else delete draft.data.qtyKey;
      await this.send(msg.chat.id, `📦 <b>${escapeHtml(L.packageName(pkg))}</b> — ${L.money(pkg.price)}`);
      return this.advance(msg.chat.id, draft);
    }
    // Стиль у брифі
    if (data.startsWith('st:')) {
      if (!draft || draft.step !== 'style') return this.answer(cb, L.MSG.buttonGone);
      const id = data.slice(3);
      const st = id === 'any' ? null : findStyle(id);
      if (id !== 'any' && !st) return this.answer(cb, L.MSG.buttonGone);
      await this.answer(cb);
      draft.data.style = st ? { id: st.id, name: st.name, nameEn: st.nameEn || '' } : { id: 'any', name: T.STYLE_ANY, nameEn: textsFor('en').STYLE_ANY };
      await this.tg.call('editMessageText', {
        chat_id: msg.chat.id, message_id: msg.message_id, parse_mode: 'HTML',
        text: `${L.ASK_STYLE}\n\n➡️ <b>${escapeHtml(st ? L.styleName(st) : L.STYLE_ANY)}</b>`,
      }).catch(() => {});
      return this.advance(msg.chat.id, draft);
    }

    if (data === 'brief_start') {
      await this.answer(cb);
      return this.startBrief(msg.chat.id, userId);
    }
    // «Оформити» під розрахунком помічника: тип і кількість — з розрахунку, решту бриф підставить з розмови
    const bq = /^bq:(static|animated):(5|10|15-20)$/.exec(data);
    if (bq) {
      await this.answer(cb);
      const user = this.data.users[String(userId)];
      if (user) user.aiQuote = { typeKey: bq[1], qtyKey: bq[2], at: Date.now() };
      return this.startBrief(msg.chat.id, userId);
    }

    if (data === 'draft_resume' || data === 'draft_drop') {
      await this.answer(cb);
      await this.removeButtons(msg);
      if (!draft) return this.send(msg.chat.id, L.MSG.draftGone, L.mainMenu());
      if (data === 'draft_drop') {
        delete this.data.drafts[userId];
        return this.send(msg.chat.id, L.MSG.draftLater, L.mainMenu());
      }
      this.data.stats.remindersResumed = (this.data.stats.remindersResumed || 0) + 1;
      return this.ask(msg.chat.id, draft, { resume: true });
    }

    if (data === 'refs_done') {
      if (!draft || draft.step !== 'refs') return stale();
      await this.answer(cb);
      await this.removeButtons(msg);
      return this.advance(msg.chat.id, draft);
    }

    if (data === 'order_send' || data === 'order_restart' || data === 'order_cancel') {
      if (!draft || draft.step !== 'confirm') return stale();
      delete this.data.drafts[userId]; // одразу — щоб подвійний клік не створив два замовлення
      await this.answer(cb);
      await this.removeButtons(msg);
      if (data === 'order_restart') return this.startBrief(msg.chat.id, userId);
      if (data === 'order_cancel') return this.send(msg.chat.id, L.MSG.requestCancelled, L.mainMenu());
      return this.submitOrder(cb.from, msg.chat.id, draft.data);
    }

    return stale();
  }

  async submitOrder(from, chatId, d) {
    const order = {
      id: this.data.nextOrderId++,
      createdAt: new Date().toISOString(),
      userId: from.id,
      username: from.username || null,
      fullName: [from.first_name, from.last_name].filter(Boolean).join(' '),
      stickerType: d.stickerType,
      typeKey: d.typeKey || null,
      quantity: d.quantity,
      hero: d.hero,
      emotions: d.emotions,
      contact: d.contact || null,
      priceHint: d.priceHint || null,
      source: this.data.users[String(from.id)]?.source || null,
      catalogRef: d.catalogRef || null,
      ...(d.likeExample ? { likeExample: d.likeExample } : {}),
      ...(d.package ? { package: d.package } : {}),
      ...(d.style ? { style: d.style } : {}),
      repeatOf: d.repeatOf || null,
      refs: d.refs || [],
      ...(d.voices?.length ? { voices: d.voices } : {}),
      ...(d.service && d.service !== 'stickers' ? { service: d.service, project: d.project || {} } : {}),
      lang: langOf(from.id),
      ...(d.promo && findPromo(d.promo.code, from.id) ? { promo: d.promo } : {}),
      ...(d.aiIdeas ? { aiIdeas: true } : {}),
      ...(this.viaPost(from.id) ? { viaPost: this.viaPost(from.id) } : {}),
      status: 'new',
      pipelineStage: 'new',
      takenAt: null,
      doneAt: null,
      history: [{ at: new Date().toISOString(), status: 'new', by: 'клієнт' }],
      studio: { price: '', deadline: '', note: '' },
      messages: [],
    };
    this.data.inquiries.push(order);
    sendAgentEvent(from.id, 'brief_sent', order.service && order.service !== 'stickers' ? 'Заявка на проєкт' : 'Бриф відправлено');
    if (order.promo) {
      usePromo(order.promo.code);
      delete this.data.users[String(from.id)]?.pendingPromo;
    }
    // Сертифікат: введений у брифі або збережений за посиланням
    if (d.gift?.code && this.data.users[String(from.id)]) this.data.users[String(from.id)].pendingGift = d.gift.code;
    const giftNote = this.gifts.applyOnSubmit(order, from.id);
    this.winback.markReturn(order, from.id);
    this.funnel('sent');
    this.bump('orders');
    const referralNotes = this.applyReferral(order, from.id);
    store.saveNow();
    log.info(`Нова заявка #${orderNo(order.id)} від ${order.username ? `@${order.username}` : order.userId}`);

    // Заявка вже збережена — студія має отримати її, навіть якщо клієнту написати не вдалося
    // (Mini App без /start, бот заблоковано, збій мережі).
    // PDF і файли можуть збиратися кілька секунд — не тримаємо інших клієнтів у черзі
    this.notifyStudio(order).then(() => this.autoAssign(order)).catch((err) => {
      log.error(`Заявку #${orderNo(order.id)} не вдалося надіслати в студію: ${err.message}`);
      store.addError('notify', err);
    });

    const L = this.t(from.id);
    try {
      await this.send(
        chatId,
        `${L.MSG.submitted(orderNo(order.id))}\n\n${L.CHAT_HINT_AFTER_ORDER}` +
        (referralNotes.friend ? `\n\n${referralNotes.friend}` : '') + (giftNote ? `\n\n${giftNote}` : ''),
        L.mainMenu(),
      );
      await this.offHoursReply(chatId, from.id);
    } catch (err) {
      log.warn(`Клієнту заявки #${orderNo(order.id)} не надіслано підтвердження: ${err.description || err.message}`);
    }
    if (referralNotes.referrerId) {
      await this.send(referralNotes.referrerId, this.t(referralNotes.referrerId).referralReferrerNote(this.data.config.referral.percent)).catch(() => {});
    }
    return order;
  }

  /**
   * Реферальна програма при новому замовленні: перше замовлення запрошеного — знижка йому,
   * бонус на наступне — тому, хто запросив. Також позначаємо наявні бонуси клієнта.
   */
  applyReferral(order, userId) {
    const ref = this.data.config.referral;
    const notes = {};
    if (!ref?.enabled) return notes;
    const user = this.data.users[String(userId)];
    if (!user) return notes;
    const isFirst = this.data.inquiries.filter((o) => o.userId === userId).length === 1;
    if (isFirst && user.referredBy && !user.referralUsed && this.canInvite(user.referredBy)) {
      const referrer = this.data.users[String(user.referredBy)];
      user.referralUsed = true;
      order.referral = { by: user.referredBy, percent: ref.percent };
      notes.friend = this.t(userId).referralFriendNote(ref.percent);
      if (referrer && !referrer.blocked) {
        referrer.bonuses = (referrer.bonuses || 0) + 1;
        referrer.invited = (referrer.invited || 0) + 1;
        notes.referrerId = referrer.id;
      }
    }
    if (user.bonuses > 0) order.bonusAvailable = { percent: ref.percent, count: user.bonuses };
    return notes;
  }

  /** Пост у каналі, з якого людина прийшла за останні 14 днів (для статистики постів). */
  viaPost(userId) {
    const last = this.data.users[String(userId)]?.lastPost;
    if (!last || Date.now() - Date.parse(last.at) > POST_ORDER_WINDOW) return null;
    const post = (this.data.channelPosts || []).find((p) => p.id === last.id);
    return { id: last.id, chatTitle: post?.chatTitle || null, text: post?.text ? post.text.slice(0, 60) : null };
  }

  // --- Скасування заявки клієнтом ---

  async onCancelButton(cb, data) {
    const L = this.t(cb.from.id);
    const msg = cb.message;
    if (data === 'cxn') {
      await this.answer(cb);
      await this.removeButtons(msg);
      return this.send(msg.chat.id, L.CANCEL_KEPT);
    }
    const [kind, epoch, id, reasonIdx] = data.split(':');
    const order = (epoch || undefined) === (this.data.orderEpoch || undefined)
      && this.data.inquiries.find((o) => o.id === Number(id) && o.userId === cb.from.id);
    if (!order) return this.answer(cb, L.MSG.orderGone, true);
    if (order.status !== 'new') {
      await this.answer(cb);
      await this.removeButtons(msg);
      return this.send(msg.chat.id, order.status === 'cancelled' ? L.cancelDone(order) : L.CANCEL_TOO_LATE);
    }
    await this.answer(cb);
    if (kind === 'cx') {
      const rows = L.CANCEL_REASONS.map((r, i) => [{ text: r, callback_data: `cxr:${epoch || ''}:${order.id}:${i}` }]);
      rows.push([{ text: L.CANCEL_KEEP, callback_data: 'cxn' }]);
      return this.send(msg.chat.id, L.cancelAsk(order), { inline_keyboard: rows });
    }
    await this.removeButtons(msg);
    // Причину для студії пишемо українською — незалежно від мови клієнта
    const reason = T.CANCEL_REASONS[Number(reasonIdx)] || T.CANCEL_REASONS.at(-1);
    order.cancel = { reason, at: new Date().toISOString() };
    if (this.payments.hasActive(order)) await this.payments.cancelInvoice(order).catch(() => {});
    await this.setOrderStatus(order, 'cancelled', { who: 'клієнт', notifyClient: false });
    (order.messages ||= []).push({ at: order.cancel.at, from: 'client', text: `[отменил заявку: ${reason}]` });
    order.unread = (order.unread || 0) + 1;
    await this.notifyTeam(order, T.cancelStudio(order, reason));
    store.saveNow();
    return this.send(msg.chat.id, L.cancelDone(order), L.mainMenu());
  }

  // --- Вітрина: згода клієнта показати роботу ---

  async askShowcase(order) {
    const L = this.t(order.userId);
    await this.send(order.userId, L.showcaseAsk(order), L.showcaseKeyboard(this.data.orderEpoch, order.id));
    order.showcase = { ...(order.showcase || {}), consent: 'asked', askedAt: new Date().toISOString() };
    store.saveNow();
  }

  async onShowcaseAnswer(cb, data) {
    const L = this.t(cb.from.id);
    const [, epoch, id, ans] = data.split(':');
    const order = (epoch || undefined) === (this.data.orderEpoch || undefined)
      && this.data.inquiries.find((o) => o.id === Number(id) && o.userId === cb.from.id);
    if (!order) return this.answer(cb, L.MSG.orderGone, true);
    await this.answer(cb);
    await this.removeButtons(cb.message);
    const yes = ans === 'y';
    order.showcase = { ...(order.showcase || {}), consent: yes ? 'yes' : 'no', answeredAt: new Date().toISOString() };
    store.saveNow();
    await this.send(cb.message.chat.id, yes ? L.SHOWCASE_YES : L.SHOWCASE_NO);
    await this.notifyTeam(order, T.showcaseStudio(order, yes));
    return undefined;
  }

  // --- Призначення дизайнера ---

  /** Автоматичний розподіл нової заявки (якщо ввімкнено й є відповідний дизайнер). */
  async autoAssign(order) {
    const m = pickDesigner(order);
    if (!m || order.assignee) return null;
    assignSettings().last = m.id;
    await this.assign(order, m.id, 'автораспределение');
    log.info(`Заявка #${orderNo(order.id)} автоматически назначена: ${m.name}`);
    return m;
  }

  /** Призначити (або зняти) дизайнера заявки. Дизайнер отримує картку, PDF і файли в Telegram. */
  async assign(order, memberId, who = 'страница бота') {
    const prev = assigneeOf(order);
    const member = memberId ? memberById(memberId) : null;
    if (memberId && (!member || !member.active)) throw new Error('Дизайнер не найден или отключён.');
    if ((prev?.id || null) === (member?.id || null)) return;
    // Стара картка в попереднього дизайнера: прибираємо кнопки
    if (order.designerMessage) {
      await this.tg.call('editMessageText', {
        chat_id: order.designerMessage.chatId, message_id: order.designerMessage.messageId, parse_mode: 'HTML',
        text: `${T.adminOrderText(order, '', { designer: true })}\n<i>Заявка передана другому дизайнеру.</i>`, reply_markup: { inline_keyboard: [] },
      }).catch(() => {});
      order.designerMessage = null;
    }
    order.assignee = member?.id || null;
    order.assigneeName = member?.name || null;
    (order.history ||= []).push({ at: new Date().toISOString(), status: order.status, by: who, note: member ? `назначена: ${member.name}` : 'дизайнер снят' });
    store.saveNow();
    if (member?.telegramId && !this.isOwnerChat(member.telegramId)) {
      try {
        const card = await this.send(member.telegramId, `👤 <b>Вам назначена заявка</b>\n\n${T.adminOrderText(order, '', { designer: true })}`,
          this.withApp(T.adminOrderKeyboard(order.id, order.status, this.data.orderEpoch, false, true), member.telegramId, order.id));
        order.designerMessage = { chatId: member.telegramId, messageId: card.message_id };
        store.save();
        await this.sendOrderFiles(member.telegramId, order, card.message_id);
      } catch (err) {
        log.warn(`Дизайнеру ${member.name} не удалось отправить заявку #${orderNo(order.id)}: ${err.message}`);
        store.addError('team', err);
      }
    }
    await this.updateCard(order);
    log.info(`Заявка #${orderNo(order.id)}: ${member ? `назначена дизайнеру ${member.name}` : 'дизайнер снят'} (${who})`);
  }

  // --- Студія ---

  /**
   * Файли альбомами по 10. Telegram приймає в альбомі 2–10 файлів, тож одиночний
   * файл надсилаємо окремим повідомленням. items = [{ type: photo|video|document, fileId }].
   */
  async sendAlbum(chatId, items, extra = {}) {
    for (let i = 0; i < items.length; i += 10) {
      const chunk = items.slice(i, i + 10);
      if (chunk.length === 1) {
        const [it] = chunk;
        const method = { photo: 'sendPhoto', video: 'sendVideo' }[it.type] || 'sendDocument';
        await this.tg.call(method, { chat_id: chatId, [method === 'sendDocument' ? 'document' : it.type]: it.fileId, ...extra });
      } else {
        await this.tg.call('sendMediaGroup', { chat_id: chatId, ...extra, media: chunk.map((it) => ({ type: it.type, media: it.fileId })) });
      }
    }
  }

  async notifyStudio(order) {
    const adminChatId = this.data.config.adminChatId;
    if (!adminChatId) {
      log.error(`Заявка #${orderNo(order.id)}: не задано отримувача заявок (вкажіть ID у налаштуваннях бота)`);
      store.addError('notify', new Error('Не задано отримувача заявок'));
      return;
    }
    const card = await this.send(adminChatId, T.adminOrderText(order), this.withApp(T.adminOrderKeyboard(order.id, order.status, this.data.orderEpoch, this.payments.canRequest), adminChatId, order.id));
    order.adminMessage = { chatId: adminChatId, messageId: card.message_id };
    store.save();
    await this.sendOrderFiles(adminChatId, order, card.message_id);
  }

  /** PDF-бланк і файли клієнта — відповіддю на картку заявки. */
  async sendOrderFiles(chatId, order, cardId) {
    const adminChatId = chatId;
    const reply = { reply_parameters: { message_id: cardId, allow_sending_without_reply: true } };

    try {
      const pdf = await this.buildPdf(order);
      await this.tg.sendFile('sendDocument', 'document', adminChatId, pdf, `YABOT_brief_${orderNo(order.id)}.pdf`, 'application/pdf', {
        caption: `📄 Бриф #${orderNo(order.id)} у PDF`, ...reply,
      });
      this.data.stats.messagesSent++;
    } catch (err) {
      // Без PDF заявка все одно дійшла — картка вже надіслана
      log.error(`Не вдалося зібрати PDF для заявки #${orderNo(order.id)}: ${err.message}`);
      store.addError('pdf', err);
    }

    const refs = order.refs || [];
    const visual = refs.filter((r) => r.type === 'photo' || r.type === 'video');
    const docs = refs.filter((r) => r.type === 'document');
    const steps = [];
    if (visual.length) steps.push(() => this.sendAlbum(adminChatId, visual, reply));
    if (docs.length) steps.push(() => this.sendAlbum(adminChatId, docs, reply));
    // «Хочу так само»: картинка з прикладів послуги
    if (order.likeExample?.image) {
      const ex = readUpload(order.likeExample.image);
      if (ex?.buffer) {
        steps.push(() => this.tg.sendFile('sendPhoto', 'photo', adminChatId, ex.buffer, ex.name || 'example.jpg', ex.mime || 'image/jpeg', {
          caption: `✨ #${orderNo(order.id)} — клієнт хоче так само${order.likeExample.caption ? `: «${order.likeExample.caption}»` : ''}`, ...reply,
        }));
      }
    }
    // Голосові відповіді клієнта (герой / емоції)
    for (const v of order.voices || []) {
      const caption = `🎤 #${orderNo(order.id)} — ${v.step === 'hero' ? 'головний герой' : 'емоції та фрази'}`;
      if (v.type === 'video_note') steps.push(() => this.tg.call('sendVideoNote', { chat_id: adminChatId, video_note: v.fileId, ...reply }));
      else if (v.type === 'audio') steps.push(() => this.tg.call('sendAudio', { chat_id: adminChatId, audio: v.fileId, caption, ...reply }));
      else steps.push(() => this.tg.call('sendVoice', { chat_id: adminChatId, voice: v.fileId, caption, ...reply }));
    }
    for (const r of refs) {
      if (r.type === 'sticker') steps.push(() => this.tg.call('sendSticker', { chat_id: adminChatId, sticker: r.fileId, ...reply }));
      if (r.type === 'animation') steps.push(() => this.tg.call('sendAnimation', { chat_id: adminChatId, animation: r.fileId, ...reply }));
    }
    for (const step of steps) {
      try { await step(); this.data.stats.messagesSent++; } catch (err) {
        log.warn(`Заявка #${orderNo(order.id)}: не вдалося переслати файл (${err.message})`);
      }
    }
    store.save();
  }

  async buildPdf(order) {
    const images = [];
    for (const ref of order.refs || []) {
      const isImage = ref.type === 'photo' || (ref.type === 'document' && /^image\/(jpeg|png)$/.test(ref.mime || ''));
      if (!isImage || (ref.size && ref.size > MAX_PREVIEW_BYTES)) continue;
      try {
        const img = loadImage(await this.tg.download(ref.fileId));
        if (img) images.push(img);
      } catch (err) {
        log.warn(`Превʼю референсу не завантажено: ${err.message}`);
      }
    }
    return renderBriefPdf(order, images);
  }

  async onStatusButton(cb) {
    const msg = cb.message;
    const member = this.memberOfChat(msg.chat.id);
    if (!this.isOwnerChat(msg.chat.id) && !member) return this.answer(cb, 'Недостатньо прав', true);

    // oa:<мітка історії>:<id>:<дія>; стара форма oa:<id>:<дія> — лише якщо історію ще не очищали
    const parts = cb.data.split(':');
    const [epoch, idText, action] = parts.length === 4 ? parts.slice(1) : [undefined, parts[1], parts[2]];
    if ((epoch || undefined) !== (this.data.orderEpoch || undefined)) {
      return this.answer(cb, 'Це картка з очищеної історії — заявки вже немає.', true);
    }
    const order = this.data.inquiries.find((o) => o.id === Number(idText));
    if (!order) return this.answer(cb, 'Замовлення не знайдено', true);
    if (!this.canWork(msg.chat.id, order)) return this.answer(cb, 'Заявка назначена другому дизайнеру.', true);
    if (!TRANSITIONS[order.status]?.includes(action)) {
      return this.answer(cb, `Замовлення вже має статус «${T.STATUS_LABELS[order.status]}»`, true);
    }
    if (!order.adminMessage && !member) order.adminMessage = { chatId: msg.chat.id, messageId: msg.message_id };
    const who = member ? member.name : cb.from.username ? `@${cb.from.username}` : cb.from.first_name || 'Telegram';
    await this.setOrderStatus(order, action, { who, notifyClient: true });
    await this.answer(cb, 'Статус оновлено');
    return undefined;
  }

  /**
   * Зміна статусу — і з кнопок у Telegram, і зі сторінки бота.
   * Оновлює картку в чаті студії, пише історію і (за бажанням) повідомляє клієнта.
   */
  async setOrderStatus(order, status, { who = 'сторінка бота', notifyClient = true } = {}) {
    if (!T.STATUS_LABELS[status]) throw new Error('Невідомий статус');
    const now = new Date().toISOString();
    const prev = order.status;
    order.status = status;
    order.pipelineStage = status;
    delete order.stageManual;
    if (status === 'in_progress' && !order.takenAt) order.takenAt = now;
    if (status === 'done' || status === 'rejected' || status === 'cancelled') order.doneAt = now;
    else order.doneAt = null;
    if (status === 'done') this.bump('done');
    // Закрили без виконання — сертифікат, промокод і бонус повертаються клієнту; відкрили знову — застосовуються ще раз
    let released = null;
    let lost = [];
    if (CLOSED.has(status) && !CLOSED.has(prev)) released = releaseBenefits(order);
    else if (CLOSED.has(prev) && !CLOSED.has(status)) lost = reclaimBenefits(order);
    const note = [released ? `клиенту возвращено: ${describeReleased(released)}` : '', lost.length ? `не удалось применить снова: ${lost.join('; ')}` : '']
      .filter(Boolean).join('. ');
    (order.history ||= []).push({ at: now, status, by: who, ...(note ? { note } : {}) });
    store.saveNow();

    // Неоплачений рахунок закритої заявки скасовуємо — інакше клієнт може оплатити відхилену заявку
    if (CLOSED.has(status) && this.payments.hasActive(order)) {
      await this.payments.cancelInvoice(order).catch((err) => log.warn(`Счёт по #${orderNo(order.id)} не отменён: ${err.message}`));
    }

    order.cardNote = `${T.STATUS_LABELS[status]} — ${escapeHtml(who)}`;
    await this.updateCard(order);

    let clientNotified = false;
    const clientText = this.t(order.userId).CLIENT_STATUS_MESSAGES[status];
    if (notifyClient && clientText) {
      try {
        await this.send(order.userId, clientText(order.id), this.withClientApp(null, order.id, order.userId));
        clientNotified = true;
      } catch (err) {
        log.warn(`Не вдалося повідомити клієнта ${order.userId} про заявку #${orderNo(order.id)}: ${err.message}`);
      }
    }
    // Сертифікат знову діє — кажемо клієнту (скасування — завжди, відхилення — якщо студія повідомляє клієнта)
    if (released?.gift && (notifyClient || status === 'cancelled')) {
      await this.send(order.userId, this.t(order.userId).giftReturned(released.gift)).catch(() => {});
    }
    // Замовлення готове — просимо оцінку (лише якщо клієнту повідомили)
    if (status === 'done' && clientNotified) await this.reviews.ask(order);
    log.info(`Заявка #${orderNo(order.id)}: статус «${T.STATUS_LABELS[status]}» (${who})`);
    return { clientNotified, released, lost };
  }

  /** Перемальовує картки заявки в Telegram (власника й дизайнера): статус, ескізи, кнопки. */
  // --- Готові файли для клієнта ---

  /** Надіслати клієнту готовий файл (документом) і записати в замовлення. */
  async deliverFinalFile(order, buf, name, mime, who) {
    const L = this.t(order.userId);
    const safe = String(name || 'file').replace(/[\\/:*?"<>|\r\n]+/g, '_').slice(0, 120) || 'file';
    const msg = await this.tg.sendFile('sendDocument', 'document', order.userId, buf, safe, mime || 'application/octet-stream',
      { caption: L.finalFileCaption(order), reply_markup: this.withClientApp(null, order.id, order.userId) || { inline_keyboard: [] } });
    this.data.stats.messagesSent++;
    const doc = msg.document || {};
    const item = { id: crypto.randomBytes(3).toString('hex'), kind: 'file', name: doc.file_name || safe, size: doc.file_size || buf.length, mime: doc.mime_type || mime || '', fileId: doc.file_id || null, at: new Date().toISOString(), by: who };
    (order.finals ||= []).push(item);
    (order.messages ||= []).push({ at: item.at, from: 'studio', via: 'page', by: who, text: `[готовый файл: ${item.name}]`, ...(item.fileId ? { media: [{ type: 'document', fileId: item.fileId, name: item.name, size: item.size }] } : {}) });
    store.saveNow();
    log.info(`Заявка #${orderNo(order.id)}: клиенту отправлен готовый файл ${item.name}`);
    return item;
  }

  /** Посилання на готові файли (Google Drive, Figma тощо). */
  async deliverFinalLink(order, url, title, who) {
    const L = this.t(order.userId);
    await this.send(order.userId, L.finalLinkMessage(order, title),
      this.withClientApp({ inline_keyboard: [[{ text: L.FINAL_LINK_BUTTON, url }]] }, order.id, order.userId));
    const item = { id: crypto.randomBytes(3).toString('hex'), kind: 'link', name: title || url, url, at: new Date().toISOString(), by: who };
    (order.finals ||= []).push(item);
    (order.messages ||= []).push({ at: item.at, from: 'studio', via: 'page', by: who, text: `[ссылка на готовые файлы: ${url}]` });
    store.saveNow();
    log.info(`Заявка #${orderNo(order.id)}: клиенту отправлена ссылка на готовые файлы`);
    return item;
  }

  /**
   * Етап проєкту (боти, персонажі): запамʼятати й за бажанням повідомити клієнта.
   * link / note — демо до етапу (тестовий бот, Figma, превʼю); ask — попросити клієнта прийняти етап.
   */
  async setProjectStage(order, idx, { who = '', notifyClient = false, link, note, ask = false } = {}) {
    const ps = projectStage(order);
    if (!ps || idx < 0 || idx >= ps.steps.length) throw new Error('Невідомий етап');
    const now = new Date().toISOString();
    if (order.projectStage !== idx || !order.projectStageAt?.[idx]) {
      order.projectStageAt = { ...(order.projectStageAt || {}), [idx]: now };
      (order.history ||= []).push({ at: now, status: order.status, by: who, note: `этап: ${ps.steps[idx]}` });
    }
    order.projectStage = idx;
    const info = { ...(order.stageInfo?.[idx] || {}) };
    if (link !== undefined) info.link = link;
    if (note !== undefined) info.note = note;
    if (ask) Object.assign(info, { ask: true, answer: null, askedAt: now });
    if (info.link || info.note || info.ask) order.stageInfo = { ...(order.stageInfo || {}), [idx]: info };
    store.saveNow();
    if (!notifyClient && !ask) {
      await this.payments.stagePlanCheck(order).catch((err) => log.warn(`План оплаты: ${err.message}`));
      return { clientNotified: false };
    }
    const L = this.t(order.userId);
    const names = langOf(order.userId) === 'en' ? ps.stepsEn : ps.steps;
    const text = L.projectStageMessage(order, idx + 1, ps.steps.length, names[idx]) +
      (info.note ? `\n\n${escapeHtml(info.note)}` : '') + (ask ? `\n\n${L.STAGE_ASK}` : '');
    const rows = [
      ...(info.link ? [[{ text: L.STAGE_OPEN_LINK, url: info.link }]] : []),
      ...(ask ? [[
        { text: L.STAGE_OK_BUTTON, callback_data: `pv:${this.data.orderEpoch || ''}:${order.id}:${idx}:1` },
        { text: L.STAGE_CHANGES_BUTTON, callback_data: `pv:${this.data.orderEpoch || ''}:${order.id}:${idx}:0` },
      ]] : []),
    ];
    await this.send(order.userId, text, this.withClientApp(rows.length ? { inline_keyboard: rows } : null, order.id, order.userId));
    // Запис у переписці — мовою клієнта, бо він бачить її в Mini App
    (order.messages ||= []).push({ at: now, from: 'studio', via: 'page', by: who,
      text: `🚀 ${L.stageOf(idx + 1, ps.steps.length)}: ${names[idx]}${info.note ? `\n${info.note}` : ''}${info.link ? `\n${info.link}` : ''}` });
    store.saveNow();
    await this.payments.stagePlanCheck(order).catch((err) => log.warn(`План оплаты: ${err.message}`));
    return { clientNotified: true };
  }

  /** Відповідь клієнта на «перевірте етап»: прийняв чи має зауваження. Повертає false, якщо питати вже нема про що. */
  async answerStage(order, idx, ok, { text = '', via = 'telegram' } = {}) {
    const ps = projectStage(order);
    const info = order.stageInfo?.[idx];
    if (!ps || !isOpen(order) || !info?.ask || info.answer) return false;
    const now = new Date().toISOString();
    const name = ps.steps[idx] || '';
    const comment = String(text || '').trim().slice(0, 2000);
    info.answer = { ok: Boolean(ok), at: now, via, ...(comment ? { text: comment } : {}) };
    const L = this.t(order.userId);
    const shown = (langOf(order.userId) === 'en' ? ps.stepsEn : ps.steps)[idx] || name;
    (order.messages ||= []).push({ at: now, from: 'client', via, text: ok ? `✅ ${L.stageAnswerOk(shown)}` : `✏️ ${L.stageAnswerChanges(shown)}${comment ? `: ${comment}` : ''}` });
    store.saveNow();
    await this.notifyTeam(order, T.stageAnswerStudio(order, name, ok, comment));
    log.info(`Заявка #${orderNo(order.id)}: клиент ${ok ? 'принял' : 'оставил замечания к'} этап «${name}»`);
    return true;
  }

  /**
   * Клієнт чекає відповіді: через hours — нагадування дизайнеру (або власнику, якщо дизайнера нема),
   * через escalateHours — власнику. Лише в робочий час (або вдень, якщо робочі години не задано).
   */
  async replyAlerts(now) {
    const s = slaSettings();
    if (!s.enabled) return 0;
    const wh = this.data.config.workHours;
    const hour = kyivHour();
    if (wh?.enabled ? !isWorkingTime(wh) : hour < 9 || hour >= 21) return 0;
    const owner = this.data.config.adminChatId;
    let sent = 0;
    for (const o of this.data.inquiries) {
      const since = waitingSince(o);
      if (!since) continue;
      const waited = now - Date.parse(since);
      const a = o.replyAlert?.for === since ? o.replyAlert : { for: since, level: 0 };
      const m = assigneeOf(o);
      const designer = m?.telegramId && String(m.telegramId) !== String(owner) ? m : null;
      const last = (o.messages || []).filter((x) => x.from === 'client').at(-1)?.text || '';
      let target = null, text = '';
      if (a.level === 0 && waited >= s.hours * 3600000) {
        target = designer ? designer.telegramId : owner;
        text = T.replyAlertText(o, waited, last);
        a.level = 1;
      } else if (a.level === 1 && designer && waited >= s.escalateHours * 3600000) {
        target = owner;
        text = T.replyEscalateText(o, waited, last, designer.name);
        a.level = 2;
      }
      if (!target) continue;
      o.replyAlert = a;
      const msg = await this.send(target, text, null, { disable_notification: false }).catch((err) => { log.warn(`replyAlert #${orderNo(o.id)}: ${err.message}`); return null; });
      if (msg) { this.mapRelay(msg.message_id, o, target); sent++; }
    }
    if (sent) store.save();
    return sent;
  }

  /** Пропозиція супроводу: бот готовий N днів — питаємо, як працює, і пропонуємо доробки (до 20 за раз, лише вдень). */
  async supportOffers(now, daytime) {
    const s = supportSettings();
    if (!s.enabled || !daytime) return 0;
    const gap = Math.max(7, Number(s.days) || 30) * 24 * 3600 * 1000;
    const st = (this.data.stats.supportOffer ||= {});
    let sent = 0;
    for (const o of this.data.inquiries) {
      if (sent >= 20) break;
      if (o.service !== 'bots' || o.status !== 'done' || o.archived || o.supportOffer) continue;
      if (now - (Date.parse(o.doneAt) || now) < gap) continue;
      const u = this.data.users[String(o.userId)];
      // Заблокував бота, заблокований студією або вже замовив новий бот — не пишемо
      if (u?.blocked || u?.studioBlocked || this.data.inquiries.some((x) => x.userId === o.userId && x.id > o.id && x.service === 'bots')) {
        o.supportOffer = { skipped: true };
        continue;
      }
      o.supportOffer = { at: new Date(now).toISOString() };
      const L = this.t(o.userId);
      const custom = langOf(o.userId) === 'en' ? s.messageEn : s.message;
      const text = custom ? escapeHtml(custom).replace(/\{(проєкт|проект|project)\}/g, escapeHtml(o.hero || '')) : L.supportOfferText(o);
      const epoch = this.data.orderEpoch || '';
      try {
        await this.send(o.userId, text, { inline_keyboard: [[
          { text: L.SUPPORT_YES, callback_data: `so:${epoch}:${o.id}:1` },
          { text: L.SUPPORT_NO, callback_data: `so:${epoch}:${o.id}:0` },
        ]] });
        st.sent = (st.sent || 0) + 1;
        sent++;
        log.info(`Предложение поддержки по боту #${orderNo(o.id)} отправлено`);
      } catch (err) {
        o.supportOffer.error = err.description || err.message;
      }
    }
    if (sent) store.saveNow();
    return sent;
  }

  /** Відповідь на пропозицію супроводу: «Хочу обговорити» — нова заявка-консультація на бота. */
  async onSupportAnswer(cb, data) {
    const [, epoch, id, yes] = data.split(':');
    const L = this.t(cb.from.id);
    const o = (epoch || undefined) === (this.data.orderEpoch || undefined)
      && this.data.inquiries.find((x) => x.id === Number(id) && x.userId === cb.from.id);
    if (!o || !o.supportOffer?.at || o.supportOffer.answer) return this.answer(cb, L.MSG.buttonGone, true);
    o.supportOffer.answer = yes === '1' ? 'yes' : 'no';
    o.supportOffer.answeredAt = new Date().toISOString();
    const st = (this.data.stats.supportOffer ||= {});
    await this.answer(cb);
    await this.removeButtons(cb.message);
    if (yes !== '1') {
      st.no = (st.no || 0) + 1;
      store.saveNow();
      return this.send(cb.message.chat.id, L.SUPPORT_NO_REPLY);
    }
    st.yes = (st.yes || 0) + 1;
    const svc = findService('bots');
    const order = await this.submitOrder(cb.from, cb.message.chat.id, {
      service: 'bots', project: { need: 'consult', deadline: '', budget: '' },
      stickerType: svc?.one || 'Телеграм-бот з miniApp', typeKey: null, quantity: NEEDS.consult,
      hero: `Супровід: ${o.hero || ''}`.slice(0, 120),
      emotions: `Клієнт відгукнувся на пропозицію супроводу після запуску бота (замовлення #${orderNo(o.id)}).`,
      refs: [], contact: o.contact || '', repeatOf: { id: o.id },
    });
    if (order) { order.supportOf = o.id; o.supportOffer.orderId = order.id; }
    store.saveNow();
    return undefined;
  }

  /** Клієнт просить правку після здачі (з Mini App): текст і до 10 фото. */
  async requestFix(order, text, refs = []) {
    if (!fixAllowed(order)) return false;
    const now = new Date().toISOString();
    const fix = { at: now, text: String(text).slice(0, 2000), refs, status: 'open' };
    (order.fixes ||= []).push(fix);
    (order.messages ||= []).push({ at: now, from: 'client', via: 'app', text: `✏️ ${text}`, ...(refs.length ? { media: refs.map((r) => ({ type: 'photo', fileId: r.fileId })) } : {}) });
    order.unread = (order.unread || 0) + 1;
    (order.history ||= []).push({ at: now, status: order.status, by: 'клієнт', note: 'запрошена правка после сдачи' });
    store.saveNow();
    for (const t of this.teamTargets(order)) {
      const extra = t.replyTo ? { reply_parameters: { message_id: t.replyTo, allow_sending_without_reply: true } } : {};
      const msg = await this.send(t.chatId, T.fixStudioText(order, text), null, extra).catch(() => null);
      if (msg) this.mapRelay(msg.message_id, order, t.chatId);
      if (refs.length) await this.sendAlbum(t.chatId, refs.map((r) => ({ type: 'photo', fileId: r.fileId }))).catch(() => {});
    }
    await this.send(order.userId, this.t(order.userId).fixAcceptedClient(order)).catch(() => {});
    log.info(`Правка после сдачи по #${orderNo(order.id)}`);
    return true;
  }

  /** Студія внесла правку. */
  async finishFix(order, { who = '', notifyClient = true } = {}) {
    const fix = openFix(order);
    if (!fix) return false;
    const now = new Date().toISOString();
    Object.assign(fix, { status: 'done', doneAt: now, by: who });
    (order.history ||= []).push({ at: now, status: order.status, by: who, note: 'правка после сдачи готова' });
    store.saveNow();
    if (notifyClient) {
      await this.send(order.userId, this.t(order.userId).fixDoneClient(order), this.withClientApp(null, order.id, order.userId)).catch(() => {});
      (order.messages ||= []).push({ at: now, from: 'studio', via: 'page', by: who, text: `✅ ${this.t(order.userId).fixDoneClient(order)}` });
      store.saveNow();
    }
    return true;
  }

  /** Кнопки «Все добре / Є зауваження» під повідомленням про етап. */
  async onStageAnswer(cb, data) {
    const [, epoch, id, idxText, okText] = data.split(':');
    const L = this.t(cb.from.id);
    const order = (epoch || undefined) === (this.data.orderEpoch || undefined)
      && this.data.inquiries.find((o) => o.id === Number(id) && o.userId === cb.from.id);
    const idx = Number(idxText);
    if (!order || !(await this.answerStage(order, idx, okText === '1'))) return this.answer(cb, L.MSG.buttonGone, true);
    await this.answer(cb, okText === '1' ? '✅' : '✏️');
    // Посилання на демо лишаємо, кнопки відповіді прибираємо
    const link = order.stageInfo?.[idx]?.link;
    await this.tg.call('editMessageReplyMarkup', {
      chat_id: cb.message.chat.id, message_id: cb.message.message_id,
      reply_markup: { inline_keyboard: link ? [[{ text: L.STAGE_OPEN_LINK, url: link }]] : [] },
    }).catch(() => {});
    return this.send(cb.message.chat.id, okText === '1' ? L.STAGE_OK_CLIENT : L.STAGE_CHANGES_CLIENT);
  }

  /** Кнопка «📱 Відкрити в miniApp» під повідомленням клієнту — відкриває саме це замовлення в застосунку. */
  withClientApp(markup, orderId, userId) {
    const app = this.data.config.miniapp;
    if (!app?.enabled || !/^https:\/\//.test(app.url || '')) return markup;
    const url = `${app.url.replace(/\/+$/, '')}/?o=${orderId}`;
    return { inline_keyboard: [...(markup?.inline_keyboard || []), [{ text: this.t(userId).OPEN_IN_APP, web_app: { url } }]] };
  }

  /** Ряд «📱 Відкрити в Mini App» під карткою заявки — лише в особистому чаті (у групах Telegram не дозволяє). */
  withApp(markup, chatId, orderId) {
    const app = this.data.config.miniapp;
    if (!app?.enabled || !/^https:\/\//.test(app.url || '') || !(Number(chatId) > 0)) return markup;
    const url = `${app.url.replace(/\/+$/, '')}/?o=${orderId}`;
    return { inline_keyboard: [...(markup?.inline_keyboard || []), [{ text: '📱 Открыть в Mini App', web_app: { url } }]] };
  }

  async updateCard(order) {
    // Кнопка «Рахунок»: для відкритих заявок, а для готових — якщо лишився залишок
    const pay = this.payments.canRequest && (isOpen(order) || (order.status === 'done' && remaining(order) > 0));
    const cards = [
      order.adminMessage && { ...order.adminMessage, markup: this.withApp(T.adminOrderKeyboard(order.id, order.status, this.data.orderEpoch, pay), order.adminMessage.chatId, order.id), prefix: '' },
      order.designerMessage && { ...order.designerMessage, markup: this.withApp(T.adminOrderKeyboard(order.id, order.status, this.data.orderEpoch, false, true), order.designerMessage.chatId, order.id), prefix: '👤 <b>Ваша заявка</b>\n\n' },
    ].filter(Boolean);
    for (const c of cards) {
      await this.tg.call('editMessageText', {
        chat_id: c.chatId, message_id: c.messageId, parse_mode: 'HTML',
        text: c.prefix + T.adminOrderText(order, order.cardNote || '', { designer: Boolean(c.prefix) }),
        reply_markup: c.markup,
      }).catch((err) => {
        if (!/not modified/i.test(err.description || '')) log.warn(`Не вдалося оновити картку #${orderNo(order.id)}: ${err.message}`);
      });
    }
  }

  /** Відкладені повідомлення клієнтам (раз на 30 с разом із перевіркою оплат). */
  async processScheduled() {
    const list = (this.data.scheduledMessages ||= []);
    const now = Date.now();
    const due = list.filter((x) => Date.parse(x.at) <= now);
    if (!due.length) return;
    this.data.scheduledMessages = list.filter((x) => Date.parse(x.at) > now);
    store.saveNow();
    for (const x of due) {
      const order = this.data.inquiries.find((o) => o.id === x.orderId);
      if (!order || x.epoch !== (this.data.orderEpoch || null)) continue;
      try {
        await this.messageClient(order, x.text, 'scheduled', x.by || null);
        log.info(`Отложенное сообщение по #${orderNo(order.id)} отправлено`);
      } catch (err) {
        log.warn(`Отложенное сообщение по #${orderNo(order.id)} не отправлено: ${err.message}`);
        await this.notifyTeam(order, `⚠️ Отложенное сообщение клиенту #${orderNo(order.id)} не доставлено: ${escapeHtml(err.description || err.message)}`).catch(() => {});
      }
    }
  }

  /** Повідомлення клієнту від студії (зі сторінки бота або швидкою відповіддю в Telegram). by — ім'я дизайнера. */
  async messageClient(order, text, via = 'page', by = null) {
    await this.send(order.userId, `${this.t(order.userId).designerHeader(order)}\n\n${escapeHtml(text)}`);
    (order.messages ||= []).push({ at: new Date().toISOString(), from: 'studio', via, ...(by ? { by } : {}), text });
    order.unread = 0;
    store.saveNow();
  }
}

/** Короткий опис повідомлення для історії листування на сторінці бота. */
/** Вкладення повідомлення (для чату замовлення в Mini App): фото, відео, файл, голосове… */
export function messageMedia(m) {
  if (m.photo?.length) return [{ type: 'photo', fileId: m.photo.at(-1).file_id }];
  for (const k of ['video', 'animation', 'video_note', 'voice', 'audio', 'sticker']) {
    if (m[k]) return [{ type: k, fileId: m[k].file_id, size: m[k].file_size || 0 }];
  }
  if (m.document) return [{ type: 'document', fileId: m.document.file_id, name: m.document.file_name || 'file', mime: m.document.mime_type || '', size: m.document.file_size || 0 }];
  return [];
}

function describeMessage(m) {
  if (m.text) return m.text;
  const kinds = [
    ['photo', 'фото'], ['video', 'видео'], ['animation', 'GIF'], ['voice', 'голосовое'], ['video_note', 'видеокружок'],
    ['audio', 'аудио'], ['sticker', 'стикер'], ['contact', 'контакт'], ['location', 'геолокация'],
  ];
  let label = kinds.find(([key]) => m[key])?.[1];
  if (!label && m.document) label = `файл «${m.document.file_name || 'без имени'}»`;
  if (!label) label = 'сообщение';
  return `[${label}]${m.caption ? ` ${m.caption}` : ''}`;
}

function extractRef(m) {
  if (m.photo?.length) {
    const p = m.photo.at(-1);
    return { type: 'photo', fileId: p.file_id, size: p.file_size };
  }
  if (m.video) return { type: 'video', fileId: m.video.file_id };
  if (m.animation) return { type: 'animation', fileId: m.animation.file_id };
  if (m.sticker) return { type: 'sticker', fileId: m.sticker.file_id };
  if (m.document) {
    return {
      type: 'document', fileId: m.document.file_id, name: m.document.file_name || null,
      mime: m.document.mime_type || null, size: m.document.file_size,
    };
  }
  return null;
}
