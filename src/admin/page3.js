// Сторінка бота, частина 3 (v2.14): пакети й стилі, вітрина в канал, документи, чек-лист,
// сертифікати, повернення клієнтів, реквізити, показники студії, вхід з кодом.
// Скрипт додається в кінець app.js після частин 1 і 2.

export const PAGE3_CSS = String.raw`
.fix-open { border-color:#f59e0b; box-shadow:0 0 0 2px rgba(245,158,11,.25); }
.like-ex { display:block; max-width:160px; max-height:160px; border-radius:10px; margin:4px 0; }
.plan-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:8px; margin:8px 0; }
.plan-grid label { font-size:13px; }
.pkg-item, .style-item { border-top:1px solid var(--line); padding:12px 0; }
.pkg-item:first-child, .style-item:first-child { border-top:0; }
.pkg-head { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.pkg-head input, .pkg-head select { width:auto; margin:0; flex:1; min-width:110px; }
.pkg-head .check { margin:0; }
.pkg-head input[type=checkbox], .style-item input[type=checkbox] { flex:none; min-width:0; width:auto; }
.style-item .check { margin:0; }
.pkg-item textarea { margin-top:6px; font-size:14px; }
.style-item { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
.style-item img, .style-ph { width:84px; height:84px; object-fit:cover; border-radius:10px; background:#eee; display:flex; align-items:center; justify-content:center; font-size:12px; color:var(--muted); }
.style-item .grow { flex:1; min-width:200px; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.style-item .grow input { width:auto; flex:1; margin:0; min-width:120px; }
.checklist label { margin:6px 0; font-weight:400; }
.checklist small { color:var(--muted); margin-left:6px; }
.progress { height:6px; background:#eee; border-radius:4px; overflow:hidden; margin:8px 0 4px; }
.progress i { display:block; height:100%; background:var(--accent); }
.gift-row { display:flex; gap:10px; align-items:baseline; flex-wrap:wrap; border-top:1px solid var(--line); padding:8px 0; font-size:14px; }
.gift-row:first-child { border-top:0; }
.an-table td, .an-table th { padding:6px 10px; }
.code-step { max-width:420px; }
`;

export const PAGE3_JS = String.raw`
// ---------- пакети ----------
let pkgItems = [];
let styleItems = [];
async function loadPackages() {
  const r = await api('/api/packages');
  pkgItems = r.packages.map((p) => ({ ...p }));
  styleItems = r.styles.map((s) => ({ ...s }));
  drawPackages(); drawStyles();
}

function drawPackages() {
  $('pkgList').replaceChildren(...(pkgItems.length ? pkgItems.map((p, i) => {
    const inp = (key, attrs) => {
      const node = el('input', { value: p[key] == null ? '' : p[key], ...attrs });
      node.addEventListener('input', () => { p[key] = attrs.type === 'number' ? Number(node.value) : node.value; });
      return node;
    };
    const type = el('select', {}, el('option', { value: 'any' }, 'любой тип'), el('option', { value: 'static' }, 'статичные'), el('option', { value: 'animated' }, 'анимированные'));
    type.value = p.type || 'any';
    type.addEventListener('change', () => { p.type = type.value; });
    const active = el('input', { type: 'checkbox', checked: p.active });
    active.addEventListener('change', () => { p.active = active.checked; });
    const ta = (key, ph) => {
      const node = el('textarea', { rows: 3, maxlength: 600, placeholder: ph }, p[key] || '');
      node.addEventListener('input', () => { p[key] = node.value; });
      return node;
    };
    return el('div', { class: 'pkg-item' },
      el('div', { class: 'pkg-head' },
        el('label', { class: 'check' }, active, ' показывать'),
        inp('name', { maxlength: 30, placeholder: 'Название' }), inp('nameEn', { maxlength: 30, placeholder: 'English name' }),
        type, inp('qty', { maxlength: 20, placeholder: 'Кол-во, напр. 10' }), inp('price', { type: 'number', min: 0, placeholder: 'Цена, грн' }), inp('days', { type: 'number', min: 0, placeholder: 'Срок, дней' }),
        i ? action('↑', () => { pkgItems.splice(i - 1, 0, pkgItems.splice(i, 1)[0]); drawPackages(); }, 'small ghost') : null,
        action('✕', () => { pkgItems.splice(i, 1); drawPackages(); }, 'small ghost danger')),
      el('div', { class: 'grid2' }, ta('items', 'Что входит — каждый пункт с новой строки (українською)'), ta('itemsEn', 'What is included (English, optional)')));
  }) : [el('p', { class: 'muted' }, 'Пакетов нет.')]));
}
$('pkgAdd').addEventListener('click', () => { pkgItems.push({ name: '', nameEn: '', type: 'any', qty: '', price: 0, items: '', itemsEn: '', active: false }); drawPackages(); });
$('pkgSave').addEventListener('click', async () => {
  $('pkgError').textContent = ''; $('pkgOk').textContent = '';
  try {
    const r = await api('/api/packages', { packages: pkgItems });
    pkgItems = r.packages.map((p) => ({ ...p }));
    drawPackages();
    $('pkgOk').textContent = 'Сохранено.';
  } catch (err) { $('pkgError').textContent = err.message; }
});

// ---------- стилі ----------
function drawStyles() {
  $('styleList').replaceChildren(...(styleItems.length ? styleItems.map((s, i) => {
    const file = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', class: 'hidden' });
    file.addEventListener('change', async () => {
      const f = file.files[0];
      if (!f) return;
      if (f.size > 10 * 1024 * 1024) { alert('Картинка больше 10 МБ.'); return; }
      const res = await fetch('/api/channel/upload', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': f.type || 'application/octet-stream', 'x-filename': encodeURIComponent(f.name), 'x-yabot': '1' }, body: f });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { alert(j.error || 'Не удалось загрузить.'); return; }
      s.image = j.id;
      drawStyles();
    });
    const name = el('input', { value: s.name || '', maxlength: 30, placeholder: 'Название (укр.)' });
    name.addEventListener('input', () => { s.name = name.value; });
    const nameEn = el('input', { value: s.nameEn || '', maxlength: 30, placeholder: 'English' });
    nameEn.addEventListener('input', () => { s.nameEn = nameEn.value; });
    const active = el('input', { type: 'checkbox', checked: s.active });
    active.addEventListener('change', () => { s.active = active.checked; });
    return el('div', { class: 'style-item' },
      s.image ? el('img', { src: '/api/channel/upload/' + s.image, alt: s.name }) : el('div', { class: 'style-ph' }, 'нет картинки'),
      el('div', { class: 'grow' }, el('b', {}, String(i + 1) + '.'), name, nameEn,
        el('label', { class: 'check' }, active, ' показывать'),
        el('button', { type: 'button', class: 'small ghost', onclick: () => file.click() }, s.image ? 'Заменить картинку' : '📎 Загрузить картинку'), file,
        i ? action('↑', () => { styleItems.splice(i - 1, 0, styleItems.splice(i, 1)[0]); drawStyles(); }, 'small ghost') : null,
        action('✕', () => { styleItems.splice(i, 1); drawStyles(); }, 'small ghost danger')));
  }) : [el('p', { class: 'muted' }, 'Стилей нет — шаг «Стиль» в брифе не показывается.')]));
}
$('styleAdd').addEventListener('click', () => { styleItems.push({ name: '', nameEn: '', image: null, active: true }); drawStyles(); });
$('styleSave').addEventListener('click', async () => {
  $('styleError').textContent = ''; $('styleOk').textContent = '';
  try {
    const r = await api('/api/styles', { styles: styleItems });
    styleItems = r.styles.map((s) => ({ ...s }));
    drawStyles();
    $('styleOk').textContent = 'Сохранено.';
  } catch (err) { $('styleError').textContent = err.message; }
});

// ---------- картка заявки: чек-лист, документи, вітрина ----------
const PLAN_ST = { paid: '✅ оплачено', awaiting: '⏳ счёт выставлен', due: '🔔 к оплате', later: 'позже' };
function payPlanSection(o) {
  const ps = o.projectStage;
  if (!ps || state.role === 'designer' || o.archived) return null;
  const open = o.status === 'new' || o.status === 'in_progress';
  if (!open && !o.payPlan) return null;
  const cur = Object.fromEntries((o.payPlan || []).map((e) => [e.idx, e.percent]));
  const inputs = ps.steps.map((n, i) => el('input', { type: 'number', min: 0, max: 100, value: cur[i] || '', placeholder: '—' }));
  const sum = el('b');
  const upd = () => {
    const t = inputs.reduce((s, x) => s + (Number(x.value) || 0), 0);
    sum.textContent = t + '%';
    sum.className = t === 100 || t === 0 ? '' : 'error';
  };
  inputs.forEach((x) => x.addEventListener('input', upd));
  upd();
  const save = async (body) => {
    try {
      const r = await api('/api/orders/' + o.id + '/pay-plan', body);
      if (r.warning) alert(r.warning);
      renderOrderDetail(r.order);
    } catch (err) { alert(err.message); }
  };
  return el('section', { class: 'card' },
    el('h2', {}, '💳 Оплата по этапам'),
    el('p', { class: 'muted' }, 'Сколько процентов цены клиент платит на каждом этапе. Когда вы отмечаете этап с платежом (а прошлые оплачены), бот сам выставляет счёт на эту часть — monobank или реквизиты карты. Ручные отметки оплаты тоже засчитываются. Клиент видит план в Mini App.'),
    o.payPlan ? el('div', { class: 'table-wrap' }, el('table', {},
      el('thead', {}, el('tr', {}, ['Этап', '%', 'Сумма', 'Статус'].map((h) => el('th', {}, h)))),
      el('tbody', {}, o.payPlan.map((p) => el('tr', {}, el('td', {}, p.stage), el('td', {}, p.percent + '%'), el('td', {}, p.amount ? money(p.amount) : '—'), el('td', {}, PLAN_ST[p.status] || p.status)))))) : null,
    open ? [
      el('div', { class: 'plan-grid' }, ps.steps.map((n, i) => el('label', {}, (i + 1) + '. ' + n, inputs[i]))),
      el('p', {}, 'Сумма: ', sum, ' (должно быть 100%)'),
      el('div', { class: 'actions' },
        action(o.payPlan ? 'Сохранить план' : 'Включить план', () => save({ plan: inputs.map((x, i) => ({ idx: i, percent: Number(x.value) || 0 })) }), 'small'),
        o.servicePlan.length ? action('Взять план услуги (' + o.servicePlan.map((e) => e.percent + '%').join(' / ') + ')', () => save({ useDefault: true }), 'small ghost') : null,
        o.payPlan ? action('Убрать план', () => { if (confirm('Убрать план оплаты по этапам?')) save({ plan: [] }); }, 'small ghost danger') : null),
    ] : null);
}

function stageMark(info) {
  if (!info || !info.ask) return '';
  if (!info.answer) return ' · ⏳ ждём клиента';
  return info.answer.ok ? ' · ✅ принят' : ' · ✏️ замечания';
}

function projectStageSection(o) {
  const ps = o.projectStage;
  if (!ps || o.archived || ['rejected', 'cancelled'].includes(o.status)) return null;
  const total = ps.steps.length, work = o.status === 'in_progress';
  let sel = Math.min(ps.idx, total - 1);
  const box = el('section', { class: 'card' });
  const draw = () => {
    const info = ps.info[sel] || {};
    const link = el('input', { value: info.link || '', placeholder: 'https://t.me/test_bot или ссылка на Figma (необязательно)', maxlength: 500 });
    const note = el('textarea', { rows: 2, maxlength: 500, placeholder: 'Комментарий клиенту: что сделано, что проверить (необязательно)' }, info.note || '');
    const ask = el('input', { type: 'checkbox' });
    const notify = el('input', { type: 'checkbox', checked: true });
    const save = el('button', { type: 'button' }, sel === ps.idx ? 'Отправить / обновить этап' : 'Перейти к этапу «' + ps.steps[sel] + '»');
    save.addEventListener('click', async () => {
      try {
        const r = await api('/api/orders/' + o.id + '/project-stage', { idx: sel, link: link.value, note: note.value, ask: ask.checked, notifyClient: notify.checked });
        if (r.warning) alert(r.warning);
        renderOrderDetail(r.order);
      } catch (err) { alert(err.message); }
    });
    const ans = info.answer;
    fill(box,
      el('h2', {}, '🚀 Этап проекта · ' + Math.min(ps.idx + 1, total) + '/' + total),
      el('div', { class: 'progress' }, el('i', { style: 'width:' + Math.round((Math.min(ps.idx, total) / total) * 100) + '%' })),
      el('div', { class: 'actions' }, ps.steps.map((n, i) => {
        const b = el('button', { type: 'button', class: 'small' + (i === sel ? '' : ' ghost'), disabled: !work }, (i < ps.idx ? '✓ ' : '') + (i + 1) + '. ' + n + (i === ps.idx ? ' ◀' : '') + stageMark(ps.info[i]));
        b.addEventListener('click', () => { sel = i; draw(); });
        return b;
      })),
      ans ? el('div', { class: ans.ok ? 'alert info' : 'alert' }, (ans.ok ? '✅ Клиент принял этап «' : '✏️ Замечания к этапу «') + ps.steps[sel] + '» · ' + fmt(ans.at) + (ans.text ? ': «' + ans.text + '»' : '')) : null,
      work ? [
        el('div', { class: 'grid2' }, el('label', {}, 'Демо к этапу', link), el('label', {}, 'Комментарий клиенту', note)),
        el('label', { class: 'check' }, ask, ' Попросить клиента проверить этап — кнопки «✅ Все добре» / «✏️ Є зауваження»'),
        el('label', { class: 'check' }, notify, ' Сообщить клиенту (с проверкой — всегда)'),
        el('div', { class: 'actions' }, save),
      ] : null,
      el('p', { class: 'muted' }, work ? 'Клиент видит «Етап N з M», прогресс и демо в Mini App. Ответ клиента придёт вам в Telegram. Названия этапов — «Настройки» → «Услуги Mini App».'
        : o.status === 'new' ? 'Этап выбирается, когда заявка в работе.' : 'Проект завершён — все этапы пройдены.'));
  };
  draw();
  return box;
}

function checklistSection(o) {
  if (!o.checklist || !o.checklist.length || o.projectStage) return null; // у проєктів — свої етапи (вище)
  const done = o.checklist.filter((c) => c.at).length;
  return el('section', { class: 'card' },
    el('h2', {}, '✅ Этапы работы · ' + done + '/' + o.checklist.length),
    el('div', { class: 'progress' }, el('i', { style: 'width:' + Math.round((done / o.checklist.length) * 100) + '%' })),
    el('div', { class: 'checklist' }, o.checklist.map((c) => {
      const box = el('input', { type: 'checkbox', checked: Boolean(c.at) });
      box.addEventListener('change', async () => {
        try { renderOrderDetail((await api('/api/orders/' + o.id + '/check', { step: c.step, done: box.checked })).order); }
        catch (err) { alert(err.message); box.checked = !box.checked; }
      });
      return el('label', { class: 'check' }, box, ' ' + c.step, c.at ? el('small', {}, fmt(c.at) + (c.by ? ' · ' + c.by : '')) : null);
    })),
    el('p', { class: 'muted' }, 'Этапы настраиваются в «Настройки» → «Этапы работы». Прогресс виден на доске.'));
}

function docsSection(o) {
  if (state.role === 'designer' || !(o.amount || o.package)) return null;
  const b = o.billing;
  const f = (name, label, ph) => el('label', {}, label, el('input', { name, value: b[name] || '', placeholder: ph || '' }));
  const form = el('form', {},
    el('div', { class: 'grid2' }, f('name', 'Заказчик (компания или ФИО)', 'ТОВ «Котик і Ко»'), f('code', 'Код ЄДРПОУ / ІПН')),
    el('div', { class: 'grid2' }, f('address', 'Адрес'), f('signer', 'Подписант со стороны заказчика', 'Директор І. Петренко')),
    el('button', { type: 'submit', class: 'small' }, 'Сохранить реквизиты заказчика'));
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    renderOrderDetail((await api('/api/orders/' + o.id + '/billing', Object.fromEntries(new FormData(form).entries()))).order);
  });
  const amount = el('input', { type: 'number', min: 1, step: 1, value: o.remaining > 0 ? o.remaining : o.amount || '', placeholder: 'Сумма, грн' });
  const link = (kind) => '/api/orders/' + o.id + '/doc?kind=' + kind + '&amount=' + encodeURIComponent(amount.value || '');
  const err = el('p', { class: 'error' });
  const sendDoc = (kind) => action(kind === 'act' ? 'Отправить акт клиенту' : 'Отправить счёт клиенту', async () => {
    err.textContent = '';
    if (!confirm('Отправить клиенту ' + (kind === 'act' ? 'акт' : 'счёт') + ' PDF в Telegram?')) return;
    try { renderOrderDetail((await api('/api/orders/' + o.id + '/doc-send', { kind, amount: Number(amount.value) })).order); } catch (e) { err.textContent = e.message; }
  }, 'small ghost');
  return el('section', { class: 'card' },
    el('h2', {}, '📄 Счёт и акт'),
    o.companySet ? null : el('div', { class: 'alert info' }, 'Сначала заполните реквизиты студии: ', el('a', { href: '#settings' }, '«Настройки» → «Реквизиты для документов»'), '.'),
    form,
    el('div', { class: 'pay-form' }, el('label', {}, 'Сумма в документе', amount),
      el('a', { class: 'btn small', href: '#', onclick: (e) => { e.preventDefault(); location.href = link('invoice'); } }, '⬇ Счёт PDF'),
      el('a', { class: 'btn small', href: '#', onclick: (e) => { e.preventDefault(); location.href = link('act'); } }, '⬇ Акт PDF'),
      sendDoc('invoice'), sendDoc('act')),
    err,
    el('p', { class: 'muted' }, 'Для компаний и ФОП: счёт на оплату и акт выполненных работ с вашими реквизитами, суммой цифрами и прописью. Без реквизитов заказчика в документе будет имя клиента.'));
}

function showcaseSection(o) {
  if (state.role === 'designer' || !o.packInfo) return null;
  const sc = o.showcase || {};
  const consent = { asked: '⏳ спросили, ждём ответа', yes: '✅ клиент разрешил', no: '🚫 клиент не разрешил' }[sc.consent] || 'не спрашивали';
  const chans = o.channels || [];
  const sel = el('select', {}, chans.map((c) => el('option', { value: String(c.id) }, c.title)));
  const text = el('textarea', { rows: 5, maxlength: 3500, placeholder: 'Текст поста (HTML Telegram: <b>, <i>, <a href>)…' });
  const stickers = el('select', {}, [0, 1, 2, 3, 4, 5].map((n) => el('option', { value: n }, n ? n + ' стикер(а) перед постом' : 'без стикеров')));
  stickers.value = '3';
  const err = el('p', { class: 'error' });
  const loadDraft = async (ai) => {
    err.textContent = '';
    try { text.value = (await api('/api/orders/' + o.id + '/showcase-draft', { ai })).html; } catch (e) { err.textContent = e.message; }
  };
  if (!text.value) loadDraft(false);
  return el('section', { class: 'card' },
    el('h2', {}, '📣 Показать работу в канале'),
    el('p', {}, 'Согласие клиента: ', el('b', {}, consent),
      sc.postedAt ? el('span', {}, ' · опубликовано ' + fmt(sc.postedAt) + ' ', sc.link ? el('a', { href: sc.link, target: '_blank', rel: 'noopener noreferrer' }, 'открыть') : null) : null),
    sc.consent !== 'yes' ? el('div', { class: 'actions' }, action('Спросить у клиента разрешение', async () => {
      try { renderOrderDetail((await api('/api/orders/' + o.id + '/showcase-ask', {})).order); } catch (e) { err.textContent = e.message; }
    }, 'small ghost')) : null,
    chans.length ? [
      el('div', { class: 'grid2' }, el('label', {}, 'Куда', sel), el('label', {}, 'Живые стикеры из пака', stickers)),
      el('label', {}, 'Текст поста', text),
      el('div', { class: 'actions' },
        action('↺ Шаблон', () => loadDraft(false), 'small ghost'),
        o.aiWriter ? action('✨ Текст с ИИ', () => loadDraft(true), 'small ghost') : null,
        action('📣 Опубликовать', async () => {
          err.textContent = '';
          if (sc.consent !== 'yes' && !confirm('Клиент ещё не дал согласия. Всё равно опубликовать?')) return;
          if (!confirm('Опубликовать работу в «' + sel.options[sel.selectedIndex].text + '»?')) return;
          try { renderOrderDetail((await api('/api/orders/' + o.id + '/showcase', { chatId: sel.value, html: text.value, stickers: Number(stickers.value) })).order); }
          catch (e) { err.textContent = e.message; }
        })),
      el('p', { class: 'muted' }, 'Пост: несколько живых стикеров из пака, затем текст с кнопками «➕ Додати стікерпак» и «🚀 Замовити стікери» (переходы считаются в статистике поста). Подпись канала добавится сама.'),
    ] : el('p', { class: 'muted' }, 'Добавьте канал во вкладке «Канал» → «Каналы и подпись».'),
    err);
}

// ---------- відгуки в канал ----------
function reviewPostControl(r, channels) {
  if (!channels.length) return null;
  const sel = el('select', { class: 'inline-select' }, channels.map((c) => el('option', { value: String(c.id) }, c.title)));
  return el('div', { class: 'actions' }, sel,
    action(r.postedAt ? '📣 Опубликовать ещё раз' : '📣 В канал', async () => {
      if (!confirm('Опубликовать отзыв в «' + sel.options[sel.selectedIndex].text + '»?')) return;
      const res = await api('/api/reviews/post', { orderId: r.orderId, chatId: sel.value });
      loadReviews();
      if (res.link) window.open(res.link, '_blank', 'noopener');
    }, 'small ghost'),
    r.postedAt ? el('small', { class: 'small-muted' }, 'в канале с ' + fmt(r.postedAt)) : null);
}

// ---------- налаштування v2.14 ----------
async function loadSettings3() {
  const [wb, gf, co, cl, sec] = await Promise.all([api('/api/winback'), api('/api/gifts'), api('/api/company'), api('/api/checklist'), api('/api/security')]);
  renderWinback(wb); renderGifts(gf); renderCompany(co); renderChecklist(cl); renderSecurity(sec);
  renderFaq(await api('/api/faq'));
  renderMini(await api('/api/miniapp'));
  renderServices(await api('/api/services'));
  renderWelcome(await api('/api/welcome'));
  renderSupport(await api('/api/support-offer'));
  renderReviewPromo(await api('/api/review-promo'));
  renderFixSettings(await api('/api/fixes'));
}

function renderWinback(w) {
  const f = $('wbForm');
  f.enabled.checked = w.enabled; f.days.value = w.days; f.percent.value = w.percent; f.message.value = w.message || '';
  $('wbStats').textContent = 'Отправлено предложений: ' + w.stats.sent + ', вернулись с заявкой: ' + w.stats.returned + '.';
}
bindForm('wbForm', async (data, form) => {
  renderWinback(await api('/api/winback', { enabled: form.enabled.checked, days: Number(data.days), percent: Number(data.percent), message: data.message }));
  $('wbOk').textContent = 'Сохранено.';
}, 'wbError', 'wbOk');

function renderFixSettings(s) {
  const f = $('fixForm');
  f.enabled.checked = s.enabled; f.days.value = s.days;
}
bindForm('fixForm', async (data, form) => {
  renderFixSettings(await api('/api/fixes', { enabled: form.enabled.checked, days: Number(data.days) }));
  $('fixOk').textContent = 'Сохранено.';
}, 'fixError', 'fixOk');

function auditSection(o) {
  if (state.role === 'designer' || !(o.audit || []).length) return null;
  const VIA = { page: '🖥 страница', app: '📱 студия Mini App', other: '✈️ Telegram / клиент' };
  return el('section', { class: 'card' }, el('h2', {}, '🧾 Журнал действий'),
    el('div', { class: 'audit-list' }, o.audit.map((e) => el('div', { class: 'audit-row' },
      el('small', { class: 'small-muted' }, fmt(e.at) + ' · ' + (e.who ? e.who + ' · ' : '') + (VIA[e.via] || e.via)),
      el('div', {}, e.changes.join('; '))))));
}

function fixSection(o) {
  const list = o.fixes || [];
  if (!list.length) return null;
  const open = list.find((f) => f.status === 'open');
  const notify = el('input', { type: 'checkbox', checked: true });
  return el('section', { class: 'card' + (open ? ' fix-open' : '') },
    el('h2', {}, open ? '✏️ Клиент просит правку после сдачи' : '✏️ Правки после сдачи'),
    list.slice().reverse().map((f) => el('div', { class: 'msg from-client' },
      el('small', {}, fmt(f.at) + (f.photos ? ' · фото: ' + f.photos + ' (в Telegram)' : '') + (f.status === 'done' ? ' · ✅ готово ' + fmt(f.doneAt) + (f.by ? ' (' + f.by + ')' : '') : ' · ⏳ ждёт')), f.text)),
    open ? [el('label', { class: 'check' }, notify, ' Сообщить клиенту'),
      action('✅ Правка готова', async () => {
        try { renderOrderDetail((await api('/api/orders/' + o.id + '/fix-done', { notifyClient: notify.checked })).order); } catch (err) { alert(err.message); }
      })] : null);
}

function renderReviewPromo(r) {
  const f = $('rpForm');
  f.enabled.checked = r.enabled; f.percent.value = r.percent; f.days.value = r.days;
  $('rpStats').textContent = 'Выдано промокодов: ' + r.stats.given + ', использовано: ' + r.stats.used + '.';
}
bindForm('rpForm', async (data, form) => {
  renderReviewPromo(await api('/api/review-promo', { enabled: form.enabled.checked, percent: Number(data.percent), days: Number(data.days) }));
  $('rpOk').textContent = 'Сохранено.';
}, 'rpError', 'rpOk');

function renderSupport(s) {
  const f = $('supForm');
  f.enabled.checked = s.enabled; f.days.value = s.days; f.message.value = s.message || ''; f.messageEn.value = s.messageEn || '';
  $('supStats').textContent = 'Отправлено предложений: ' + s.stats.sent + ', «Хочу обговорити»: ' + s.stats.yes + ', «Все чудово»: ' + s.stats.no + '.';
}
bindForm('supForm', async (data, form) => {
  renderSupport(await api('/api/support-offer', { enabled: form.enabled.checked, days: Number(data.days), message: data.message, messageEn: data.messageEn }));
  $('supOk').textContent = 'Сохранено.';
}, 'supError', 'supOk');

const GIFT_STATUS = { pending: '⏳ ждёт оплаты', active: '✅ активен', redeemed: '🎁 использован', failed: '✖ оплата не прошла', cancelled: '✖ аннулирован' };
function renderGifts(g) {
  const f = $('giftForm');
  f.enabled.checked = g.settings.enabled;
  f.amounts.value = g.settings.amounts.join(', ');
  f.validityDays.value = g.settings.validityDays;
  $('giftNote').textContent = g.paymentsOn ? '' : 'Покупка в боте работает только при включённой оплате monobank. Без неё можно выпускать сертификаты вручную (ниже).';
  $('giftList').replaceChildren(...(g.gifts.length ? g.gifts.map((x) => el('div', { class: 'gift-row' },
    el('b', {}, x.code || '—'), el('span', {}, money(x.amount)), el('span', {}, GIFT_STATUS[x.status] || x.status),
    el('small', { class: 'small-muted' }, (x.source === 'manual' ? 'вручную' : 'куплен в боте ' + (x.buyerName || '')) + (x.until ? ' · до ' + dmy(x.until) : '') + (x.orderId ? ' · заявка ' + no(x.orderId) : '') + (x.from ? ' · от ' + x.from : '')),
    x.code ? el('a', { href: '/api/gifts/pdf?code=' + encodeURIComponent(x.code) }, '⬇ PDF') : null,
    x.code && x.link ? action('Копировать ссылку', async () => { await navigator.clipboard.writeText(x.link); }, 'small ghost') : null,
    x.status === 'active' ? action('Аннулировать', async () => { if (confirm('Аннулировать сертификат ' + x.code + '?')) renderGifts(await api('/api/gifts/cancel', { code: x.code })); }, 'small ghost danger') : null))
    : [el('p', { class: 'muted' }, 'Сертификатов пока нет.')]));
}
bindForm('giftForm', async (data, form) => {
  renderGifts(await api('/api/gifts', { enabled: form.enabled.checked, amounts: data.amounts.split(/[,; ]+/).map(Number).filter(Boolean), validityDays: Number(data.validityDays) }));
  $('giftOk').textContent = 'Сохранено.';
}, 'giftError', 'giftOk');
bindForm('giftIssueForm', async (data, form) => {
  renderGifts(await api('/api/gifts/issue', { amount: Number(data.amount), from: data.from, paid: form.paid.checked }));
  form.reset();
  $('giftOk').textContent = 'Сертификат выпущен — скачайте PDF в списке ниже.';
}, 'giftError', 'giftOk');

function renderCompany(c) {
  const f = $('companyForm');
  for (const k of ['name', 'code', 'iban', 'bank', 'address', 'phone', 'email', 'signer']) f[k].value = c[k] || '';
  f.vat.checked = Boolean(c.vat);
  f.clientDocs.checked = Boolean(c.clientDocs);
}
bindForm('companyForm', async (data, form) => {
  renderCompany(await api('/api/company', { ...data, vat: form.vat.checked, clientDocs: form.clientDocs.checked }));
  $('companyOk').textContent = 'Сохранено.';
}, 'companyError', 'companyOk');

function renderChecklist(c) {
  $('checklistForm').steps.value = c.steps.join('\n');
  $('checklistForm').dataset.defaults = c.defaults.join('\n');
}
bindForm('checklistForm', async (data) => {
  renderChecklist(await api('/api/checklist', { steps: data.steps.split('\n').map((x) => x.trim()).filter(Boolean) }));
  $('checklistOk').textContent = 'Сохранено.';
}, 'checklistError', 'checklistOk');
$('checklistReset').addEventListener('click', () => { $('checklistForm').steps.value = $('checklistForm').dataset.defaults || ''; });

function renderSecurity(s) {
  $('secForm').twoFactor.checked = s.twoFactor;
}
bindForm('secForm', async (data, form) => {
  if (form.twoFactor.checked && !confirm('Включить вход с кодом из Telegram? Код будет приходить на ваш Telegram (получатель заявок), дизайнерам — на их Telegram. Если бот в момент входа без связи, код напечатается в журнале бота в панели.')) { form.twoFactor.checked = false; return; }
  renderSecurity(await api('/api/security', { twoFactor: form.twoFactor.checked }));
  $('secOk').textContent = 'Сохранено.';
}, 'secError', 'secOk');

// ---------- показники студії ----------
async function loadAnalytics() {
  const a = await api('/api/analytics?period=' + encodeURIComponent($('finPeriod').value));
  const kpi = (value, label, extra) => el('div', { class: 'stat' }, el('b', {}, value === null || value === undefined ? '—' : String(value)), el('span', {}, label), extra ? el('small', {}, extra) : null);
  const hrs = (h) => (h === null ? null : h < 1 ? Math.round(h * 60) + ' мин' : h + ' ч');
  $('anKpis').replaceChildren(
    kpi(hrs(a.firstResponse.median), 'Первый ответ (медиана)', a.firstResponse.avg !== null ? 'в среднем ' + hrs(a.firstResponse.avg) : null),
    kpi(a.briefConversion !== null ? a.briefConversion + '%' : null, 'Бриф → заявка', 'начали: ' + a.starts + ', заявок: ' + a.orders),
    kpi(a.quotes.rate !== null ? a.quotes.rate + '%' : null, 'Сметы согласованы', 'отправлено: ' + a.quotes.sent),
    kpi(a.daysToDone.median, 'Дней до «Готово» (медиана)', a.daysToDone.avg !== null ? 'в среднем ' + a.daysToDone.avg : null),
    kpi(a.sketchRounds, 'Версий эскизов в среднем'),
    kpi(a.rating ? '⭐ ' + a.rating : null, 'Оценка', 'готово: ' + a.done),
    kpi(a.cancelled + a.rejected, 'Отменено / отклонено', 'клиент: ' + a.cancelled + ', студия: ' + a.rejected),
    kpi(a.winback.returned, 'Вернулись после напоминания', 'напоминаний: ' + a.winback.sent));
  $('anReasons').replaceChildren(a.reasons.length ? el('p', {}, 'Причины отмен: ', a.reasons.map((r) => r.reason + ' — ' + r.count).join(', ')) : el('p', { class: 'muted' }, 'Отмен за период нет.'));
  $('anDesigners').replaceChildren(a.designers.length ? el('div', { class: 'table-wrap' }, el('table', { class: 'an-table' },
    el('thead', {}, el('tr', {}, ['Дизайнер', 'Готово', 'В работе сейчас', 'Дней до готово', 'Оценка'].map((x) => el('th', {}, x)))),
    el('tbody', {}, a.designers.map((d) => el('tr', {}, el('td', {}, d.name), el('td', {}, String(d.done)), el('td', {}, String(d.open)), el('td', {}, d.avgDays === null ? '—' : String(d.avgDays)), el('td', {}, d.rating ? '⭐ ' + d.rating : '—')))))) : null);
}

// ---------- вхід: другий крок ----------
let loginTicket = null;
function showCodeStep(r) {
  loginTicket = r.ticket;
  $('loginForm').classList.add('hidden');
  $('codeForm').classList.remove('hidden');
  $('codeNote').textContent = r.delivered ? 'Мы отправили код в Telegram. Он действует 5 минут.' : 'Бот сейчас без связи с Telegram — код напечатан в журнале бота в панели.';
  $('codeForm').code.focus();
}
bindForm('codeForm', async (data, form) => {
  await api('/api/login/code', { ticket: loginTicket, code: data.code });
  form.reset();
  $('codeForm').classList.add('hidden');
  $('loginForm').classList.remove('hidden');
  await refresh();
}, 'codeError');
$('codeBack').addEventListener('click', () => { $('codeForm').classList.add('hidden'); $('loginForm').classList.remove('hidden'); });
`;
