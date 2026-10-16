// Запуск бота: дані, сторінка налаштування, опитування Telegram, самоперевірка, резервні копії.
import dns from 'node:dns';
import { DATA_FILE, IS_TRIAL } from './config.js';
import { store } from './store.js';
import { log, printSelfCheck } from './log.js';
import { sleep } from './util.js';
import { Telegram } from './telegram.js';
import { BotHandlers } from './handlers.js';
import { startAdminServer, announceSetupCode } from './admin/server.js';
import { checkPdfAssets } from './pdf/brief.js';
import { Broadcaster } from './broadcast.js';
import { ChannelPoster } from './channel.js';
import { MiniServer } from './miniapp/server.js';
import { sendTelegramBackup } from './tgbackup.js';
import { startGenagentSync } from './genagent.js';
import { startJournal } from './journal.js';

// До Telegram — через IPv4: на сервері з'єднання по IPv6 кілька разів на день «зависають»
// (боти без IPv6 на тому ж сервері таких обривів не мають).
dns.setDefaultResultOrder('ipv4first');

const STOP_WAIT_MS = 8000; // скільки при зупинці чекаємо поточне оновлення (Docker дає 10 с)

const COMMANDS = [
  { command: 'start', description: 'Головне меню' },
  { command: 'order', description: 'Замовити стікерпак' },
  { command: 'works', description: 'Наші роботи' },
  { command: 'prices', description: 'Вартість' },
  { command: 'my_orders', description: 'Мої замовлення' },
  { command: 'invite', description: 'Запросити друга' },
  { command: 'cancel', description: 'Скасувати бриф' },
  { command: 'language', description: 'English / Українська' },
  { command: 'help', description: 'Допомога' },
];

// Для користувачів з англійським інтерфейсом Telegram
const COMMANDS_EN = [
  { command: 'start', description: 'Main menu' },
  { command: 'order', description: 'Order a sticker pack' },
  { command: 'works', description: 'Our works' },
  { command: 'prices', description: 'Prices' },
  { command: 'my_orders', description: 'My orders' },
  { command: 'invite', description: 'Invite a friend' },
  { command: 'cancel', description: 'Cancel the brief' },
  { command: 'language', description: 'Українська / English' },
  { command: 'help', description: 'Help' },
];

class Runtime {
  constructor() {
    this.stopping = false;
    this.token = null;
    this.tg = null;
    this.handlers = null;
    this.ready = false;       // getMe/налаштування для поточного токена виконано
    this.tokenRejected = false;
    this.state = { state: 'waiting', detail: 'ожидает настройки' };
    this.abort = null;
  }

  status() {
    return this.state;
  }

  async start() {
    store.load();
    this.broadcaster = new Broadcaster(this);
    this.broadcaster.markInterrupted();
    this.channels = new ChannelPoster(this);
    this.channels.startScheduler();
    store.data.stats.startedAt = new Date().toISOString();
    store.saveNow();
    log.info(`YABOT запущен. Данные: ${DATA_FILE}${IS_TRIAL ? ' (пробный запуск)' : ''}`);

    this.server = startAdminServer(this);
    announceSetupCode();
    this.miniapp = new MiniServer(this);
    this.miniapp.apply();

    store.dailyBackup();
    this.backupTimer = setInterval(() => {
      store.dailyBackup();
      // Копія власнику в Telegram — за розкладом із налаштувань
      if (this.ready && this.tg && !this.stopping) {
        sendTelegramBackup(this.tg).catch((err) => log.warn(`Копия в Telegram не отправлена: ${err.description || err.message}`));
      }
    }, 60 * 60 * 1000);
    this.backupTimer.unref();

    this.reminderTimer = setInterval(() => {
      if (!this.ready || !this.handlers || this.stopping) return;
      this.handlers.processReminders().catch((err) => {
        log.error(`Ошибка напоминаний: ${err.message}`);
        store.addError('reminders', err);
      });
    }, 10 * 60 * 1000);
    this.reminderTimer.unref();

    // Статуси рахунків monobank — раз на 30 секунд (лише якщо є неоплачені рахунки)
    this.paymentTimer = setInterval(() => {
      if (!this.ready || !this.handlers || this.stopping) return;
      this.handlers.gifts.poll().catch((err) => log.warn(`Проверка сертификатов: ${err.message}`));
      this.handlers.processScheduled().catch((err) => log.warn(`Отложенные сообщения: ${err.message}`));
      this.handlers.payments.poll().catch((err) => {
        log.error(`Проверка оплат: ${err.message}`);
        store.addError('payments', err);
      });
    }, 30 * 1000);
    this.paymentTimer.unref();

    // Ціни, послуги й FAQ — у базу знань ІІ-агента студії (якщо підключено на сторінці бота)
    this.genagentTimer = startGenagentSync(() => (this.ready && !this.stopping ? this.tg : null));
    this.journalTimer = startJournal();

    if (!store.configured) this.selfCheck(null);
    this.pollLoop();
  }

  /** Самоперевірка у форматі для панелі. me — результат getMe або помилка. */
  async selfCheck(me) {
    const items = [];
    items.push({ status: 'ok', title: 'Данные', detail: DATA_FILE });
    try {
      checkPdfAssets();
      items.push({ status: 'ok', title: 'PDF-бланк', detail: 'шрифты и логотип на месте' });
    } catch (err) {
      items.push({ status: 'fail', title: 'PDF-бланк', detail: err.message });
    }
    if (!store.configured) {
      items.push({ status: 'warn', title: 'Настройка', detail: 'нужна первичная настройка — откройте страницу бота из панели' });
      printSelfCheck(items);
      return;
    }
    if (me instanceof Error) items.push({ status: 'fail', title: 'Токен Telegram', detail: me.message });
    else items.push({ status: 'ok', title: 'Токен Telegram', detail: `@${me.username}` });

    const adminChatId = store.data.config.adminChatId;
    if (!adminChatId) {
      items.push({ status: 'warn', title: 'Получатель заявок', detail: 'не указан — заявки никуда не придут (укажите ID на странице бота)' });
    } else if (!(me instanceof Error)) {
      try {
        const chat = await this.tg.call('getChat', { chat_id: adminChatId });
        const name = chat.username ? `@${chat.username}` : chat.title || chat.first_name || adminChatId;
        items.push({ status: 'ok', title: 'Получатель заявок', detail: name });
      } catch (err) {
        items.push({ status: 'fail', title: 'Получатель заявок', detail: `бот не видит чат ${adminChatId} (${err.description || err.message})` });
      }
    }
    printSelfCheck(items);
  }

  /** Підготовка після появи (або зміни) токена. */
  async prepareToken() {
    let me;
    try {
      me = await this.tg.call('getMe', {}, { timeoutMs: 20000 });
    } catch (err) {
      if (err.status === 401) {
        this.tokenRejected = true;
        this.state = { state: 'error', detail: 'Telegram не принимает токен' };
        log.error('Telegram не принимает токен бота. Замените токен в панели («Заменить токен»).');
        store.addError('telegram', err);
        await this.selfCheck(err);
        return false;
      }
      throw err;
    }
    // inline — чи ввімкнено інлайн-режим у @BotFather (кнопка «Надіслати другу» лише тоді)
    store.data.bot = { id: me.id, username: me.username, firstName: me.first_name, inline: Boolean(me.supports_inline_queries) };
    await this.tg.call('deleteWebhook', { drop_pending_updates: false }).catch(() => {});
    await this.tg.call('setMyCommands', { commands: COMMANDS }).catch((err) => log.warn(`Команды меню не установлены: ${err.message}`));
    await this.tg.call('setMyCommands', { commands: COMMANDS_EN, language_code: 'en' }).catch(() => {});
    await this.handlers.syncStudioCommands().catch(() => {});
    await this.miniapp?.syncMenuButton(this.tg);
    store.save();
    log.info(`Подключён к Telegram как @${me.username}`);
    await this.selfCheck(me);
    this.ready = true;
    return true;
  }

  async pollLoop() {
    let failures = 0;
    let retried = false; // одиночний таймаут повторюємо одразу й не вважаємо збоєм
    let outageSince = null; // коли зник зв'язок з Telegram — для сповіщення після відновлення
    while (!this.stopping) {
      if (!store.configured) { await sleep(2000); continue; }

      const token = store.data.config.botToken;
      if (token !== this.token) {
        this.token = token;
        this.tg = new Telegram(token);
        this.handlers = new BotHandlers(this.tg);
        this.ready = false;
        this.tokenRejected = false;
        this.state = { state: 'waiting', detail: 'подключение' };
      }
      if (this.tokenRejected) { await sleep(10000); continue; }

      try {
        if (!this.ready && !(await this.prepareToken())) continue;
        this.abort = new AbortController();
        const updates = await this.tg.call('getUpdates', {
          offset: store.data.telegramOffset,
          timeout: 50,
          allowed_updates: ['message', 'callback_query', 'edited_message', 'message_reaction', 'inline_query'],
        }, { timeoutMs: 65000, signal: this.abort.signal });

        retried = false;
        if (failures) log.info('Связь с Telegram восстановлена');
        if (outageSince) {
          const from = outageSince;
          outageSince = null;
          this.handlers.digest.outageAlert(from, Date.now()).catch(() => {});
        }
        failures = 0;
        this.state = { state: 'ok', detail: store.data.bot.username ? `@${store.data.bot.username}` : '' };

        for (const update of updates) {
          if (this.stopping) break;
          store.data.telegramOffset = update.update_id + 1;
          // Поточне оновлення пам'ятаємо, щоб зупинка дочекалася його й не втратила зміни
          this.current = this.handlers.handleUpdate(update);
          try {
            await this.current;
          } catch (err) {
            log.error(`Ошибка обработки сообщения: ${err.message}`);
            store.addError(err.status ? 'telegram' : 'update', err);
          } finally {
            this.current = null;
          }
        }
        if (updates.length) store.save();
      } catch (err) {
        if (this.stopping) break;
        if (err.status === 401) { this.ready = false; continue; }
        if (err.code === 'TIMEOUT' && !failures && !retried) { retried = true; continue; }
        failures++;
        if (!outageSince) outageSince = Date.now();
        const detail = err.status === 409
          ? 'этот токен уже использует другая копия бота (остановите её)'
          : err.description || err.message;
        this.state = { state: 'error', detail };
        log.warn(`Связь с Telegram потеряна: ${detail}`);
        if (failures === 1) store.addError('telegram', err);
        await sleep(Math.min(60000, 5000 * 2 ** Math.min(failures - 1, 4)));
      }
    }
  }

  async stop(signal) {
    if (this.stopping) return;
    this.stopping = true;
    log.info(`Остановка (${signal})…`);
    this.abort?.abort();
    clearInterval(this.backupTimer);
    clearInterval(this.reminderTimer);
    clearInterval(this.paymentTimer);
    this.genagentTimer?.close();
    this.journalTimer?.close();
    clearInterval(this.channels?.timer);
    this.server?.close();
    // Клієнт міг саме відправити бриф (PDF, файли) — даємо обробці завершитися, щоб не втратити зміни
    if (this.current) await Promise.race([this.current.catch(() => {}), sleep(STOP_WAIT_MS)]);
    // Пачки повідомлень, що чекають відповіді помічника, — відповідаємо зараз, а не губимо
    await Promise.race([this.handlers.settleQuestions?.().catch(() => {}), sleep(STOP_WAIT_MS)]);
    try { store.saveNow(); } catch (err) { log.error(`Не удалось сохранить данные: ${err.message}`); }
    setTimeout(() => process.exit(0), 500).unref();
  }
}

const runtime = new Runtime();

process.on('SIGTERM', () => runtime.stop('SIGTERM'));
process.on('SIGINT', () => runtime.stop('SIGINT'));
process.on('unhandledRejection', (err) => {
  log.error(`Необработанная ошибка: ${err?.stack || err}`);
  try { store.addError('runtime', err); } catch { /* дані ще не завантажено */ }
});

runtime.start().catch((err) => {
  log.error(`Бот не запустился: ${err.stack || err.message}`);
  process.exit(1);
});
