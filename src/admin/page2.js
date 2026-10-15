// Сторінка бота, частина 2 (v2.13): дошка заявок, фінанси, картка клієнта, зведення й сповіщення,
// відпустка, команда дизайнерів, резервні копії, промокоди, редагування постів, роль дизайнера.
// Скрипт додається в кінець app.js — функції з першої частини (el, api, action, fmt…) доступні тут.

export const PAGE2_CSS = String.raw`
.audit-list { max-height:460px; overflow-y:auto; }
.audit-row { border-top:1px solid var(--line); padding:6px 0; font-size:14px; }
.audit-row:first-child { border-top:0; }
.member-svc { display:flex; gap:12px; flex-wrap:wrap; margin-top:4px; }
.member-svc label { font-size:13px; margin:0; }
.view-toggle { display:inline-flex; border:1px solid #ddd; border-radius:10px; overflow:hidden; }
.view-toggle button { margin:0; border-radius:0; background:#fff; color:var(--ink); padding:8px 12px; font-size:13px; }
.view-toggle button.active { background:var(--ink); color:#fff; }
.board { display:flex; gap:12px; overflow-x:auto; padding:4px 2px 12px; align-items:flex-start; }
.toolbar select { width:auto; margin:0; }
.pay-form select { width:auto; margin:0; }
.col { flex:1 0 200px; background:#ececec; border-radius:12px; padding:8px; min-height:120px; }
.col.over { outline:2px dashed var(--accent); background:var(--soft); }
.col h3 { margin:2px 4px 8px; display:flex; justify-content:space-between; }
.bcard { background:#fff; border-radius:10px; padding:8px 10px; margin-bottom:8px; box-shadow:0 1px 2px rgba(0,0,0,.08); cursor:grab; font-size:13px; }
.bcard:active { cursor:grabbing; }
.bcard.dragging { opacity:.4; }
.bcard b { font-size:14px; }
.bcard .meta { display:flex; flex-wrap:wrap; gap:4px; margin-top:6px; }
.bcard .who { color:var(--muted); }
.due-tag { display:inline-block; padding:1px 8px; border-radius:10px; font-size:12px; background:#eee; white-space:nowrap; }
.due-tag.overdue { background:#fdecea; color:var(--bad); font-weight:700; }
.due-tag.today { background:#fff3e0; color:#b26a00; font-weight:700; }
.due-tag.tomorrow { background:#fff8e1; color:#8a6d00; }
.assign { display:flex; align-items:center; gap:8px; margin:0 0 0 auto; font-weight:600; }
.assign select { width:auto; margin:0; padding:6px 10px; }
.tags { display:flex; flex-wrap:wrap; gap:4px; margin:8px 0 4px; }
.ctag { background:#efe7ff; color:#4b2c91; }
.small-link { font-size:13px; }
.pay-sum { margin:0 0 8px; }
.pay-sum .debt { color:var(--bad); }
.fin-chart svg { width:100%; height:auto; }
.tag-input { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
.tag-input input { width:180px; margin:0; }
.tag-input .tag button { margin:0 0 0 4px; padding:0 4px; background:none; color:inherit; font-size:12px; }
.member { display:flex; gap:10px; align-items:center; flex-wrap:wrap; border-top:1px solid var(--line); padding:10px 0; }
.member:first-child { border-top:0; }
.member .grow { flex:1; min-width:200px; }
.backup-row { display:flex; gap:10px; align-items:baseline; flex-wrap:wrap; border-top:1px solid var(--line); padding:6px 0; font-size:14px; }
.edit-banner { background:#e8f1ff; border:1px solid #bcd3ff; border-radius:12px; padding:10px 12px; margin:0 0 12px; }
.digest-preview { white-space:pre-wrap; background:#f7f7f7; border-radius:10px; padding:10px 12px; font-size:13px; }
.role-designer [data-owner] { display:none !important; }
`;

export const PAGE2_JS = String.raw`
// ---------- роль: власник або дизайнер ----------
const OWNER_TABS = TABS.slice();
function applyRole(me) {
  state.role = me.role;
  document.body.classList.toggle('role-designer', me.role === 'designer');
  if (me.role === 'designer') {
    TABS.splice(0, TABS.length, 'orders');
    $('botName').textContent = (me.bot || '') + ' · дизайнер ' + me.name;
  } else {
    TABS.splice(0, TABS.length, ...OWNER_TABS);
  }
}

// ---------- огляд: додаткові попередження ----------
function extraAlerts(a) {
  const out = [];
  const link = (x, i, extra) => [i ? ', ' : '', el('a', { href: '#orders/' + x.id }, no(x.id) + ' ' + x.client + (extra || ''))];
  if (a.outage) out.push(el('div', { class: 'alert' }, '📡 Бот был без связи с Telegram ' + fmt(a.outage.from) + ' — ' + fmt(a.outage.to) + ' (' + a.outage.minutes + ' мин). Сейчас связь есть.'));
  if (a.vacation) out.push(el('div', { class: 'alert info' }, '🏖 Режим отпуска' + (a.vacation.until ? ' до ' + dmy(a.vacation.until) : '') + (a.vacation.acceptOrders ? ' — заявки принимаются.' : ' — новые заявки не принимаются.') + ' ', el('a', { href: '#settings' }, 'Настроить')));
  if (a.overdue.length) out.push(el('div', { class: 'alert bad' }, '🔥 Просрочен срок: ', a.overdue.map((x, i) => link(x, i, ' (до ' + dmy(x.due).slice(0, 5) + ')'))));
  if (a.dueToday.length) out.push(el('div', { class: 'alert' }, '📅 Срок сегодня: ', a.dueToday.map((x, i) => link(x, i))));
  if (a.dueTomorrow.length) out.push(el('div', { class: 'alert info' }, '📅 Срок завтра: ', a.dueTomorrow.map((x, i) => link(x, i))));
  if (a.quoteWaiting.length) out.push(el('div', { class: 'alert' }, '💬 Вопросы клиента по смете: ', a.quoteWaiting.map((x, i) => link(x, i))));
  return out;
}

// ---------- дошка заявок ----------
const STAGE_COLS = [['new', 'Новые'], ['in_progress', 'В работе'], ['sketches', 'Эскизы'], ['final', 'Финал'], ['done', 'Готово']];
let boardView = 'list';
try { boardView = localStorage.getItem('yabot.ordersView') || 'list'; } catch (e) { /* без сховища */ }

function setOrdersView(v) {
  boardView = v;
  try { localStorage.setItem('yabot.ordersView', v); } catch (e) { /* без сховища */ }
  renderOrders();
}

function renderBoard(list) {
  const notify = el('input', { type: 'checkbox', id: 'boardNotify' });
  const monthAgo = Date.now() - 30 * 864e5;
  const cols = STAGE_COLS.map(([stage, title]) => {
    const items = list.filter((o) => o.stage === stage && (stage !== 'done' || !o.doneAt || Date.parse(o.doneAt || o.createdAt) > monthAgo));
    const col = el('div', { class: 'col', 'data-stage': stage },
      el('h3', {}, el('span', {}, title), el('span', {}, String(items.length))),
      items.map((o) => {
        const card = el('div', { class: 'bcard', draggable: 'true', 'data-id': o.id },
          el('div', {}, el('b', {}, no(o.id)), ' ', el('span', { class: 'who' }, o.client)),
          el('div', {}, o.hero.length > 60 ? o.hero.slice(0, 60) + '…' : o.hero),
          el('div', { class: 'meta' },
            dueTag(o),
            o.amount ? el('span', { class: 'tag' }, money(o.amount)) : null,
            o.check && o.check.done ? el('span', { class: 'tag', title: 'Этапы работы' }, '✅ ' + o.check.done + '/' + o.check.total) : null,
            o.assigneeName ? el('span', { class: 'tag' }, '👤 ' + o.assigneeName) : null,
            o.unread ? el('span', { class: 'badge chat-badge' }, '💬 ' + o.unread) : null,
            o.quote === 'sent' ? el('span', { class: 'tag', title: 'Смета ждёт ответа' }, '🧾⏳') : o.quote === 'question' ? el('span', { class: 'tag', title: 'Вопросы по смете' }, '🧾💬') : null));
        card.addEventListener('click', () => { location.hash = 'orders/' + o.id; });
        card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(o.id)); card.classList.add('dragging'); });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
        return card;
      }));
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', () => col.classList.remove('over'));
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('over');
      const id = Number(e.dataTransfer.getData('text/plain'));
      const o = state.orders.find((x) => x.id === id);
      if (!o || o.stage === stage) return;
      try {
        const r = await api('/api/orders/' + id + '/stage', { stage, notifyClient: $('boardNotify').checked });
        Object.assign(o, { stage: r.order.stage, status: r.order.status });
        renderOrders();
        refreshBadges();
      } catch (err) { alert(err.message); }
    });
    return col;
  });
  return el('div', {},
    el('label', { class: 'check' }, notify, 'Сообщать клиенту при смене статуса (взяли в работу / готово)'),
    el('p', { class: 'muted' }, 'Перетаскивайте карточки между колонками. «Эскизы» и «Финал» бот ставит сам, когда вы отправляете эскизы и клиент их согласует. В «Готово» — заявки за 30 дней.'),
    el('div', { class: 'board' }, cols));
}

// ---------- фінанси ----------
async function loadFinance() {
  loadAnalytics().catch((err) => console.error(err));
  const period = $('finPeriod').value;
  const f = await api('/api/finance?period=' + encodeURIComponent(period));
  const kpi = (value, label, extra) => el('div', { class: 'stat' }, el('b', {}, value), el('span', {}, label), extra ? el('small', {}, extra) : null);
  $('finKpis').replaceChildren(
    kpi(money(f.received.sum), 'Получено денег', 'платежей: ' + f.received.count),
    kpi(money(f.revenue), 'Выручка (готовые заказы)', 'заказов: ' + f.done + (f.doneNoPrice ? ', без цены: ' + f.doneNoPrice : '')),
    kpi(f.avgCheck ? money(f.avgCheck) : '—', 'Средний чек'),
    kpi(money(f.pipeline.sum), 'В работе (по ценам)', 'заказов: ' + f.pipeline.count),
    kpi(money(f.debts.total), 'Должны клиенты', 'заказов: ' + f.debts.list.length));
  $('finNote').textContent = 'Период: ' + f.label + '. «Выручка» считается по согласованной цене заказов, переведённых в «Готово» за период; «Получено» — по фактическим оплатам (monobank и отмеченные вручную).' + (f.doneNoPrice ? ' У ' + f.doneNoPrice + ' готовых заказов не указана цена — они не попали в выручку.' : '');
  drawFinChart(f.months);
  $('finDebts').replaceChildren(f.debts.list.length ? el('div', { class: 'table-wrap' }, el('table', {},
    el('thead', {}, el('tr', {}, ['Заявка', 'Клиент', 'Статус', 'Цена', 'Оплачено', 'Остаток'].map((h) => el('th', {}, h)))),
    el('tbody', {}, f.debts.list.map((d) => {
      const tr = el('tr', { class: 'click' }, el('td', {}, el('b', {}, no(d.id))), el('td', {}, d.client), el('td', {}, statusTag(d.status)),
        el('td', {}, money(d.amount)), el('td', {}, money(d.paid)), el('td', {}, el('b', { class: 'debt' }, money(d.remaining))));
      tr.addEventListener('click', () => { location.hash = 'orders/' + d.id; });
      return tr;
    })))) : el('p', { class: 'muted' }, 'Долгов нет 🎉'));
  drawFinServices(f.services || []);
  $('finSources').replaceChildren(f.sources.length ? el('div', { class: 'table-wrap' }, el('table', {},
    el('thead', {}, el('tr', {}, ['Источник', 'Готовых заказов', 'Выручка'].map((h) => el('th', {}, h)))),
    el('tbody', {}, f.sources.map((s) => el('tr', {}, el('td', {}, s.source ? el('span', { class: 'tag' }, s.source) : 'напрямую'), el('td', {}, String(s.orders)), el('td', {}, money(s.revenue))))))) : el('p', { class: 'muted' }, 'Нет готовых заказов с ценой за период.'));
}

function drawFinServices(list) {
  const max = Math.max(1, ...list.map((s) => s.revenue));
  $('finServices').replaceChildren(list.length ? el('div', { class: 'table-wrap' }, el('table', {},
    el('thead', {}, el('tr', {}, ['Услуга', 'Готовых заказов', 'Выручка', 'Средний чек', ''].map((h) => el('th', {}, h)))),
    el('tbody', {}, list.map((s) => el('tr', {}, el('td', {}, s.name), el('td', {}, String(s.orders)), el('td', {}, money(s.revenue)), el('td', {}, money(s.avg)),
      el('td', { style: 'width:30%' }, el('div', { class: 'progress' }, el('i', { style: 'width:' + Math.round((s.revenue / max) * 100) + '%' })))))))) : el('p', { class: 'muted' }, 'Нет готовых заказов с ценой за период.'));
}

function drawFinChart(months) {
  const W = 600, H = 170, pad = 40;
  const max = Math.max(1, ...months.map((m) => Math.max(m.received, m.revenue)));
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (H + 22));
  const add = (tag, attrs, text) => {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text !== undefined) node.textContent = text;
    svg.append(node);
    return node;
  };
  for (const f of [0, 0.5, 1]) {
    const y = H - f * (H - 10);
    add('line', { x1: pad, x2: W, y1: y, y2: y, stroke: '#eee' });
    add('text', { x: 0, y: y + 4, 'font-size': 10, fill: '#999' }, Math.round(f * max).toLocaleString('ru-RU'));
  }
  const slot = (W - pad) / months.length, bw = slot / 4;
  months.forEach((m, i) => {
    const x = pad + i * slot + slot / 2 - bw;
    [['received', '#f94400'], ['revenue', '#ffc4a8']].forEach(([k, color], j) => {
      const h = (m[k] / max) * (H - 10);
      const r = add('rect', { x: x + j * bw, y: H - h, width: bw - 2, height: Math.max(h, 0), rx: 2, fill: color });
      const t = document.createElementNS(NS, 'title');
      t.textContent = m.label + ': получено ' + m.received.toLocaleString('ru-RU') + ' грн, выручка ' + m.revenue.toLocaleString('ru-RU') + ' грн';
      r.append(t);
    });
    add('text', { x: pad + i * slot + slot / 2, y: H + 16, 'font-size': 11, fill: '#777', 'text-anchor': 'middle' }, m.label);
  });
  $('finChart').replaceChildren(svg);
}
$('finPeriod').addEventListener('change', () => loadFinance().catch((err) => alert(err.message)));

// ---------- картка клієнта ----------
const TAG_PRESETS = ['постоянный', 'корпоратив', 'vip', 'опт', 'сложный'];

async function loadClientDetail(id) {
  $('clientsListBox').classList.add('hidden');
  const box = $('clientDetail');
  box.classList.remove('hidden');
  box.replaceChildren(el('p', { class: 'loading' }, 'Загрузка…'));
  try { renderClientDetail(await api('/api/clients/' + id)); }
  catch (err) { box.replaceChildren(el('p', { class: 'error' }, err.message), el('a', { href: '#clients' }, '← ко всем клиентам')); }
}

function renderClientDetail(c) {
  const box = $('clientDetail');
  let tags = c.tags.slice();
  const tagBox = el('div', { class: 'tag-input' });
  const input = el('input', { placeholder: 'новая метка', maxlength: 24, list: 'tagList' });
  const datalist = el('datalist', { id: 'tagList' }, [...new Set([...TAG_PRESETS, ...c.allTags])].map((t) => el('option', { value: t })));
  const note = el('textarea', { rows: 4, maxlength: 3000, placeholder: 'Заметка о клиенте: предпочтения, договорённости, контакты коллег…' }, c.note);
  const ok = el('p', { class: 'ok' });
  const drawTags = () => tagBox.replaceChildren(
    ...tags.map((t) => el('span', { class: 'tag ctag' }, t, el('button', { type: 'button', title: 'Убрать', onclick: () => { tags = tags.filter((x) => x !== t); drawTags(); } }, '✕'))),
    input, action('+ Добавить', async () => { const v = input.value.trim().toLowerCase(); if (v && !tags.includes(v)) tags.push(v); input.value = ''; drawTags(); }, 'small ghost'),
    ...TAG_PRESETS.filter((t) => !tags.includes(t)).map((t) => el('button', { type: 'button', class: 'chip', onclick: () => { tags.push(t); drawTags(); } }, '+ ' + t)));
  drawTags();
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = input.value.trim().toLowerCase(); if (v && !tags.includes(v)) tags.push(v); input.value = ''; drawTags(); } });
  const s = c.stats;
  const kpi = (value, label) => el('div', { class: 'stat' }, el('b', {}, value), el('span', {}, label));
  fill(box,
    el('p', {}, el('a', { href: '#clients' }, '← ко всем клиентам')),
    el('div', { class: 'detail-head' }, el('h1', {}, c.name), c.lang === 'en' ? el('span', {}, '🇬🇧') : null,
      c.username ? el('a', { href: 'https://t.me/' + c.username, target: '_blank', rel: 'noopener noreferrer' }, '@' + c.username) : el('span', { class: 'muted' }, 'ID ' + c.id),
      c.blocked ? el('span', { class: 'status rejected' }, 'заблокировал бота') : null,
      c.studioBlocked ? el('span', { class: 'status rejected' }, '🚫 заблокирован вами') : null),
    el('div', { class: 'stats' }, kpi(String(s.orders), 'Заявок'), kpi(String(s.done), 'Готово'), kpi(money(s.amount), 'Сумма заказов'), kpi(money(s.paid), 'Оплачено'), kpi(s.rating ? '⭐ ' + s.rating : '—', 'Оценка')),
    el('div', { class: 'grid2' },
      el('section', { class: 'card' },
        el('h2', {}, 'Метки и заметка'),
        datalist, tagBox, el('label', {}, 'Заметка (видите только вы)', note),
        el('div', { class: 'actions' }, action('Сохранить', async () => {
          const r = await api('/api/clients/' + c.id, { tags, note: note.value });
          renderClientDetail(r);
          $('clientDetail').querySelector('.ok').textContent = 'Сохранено';
        })), ok),
      el('section', { class: 'card' },
        el('h2', {}, 'О клиенте'),
        el('dl', { class: 'kv' },
          el('dt', {}, 'Telegram ID'), el('dd', {}, String(c.id)),
          el('dt', {}, 'Пришёл по ссылке'), el('dd', {}, c.source || 'напрямую'),
          el('dt', {}, 'Первый визит'), el('dd', {}, fmt(c.firstSeenAt)),
          el('dt', {}, 'Последний визит'), el('dd', {}, fmt(c.lastSeenAt) + ' (' + ago(c.lastSeenAt) + ')'),
          el('dt', {}, 'Язык'), el('dd', {}, c.lang === 'en' ? 'английский' : 'украинский'),
          el('dt', {}, 'Пригласил его'), el('dd', {}, c.referredBy || '—'),
          el('dt', {}, 'Привёл друзей'), el('dd', {}, String(c.invited) + (c.bonuses ? ' · бонусов: ' + c.bonuses : '')),
          el('dt', {}, 'Рассылки'), el('dd', {}, c.unsubscribed ? 'отписан' : 'получает')))),
    el('section', { class: 'card flush' }, ordersTable(c.orders, false)),
    el('section', { class: 'card' },
      el('h2', {}, c.studioBlocked ? '🚫 Клиент заблокирован' : 'Блокировка'),
      el('p', { class: 'muted' }, c.studioBlocked
        ? 'Бот не принимает от него заявки и сообщения, вам ничего от него не приходит.'
        : 'Для спамеров и троллей: бот перестанет принимать от этого человека заявки и сообщения, вам перестанут приходить уведомления от него. Его прошлые заявки сохранятся.'),
      action(c.studioBlocked ? 'Разблокировать' : '🚫 Заблокировать', async () => {
        if (!confirm(c.studioBlocked ? 'Разблокировать клиента?' : 'Заблокировать клиента ' + c.name + '?')) return;
        renderClientDetail(await api('/api/clients/' + c.id, { block: !c.studioBlocked }));
      }, c.studioBlocked ? 'small ghost' : 'small ghost danger')),
    c.reviews.length ? el('section', { class: 'card' }, el('h2', {}, 'Отзывы'), c.reviews.map((r) => el('p', {}, '⭐'.repeat(r.rating) + ' ', el('a', { href: '#orders/' + r.orderId }, no(r.orderId)), r.comment ? ' — «' + r.comment + '»' : ''))) : null,
  );
  window.scrollTo(0, 0);
}

// ---------- налаштування: зведення, відпустка, команда, копії ----------
async function loadSettings2() {
  const [dg, vac, tm, bk] = await Promise.all([api('/api/digest'), api('/api/vacation'), api('/api/team'), api('/api/backups')]);
  renderDigest(dg); renderVacation(vac); renderTeam(tm); renderBackups(bk);
  $('assignForm').mode.value = (await api('/api/auto-assign')).mode;
  renderTgBackup(await api('/api/tg-backup'));
  renderSla(await api('/api/reply-alert'));
  renderAuditFeed(await api('/api/audit'));
}

const VIA_ICON = { page: '🖥', app: '📱', other: '✈️' };
function renderAuditFeed(r) {
  $('auditFeed').replaceChildren(r.entries.length ? el('div', { class: 'audit-list' }, r.entries.map((e) => el('div', { class: 'audit-row' },
    el('small', { class: 'small-muted' }, fmt(e.at) + ' · ', el('a', { href: '#orders/' + e.orderId }, no(e.orderId)), ' · ' + e.client),
    el('div', {}, VIA_ICON[e.via] + ' ', el('b', {}, e.who || e.viaLabel), e.who ? el('span', { class: 'small-muted' }, ' (' + e.viaLabel + ')') : null, ': ' + e.changes.join('; '))))) : el('p', { class: 'muted' }, 'Записей пока нет — они появятся при первых изменениях заявок.'));
}

function renderSla(s) {
  const f = $('slaForm');
  f.enabled.checked = s.enabled; f.hours.value = s.hours; f.escalateHours.value = s.escalateHours; f.showTime.checked = s.showTime;
  const m = s.stats.median;
  $('slaStats').textContent = s.stats.samples
    ? 'За 30 дней: ответов ' + s.stats.samples + ', обычно (медиана) — ' + (m < 60 ? m + ' мин' : Math.round(m / 6) / 10 + ' ч') + '.' + (s.stats.samples < 5 ? ' Клиентам время покажется, когда ответов будет хотя бы 5.' : '')
    : 'Статистики ответов за 30 дней пока нет.';
}
bindForm('slaForm', async (data, form) => {
  renderSla(await api('/api/reply-alert', { enabled: form.enabled.checked, hours: Number(data.hours), escalateHours: Number(data.escalateHours), showTime: form.showTime.checked }));
  $('slaOk').textContent = 'Сохранено.';
}, 'slaError', 'slaOk');

function renderTgBackup(b) {
  const f = $('tgBackupForm');
  f.enabled.checked = b.enabled;
  f.every.value = b.every;
  $('tgBackupInfo').textContent = b.lastAt
    ? 'Последняя копия отправлена ' + fmt(b.lastAt) + (b.lastSize ? ' (' + Math.max(1, Math.round(b.lastSize / 1024)) + ' КБ)' : '') + '.'
    : 'Копий в Telegram ещё не было.';
  $('tgBackupError').textContent = b.lastError || '';
}
bindForm('tgBackupForm', async (data, form) => {
  renderTgBackup(await api('/api/tg-backup', { enabled: form.enabled.checked, every: data.every }));
  $('tgBackupOk').textContent = 'Сохранено.';
}, 'tgBackupError', 'tgBackupOk');
$('tgBackupSend').addEventListener('click', async () => {
  $('tgBackupError').textContent = ''; $('tgBackupOk').textContent = '';
  const btn = $('tgBackupSend');
  btn.disabled = true;
  try {
    renderTgBackup(await api('/api/tg-backup/send', {}));
    $('tgBackupOk').textContent = 'Копия отправлена — проверьте Telegram.';
  } catch (err) { $('tgBackupError').textContent = err.message; }
  btn.disabled = false;
});

function renderDigest(d) {
  const f = $('digestForm');
  f.enabled.checked = d.digest.enabled;
  f.hour.value = String(d.digest.hour);
  f.alerts.checked = d.alerts.enabled !== false;
  f.weekly.checked = d.digest.weekly !== false;
  $('digestInfo').textContent = (d.sentFor ? 'Последняя сводка: ' + dmy(d.sentFor) + '. ' : '') + (d.lastOutage ? 'Последний обрыв связи с Telegram: ' + fmt(d.lastOutage.from) + ' (' + d.lastOutage.minutes + ' мин).' : '');
}
bindForm('digestForm', async (data, form) => {
  renderDigest(await api('/api/digest', { enabled: form.enabled.checked, hour: Number(data.hour), alerts: form.alerts.checked, weekly: form.weekly.checked }));
  $('digestOk').textContent = 'Сохранено.';
}, 'digestError', 'digestOk');
$('weeklySend').addEventListener('click', async () => {
  $('digestError').textContent = ''; $('digestOk').textContent = '';
  try {
    const r = await api('/api/digest/weekly', {});
    $('digestOk').textContent = 'Недельный отчёт отправлен вам в Telegram.';
    $('digestPreview').classList.remove('hidden');
    $('digestPreview').textContent = r.preview.replace(/<[^>]+>/g, '');
  } catch (err) { $('digestError').textContent = err.message; }
});
$('digestSend').addEventListener('click', async () => {
  $('digestError').textContent = ''; $('digestOk').textContent = '';
  try {
    const r = await api('/api/digest/send', {});
    $('digestOk').textContent = 'Сводка отправлена вам в Telegram.';
    $('digestPreview').classList.remove('hidden');
    $('digestPreview').textContent = r.preview.replace(/<[^>]+>/g, '');
  } catch (err) { $('digestError').textContent = err.message; }
});

function renderVacation(v) {
  const f = $('vacForm');
  f.enabled.checked = v.enabled;
  f.until.value = v.until || '';
  f.acceptOrders.checked = v.acceptOrders !== false;
  f.message.value = v.message || '';
  const pill = $('vacState');
  pill.textContent = v.active ? '● включён' : '● выключен';
  pill.className = 'pill ' + (v.active ? 'warn' : '');
}
bindForm('vacForm', async (data, form) => {
  renderVacation(await api('/api/vacation', { enabled: form.enabled.checked, until: data.until, acceptOrders: form.acceptOrders.checked, message: data.message }));
  $('vacOk').textContent = 'Сохранено.';
  refreshBadges();
}, 'vacError', 'vacOk');

function renderTeam(t) {
  $('teamList').replaceChildren(...(t.members.length ? t.members.map((m) => {
    const pass = el('input', { type: 'password', placeholder: 'новый пароль', minlength: 8, autocomplete: 'new-password' });
    const tid = el('input', { value: m.telegramId || '', placeholder: 'Telegram ID', inputmode: 'numeric' });
    const SV = [['stickers', 'стикеры'], ['bots', 'боты'], ['characters', 'персонажи']];
    const boxes = SV.map(([k]) => el('input', { type: 'checkbox', checked: (m.services || []).includes(k) }));
    const save = (extra) => api('/api/team', { id: m.id, name: m.name, login: m.login, telegramId: tid.value, active: m.active, password: pass.value, services: SV.filter((x, i) => boxes[i].checked).map((x) => x[0]), ...extra }).then(renderTeam);
    return el('div', { class: 'member' },
      el('div', { class: 'grow' }, el('b', {}, m.name), m.active ? null : el('span', { class: 'status rejected' }, 'отключён'), el('br'),
        el('small', { class: 'small-muted' }, 'логин: ' + m.login + ' · в работе: ' + m.open + ' · готово: ' + m.done),
        el('div', { class: 'member-svc' }, SV.map(([k, label], i) => el('label', { class: 'check' }, boxes[i], ' ' + label)))),
      tid, pass,
      action('Сохранить', () => save({}), 'small'),
      action(m.active ? 'Отключить' : 'Включить', () => save({ active: !m.active }), 'small ghost'),
      action('Удалить', async () => { if (confirm('Удалить дизайнера ' + m.name + '? Его заявки останутся без дизайнера.')) renderTeam(await api('/api/team', { id: m.id, delete: true })); }, 'small ghost danger'));
  }) : [el('p', { class: 'muted' }, 'В команде пока только вы.')]));
}
bindForm('assignForm', async (data) => {
  await api('/api/auto-assign', { mode: data.mode });
  $('assignOk').textContent = 'Сохранено.';
}, 'assignError', 'assignOk');
bindForm('teamForm', async (data, form) => {
  renderTeam(await api('/api/team', data));
  form.reset();
  $('teamOk').textContent = 'Дизайнер добавлен. Дайте ему адрес этой страницы, логин и пароль.';
}, 'teamError', 'teamOk');

const BK_KIND = { daily: 'ежедневная', manual: 'перед очисткой / восстановлением' };
function renderBackups(b) {
  $('backupList').replaceChildren(...(b.files.length ? b.files.slice(0, 20).map((f) => el('div', { class: 'backup-row' },
    el('a', { href: '/api/backups/download?name=' + encodeURIComponent(f.name) }, '⬇ ' + f.name),
    el('small', { class: 'small-muted' }, (BK_KIND[f.kind] || f.kind) + ' · ' + Math.round(f.size / 1024) + ' КБ · ' + fmt(f.at)))) : [el('p', { class: 'muted' }, 'Копий на сервере пока нет.')]));
}
bindForm('restoreForm', async (data, form) => {
  const file = form.file.files[0];
  if (!file) throw new Error('Выберите файл копии (.json).');
  if (!confirm('Восстановить данные из «' + file.name + '»? Текущие заявки, клиенты и настройки заменятся данными из копии (токен бота, пароль и получатель заявок останутся текущими). Перед восстановлением бот сохранит копию нынешних данных.')) return;
  let parsed;
  try { parsed = JSON.parse(await file.text()); } catch (e) { throw new Error('Файл не читается — нужна копия в формате .json.'); }
  const res = await fetch('/api/backups/restore', {
    method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-yabot': '1' },
    body: JSON.stringify({ password: data.password, data: parsed }),
  });
  const r = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(r.error || ('Ошибка ' + res.status));
  form.reset();
  $('restoreOk').textContent = 'Готово: заявок ' + r.orders + ', клиентов ' + r.clients + '. Прежние данные сохранены в ' + r.backup + '.';
  renderBackups(await api('/api/backups'));
  refreshBadges();
}, 'restoreError', 'restoreOk');

// ---------- промокоди ----------
async function loadPromos() { renderPromos(await api('/api/promos')); }

function renderPromos(p) {
  $('promoList').replaceChildren(p.promos.length ? el('div', { class: 'table-wrap' }, el('table', {},
    el('thead', {}, el('tr', {}, ['Код', 'Скидка', 'До', 'Использовано', 'Заявок', 'Ссылка', ''].map((h) => el('th', {}, h)))),
    el('tbody', {}, p.promos.map((x) => {
      const expired = x.until && x.until < new Date().toISOString().slice(0, 10);
      const link = p.bot ? 'https://t.me/' + p.bot + '?start=promo_' + x.code : '';
      return el('tr', {},
        el('td', {}, el('b', {}, x.code), x.note ? el('div', { class: 'small-muted' }, x.note) : null),
        el('td', {}, x.percent + '%'),
        el('td', {}, x.until ? dmy(x.until) + (expired ? ' (истёк)' : '') : 'бессрочно'),
        el('td', {}, (x.uses || 0) + (x.maxUses ? ' / ' + x.maxUses : '')),
        el('td', {}, String(p.orders[x.code] || 0)),
        el('td', {}, link ? action('Копировать', async () => { await navigator.clipboard.writeText(link); }, 'small ghost') : '—'),
        el('td', {}, el('div', { class: 'actions' },
          action(x.active ? 'Выключить' : 'Включить', async () => renderPromos(await api('/api/promos', { ...x, active: !x.active })), 'small ghost'),
          action('Удалить', async () => { if (confirm('Удалить промокод ' + x.code + '?')) renderPromos(await api('/api/promos', { code: x.code, delete: true })); }, 'small ghost danger'))));
    })))) : el('p', { class: 'muted' }, 'Промокодов пока нет.'));
}
bindForm('promoForm', async (data, form) => {
  renderPromos(await api('/api/promos', { code: data.code, percent: Number(data.percent), until: data.until, maxUses: data.maxUses ? Number(data.maxUses) : null, note: data.note, active: true }));
  form.reset();
}, 'promoError');

// ---------- редагування опублікованого поста ----------
function startEditPost(p) {
  if (!composerEmpty() && !confirm('Заменить текущий черновик текстом поста для редактирования?')) return;
  ch.editing = { id: p.id, chatTitle: p.chatTitle, files: p.edit.files };
  $('chEditor').replaceChildren(fromTgHtml(p.edit.html || ''));
  ch.buttons = [];
  for (const row of p.edit.buttons || []) row.forEach((b, i) => ch.buttons.push({ text: b.text, url: b.url, sameRow: i > 0 }));
  ch.files.forEach((f) => URL.revokeObjectURL(f.url));
  ch.files = [];
  $('chSig').checked = p.edit.signature !== false;
  $('chNoPreview').checked = Boolean(p.edit.noPreview);
  $('chEditBanner').classList.remove('hidden');
  $('chDrop').classList.add('hidden');
  $('chEditText').textContent = 'Редактирование поста от ' + fmt(p.sentAt) + ' в «' + p.chatTitle + '». Можно изменить текст, кнопки и подпись' + (p.edit.files ? ' — медиа (' + p.edit.files + ') останутся прежними' : '') + '.';
  for (const id of ['chTest', 'chPublish', 'chSchedule', 'chTarget']) $(id).disabled = true;
  renderThumbs(); renderButtons(); renderChPreview();
  $('chEditBanner').scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function stopEditPost() {
  ch.editing = null;
  $('chEditBanner').classList.add('hidden');
  $('chDrop').classList.remove('hidden');
  for (const id of ['chTest', 'chPublish', 'chSchedule', 'chTarget']) $(id).disabled = false;
  resetComposer();
}
$('chEditCancel').addEventListener('click', stopEditPost);
$('chEditSave').addEventListener('click', async () => {
  $('chError').textContent = ''; $('chOk').textContent = '';
  try {
    const body = postBody({});
    const r = await api('/api/channel/edit', { id: ch.editing.id, html: body.html, buttons: body.buttons, signature: body.signature, noPreview: body.noPreview });
    stopEditPost();
    renderChannel(r);
    $('chOk').textContent = 'Пост изменён в Telegram.';
  } catch (err) { $('chError').textContent = err.message; }
});
`;
