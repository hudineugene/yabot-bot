// Ранкова зведення власнику (і дизайнерам — по їхніх заявках), нагадування про терміни,
// сповіщення про збої та автоматичне завершення відпустки. Усе для студії — російською.
import { store } from './store.js';
import { log } from './log.js';
import { escapeHtml, kyivHour, orderNo, todayKey } from './util.js';
import { isOpen, dueState, dateText, team, paidValue, isPaid } from './orders.js';
import { money } from './texts.js';

const DAY = 24 * 60 * 60 * 1000;
const ERROR_ALERT_GAP = 30 * 60 * 1000;
const QUIET_AREAS = new Set(['telegram', 'ai', 'reminders']); // про ці збої — окремо або не терміново

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const client = (o) => (o.username ? `@${escapeHtml(o.username)}` : escapeHtml(o.fullName || String(o.userId)));
const ref = (o) => `#${orderNo(o.id)} ${client(o)}`;
const list = (orders, extra) => orders.slice(0, 8).map((o) => ref(o) + (extra ? extra(o) : '')).join(', ') + (orders.length > 8 ? ` и ещё ${orders.length - 8}` : '');

export class Digest {
  constructor(handlers) {
    this.h = handlers;
  }

  get data() { return store.data; }
  settings() { return this.data.config.digest || { enabled: true, hour: 9 }; }

  /** Текст зведення. member — дизайнер (лише його заявки) або null (власник, усе). */
  build(member = null) {
    const d = this.data;
    const now = Date.now();
    const mine = (o) => !member || o.assignee === member.id;
    const orders = d.inquiries.filter(mine);
    const open = orders.filter(isOpen);
    const today = todayKey();
    const lines = [];
    const head = `☀️ <b>Сводка YABOT на ${dateText(today).slice(0, 5)} (${WEEKDAYS[new Date(`${today}T12:00:00Z`).getUTCDay()]})</b>${member ? ` · ${escapeHtml(member.name)}` : ''}`;

    const fresh = orders.filter((o) => now - Date.parse(o.createdAt) < DAY);
    if (!member) {
      const starts = d.stats.daily?.[todayKey(new Date(now - DAY))]?.starts || 0;
      if (fresh.length || starts) lines.push(`📥 За сутки: ${fresh.length ? `заявок ${fresh.length} — ${list(fresh)}` : 'новых заявок нет'}${starts ? `; начали бриф вчера: ${starts}` : ''}`);
    } else if (fresh.length) lines.push(`📥 Новые для вас: ${list(fresh)}`);

    const stale = open.filter((o) => o.status === 'new' && now - Date.parse(o.createdAt) > DAY);
    if (stale.length) lines.push(`⏰ Ждут ответа больше суток: ${list(stale)}`);

    const overdue = open.filter((o) => dueState(o) === 'overdue');
    const dueToday = open.filter((o) => dueState(o) === 'today');
    const dueTomorrow = open.filter((o) => dueState(o) === 'tomorrow');
    const due = [
      overdue.length ? `просрочено — ${list(overdue, (o) => ` (до ${dateText(o.studio.due).slice(0, 5)})`)}` : '',
      dueToday.length ? `сегодня — ${list(dueToday)}` : '',
      dueTomorrow.length ? `завтра — ${list(dueTomorrow)}` : '',
    ].filter(Boolean);
    if (due.length) lines.push(`🔥 Сроки: ${due.join('; ')}`);

    const last = (o) => o.sketches?.at(-1);
    const changes = open.filter((o) => last(o)?.status === 'changes');
    if (changes.length) lines.push(`✏️ Правки к эскизам: ${list(changes)}`);
    const waiting = open.filter((o) => last(o)?.status === 'pending' && now - Date.parse(last(o).sentAt) > 2 * DAY);
    if (waiting.length) lines.push(`⏳ Эскизы ждут клиента больше 2 дней: ${list(waiting)}`);
    const quotes = open.filter((o) => o.quotes?.at(-1)?.status === 'sent' && now - Date.parse(o.quotes.at(-1).sentAt) > DAY);
    if (quotes.length) lines.push(`🧾 Смета без ответа клиента: ${list(quotes)}`);
    const questions = open.filter((o) => o.quotes?.at(-1)?.status === 'question');
    if (questions.length) lines.push(`💬 Вопросы по смете: ${list(questions)}`);
    const unread = orders.filter((o) => o.unread > 0);
    if (unread.length) lines.push(`💬 Непрочитанные сообщения: ${list(unread, (o) => ` (${o.unread})`)}`);

    if (!member) {
      const awaiting = open.filter((o) => ['created', 'processing', 'hold'].includes(o.payments?.at(-1)?.status));
      const since = now - DAY;
      const paidYesterday = [
        ...d.inquiries.flatMap((o) => o.payments || []).filter((p) => isPaid(p) && p.kind !== 'gift' && Date.parse(p.paidAt) > since),
        ...(d.gifts || []).filter((g) => g.paid && Date.parse(g.paidAt) > since).map((g) => ({ amount: g.amount })),
      ];
      const pay = [
        awaiting.length ? `ждут оплаты — ${list(awaiting, (o) => ` (${money(o.payments.at(-1).amount)})`)}` : '',
        paidYesterday.length ? `получено за сутки — ${money(paidYesterday.reduce((s, p) => s + paidValue(p), 0))}` : '',
      ].filter(Boolean);
      if (pay.length) lines.push(`💳 ${pay.join('; ')}`);
      const errors = d.errors.filter((e) => now - Date.parse(e.createdAt) < DAY).length;
      if (errors) lines.push(`⚠️ Ошибок за сутки: ${errors} — посмотрите в «Настройках» на странице бота`);
      if (d.config.active === false) lines.push('⏸ Приём заказов на паузе');
      const v = d.config.vacation;
      if (v?.enabled) lines.push(`🏖 Режим отпуска${v.until ? ` до ${dateText(v.until)}` : ''}`);
    }

    const inWork = open.filter((o) => o.status === 'in_progress').length;
    const doneWeek = orders.filter((o) => o.status === 'done' && o.doneAt && now - Date.parse(o.doneAt) < 7 * DAY).length;
    const footer = `🎨 В работе: ${inWork} · готово за неделю: ${doneWeek}`;
    return [head, '', ...(lines.length ? lines : ['Срочного ничего — хорошего дня 🙂']), '', footer].join('\n');
  }

  /** Раз на день о вказаній годині (за Києвом). force — надіслати зараз (кнопка на сторінці). */
  async maybeSend({ force = false } = {}) {
    const s = this.settings();
    const today = todayKey();
    if (!force && (!s.enabled || kyivHour() < Number(s.hour ?? 9) || this.data.stats.digestSentFor === today)) return false;
    const studio = this.data.config.adminChatId;
    if (!studio) return false;
    // Позначка до відправки — щоб наступний таймер не надіслав удруге; якщо Telegram не прийняв —
    // знімаємо її, і через 10 хвилин буде нова спроба (інакше зведення пропало б на весь день)
    const sentBefore = this.data.stats.digestSentFor;
    this.data.stats.digestSentFor = today;
    store.save();
    try {
      await this.h.send(studio, this.build());
    } catch (err) {
      this.data.stats.digestSentFor = sentBefore;
      store.save();
      throw err;
    }
    for (const m of team().filter((x) => x.active && x.telegramId)) {
      await this.h.send(m.telegramId, this.build(m)).catch((err) => log.warn(`Сводка для ${m.name} не отправлена: ${err.message}`));
    }
    log.info('Утренняя сводка отправлена');
    // По понеділках — ще й тижневий звіт власнику
    if (s.weekly !== false && new Date(`${today}T12:00:00Z`).getUTCDay() === 1 && this.data.stats.weeklySentFor !== today) {
      const weeklyBefore = this.data.stats.weeklySentFor;
      this.data.stats.weeklySentFor = today;
      store.save();
      await this.h.send(studio, this.weekly()).catch((err) => {
        log.warn(`Недельный отчёт не отправлен: ${err.message}`);
        this.data.stats.weeklySentFor = weeklyBefore;
        store.save();
      });
    }
    return true;
  }

  /** Тижневий звіт: заявки, гроші, конверсія, найкраще джерело, оцінки, кошториси, дизайнери. */
  weekly() {
    const d = this.data;
    const now = Date.now();
    const week = (iso) => iso && now - Date.parse(iso) < 7 * DAY;
    const prevWeek = (iso) => iso && now - Date.parse(iso) >= 7 * DAY && now - Date.parse(iso) < 14 * DAY;
    const created = d.inquiries.filter((o) => week(o.createdAt));
    const createdPrev = d.inquiries.filter((o) => prevWeek(o.createdAt)).length;
    const done = d.inquiries.filter((o) => o.status === 'done' && week(o.doneAt));
    const received = [
      ...d.inquiries.flatMap((o) => (o.payments || []).filter((p) => isPaid(p) && p.kind !== 'gift' && week(p.paidAt))),
      ...(d.gifts || []).filter((g) => g.paid && week(g.paidAt)).map((g) => ({ amount: g.amount })),
    ].reduce((s, p) => s + paidValue(p), 0);
    let starts = 0;
    for (let i = 0; i < 7; i++) starts += d.stats.daily?.[todayKey(new Date(now - i * DAY))]?.starts || 0;
    const sources = {};
    for (const o of created) sources[o.source || 'напрямую'] = (sources[o.source || 'напрямую'] || 0) + 1;
    const best = Object.entries(sources).sort((a, b) => b[1] - a[1])[0];
    const quotes = d.inquiries.flatMap((o) => (o.quotes || []).filter((q) => week(q.sentAt)));
    const rated = done.filter((o) => o.review?.rating);
    const trend = createdPrev ? ` (${created.length >= createdPrev ? '▲' : '▼'} было ${createdPrev})` : '';
    const lines = [
      `📅 <b>Неделя YABOT</b> · ${dateText(todayKey(new Date(now - 7 * DAY))).slice(0, 5)}–${dateText(todayKey(new Date(now - DAY))).slice(0, 5)}`,
      '',
      `📥 Заявок: <b>${created.length}</b>${trend}`,
      `✅ Готово: <b>${done.length}</b>`,
      `💰 Получено: <b>${money(received)}</b>`,
      `🧭 Начали бриф: ${starts}${starts ? ` → заявок ${Math.round((created.length / starts) * 100)}%` : ''}`,
      ...(best ? [`🏆 Лучший источник: <b>${escapeHtml(best[0])}</b> (${best[1]})`] : []),
      ...(quotes.length ? [`🧾 Смет: ${quotes.length}, согласовано: ${quotes.filter((q) => q.status === 'accepted').length}`] : []),
      ...(rated.length ? [`⭐ Оценка: ${(rated.reduce((s, o) => s + o.review.rating, 0) / rated.length).toFixed(1)} (${rated.length})`] : []),
      ...team().filter((m) => m.active).map((m) => `👤 ${escapeHtml(m.name)}: готово ${done.filter((o) => o.assignee === m.id).length}, в работе ${d.inquiries.filter((o) => o.assignee === m.id && isOpen(o)).length}`),
      '',
      'Подробности — вкладка «Финансы» на странице бота.',
    ];
    return lines.join('\n');
  }

  /** Нагадування про терміни: завтра, сьогодні, прострочено — кожне один раз на заявку. */
  async dueReminders() {
    const hour = kyivHour();
    if (hour < 9 || hour >= 21) return;
    for (const o of this.data.inquiries.filter(isOpen)) {
      const state = dueState(o);
      if (!state) continue;
      // Термін змінили — нагадування рахуються заново
      if (o.dueAlerts?.for !== o.studio.due) o.dueAlerts = { for: o.studio.due };
      if (o.dueAlerts[state]) continue;
      o.dueAlerts[state] = new Date().toISOString();
      const text = {
        tomorrow: `⏰ <b>Завтра срок</b> по #${orderNo(o.id)} ${client(o)}: ${escapeHtml(o.hero.slice(0, 60))}`,
        today: `🔥 <b>Сегодня срок</b> по #${orderNo(o.id)} ${client(o)}: ${escapeHtml(o.hero.slice(0, 60))}`,
        overdue: `⚠️ <b>Просрочен срок</b> по #${orderNo(o.id)} ${client(o)} (был ${dateText(o.studio.due)}). Обновите срок в карточке или предупредите клиента.`,
      }[state];
      await this.h.notifyTeam(o, text);
    }
    store.save();
  }

  /** Відпустка закінчилась — вимикаємо режим і кажемо власнику. */
  async vacationCheck() {
    const v = this.data.config.vacation;
    if (!v?.enabled || !v.until || v.until >= todayKey()) return;
    v.enabled = false;
    store.saveNow();
    log.info('Режим отпуска завершён автоматически');
    const studio = this.data.config.adminChatId;
    if (studio) await this.h.send(studio, `🏖 Режим отпуска закончился (${dateText(v.until)}) — бот снова отвечает как обычно.`).catch(() => {});
  }

  // --- Збої ---

  /** Нові помилки (крім зв'язку з Telegram) — коротке повідомлення власнику, не частіше ніж раз на 30 хвилин. */
  async errorAlert() {
    if (this.data.config.alerts?.enabled === false) return;
    const st = this.data.stats;
    const since = Date.parse(st.errorAlertCheckedAt || 0) || Date.now() - 10 * 60 * 1000;
    const fresh = this.data.errors.filter((e) => Date.parse(e.createdAt) > since && !QUIET_AREAS.has(e.area));
    // Поки діє 30-хвилинна пауза, нові помилки не «списуємо» — вони прийдуть наступним повідомленням
    if (fresh.length && st.errorAlertAt && Date.now() - Date.parse(st.errorAlertAt) < ERROR_ALERT_GAP) return;
    st.errorAlertCheckedAt = new Date().toISOString();
    if (!fresh.length) return;
    const studio = this.data.config.adminChatId;
    if (!studio) return;
    st.errorAlertAt = new Date().toISOString();
    store.save();
    const items = fresh.slice(0, 5).map((e) => `• <b>${escapeHtml(e.area)}</b>: ${escapeHtml(e.message.slice(0, 160))}`).join('\n');
    await this.h.send(studio, `⚠️ <b>В боте ошибки</b> (${fresh.length}):\n${items}\n\nПодробности — «Настройки» → «Ошибки» на странице бота.`).catch(() => {});
  }

  /** Після відновлення зв'язку з Telegram: скільки бот був офлайн. */
  async outageAlert(from, to) {
    const minutes = Math.round((to - from) / 60000);
    const st = this.data.stats;
    st.lastOutage = { from: new Date(from).toISOString(), to: new Date(to).toISOString(), minutes };
    store.save();
    if (this.data.config.alerts?.enabled === false || minutes < 3) return;
    const studio = this.data.config.adminChatId;
    if (!studio) return;
    const t = (ms) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
    await this.h.send(studio,
      `📡 Бот был без связи с Telegram с ${t(from)} до ${t(to)} (${minutes} мин). ` +
      'Связь восстановлена. Сообщения клиентов за это время Telegram доставит сейчас — бот ответит на них.').catch(() => {});
  }
}
