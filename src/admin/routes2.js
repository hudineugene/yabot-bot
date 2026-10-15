// Маршрути сторінки бота (v2.13): резервні копії, зведення й сповіщення, відпустка, промокоди,
// команда дизайнерів, фінанси, картка клієнта. Лише для власника.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { store } from '../store.js';
import { log } from '../log.js';
import { hashPassword, verifyPassword, todayKey } from '../util.js';
import { Telegram } from '../telegram.js';
import { promoList, savePromo, deletePromo, PromoError } from '../promos.js';
import { team, validDate } from '../orders.js';
import { financeView, clientDetail, teamView, analyticsView, checklistSteps, DEFAULT_CHECKLIST } from './views.js';
import { packages, savePackages, styles, saveStyles, OfferError } from '../offer.js';
import { giftSettings, giftList, issueManual, certificatePdf, giftLink, GiftError } from '../gifts.js';
import { winbackSettings } from '../studio.js';
import { faqList, saveFaq } from '../faq.js';
import { miniSettings, miniPort } from '../miniapp/server.js';
import { funnelSummary, funnelBySource } from '../miniapp/api.js';
import { SERVICES, serviceSettings, saveServices } from '../services.js';
import { ChannelError } from '../channel.js';
import { normCode } from '../promos.js';
import { queueSettings, queueEstimate, saveQueue } from '../queue.js';
import { supportView, saveSupport } from '../support.js';
import { slaView, saveSla } from '../sla.js';
import { reviewPromoView, saveReviewPromo } from '../reviews.js';
import { fixSettings, saveFixSettings } from '../fixes.js';
import { assignSettings, saveAssign } from '../assign.js';
import { auditFeed } from '../audit.js';
import { tgBackupSettings, tgBackupView, sendTelegramBackup } from '../tgbackup.js';

const MAX_BACKUP = 64 * 1024 * 1024;
const TAG_RE = /^[\p{L}\p{N} _-]{1,24}$/u;

function digestView() {
  const c = store.data.config;
  return { digest: c.digest, alerts: c.alerts, lastOutage: store.data.stats.lastOutage || null, sentFor: store.data.stats.digestSentFor || null };
}

function vacationView() {
  const v = store.data.config.vacation;
  return { ...v, active: Boolean(v.enabled) && (!v.until || v.until >= todayKey()) };
}

/** Повертає true, якщо маршрут оброблено. */
export async function handleMore(req, res, url, route, runtime, ctx) {
  const { send, readJson, readRaw, HttpError, clean } = ctx;

  // --- Резервні копії ---
  if (route === 'GET /api/backups') return send(res, 200, { files: store.backups() }), true;
  // Копія в Telegram
  if (route === 'GET /api/tg-backup') return send(res, 200, tgBackupView()), true;
  if (route === 'POST /api/tg-backup') {
    const body = await readJson(req);
    const s = tgBackupSettings();
    s.enabled = Boolean(body.enabled);
    s.every = body.every === 'day' ? 'day' : 'week';
    store.saveNow();
    return send(res, 200, tgBackupView()), true;
  }
  if (route === 'POST /api/tg-backup/send') {
    if (!runtime.ready || !runtime.tg) throw new HttpError(400, 'Бот не запущен — сначала укажите токен.');
    try {
      await sendTelegramBackup(runtime.tg, { force: true });
    } catch (err) {
      throw new HttpError(400, err.status === 403 ? 'Получатель заявок заблокировал бота.' : (err.description || err.message));
    }
    return send(res, 200, tgBackupView()), true;
  }
  if (route === 'GET /api/backups/download') {
    const name = url.searchParams.get('name') || 'current';
    const date = todayKey();
    if (name === 'archive') {
      return send(res, 200, JSON.stringify(store.readArchive()), 'application/json; charset=utf-8', {
        'content-disposition': `attachment; filename="YABOT_archive_${date}.json"`,
      }), true;
    }
    if (name === 'current') {
      store.data.stats.lastBackupDownload = new Date().toISOString();
      store.save();
      return send(res, 200, JSON.stringify(store.data, null, 1), 'application/json; charset=utf-8', {
        'content-disposition': `attachment; filename="YABOT_backup_${date}.json"`,
      }), true;
    }
    const file = store.backupPath(name);
    if (!file) throw new HttpError(404, 'Копия не найдена.');
    return send(res, 200, fs.readFileSync(file), 'application/json; charset=utf-8', {
      'content-disposition': `attachment; filename="YABOT_${name}"`,
    }), true;
  }
  if (route === 'POST /api/backups/restore') {
    const raw = await readRaw(req, MAX_BACKUP);
    let body;
    try { body = JSON.parse(raw.toString('utf8')); } catch { throw new HttpError(400, 'Файл не читается — нужна копия в формате .json.'); }
    const c = store.data.config;
    if (!verifyPassword(body.password, c.passwordSalt, c.passwordHash)) throw new HttpError(400, 'Неверный пароль.');
    let result;
    try { result = store.restore(body.data); } catch (err) { throw new HttpError(400, err.message); }
    ctx.dropAllSessions();
    log.warn(`Данные восстановлены из резервной копии: заявок ${result.orders}, клиентов ${result.clients}. Прежние данные: ${result.backup}`);
    return send(res, 200, result), true;
  }

  // --- Майстер запуску: що ще не налаштовано ---
  if (route === 'GET /api/setup-status') return send(res, 200, setupStatus()), true;
  if (route === 'POST /api/setup-status') {
    const body = await readJson(req);
    store.data.config.wizardHidden = Boolean(body.hidden);
    store.saveNow();
    return send(res, 200, setupStatus()), true;
  }

  // --- Архів ---
  if (route === 'GET /api/archive') return send(res, 200, { settings: store.data.config.archive, ...store.archiveInfo() }), true;
  if (route === 'POST /api/archive') {
    const body = await readJson(req);
    const days = Math.round(Number(body.days));
    if (![90, 180, 365, 730].includes(days)) throw new HttpError(400, 'Неверный срок.');
    store.data.config.archive = { enabled: Boolean(body.enabled), days };
    let moved = 0;
    if (body.now) moved = store.archiveOld(days).archived;
    store.saveNow();
    if (moved) log.info(`В архив перенесено заявок: ${moved}`);
    return send(res, 200, { settings: store.data.config.archive, moved, ...store.archiveInfo() }), true;
  }

  // --- Зведення й сповіщення ---
  if (route === 'GET /api/digest') return send(res, 200, digestView()), true;
  if (route === 'POST /api/digest') {
    const body = await readJson(req);
    const hour = Math.round(Number(body.hour));
    store.data.config.digest = { enabled: Boolean(body.enabled), hour: hour >= 5 && hour <= 23 ? hour : 9, weekly: body.weekly !== false };
    store.data.config.alerts = { enabled: Boolean(body.alerts) };
    store.saveNow();
    return send(res, 200, digestView()), true;
  }
  if (route === 'POST /api/digest/weekly') {
    const h = ctx.requireHandlers(runtime);
    if (!store.data.config.adminChatId) throw new HttpError(400, 'Не указан получатель заявок.');
    const text = h.digest.weekly();
    try { await h.send(store.data.config.adminChatId, text); } catch (err) { throw new HttpError(502, `Telegram: ${err.description || err.message}`); }
    return send(res, 200, { ok: true, preview: text }), true;
  }
  if (route === 'POST /api/digest/send') {
    const h = ctx.requireHandlers(runtime);
    if (!store.data.config.adminChatId) throw new HttpError(400, 'Не указан получатель заявок.');
    try { await h.digest.maybeSend({ force: true }); } catch (err) { throw new HttpError(502, `Telegram: ${err.description || err.message}`); }
    return send(res, 200, { ok: true, preview: h.digest.build() }), true;
  }

  // --- Відпустка ---
  if (route === 'GET /api/vacation') return send(res, 200, vacationView()), true;
  if (route === 'POST /api/vacation') {
    const body = await readJson(req);
    const until = body.until ? String(body.until) : '';
    if (until && !validDate(until)) throw new HttpError(400, 'Неверная дата.');
    if (body.enabled && until && until < todayKey()) throw new HttpError(400, 'Дата окончания отпуска уже прошла.');
    store.data.config.vacation = { enabled: Boolean(body.enabled), until, acceptOrders: body.acceptOrders !== false, message: clean(body.message, 600) };
    store.saveNow();
    log.info(`Режим отпуска ${body.enabled ? `включён${until ? ` до ${until}` : ''}` : 'выключен'}`);
    return send(res, 200, vacationView()), true;
  }

  // --- Промокоди ---
  if (route === 'GET /api/promos') return send(res, 200, { promos: promoList(), bot: store.data.bot.username || null, orders: promoOrders() }), true;
  if (route === 'POST /api/promos') {
    const body = await readJson(req);
    try {
      if (body.delete) deletePromo(body.code);
      else savePromo(body);
    } catch (err) {
      if (err instanceof PromoError) throw new HttpError(400, err.message);
      throw err;
    }
    return send(res, 200, { promos: promoList(), bot: store.data.bot.username || null, orders: promoOrders() }), true;
  }

  // --- Команда ---
  if (route === 'GET /api/team') return send(res, 200, teamView()), true;
  if (route === 'GET /api/audit') return send(res, 200, { entries: auditFeed(150) }), true;
  if (route === 'GET /api/auto-assign') return send(res, 200, { mode: assignSettings().mode }), true;
  if (route === 'POST /api/auto-assign') return send(res, 200, saveAssign(await readJson(req))), true;
  if (route === 'POST /api/team') {
    const body = await readJson(req);
    const list = team();
    const member = body.id ? list.find((m) => m.id === body.id) : null;
    if (body.id && !member) throw new HttpError(404, 'Дизайнер не найден.');
    if (body.delete) {
      if (!member) throw new HttpError(400, 'Не указан дизайнер.');
      store.data.config.team = list.filter((m) => m !== member);
      for (const o of store.data.inquiries) if (o.assignee === member.id) { o.assignee = null; o.assigneeName = null; }
      store.saveNow();
      log.info(`Дизайнер ${member.name} удалён из команды`);
      return send(res, 200, teamView()), true;
    }
    const name = clean(body.name, 40);
    const login = clean(body.login, 32).toLowerCase();
    if (!name) throw new HttpError(400, 'Укажите имя.');
    if (!/^[a-z0-9_.-]{3,32}$/.test(login)) throw new HttpError(400, 'Логин — 3–32 символа: латиница, цифры, «_», «.» или «-».');
    if (list.some((m) => m.login === login && m !== member)) throw new HttpError(400, 'Такой логин уже есть.');
    const telegramId = String(body.telegramId || '').trim();
    if (telegramId && !/^\d{5,20}$/.test(telegramId)) throw new HttpError(400, 'Telegram ID — это число.');
    if (telegramId && String(telegramId) === String(store.data.config.adminChatId)) throw new HttpError(400, 'Это ваш ID получателя заявок — у дизайнера должен быть свой.');
    const password = String(body.password || '');
    if (!member && password.length < 8) throw new HttpError(400, 'Пароль — минимум 8 символов.');
    if (password && password.length < 8) throw new HttpError(400, 'Пароль — минимум 8 символов.');
    // Перевіряємо, що бот може написати дизайнеру (він має спершу натиснути /start)
    const idChanged = telegramId && telegramId !== String(member?.telegramId || '');
    if (idChanged) {
      try {
        await new Telegram(store.data.config.botToken).call('sendMessage', {
          chat_id: telegramId,
          text: `✅ ${name}, вас додано до команди YABOT. Сюди будуть приходити призначені вам заявки, повідомлення клієнтів і ранкова зведення.`,
        });
      } catch (err) {
        const bot = store.data.bot.username ? `@${store.data.bot.username}` : 'боту';
        throw new HttpError(400, `Бот не смог написать на этот ID (${err.description || err.message}). Пусть дизайнер сначала отправит ${bot} команду /start.`);
      }
    }
    const services = Array.isArray(body.services) ? body.services.filter((x) => SERVICES.some((s) => s.id === x)) : member?.services || [];
    const data = { name, login, telegramId: telegramId || null, active: body.active !== false, services };
    if (password) Object.assign(data, (({ salt, hash }) => ({ passwordSalt: salt, passwordHash: hash }))(hashPassword(password)));
    if (member) {
      Object.assign(member, data);
      for (const o of store.data.inquiries) if (o.assignee === member.id) o.assigneeName = member.name;
    } else list.push({ id: crypto.randomBytes(4).toString('hex'), createdAt: new Date().toISOString(), ...data });
    store.saveNow();
    runtime.handlers?.syncStudioCommands().catch(() => {});
    if (password && member) ctx.dropSessions(member.id);
    if (member && !data.active) ctx.dropSessions(member.id);
    log.info(`Команда: ${member ? 'изменён' : 'добавлен'} дизайнер ${name}`);
    return send(res, 200, teamView()), true;
  }

  // --- Пакети й стилі для брифу ---
  if (route === 'GET /api/packages') return send(res, 200, { packages: packages(), styles: styles() }), true;
  if (route === 'POST /api/packages' || route === 'POST /api/styles') {
    const body = await readJson(req);
    try {
      if (route === 'POST /api/packages') savePackages(body.packages);
      else saveStyles(body.styles);
    } catch (err) {
      if (err instanceof OfferError) throw new HttpError(400, err.message);
      throw err;
    }
    return send(res, 200, { packages: packages(), styles: styles() }), true;
  }

  // --- Реквізити для рахунків і актів ---
  if (route === 'GET /api/company') return send(res, 200, store.data.config.company || {}), true;
  if (route === 'POST /api/company') {
    const body = await readJson(req);
    store.data.config.company = {
      name: clean(body.name, 150), code: clean(body.code, 20), iban: clean(body.iban, 40).replace(/\s/g, ''), bank: clean(body.bank, 100),
      address: clean(body.address, 200), phone: clean(body.phone, 40), email: clean(body.email, 80), signer: clean(body.signer, 100), vat: Boolean(body.vat),
      clientDocs: Boolean(body.clientDocs),
    };
    store.saveNow();
    return send(res, 200, store.data.config.company), true;
  }

  // --- Чек-лист етапів ---
  if (route === 'GET /api/checklist') return send(res, 200, { steps: checklistSteps(), defaults: DEFAULT_CHECKLIST }), true;
  if (route === 'POST /api/checklist') {
    const body = await readJson(req);
    const steps = [...new Set((Array.isArray(body.steps) ? body.steps : []).map((x) => clean(x, 40)).filter(Boolean))].slice(0, 12);
    store.data.config.checklist = steps;
    store.saveNow();
    return send(res, 200, { steps, defaults: DEFAULT_CHECKLIST }), true;
  }

  // --- Повернення клієнтів ---
  if (route === 'GET /api/winback') return send(res, 200, { ...winbackSettings(), stats: store.data.stats.winback || { sent: 0, returned: 0 } }), true;
  if (route === 'POST /api/winback') {
    const body = await readJson(req);
    const days = Math.round(Number(body.days));
    const percent = Math.round(Number(body.percent));
    if (!(days >= 14 && days <= 365)) throw new HttpError(400, 'Через сколько дней — от 14 до 365.');
    if (!(percent >= 0 && percent <= 50)) throw new HttpError(400, 'Скидка — от 0 до 50%.');
    store.data.config.winback = { enabled: Boolean(body.enabled), days, percent, message: clean(body.message, 800) };
    store.saveNow();
    return send(res, 200, { ...winbackSettings(), stats: store.data.stats.winback || { sent: 0, returned: 0 } }), true;
  }

  // --- Відповіді клієнтам: нагадування студії й час відповіді для клієнта ---
  if (route === 'GET /api/reply-alert') return send(res, 200, slaView()), true;
  if (route === 'POST /api/reply-alert') {
    try { return send(res, 200, saveSla(await readJson(req))), true; } catch (err) { throw new HttpError(400, err.message); }
  }

  // --- Правка після здачі ---
  if (route === 'GET /api/fixes') return send(res, 200, fixSettings()), true;
  if (route === 'POST /api/fixes') {
    try { return send(res, 200, saveFixSettings(await readJson(req))), true; } catch (err) { throw new HttpError(400, err.message); }
  }

  // --- Промокод за відгук ---
  if (route === 'GET /api/review-promo') return send(res, 200, reviewPromoView()), true;
  if (route === 'POST /api/review-promo') {
    try { return send(res, 200, saveReviewPromo(await readJson(req))), true; } catch (err) { throw new HttpError(400, err.message); }
  }

  // --- Пропозиція супроводу після запуску бота ---
  if (route === 'GET /api/support-offer') return send(res, 200, supportView()), true;
  if (route === 'POST /api/support-offer') {
    try { return send(res, 200, saveSupport(await readJson(req))), true; } catch (err) { throw new HttpError(400, err.message); }
  }

  // --- Подарункові сертифікати ---
  const giftsView = () => ({
    settings: giftSettings(), paymentsOn: Boolean(store.data.config.payments?.enabled),
    gifts: giftList().filter((g) => g.status !== 'pending' || g.source === 'mono').slice(0, 100).map((g) => ({ ...g, link: g.code ? giftLink(g.code) : null })),
  });
  if (route === 'GET /api/gifts') return send(res, 200, giftsView()), true;
  if (route === 'POST /api/gifts') {
    const body = await readJson(req);
    const amounts = [...new Set((Array.isArray(body.amounts) ? body.amounts : []).map((a) => Math.round(Number(a))).filter((a) => a >= 100 && a <= 100000))].slice(0, 4).sort((a, b) => a - b);
    if (body.enabled && !amounts.length) throw new HttpError(400, 'Укажите хотя бы одну сумму сертификата.');
    const daysValid = Math.round(Number(body.validityDays));
    store.data.config.gifts = { enabled: Boolean(body.enabled), amounts: amounts.length ? amounts : [1500, 3000, 5000], validityDays: daysValid >= 30 && daysValid <= 730 ? daysValid : 180 };
    store.saveNow();
    return send(res, 200, giftsView()), true;
  }
  if (route === 'POST /api/gifts/issue') {
    const body = await readJson(req);
    try { issueManual(body); } catch (err) {
      if (err instanceof GiftError) throw new HttpError(400, err.message);
      throw err;
    }
    return send(res, 200, giftsView()), true;
  }
  if (route === 'POST /api/gifts/cancel') {
    const body = await readJson(req);
    const g = giftList().find((x) => x.code === String(body.code || ''));
    if (!g || g.status !== 'active') throw new HttpError(400, 'Сертификат не найден или уже использован.');
    g.status = 'cancelled';
    store.saveNow();
    return send(res, 200, giftsView()), true;
  }
  if (route === 'GET /api/gifts/pdf') {
    const g = giftList().find((x) => x.code === String(url.searchParams.get('code') || ''));
    if (!g?.code) throw new HttpError(404, 'Сертификат не найден.');
    return send(res, 200, certificatePdf(g, url.searchParams.get('lang') === 'en' ? 'en' : 'uk'), 'application/pdf', {
      'content-disposition': `attachment; filename="YABOT_gift_${g.code}.pdf"`,
    }), true;
  }

  // --- Відгук у канал ---
  if (route === 'POST /api/reviews/post') {
    const body = await readJson(req);
    const order = store.data.inquiries.find((o) => o.id === Number(body.orderId));
    if (!order?.review) throw new HttpError(404, 'Отзыв не найден.');
    try { await runtime.channels.publishReview(order, body.chatId); } catch (err) {
      if (err instanceof ChannelError) throw new HttpError(400, err.message);
      throw err;
    }
    return send(res, 200, { ok: true, link: order.review.postLink || null }), true;
  }

  // --- Показники й безпека ---
  if (route === 'GET /api/analytics') return send(res, 200, analyticsView(url.searchParams.get('period') || 'month')), true;
  if (route === 'GET /api/security') return send(res, 200, { twoFactor: Boolean(store.data.config.twoFactor), recipient: Boolean(store.data.config.adminChatId) }), true;
  if (route === 'POST /api/security') {
    const body = await readJson(req);
    if (body.twoFactor && !store.data.config.adminChatId) throw new HttpError(400, 'Сначала укажите получателя заявок — на него придёт код.');
    store.data.config.twoFactor = Boolean(body.twoFactor);
    store.saveNow();
    log.info(`Вход с кодом из Telegram ${store.data.config.twoFactor ? 'включён' : 'выключен'}`);
    return send(res, 200, { twoFactor: store.data.config.twoFactor, recipient: Boolean(store.data.config.adminChatId) }), true;
  }

  // --- Привітання й опис бота (до «Старт») ---
  const WELCOME_DEFAULTS = {
    onStart: true,
    description: '👋 Привіт! Ми — YABOT & IRISKA.\n\nТут народжуються персонажі, стікери й дизайн, через які Telegram стає трохи цікавішим 😎\n\nЗамовляти просто: тисніть «Старт», а потім кнопку YABOT — у miniApp оберіть послугу, оформіть замовлення й передайте всі деталі без квесту з двадцяти повідомлень.\n\n🤖 YABOT — технології, стиль і трохи роботизованого хаосу.\n🧡 IRISKA — характер, емоції та людяність.\n\nYABOT — DESIGN FOR HUMANS.',
    descriptionEn: '👋 Hi! We are YABOT & IRISKA.\n\nThis is where characters, stickers and design are born — the things that make Telegram a little more interesting 😎\n\nOrdering is easy: tap «Start», then the YABOT button — in the miniApp pick a service, place an order and send us all the details without a twenty-message quest.\n\n🤖 YABOT — technology, style and a bit of robotic chaos.\n🧡 IRISKA — character, emotions and humanity.\n\nYABOT — DESIGN FOR HUMANS.',
    short: 'Персонажі, стікери й дизайн для Telegram. Замовлення — у miniApp за кнопкою YABOT 🧡',
    shortEn: 'Characters, stickers and design for Telegram. Order in the miniApp via the YABOT button 🧡',
  };
  const welcomeView = () => ({ ...WELCOME_DEFAULTS, ...(store.data.config.welcome || {}), applied: store.data.config.welcome?.appliedAt || null });
  if (route === 'GET /api/welcome') return send(res, 200, welcomeView()), true;
  if (route === 'POST /api/welcome') {
    const body = await readJson(req);
    const w = {
      onStart: Boolean(body.onStart),
      description: String(body.description ?? '').trim().slice(0, 512),
      descriptionEn: String(body.descriptionEn ?? '').trim().slice(0, 512),
      short: String(body.short ?? '').trim().slice(0, 120),
      shortEn: String(body.shortEn ?? '').trim().slice(0, 120),
      appliedAt: store.data.config.welcome?.appliedAt || null,
    };
    if (body.apply) {
      if (!runtime.ready || !runtime.tg) throw new HttpError(400, 'Бот ещё не подключён к Telegram — попробуйте через минуту.');
      try {
        await runtime.tg.call('setMyDescription', { description: w.description });
        await runtime.tg.call('setMyDescription', { description: w.descriptionEn, language_code: 'en' });
        await runtime.tg.call('setMyShortDescription', { short_description: w.short });
        await runtime.tg.call('setMyShortDescription', { short_description: w.shortEn, language_code: 'en' });
      } catch (err) {
        throw new HttpError(502, `Telegram: ${err.description || err.message}`);
      }
      w.appliedAt = new Date().toISOString();
      log.info('Описание бота обновлено в Telegram');
    }
    store.data.config.welcome = w;
    store.saveNow();
    return send(res, 200, welcomeView()), true;
  }

  // --- Послуги Mini App ---
  const servicesView = () => ({
    services: SERVICES.map((s) => ({
      id: s.id, name: s.name, ...serviceSettings()[s.id],
      // тексти за замовчуванням — підказками в полях
      defaults: Object.fromEntries(['tagline', 'intro', 'includes', 'steps', 'chips'].flatMap((f) => [[f, s[f]], [`${f}En`, s[`${f}En`]]])),
    })),
  });
  if (route === 'GET /api/services') return send(res, 200, servicesView()), true;
  if (route === 'POST /api/services') {
    const body = await readJson(req);
    try { saveServices(body.services); } catch (err) { throw new HttpError(400, err.message); }
    return send(res, 200, servicesView()), true;
  }

  // --- Mini App ---
  const miniView = () => {
    const s = miniSettings();
    return { enabled: s.enabled, url: s.url, menuText: s.menuText, support: s.support || '', banner: s.banner || { enabled: false }, queue: { ...queueSettings(), now: queueEstimate() }, sources: funnelBySource(30), botUsername: store.data.bot?.username || '', watch: store.data.stats.miniWatch || null, port: miniPort(), portSet: Number(s.port) || 0, funnel: funnelSummary(30), addresses: runtime.miniapp ? runtime.miniapp.addresses() : [], running: Boolean(runtime.miniapp?.servers.length) };
  };
  if (route === 'GET /api/miniapp') return send(res, 200, miniView()), true;
  // Орієнтовний старт у заявці
  if (route === 'POST /api/miniapp/queue') {
    saveQueue(await readJson(req));
    return send(res, 200, miniView()), true;
  }
  // Банер акції на головній Mini App
  if (route === 'POST /api/miniapp/banner') {
    const body = await readJson(req);
    const b = {
      enabled: Boolean(body.enabled),
      title: clean(body.title, 60), titleEn: clean(body.titleEn, 60),
      text: clean(body.text, 200), textEn: clean(body.textEn, 200),
      promo: normCode(body.promo).slice(0, 30),
      until: validDate(body.until) ? body.until : '',
    };
    if (b.enabled && !b.title) throw new HttpError(400, 'Укажите заголовок баннера.');
    store.data.config.miniapp = { ...(store.data.config.miniapp || {}), banner: { ...b, id: crypto.createHash('sha1').update(JSON.stringify(b)).digest('hex').slice(0, 8) } };
    store.saveNow();
    const promo = b.promo && promoList().find((p) => p.code === b.promo);
    const warning = b.promo && (!promo || !promo.active || (promo.until && promo.until < todayKey()) || promo.userId)
      ? `Промокода ${b.promo} нет среди действующих общих промокодов — клиенты не смогут его применить. Создайте его во «Промокодах».` : '';
    return send(res, 200, { ...miniView(), warning }), true;
  }
  if (route === 'POST /api/miniapp') {
    const body = await readJson(req);
    const urlText = String(body.url || '').trim();
    if (urlText && !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/[\w./-]*)?$/i.test(urlText)) throw new HttpError(400, 'Адрес должен начинаться с https:// — например https://app.yabotua.com');
    if (body.enabled && !urlText) throw new HttpError(400, 'Укажите адрес Mini App.');
    const port = Number(body.port) || 0;
    if (port && (port < 1024 || port > 65535)) throw new HttpError(400, 'Порт — число от 1024 до 65535 (или пусто — автоматически).');
    const support = String(body.support || '').trim().replace(/^@|^https?:\/\/t\.me\//i, '');
    if (support && !/^[A-Za-z0-9_]{5,32}$/.test(support)) throw new HttpError(400, 'Username для «Написати нам» — латиница, цифры и _ (5–32 символа), например yabotdfh.');
    store.data.config.miniapp = { ...(store.data.config.miniapp || {}), enabled: Boolean(body.enabled), url: urlText, port, support, menuText: String(body.menuText || 'YABOT').trim().slice(0, 30) || 'YABOT' };
    store.saveNow();
    runtime.miniapp?.apply();
    if (runtime.ready) await runtime.miniapp?.syncMenuButton(runtime.tg);
    log.info(`Mini App ${body.enabled ? `включена: ${urlText}` : 'выключена'}`);
    return send(res, 200, miniView()), true;
  }

  // --- Часті питання ---
  if (route === 'GET /api/faq') return send(res, 200, { faq: faqList(), stats: store.data.stats.faq || { views: {}, matched: 0, forwarded: 0 } }), true;
  if (route === 'POST /api/faq') {
    const body = await readJson(req);
    try { saveFaq(body.faq); } catch (err) { throw new HttpError(400, err.message); }
    return send(res, 200, { faq: faqList(), stats: store.data.stats.faq || { views: {}, matched: 0, forwarded: 0 } }), true;
  }

  // --- Фінанси ---
  if (route === 'GET /api/finance') return send(res, 200, financeView(url.searchParams.get('period') || 'month')), true;

  // --- Картка клієнта ---
  const cm = route.match(/^(GET|POST) \/api\/clients\/(\d{1,20})$/);
  if (cm) {
    const user = store.data.users[cm[2]];
    if (!user) throw new HttpError(404, 'Клиент не найден.');
    if (cm[1] === 'POST') {
      const body = await readJson(req);
      const tags = [...new Set((Array.isArray(body.tags) ? body.tags : []).map((t) => String(t).trim().toLowerCase()).filter((t) => TAG_RE.test(t)))].slice(0, 12);
      if ('tags' in body) user.tags = tags;
      if ('note' in body) user.note = clean(body.note, 3000);
      if ('block' in body) {
        user.studioBlocked = Boolean(body.block);
        log.info(`Клиент ${cm[2]} ${user.studioBlocked ? 'заблокирован' : 'разблокирован'} студией`);
      }
      store.saveNow();
    }
    return send(res, 200, clientDetail(user)), true;
  }
  return false;
}

/** Скільки заявок оформлено з кожним промокодом. */
function promoOrders() {
  const counts = {};
  for (const o of store.data.inquiries) if (o.promo) counts[o.promo.code] = (counts[o.promo.code] || 0) + 1;
  return counts;
}

/** Кроки підготовки бота до запуску й чи виконано кожен. */
function setupStatus() {
  const d = store.data;
  const c = d.config;
  const prices = c.prices || {};
  const hasPrices = ['static', 'animated'].some((t) => Object.values(prices[t] || {}).some((v) => String(v || '').trim()))
    || (c.packages || []).some((p) => p.active && p.price > 0);
  const backupFresh = d.stats.lastBackupDownload && Date.now() - Date.parse(d.stats.lastBackupDownload) < 30 * 86400000;
  const steps = [
    { key: 'recipient', title: 'Получатель заявок указан', done: Boolean(c.adminChatId), href: '#settings/main' },
    { key: 'prices', title: 'Цены или пакеты заполнены', done: hasPrices, href: '#prices' },
    { key: 'catalog', title: 'В каталоге есть работы', done: (d.catalog || []).length > 0, href: '#catalog' },
    { key: 'styles', title: 'Стили с примерами (необязательно)', done: (c.styles || []).some((s) => s.active), href: '#prices', optional: true },
    { key: 'hours', title: 'Рабочие часы и автоответ', done: Boolean(c.workHours?.enabled), href: '#settings/main' },
    { key: 'replies', title: 'Быстрые ответы просмотрены', done: Array.isArray(c.quickReplies), href: '#settings/clients' },
    { key: 'channel', title: 'Канал добавлен (необязательно)', done: (c.channels || []).length > 0, href: '#channel', optional: true },
    { key: 'digest', title: 'Утренняя сводка включена', done: c.digest?.enabled !== false, href: '#settings/team' },
    { key: 'test', title: 'Тестовые заявки удалены перед запуском', done: Boolean(d.historyClearedAt), href: '#settings/data' },
    { key: 'backup', title: 'Скачана свежая резервная копия', done: Boolean(backupFresh), href: '#settings/data' },
  ];
  const required = steps.filter((s) => !s.optional);
  return { hidden: Boolean(c.wizardHidden), steps, done: required.filter((s) => s.done).length, total: required.length };
}
