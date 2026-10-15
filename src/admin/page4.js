// Сторінка бота, частина 4 (v2.15): розділи налаштувань і пошук, підказки «?», майстер запуску,
// архів заявок, відкладені повідомлення клієнту. Додається в кінець app.js.

export const PAGE4_CSS = String.raw`
.plan-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:8px; margin:8px 0; }
.plan-grid label { font-size:13px; }
.plan-sum.bad { color:#c62828; }
.funnel { display: grid; gap: 6px; margin: 6px 0; }
.funnel-row { display: grid; grid-template-columns: 150px 1fr 48px 120px; gap: 8px; align-items: center; font-size: 14px; }
.funnel-bar { height: 10px; background: #f0f0f2; border-radius: 6px; overflow: hidden; }
.funnel-bar i { display: block; height: 100%; background: #ff6500; border-radius: 6px; }
@media (max-width: 560px) { .funnel-row { grid-template-columns: 110px 1fr 40px; } .funnel-row small { display: none; } }
.svc-block { border-top: 1px solid var(--line, #e5e5e5); padding-top: 12px; margin-top: 12px; }
.svc-block:first-child { border-top: 0; margin-top: 0; padding-top: 0; }
.svc-more summary { cursor: pointer; font-weight: 600; margin: 6px 0; }
.svc-examples { display: grid; gap: 8px; margin: 8px 0; }
.faq-item { border-top: 1px solid var(--line, #e5e5e5); padding-top: 14px; margin-top: 14px; }
.faq-item:first-child { border-top: 0; margin-top: 0; padding-top: 0; }
.subnav { display:flex; gap:6px; flex-wrap:wrap; margin:0 0 12px; }
.subnav button { margin:0; padding:8px 14px; font-size:14px; background:#fff; color:var(--ink); border:1px solid #ddd; border-radius:20px; }
.subnav button.active { background:var(--ink); color:#fff; border-color:var(--ink); }
.settings-search { margin:0 0 14px; }
.view[data-view=settings] .grid2 { display:block; }
.view[data-view=settings] .card.filtered { display:none; }
.help-btn { margin:0 0 0 8px; padding:0 9px; height:24px; min-width:24px; border-radius:12px; font-size:13px; background:#eee; color:var(--ink); vertical-align:middle; }
.help-btn.on { background:var(--accent); color:#fff; }
.help-text.collapsed { display:none; }
.wizard .progress { width:100%; }
.wizard .step { display:flex; gap:10px; align-items:center; padding:6px 0; border-top:1px solid var(--line); font-size:14px; }
.wizard .step:first-of-type { border-top:0; }
.wizard .step.done { color:var(--muted); }
.wizard .step .mark { width:22px; text-align:center; }
.wizard .step a { margin-left:auto; font-size:13px; }
.archive-banner { background:#f0f0f0; border-radius:12px; padding:10px 14px; margin:0 0 12px; }
.sched { display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; font-size:13px; border-top:1px dashed var(--line); padding:6px 0; }
.sched-form { display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-top:8px; }
.sched-form input { width:auto; margin:0; }
`;

export const PAGE4_JS = String.raw`
// ---------- розділи налаштувань ----------
const SETTINGS_GROUPS = [
  ['main', 'Основное', ['Приём заказов', 'Получатель заявок', 'Рабочие часы', 'Режим отпуска', 'Английская версия']],
  ['clients', 'Клиенты и продажи', ['Приветствие и описание', 'Услуги Mini App', 'Mini App', 'Быстрые ответы', 'Частые вопросы', 'ИИ-агент студии', 'Реферальная', 'Возврат клиентов', 'Правка после сдачи', 'Промокод за отзыв', 'Поддержка после запуска', 'Подарочные']],
  ['money', 'Оплата и документы', ['Оплата:', 'Реквизиты']],
  ['team', 'Команда и работа', ['Команда', 'Этапы работы', 'Утренняя сводка', 'Ответы клиентам', 'Журнал действий', 'ИИ-помощник']],
  ['data', 'Данные и безопасность', ['Вход с кодом', 'Резервные копии', 'Архив', 'Состояние бота', 'Сменить пароль', 'Ошибки', 'Опасная зона']],
];
function settingsCards() {
  return [...document.querySelectorAll('[data-view=settings] section.card')];
}
function cardGroup(card) {
  const title = (card.querySelector('h2') || {}).textContent || '';
  const g = SETTINGS_GROUPS.find(([, , keys]) => keys.some((k) => title.includes(k)));
  return g ? g[0] : 'main';
}
function applySettingsGroup() {
  const group = SETTINGS_GROUPS.some(([k]) => k === state.settingsGroup) ? state.settingsGroup : 'main';
  const q = ($('settingsSearch').value || '').trim().toLowerCase();
  $('settingsNav').replaceChildren(...SETTINGS_GROUPS.map(([key, label]) => el('button', {
    type: 'button', class: !q && key === group ? 'active' : '',
    onclick: () => { $('settingsSearch').value = ''; location.hash = 'settings/' + key; },
  }, label)));
  for (const card of settingsCards()) {
    const show = q ? card.textContent.toLowerCase().includes(q) : cardGroup(card) === group;
    card.classList.toggle('filtered', !show);
  }
}
$('settingsSearch').addEventListener('input', applySettingsGroup);

// ---------- підказки «?» ----------
let helpOpen = false;
try { helpOpen = localStorage.getItem('yabot.help') === '1'; } catch (e) { /* без сховища */ }
function initHelp(root) {
  for (const card of (root || document).querySelectorAll('section.card')) {
    const h2 = card.querySelector('h2');
    const p = h2 && [...card.children].find((c) => c.matches && c.matches('p.muted'));
    if (!p || p.dataset.help || p.textContent.length < 120) continue;
    p.dataset.help = '1';
    p.classList.add('help-text');
    p.classList.toggle('collapsed', !helpOpen);
    const btn = el('button', { type: 'button', class: 'help-btn' + (helpOpen ? ' on' : ''), title: 'Как это работает' }, '?');
    btn.addEventListener('click', () => { p.classList.toggle('collapsed'); btn.classList.toggle('on', !p.classList.contains('collapsed')); });
    h2.append(btn);
  }
}
initHelp();

// ---------- майстер запуску ----------
async function renderWizard() {
  const box = $('wizard');
  let s;
  try { s = await api('/api/setup-status'); } catch (e) { return; }
  const left = s.steps.filter((x) => !x.optional && !x.done).length;
  if (s.hidden || !left) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  fill(box,
    el('div', { class: 'card-head' }, el('h2', {}, '🚀 Подготовка к запуску · ' + s.done + '/' + s.total),
      action('Скрыть', async () => { await api('/api/setup-status', { hidden: true }); box.classList.add('hidden'); }, 'small ghost')),
    el('div', { class: 'progress' }, el('i', { style: 'width:' + Math.round((s.done / s.total) * 100) + '%' })),
    s.steps.map((x) => el('div', { class: 'step' + (x.done ? ' done' : '') },
      el('span', { class: 'mark' }, x.done ? '✅' : x.optional ? '◻️' : '⬜'), el('span', {}, x.title),
      x.done ? null : el('a', { href: x.href }, 'Настроить →'))));
}

// ---------- архів ----------
async function loadArchiveCard() {
  const a = await api('/api/archive');
  const f = $('archiveForm');
  f.enabled.checked = a.settings.enabled !== false;
  f.days.value = String(a.settings.days);
  const kb = (n) => Math.round(n / 1024).toLocaleString('ru-RU') + ' КБ';
  $('archiveInfo').textContent = 'В архиве заявок: ' + a.archived + (a.archiveSize ? ' (файл архива ' + kb(a.archiveSize) + ')' : '') +
    '. Рабочий файл данных: ' + kb(a.dataSize) + '.' + (a.lastAt ? ' Последний перенос: ' + fmt(a.lastAt) + '.' : '');
}
bindForm('archiveForm', async (data, form) => {
  const r = await api('/api/archive', { enabled: form.enabled.checked, days: Number(data.days) });
  $('archiveOk').textContent = 'Сохранено.';
  void r; await loadArchiveCard();
}, 'archiveError', 'archiveOk');
$('archiveNow').addEventListener('click', async () => {
  $('archiveError').textContent = ''; $('archiveOk').textContent = '';
  const f = $('archiveForm');
  if (!confirm('Перенести в архив закрытые заявки старше ' + f.days.value + ' дней?')) return;
  try {
    const r = await api('/api/archive', { enabled: f.enabled.checked, days: Number(f.days.value), now: true });
    $('archiveOk').textContent = r.moved ? 'Перенесено в архив: ' + r.moved + '.' : 'Подходящих заявок нет.';
    await loadArchiveCard();
  } catch (err) { $('archiveError').textContent = err.message; }
});

// ---------- відкладені повідомлення ----------
function scheduleBlock(o, msgText) {
  if (o.archived) return null;
  const at = el('input', { type: 'datetime-local' });
  const preset = (days) => el('button', { type: 'button', class: 'chip', onclick: () => {
    const d = new Date(Date.now() + days * 864e5); d.setHours(11, 0, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    at.value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T11:00';
  } }, days === 1 ? 'завтра 11:00' : 'через ' + days + ' дн.');
  const err = el('p', { class: 'error' });
  return el('div', {},
    (o.scheduledList || []).map((x) => el('div', { class: 'sched' }, el('b', {}, '⏰ ' + fmt(x.at)), el('span', {}, x.text.length > 80 ? x.text.slice(0, 80) + '…' : x.text),
      action('Отменить', async () => renderOrderDetail((await api('/api/orders/' + o.id + '/unschedule', { id: x.id })).order), 'small ghost danger'))),
    el('div', { class: 'sched-form' }, el('small', { class: 'muted' }, 'Отправить текст выше позже:'), at, preset(1), preset(3), preset(7),
      action('⏰ Запланировать', async () => {
        err.textContent = '';
        if (!msgText.value.trim()) { err.textContent = 'Напишите текст в поле выше.'; return; }
        if (!at.value) { err.textContent = 'Выберите дату и время.'; return; }
        try { renderOrderDetail((await api('/api/orders/' + o.id + '/schedule', { text: msgText.value, at: new Date(at.value).toISOString() })).order); }
        catch (e) { err.textContent = e.message; }
      }, 'small ghost')),
    err);
}
// ---------- часті питання ----------
let faqItems = [];
function faqRow(f, i) {
  const input = (key, label, max, area) => el('label', {}, label, el(area ? 'textarea' : 'input', {
    maxlength: String(max), ...(area ? { rows: '3' } : {}), value: f[key] || '',
    oninput: (e) => { faqItems[i][key] = e.target.value; },
  }));
  const node = el('div', { class: 'faq-item' },
    el('div', { class: 'grid2' }, input('q', 'Вопрос', 120), input('qEn', 'Вопрос (англ.)', 120)),
    el('div', { class: 'grid2' }, input('a', 'Ответ', 1500, true), input('aEn', 'Ответ (англ.)', 1500, true)),
    input('keywords', 'Ключевые слова через пробел (как люди спрашивают: «ціна скільки коштує»)', 200),
    el('div', { class: 'actions' },
      el('span', { class: 'muted' }, 'Показан: ' + ((faqStatsCache.views || {})[f.id] || 0)),
      i > 0 ? el('button', { type: 'button', class: 'small ghost', onclick: () => { if (i > 0) { faqItems.splice(i - 1, 0, faqItems.splice(i, 1)[0]); drawFaq(); } } }, '↑') : null,
      el('button', { type: 'button', class: 'small ghost danger', onclick: () => { faqItems.splice(i, 1); drawFaq(); } }, 'Удалить')));
  // textarea не бере value з атрибута — ставимо явно
  node.querySelectorAll('textarea').forEach((t, k) => { t.value = (k === 0 ? f.a : f.aEn) || ''; });
  return node;
}
let faqStatsCache = {};
function drawFaq() {
  $('faqList').replaceChildren(...faqItems.map(faqRow));
  $('faqAdd').disabled = faqItems.length >= 20;
}
function renderFaq(r) {
  faqItems = r.faq.map((f) => ({ ...f }));
  faqStatsCache = r.stats || {};
  drawFaq();
  $('faqStats').textContent = 'Бот ответил сам: ' + (faqStatsCache.matched || 0) + ', переслал вам вопросов: ' + (faqStatsCache.forwarded || 0) + '.';
}
$('faqAdd').onclick = () => { faqItems.push({ q: '', a: '', qEn: '', aEn: '', keywords: '' }); drawFaq(); };
$('faqSave').onclick = async () => {
  $('faqError').textContent = ''; $('faqOk').textContent = '';
  if (faqItems.some((f) => !f.q.trim() !== !f.a.trim())) { $('faqError').textContent = 'У каждого вопроса должен быть ответ.'; return; }
  try {
    renderFaq(await api('/api/faq', { faq: faqItems }));
    $('faqOk').textContent = 'Сохранено.';
  } catch (err) { $('faqError').textContent = err.message; }
};
// ---------- Mini App ----------
function renderMini(m) {
  const fu = m.funnel || {};
  const steps = [['open', 'Открыли Mini App'], ['s1', 'Начали заявку'], ['s2', 'Шаг «Детали»'], ['s3', 'Шаг «Референсы»'], ['s4', 'Шаг «Проверка»'], ['sent', 'Отправили заявку']];
  const top = fu.open || 0;
  $('miniFunnel').replaceChildren(...steps.map(([k, label], i) => {
    const n = fu[k] || 0;
    const prev = i ? fu[steps[i - 1][0]] || 0 : 0;
    const pct = top ? Math.round((n / top) * 100) : 0;
    return el('div', { class: 'funnel-row' },
      el('span', { class: 'funnel-label' }, label),
      el('span', { class: 'funnel-bar' }, el('i', { style: 'width:' + Math.max(2, pct) + '%' })),
      el('b', {}, String(n)),
      el('small', { class: 'muted' }, i && prev ? Math.round((n / prev) * 100) + '% от прошлого' : ''));
  }));
  const f = $('miniForm');
  renderBanner(m.banner);
  const src = m.sources || [];
  $('miniSources').replaceChildren(src.length ? el('div', { class: 'table-wrap' }, el('table', {},
    el('thead', {}, el('tr', {}, ['Источник', 'Открыли', 'Отправили заявку', 'Конверсия', 'Заявок', 'Выручка готовых'].map((h) => el('th', {}, h)))),
    el('tbody', {}, src.map((r) => el('tr', {},
      el('td', {}, r.source ? el('span', { class: 'tag' }, r.source) : 'без метки'),
      el('td', {}, String(r.open)), el('td', {}, String(r.sent)),
      el('td', {}, r.open ? Math.round((r.sent / r.open) * 100) + '%' : '—'),
      el('td', {}, String(r.orders)), el('td', {}, r.revenue ? r.revenue.toLocaleString('ru-RU') + ' грн' : '—')))))) : el('p', { class: 'muted' }, 'Пока нет данных.'));
  const bot = m.botUsername || 'ваш_бот';
  $('miniSourcesHint').textContent = 'Источник — метка из ссылки, по которой человек впервые пришёл: t.me/' + bot + '?start=insta (в чат бота) или t.me/' + bot + '?startapp=insta (сразу в Mini App, если в @BotFather настроено Main Mini App). Метка — латиница, цифры, _ и -. Те же метки видны во вкладке «Источники».';
  if (m.queue) renderQueue(m.queue);
  f.enabled.checked = m.enabled; f.url.value = m.url || ''; f.menuText.value = m.menuText || 'YABOT'; f.port.value = m.portSet || ''; f.port.placeholder = String(m.port); f.support.value = m.support || '';
  $('miniStatus').textContent = (m.running
    ? 'Работает на порту ' + m.port + ' (адреса: ' + m.addresses.join(', ') + '). Caddy должен вести ' + (m.url || 'адрес') + ' на этот порт.'
    : (m.enabled ? 'Включена, но сервер не запущен — проверьте журнал.' : 'Выключена. Порт будет ' + m.port + '.'))
    + (m.enabled && m.watch ? ' Проверка снаружи (раз в 10 минут): ' + (m.watch.ok ? '✅ открывается' : '❌ не открывается — ' + m.watch.error) + ', ' + fmt(m.watch.at) + '.' : '');
}
function queueText(n) {
  if (!n) return 'Сейчас клиент срок старта не видит.';
  return 'Сейчас клиент увидит: ' + (n.days ? 'почнемо приблизно через ' + n.days + ' дн.' : 'почнемо найближчими днями') + (n.manual ? '' : ' (открытых заявок: ' + n.open + ')') + '.';
}
function toggleQueue() {
  const f = $('queueForm');
  for (const x of document.querySelectorAll('.q-auto')) x.classList.toggle('hidden', f.mode.value !== 'auto');
  for (const x of document.querySelectorAll('.q-manual')) x.classList.toggle('hidden', f.mode.value !== 'manual');
}
function renderQueue(q) {
  const f = $('queueForm');
  f.mode.value = q.mode; f.days.value = q.days; f.parallel.value = q.parallel; f.avgDays.value = q.avgDays;
  $('queueNow').textContent = queueText(q.now);
  toggleQueue();
}
$('queueForm').mode.addEventListener('change', toggleQueue);
bindForm('queueForm', async (data) => {
  renderMini(await api('/api/miniapp/queue', { mode: data.mode, days: Number(data.days), parallel: Number(data.parallel), avgDays: Number(data.avgDays) }));
  $('queueOk').textContent = 'Сохранено.';
}, 'queueError', 'queueOk');
function renderBanner(b) {
  const f = $('bannerForm');
  b = b || {};
  f.enabled.checked = Boolean(b.enabled);
  for (const k of ['title', 'titleEn', 'text', 'textEn', 'promo', 'until']) f[k].value = b[k] || '';
}
bindForm('bannerForm', async (data, form) => {
  const r = await api('/api/miniapp/banner', { enabled: form.enabled.checked, title: data.title, titleEn: data.titleEn, text: data.text, textEn: data.textEn, promo: data.promo, until: data.until });
  renderMini(r);
  $('bannerOk').textContent = r.warning ? '' : 'Сохранено. Клиенты увидят баннер при следующем открытии Mini App.';
  $('bannerError').textContent = r.warning || '';
}, 'bannerError', 'bannerOk');
bindForm('miniForm', async (data, form) => {
  renderMini(await api('/api/miniapp', { enabled: form.enabled.checked, url: data.url, menuText: data.menuText, port: Number(data.port) || 0, support: data.support }));
  $('miniOk').textContent = 'Сохранено. Кнопка в чате бота обновится в течение минуты (перезапустите Telegram, если не видно).';
}, 'miniError', 'miniOk');
// ---------- послуги Mini App ----------
let svcState = [];
const SVC_FIELDS = [
  ['tagline', 'Подзаголовок', 'input'], ['intro', 'Описание (вкладка «Опис»)', 'textarea'],
  ['includes', '«Що входить» — по строке на пункт', 'list'], ['steps', '«Етапи» — по строке на этап', 'list'], ['chips', 'Плашки под картинкой — через запятую', 'chips'],
];
function svcField(s, key, label, kind) {
  const cur = s.texts[key];
  const def = s.defaults[key];
  const val = Array.isArray(cur) ? cur.join(kind === 'chips' ? ', ' : '\n') : cur || '';
  const ph = Array.isArray(def) ? def.join(kind === 'chips' ? ', ' : '\n') : def || '';
  const node = kind === 'input' || kind === 'chips' ? el('input', { value: val, placeholder: ph }) : el('textarea', { rows: kind === 'list' ? '5' : '4', placeholder: ph });
  if (node.tagName === 'TEXTAREA') node.value = val;
  node.addEventListener('input', () => { s.texts[key] = node.value; });
  return el('label', {}, label, node);
}
function svcExamples(s) {
  const file = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', class: 'hidden', multiple: true });
  file.addEventListener('change', async () => {
    for (const f of [...file.files].slice(0, 8 - s.examples.length)) {
      if (f.size > 10 * 1024 * 1024) { alert('Картинка больше 10 МБ: ' + f.name); continue; }
      const res = await fetch('/api/channel/upload', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': f.type || 'application/octet-stream', 'x-filename': encodeURIComponent(f.name), 'x-yabot': '1' }, body: f });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { alert(j.error || 'Не удалось загрузить.'); continue; }
      s.examples.push({ image: j.id, caption: '', captionEn: '' });
    }
    file.value = '';
    drawServices();
  });
  return el('div', {},
    el('h3', {}, 'Примеры работ (' + s.examples.length + '/8)'),
    el('p', { class: 'muted' }, 'Показываются на странице услуги в Mini App, блок «Приклади робіт». У стикерпаков, пока примеров нет, — робот-стикеры YABOT.'),
    el('div', { class: 'svc-examples' }, s.examples.map((e, i) => {
      const cap = el('input', { value: e.caption || '', maxlength: '80', placeholder: 'Подпись (укр.)' });
      cap.addEventListener('input', () => { e.caption = cap.value; });
      const capEn = el('input', { value: e.captionEn || '', maxlength: '80', placeholder: 'English' });
      capEn.addEventListener('input', () => { e.captionEn = capEn.value; });
      return el('div', { class: 'style-item' }, el('img', { src: '/api/channel/upload/' + e.image, alt: '' }),
        el('div', { class: 'grow' }, cap, capEn,
          el('div', { class: 'actions' },
            i > 0 ? action('↑', () => { s.examples.splice(i - 1, 0, s.examples.splice(i, 1)[0]); drawServices(); }, 'small ghost') : null,
            action('Удалить', () => { s.examples.splice(i, 1); drawServices(); }, 'small ghost danger'))));
    })),
    s.examples.length < 8 ? el('button', { type: 'button', class: 'ghost small', onclick: () => file.click() }, '+ Пример') : null, file);
}
function svcPayPlan(s) {
  if (s.id === 'stickers') return null;
  const steps = (s.texts.steps && s.texts.steps.length ? s.texts.steps : s.defaults.steps) || [];
  s.payPlan ||= [];
  const cur = Object.fromEntries(s.payPlan.map((e) => [e.idx, e.percent]));
  const sum = el('b', { class: 'plan-sum' });
  const inputs = steps.map((n, i) => el('input', { type: 'number', min: '0', max: '100', value: cur[i] ? String(cur[i]) : '', placeholder: '—' }));
  const upd = () => {
    s.payPlan = inputs.map((y, j) => ({ idx: j, percent: Number(y.value) || 0 })).filter((e) => e.percent > 0);
    const t = s.payPlan.reduce((a, e) => a + e.percent, 0);
    sum.textContent = t + '%';
    sum.classList.toggle('bad', t !== 100 && t !== 0);
  };
  inputs.forEach((x) => x.addEventListener('input', upd));
  upd();
  const det = el('details', { class: 'svc-more' }, el('summary', {}, 'План оплаты по этапам' + (s.payPlan.length ? ' (' + s.payPlan.map((e) => e.percent + '%').join(' / ') + ')' : '')),
    el('p', { class: 'muted' }, 'Необязательно. Сколько процентов цены клиент платит на каждом этапе (пусто — ничего), всего 100%. В заявке план включается кнопкой «Взять план услуги» (на странице или в студии Mini App), дальше счета выставляются сами при смене этапа.'),
    el('div', { class: 'plan-grid' }, steps.map((n, i) => el('label', {}, (i + 1) + '. ' + n, inputs[i]))),
    el('p', {}, 'Сумма: ', sum));
  if (s.planOpen) det.open = true;
  det.addEventListener('toggle', () => { s.planOpen = det.open; });
  return det;
}
function svcPackages(s) {
  if (s.id === 'stickers') return null;
  s.packages ||= [];
  const list = el('div', { class: 'svc-pkgs' });
  const draw = () => {
    list.replaceChildren(...s.packages.map((p, i) => {
      const inp = (key, ph, type) => {
        const x = el(type === 'area' ? 'textarea' : 'input', type === 'area' ? { rows: 3, placeholder: ph } : { value: p[key] || (type === 'number' ? '' : ''), placeholder: ph, type: type || 'text', min: '0' });
        if (type === 'area') x.value = p[key] || '';
        x.addEventListener('input', () => { p[key] = type === 'number' ? Number(x.value) || 0 : x.value; });
        return x;
      };
      const del = el('button', { type: 'button', class: 'small ghost danger' }, 'Удалить');
      del.addEventListener('click', () => { s.packages.splice(i, 1); draw(); });
      return el('div', { class: 'svc-pkg' },
        el('div', { class: 'grid2' }, el('label', {}, 'Название (укр.)', inp('name', 'Старт')), el('label', {}, 'Название (англ.)', inp('nameEn', 'Start'))),
        el('label', {}, 'Цена «від», грн (0 — без цены)', inp('price', '15000', 'number')),
        el('div', { class: 'grid2' }, el('label', {}, 'Что входит (укр.), по строке', inp('items', 'Бот із меню та заявками\nАдмін-сторінка\nЗапуск', 'area')),
          el('label', {}, 'Что входит (англ.)', inp('itemsEn', '', 'area'))),
        del);
    }));
    if (s.packages.length < 4) {
      const add = el('button', { type: 'button', class: 'small ghost' }, '+ Добавить пакет');
      add.addEventListener('click', () => { s.packages.push({ name: '', nameEn: '', price: 0, items: '', itemsEn: '' }); draw(); });
      list.append(add);
    }
  };
  draw();
  const det = el('details', { class: 'svc-more' }, el('summary', {}, 'Пакеты (' + s.packages.length + ')'),
    el('p', { class: 'muted' }, 'Необязательно. Клиент в заявке выбирает пакет или «Без пакета — обговоримо». Пакет виден в карточке заявки и PDF, состав подставляется в смету. До 4 пакетов.'), list);
  if (s.pkgOpen) det.open = true;
  det.addEventListener('toggle', () => { s.pkgOpen = det.open; });
  return det;
}
function drawServices() {
  $('svcList').replaceChildren(...svcState.map((s) => {
    const active = el('input', { type: 'checkbox', checked: s.active });
    active.addEventListener('change', () => { s.active = active.checked; });
    const price = el('input', { type: 'number', min: '0', value: String(s.priceFrom || 0) });
    price.addEventListener('input', () => { s.priceFrom = Number(price.value) || 0; });
    const det = el('details', { class: 'svc-more' }, el('summary', {}, 'Тексты и примеры работ'),
      el('p', { class: 'muted' }, 'Пустое поле — текст по умолчанию (виден серым).'),
      el('div', { class: 'grid2' }, SVC_FIELDS.flatMap(([k, label, kind]) => [svcField(s, k, label + ' (укр.)', kind), svcField(s, k + 'En', label + ' (англ.)', kind)])),
      svcExamples(s));
    if (s.open) det.open = true;
    det.addEventListener('toggle', () => { s.open = det.open; });
    return el('div', { class: 'svc-block' },
      el('div', { class: 'grid2' }, el('label', { class: 'check' }, active, ' ', el('b', {}, s.name)), el('label', {}, 'Цена «від», грн', price)),
      svcPackages(s), svcPayPlan(s), det);
  }));
}
function renderServices(r) {
  const open = Object.fromEntries(svcState.map((s) => [s.id, s.open]));
  const pkgOpen = Object.fromEntries(svcState.map((s) => [s.id, s.pkgOpen]));
  const planOpen = Object.fromEntries(svcState.map((s) => [s.id, s.planOpen]));
  svcState = r.services.map((s) => ({ ...s, texts: { ...(s.texts || {}) }, examples: (s.examples || []).map((e) => ({ ...e })), packages: (s.packages || []).map((p) => ({ ...p })), payPlan: (s.payPlan || []).map((e) => ({ ...e })), open: open[s.id], pkgOpen: pkgOpen[s.id], planOpen: planOpen[s.id] }));
  drawServices();
}
$('svcSave').onclick = async () => {
  $('svcError').textContent = ''; $('svcOk').textContent = '';
  const services = {};
  for (const s of svcState) services[s.id] = { active: s.active, priceFrom: s.priceFrom, examples: s.examples, texts: s.texts, packages: s.packages || [], payPlan: s.payPlan || [] };
  try { renderServices(await api('/api/services', { services })); $('svcOk').textContent = 'Сохранено.'; } catch (err) { $('svcError').textContent = err.message; }
};
// ---------- привітання й опис бота ----------
function renderWelcome(w) {
  const f = $('welcomeForm');
  f.onStart.checked = w.onStart; f.description.value = w.description || ''; f.descriptionEn.value = w.descriptionEn || '';
  f.short.value = w.short || ''; f.shortEn.value = w.shortEn || '';
  $('welcomeStatus').textContent = w.applied ? 'Описание применено в Telegram: ' + fmt(w.applied) + '.' : 'Описание ещё не применялось в Telegram.';
}
function welcomeBody(apply) {
  const f = $('welcomeForm');
  return { onStart: f.onStart.checked, description: f.description.value, descriptionEn: f.descriptionEn.value, short: f.short.value, shortEn: f.shortEn.value, apply };
}
bindForm('welcomeForm', async () => {
  renderWelcome(await api('/api/welcome', welcomeBody(false)));
  $('welcomeOk').textContent = 'Сохранено.';
}, 'welcomeError', 'welcomeOk');
$('welcomeApply').onclick = async () => {
  $('welcomeError').textContent = ''; $('welcomeOk').textContent = '';
  try {
    renderWelcome(await api('/api/welcome', welcomeBody(true)));
    $('welcomeOk').textContent = 'Применено. Откройте бота заново (в новом чате), чтобы увидеть описание.';
  } catch (err) { $('welcomeError').textContent = err.message; }
};
`;
