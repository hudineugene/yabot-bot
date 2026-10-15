// Інтерфейс Mini App (HTML, CSS, JS як рядки) за UI-kit YABOT: Головна / Каталог / Замовлення / Профіль,
// три послуги, заявка в 4 кроки, замовлення з етапами, файлами й чатом; студія для власника й дизайнерів.
// Увага: CLIENT_JS і CLIENT_CSS — String.raw, тож усередині без зворотних лапок і без «${».

export const CLIENT_HTML = `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>YABOT</title>
<link rel="stylesheet" href="app.css">
<script src="https://telegram.org/js/telegram-web-app.js?57"></script>
</head>
<body>
<div id="app"><div class="loading"><img src="a/logo.webp" alt="YABOT"><div class="spinner"></div></div></div>
<nav id="tabs" hidden></nav>
<div id="toast" hidden></div>
<script src="app.js"></script>
</body>
</html>`;

export const CLIENT_CSS = String.raw`
:root {
  --orange: #FF6500; --orange-2: #FF7A1F; --orange-soft: #FFF2EA; --orange-line: #FFD0B4;
  --ink: #171717; --ink-2: #667085; --canvas: #FFFFFF; --surface: #F8F9FA; --surface-2: #F2F3F5; --border: #E8E9ED;
  --ok: #18A568; --ok-soft: #E8F7EF; --warn: #F59E0B; --warn-soft: #FEF5E6; --danger: #E5484D; --danger-soft: #FDECEC;
  --me: #EAF3FF; --r-sm: 10px; --r: 16px; --r-lg: 22px; --shadow: 0 4px 16px rgba(15,15,15,.06);
  --nav-h: 64px;
}
html[data-theme="dark"] {
  --ink: var(--tg-theme-text-color, #F2F2F2); --ink-2: var(--tg-theme-hint-color, #9AA0AA);
  --canvas: var(--tg-theme-bg-color, #17181A); --surface: var(--tg-theme-secondary-bg-color, #232427); --surface-2: #2C2D31; --border: #34363B;
  --orange-soft: #3A2417; --orange-line: #7A3A12; --ok-soft: #173326; --warn-soft: #3A2E14; --danger-soft: #3B1C1E; --me: #1F3047;
  --shadow: none;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { margin: 0; background: var(--canvas); color: var(--ink); font: 15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
body { padding-bottom: calc(var(--nav-h) + 12px + env(safe-area-inset-bottom)); }
button { font: inherit; color: inherit; cursor: pointer; border: 0; background: none; padding: 0; }
input, textarea, select { font: inherit; color: var(--ink); background: var(--canvas); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px; width: 100%; }
textarea { min-height: 100px; resize: vertical; }
input:focus, textarea:focus, select:focus { outline: 2px solid var(--orange); outline-offset: -1px; border-color: transparent; }
input::placeholder, textarea::placeholder { color: #A0A6B1; }
a { color: var(--orange); }
img { max-width: 100%; }
.ic { display: inline-flex; width: 22px; height: 22px; flex: 0 0 auto; }
.ic svg { width: 100%; height: 100%; }
.muted { color: var(--ink-2); font-size: 13px; }
.center { text-align: center; }
.pre { white-space: pre-line; }
.orange-t { color: var(--orange); }
.loading { min-height: 80vh; display: grid; place-items: center; align-content: center; gap: 18px; }
.loading img { width: 120px; }
.spinner { width: 26px; height: 26px; border: 3px solid var(--border); border-top-color: var(--orange); border-radius: 50%; animation: spin .8s linear infinite; }
.spinner.sm { width: 18px; height: 18px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }
.page { padding: 12px 16px 16px; max-width: 520px; margin: 0 auto; }
.page > * + * { margin-top: 14px; }
.page.with-bar { padding-bottom: 86px; }

/* заголовки */
.ohead h1 { font-size: 26px !important; }
.phead h1, .ohead h1, .success h1 { font-size: 30px; line-height: 1.12; font-weight: 800; letter-spacing: -.5px; margin: 0; }
.phead-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.sub { color: var(--ink-2); font-size: 16px; margin: 6px 0 0; line-height: 1.35; }
h2 { font-size: 19px; margin: 0; font-weight: 750; }
.h2 { font-size: 19px; font-weight: 750; margin: 6px 0 0; }
h3 { font-size: 17px; margin: 0; font-weight: 750; }
.sec-head { display: flex; justify-content: space-between; align-items: center; margin-top: 22px !important; }

/* картки, кнопки */
.card { background: var(--canvas); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; box-shadow: var(--shadow); }
.card + .card { margin-top: 12px; }
.btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; min-height: 50px; padding: 12px 18px; border-radius: var(--r);
  background: linear-gradient(180deg, var(--orange-2), var(--orange)); color: #fff; font-weight: 650; font-size: 16px; box-shadow: 0 8px 20px rgba(255,101,0,.25); }
.btn.big { min-height: 54px; font-size: 17px; }
.btn.big .ic:last-child { margin-left: auto; }
.btn.big span:first-of-type:not(.ic) { flex: 1; text-align: center; }
.btn:disabled { opacity: .5; }
.btn.ghost { background: var(--canvas); color: var(--ink); border: 1px solid var(--border); box-shadow: none; font-weight: 600; }
.btn.small { width: auto; min-height: 38px; padding: 8px 14px; font-size: 14px; border-radius: 12px; box-shadow: none; }
.btn.small .ic { width: 18px; height: 18px; }
.link { color: var(--orange); font-weight: 600; font-size: 14px; display: inline-flex; align-items: center; gap: 4px; padding: 6px 0; }
.link .ic { width: 18px; height: 18px; }
.link.danger { color: var(--danger); }
.link.back { color: var(--ink-2); margin-top: 4px !important; }
.center-b { display: flex; margin: 10px auto 0; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.row2 .btn { min-height: 48px; font-size: 15px; }
.row-between { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; background: var(--surface-2); font-size: 13px; font-weight: 500; white-space: nowrap; }
.pill .ic { width: 16px; height: 16px; }
.pill.orange { background: var(--orange); color: #fff; font-weight: 700; }
.pill.orange.big { font-size: 17px; padding: 9px 16px; }
.pill.red { background: var(--danger-soft); color: var(--danger); }
.chips { display: flex; gap: 8px; }
.chips.wrap { flex-wrap: wrap; }
.chips.scroll { overflow-x: auto; scrollbar-width: none; margin: 0 -16px; padding: 2px 16px; }
.chips.scroll::-webkit-scrollbar { display: none; }
.chip { flex: 0 0 auto; padding: 9px 15px; border-radius: 999px; background: var(--surface-2); font-size: 14px; font-weight: 500; }
.chip.on { background: var(--orange); color: #fff; }
.chip-btn { display: inline-flex; align-items: center; gap: 6px; flex: 0 0 auto; padding: 8px 12px; border-radius: 999px; border: 1px solid var(--border); font-size: 13px; font-weight: 600; background: var(--canvas); }
.chip-btn .ic { width: 16px; height: 16px; color: var(--orange); }
.note { background: var(--orange-soft); border: 0; box-shadow: none; display: flex; gap: 10px; align-items: flex-start; border-radius: 14px; padding: 12px 14px; }
.note.small { font-size: 13px; }
.note .ic { color: var(--orange); width: 20px; height: 20px; }
.error { color: var(--danger); font-size: 14px; }
.kv { display: flex; justify-content: space-between; gap: 10px; font-size: 14px; padding: 6px 0; }
.kv span:first-child { color: var(--ink-2); }

/* головна */
.home-hero { position: relative; padding-top: 4px; min-height: 270px; }
.home-top { display: flex; justify-content: space-between; align-items: flex-start; position: relative; z-index: 2; }
.home-hero .logo { width: 132px; }
html[data-theme="dark"] .home-hero .logo { background: #fff; border-radius: 18px; padding: 8px; }
.home-hero .mascot { position: absolute; right: -4px; top: 22px; width: 47%; max-width: 215px; z-index: 1; -webkit-mask-image: linear-gradient(to bottom, #000 72%, transparent 97%); mask-image: linear-gradient(to bottom, #000 72%, transparent 97%); }
.accent-lines { position: absolute; right: 44%; top: 70px; width: 40px; height: 40px; z-index: 1; }
.accent-lines i { position: absolute; width: 5px; height: 18px; background: var(--orange); border-radius: 3px; }
.accent-lines i:nth-child(1) { left: 2px; top: 16px; transform: rotate(-35deg); }
.accent-lines i:nth-child(2) { left: 16px; top: 4px; transform: rotate(-10deg); }
.accent-lines i:nth-child(3) { left: 30px; top: 14px; transform: rotate(20deg); }
.home-hero h1 { position: relative; z-index: 2; font-size: 31px; font-weight: 850; letter-spacing: -.6px; margin: 82px 0 0; line-height: 1.1; text-shadow: 0 0 18px var(--canvas), 0 0 6px var(--canvas); }
.home-hero .sub { position: relative; z-index: 2; max-width: 92%; }
.action-banner { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; border-color: var(--orange-line); background: var(--orange-soft); }
.action-banner .bell { width: 40px; height: 40px; border-radius: 12px; background: var(--orange); color: #fff; display: grid; place-items: center; }
.action-banner > div { flex: 1; }
.action-banner .ic:last-child { color: var(--ink-2); }

/* картки послуг */
.svc-card { position: relative; display: grid; grid-template-columns: 1fr 44%; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 16px 14px 16px 16px; min-height: 150px; overflow: hidden; }
.svc-card .svc-text { display: grid; gap: 8px; justify-items: start; position: relative; z-index: 1; }
.svc-card h3 { font-size: 19px; line-height: 1.15; }
.svc-card p { margin: 0; color: var(--ink-2); font-size: 13.5px; line-height: 1.35; }
.svc-card .svc-img { width: 118%; max-width: none; margin: -6px -10% -10px -8%; filter: drop-shadow(0 8px 14px rgba(0,0,0,.14)); }
.round-chev { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 34px; height: 34px; border-radius: 50%; background: var(--canvas); box-shadow: 0 2px 8px rgba(0,0,0,.08); display: grid; place-items: center; color: var(--ink); }
.round-chev .ic { width: 18px; height: 18px; }
.search-box { display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); border-radius: 14px; padding: 0 14px; background: var(--canvas); box-shadow: var(--shadow); }
.search-box .ic { color: var(--ink-2); }
.search-box input { border: 0; padding: 13px 0; outline: none; background: transparent; }
.search-box input:focus { outline: none; }

/* сторінка послуги */
.svc-hero { display: grid; place-items: center; padding: 4px 0; min-height: 180px; background: radial-gradient(closest-side, var(--orange-soft), transparent); }
.svc-hero img { max-height: 240px; filter: drop-shadow(0 12px 18px rgba(0,0,0,.16)); }
.svc-hero.stickers { grid-template-columns: repeat(3, 1fr); gap: 4px; background: transparent; padding: 0; min-height: 0; }
.svc-hero.stickers img, .svc-hero.stickers video, .svc-hero.stickers canvas { width: 100%; aspect-ratio: 1; object-fit: contain; filter: drop-shadow(0 6px 10px rgba(0,0,0,.12)); }
.svc-hero.stickers > :nth-child(2) { transform: translateY(-10px) scale(1.08); }
.utabs { display: flex; border-bottom: 1px solid var(--border); margin-top: 18px !important; }
.utabs button { flex: 1; padding: 10px 2px; font-size: 14px; color: var(--ink-2); font-weight: 600; border-bottom: 3px solid transparent; margin-bottom: -1px; }
.utabs button.on { color: var(--ink); border-color: var(--orange); }
.tab-body .lead { font-size: 15px; color: var(--ink-2); margin: 4px 0 14px; }
.perks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.perk { display: grid; justify-items: center; text-align: center; gap: 6px; font-size: 12.5px; color: var(--ink-2); }
.perk-ic { width: 46px; height: 46px; border-radius: 50%; border: 1.5px solid var(--orange-line); color: var(--orange); display: grid; place-items: center; }
.checklist { list-style: none; padding: 0; margin: 4px 0; display: grid; gap: 10px; }
.checklist li { display: flex; gap: 10px; align-items: flex-start; }
.checklist .ic { color: var(--orange); }
.checklist.small { gap: 6px; font-size: 14px; margin: 10px 0; }
.checklist.small .ic { width: 18px; height: 18px; }
.steps-list { list-style: none; padding: 0; margin: 4px 0; display: grid; gap: 0; }
.steps-list li { display: flex; gap: 12px; align-items: center; padding: 8px 0; position: relative; }
.steps-list li + li::before { content: ""; position: absolute; left: 15px; top: -8px; height: 16px; width: 2px; background: var(--orange-line); }
.steps-list .num { width: 32px; height: 32px; border-radius: 50%; background: var(--orange); color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 14px; flex: 0 0 auto; }
.ex-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.ex { background: var(--surface); border-radius: 14px; padding: 8px; aspect-ratio: 1; display: grid; place-items: center; overflow: hidden; }
.ex img, .ex video, .ex canvas { width: 100%; height: 100%; object-fit: contain; }
.faq details { border: 1px solid var(--border); border-radius: 14px; padding: 13px 14px; background: var(--canvas); }
.faq details + details { margin-top: 8px; }
.faq summary { font-weight: 650; cursor: pointer; list-style: none; display: flex; justify-content: space-between; gap: 8px; align-items: center; }
.faq summary::-webkit-details-marker { display: none; }
.faq summary .chev { transition: transform .2s; color: var(--ink-2); width: 18px; height: 18px; }
.faq details[open] summary .chev { transform: rotate(90deg); }
.faq p { margin: 10px 0 0; white-space: pre-line; color: var(--ink-2); }
.works { display: grid; gap: 12px; }
.work .thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 10px 0; }
.work .thumbs img, .work .thumbs video, .work .thumbs canvas.stk { width: 100%; aspect-ratio: 1; object-fit: contain; background: var(--surface); border-radius: 12px; }

/* майстер заявки */
.wsteps { display: flex; justify-content: space-between; position: relative; margin: 2px 4px 6px; }
.wsteps::before { content: ""; position: absolute; left: 22px; right: 22px; top: 15px; height: 2px; background: var(--border); }
.ws { position: relative; display: grid; justify-items: center; gap: 4px; z-index: 1; width: 25%; }
.ws-dot { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: var(--surface-2); color: var(--ink-2); font-weight: 700; font-size: 14px; border: 2px solid var(--canvas); }
.ws.now .ws-dot, .ws.done .ws-dot { background: var(--orange); color: #fff; }
.ws-dot .ic { width: 16px; height: 16px; }
.ws-label { font-size: 12px; color: var(--ink-2); text-align: center; }
.ws.now .ws-label { color: var(--orange); font-weight: 700; }
.field label { display: block; font-weight: 650; margin: 0 0 7px; }
.field .req { color: var(--orange); }
.field .hint { color: var(--ink-2); font-size: 13px; margin: -2px 0 7px; }
.field + .field, .grid2 + .field, .field + .grid2 { margin-top: 16px; }
.grid2 > .field { margin-top: 0 !important; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.counter { text-align: right; font-size: 12px; color: var(--ink-2); margin-top: 4px; }
.inp-ic { position: relative; display: block; }
.inp-ic .ic { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ink-2); width: 20px; height: 20px; pointer-events: none; }
.inp-ic input { padding-left: 40px; }
select.sel { appearance: none; -webkit-appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--ink-2) 50%), linear-gradient(135deg, var(--ink-2) 50%, transparent 50%); background-position: calc(100% - 18px) 52%, calc(100% - 13px) 52%; background-size: 5px 5px; background-repeat: no-repeat; padding-right: 32px; }
.opt { position: relative; display: block; width: 100%; text-align: left; background: var(--canvas); border: 1.5px solid var(--border); border-radius: var(--r); padding: 12px 14px; transition: border-color .15s, background .15s; }
.opt.on { border-color: var(--orange); background: var(--orange-soft); }
.opt small { display: block; color: var(--ink-2); font-size: 12px; margin-top: 2px; }
.opt .tick { position: absolute; top: -7px; right: -7px; width: 22px; height: 22px; border-radius: 50%; background: var(--orange); color: #fff; display: grid; place-items: center; box-shadow: 0 2px 6px rgba(255,101,0,.35); }
.opt .tick .ic { width: 13px; height: 13px; }
.svc-pick { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.svc-opt { display: grid; gap: 8px; padding: 10px 8px; text-align: left; }
.svc-opt img { width: 100%; height: 78px; object-fit: contain; }
.svc-opt b { font-size: 13.5px; line-height: 1.2; }
.need-pick { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.need-opt { display: flex; align-items: center; gap: 6px; padding: 12px 8px; font-size: 13px; font-weight: 600; }
.need-opt .ic { color: var(--orange); width: 20px; height: 20px; }
.seg2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.chips3 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.chips3 .opt { text-align: center; padding: 10px 4px; }
.pkg { margin-bottom: 8px; }
.pkg ul { margin: 6px 0 0; padding-left: 18px; color: var(--ink-2); font-size: 13px; }
.styles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.style-opt { padding: 6px; text-align: center; font-size: 12.5px; display: grid; gap: 4px; }
.style-opt img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 10px; }
.style-opt .any { aspect-ratio: 1; display: grid; place-items: center; background: var(--surface); border-radius: 10px; color: var(--orange); }
.style-opt .any .ic { width: 32px; height: 32px; }
.tip { display: flex; align-items: center; gap: 12px; background: var(--surface); border-radius: var(--r); padding: 10px 14px 10px 6px; }
.tip img { width: 82px; flex: 0 0 auto; }
.tip p { margin: 2px 0 0; color: var(--ink-2); font-size: 13.5px; }
.summary { padding: 4px 16px; }
.sum-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 11px 0; border-bottom: 1px solid var(--border); }
.sum-row:last-child { border-bottom: 0; }
.sum-val { white-space: pre-line; word-break: break-word; font-weight: 550; }
.sum-row .link .ic { color: var(--ink-2); }
.ref-strip { display: flex; gap: 6px; overflow-x: auto; }
.ref-strip img { width: 64px; height: 64px; object-fit: cover; border-radius: 10px; flex: 0 0 auto; }
.success { text-align: center; display: grid; gap: 14px; justify-items: center; padding-top: 10px; }
.success-art { position: relative; width: 210px; height: 220px; display: grid; place-items: center; background: radial-gradient(closest-side, var(--orange-soft), transparent); }
.success-art img { max-height: 220px; }
.success-check { position: absolute; right: 6px; top: 18px; width: 50px; height: 50px; border-radius: 50%; background: var(--orange); color: #fff; display: grid; place-items: center; box-shadow: 0 8px 18px rgba(255,101,0,.35); }
.success-check .ic { width: 26px; height: 26px; }
.success .sub { max-width: 340px; }

/* фото */
.thumbs-edit { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.thumbs-edit .th { position: relative; aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: var(--surface); }
.thumbs-edit .th img { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumbs-edit .rm { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,.6); color: #fff; font-size: 12px; line-height: 22px; text-align: center; }
.thumbs-edit .add { color: var(--orange); font-size: 12px; font-weight: 650; border: 1.5px dashed var(--orange-line); padding: 4px; display: grid; place-items: center; background: var(--canvas); }
.thumbs-edit .wait { display: grid; place-items: center; }

/* замовлення */
.stepper { display: flex; justify-content: space-between; margin: 14px 0 4px; }
.stp { position: relative; display: grid; justify-items: center; gap: 4px; flex: 1; text-align: center; }
.stp:not(:last-child)::after { content: ""; position: absolute; top: 14px; left: calc(50% + 16px); right: calc(-50% + 16px); height: 2px; background: var(--border); }
.stp.fill::after { background: var(--orange); }
.stp-dot { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; border: 2px solid var(--border); color: var(--ink-2); font-size: 13px; font-weight: 700; background: var(--canvas); position: relative; z-index: 1; }
.stp.done .stp-dot { background: var(--orange); border-color: var(--orange); color: #fff; }
.stp.now .stp-dot { border-color: var(--orange); color: var(--orange); box-shadow: 0 0 0 4px var(--orange-soft); }
.stp-dot .ic { width: 15px; height: 15px; }
.stp-label { font-size: 12px; color: var(--ink-2); }
.stp.now .stp-label { color: var(--orange); font-weight: 700; }
.stp.done .stp-label { color: var(--ink); }
.stp-date { font-size: 11px; color: var(--ink-2); }
.pkg-card { display: block; width: 100%; text-align: left; margin-bottom: 10px; }
.pkg-card ul { margin: 6px 0 8px; padding-left: 18px; color: var(--ink-2); font-size: 13px; }
.pkg-card .link { display: inline-flex; align-items: center; gap: 4px; color: var(--orange); font-weight: 700; }
.promo-banner { position: relative; display: grid; grid-template-columns: 1fr 92px; gap: 8px; align-items: end; padding: 16px; margin: 14px 0 0; border-radius: var(--r); color: #fff; background: linear-gradient(135deg, #FF6500 0%, #FF8B3D 100%); box-shadow: 0 8px 22px rgba(255,101,0,.28); overflow: hidden; }
.promo-banner p { margin: 4px 0 10px; font-size: 14px; opacity: .95; }
.pb-title { display: block; font-size: 18px; line-height: 1.2; padding-right: 22px; }
.pb-img { width: 92px; height: 92px; object-fit: contain; align-self: center; filter: drop-shadow(0 4px 8px rgba(0,0,0,.15)); }
.pb-x { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: rgba(255,255,255,.22); color: #fff; }
.pb-x .ic { width: 14px; height: 14px; }
.pb-code { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border: 1.5px dashed rgba(255,255,255,.85); border-radius: 10px; color: #fff; background: rgba(255,255,255,.12); font-weight: 800; letter-spacing: .5px; margin-bottom: 10px; }
.pb-code small { font-weight: 500; opacity: .85; letter-spacing: 0; }
.pb-code .ic { width: 15px; height: 15px; }
.pb-foot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.pb-foot small { opacity: .9; font-size: 12px; }
.pb-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 999px; background: #fff; color: var(--orange); font-weight: 800; font-size: 14px; }
.pb-btn .ic { width: 16px; height: 16px; }
.like-btn { width: auto; padding: 0 22px; }
.like-pill { display: flex; align-items: center; gap: 10px; padding: 6px 8px 6px 6px; border-radius: 14px; background: var(--orange-soft); color: var(--orange); font-weight: 700; font-size: 13px; margin: 6px 0; }
.like-pill img { width: 40px; height: 40px; border-radius: 10px; object-fit: cover; flex: 0 0 40px; background: var(--canvas); }
.like-pill span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.like-pill .x { width: 26px; height: 26px; display: grid; place-items: center; color: var(--orange); }
.like-pill .x .ic { width: 14px; height: 14px; }
.stage-demo { display: grid; gap: 8px; margin-top: 10px; justify-items: start; }
.stage-demo p { margin: 0; }
.unread-pill { display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; padding: 3px 9px; border-radius: 999px; background: #E8F1FF; color: #2463EB; font-size: 12px; font-weight: 700; margin: 4px 0; }
.unread-pill .ic { width: 13px; height: 13px; }
[data-theme="dark"] .unread-pill { background: rgba(80,140,255,.18); color: #8DB4FF; }
.cnt { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; margin-left: 6px; border-radius: 999px; background: var(--orange); color: #fff; font-size: 11px; font-weight: 800; vertical-align: middle; }
.new-divider { display: flex; align-items: center; gap: 10px; margin: 10px 0; color: var(--orange); font-size: 12px; font-weight: 700; }
.new-divider::before, .new-divider::after { content: ""; flex: 1; height: 1px; background: var(--orange-line); }
.qcard { display: flex; gap: 12px; align-items: flex-start; }
.qcard p { margin: 2px 0 4px; font-weight: 600; }
.qcard small { display: inline; }
.chat-bar.rec { gap: 10px; }
.chat-bar .grow { flex: 1; font-size: 13px; }
.rec-dot { width: 10px; height: 10px; border-radius: 50%; background: #EF4444; animation: recblink 1s infinite; flex: 0 0 10px; }
@keyframes recblink { 50% { opacity: .25; } }
.chat-bar .mic .ic { width: 21px; height: 21px; }
.chat-file { display: none; }
.bubble .ai-photo { display: block; max-width: 220px; max-height: 240px; border-radius: 12px; margin: 2px 0 6px; object-fit: cover; }
.fix-card { display: flex; align-items: center; gap: 12px; justify-content: space-between; }
.fix-card small { display: block; margin-top: 2px; }
.fix-card .btn { flex: 0 0 auto; white-space: nowrap; }
.card.note { display: flex; gap: 10px; align-items: flex-start; }
.plan-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 0; border-top: 1px solid var(--border); }
.plan-row:first-of-type { border-top: 0; }
.plan-row small { display: block; }
.plan-row.paid b { color: var(--ink-2); }
.rp-hint { margin: 8px 0; padding: 8px 12px; border-radius: 12px; background: var(--orange-soft); color: var(--orange); font-size: 13px; font-weight: 700; }
.rp-code { display: grid; gap: 6px; justify-items: start; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
.pb-code.dark { color: var(--orange); border-color: var(--orange); background: var(--orange-soft); }
.reply-time { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 12px; color: var(--ink-2); }
.reply-time i { width: 8px; height: 8px; border-radius: 50%; background: #22C55E; box-shadow: 0 0 0 3px rgba(34,197,94,.18); flex: 0 0 8px; }
.h2 + .reply-time { margin: -6px 0 10px; }
.ai-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin-top: 8px; }
.ai-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; border: 1.5px dashed var(--orange); background: var(--orange-soft); color: var(--orange); font-weight: 700; font-size: 14px; }
.ai-btn:disabled { opacity: .75; }
.stepper.many .stp-dot { width: 26px; height: 26px; font-size: 12px; }
.stepper.many .stp:not(:last-child)::after { top: 12px; left: calc(50% + 14px); right: calc(-50% + 14px); }
.stepper.many .stp-label { font-size: 10px; line-height: 1.15; overflow-wrap: anywhere; padding: 0 1px; }
.stepper.many .stp-date { font-size: 10px; }
.ocard { padding: 0; overflow: hidden; }
.ocard-main { display: block; width: 100%; text-align: left; padding: 14px 16px 6px; }
.ocard-main > * + * { margin-top: 8px; }
.ocard-body { display: grid; grid-template-columns: 1fr 38%; gap: 10px; align-items: center; }
.ocard-body h3 { font-size: 19px; line-height: 1.15; }
.ocard-body img { max-height: 120px; object-fit: contain; justify-self: end; filter: drop-shadow(0 6px 10px rgba(0,0,0,.12)); }
.clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 6px 0 0; }
.clamp3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin: 6px 0 0; }
.ocard-foot { display: flex; align-items: center; gap: 8px; padding: 10px 16px 14px; border-top: 1px solid var(--border); margin-top: 8px; }
.ocard-foot .dl { flex: 1; }
.dl { display: flex; align-items: center; gap: 8px; }
.dl .ic { color: var(--ink-2); }
.dl small { display: block; color: var(--ink-2); font-size: 11.5px; }
.dl b { font-size: 14px; }
.ohead { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.status { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; font-size: 13px; font-weight: 650; white-space: nowrap; margin-top: 6px; }
.status i { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.status.green { background: var(--ok-soft); color: var(--ok); }
.status.orange-soft { background: var(--orange-soft); color: var(--orange); }
.status.red { background: var(--danger-soft); color: var(--danger); }
.oinfo-top { display: grid; grid-template-columns: 38% 1fr; gap: 12px; align-items: start; }
.oinfo-top img { border-radius: 14px; background: var(--orange-soft); padding: 6px; max-height: 150px; object-fit: contain; }
.oinfo-top .chips { margin-top: 8px; }
.oinfo-foot { display: flex; gap: 14px; flex-wrap: wrap; border-top: 1px solid var(--border); margin-top: 12px; padding-top: 12px; }
.cur { display: flex; gap: 12px; margin-top: 12px; padding: 12px; border-radius: 14px; background: var(--surface); }
.cur-ic { width: 40px; height: 40px; border-radius: 12px; background: var(--orange-soft); color: var(--orange); display: grid; place-items: center; flex: 0 0 auto; }
.cur b { display: block; }
.cur p { margin: 4px 0 0; }
.act { border-color: var(--orange-line); }
.act-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.act-head .ic { color: var(--orange); }
.big-num { font-size: 28px; font-weight: 800; letter-spacing: -.5px; }
.act .row2, .act > .btn { margin-top: 12px; }
.act textarea { margin-top: 10px; }
.gallery { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 10px 0; }
.gallery img, .gallery video { width: 100%; border-radius: 12px; display: block; background: var(--surface); }
.cardno { display: flex; align-items: center; justify-content: space-between; gap: 8px; background: var(--surface); border-radius: 12px; padding: 10px 10px 10px 14px; font: 650 15px/1.2 ui-monospace, Menlo, Consolas, monospace; margin: 8px 0; }
.cardno > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.cardno .btn { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.file-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
.fthumb img, .fthumb video { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 12px; background: var(--surface); display: block; }
.fthumb small { display: block; font-size: 11px; color: var(--ink-2); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mrow { display: flex; gap: 10px; margin-top: 12px; }
.mrow > div { flex: 1; min-width: 0; }
.mrow p { margin: 3px 0 0; white-space: pre-line; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }
.ava { width: 36px; height: 36px; border-radius: 50%; object-fit: contain; background: var(--orange-soft); padding: 3px; flex: 0 0 auto; }
.seg-tabs { display: grid; grid-template-columns: 1fr 1fr; background: var(--surface-2); border-radius: 14px; padding: 4px; }
.seg-tabs button { padding: 10px; border-radius: 11px; font-weight: 650; color: var(--ink-2); }
.seg-tabs button.on { background: linear-gradient(180deg, var(--orange-2), var(--orange)); color: #fff; box-shadow: 0 4px 12px rgba(255,101,0,.25); }
.file-list { display: grid; gap: 8px; }
.frow { display: flex; align-items: center; gap: 12px; padding: 10px; text-decoration: none; color: var(--ink); }
.frow img, .frow video { width: 64px; height: 64px; object-fit: cover; border-radius: 10px; flex: 0 0 auto; }
.frow > div { flex: 1; }
.frow small { display: block; }
.frow .ic { color: var(--ink-2); }
.thread { display: grid; gap: 10px; }
.bwrap { display: flex; gap: 8px; align-items: flex-end; }
.bwrap.me { justify-content: flex-end; }
.bwrap .bubble { max-width: 80%; padding: 9px 12px; border-radius: 16px; font-size: 14.5px; word-break: break-word; }
.bwrap.them .bubble { background: var(--surface-2); border-bottom-left-radius: 5px; }
.bwrap.me .bubble { background: var(--me); border-bottom-right-radius: 5px; }
.bubble .who { display: block; color: var(--orange); font-weight: 650; font-size: 12px; margin-bottom: 2px; }
.bubble .when { display: block; color: var(--ink-2); font-size: 11px; margin-top: 3px; text-align: right; }
.chat-bar { position: fixed; left: 0; right: 0; bottom: calc(var(--nav-h) + env(safe-area-inset-bottom)); background: var(--canvas); border-top: 1px solid var(--border); padding: 8px 12px; display: flex; gap: 8px; align-items: center; z-index: 4; max-width: 520px; margin: 0 auto; }
.chat-bar .chat-input { flex: 1; border-radius: 999px; padding: 11px 16px; background: var(--surface); }
.chat-bar .clip { width: 40px; height: 40px; display: grid; place-items: center; color: var(--ink-2); }
.chat-bar .send { width: 44px; height: 44px; border-radius: 50%; background: var(--orange); color: #fff; display: grid; place-items: center; flex: 0 0 auto; }
.chat-bar .send .ic { width: 20px; height: 20px; }
.empty { text-align: center; padding: 10px 0; display: grid; justify-items: center; gap: 8px; }
.empty img { width: auto; max-width: 260px; max-height: 220px; }
.empty h3 { margin-top: 6px; }
.empty p { color: var(--ink-2); margin: 0; }
.empty .btn { margin-top: 8px; }

/* профіль */
.prof { display: flex; gap: 14px; align-items: center; }
.ava-big { width: 84px; height: 84px; border-radius: 50%; background: var(--orange); display: grid; place-items: center; overflow: hidden; flex: 0 0 auto; }
.ava-big img { width: 88%; margin-top: 14px; }
.ic-line { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
.ic-line .ic { width: 16px; height: 16px; color: #2AABEE; }
.lbl { font-weight: 650; font-size: 14px; margin-bottom: 8px; }
.row-in { display: flex; gap: 8px; }
.row-in input { flex: 1; }
.setting { display: flex; align-items: center; gap: 12px; }
.setting > div { flex: 1; }
.setting > .ic { color: var(--ink); }
.switch { width: 52px; height: 30px; border-radius: 999px; background: var(--border); position: relative; flex: 0 0 auto; transition: background .2s; }
.switch i { position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.2); transition: left .2s; }
.switch.on { background: var(--orange); }
.switch.on i { left: 25px; }
.seg-mini { display: flex; background: var(--surface-2); border-radius: 10px; padding: 3px; }
.seg-mini button { padding: 7px 10px; border-radius: 8px; font-size: 13px; font-weight: 600; color: var(--ink-2); }
.seg-mini button.on { background: var(--canvas); color: var(--ink); box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.menu { padding: 4px 0; }
.menu-row { display: flex; align-items: center; gap: 14px; width: 100%; padding: 14px 16px; text-align: left; font-size: 16px; }
.menu-row + .menu-row { border-top: 1px solid var(--border); }
.menu-row span:not(.ic) { flex: 1; }
.menu-row .chev { color: var(--ink-2); width: 18px; height: 18px; }

/* нижня навігація */
#tabs { position: fixed; left: 0; right: 0; bottom: 0; display: flex; background: var(--canvas); border-top: 1px solid var(--border); padding: 6px 6px calc(6px + env(safe-area-inset-bottom)); z-index: 5; min-height: var(--nav-h); }
#tabs button { flex: 1; color: var(--ink-2); font-size: 11.5px; padding: 4px 0; display: grid; justify-items: center; gap: 3px; position: relative; }
#tabs button .ic { width: 25px; height: 25px; }
#tabs button.on { color: var(--orange); font-weight: 650; }
#tabs .dot { position: absolute; top: 2px; left: calc(50% + 9px); width: 9px; height: 9px; border-radius: 50%; background: var(--danger); border: 2px solid var(--canvas); }
#tabs .ico { font-size: 22px; line-height: 1.1; }
.gal { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.gal-item { display: grid; gap: 6px; text-align: left; }
.gal-item img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); }
.gal-item span { font-size: 13px; color: var(--ink-2); line-height: 1.3; }
.viewer { position: fixed; inset: 0; z-index: 20; background: rgba(10,10,12,.92); display: grid; place-items: center; align-content: center; gap: 12px; padding: 20px; }
.viewer img { max-width: 100%; max-height: 78vh; border-radius: 14px; }
.viewer p { color: #fff; margin: 0; text-align: center; }
.viewer-x { position: absolute; top: 14px; right: 14px; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,.15); color: #fff; display: grid; place-items: center; }
.finals-card { border-color: var(--ok); background: var(--ok-soft); }
.finals-card .act-head .ic { color: var(--ok); }
.final-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid var(--border); }
.final-row:first-of-type { border-top: 0; }
.final-row > div { flex: 1; min-width: 0; }
.final-row b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
.final-ic { width: 38px; height: 38px; border-radius: 10px; background: var(--canvas); color: var(--ok); display: grid; place-items: center; flex: 0 0 auto; }
.hsec { padding: 14px 14px 12px; border-radius: 18px; }
.hsec-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.hsec-head h2 { font-size: 19px; }
.link.sm { font-size: 13px; color: var(--ink-2); font-weight: 500; }
.link.sm .ic { width: 16px; height: 16px; }
.link.more { margin-top: 4px; }
.proj { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; border: 1px solid var(--border); border-radius: 16px; padding: 10px; background: var(--canvas); }
.proj-img { width: 64px; height: 64px; border-radius: 12px; object-fit: cover; flex: 0 0 auto; }
.proj-body { flex: 1; min-width: 0; display: grid; gap: 6px; }
.proj-top { display: flex; align-items: center; gap: 4px 8px; flex-wrap: wrap; }
.proj-top b { font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.tag { flex: 0 0 auto; font-size: 12px; padding: 3px 9px; border-radius: 999px; background: var(--orange-soft); color: #C44B00; font-weight: 600; }
.tag.red { background: var(--danger-soft); color: var(--danger); }
.proj-bar { display: flex; align-items: center; gap: 8px; }
.proj-bar .track { flex: 1; height: 7px; border-radius: 4px; background: #E6E9EF; overflow: hidden; }
.proj-bar .track i { display: block; height: 100%; background: var(--orange); border-radius: 4px; }
.proj-bar small { font-size: 12px; color: var(--ink-2); font-weight: 600; min-width: 34px; text-align: right; }
.proj .chev { color: var(--ink-2); width: 18px; height: 18px; margin-left: 2px; }
.proj-bar { padding-right: 2px; }
.proj-empty { display: flex; align-items: center; gap: 12px; background: var(--surface); border-radius: 14px; padding: 8px 12px 8px 4px; }
.proj-empty img { width: 70px; flex: 0 0 auto; }
.proj-empty p { margin: 3px 0 0; }
.wtiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.wtile { display: grid; gap: 6px; text-align: left; font-size: 13px; font-weight: 600; }
.wtile img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 14px; background: var(--surface); }
.hiw { display: flex; align-items: flex-start; gap: 4px; }
.hiw-step { flex: 1; display: grid; gap: 3px; min-width: 0; }
.hiw-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.hiw-num { width: 26px; height: 26px; border-radius: 50%; background: var(--orange-soft); color: var(--orange); display: grid; place-items: center; font-weight: 700; font-size: 13px; flex: 0 0 auto; }
.hiw-top img { width: 36px; height: 36px; }
.hiw-step b { font-size: 14px; }
.hiw-step small { font-size: 11.5px; color: var(--ink-2); line-height: 1.3; }
.hiw-arrow { color: #C4C8D0; padding-top: 6px; }
.hiw-arrow .ic { width: 16px; height: 16px; }
.help-card { display: flex; align-items: center; gap: 10px; border-radius: 18px; padding: 12px; }
.help-card > div { flex: 1; min-width: 0; display: grid; gap: 2px; }
.help-card b { font-size: 14.5px; line-height: 1.2; }
.help-card small { font-size: 12px; line-height: 1.3; }
.help-ic { width: 40px; height: 40px; border-radius: 12px; background: var(--surface); display: grid; place-items: center; flex: 0 0 auto; }
.help-ic .ic { width: 22px; height: 22px; }
.btn-outline { display: inline-flex; align-items: center; gap: 5px; padding: 8px 12px; border-radius: 999px; border: 1.5px solid var(--orange); color: var(--orange); font-weight: 650; font-size: 13px; white-space: nowrap; min-height: 44px; flex: 0 0 auto; }
.btn-outline .ic { width: 16px; height: 16px; }
@media (max-width: 360px) { .help-card { flex-wrap: wrap; } .hiw-step small { display: none; } }
.stars { color: #D9DCE2; letter-spacing: 1px; font-size: 14px; }
.stars i { font-style: normal; }
.stars i.on { color: #FFB020; }
.stars.lg { font-size: 22px; }
.avg { font-weight: 700; color: #E09400; font-size: 14px; }
.rscroll { display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory; margin: 0 -14px; padding: 2px 14px 4px; scrollbar-width: none; }
.rscroll::-webkit-scrollbar { display: none; }
.rcard { flex: 0 0 78%; scroll-snap-align: start; background: var(--surface); border-radius: 16px; padding: 12px 14px; display: grid; gap: 6px; align-content: start; }
.rcard p { margin: 0; font-size: 14px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
.rate-card { border-color: var(--orange-line); background: linear-gradient(180deg, var(--orange-soft), var(--canvas) 60%); }
.rate-top { display: flex; gap: 12px; align-items: center; }
.rate-top img { width: 70px; flex: 0 0 auto; }
.rate-top p { margin: 4px 0 0; }
.rate-stars { display: flex; justify-content: center; gap: 6px; margin: 12px 0 10px; }
.rate-stars button { font-size: 36px; line-height: 1; color: #D9DCE2; padding: 2px 4px; min-width: 44px; min-height: 44px; transition: transform .12s; }
.rate-stars button.on { color: #FFB020; }
.rate-stars button:active { transform: scale(1.15); }
.rate-card textarea { margin-bottom: 10px; }
.pill.orange-soft { background: var(--orange-soft); color: var(--orange); font-weight: 650; }
.pill .x { margin-left: 4px; color: var(--orange); display: inline-grid; place-items: center; }
.pill .x .ic { width: 14px; height: 14px; }
.billing { border: 1px solid var(--border); border-radius: 14px; padding: 10px 12px; margin-bottom: 10px; }
.billing summary { display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; list-style: none; }
.billing summary::-webkit-details-marker { display: none; }
.billing summary .ic { width: 18px; height: 18px; color: var(--orange); }
.billing .mini-field { display: grid; gap: 4px; margin: 8px 0; font-size: 13px; color: var(--ink-2); }
.invite { border-color: var(--orange-line); background: linear-gradient(135deg, var(--orange-soft), var(--canvas) 70%); }
.invite-top { display: flex; gap: 12px; align-items: center; }
.invite-top img { width: 76px; flex: 0 0 auto; }
.invite-top p { margin: 4px 0 0; }
.invite-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0; }
.invite-stats > div { background: var(--canvas); border: 1px solid var(--border); border-radius: 12px; padding: 8px; text-align: center; display: grid; }
.invite-stats b { font-size: 20px; color: var(--orange); }
.invite-stats small { font-size: 11.5px; color: var(--ink-2); }
.bubble.has-media { padding: 5px; }
.bubble.has-media .pre, .bubble.has-media .who, .bubble.has-media .when { padding: 0 7px; }
.bmedia { display: grid; gap: 4px; margin-bottom: 4px; }
.bmedia.n2, .bmedia.n3, .bmedia.n4 { grid-template-columns: 1fr 1fr; }
.bmedia img, .bmedia video { width: 100%; border-radius: 12px; display: block; max-height: 260px; object-fit: cover; background: var(--surface); }
.bmedia audio { width: 230px; max-width: 100%; }
.bfile { display: flex; align-items: center; gap: 8px; background: var(--canvas); border-radius: 10px; padding: 8px 10px; text-align: left; font-size: 13px; }
.bfile span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.bfile small { color: var(--ink-2); }
.ai-suggest { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px 46px; }
.ai-quote { margin: 0 0 8px 46px; display: grid; gap: 6px; justify-items: start; }
.ai-suggest button { font-size: 13.5px; padding: 6px 12px; }
.ai-rate { display: flex; gap: 6px; margin: -2px 0 6px 46px; }
.ai-rate button { padding: 4px 10px; font-size: 15px; }
.ai-fab { position: fixed; right: 16px; bottom: calc(var(--nav-h) + 16px + env(safe-area-inset-bottom)); width: 58px; height: 58px; border-radius: 50%; background: var(--orange); box-shadow: 0 6px 20px rgba(0,0,0,.22); display: grid; place-items: center; z-index: 6; padding: 0; border: 0; }
.ai-fab img { width: 44px; height: 44px; object-fit: contain; }
.ai-fab .ai-badge { position: absolute; top: -4px; right: -4px; background: var(--ink, #111); color: #fff; font-size: 10px; font-weight: 700; border-radius: 999px; padding: 2px 6px; }
#toast { position: fixed; left: 50%; bottom: calc(var(--nav-h) + 20px + env(safe-area-inset-bottom)); transform: translateX(-50%); background: rgba(20,20,20,.9); color: #fff; padding: 10px 16px; border-radius: 12px; font-size: 14px; z-index: 9; max-width: 90vw; text-align: center; }

/* студія (власник і дизайнери) — та сама стилістика */
.head { display: flex; align-items: center; gap: 12px; }
.head img { width: 44px; height: 44px; border-radius: 12px; object-fit: contain; }
.head h1 { font-size: 22px; margin: 0; line-height: 1.2; font-weight: 800; }
.head p { margin: 0; color: var(--ink-2); font-size: 13px; }
.top { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
.row { display: flex; gap: 8px; }
.row > * { flex: 1; }
.tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tile { background: var(--canvas); border: 1px solid var(--border); box-shadow: var(--shadow); color: var(--ink); border-radius: var(--r); padding: 14px; text-align: left; }
.tile .num { font-size: 24px; font-weight: 800; margin-bottom: 2px; display: flex; align-items: center; gap: 8px; }
.tile .tile-ic { width: 34px; height: 34px; padding: 7px; border-radius: 10px; background: var(--surface-2); color: var(--ink-2); }
.tile.hot .tile-ic { background: var(--orange); color: #fff; }
.tile.hot { border-color: var(--orange-line); background: var(--orange-soft); }
.tile.hot .num { color: var(--orange); }
/* оранжевий текст на світло-оранжевому фоні — трохи темніший, щоб читався */
html:not([data-theme="dark"]) .tile.hot .num, html:not([data-theme="dark"]) .badge.s-new, html:not([data-theme="dark"]) .fin-tile.hot .num { color: #C2410C; }
.orow { display: block; width: 100%; text-align: left; color: var(--ink); }
.one { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 4px 0 8px; }
.badges { display: flex; flex-wrap: wrap; gap: 5px; }
.badge { font-size: 12px; padding: 4px 9px; border-radius: 999px; background: var(--surface-2); color: var(--ink-2); white-space: nowrap; }
.badge.red { color: var(--danger); background: var(--danger-soft); font-weight: 650; }
.badge.warn { color: #B26B00; background: var(--warn-soft); }
.badge.s-new { color: var(--orange); background: var(--orange-soft); font-weight: 650; }
.badge.s-in_progress { color: #B26B00; background: var(--warn-soft); }
.badge.s-done { color: var(--ok); background: var(--ok-soft); }
.chips.scroll .opt { flex: 0 0 auto; width: auto; padding: 8px 14px; border-radius: 999px; }
.fin-tiles { margin-top: 10px; }
.fin-tile .num { font-size: 18px; }
.fin-tile b { font-size: 14px; }
.fin-tile small { display: block; margin-top: 2px; }
.fin-bars { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; align-items: end; height: 150px; }
.fin-bar { display: grid; grid-template-rows: auto 1fr auto; justify-items: center; gap: 4px; height: 100%; }
.fin-col { width: 100%; max-width: 34px; height: 100%; display: flex; align-items: flex-end; background: var(--surface-2); border-radius: 8px; overflow: hidden; }
.fin-col i { display: block; width: 100%; background: var(--orange-line); border-radius: 8px 8px 0 0; }
.fin-bar.cur .fin-col i { background: var(--orange); }
.fin-v { font-size: 11px; font-weight: 700; min-height: 14px; }
.fin-svc { display: grid; gap: 4px; padding: 8px 0; border-top: 1px solid var(--border); }
.fin-svc:first-of-type { border-top: 0; }
.fin-track { display: block; height: 8px; border-radius: 99px; background: var(--surface-2); overflow: hidden; }
.fin-track i { display: block; height: 100%; background: var(--orange); border-radius: 99px; }
.fin-debt { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; padding: 10px 0; border-top: 1px solid var(--border); }
.fin-debt:first-of-type { border-top: 0; }
.fin-debt > div { flex: 1; min-width: 0; }
.fin-debt small { display: block; }
.fin-debt .chev { width: 18px; height: 18px; color: var(--ink-2); }
.ex-pick { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
.ex-item { display: grid; gap: 4px; padding: 4px; border: 1.5px solid var(--border); border-radius: 12px; background: var(--canvas); }
.ex-item img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; }
.ex-item.done { opacity: .55; }
.ex-item small { font-size: 11px; color: var(--ink-2); }
.ps-list { display: grid; gap: 6px; }
.ps-list .opt { padding: 10px 12px; font-weight: 600; }
.ps-list .opt:disabled { opacity: 1; }
.ps-check { display: flex; gap: 10px; align-items: center; justify-content: flex-start; margin-top: 12px; font-size: 14px; text-align: left; }
.studio-mode .ps-check input, .ps-check input { width: 20px; height: 20px; min-height: 0; flex: 0 0 20px; margin: 0; padding: 0; accent-color: var(--orange); }
.ps-check span { flex: 1; }
.studio-mode .lines { white-space: pre-line; font-size: 14px; margin: 4px 0 10px; }
.studio-mode .thread { max-height: 420px; overflow-y: auto; gap: 6px; margin: 0 0 8px; }
.bubble.in, .bubble.out { max-width: 85%; padding: 8px 11px; border-radius: 14px; font-size: 14px; white-space: pre-line; word-break: break-word; }
.bubble.in { background: var(--surface-2); justify-self: start; border-bottom-left-radius: 4px; }
.bubble.out { background: var(--orange-soft); justify-self: end; border-bottom-right-radius: 4px; }
.bubble.in .when, .bubble.out .when { font-size: 11px; color: var(--ink-2); margin-top: 3px; text-align: left; }
.voice { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
.voice audio, .voice video { flex: 1; max-width: 100%; }
.filelink { display: block; padding: 10px; background: var(--surface); border-radius: 10px; font-size: 13px; }
.action { border-top: 1px solid var(--border); margin-top: 12px; padding-top: 12px; }
.studio-mode .card h3 { margin-bottom: 6px; }
.studio-mode .btn { min-height: 46px; font-size: 15px; }
.studio-mode .btn + .btn { margin-top: 8px; }
.studio-mode .row .btn + .btn { margin-top: 0; }
`;

export const CLIENT_JS = String.raw`
(function () {
  'use strict';
  var tg = window.Telegram && window.Telegram.WebApp;
  var initData = tg ? tg.initData : '';
  var S = null;                 // стан із сервера
  var view = { tab: 'home', page: null, params: {} };  // поточний екран
  var history = [];             // стек для кнопки «Назад»
  var busy = false, uploading = 0;
  var form = { service: '', step: 1, typeKey: 'static', qtyKey: '10', packageId: '', qtyCustom: '', hero: '', styleId: 'any', emotions: '',
    title: '', description: '', deadline: '', budget: '', need: 'new', contact: '', promo: '', refs: [], repeatOf: 0, aiUsed: false, projPkg: '', like: null };
  var openCustom = false, showPromo = false, briefError = '', briefDone = null, aiBusy = false, aiTries = 0;
  var changesOpen = {}, svcTab = 'about', catQuery = '', catChip = '', chatTimer = null, chatNew = {};

  var ICONS = {"arrow-right": "<path d=\"M3 12h18m-7-7 7 7-7 7\"/>", "bell": "<path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4\"/>", "bot": "<rect x=\"3\" y=\"7\" width=\"18\" height=\"14\" rx=\"5\"/><path d=\"M12 7V3M9 3h6\"/><circle cx=\"9\" cy=\"14\" r=\"1\" fill=\"currentColor\"/><circle cx=\"15\" cy=\"14\" r=\"1\" fill=\"currentColor\"/>", "calendar": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M7 3v4M17 3v4M3 10h18\"/>", "catalog": "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"/>", "characters": "<circle cx=\"9\" cy=\"8\" r=\"4\"/><path d=\"M2 21v-2a7 7 0 0 1 14 0v2\"/><path d=\"M17 5a4 4 0 0 1 0 7M18 15a6 6 0 0 1 4 6\"/>", "check-circle": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m7 12 3.5 3.5L17 9\"/>", "check": "<path d=\"m4 12 5 5L20 6\"/>", "chevron-left": "<path d=\"m15 5-7 7 7 7\"/>", "chevron-right": "<path d=\"m9 5 7 7-7 7\"/>", "clock": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 6v6l4 3\"/>", "close": "<path d=\"M5 5 19 19M19 5 5 19\"/>", "download": "<path d=\"M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3\"/>", "edit": "<path d=\"M3 21l4-1 13-13-3-3L4 17l-1 4zM15 6l3 3\"/>", "external": "<path d=\"M14 4h6v6M20 4l-10 10M18 14v6H4V6h6\"/>", "eye": "<path d=\"M2 12Q12 1 22 12 12 23 2 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>", "files": "<path d=\"M4 7V4a2 2 0 0 1 2-2h4l2 3h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z\"/>", "filter": "<path d=\"M3 6h18M6 12h12M9 18h6\"/>", "heart": "<path d=\"M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1C-2 12 12 22 12 22S26 12 20 5Z\"/>", "help": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 4M12 18h.01\"/>", "home": "<path d=\"m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z\"/>", "info": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6M12 7h.01\"/>", "menu": "<path d=\"M4 6h16M4 12h16M4 18h16\"/>", "message": "<path d=\"M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 1 1 21 11.5Z\"/>", "orders": "<rect x=\"5\" y=\"3\" width=\"14\" height=\"18\" rx=\"2\"/><path d=\"M9 8h6M9 12h6M9 16h4\"/>", "paperclip": "<path d=\"m8 12 6-6a4 4 0 0 1 6 6l-9 9a6 6 0 0 1-8-8l9-9\"/>", "plus": "<path d=\"M12 4v16M4 12h16\"/>", "refresh": "<path d=\"M20 9a8 8 0 0 0-14-4L3 8m0-5v5h5M4 15a8 8 0 0 0 14 4l3-3m0 5v-5h-5\"/>", "search": "<circle cx=\"10\" cy=\"10\" r=\"7\"/><path d=\"m15 15 6 6\"/>", "send": "<path d=\"m22 2-7 20-4-9-9-4 20-7ZM11 13l11-11\"/>", "settings": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2\"/>", "shield": "<path d=\"m12 2 8 3v6c0 6-4 9-8 11-4-2-8-5-8-11V5z\"/>", "sticker": "<path d=\"M5 2h10l6 6v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3z\"/><path d=\"M15 2v6h6\"/><circle cx=\"8\" cy=\"12\" r=\".7\" fill=\"currentColor\"/><circle cx=\"14\" cy=\"12\" r=\".7\" fill=\"currentColor\"/><path d=\"M7.5 16q3.5 3 7 0\"/>", "trash": "<path d=\"M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6\"/>", "upload": "<path d=\"M12 16V3m-5 5 5-5 5 5M4 17v4h16v-4\"/>", "mic": "<rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5 11a7 7 0 0 0 14 0M12 18v3\"/>", "camera": "<path d=\"M4 8h3l2-3h6l2 3h3v11H4z\"/><circle cx=\"12\" cy=\"13\" r=\"3.5\"/>", "wallet": "<rect x=\"3\" y=\"6\" width=\"18\" height=\"14\" rx=\"3\"/><path d=\"M3 10h18M16 15h2M6 6l9-3 1 3\"/>", "user": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21v-2a8 8 0 0 1 16 0v2\"/>"};
  var I18N = {
    uk: {
      home: 'Головна', catalog: 'Послуги', orders: 'Замовлення', profile: 'Профіль',
      reviewsT: 'Відгуки', reviewsN: ['{n} відгук', '{n} відгуки', '{n} відгуків'], rateTitle: 'Як вам результат?', rateText: 'Поставте оцінку й напишіть кілька слів — нам дуже важливо 🧡', ratePh: 'Що сподобалось? Що можна зробити ще краще?', rateSend: 'Надіслати відгук', rateThanks: 'Дякуємо за відгук!', yourReview: 'Ваш відгук', rateNeed: 'Оберіть оцінку',
      orderAgain: 'Замовити ще', extendPack: 'Доповнити пак', repeatOf: 'Доповнення до #{n}', repeatNote: 'Дані з попереднього замовлення вже заповнені — змініть, що потрібно.',
      inviteT: 'Запросити друга', inviteLocked: 'Стане доступно, щойно ваше перше замовлення буде готове.', inviteText: 'Друг отримає знижку {p}% на перше замовлення, а ви — бонус {p}% на наступне.', inviteShare: 'Поділитися', inviteCopy: 'Копіювати посилання', invited: 'Запрошено', invOrdered: 'Замовили', invBonus: 'Ваші бонуси', shareText: 'Стікери, персонажі й Telegram-боти — у YABOT 🎨 За цим посиланням знижка {p}% на перше замовлення!',
      docsT: 'Документи', billingT: 'Реквізити платника', bName: 'Компанія або ФОП', bCode: 'Код ЄДРПОУ / ІПН', bAddr: 'Адреса', bSigner: 'Підписант', bSave: 'Зберегти реквізити', invoicePdf: 'Рахунок PDF', actPdf: 'Акт PDF', docsHint: 'Заповніть реквізити — вони потраплять у рахунок і акт.', saved2: 'Збережено',
      myProjects: 'Мої проєкти', allOrders: 'Усі замовлення', stage: 'Етап', noProjects: 'Проєктів поки немає', noProjectsText: 'Створіть замовлення — і тут з’явиться ваш проєкт із прогресом.',
      ourWorks: 'Наші роботи', howItWorks: 'Як це працює', hw1: 'Ідея', hw1t: 'Обговорюємо ваші задачі', hw2: 'Дизайн', hw2t: 'Створюємо концепцію', hw3: 'Результат', hw3t: 'Ви отримуєте готовий продукт',
      needHelp: 'Потрібна допомога?', needHelpText: 'Відповімо на всі ваші питання у Telegram.', writeUs: 'Написати нам', portfolio: 'Портфоліо', worksStickers: 'Стікерпаки', worksBots: 'Telegram-боти', worksChars: 'Персонажі',
      pr_new: 'Дизайнер вивчає бриф', pr_work: 'Робота над проєктом', pr_sketch: 'Погодження ескізів', pr_changes: 'Вносимо правки', pr_final: 'Фінальна версія', pr_done: 'Готово', stageOf: 'Етап {n} з {m}', fixTitle: 'Щось варто виправити?', fixText: 'Опишіть правку — дизайнер внесе зміни. Можна до {d}.', fixBtn: 'Потрібна правка', fixPh: 'Що саме поправити?', fixSend: 'Надіслати правку', fixWait: 'Правку прийнято — дизайнер працює над нею', fixDoneT: 'Правку внесено', likeBtn: 'Хочу так само', likeTag: 'Як у прикладі', likeRow: 'Як у прикладі', micDenied: 'Немає доступу до мікрофона. Дозвольте його Telegram у налаштуваннях телефону або надішліть голосове в чаті бота.', recShort: 'Запис закороткий', recording: 'Запис… до 2 хв', planTitle: 'План оплати', planStage: 'Етап «{s}»', pl_paid: '✅ Оплачено', pl_awaiting: '⏳ Очікує оплати', pl_due: 'До оплати', pl_later: 'Пізніше', rpHint: '🎁 За відгук — промокод −{p}% на наступне замовлення', rpGot: 'Ваш промокод на наступне замовлення', rpAuto: 'Підставиться в наступну заявку сам', replyMin: 'Зазвичай відповідаємо за ~{n} хв', replyHour: 'Зазвичай відповідаємо за ~{n} год', qTitle: 'Коли почнемо', qSoon: 'Можемо взятися вже найближчими днями 🚀', qDays: ['Почнемо приблизно через {n} день', 'Почнемо приблизно через {n} дні', 'Почнемо приблизно через {n} днів'], qOpen: ['Зараз у роботі {n} проєкт.', 'Зараз у роботі {n} проєкти.', 'Зараз у роботі {n} проєктів.'], qNote: 'Точний термін дизайнер підтвердить у кошторисі.', newMsgs: ['{n} нове повідомлення', '{n} нові повідомлення', '{n} нових повідомлень'], newDivider: 'Нові повідомлення', bnUntil: 'Діє до {d}', bnCode: 'Промокод', bnOrder: 'Замовити', pkgQ: 'Пакет', pkgNone: 'Без пакета — обговоримо', pkgNoneHint: 'Дизайнер підбере рішення під задачу', pkgsTitle: 'Пакети', stCheck: 'Перевірте етап', stOk: 'Все добре', stChanges: 'Є зауваження', stChangesPh: 'Що варто змінити?', stOpen: 'Відкрити демо', stSend: 'Надіслати', stAccepted: 'Ви прийняли цей етап', stCommented: 'Ви залишили зауваження', aiHelp: 'Допоможіть з ідеями', aiMore: 'Ще ідеї', aiThinking: 'Підбираємо ідеї…', aiNeedHero: 'Спершу опишіть головного героя', aiNeedTitle: 'Спершу вкажіть назву проєкту', aiDone: 'Готово! Відредагуйте, як вам зручно', aiNote: 'Ідеї від ІІ — можна змінювати як завгодно', more2: 'Ще {n}', yourAction: 'Ваша дія', aiPhotoBad: 'Не вдалося відкрити фото — спробуйте інше.',
      hello: 'Привіт! Я YABOT', helloName: 'Привіт, {name}!', heroText: 'Допомагаю створювати стильні цифрові продукти для вашого бренду швидко та з любов’ю.',
      createOrder: 'Створити замовлення', from: 'від', order: 'Замовити', next: 'Далі', back: 'Назад',
      catTitle: 'Каталог послуг', catSub: 'Оберіть напрям — і ми допоможемо стартувати швидко.', search: 'Пошук послуг…', nothing: 'Нічого не знайдено',
      tabAbout: 'Опис', tabIncludes: 'Що входить', tabSteps: 'Етапи', tabFaq: 'FAQ', examples: 'Приклади робіт', examplesStk: 'Приклади стікерів', seeAll: 'Дивитися всі', stickers: 'стікерів',
      openPack: 'Відкрити пак', worksTitle: 'Наші роботи', noFaq: 'Питань поки немає — напишіть своє в профілі.',
      newOrder: 'Створити замовлення', newOrderSub: 'Розкажіть про ваш проєкт — ми підберемо найкраще рішення.',
      stService: 'Послуга', stDetails: 'Деталі', stRefs: 'Референси', stConfirm: 'Підтвердження',
      chooseService: 'Оберіть послугу',
      typeQ: 'Тип стікерів', static: 'Статичні', animated: 'Анімовані', staticHint: 'картинки', animatedHint: 'рухаються',
      qtyQ: 'Скільки стікерів', packages: 'Готові пакети', orQty: 'або оберіть кількість', custom: 'Свій варіант', customPh: 'Наприклад: 30 стікерів',
      heroQ: 'Головний герой', heroHint: 'Хто на стікерах: ви, улюбленець, персонаж бренду? Зовнішність і характер.', heroPh: 'Рудий кіт у великих окулярах, трохи ледачий…',
      styleQ: 'Стиль', styleAny: 'На розсуд дизайнера',
      emoQ: 'Емоції та фрази', emoHint: 'Які емоції й підписи потрібні? Можна списком.', emoPh: 'Привіт, дякую, ок, сміюся, сумую…',
      titleQ: 'Назва проєкту', titlePh: 'Бот для нашої кав’ярні', descQ: 'Короткий опис', descPh: 'Опишіть ідею, цілі, бажаний стиль та інші важливі деталі…',
      deadlineQ: 'Дедлайн', budgetQ: 'Бюджет', needQ: 'Що потрібно?', need_new: 'Новий проєкт', need_redesign: 'Редизайн', need_consult: 'Консультація',
      budgets: ['до 5 000 грн', '5–15 тис. грн', '15–50 тис. грн', 'понад 50 тис. грн', 'Ще не знаю'],
      refsQ: 'Додати референси', refsHint: 'Зображення, приклади, скріншоти — до 10 фото.', addPhoto: 'Додати фото', refsNote: 'Голосові й інші файли можна надіслати в чат бота після заявки.',
      contactQ: 'Контакт для зв’язку', contactPh: '@username або телефон', promoAsk: 'Є промокод?', promoPh: 'Промокод',
      confirmTitle: 'Перевірте заявку', edit: 'Змінити', send: 'Надіслати заявку', sending: 'Надсилаємо…',
      tipTitle: 'Не хвилюйтеся!', tipText: 'Можна додати будь-які ідеї та приклади. Ми допоможемо все оформити 🙂',
      sent: 'Заявку надіслано!', sentText: 'Дизайнер подивиться бриф і напише вам. Слідкуйте за статусом у «Замовленнях».', toOrder: 'Перейти до замовлення', toHome: 'На головну',
      ordersTitle: 'Мої замовлення', ordersSub: 'Тут усі ваші проєкти та їхній статус.', noOrders: 'Замовлень поки немає', noOrdersText: 'Оберіть послугу — і почнемо!',
      s1: 'Заявка', s2: 'У роботі', s3: 'Погодження', s4: 'Готово', rejected: 'Відхилено', cancelled: 'Скасовано',
      st_new: 'Нова', st_in_progress: 'В роботі', st_done: 'Готово', st_rejected: 'Відхилено', st_cancelled: 'Скасовано',
      deadline: 'Дедлайн', chat: 'Чат', files: 'Файли', needAction: 'Потрібна ваша дія', toOrders: 'До замовлень', orderN: 'Замовлення #{n}',
      stages: 'Етапи', current: 'Поточний етап', startedAt: 'Розпочато', lastFiles: 'Останні файли', lastComments: 'Останні коментарі', more: 'Більше',
      openChat: 'Відкрити чат', viewFiles: 'Переглянути файли', price: 'Вартість', paid: 'Оплачено',
      cur_new: 'Дизайнер вивчає бриф і скоро напише вам.', cur_work: 'Дизайнер працює над вашим проєктом.', cur_sketch: 'Ескізи чекають на ваше рішення.', cur_changes: 'Дизайнер вносить правки.', cur_done: 'Проєкт завершено. Дякуємо!',
      quote: 'Кошторис від дизайнера', quoteDays: 'Термін: {n} дн. після погодження', quoteDue: 'Термін: до {d}', accept: 'Погоджую', ask: 'Є питання', asked: 'Питання передано — дизайнер напише вам.',
      sketch: 'Ескізи на погодження', version: 'версія', moreFiles: 'Ще файлів у чаті бота: {n}', approve: 'Погоджую', changes: 'Є правки', changesPh: 'Що змінити?', sendChanges: 'Надіслати правки',
      pay: 'Оплата', advance: 'Аванс', final: 'Залишок', full: 'Оплата', payBtn: 'Оплатити', cardTo: 'Переказ на картку', copy: 'Копіювати', copied: 'Скопійовано', recipient: 'Отримувач', iPaid: 'Я оплатив(ла)', checking: 'Перевіряємо надходження — підтвердимо в чаті.',
      addPack: 'Додати стікерпак', cancel: 'Скасувати заявку', cancelQ: 'Чому скасовуєте?', r0: 'Передумав(ла)', r1: 'Задорого', r3: 'Інша причина',
      finalsTitle: 'Фінальні файли', download: 'Завантажити', openLink: 'Відкрити', inChat: 'файл у чаті бота', finalsReady: 'Ваші готові файли вже тут!',
      filesTitle: 'Файли проєкту', addFile: 'Додати файл', noFiles: 'Файлів поки немає', noFilesText: 'Тут з’являться ваші референси та ескізи від дизайнера.', fromYou: 'Ваш референс', sketchV: 'Ескіз, версія {n}',
      chatTitle: 'Чат по проєкту', msgPh: 'Написати повідомлення…', noMsgs: 'Повідомлень поки немає — напишіть дизайнеру!', studio: 'Студія YABOT', you: 'Ви',
      profTitle: 'Профіль', profSub: 'Ваш обліковий запис та налаштування YABOT.', notif: 'Новини та акції', notifText: 'Повідомлення про замовлення приходять завжди', language: 'Мова',
      history: 'Історія замовлень', help: 'Часті питання', askQ: 'Поставити питання', pricesT: 'Ціни', contactEdit: 'Контакт для зв’язку', save: 'Зберегти', saved: 'Збережено',
      askPh: 'Ваше питання дизайнеру', askSend: 'Надіслати', askSent: 'Надіслано — відповідь прийде в чат бота.',
      aiTitle: 'Помічник YABOT', aiWho: 'ІІ-помічник', aiPh: 'Напишіть питання…', aiHello: 'Привіт! Я ІІ-помічник студії YABOT. Розкажу про стікерпаки, персонажів і ботів, ціни й етапи роботи. Якщо потрібно — передам питання дизайнеру.',
      aiThinking: 'Друкує…', aiQuoteBtn: 'Оформити замовлення', aiQuoteNote: 'Точну ціну підтвердить дизайнер після брифу', aiThanks: 'Дякуємо за оцінку!', aiForwarded: 'Передали ваше питання студії — відповідь прийде сюди й у чат бота.', pricesNone: 'Точну ціну назве дизайнер після брифу.',
      openFromTg: 'Відкрийте застосунок із чату бота в Telegram.', err: 'Щось пішло не так. Спробуйте ще раз.', retry: 'Спробувати ще раз',
      uploadErr: 'Не вдалося завантажити фото', waitUpload: 'Зачекайте, фото ще завантажуються…', required: 'Заповніть обов’язкові поля', uah: 'грн', studioBtn: 'Студія'
    },
    en: {
      home: 'Home', catalog: 'Services', orders: 'Orders', profile: 'Profile',
      reviewsT: 'Reviews', reviewsN: ['{n} review', '{n} reviews', '{n} reviews'], rateTitle: 'How do you like the result?', rateText: 'Rate it and write a few words — it means a lot to us 🧡', ratePh: 'What did you like? What could be even better?', rateSend: 'Send review', rateThanks: 'Thank you for the review!', yourReview: 'Your review', rateNeed: 'Choose a rating',
      orderAgain: 'Order again', extendPack: 'Extend the pack', repeatOf: 'Addition to #{n}', repeatNote: 'Details from the previous order are already filled in — change what you need.',
      inviteT: 'Invite a friend', inviteLocked: 'Available once your first order is completed.', inviteText: 'Your friend gets {p}% off the first order, and you get a {p}% bonus on the next one.', inviteShare: 'Share', inviteCopy: 'Copy link', invited: 'Invited', invOrdered: 'Ordered', invBonus: 'Your bonuses', shareText: 'Stickers, characters and Telegram bots — at YABOT 🎨 This link gives {p}% off the first order!',
      docsT: 'Documents', billingT: 'Payer details', bName: 'Company', bCode: 'Company code', bAddr: 'Address', bSigner: 'Signatory', bSave: 'Save details', invoicePdf: 'Invoice PDF', actPdf: 'Act PDF', docsHint: 'Fill in the details — they will appear on the invoice and act.', saved2: 'Saved',
      myProjects: 'My projects', allOrders: 'All orders', stage: 'Stage', noProjects: 'No projects yet', noProjectsText: 'Create an order — and your project with its progress will appear here.',
      ourWorks: 'Our works', howItWorks: 'How it works', hw1: 'Idea', hw1t: 'We discuss your goals', hw2: 'Design', hw2t: 'We create the concept', hw3: 'Result', hw3t: 'You get a finished product',
      needHelp: 'Need help?', needHelpText: 'We will answer all your questions in Telegram.', writeUs: 'Write to us', portfolio: 'Portfolio', worksStickers: 'Sticker packs', worksBots: 'Telegram bots', worksChars: 'Characters',
      pr_new: 'The designer is reviewing the brief', pr_work: 'Working on the project', pr_sketch: 'Sketch approval', pr_changes: 'Making changes', pr_final: 'Final version', pr_done: 'Done', stageOf: 'Stage {n} of {m}', fixTitle: 'Something to fix?', fixText: 'Describe the fix — the designer will make the changes. Available until {d}.', fixBtn: 'I need a fix', fixPh: 'What exactly should be fixed?', fixSend: 'Send the fix request', fixWait: 'Fix request received — the designer is working on it', fixDoneT: 'The fix is done', likeBtn: 'I want the same', likeTag: 'Like the example', likeRow: 'Like the example', micDenied: 'No microphone access. Allow it for Telegram in the phone settings or send a voice message in the bot chat.', recShort: 'The recording is too short', recording: 'Recording… up to 2 min', planTitle: 'Payment plan', planStage: 'Stage «{s}»', pl_paid: '✅ Paid', pl_awaiting: '⏳ Awaiting payment', pl_due: 'Due', pl_later: 'Later', rpHint: '🎁 Leave a review — get {p}% off your next order', rpGot: 'Your promo code for the next order', rpAuto: 'It will be applied to your next request automatically', replyMin: 'We usually reply within ~{n} min', replyHour: 'We usually reply within ~{n} h', qTitle: 'When we start', qSoon: 'We can start within the next few days 🚀', qDays: ['We will start in about {n} day', 'We will start in about {n} days', 'We will start in about {n} days'], qOpen: ['{n} project in progress now.', '{n} projects in progress now.', '{n} projects in progress now.'], qNote: 'The designer will confirm the exact timing in the quote.', newMsgs: ['{n} new message', '{n} new messages', '{n} new messages'], newDivider: 'New messages', bnUntil: 'Valid till {d}', bnCode: 'Promo code', bnOrder: 'Order now', pkgQ: 'Package', pkgNone: 'No package — let us discuss', pkgNoneHint: 'The designer will tailor a solution', pkgsTitle: 'Packages', stCheck: 'Check the stage', stOk: 'All good', stChanges: 'I have comments', stChangesPh: 'What should we change?', stOpen: 'Open demo', stSend: 'Send', stAccepted: 'You accepted this stage', stCommented: 'You left comments', aiHelp: 'Help me with ideas', aiMore: 'More ideas', aiThinking: 'Coming up with ideas…', aiNeedHero: 'Describe the main character first', aiNeedTitle: 'Enter the project name first', aiDone: 'Done! Edit it any way you like', aiNote: 'AI suggestions — feel free to change anything', more2: '{n} more', yourAction: 'Action needed', aiPhotoBad: 'Could not open the photo — try another one.',
      hello: 'Hi! I am YABOT', helloName: 'Hi, {name}!', heroText: 'I help create stylish digital products for your brand — fast and with love.',
      createOrder: 'Create an order', from: 'from', order: 'Order', next: 'Next', back: 'Back',
      catTitle: 'Services', catSub: 'Pick a direction — we will help you start fast.', search: 'Search services…', nothing: 'Nothing found',
      tabAbout: 'About', tabIncludes: 'Included', tabSteps: 'Steps', tabFaq: 'FAQ', examples: 'Our works', examplesStk: 'Sticker examples', seeAll: 'See all', stickers: 'stickers',
      openPack: 'Open pack', worksTitle: 'Our works', noFaq: 'No questions yet — ask yours in the profile.',
      newOrder: 'Create an order', newOrderSub: 'Tell us about your project — we will find the best solution.',
      stService: 'Service', stDetails: 'Details', stRefs: 'References', stConfirm: 'Confirm',
      chooseService: 'Choose a service',
      typeQ: 'Sticker type', static: 'Static', animated: 'Animated', staticHint: 'pictures', animatedHint: 'moving',
      qtyQ: 'How many stickers', packages: 'Packages', orQty: 'or choose a quantity', custom: 'Custom', customPh: 'E.g. 30 stickers',
      heroQ: 'Main character', heroHint: 'Who is on the stickers: you, a pet, a brand character? Looks and personality.', heroPh: 'A ginger cat in big glasses, a bit lazy…',
      styleQ: 'Style', styleAny: 'Designer’s choice',
      emoQ: 'Emotions and phrases', emoHint: 'Which emotions and captions do you need? A list is fine.', emoPh: 'Hi, thanks, ok, laughing, sad…',
      titleQ: 'Project name', titlePh: 'A bot for our coffee shop', descQ: 'Short description', descPh: 'Describe the idea, goals, desired style and other important details…',
      deadlineQ: 'Deadline', budgetQ: 'Budget', needQ: 'What do you need?', need_new: 'New project', need_redesign: 'Redesign', need_consult: 'Consultation',
      budgets: ['up to 5,000 UAH', '5–15k UAH', '15–50k UAH', 'over 50k UAH', 'Not sure yet'],
      refsQ: 'Add references', refsHint: 'Images, examples, screenshots — up to 10 photos.', addPhoto: 'Add photo', refsNote: 'Voice messages and other files can be sent in the bot chat after the request.',
      contactQ: 'Contact', contactPh: '@username or phone', promoAsk: 'Have a promo code?', promoPh: 'Promo code',
      confirmTitle: 'Check your request', edit: 'Edit', send: 'Send request', sending: 'Sending…',
      tipTitle: 'Don’t worry!', tipText: 'Add any ideas and examples. We will help shape everything 🙂',
      sent: 'Request sent!', sentText: 'The designer will review the brief and message you. Follow the status in Orders.', toOrder: 'Go to the order', toHome: 'Home',
      ordersTitle: 'My orders', ordersSub: 'All your projects and their status.', noOrders: 'No orders yet', noOrdersText: 'Pick a service — and let’s start!',
      s1: 'Request', s2: 'In progress', s3: 'Approval', s4: 'Done', rejected: 'Declined', cancelled: 'Cancelled',
      st_new: 'New', st_in_progress: 'In progress', st_done: 'Done', st_rejected: 'Declined', st_cancelled: 'Cancelled',
      deadline: 'Deadline', chat: 'Chat', files: 'Files', needAction: 'Your action is needed', toOrders: 'To orders', orderN: 'Order #{n}',
      stages: 'Stages', current: 'Current stage', startedAt: 'Started', lastFiles: 'Latest files', lastComments: 'Latest comments', more: 'More',
      openChat: 'Open chat', viewFiles: 'View files', price: 'Price', paid: 'Paid',
      cur_new: 'The designer is reviewing the brief and will message you soon.', cur_work: 'The designer is working on your project.', cur_sketch: 'Sketches are waiting for your decision.', cur_changes: 'The designer is making changes.', cur_done: 'The project is complete. Thank you!',
      quote: 'Quote from the designer', quoteDays: 'Deadline: {n} days after approval', quoteDue: 'Deadline: by {d}', accept: 'I approve', ask: 'I have questions', asked: 'Question sent — the designer will message you.',
      sketch: 'Sketches for approval', version: 'version', moreFiles: 'More files in the bot chat: {n}', approve: 'Approve', changes: 'Request changes', changesPh: 'What should change?', sendChanges: 'Send changes',
      pay: 'Payment', advance: 'Advance', final: 'Balance', full: 'Payment', payBtn: 'Pay', cardTo: 'Card transfer', copy: 'Copy', copied: 'Copied', recipient: 'Recipient', iPaid: 'I have paid', checking: 'Checking the payment — we will confirm in the chat.',
      addPack: 'Add sticker pack', cancel: 'Cancel request', cancelQ: 'Why are you cancelling?', r0: 'Changed my mind', r1: 'Too expensive', r3: 'Other reason',
      finalsTitle: 'Final files', download: 'Download', openLink: 'Open', inChat: 'file in the bot chat', finalsReady: 'Your final files are here!',
      filesTitle: 'Project files', addFile: 'Add file', noFiles: 'No files yet', noFilesText: 'Your references and the designer’s sketches will appear here.', fromYou: 'Your reference', sketchV: 'Sketch, version {n}',
      chatTitle: 'Project chat', msgPh: 'Write a message…', noMsgs: 'No messages yet — write to the designer!', studio: 'YABOT studio', you: 'You',
      profTitle: 'Profile', profSub: 'Your YABOT account and settings.', notif: 'News and offers', notifText: 'Order notifications always arrive', language: 'Language',
      history: 'Order history', help: 'FAQ', askQ: 'Ask a question', pricesT: 'Prices', contactEdit: 'Contact', save: 'Save', saved: 'Saved',
      askPh: 'Your question to the designer', askSend: 'Send', askSent: 'Sent — the reply will come to the bot chat.',
      aiTitle: 'YABOT assistant', aiWho: 'AI assistant', aiPh: 'Type your question…', aiHello: 'Hi! I am the AI assistant of YABOT studio. Ask me about sticker packs, characters and bots, prices and the process. If needed, I will pass your question to a designer.',
      aiThinking: 'Typing…', aiQuoteBtn: 'Place the order', aiQuoteNote: 'The designer will confirm the exact price after the brief', aiThanks: 'Thanks for the feedback!', aiForwarded: 'Your question was passed to the studio — the reply will come here and to the bot chat.', pricesNone: 'The designer will quote the exact price after the brief.',
      openFromTg: 'Open the app from the bot chat in Telegram.', err: 'Something went wrong. Please try again.', retry: 'Try again',
      uploadErr: 'Could not upload the photo', waitUpload: 'Please wait, photos are still uploading…', required: 'Fill in the required fields', uah: 'UAH', studioBtn: 'Studio'
    }
  };
  var lang = 'uk';
  function t(k, vars) {
    var s = (I18N[lang] && I18N[lang][k] !== undefined) ? I18N[lang][k] : I18N.uk[k];
    if (s === undefined) return k;
    if (vars && typeof s === 'string') for (var v in vars) s = s.split('{' + v + '}').join(vars[v]);
    return s;
  }
  var QTY = { '5': '5', '10': '10', '15-20': '15–20' };
  var ROBOT_STICKERS = ['wave', 'love', 'celebration', 'cool', 'sleepy', 'thinking', 'thumbsup', 'wink_thumbsup'];

  // ---------- helpers ----------
  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else if (k === 'class') n.className = v;
      else if (k === 'value') n.value = v;
      else if (k === 'style') n.style.cssText = v; // через CSSOM — CSP не дозволяє атрибут style
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) add(n, arguments[i]);
    return n;
  }
  function add(n, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(n, x); }); return; }
    n.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  /** Іконка з UI-kit (лінійна, колір — currentColor). */
  function icon(name, cls) {
    var s = el('span', { class: 'ic ' + (cls || ''), 'aria-hidden': 'true' });
    s.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
    return s;
  }
  function money(v) { return Number(v).toLocaleString(lang === 'en' ? 'en-US' : 'uk-UA', { maximumFractionDigits: 2 }).replace(/ /g, ' ') + ' ' + t('uah'); }
  function nm(o, key) { return lang === 'en' && o[key + 'En'] ? o[key + 'En'] : o[key]; }
  function dshort(iso) { try { return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'uk-UA', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
  function dfull(iso) { try { return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } }
  function dtime(iso) { try { return new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : 'uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function haptic(kind) { try { if (kind === 'ok' || kind === 'error') tg.HapticFeedback.notificationOccurred(kind === 'ok' ? 'success' : 'error'); else tg.HapticFeedback.selectionChanged(); } catch (e) {} }
  var toastTimer = null;
  function toast(text) {
    var n = document.getElementById('toast');
    n.textContent = text; n.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { n.hidden = true; }, 2600);
  }
  function store(key, val) { try { if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null'); localStorage.setItem(key, JSON.stringify(val)); } catch (e) { return null; } }
  function svc(id) { return (S && S.services || []).filter(function (s) { return s.id === id; })[0] || null; }

  function api(name, body) {
    return fetch('api/' + name, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-init-data': initData },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || t('err'));
        return j;
      });
    });
  }
  function alertMsg(m) { try { tg.showAlert(m); } catch (e) { alert(m); } }
  function act(name, body) {
    if (busy) return Promise.resolve();
    busy = true; render();
    return api(name, body).then(function (r) {
      busy = false;
      if (r.state) S = r.state;
      haptic('ok'); render();
      return r;
    }).catch(function (e) { busy = false; haptic('error'); render(); alertMsg(e.message); throw e; });
  }
  function refresh() { return api('boot').then(function (s) { S = s; render(); }).catch(function () {}); }
  // Повернулися в Mini App (з оплати, з чату бота…) — тихо підтягуємо свіжий стан
  var lastSync = Date.now();
  function resync() {
    if (busy || Date.now() - lastSync < 5000) return;
    var a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.value) return;
    lastSync = Date.now();
    if (mode === 'studio') {
      if (!ST) return;
      if (stab === 'money') FIN = null;
      var oid = stab === 'order' && OD ? OD.id : null;
      Promise.all([loadStudio(), oid ? sapi('order', { id: oid }) : null]).then(function (r) {
        if (oid && r[1] && stab === 'order' && OD && OD.id === oid) OD = r[1];
        if (!busy) render();
      }).catch(function () {});
      return;
    }
    if (!S || view.page === 'wizard' || view.page === 'ask') return;
    refresh();
  }

  // ---------- навігація ----------
  function syncBack() {
    try { if (history.length || view.page) tg.BackButton.show(); else tg.BackButton.hide(); } catch (e) {}
  }
  function go(tab) {
    view = { tab: tab, page: null, params: {} }; history = []; briefDone = null; haptic();
    render(); window.scrollTo(0, 0); syncBack();
  }
  function push(page, params) {
    history.push(view); view = { tab: view.tab, page: page, params: params || {} }; haptic();
    render(); window.scrollTo(0, 0); syncBack();
  }
  function back() {
    if (view.page === 'wizard' && form.step > 1 && !briefDone) { form.step--; saveForm(); render(); window.scrollTo(0, 0); return; }
    view = history.pop() || { tab: view.tab, page: null, params: {} }; render(); window.scrollTo(0, 0); syncBack();
  }
  function stageAsk(o) {
    if (!o.stage || o.status !== 'in_progress') return null;
    var i = o.stage.idx, info = (o.stage.info || {})[i];
    return info && info.ask && !info.answer ? { idx: i, info: info, name: (lang === 'en' ? o.stage.stepsEn : o.stage.steps)[i] } : null;
  }
  function needsAction(o) { return Boolean(o.quote && o.quote.status === 'sent') || Boolean(o.sketch) || Boolean(o.pay && o.pay.status !== 'reported') || Boolean(stageAsk(o)); }

  function renderTabs() {
    var nav = document.getElementById('tabs');
    nav.hidden = false;
    var dot = S.orders.some(function (o) { return needsAction(o) || o.unread > 0; });
    var items = [['home', 'home'], ['catalog', 'catalog'], ['orders', 'orders'], ['profile', 'user']];
    nav.replaceChildren.apply(nav, items.map(function (it) {
      return el('button', { class: view.tab === it[0] ? 'on' : '', onclick: function () { go(it[0]); } },
        icon(it[1]), el('span', null, t(it[0])), it[0] === 'orders' && dot ? el('span', { class: 'dot' }) : null);
    }));
  }

  function pageHead(title, sub, extra) {
    return el('div', { class: 'phead' }, el('div', { class: 'phead-row' }, el('h1', null, title), extra || null), sub ? el('p', { class: 'sub' }, sub) : null);
  }
  function studioChip() {
    return S.studioRole ? el('button', { class: 'chip-btn', onclick: function () { setMode('studio'); } }, icon('settings'), t('studioBtn')) : null;
  }
  function pill(text, cls) { return el('span', { class: 'pill ' + (cls || '') }, text); }
  function primary(label, onclick, opts) {
    opts = opts || {};
    return el('button', { class: 'btn' + (opts.cls ? ' ' + opts.cls : ''), disabled: opts.disabled || busy, onclick: onclick }, opts.icon ? icon(opts.icon) : null, el('span', null, label), opts.arrow ? icon('arrow-right') : null);
  }
  function emptyState(img, title, text, cta) {
    return el('div', { class: 'empty' }, el('img', { src: 'a/' + img, alt: '' }), el('h3', null, title), text ? el('p', null, text) : null, cta || null);
  }

  // ---------- головна ----------
  // Прогрес проєкту для картки на головній — з реального статусу замовлення
  function progressOf(o) {
    var steps = o.steps || [];
    var changes = steps.some(function (x) { return x.key === 'changes' && x.state !== 'done'; });
    var sketchDone = steps.some(function (x) { return x.key === 'sketches' && x.state === 'done'; });
    if (o.status === 'done') return { pct: 100, label: t('pr_done') };
    if (o.status === 'new') return { pct: 12, label: t('pr_new') };
    if (o.stage) {
      // Проєкт (бот, персонаж): точний етап, який відмітила студія
      var names = lang === 'en' ? o.stage.stepsEn : o.stage.steps, m = names.length, i = Math.min(o.stage.idx, m - 1);
      return { pct: Math.max(10, Math.min(95, Math.round((i + 0.5) / m * 100))), label: t('stageOf', { n: i + 1, m: m }) + ': ' + names[i], full: true };
    }
    if (o.sketch) return { pct: 60, label: t('pr_sketch') };
    if (changes) return { pct: 70, label: t('pr_changes') };
    if (sketchDone) return { pct: 85, label: t('pr_final') };
    return { pct: 38, label: t('pr_work') };
  }
  var PF = { stickers: 'pf_stickers', bots: 'pf_bots', characters: 'pf_characters' };
  function projectCard(o) {
    var p = progressOf(o);
    var act = needsAction(o);
    return el('button', { class: 'proj', onclick: function () { push('order', { id: o.id }); } },
      el('img', { class: 'proj-img', src: 'a/' + (PF[o.service] || PF.stickers) + '.webp', alt: '' }),
      el('div', { class: 'proj-body' },
        el('div', { class: 'proj-top' }, el('b', null, orderTitle(o)), act ? el('span', { class: 'tag red' }, t('yourAction')) : el('span', { class: 'tag' }, t('st_' + o.status))),
        o.unread ? el('span', { class: 'unread-pill' }, icon('message'), plural(t('newMsgs'), o.unread)) : null,
        el('div', { class: 'proj-bar' }, el('span', { class: 'track' }, el('i', { style: 'width:' + p.pct + '%' })), el('small', null, p.pct + '%')),
        el('small', { class: 'muted' }, p.full ? p.label : t('stage') + ': ' + p.label)),
      icon('chevron-right', 'chev'));
  }
  function worksTiles() {
    var tiles = [['stickers', 'worksStickers'], ['bots', 'worksBots'], ['characters', 'worksChars']];
    return tiles.map(function (x) {
      var s = svc(x[0]);
      var ex = s && (s.examples || [])[0];
      return el('button', { class: 'wtile', onclick: function () { if (s) { svcTab = 'about'; push('service', { id: s.id }); } else push('portfolio'); } },
        el('img', { src: ex ? ex.img : 'a/pf_' + x[0] + '.webp', alt: '', loading: 'lazy' }), el('span', null, t(x[1])));
    });
  }
  // Банер акції (налаштовується на сторінці бота); закритий хрестиком — до зміни банера
  // «Зазвичай відповідаємо за ~N хв» — зі статистики студії за 30 днів
  function replyTimeLine() {
    var m = S.replyTime;
    if (!m) return null;
    var txt = m < 60 ? t('replyMin', { n: m < 15 ? Math.max(5, Math.round(m / 5) * 5) : Math.round(m / 10) * 10 }) : t('replyHour', { n: Math.max(1, Math.round(m / 60)) });
    return el('div', { class: 'reply-time' }, el('i'), el('span', null, txt));
  }
  function promoBanner() {
    var b = S.banner;
    if (!b || store('yabot-banner-x') === b.id) return null;
    return el('div', { class: 'promo-banner' },
      el('button', { class: 'pb-x', 'aria-label': 'x', onclick: function () { store('yabot-banner-x', b.id); haptic(); render(); } }, icon('close')),
      el('div', { class: 'pb-body' },
        el('b', { class: 'pb-title' }, nm(b, 'title')),
        nm(b, 'text') ? el('p', null, nm(b, 'text')) : null,
        b.promo ? el('button', { class: 'pb-code', onclick: function () { copy(b.promo); } }, el('small', null, t('bnCode')), el('span', null, b.promo), icon('files')) : null,
        el('div', { class: 'pb-foot' },
          el('button', { class: 'pb-btn', onclick: function () { if (b.promo) { form.promo = b.promo; showPromo = true; saveForm(); } startWizard(''); } }, t('bnOrder'), icon('arrow-right')),
          b.until ? el('small', null, t('bnUntil', { d: b.until })) : null)),
      el('img', { class: 'pb-img', src: 'a/stk_celebration.webp', alt: '' }));
  }
  function homePage() {
    var open = S.orders.filter(function (o) { return o.status === 'new' || o.status === 'in_progress'; });
    open.sort(function (a, b) { return (Number(needsAction(b)) * 2 + Number(b.unread > 0)) - (Number(needsAction(a)) * 2 + Number(a.unread > 0)); });
    var support = S.support;
    return [
      el('div', { class: 'home-hero' },
        el('div', { class: 'home-top' }, el('img', { class: 'logo', src: 'a/logo.webp', alt: 'YABOT' }), studioChip()),
        el('img', { class: 'mascot', src: 'a/mascot_wave.webp', alt: '' }),
        el('div', { class: 'accent-lines' }, el('i'), el('i'), el('i')),
        el('h1', null, t('hello')),
        el('p', { class: 'sub' }, t('heroText'))),
      primary(t('createOrder'), function () { startWizard(''); }, { arrow: true, cls: 'big' }),
      promoBanner(),
      // Мої проєкти
      el('div', { class: 'card hsec' },
        el('div', { class: 'hsec-head' }, el('h2', null, t('myProjects')), S.orders.length ? el('button', { class: 'link sm', onclick: function () { go('orders'); } }, t('allOrders'), icon('chevron-right')) : null),
        open.length ? [projectCard(open[0]), open.length > 1 ? el('button', { class: 'link sm more', onclick: function () { go('orders'); } }, t('more2', { n: open.length - 1 })) : null]
          : el('div', { class: 'proj-empty' }, el('img', { src: 'a/mascot_pointing.webp', alt: '' }), el('div', null, el('b', null, t('noProjects')), el('p', { class: 'muted' }, t('noProjectsText'))))),
      // Наші роботи
      el('div', { class: 'card hsec' },
        el('div', { class: 'hsec-head' }, el('h2', null, t('ourWorks')), el('button', { class: 'link sm', onclick: function () { push('portfolio'); } }, t('seeAll'), icon('chevron-right'))),
        el('div', { class: 'wtiles' }, worksTiles())),
      reviewsSection((S.reviews && S.reviews.items) || []),
      // Як це працює
      el('div', { class: 'card hsec' },
        el('div', { class: 'hsec-head' }, el('h2', null, t('howItWorks'))),
        el('div', { class: 'hiw' }, [['process_idea', 'hw1'], ['process_design', 'hw2'], ['process_result', 'hw3']].map(function (x, i) {
          return [i ? el('span', { class: 'hiw-arrow' }, icon('arrow-right')) : null,
            el('div', { class: 'hiw-step' }, el('div', { class: 'hiw-top' }, el('span', { class: 'hiw-num' }, String(i + 1)), el('img', { src: 'a/' + x[0] + '.svg', alt: '' })),
              el('b', null, t(x[1])), el('small', null, t(x[1] + 't')))];
        }))),
      // Потрібна допомога?
      el('div', { class: 'card help-card' },
        el('span', { class: 'help-ic' }, icon('help')),
        el('div', null, el('b', null, t('needHelp')), el('small', { class: 'muted' }, t('needHelpText')), replyTimeLine()),
        el('button', { class: 'btn-outline', onclick: function () {
          if (S.aiChat) push('ask');
          else if (support) { try { tg.openTelegramLink('https://t.me/' + support); } catch (e) { window.open('https://t.me/' + support, '_blank'); } }
          else push('ask');
        } }, icon('send'), el('span', null, t('writeUs'))))
    ];
  }
  // ---------- відгуки ----------
  /** Форма слова за числом: [1 відгук, 2 відгуки, 5 відгуків]. */
  function plural(forms, n) {
    var i = lang === 'en' ? (n === 1 ? 0 : 1) : (n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2);
    return String(forms[i] || forms[2]).split('{n}').join(String(n));
  }
  function starsRow(n, size) {
    return el('span', { class: 'stars' + (size ? ' ' + size : '') }, [1, 2, 3, 4, 5].map(function (i) { return el('i', { class: i <= n ? 'on' : '' }, '★'); }));
  }
  function reviewCard(r) {
    var s = svc(r.service);
    return el('div', { class: 'rcard' }, starsRow(r.rating), r.comment ? el('p', null, r.comment) : null,
      el('small', { class: 'muted' }, r.name + (s ? ' · ' + nm(s, 'name') : '')));
  }
  function reviewsSection(list, title) {
    var R = S.reviews || {};
    if (!list.length) return null;
    return el('div', { class: 'card hsec' },
      el('div', { class: 'hsec-head' }, el('h2', null, title || t('reviewsT')),
        R.avg ? el('span', { class: 'avg' }, '★ ' + R.avg, el('small', { class: 'muted' }, ' · ' + plural(t('reviewsN'), R.count))) : null),
      el('div', { class: 'rscroll' }, list.map(reviewCard)));
  }
  var rateDraft = {};
  function reviewBlock(o) {
    if (o.review && o.review.comment) {
      return el('div', { class: 'card' }, el('div', { class: 'act-head' }, icon('heart'), el('h3', null, t('yourReview'))), starsRow(o.review.rating, 'lg'), el('p', { class: 'pre' }, o.review.comment),
        o.review.promo ? el('div', { class: 'rp-code' }, el('small', null, t('rpGot')), el('button', { class: 'pb-code dark', onclick: function () { copy(o.review.promo); } }, el('span', null, o.review.promo), icon('files')), el('small', { class: 'muted' }, t('rpAuto'))) : null);
    }
    if (!o.canReview) return null;
    var d = (rateDraft[o.id] = rateDraft[o.id] || { rating: (o.review && o.review.rating) || 0, comment: '' });
    var box = el('textarea', { placeholder: t('ratePh'), maxlength: '1000', oninput: function (e) { d.comment = e.target.value; } });
    box.value = d.comment;
    return el('div', { class: 'card rate-card' },
      el('div', { class: 'rate-top' }, el('img', { src: 'a/stk_love.webp', alt: '' }), el('div', null, el('h3', null, t('rateTitle')), el('p', { class: 'muted' }, t('rateText')))),
      S.reviewPromo ? el('div', { class: 'rp-hint' }, t('rpHint', { p: S.reviewPromo })) : null,
      el('div', { class: 'rate-stars' }, [1, 2, 3, 4, 5].map(function (i) {
        return el('button', { class: i <= d.rating ? 'on' : '', 'aria-label': i + '/5', onclick: function () { d.rating = i; haptic(); render(); } }, '★');
      })),
      box,
      primary(t('rateSend'), function () {
        if (!d.rating) { toast(t('rateNeed')); return; }
        act('review', { orderId: o.id, rating: d.rating, comment: d.comment }).then(function () { delete rateDraft[o.id]; toast(t('rateThanks')); });
      }, { icon: 'heart' }));
  }

  // ---------- повторне замовлення ----------
  function repeatOrder(o, extend) {
    form = { service: o.service || 'stickers', step: 2, typeKey: o.typeKey || 'static', qtyKey: form.qtyKey || '10', packageId: '', qtyCustom: '',
      hero: o.service === 'stickers' ? o.hero : '', styleId: o.styleId || 'any', emotions: '', title: o.service === 'stickers' ? '' : o.hero,
      description: o.service === 'stickers' ? '' : (o.about || ''), deadline: '', budget: '', need: o.service === 'stickers' ? 'new' : 'redesign',
      contact: o.contact || form.contact || S.contact, promo: '', refs: [], repeatOf: extend ? o.id : 0 };
    openCustom = false;
    briefDone = null; briefError = ''; saveForm(); syncDraft();
    view = { tab: 'orders', page: 'wizard', params: {} }; history = [{ tab: 'orders', page: 'order', params: { id: o.id } }];
    render(); window.scrollTo(0, 0); syncBack();
    toast(t('repeatNote'));
  }
  function repeatButtons(o) {
    if (o.status !== 'done') return null;
    return el('div', { class: 'row2' },
      primary(t('orderAgain'), function () { repeatOrder(o, false); }, { icon: 'plus' }),
      o.service === 'stickers' && o.pack ? el('button', { class: 'btn ghost', onclick: function () { repeatOrder(o, true); } }, icon('sticker'), el('span', null, t('extendPack'))) : null);
  }

  // ---------- документи ----------
  function docsBlock(o) {
    if (!o.docs) return null;
    var b = o.docs.billing;
    var f = {};
    var fld = function (k, label) { f[k] = el('input', { value: b[k] || '', maxlength: k === 'code' ? '20' : '150' }); return el('label', { class: 'mini-field' }, el('span', null, label), f[k]); };
    var det = el('details', { class: 'billing' + (b.name ? '' : ' empty') }, el('summary', null, icon('edit'), el('span', null, t('billingT') + (b.name ? ': ' + b.name : ''))),
      el('p', { class: 'muted' }, t('docsHint')),
      fld('name', t('bName')), fld('code', t('bCode')), fld('address', t('bAddr')), fld('signer', t('bSigner')),
      el('button', { class: 'btn ghost small', onclick: function () {
        act('billing', { orderId: o.id, name: f.name.value, code: f.code.value, address: f.address.value, signer: f.signer.value }).then(function () { toast(t('saved2')); });
      } }, el('span', null, t('bSave'))));
    if (!b.name) det.open = true;
    return el('div', { class: 'card' }, el('div', { class: 'act-head' }, icon('files'), el('h3', null, t('docsT'))), det,
      el('div', { class: 'row2' },
        el('button', { class: 'btn ghost', onclick: function () { downloadFile({ dl: o.docs.invoice, name: 'invoice-' + o.no + '.pdf' }); } }, icon('download'), el('span', null, t('invoicePdf'))),
        o.docs.act ? el('button', { class: 'btn ghost', onclick: function () { downloadFile({ dl: o.docs.act, name: 'act-' + o.no + '.pdf' }); } }, icon('download'), el('span', null, t('actPdf'))) : null));
  }

  // ---------- запросити друга ----------
  function inviteCard() {
    var r = S.referral;
    if (!r) return null;
    if (r.locked) {
      return el('div', { class: 'card invite locked' },
        el('div', { class: 'invite-top' }, el('img', { src: 'a/stk_celebration.webp', alt: '' }),
          el('div', null, el('h3', null, t('inviteT')), el('p', { class: 'muted' }, t('inviteText', { p: r.percent })))),
        el('div', { class: 'note small' }, icon('clock'), el('span', null, t('inviteLocked'))));
    }
    var share = 'https://t.me/share/url?url=' + encodeURIComponent(r.link) + '&text=' + encodeURIComponent(t('shareText', { p: r.percent }));
    return el('div', { class: 'card invite' },
      el('div', { class: 'invite-top' }, el('img', { src: 'a/stk_celebration.webp', alt: '' }),
        el('div', null, el('h3', null, t('inviteT')), el('p', { class: 'muted' }, t('inviteText', { p: r.percent })))),
      el('div', { class: 'invite-stats' },
        el('div', null, el('b', null, String(r.invited)), el('small', null, t('invited'))),
        el('div', null, el('b', null, String(r.ordered)), el('small', null, t('invOrdered'))),
        el('div', null, el('b', null, String(r.bonuses)), el('small', null, t('invBonus')))),
      el('div', { class: 'row2' },
        primary(t('inviteShare'), function () { try { tg.openTelegramLink(share); } catch (e) { window.open(share, '_blank'); } }, { icon: 'send' }),
        el('button', { class: 'btn ghost', onclick: function () { copy(r.link); } }, el('span', null, t('inviteCopy')))));
  }

  /** Портфоліо: приклади робіт усіх послуг + стікерпаки з каталогу. */
  function portfolioPage() {
    return [pageHead(t('portfolio')),
      S.services.map(function (s) {
        var ex = s.examples || [];
        var head = el('div', { class: 'hsec-head' }, el('h2', null, nm(s, 'name')), el('button', { class: 'link sm', onclick: function () { svcTab = 'about'; push('service', { id: s.id }); } }, t('order'), icon('chevron-right')));
        // Без власних прикладів: у стікерпаків — робот-стікери (цілком, сіткою), у решти — демо-картинка
        if (!ex.length && s.id === 'stickers') {
          return el('div', { class: 'card hsec' }, head, el('div', { class: 'ex-grid' }, ROBOT_STICKERS.map(function (n) {
            return el('button', { class: 'ex', onclick: function () { openViewer('a/stk_' + n + '.webp', ''); } }, el('img', { src: 'a/stk_' + n + '.webp', alt: '', loading: 'lazy' }));
          })));
        }
        var items = ex.length ? ex.map(function (e) { return { img: e.img, caption: nm(e, 'caption'), like: { kind: 'example', service: s.id, idx: e.idx } }; }) : [{ img: 'a/pf_' + s.id + '.webp', caption: '' }];
        return el('div', { class: 'card hsec' }, head,
          el('div', { class: 'gal' }, items.map(function (e) {
            return el('button', { class: 'gal-item', onclick: function () { openViewer(e.img, e.caption, e.like); } }, el('img', { src: e.img, alt: '', loading: 'lazy' }), e.caption ? el('span', null, e.caption) : null);
          })));
      }),
      S.works.length ? [el('div', { class: 'sec-head' }, el('h2', null, t('worksTitle'))), worksList()] : null];
  }
  function serviceCard(s) {
    return el('button', { class: 'card svc-card', onclick: function () { svcTab = 'about'; push('service', { id: s.id }); } },
      el('div', { class: 'svc-text' }, el('h3', null, nm(s, 'name')), el('p', null, nm(s, 'tagline')), s.priceFrom ? pill(t('from') + ' ' + money(s.priceFrom), 'orange') : null),
      el('img', { class: 'svc-img', src: s.img, alt: '' }),
      el('span', { class: 'round-chev' }, icon('chevron-right')));
  }

  // ---------- каталог ----------
  function catalogPage() {
    var q = catQuery.trim().toLowerCase();
    var list = S.services.filter(function (s) {
      return (!catChip || s.id === catChip) && (!q || (nm(s, 'name') + ' ' + nm(s, 'tagline') + ' ' + (nm(s, 'chips') || []).join(' ')).toLowerCase().indexOf(q) >= 0);
    });
    var input = el('input', { class: 'search', value: catQuery, placeholder: t('search'), oninput: function (e) { catQuery = e.target.value; renderCatList(); } });
    return [
      pageHead(t('catTitle'), t('catSub'), studioChip()),
      el('label', { class: 'search-box' }, icon('search'), input),
      el('div', { class: 'chips scroll' }, S.services.map(function (s) {
        return el('button', { class: 'chip' + (catChip === s.id ? ' on' : ''), onclick: function () { catChip = catChip === s.id ? '' : s.id; haptic(); render(); } }, nm(s, 'name'));
      })),
      el('div', { id: 'catlist' }, list.length ? list.map(serviceCard) : el('p', { class: 'muted center' }, t('nothing'))),
      S.works.length ? [el('div', { class: 'sec-head' }, el('h2', null, t('worksTitle'))), worksList()] : null
    ];
  }
  function renderCatList() {
    var box = document.getElementById('catlist');
    if (!box) return;
    var q = catQuery.trim().toLowerCase();
    var list = S.services.filter(function (s) { return (!catChip || s.id === catChip) && (!q || (nm(s, 'name') + ' ' + nm(s, 'tagline') + ' ' + (nm(s, 'chips') || []).join(' ')).toLowerCase().indexOf(q) >= 0); });
    box.replaceChildren.apply(box, list.length ? list.map(serviceCard) : [el('p', { class: 'muted center' }, t('nothing'))]);
  }
  function worksList() {
    return el('div', { class: 'works' }, S.works.map(function (w) {
      return el('div', { class: 'card work' },
        el('div', { class: 'row-between' }, el('b', null, w.title), el('span', { class: 'muted' }, w.count + ' ' + t('stickers'))),
        el('div', { class: 'thumbs' }, w.previews.map(stickerEl)),
        w.description ? el('p', { class: 'muted' }, w.description) : null,
        el('div', { class: 'row2' },
          el('button', { class: 'btn ghost small', onclick: function () { openPack(w.name); } }, el('span', null, t('openPack')), icon('external')),
          svc('stickers') ? el('button', { class: 'btn small', onclick: function () { wantSame({ kind: 'pack', id: w.id }, (w.previews[0] || {}).thumb || (w.previews[0] || {}).url || '', w.title); } }, el('span', null, '✨ ' + t('likeBtn'))) : null));
    }));
  }

  // ---------- сторінка послуги ----------
  function servicePage() {
    var s = svc(view.params.id);
    if (!s) return [el('p', null, t('nothing'))];
    var hero;
    if (s.id === 'stickers') {
      hero = el('div', { class: 'svc-hero stickers' }, ['love', 'wave', 'wink_thumbsup'].map(function (n) { return el('img', { src: 'a/stk_' + n + '.webp', alt: '' }); }));
    } else hero = el('div', { class: 'svc-hero' }, el('img', { src: s.img, alt: '' }));
    var tabs = [['about', t('tabAbout')], ['includes', t('tabIncludes')], ['steps', t('tabSteps')], ['faq', t('tabFaq')]];
    var body;
    if (svcTab === 'includes') body = el('ul', { class: 'checklist' }, (nm(s, 'includes') || []).map(function (x) { return el('li', null, icon('check-circle'), el('span', null, x)); }));
    else if (svcTab === 'steps') body = el('ol', { class: 'steps-list' }, (nm(s, 'steps') || []).map(function (x, i) { return el('li', null, el('span', { class: 'num' }, String(i + 1)), el('span', null, x)); }));
    else if (svcTab === 'faq') body = faqList();
    else body = [el('p', { class: 'lead' }, nm(s, 'intro')),
      el('div', { class: 'perks' }, (nm(s, 'perks') || []).map(function (p) { return el('div', { class: 'perk' }, el('span', { class: 'perk-ic' }, icon(p[0] === 'star' ? 'sticker' : p[0])), el('span', null, p[1])); }))];
    return [
      pageHead(nm(s, 'name'), nm(s, 'tagline')),
      hero,
      el('div', { class: 'chips wrap' }, s.priceFrom ? pill(t('from') + ' ' + money(s.priceFrom), 'orange big') : null, (nm(s, 'chips') || []).map(function (c) { return pill(c); })),
      primary(t('order'), function () { startWizard(s.id); }, { arrow: true, cls: 'big' }),
      el('div', { class: 'utabs' }, tabs.map(function (x) {
        return el('button', { class: svcTab === x[0] ? 'on' : '', onclick: function () { svcTab = x[0]; haptic(); render(); } }, x[1]);
      })),
      el('div', { class: 'tab-body' }, body),
      (s.packages || []).length ? [el('div', { class: 'sec-head' }, el('h2', null, t('pkgsTitle'))),
        s.packages.map(function (p) {
          return el('button', { class: 'card pkg-card', onclick: function () { form.projPkg = p.id; startWizard(s.id); } }, pkgCard(p), el('span', { class: 'link sm' }, t('order'), icon('arrow-right')));
        })] : null,
      reviewsSection(((S.reviews && S.reviews.items) || []).filter(function (r) { return r.service === s.id; })),
      (s.examples || []).length ? [el('div', { class: 'sec-head' }, el('h2', null, t('examples')),
        s.id === 'stickers' && S.works.length ? el('button', { class: 'link', onclick: function () { push('works'); } }, t('seeAll'), icon('arrow-right')) : null),
        el('div', { class: 'gal' }, s.examples.map(function (e) {
          return el('button', { class: 'gal-item', onclick: function () { openViewer(e.img, nm(e, 'caption'), { kind: 'example', service: s.id, idx: e.idx }); } },
            el('img', { src: e.img, alt: '', loading: 'lazy' }), nm(e, 'caption') ? el('span', null, nm(e, 'caption')) : null);
        }))]
      : s.id === 'stickers' ? [el('div', { class: 'sec-head' }, el('h2', null, t('examplesStk')),
        S.works.length ? el('button', { class: 'link', onclick: function () { push('works'); } }, t('seeAll'), icon('arrow-right')) : null),
        el('div', { class: 'ex-grid' }, ROBOT_STICKERS.map(function (n) { return el('div', { class: 'ex' }, el('img', { src: 'a/stk_' + n + '.webp', alt: '', loading: 'lazy' })); }))] : null
    ];
  }
  /** Перегляд картинки на весь екран (дотик — закрити). */
  // like — { kind: 'example', service, idx } або { kind: 'pack', id }: кнопка «Хочу так само»
  function openViewer(src, caption, like) {
    var box = el('div', { class: 'viewer', onclick: function () { box.remove(); } },
      el('img', { src: src, alt: '' }), caption ? el('p', null, caption) : null,
      like ? el('button', { class: 'btn like-btn', onclick: function (e) { e.stopPropagation(); box.remove(); wantSame(like, src, caption); } }, el('span', null, '✨ ' + t('likeBtn'))) : null,
      el('button', { class: 'viewer-x', 'aria-label': 'close' }, icon('close')));
    document.body.appendChild(box);
    haptic();
  }
  function wantSame(like, img, caption) {
    var service = like.kind === 'pack' ? 'stickers' : like.service;
    if (!svc(service)) return;
    form.like = { kind: like.kind, service: service, idx: like.idx, id: like.id, img: img, caption: caption || '' };
    saveForm();
    startWizard(service);
  }
  function flatPreviews(max) {
    var out = [];
    S.works.forEach(function (w) { w.previews.forEach(function (p) { if (out.length < max) out.push(p); }); });
    return out;
  }
  function faqList() {
    if (!S.faq.length) return el('p', { class: 'muted' }, t('noFaq'));
    return el('div', { class: 'faq' }, S.faq.map(function (f) {
      return el('details', null, el('summary', null, el('span', null, nm(f, 'q')), icon('chevron-right', 'chev')), el('p', null, nm(f, 'a')));
    }));
  }
  function openPack(name) {
    var url = 'https://t.me/addstickers/' + name;
    try { tg.openTelegramLink(url); } catch (e) { window.open(url, '_blank'); }
  }

  // ---------- анімовані відеостікери на iPhone/Mac ----------
  // WebKit не показує прозорість у WebM, але має WebCodecs (iOS 16.4+). Розбираємо WebM самі:
  // колір і прозорість — два окремі потоки VP9 (прозорість у BlockAdditional), декодуємо обидва
  // й склеюємо кадри на canvas. Кадри зменшуємо до розміру прев’ю, щоб не з’їсти пам’ять телефона.
  var WebmSticker = (function () {
    var MASTER = { 0x18538067: 1, 0x1654AE6B: 1, 0xAE: 1, 0xE0: 1, 0x1F43B675: 1, 0xA0: 1, 0x75A1: 1, 0xA6: 1 };
    var SIZE = 160, MAX_FRAMES = 48, MAX_CACHE = 24, PARALLEL = 2;

    function readVint(b, p, keepMarker) {
      var first = b[p], len = 1, mask = 0x80;
      while (len <= 8 && !(first & mask)) { len++; mask >>= 1; }
      if (len > 8) throw new Error('bad vint');
      var v = keepMarker ? first : first & (mask - 1), ones = (first & (mask - 1)) === mask - 1;
      for (var i = 1; i < len; i++) { v = v * 256 + b[p + i]; if (b[p + i] !== 0xff) ones = false; }
      return { v: v, len: len, unknown: !keepMarker && ones };
    }
    function uint(b, p, n) { var v = 0; for (var i = 0; i < n; i++) v = v * 256 + b[p + i]; return v; }

    /** Плоский прохід по EBML: майстер-елементи «відкриваємо», решту читаємо — невідомі розміри не заважають. */
    function parse(buf) {
      var b = new Uint8Array(buf), p = 0, info = { codec: '', w: 0, h: 0 }, frames = [], cluster = 0, scale = 1e6, group = null;
      function block(d, simple) {
        var tn = readVint(d, 0, false), ts = (d[tn.len] << 8 | d[tn.len + 1]); if (ts & 0x8000) ts -= 0x10000;
        var flags = d[tn.len + 2];
        if (flags & 0x06) return null; // лейсінг у стікерах не трапляється
        return { ts: (cluster + ts) * scale / 1e6, key: simple ? Boolean(flags & 0x80) : true, data: d.subarray(tn.len + 3), alpha: null };
      }
      function closeGroup() { if (group && group.f) { if (group.ref) group.f.key = false; group.f.alpha = group.alpha; frames.push(group.f); } group = null; }
      while (p < b.length) {
        var id = readVint(b, p, true), sz = readVint(b, p + id.len, false), start = p + id.len + sz.len;
        var end = sz.unknown ? b.length : Math.min(b.length, start + sz.v);
        if (MASTER[id.v]) {
          if (id.v === 0xA0 || id.v === 0x1F43B675) closeGroup();
          if (id.v === 0xA0) group = { f: null, ref: false, alpha: null, addId: 1 };
          p = start; continue;
        }
        var d = b.subarray(start, end);
        switch (id.v) {
          case 0x86: info.codec = String.fromCharCode.apply(null, d); break;           // CodecID
          case 0xB0: info.w = uint(d, 0, d.length); break;                               // PixelWidth
          case 0xBA: info.h = uint(d, 0, d.length); break;                               // PixelHeight
          case 0x2AD7B1: scale = uint(d, 0, d.length); break;                            // TimecodeScale
          case 0xE7: cluster = uint(d, 0, d.length); break;                              // Cluster Timecode
          case 0xA3: closeGroup(); var f = block(d, true); if (f) frames.push(f); break; // SimpleBlock
          case 0xA1: if (group) group.f = block(d, false); break;                        // Block
          case 0xFB: if (group) group.ref = true; break;                                 // ReferenceBlock
          case 0xEE: if (group) group.addId = uint(d, 0, d.length); break;               // BlockAddID
          case 0xA5: if (group && group.addId === 1) group.alpha = d; break;             // BlockAdditional
        }
        p = end;
      }
      closeGroup();
      return { info: info, frames: frames };
    }

    function codecString(id) { return id === 'V_VP9' ? 'vp09.00.10.08' : id === 'V_VP8' ? 'vp8' : null; }

    var supported = null;
    function isSupported() {
      if (supported) return supported;
      supported = !window.VideoDecoder || !window.EncodedVideoChunk || !window.createImageBitmap ? Promise.resolve(false)
        : VideoDecoder.isConfigSupported({ codec: 'vp09.00.10.08' }).then(function (r) { return Boolean(r.supported); }).catch(function () { return false; });
      return supported;
    }

    /** Декодує стікер у масив ImageBitmap (з прозорістю) + тривалості кадрів у мс. */
    function decode(buf) {
      var parsed = parse(buf), info = parsed.info, frames = parsed.frames, codec = codecString(info.codec);
      if (!codec || !frames.length || !info.w) return Promise.reject(new Error('unsupported webm'));
      var tw = Math.min(SIZE, info.w), th = Math.max(1, Math.round(tw * info.h / info.w));
      var canvas = document.createElement('canvas'); canvas.width = tw; canvas.height = th;
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      var step = Math.max(1, Math.ceil(frames.length / MAX_FRAMES));
      var keep = {}; frames.forEach(function (f, i) { if (i % step === 0) keep[Math.round(f.ts * 1000)] = true; });
      var hasAlpha = frames.some(function (f) { return f.alpha; });
      var colors = {}, alphas = {}, out = [], failed = null;
      function compose(ts) {
        var c = colors[ts], a = alphas[ts];
        if (!c || (hasAlpha && a === undefined)) return;
        delete colors[ts]; delete alphas[ts];
        if (keep[ts] && !failed) {
          try {
            ctx.clearRect(0, 0, tw, th);
            ctx.drawImage(c, 0, 0, tw, th);
            var img = ctx.getImageData(0, 0, tw, th);
            if (a) {
              ctx.drawImage(a, 0, 0, tw, th);
              var al = ctx.getImageData(0, 0, tw, th).data, px = img.data;
              for (var i = 0; i < px.length; i += 4) px[i + 3] = al[i];
            }
            out.push(createImageBitmap(img).then(function (bm) { return { ts: ts, bm: bm }; }));
          } catch (e) { failed = e; }
        }
        c.close(); if (a) a.close();
      }
      function decoder(store) {
        var dec = new VideoDecoder({
          output: function (fr) { var ts = fr.timestamp; store[ts] = fr; compose(ts); },
          error: function (e) { failed = e; }
        });
        dec.configure({ codec: codec, codedWidth: info.w, codedHeight: info.h });
        return dec;
      }
      var cd = decoder(colors), ad = hasAlpha ? decoder(alphas) : null;
      frames.forEach(function (f) {
        var ts = Math.round(f.ts * 1000);
        cd.decode(new EncodedVideoChunk({ type: f.key ? 'key' : 'delta', timestamp: ts, data: f.data }));
        if (ad) {
          if (f.alpha) ad.decode(new EncodedVideoChunk({ type: f.key ? 'key' : 'delta', timestamp: ts, data: f.alpha }));
          else { alphas[ts] = null; }
        }
      });
      return Promise.all([cd.flush(), ad ? ad.flush() : null]).then(function () {
        cd.close(); if (ad) ad.close();
        Object.keys(colors).forEach(function (k) { if (colors[k]) colors[k].close(); });
        Object.keys(alphas).forEach(function (k) { if (alphas[k]) alphas[k].close(); });
        if (failed) throw failed;
        return Promise.all(out);
      }).then(function (list) {
        list.sort(function (x, y) { return x.ts - y.ts; });
        if (!list.length) throw new Error('no frames');
        var last = frames[frames.length - 1].ts, avg = frames.length > 1 ? last / (frames.length - 1) : 33;
        var durs = list.map(function (x, i) { return i + 1 < list.length ? (list[i + 1].ts - x.ts) / 1000 : avg * step; });
        return { w: tw, h: th, bitmaps: list.map(function (x) { return x.bm; }), durs: durs.map(function (d) { return Math.max(16, d || 33); }) };
      });
    }

    // --- програвання: спільний цикл requestAnimationFrame, лише видимі стікери ---
    var cache = {}, cached = 0, queue = [], running = 0, players = [], loopOn = false;
    function loop(now) {
      players = players.filter(function (pl) { return pl.canvas.isConnected; });
      players.forEach(function (pl) {
        if (!pl.visible) return;
        var a = pl.anim, total = a.total, t = (now - pl.start) % total, i = 0;
        while (t >= a.durs[i] && i < a.durs.length - 1) { t -= a.durs[i]; i++; }
        if (i !== pl.frame) { pl.frame = i; pl.ctx.clearRect(0, 0, a.w, a.h); pl.ctx.drawImage(a.bitmaps[i], 0, 0); }
      });
      if (players.length) requestAnimationFrame(loop); else loopOn = false;
    }
    function startLoop() { if (!loopOn) { loopOn = true; requestAnimationFrame(loop); } }
    function pump() {
      while (running < PARALLEL && queue.length) {
        var job = queue.shift();
        running++;
        job().then(function () { running--; pump(); }, function () { running--; pump(); });
      }
    }
    function load(url) {
      if (cache[url]) return cache[url];
      if (cached >= MAX_CACHE) return Promise.reject(new Error('cache full'));
      cached++;
      cache[url] = new Promise(function (resolve, reject) {
        queue.push(function () {
          return fetch(url).then(function (r) { if (!r.ok) throw new Error('fetch'); return r.arrayBuffer(); })
            .then(decode).then(function (a) { a.total = a.durs.reduce(function (s, d) { return s + d; }, 0); resolve(a); }, function (e) { reject(e); throw e; });
        });
        pump();
      });
      return cache[url];
    }
    var observer = window.IntersectionObserver ? new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { var h = en.target.yabotSticker; if (h) h(en.isIntersecting); });
    }, { rootMargin: '200px' }) : null;

    /** Прев’ю-картинка, яка, щойно з’явиться на екрані, змінюється на анімацію (якщо вдасться). */
    function element(videoUrl, thumbUrl, makeImg) {
      var img = makeImg(thumbUrl);
      if (!observer) return img;
      var player = null;
      img.yabotSticker = function (visible) {
        if (player) { player.visible = visible; return; }
        if (!visible) return;
        img.yabotSticker = null;
        observer.unobserve(img);
        isSupported().then(function (ok) {
          if (!ok) return;
          return load(videoUrl).then(function (a) {
            if (!img.isConnected) return;
            var cv = document.createElement('canvas'); cv.width = a.w; cv.height = a.h; cv.className = 'stk';
            player = { canvas: cv, ctx: cv.getContext('2d'), anim: a, start: performance.now(), frame: -1, visible: true };
            cv.yabotSticker = function (v) { player.visible = v; };
            img.replaceWith(cv);
            observer.observe(cv);
            players.push(player);
            startLoop();
          });
        }).catch(function () { /* лишається прев’ю */ });
      };
      observer.observe(img);
      return img;
    }

    return { parse: parse, decode: decode, element: element, isSupported: isSupported };
  })();
  window.YabotWebm = WebmSticker; // для перевірки

  // iPhone, iPad і Mac (WebKit) не вміють прозорість у відео WebM — чорний фон і часто без руху.
  // Їм показуємо прозору мініатюру стікера; решті — живе відео (а якщо не запуститься — теж мініатюру).
  var noAlphaVideo = (function () {
    var p = tg && tg.platform;
    if (p === 'ios' || p === 'macos') return true;
    var ua = navigator.userAgent;
    return /iPhone|iPad|iPod/.test(ua) || (/AppleWebKit/.test(ua) && !/Chrome|Chromium|Android|Edg|Firefox/.test(ua));
  })();
  function stickerImg(url) { return el('img', { src: url, alt: '', loading: 'lazy' }); }
  function stickerEl(p) {
    if (!p.video) return stickerImg(p.url);
    if (noAlphaVideo && p.thumb) return WebmSticker.element(p.url, p.thumb, stickerImg);
    var v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    if (p.thumb) v.addEventListener('error', function () { v.replaceWith(stickerImg(p.thumb)); });
    v.src = p.url;
    setTimeout(function () { var r = v.play && v.play(); if (r && r.catch) r.catch(function () {}); }, 0);
    return v;
  }
  // ---------- заявка: 4 кроки ----------
  function saveForm() { store('yabot-brief2', form); }
  // Крок заявки — на сервер (з затримкою), щоб бот нагадав, якщо людина не завершить
  var draftTimer = null;
  function syncDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () { api('draft', { service: form.service, step: form.step }).catch(function () {}); }, 1500);
  }
  function bind(key) { return function (e) { form[key] = e.target.value; saveForm(); if (key === 'description') { var c = document.getElementById('desc-count'); if (c) c.textContent = form.description.length + '/2000'; } }; }
  function startWizard(service) {
    if (service) { form.service = service; form.step = 2; } else form.step = form.service ? form.step : 1;
    if (!service) form.step = 1;
    briefDone = null; briefError = ''; saveForm(); syncDraft();
    view = { tab: 'orders', page: 'wizard', params: {} }; history = [{ tab: 'home', page: null, params: {} }];
    render(); window.scrollTo(0, 0); syncBack();
  }
  function opt(on, content, onclick, cls) {
    return el('button', { type: 'button', class: 'opt ' + (cls || '') + (on ? ' on' : ''), onclick: function () { haptic(); onclick(); saveForm(); render(); } },
      content, on ? el('span', { class: 'tick' }, icon('check')) : null);
  }
  function field(label, req, children, hint) {
    return el('div', { class: 'field' }, el('label', null, label, req ? el('span', { class: 'req' }, ' *') : null), hint ? el('div', { class: 'hint' }, hint) : null, children);
  }
  function stepper() {
    var names = [t('stService'), t('stDetails'), t('stRefs'), t('stConfirm')];
    return el('div', { class: 'wsteps' }, names.map(function (n, i) {
      var st = i + 1 < form.step ? 'done' : i + 1 === form.step ? 'now' : '';
      return el('div', { class: 'ws ' + st }, el('span', { class: 'ws-dot' }, st === 'done' ? icon('check') : String(i + 1)), el('span', { class: 'ws-label' }, n));
    }));
  }
  function wizardPage() {
    if (briefDone) return successPage();
    if (S.brief.blocked) return [pageHead(t('newOrder')), el('div', { class: 'card note' }, S.brief.blocked)];
    var body = form.step === 1 ? stepService() : form.step === 2 ? stepDetails() : form.step === 3 ? stepRefs() : stepConfirm();
    return [
      stepper(),
      pageHead(t('newOrder'), form.step === 1 ? t('newOrderSub') : null),
      form.like && form.like.service === form.service ? el('div', { class: 'like-pill' }, form.like.img ? el('img', { src: form.like.img, alt: '' }) : null,
        el('span', null, '✨ ' + t('likeTag') + (form.like.caption ? ': ' + form.like.caption : '')),
        el('button', { class: 'x', 'aria-label': 'x', onclick: function () { form.like = null; saveForm(); render(); } }, icon('close'))) : null,
      form.repeatOf ? el('div', { class: 'pill orange-soft' }, icon('sticker'), t('repeatOf', { n: String(form.repeatOf).padStart(4, '0') }),
        el('button', { class: 'x', 'aria-label': 'x', onclick: function () { form.repeatOf = 0; saveForm(); render(); } }, icon('close'))) : null,
      S.brief.vacation ? el('div', { class: 'card note' }, S.brief.vacation) : null,
      body,
      briefError ? el('div', { class: 'error' }, briefError) : null,
      form.step < 4 ? primary(t('next'), nextStep, { arrow: true, cls: 'big', disabled: form.step === 1 && !form.service })
        : primary(busy ? t('sending') : t('send'), submitBrief, { icon: 'send', cls: 'big' })
    ];
  }
  function stepService() {
    return [el('h2', { class: 'h2' }, t('chooseService')),
      el('div', { class: 'svc-pick' }, S.services.map(function (s) {
        return opt(form.service === s.id, [el('img', { src: s.img, alt: '' }), el('b', null, nm(s, 'name'))], function () { form.service = s.id; }, 'svc-opt');
      })),
      el('div', { class: 'tip' }, el('img', { src: 'a/mascot_pointing.webp', alt: '' }), el('div', null, el('b', null, t('tipTitle')), el('p', null, t('tipText'))))];
  }
  function stepDetails() {
    if (form.service !== 'stickers') {
      return [
        field(t('titleQ'), true, el('input', { value: form.title, placeholder: t('titlePh'), maxlength: '120', oninput: bind('title') })),
        field(t('descQ'), true, [el('textarea', { value: form.description, placeholder: t('descPh'), maxlength: '2000', oninput: bind('description') }), el('div', { class: 'counter', id: 'desc-count' }, form.description.length + '/2000'), aiButton('description')]),
        el('div', { class: 'grid2' },
          field(t('deadlineQ'), false, el('label', { class: 'inp-ic' }, icon('calendar'), el('input', { type: 'date', value: form.deadline, min: new Date().toISOString().slice(0, 10), oninput: bind('deadline') }))),
          field(t('budgetQ'), false, el('select', { class: 'sel', onchange: function (e) { form.budget = e.target.value; saveForm(); } },
            [el('option', { value: '' }, '—')].concat(t('budgets').map(function (b) { var o = el('option', { value: b }, b); if (form.budget === b) o.selected = true; return o; }))))),
        field(t('needQ'), false, el('div', { class: 'need-pick' }, [['new', 'help'], ['redesign', 'refresh'], ['consult', 'message']].map(function (n) {
          return opt(form.need === n[0], [icon(n[1]), el('span', null, t('need_' + n[0]))], function () { form.need = n[0]; }, 'need-opt');
        }))),
        projectPackages()
      ];
    }
    var pk = S.packages.filter(function (p) { return p.type === 'any' || p.type === form.typeKey; });
    if (form.packageId && !pk.some(function (p) { return p.id === form.packageId; })) form.packageId = '';
    var rows = (S.prices.rows[form.typeKey]) || {};
    return [
      field(t('typeQ'), true, el('div', { class: 'seg2' },
        opt(form.typeKey === 'static', [el('b', null, t('static')), el('small', null, t('staticHint'))], function () { form.typeKey = 'static'; }),
        opt(form.typeKey === 'animated', [el('b', null, t('animated')), el('small', null, t('animatedHint'))], function () { form.typeKey = 'animated'; }))),
      field(t('qtyQ'), true, [
        pk.length ? [el('div', { class: 'hint' }, t('packages')), pk.map(function (p) {
          var items = (nm(p, 'items') || '').split('\n').filter(Boolean);
          return opt(form.packageId === p.id, [el('div', { class: 'row-between' }, el('b', null, nm(p, 'name')), el('b', { class: 'orange-t' }, money(p.price))),
            items.length ? el('ul', null, items.map(function (x) { return el('li', null, x); })) : null], function () { form.packageId = p.id; openCustom = false; }, 'pkg');
        }), el('div', { class: 'hint' }, t('orQty'))] : null,
        el('div', { class: 'chips3' }, Object.keys(QTY).map(function (k) {
          return opt(!form.packageId && !openCustom && form.qtyKey === k, [el('b', null, QTY[k]), rows[k] ? el('small', null, rows[k]) : null], function () { form.packageId = ''; form.qtyKey = k; openCustom = false; });
        }), opt(!form.packageId && openCustom, el('b', null, t('custom')), function () { form.packageId = ''; openCustom = true; })),
        openCustom && !form.packageId ? el('input', { style: 'margin-top:8px', value: form.qtyCustom, placeholder: t('customPh'), maxlength: '200', oninput: bind('qtyCustom') }) : null]),
      field(t('heroQ'), true, el('textarea', { value: form.hero, placeholder: t('heroPh'), maxlength: '2000', oninput: bind('hero') }), t('heroHint')),
      S.styles.length ? field(t('styleQ'), false, el('div', { class: 'styles' }, S.styles.map(function (st) {
        return opt(form.styleId === st.id, [el('img', { src: st.img, alt: '' }), el('span', null, nm(st, 'name'))], function () { form.styleId = st.id; }, 'style-opt');
      }), opt(form.styleId === 'any' || !S.styles.some(function (st) { return st.id === form.styleId; }), [el('span', { class: 'any' }, icon('sticker')), el('span', null, t('styleAny'))], function () { form.styleId = 'any'; }, 'style-opt'))) : null,
      field(t('emoQ'), true, [el('textarea', { value: form.emotions, placeholder: t('emoPh'), maxlength: '2000', oninput: bind('emotions') }), aiButton('emotions')], t('emoHint'))
    ];
  }
  // «💡 Допоможіть з ідеями» (ІІ): емоції для стікерів, опис для проєктів — до 3 разів на заявку
  function aiButton(key) {
    if (!S.aiIdeas || aiTries >= 3) return null;
    return el('div', { class: 'ai-row' },
      el('button', { type: 'button', class: 'ai-btn', disabled: aiBusy, onclick: function () { askIdeas(key); } },
        aiBusy ? el('span', { class: 'spinner sm' }) : el('span', null, '💡'), el('span', null, aiBusy ? t('aiThinking') : t(aiTries ? 'aiMore' : 'aiHelp'))),
      form.aiUsed && !aiBusy ? el('small', { class: 'muted' }, t('aiNote')) : null);
  }
  function askIdeas(key) {
    if (aiBusy) return;
    var stickers = key === 'emotions';
    if (stickers && form.hero.trim().length < 2) { toast(t('aiNeedHero')); return; }
    if (!stickers && form.title.trim().length < 2) { toast(t('aiNeedTitle')); return; }
    var pkg = S.packages.filter(function (p) { return p.id === form.packageId; })[0];
    aiBusy = true; haptic(); render();
    api('ideas', { service: form.service, hero: form.hero, typeKey: form.typeKey, quantity: pkg ? nm(pkg, 'name') : openCustom ? form.qtyCustom : QTY[form.qtyKey],
      title: form.title, need: form.need, current: form[key] }).then(function (r) {
      aiBusy = false; aiTries++;
      var cur = form[key].trim();
      form[key] = (stickers && cur ? cur + '\n' + r.text : r.text).slice(0, 2000);
      form.aiUsed = true; saveForm(); haptic('ok'); render(); toast(t('aiDone'));
    }).catch(function (e) { aiBusy = false; haptic('error'); render(); toast(e.message); });
  }
  function pkgCard(p) {
    var items = (nm(p, 'items') || '').split('\n').filter(Boolean);
    return [el('div', { class: 'row-between' }, el('b', null, nm(p, 'name')), p.price ? el('b', { class: 'orange-t' }, t('from') + ' ' + money(p.price)) : null),
      items.length ? el('ul', null, items.map(function (x) { return el('li', null, x); })) : null];
  }
  function projectPackages() {
    var s = svc(form.service);
    var list = (s && s.packages) || [];
    if (!list.length) return null;
    if (form.projPkg && !list.some(function (p) { return p.id === form.projPkg; })) form.projPkg = '';
    return field(t('pkgQ'), false, [list.map(function (p) {
      return opt(form.projPkg === p.id, pkgCard(p), function () { form.projPkg = p.id; }, 'pkg');
    }), opt(!form.projPkg, [el('b', null, t('pkgNone')), el('small', null, t('pkgNoneHint'))], function () { form.projPkg = ''; }, 'pkg')]);
  }
  // Орієнтовний старт (налаштування «Срок старта в заявке»)
  function queueCard() {
    var q = S.queue;
    if (!q || S.brief.vacation) return null;
    return el('div', { class: 'card qcard' }, el('span', { class: 'cur-ic' }, icon('clock')),
      el('div', null, el('b', null, t('qTitle')),
        el('p', null, q.days ? plural(t('qDays'), q.days) : t('qSoon')),
        !q.manual && q.open ? el('small', { class: 'muted' }, plural(t('qOpen'), q.open) + ' ') : null,
        el('small', { class: 'muted' }, t('qNote'))));
  }
  function stepRefs() {
    return [
      field(t('refsQ'), false, photoPicker(form.refs, 10, t('addPhoto'), function () { saveForm(); render(); }), t('refsHint')),
      el('div', { class: 'card note small' }, icon('info'), el('span', null, t('refsNote'))),
      field(t('contactQ'), false, el('input', { value: form.contact, placeholder: t('contactPh'), maxlength: '200', oninput: bind('contact') })),
      showPromo ? field(t('promoPh'), false, el('input', { value: form.promo, maxlength: '40', oninput: bind('promo') }))
        : el('button', { type: 'button', class: 'link', onclick: function () { showPromo = true; render(); } }, t('promoAsk'))
    ];
  }
  function summaryRows() {
    var s = svc(form.service) || {};
    var rows = [[t('stService'), nm(s, 'name') || '—', 1]];
    if (form.like && form.like.service === form.service) rows.push([t('likeRow'), form.like.caption || '✨', 1]);
    if (form.service === 'stickers') {
      var pkg = S.packages.filter(function (p) { return p.id === form.packageId; })[0];
      rows.push([t('typeQ'), t(form.typeKey), 2], [t('qtyQ'), pkg ? nm(pkg, 'name') + ' · ' + money(pkg.price) : openCustom ? form.qtyCustom : QTY[form.qtyKey], 2],
        [t('heroQ'), form.hero, 2], [t('emoQ'), form.emotions, 2]);
      var st = S.styles.filter(function (x) { return x.id === form.styleId; })[0];
      if (S.styles.length) rows.push([t('styleQ'), st ? nm(st, 'name') : t('styleAny'), 2]);
    } else {
      rows.push([t('titleQ'), form.title, 2], [t('descQ'), form.description, 2], [t('needQ'), t('need_' + form.need), 2]);
      var ppk = ((svc(form.service) || {}).packages || []).filter(function (p) { return p.id === form.projPkg; })[0];
      if (ppk) rows.push([t('pkgQ'), nm(ppk, 'name') + (ppk.price ? ' · ' + t('from') + ' ' + money(ppk.price) : ''), 2]);
      if (form.deadline) rows.push([t('deadlineQ'), dfull(form.deadline), 2]);
      if (form.budget) rows.push([t('budgetQ'), form.budget, 2]);
    }
    rows.push([t('stRefs'), String(form.refs.length), 3], [t('contactQ'), form.contact || '—', 3]);
    if (showPromo && form.promo) rows.push([t('promoPh'), form.promo, 3]);
    return rows;
  }
  function stepConfirm() {
    return [el('h2', { class: 'h2' }, t('confirmTitle')),
      el('div', { class: 'card summary' }, summaryRows().map(function (r) {
        return el('div', { class: 'sum-row' }, el('div', null, el('div', { class: 'muted' }, r[0]), el('div', { class: 'sum-val' }, r[1] || '—')),
          el('button', { class: 'link small', onclick: function () { form.step = r[2]; saveForm(); render(); window.scrollTo(0, 0); } }, icon('edit')));
      })),
      form.refs.length ? el('div', { class: 'ref-strip' }, form.refs.map(function (r) { return el('img', { src: r.url, alt: '' }); })) : null,
      queueCard()];
  }
  function validStep(n) {
    if (n === 1) return Boolean(form.service);
    if (n === 2) {
      if (form.service === 'stickers') return form.hero.trim().length >= 2 && form.emotions.trim().length >= 2 && (form.packageId || !openCustom || form.qtyCustom.trim());
      return form.title.trim().length >= 2 && form.description.trim().length >= 10;
    }
    return true;
  }
  function nextStep() {
    briefError = '';
    if (!validStep(form.step)) { briefError = t('required'); haptic('error'); render(); return; }
    if (form.step === 3 && uploading) { briefError = t('waitUpload'); render(); return; }
    form.step++; saveForm(); syncDraft(); render(); window.scrollTo(0, 0);
  }
  function submitBrief() {
    briefError = '';
    if (uploading) { briefError = t('waitUpload'); render(); return; }
    var body = { service: form.service, contact: form.contact, promo: showPromo ? form.promo : '', refs: form.refs.map(function (r) { return r.token; }), repeatOf: form.repeatOf || 0, aiIdeas: Boolean(form.aiUsed), like: form.like && form.like.service === form.service ? { kind: form.like.kind, service: form.like.service, idx: form.like.idx, id: form.like.id } : null };
    if (form.service === 'stickers') {
      body.typeKey = form.typeKey; body.hero = form.hero; body.emotions = form.emotions; body.styleId = form.styleId;
      if (form.packageId) body.packageId = form.packageId; else if (openCustom) { body.qtyKey = 'custom'; body.qtyCustom = form.qtyCustom; } else body.qtyKey = form.qtyKey;
    } else {
      body.title = form.title; body.description = form.description; body.deadline = form.deadline; body.budget = form.budget; body.need = form.need; body.packageId = form.projPkg || '';
    }
    busy = true; render();
    api('brief', body).then(function (r) {
      busy = false;
      if (r.state) S = r.state;
      briefDone = { no: r.no, id: r.id || (S.orders[0] && S.orders[0].id) };
      form = { service: '', step: 1, typeKey: form.typeKey, qtyKey: form.qtyKey, packageId: '', qtyCustom: '', hero: '', styleId: 'any', emotions: '', title: '', description: '', deadline: '', budget: '', need: 'new', contact: form.contact, promo: '', refs: [], repeatOf: 0 };
      aiTries = 0; saveForm(); haptic('ok'); render(); window.scrollTo(0, 0);
    }).catch(function (e) { busy = false; briefError = e.message; haptic('error'); render(); });
  }
  function successPage() {
    return el('div', { class: 'success' }, el('div', { class: 'success-art' }, el('img', { src: 'a/mascot_tablet.webp', alt: '' }), el('span', { class: 'success-check' }, icon('check'))),
      el('h1', null, t('sent')), briefDone.no ? pill('#' + briefDone.no, 'orange big') : null, el('p', { class: 'sub' }, t('sentText')),
      primary(t('toOrder'), function () { var id = briefDone.id; briefDone = null; view = { tab: 'orders', page: 'order', params: { id: id } }; history = [{ tab: 'orders', page: null, params: {} }]; render(); syncBack(); }, { arrow: true, cls: 'big' }),
      el('button', { class: 'btn ghost big', onclick: function () { go('home'); } }, el('span', null, t('toHome'))));
  }

  // ---------- завантаження фото ----------
  // Стискаємо на телефоні (до 2560 px, JPEG) — швидше вантажиться й завжди підходить Telegram
  function compress(file) {
    if (!window.createImageBitmap) return Promise.resolve(file);
    return createImageBitmap(file).then(function (bmp) {
      var k = Math.min(1, 2560 / Math.max(bmp.width, bmp.height));
      var c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (res) { c.toBlob(function (b) { res(b || file); }, 'image/jpeg', 0.88); });
    }).catch(function () { return file; });
  }
  function uploadFile(file) {
    return compress(file).then(function (blob) {
      return fetch('api/upload', { method: 'POST', headers: { 'content-type': blob.type || 'image/jpeg', 'x-init-data': initData }, body: blob });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || t('uploadErr')); return j; });
    });
  }
  // list — масив { token, url }; змінюється на місці
  function photoPicker(list, max, label, changed) {
    var input = el('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none' });
    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || [], 0, Math.max(0, max - list.length));
      input.value = '';
      files.forEach(function (f) {
        uploading++; render();
        uploadFile(f).then(function (j) {
          uploading--;
          if (list.length < max) list.push({ token: j.token, url: j.url });
          haptic(); changed();
        }).catch(function (e) { uploading--; haptic('error'); toast(e.message); render(); });
      });
    });
    return el('div', { class: 'thumbs-edit' },
      list.map(function (r, i) {
        return el('div', { class: 'th' }, el('img', { src: r.url, alt: '' }),
          el('button', { type: 'button', class: 'rm', onclick: function () { list.splice(i, 1); changed(); } }, '✕'));
      }),
      uploading ? el('div', { class: 'th wait' }, el('div', { class: 'spinner' })) : null,
      list.length < max ? el('button', { type: 'button', class: 'th add', onclick: function () { input.click(); } }, label) : null,
      input);
  }

  // ---------- замовлення ----------
  function stages(o) {
    if (o.status === 'rejected' || o.status === 'cancelled') return null;
    if (o.stage) {
      var names = lang === 'en' ? o.stage.stepsEn : o.stage.steps, at = o.stage.at || {};
      return names.map(function (n, i) {
        return { label: n, state: i < o.stage.idx ? 'done' : i === o.stage.idx ? 'now' : '', at: at[i] || (i === 0 ? o.createdAt : i === names.length - 1 && o.status === 'done' ? o.doneAt : null) };
      });
    }
    var sk = o.sketch || (o.steps || []).filter(function (s) { return s.key === 'changes'; })[0];
    var approvalDone = o.status === 'done' || (o.steps || []).some(function (s) { return (s.key === 'sketches') && s.state === 'done'; });
    var approvalNow = !approvalDone && (Boolean(o.sketch) || (o.steps || []).some(function (s) { return (s.key === 'sketches' || s.key === 'changes') && s.state === 'now'; }));
    return [
      { label: t('s1'), state: 'done', at: o.createdAt },
      { label: t('s2'), state: o.status === 'new' ? 'now' : 'done', at: o.takenAt },
      { label: t('s3'), state: approvalDone ? 'done' : approvalNow ? 'now' : '', at: o.sketchAt },
      { label: t('s4'), state: o.status === 'done' ? 'done' : '', at: o.doneAt }
    ];
  }
  function stepperBar(o, withDates) {
    var st = stages(o);
    if (!st) return el('div', { class: 'pill red' }, t(o.status));
    return el('div', { class: 'stepper' + (st.length > 5 ? ' many' : '') }, st.map(function (s, i) {
      return el('div', { class: 'stp ' + s.state + (i < st.length - 1 && st[i + 1].state ? ' fill' : '') },
        el('span', { class: 'stp-dot' }, s.state === 'done' ? icon('check') : String(i + 1)),
        el('span', { class: 'stp-label' }, s.label), withDates && s.at ? el('span', { class: 'stp-date' }, dshort(s.at)) : null);
    }));
  }
  function statusPill(o) {
    var cls = o.status === 'done' ? 'green' : o.status === 'in_progress' ? 'green' : o.status === 'new' ? 'orange-soft' : 'red';
    return el('span', { class: 'status ' + cls }, el('i'), t('st_' + o.status));
  }
  function orderTitle(o) { return o.service === 'stickers' ? (lang === 'en' ? 'Sticker pack' : 'Стікерпак') + ' · ' + o.qty : o.hero; }
  function orderCard(o) {
    var s = svc(o.service) || svc('stickers') || {};
    return el('div', { class: 'card ocard' },
      el('button', { class: 'ocard-main', onclick: function () { push('order', { id: o.id }); } },
        el('div', { class: 'row-between' }, el('span', { class: 'muted' }, '#' + o.no), el('span', { class: 'muted' }, dfull(o.createdAt))),
        el('div', { class: 'ocard-body' },
          el('div', null, el('h3', null, orderTitle(o)), el('p', { class: 'muted clamp' }, o.service === 'stickers' ? o.hero : o.type)),
          s.img ? el('img', { src: s.img, alt: '' }) : null),
        needsAction(o) ? el('div', { class: 'pill orange' }, icon('bell'), t('needAction')) : null,
        o.unread ? el('span', { class: 'unread-pill' }, icon('message'), plural(t('newMsgs'), o.unread)) : null,
        stepperBar(o, false)),
      el('div', { class: 'ocard-foot' },
        el('div', { class: 'dl' }, icon('calendar'), el('div', null, el('small', null, t('deadline')), el('b', null, o.deadline || '—'))),
        el('button', { class: 'btn ghost small', onclick: function () { push('chat', { id: o.id }); } }, icon('message'), el('span', null, t('chat')), o.unread ? el('span', { class: 'cnt' }, String(o.unread)) : null),
        el('button', { class: 'btn ghost small', onclick: function () { push('files', { id: o.id }); } }, icon('paperclip'), el('span', null, t('files')))));
  }
  function ordersPage() {
    if (!S.orders.length) return [pageHead(t('ordersTitle'), t('ordersSub')), emptyState('mascot_pointing.webp', t('noOrders'), t('noOrdersText'), primary(t('createOrder'), function () { startWizard(''); }, { arrow: true }))];
    var sorted = S.orders.slice().sort(function (a, b) { return Number(needsAction(b)) - Number(needsAction(a)); });
    return [pageHead(t('ordersTitle'), t('ordersSub'), studioChip()), sorted.map(orderCard)];
  }
  function findOrder() { var id = Number(view.params.id); return S.orders.filter(function (o) { return o.id === id; })[0] || null; }
  function orderPage() {
    var o = findOrder();
    if (!o) return [el('p', { class: 'muted' }, t('nothing'))];
    var s = svc(o.service) || {};
    var st = stages(o) || [];
    var cur = o.status === 'done' ? 'cur_done' : o.status === 'new' ? 'cur_new' : o.sketch ? 'cur_sketch' : (o.steps || []).some(function (x) { return x.key === 'changes'; }) ? 'cur_changes' : 'cur_work';
    // Поточний етап: той, що «зараз», інакше — останній завершений
    var curStage = st.filter(function (x) { return x.state === 'now'; })[0] || st.filter(function (x) { return x.state === 'done'; }).pop();
    var lastMsgs = (o.messages || []).slice(-2);
    return [
      el('div', { class: 'ohead' }, el('h1', null, t('orderN', { n: o.no })), statusPill(o)),
      el('button', { class: 'link back', onclick: back }, icon('chevron-left'), t('toOrders')),
      stageAsk(o) ? stageCheckBlock(o) : null,
      o.quote ? quoteBlock(o) : null,
      o.sketch ? sketchBlock(o) : null,
      o.pay ? payBlock(o) : null,
      finalsBlock(o),
      planBlock(o),
      el('div', { class: 'card oinfo' },
        el('div', { class: 'oinfo-top' }, s.img ? el('img', { src: s.img, alt: '' }) : null,
          el('div', null, el('h3', null, o.service === 'stickers' ? nm(s, 'one') || o.type : o.hero), el('div', { class: 'chips wrap' }, pill(o.type), o.service === 'stickers' ? pill(o.qty) : pill(o.qty)),
            el('p', { class: 'muted clamp3' }, o.service === 'stickers' ? o.hero : o.about),
            o.project && o.project.budget ? el('div', { class: 'muted' }, t('budgetQ') + ': ' + o.project.budget) : null)),
        el('div', { class: 'oinfo-foot' },
          el('div', { class: 'dl' }, icon('calendar'), el('div', null, el('small', null, t('deadline')), el('b', null, o.deadline || (o.project && o.project.deadline) || '—'))),
          o.price ? el('div', { class: 'dl' }, icon('orders'), el('div', null, el('small', null, t('price')), el('b', null, money(o.price) + (o.paid ? ' · ' + t('paid') + ' ' + money(o.paid) : '')))) : null)),
      el('div', { class: 'card' },
        el('div', { class: 'row-between' }, el('h3', null, t('stages')), el('span', { class: 'muted' }, st.filter(function (x) { return x.state === 'done'; }).length + ' / ' + st.length)),
        stepperBar(o, true),
        curStage ? el('div', { class: 'cur' }, el('span', { class: 'cur-ic' }, icon('clock')), el('div', null, el('small', { class: 'muted' }, t('current')), el('b', null, o.stage && o.status !== 'done' ? t('stageOf', { n: st.indexOf(curStage) + 1, m: st.length }) + ': ' + curStage.label : curStage.label), el('p', { class: 'muted' }, t(cur)))) : null,
        stageDemo(o)),
      o.files.length ? el('div', { class: 'card' },
        el('div', { class: 'row-between' }, el('h3', null, t('lastFiles')), el('button', { class: 'link', onclick: function () { push('files', { id: o.id }); } }, t('more'))),
        el('div', { class: 'file-strip' }, o.files.slice(-4).reverse().map(fileThumb))) : null,
      lastMsgs.length ? el('div', { class: 'card' },
        el('div', { class: 'row-between' }, el('h3', null, t('lastComments'), o.unread ? el('span', { class: 'cnt' }, String(o.unread)) : null), el('button', { class: 'link', onclick: function () { push('chat', { id: o.id }); } }, t('more'))),
        lastMsgs.map(msgRow)) : null,
      o.pack ? primary(t('addPack'), function () { openPack(o.pack.name); }, { icon: 'sticker', cls: 'big' }) : null,
      fixBlock(o),
      reviewBlock(o),
      repeatButtons(o),
      docsBlock(o),
      el('div', { class: 'row2' },
        primary(t('openChat') + (o.unread ? ' (' + o.unread + ')' : ''), function () { push('chat', { id: o.id }); }, { icon: 'send' }),
        el('button', { class: 'btn ghost', onclick: function () { push('files', { id: o.id }); } }, icon('files'), el('span', null, t('viewFiles')))),
      o.canCancel ? el('button', { class: 'link danger center-b', onclick: function () { cancelOrder(o); } }, t('cancel')) : null
    ];
  }
  function fileThumb(f) {
    return el('div', { class: 'fthumb' }, f.kind === 'video' ? el('video', { src: f.url, muted: true, playsinline: true }) : el('img', { src: f.url, alt: '', loading: 'lazy' }),
      el('small', null, f.from === 'client' ? t('fromYou') : t('sketchV', { n: f.round || 1 })));
  }
  function msgRow(m) {
    return el('div', { class: 'mrow' }, el('img', { class: 'ava', src: m.from === 'client' ? 'a/mascot_front.webp' : 'a/stk_wave.webp', alt: '' }),
      el('div', null, el('div', { class: 'row-between' }, el('b', null, m.from === 'client' ? t('you') : (m.by || t('studio'))), el('small', { class: 'muted' }, dtime(m.at))),
        el('p', { class: 'muted' }, (m.media || []).length ? '📎 ' : '', m.text || '')));
  }
  // План оплати за етапами (проєкти)
  // Правка після здачі
  var fixDraft = {};
  function fixBlock(o) {
    if (o.fixOpen) return el('div', { class: 'card note' }, icon('clock'), el('div', null, el('b', null, t('fixWait')), el('p', { class: 'muted pre' }, o.fixOpen.text)));
    if (!o.fixUntil) return null;
    var d = fixDraft[o.id];
    if (!d) return el('div', { class: 'card fix-card' }, el('div', null, el('b', null, t('fixTitle')), el('small', { class: 'muted' }, t('fixText', { d: o.fixUntil }))),
      el('button', { class: 'btn ghost small', onclick: function () { fixDraft[o.id] = { text: '', refs: [] }; render(); } }, icon('edit'), el('span', null, t('fixBtn'))));
    var box = el('textarea', { placeholder: t('fixPh'), maxlength: '2000', oninput: function (e) { d.text = e.target.value; } });
    box.value = d.text;
    return el('div', { class: 'card act' }, el('div', { class: 'act-head' }, icon('edit'), el('h3', null, t('fixBtn'))), box,
      photoPicker(d.refs, 10, t('addPhoto'), function () { render(); }),
      el('div', { class: 'row2' },
        primary(t('fixSend'), function () {
          if (d.text.trim().length < 3) { toast(t('fixPh')); return; }
          if (uploading) { toast(t('waitUpload')); return; }
          act('fix', { orderId: o.id, text: d.text, refs: d.refs.map(function (r) { return r.token; }) }).then(function () { delete fixDraft[o.id]; render(); });
        }, { icon: 'send' }),
        el('button', { class: 'btn ghost', onclick: function () { delete fixDraft[o.id]; render(); } }, icon('close'))));
  }
  function planBlock(o) {
    if (!o.payPlan) return null;
    return el('div', { class: 'card' }, el('div', { class: 'act-head' }, icon('shield'), el('h3', null, t('planTitle'))),
      o.payPlan.map(function (p) {
        return el('div', { class: 'plan-row ' + p.status },
          el('div', null, el('b', null, p.percent + '%' + (p.amount ? ' · ' + money(p.amount) : '')), el('small', { class: 'muted' }, t('planStage', { s: lang === 'en' ? p.stageEn : p.stage }))),
          el('span', { class: 'tag' + (p.status === 'due' ? ' red' : '') }, t('pl_' + p.status)));
      }));
  }
  function openUrl(u) { try { tg.openLink(u); } catch (e) { window.open(u, '_blank'); } }
  // Демо до поточного етапу (посилання й коментар студії) та відповідь клієнта
  function stageDemo(o) {
    if (!o.stage || stageAsk(o)) return null;
    var i = Math.min(o.stage.idx, o.stage.steps.length - 1), info = (o.stage.info || {})[i];
    if (!info || !(info.link || info.note || info.answer)) return null;
    return el('div', { class: 'stage-demo' },
      info.note ? el('p', { class: 'pre' }, info.note) : null,
      info.link ? el('button', { class: 'btn ghost small', onclick: function () { openUrl(info.link); } }, icon('external'), el('span', null, t('stOpen'))) : null,
      info.answer ? el('small', { class: 'muted' }, info.answer.ok ? '✅ ' + t('stAccepted') : '✏️ ' + t('stCommented')) : null);
  }
  function stageCheckBlock(o) {
    var a = stageAsk(o), key = 'st' + o.id + ':' + a.idx;
    var box = el('textarea', { placeholder: t('stChangesPh'), maxlength: '2000' });
    return el('div', { class: 'card act' }, el('div', { class: 'act-head' }, icon('eye'), el('h3', null, t('stCheck') + ': ' + a.name)),
      a.info.note ? el('p', { class: 'pre' }, a.info.note) : null,
      a.info.link ? el('button', { class: 'btn ghost', onclick: function () { openUrl(a.info.link); } }, icon('external'), el('span', null, t('stOpen'))) : null,
      changesOpen[key] ? [box, el('div', { class: 'row2' },
        primary(t('stSend'), function () { if (!box.value.trim()) return; act('stage', { orderId: o.id, idx: a.idx, ok: false, text: box.value }).then(function () { delete changesOpen[key]; render(); }); }, { icon: 'send' }),
        el('button', { class: 'btn ghost', onclick: function () { delete changesOpen[key]; render(); } }, icon('close')))]
        : el('div', { class: 'row2' },
          primary(t('stOk'), function () { act('stage', { orderId: o.id, idx: a.idx, ok: true }); }, { icon: 'check' }),
          el('button', { class: 'btn ghost', onclick: function () { changesOpen[key] = true; render(); } }, icon('edit'), el('span', null, t('stChanges')))));
  }
  function quoteBlock(o) {
    var q = o.quote;
    return el('div', { class: 'card act' }, el('div', { class: 'act-head' }, icon('orders'), el('h3', null, t('quote'))),
      el('div', { class: 'big-num' }, money(q.amount)),
      q.due ? el('div', { class: 'muted' }, t('quoteDue', { d: q.due })) : q.days ? el('div', { class: 'muted' }, t('quoteDays', { n: q.days })) : null,
      q.items ? el('ul', { class: 'checklist small' }, q.items.split('\n').filter(Boolean).map(function (x) { return el('li', null, icon('check-circle'), el('span', null, x)); })) : null,
      q.comment ? el('p', { class: 'muted pre' }, q.comment) : null,
      q.status === 'question' ? el('div', { class: 'note small' }, t('asked')) : null,
      el('div', { class: 'row2' },
        primary(t('accept'), function () { act('quote', { orderId: o.id, n: q.n, accept: true }); }, { icon: 'check' }),
        q.status === 'sent' ? el('button', { class: 'btn ghost', disabled: busy, onclick: function () { act('quote', { orderId: o.id, n: q.n, accept: false }); } }, el('span', null, t('ask'))) : null));
  }
  function sketchBlock(o) {
    var s = o.sketch, key = o.id + ':' + s.round;
    var box = el('textarea', { placeholder: t('changesPh'), maxlength: '2000' });
    return el('div', { class: 'card act' }, el('div', { class: 'act-head' }, icon('eye'), el('h3', null, t('sketch') + ' · ' + t('version') + ' ' + s.round)),
      s.comment ? el('p', { class: 'pre' }, s.comment) : null,
      el('div', { class: 'gallery' }, s.media.map(function (m) { return m.video ? el('video', { src: m.url, controls: true, playsinline: true }) : el('img', { src: m.url, alt: '', loading: 'lazy' }); })),
      s.files ? el('div', { class: 'muted' }, t('moreFiles', { n: s.files })) : null,
      changesOpen[key] ? [box, el('div', { class: 'row2' },
        primary(t('sendChanges'), function () { act('sketch', { orderId: o.id, round: s.round, approve: false, text: box.value }).then(function () { delete changesOpen[key]; render(); }); }, { icon: 'send' }),
        el('button', { class: 'btn ghost', onclick: function () { delete changesOpen[key]; render(); } }, icon('close')))]
        : el('div', { class: 'row2' },
          primary(t('approve'), function () { act('sketch', { orderId: o.id, round: s.round, approve: true }); }, { icon: 'check' }),
          el('button', { class: 'btn ghost', onclick: function () { changesOpen[key] = true; render(); } }, icon('edit'), el('span', null, t('changes')))));
  }
  function payBlock(o) {
    var p = o.pay;
    var head = [el('div', { class: 'act-head' }, icon('shield'), el('h3', null, t(p.kind) + ' · #' + o.no)), el('div', { class: 'big-num' }, money(p.amount))];
    if (p.method === 'mono') {
      return el('div', { class: 'card act' }, head, p.url ? primary(t('payBtn') + ' ' + money(p.amount), function () { try { tg.openLink(p.url); } catch (e) { window.open(p.url, '_blank'); } }, { arrow: true }) : null);
    }
    var c = p.card || {};
    return el('div', { class: 'card act' }, head,
      el('div', { class: 'muted' }, t('cardTo')),
      el('div', { class: 'cardno' }, el('span', null, c.number), el('button', { class: 'btn small', onclick: function () { copy(String(c.number || '').replace(/\s/g, '')); } }, el('span', null, t('copy')))),
      c.recipient ? el('div', { class: 'kv' }, el('span', null, t('recipient')), el('b', null, c.recipient)) : null,
      c.note ? el('p', { class: 'muted' }, c.note) : null,
      p.status === 'reported' ? el('div', { class: 'note small' }, icon('clock'), el('span', null, t('checking')))
        : primary(t('iPaid'), function () { act('paid', { orderId: o.id, idx: p.idx }); }, { icon: 'check' }));
  }
  function copy(text) {
    var done = function () { haptic('ok'); toast(t('copied')); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = el('textarea', { value: text }); document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  }
  function cancelOrder(o) {
    var run = function (id) { if (id !== null && id !== undefined && id !== '' && id !== 'no') act('cancel', { orderId: o.id, reason: Number(id) }); };
    try {
      tg.showPopup({ title: t('cancel') + ' #' + o.no, message: t('cancelQ'), buttons: [{ id: '0', type: 'default', text: t('r0') }, { id: '1', type: 'default', text: t('r1') }, { id: '3', type: 'destructive', text: t('r3') }] }, run);
    } catch (e) { if (confirm(t('cancel') + '?')) run('3'); }
  }

  function fsize(n) { return n ? (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB') : ''; }
  function downloadFile(f) {
    if (f.url) { try { tg.openLink(f.url); } catch (e) { window.open(f.url, '_blank'); } return; }
    if (!f.dl) { toast(t('inChat')); return; }
    var abs = new URL(f.dl, location.href).href;
    try { if (tg.downloadFile) { tg.downloadFile({ url: abs, file_name: f.name }); return; } } catch (e) { /* старий Telegram */ }
    try { tg.openLink(abs); } catch (e) { window.open(abs, '_blank'); }
  }
  function finalsBlock(o) {
    if (!(o.finals || []).length) return null;
    return el('div', { class: 'card finals-card' },
      el('div', { class: 'act-head' }, icon('download'), el('h3', null, t('finalsTitle'))),
      o.finals.slice().reverse().map(function (f) {
        return el('div', { class: 'final-row' }, el('span', { class: 'final-ic' }, icon(f.kind === 'link' ? 'external' : 'files')),
          el('div', null, el('b', null, f.name), el('small', { class: 'muted' }, [fsize(f.size), f.at ? dfull(f.at) : ''].filter(Boolean).join(' · ') || (f.kind === 'link' ? 'link' : ''))),
          el('button', { class: 'btn small', onclick: function () { downloadFile(f); } }, el('span', null, f.kind === 'link' ? t('openLink') : f.dl ? t('download') : t('inChat'))));
      }));
  }

  // ---------- файли й чат замовлення ----------
  function segFC(o, active) {
    return el('div', { class: 'seg-tabs' },
      el('button', { class: active === 'files' ? 'on' : '', onclick: function () { if (active !== 'files') { view.page = 'files'; render(); } } }, t('files')),
      el('button', { class: active === 'chat' ? 'on' : '', onclick: function () { if (active !== 'chat') { view.page = 'chat'; render(); } } }, t('chat')));
  }
  var extraRefs = [];
  function filesPage() {
    var o = findOrder();
    if (!o) return [el('p', null, t('nothing'))];
    var picker = photoPicker(extraRefs, 10, t('addFile'), function () { render(); });
    return [
      el('div', { class: 'ohead' }, el('h1', null, t('orderN', { n: o.no })), statusPill(o)),
      el('p', { class: 'sub' }, orderTitle(o)),
      segFC(o, 'files'),
      finalsBlock(o),
      el('div', { class: 'row-between' }, el('h2', { class: 'h2' }, t('filesTitle'), el('span', { class: 'muted' }, ' (' + o.files.length + ')'))),
      el('div', { class: 'card' }, picker, extraRefs.length ? primary(t('send') + ' (' + extraRefs.length + ')', function () {
        act('files', { orderId: o.id, refs: extraRefs.map(function (r) { return r.token; }) }).then(function () { extraRefs = []; render(); });
      }, { icon: 'upload', disabled: uploading > 0 }) : null),
      o.files.length ? el('div', { class: 'file-list' }, o.files.slice().reverse().map(function (f) {
        return el('a', { class: 'card frow', href: f.url, target: '_blank' }, f.kind === 'video' ? el('video', { src: f.url, muted: true, playsinline: true }) : el('img', { src: f.url, alt: '', loading: 'lazy' }),
          el('div', null, el('b', null, f.from === 'client' ? t('fromYou') : t('sketchV', { n: f.round || 1 })), el('small', { class: 'muted' }, f.at ? dfull(f.at) : '')), icon('eye'));
      })) : emptyState('empty_files.svg', t('noFiles'), t('noFilesText'))
    ];
  }
  function bubbleMedia(x) {
    if (x.kind === 'img') return el('img', { src: x.url, alt: '', loading: 'lazy', onclick: function () { openViewer(x.url, ''); } });
    if (x.kind === 'video') return el('video', { src: x.url, controls: true, playsinline: true, preload: 'metadata' });
    if (x.kind === 'audio') return el('audio', { src: x.url, controls: true, preload: 'none' });
    return el('button', { class: 'bfile', onclick: function () { downloadFile({ dl: x.url, name: x.name }); } }, icon('files'), el('span', null, x.name || 'file'), x.size ? el('small', null, fsize(x.size)) : null);
  }
  // ---------- голосове в чаті ----------
  var rec = null;
  function canRecord() { return Boolean(window.MediaRecorder && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  function fmtSec(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function recMime() {
    var list = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
    for (var i = 0; i < list.length; i++) { try { if (MediaRecorder.isTypeSupported(list[i])) return list[i]; } catch (e) {} }
    return '';
  }
  function startRec(o) {
    if (rec) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var mime = recMime();
      var r = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      var cur = { r: r, chunks: [], start: Date.now(), stream: stream, orderId: o.id, send: false };
      rec = cur;
      r.ondataavailable = function (e) { if (e.data && e.data.size) cur.chunks.push(e.data); };
      r.onstop = function () {
        clearInterval(cur.tick);
        cur.stream.getTracks().forEach(function (tr) { tr.stop(); });
        if (rec === cur) rec = null;
        if (cur.send) sendVoice(cur); else render();
      };
      r.start();
      cur.tick = setInterval(function () {
        var tEl = document.getElementById('rec-time');
        if (tEl) tEl.textContent = fmtSec((Date.now() - cur.start) / 1000);
        if (Date.now() - cur.start > 120000) stopRec(true);
      }, 250);
      haptic(); render();
    }).catch(function () { alertMsg(t('micDenied')); });
  }
  function stopRec(send) {
    if (!rec) return;
    rec.send = send;
    try { rec.r.stop(); } catch (e) { rec = null; render(); }
  }
  function sendVoice(cur) {
    var blob = new Blob(cur.chunks, { type: cur.r.mimeType || 'audio/webm' });
    if (Date.now() - cur.start < 800 || blob.size < 400) { toast(t('recShort')); render(); return; }
    busy = true; render();
    fetch('api/voice', { method: 'POST', headers: { 'content-type': blob.type || 'audio/webm', 'x-init-data': initData, 'x-order-id': String(cur.orderId) }, body: blob })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || t('err')); return j; }); })
      .then(function (j) { busy = false; if (j.state) S = j.state; haptic('ok'); render(); window.scrollTo(0, document.body.scrollHeight); })
      .catch(function (e) { busy = false; haptic('error'); render(); alertMsg(e.message); });
  }
  function chatPage() {
    var o = findOrder();
    if (!o) return [el('p', null, t('nothing'))];
    // Нові повідомлення: розділювач перед ними й позначка «прочитано» на сервері
    if (o.unread > 0) {
      chatNew[o.id] = Math.max(0, o.messages.length - o.unread);
      o.unread = 0;
      api('seen', { orderId: o.id }).catch(function () {});
    }
    var newFrom = chatNew[o.id] === undefined ? -1 : chatNew[o.id];
    var input = el('input', { class: 'chat-input', placeholder: t('msgPh'), maxlength: '2000', onkeydown: function (e) { if (e.key === 'Enter') sendMsg(); } });
    // Скрепка: фото одразу завантажуються й додаються до замовлення
    var fileInput = el('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none' });
    fileInput.addEventListener('change', function () {
      var files = Array.prototype.slice.call(fileInput.files || [], 0, 10);
      fileInput.value = '';
      if (!files.length) return;
      uploading += files.length; render();
      Promise.all(files.map(function (f) { return uploadFile(f).then(function (j) { return j.token; }, function (e) { toast(e.message); return null; }).then(function (tk) { uploading--; return tk; }); }))
        .then(function (tokens) { tokens = tokens.filter(Boolean); if (tokens.length) act('files', { orderId: o.id, refs: tokens }); else render(); });
    });
    var pick = el('button', { class: 'clip', 'aria-label': 'file', onclick: function () { fileInput.click(); } }, uploading ? el('span', { class: 'spinner sm' }) : icon('paperclip'), fileInput);
    function sendMsg() {
      var text = input.value.trim();
      if (!text) return;
      input.value = '';
      act('message', { orderId: o.id, text: text }).then(function () { window.scrollTo(0, document.body.scrollHeight); });
    }
    return [
      el('div', { class: 'ohead' }, el('h1', null, t('orderN', { n: o.no })), statusPill(o)),
      el('p', { class: 'sub' }, orderTitle(o)),
      segFC(o, 'chat'),
      el('h2', { class: 'h2' }, t('chatTitle')),
      replyTimeLine(),
      o.messages.length ? el('div', { class: 'thread' }, o.messages.map(function (m, mi) {
        return [mi === newFrom ? el('div', { class: 'new-divider' }, el('span', null, t('newDivider'))) : null, el('div', { class: 'bwrap ' + (m.from === 'client' ? 'me' : 'them') },
          m.from === 'client' ? null : el('img', { class: 'ava', src: 'a/stk_wave.webp', alt: '' }),
          el('div', { class: 'bubble' + ((m.media || []).length ? ' has-media' : '') }, m.from === 'client' ? null : el('small', { class: 'who' }, m.by || t('studio')),
            (m.media || []).length ? el('div', { class: 'bmedia n' + Math.min(m.media.length, 4) }, m.media.map(bubbleMedia)) : null,
            m.text ? el('div', { class: 'pre' }, m.text) : null, el('small', { class: 'when' }, dtime(m.at))))];
      })) : el('p', { class: 'muted center' }, t('noMsgs')),
      rec && rec.orderId === o.id
        ? el('div', { class: 'chat-bar rec' },
          el('button', { class: 'clip', 'aria-label': 'cancel', onclick: function () { stopRec(false); } }, icon('close')),
          el('span', { class: 'rec-dot' }), el('b', { id: 'rec-time' }, fmtSec((Date.now() - rec.start) / 1000)), el('span', { class: 'muted grow' }, t('recording')),
          el('button', { class: 'send', 'aria-label': 'send', onclick: function () { stopRec(true); } }, icon('send')))
        : el('div', { class: 'chat-bar' }, el('span', { class: 'att' }, pick), input,
          canRecord() ? el('button', { class: 'clip mic', disabled: busy, 'aria-label': 'voice', onclick: function () { startRec(o); } }, icon('mic')) : null,
          el('button', { class: 'send', disabled: busy, onclick: sendMsg, 'aria-label': 'send' }, icon('send')))
    ];
  }

  // ---------- профіль ----------
  function profilePage() {
    var p = S.profile || {};
    var contact = el('input', { value: p.contact || '', placeholder: t('contactPh'), maxlength: '200' });
    var sw = el('button', { class: 'switch' + (p.notify ? ' on' : ''), role: 'switch', 'aria-checked': p.notify ? 'true' : 'false', onclick: function () {
      p.notify = !p.notify; act('profile', { notify: p.notify }).catch(function () {});
    } }, el('i'));
    var menu = [
      ['orders', t('history'), function () { go('orders'); }],
      ['help', t('help'), function () { push('faq'); }],
      ['message', t('askQ'), function () { push('ask'); }],
      ['catalog', t('pricesT'), function () { push('prices'); }]
    ];
    return [
      pageHead(t('profTitle'), t('profSub'), studioChip()),
      el('div', { class: 'card prof' }, el('div', { class: 'ava-big' }, el('img', { src: 'a/mascot_front.webp', alt: '' })),
        el('div', null, el('h2', null, [p.firstName, p.lastName].filter(Boolean).join(' ') || 'YABOT'),
          p.username ? el('div', { class: 'muted ic-line' }, icon('send'), '@' + p.username) : null,
          p.since ? el('div', { class: 'muted ic-line' }, icon('clock'), dfull(p.since)) : null)),
      el('div', { class: 'card' }, el('div', { class: 'lbl' }, t('contactEdit')), el('div', { class: 'row-in' }, contact,
        el('button', { class: 'btn small', disabled: busy, onclick: function () { act('profile', { contact: contact.value }).then(function () { toast(t('saved')); }); } }, el('span', null, t('save'))))),
      inviteCard(),
      el('div', { class: 'card setting' }, icon('bell'), el('div', null, el('b', null, t('notif')), el('div', { class: 'muted' }, t('notifText'))), sw),
      S.english ? el('div', { class: 'card setting' }, icon('info'), el('div', null, el('b', null, t('language'))),
        el('div', { class: 'seg-mini' }, [['uk', 'Українська'], ['en', 'English']].map(function (l) {
          return el('button', { class: lang === l[0] ? 'on' : '', onclick: function () { if (lang === l[0]) return; act('profile', { lang: l[0] }).then(function (r) { lang = l[0]; document.documentElement.lang = lang; render(); }); } }, l[1]);
        }))) : null,
      el('div', { class: 'card menu' }, menu.map(function (m) { return el('button', { class: 'menu-row', onclick: m[2] }, icon(m[0]), el('span', null, m[1]), icon('chevron-right', 'chev')); }))
    ];
  }
  function faqPage() { return [pageHead(t('help')), faqList()]; }
  function pricesPage() {
    var rows = [];
    ['static', 'animated'].forEach(function (k) {
      var r = S.prices.rows[k] || {};
      Object.keys(r).forEach(function (q) { rows.push(el('div', { class: 'kv' }, el('span', null, t(k) + ', ' + (QTY[q] || q)), el('b', null, r[q]))); });
    });
    return [pageHead(t('pricesT')),
      el('div', { class: 'card' }, S.services.filter(function (s) { return s.priceFrom; }).map(function (s) { return el('div', { class: 'kv' }, el('span', null, nm(s, 'name')), el('b', { class: 'orange-t' }, t('from') + ' ' + money(s.priceFrom))); }),
        S.packages.map(function (p) { return el('div', { class: 'kv' }, el('span', null, nm(p, 'name')), el('b', null, money(p.price))); }), rows,
        el('p', { class: 'muted' }, S.prices.note || t('pricesNone')))];
  }
  var aiWaiting = null; // текст, що зараз відправляється помічнику
  var aiWaitingImage = null; // превью фото, що зараз відправляється
  var aiThumbs = {};    // превью надісланих фото: час повідомлення → картинка (до перезапуску застосунку)
  var aiRec = null;     // запис голосового для помічника (WAV)
  var aiRated = {};     // відповіді, які людина вже оцінила (за часом відповіді)
  var aiSuggest = [];   // підказки наступного питання від помічника
  var aiQuote = null;   // розрахунок помічника: { typeKey, qtyKey, label, price } — картка з кнопкою оформлення
  function aiPage() {
    var input = el('input', { class: 'chat-input', placeholder: t('aiPh'), maxlength: '1000', onkeydown: function (e) { if (e.key === 'Enter') send(); } });
    function ask(payload, shown, image) {
      aiWaiting = shown; aiWaitingImage = image || null; render(); window.scrollTo(0, document.body.scrollHeight);
      return api('consult', payload)
        .then(function (j) {
          aiWaiting = null; aiWaitingImage = null;
          S.aiChat = j.messages || S.aiChat;
          if (image) { var mine = (S.aiChat || []).filter(function (m) { return m.from === 'client'; }).pop(); if (mine) aiThumbs[mine.at] = image; }
          aiSuggest = j.suggest || [];
          aiQuote = j.quote || null;
          if (j.forwarded || j.relayed) toast(t('aiForwarded'));
          haptic('ok'); render(); window.scrollTo(0, document.body.scrollHeight);
        })
        .catch(function (e) { aiWaiting = null; aiWaitingImage = null; haptic('error'); render(); alertMsg(e.message); if (payload.text && !payload.image) input.value = payload.text; });
    }
    function send() {
      var text = input.value.trim();
      if (!text || aiWaiting !== null) return;
      ask({ text: text }, text);
    }
    // Фото: зменшуємо на телефоні (до 1280 px) і робимо превью; підпис — те, що набрано в полі
    function shrink(img, max, quality) {
      var scale = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
      canvas.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', quality);
    }
    var photoInput = el('input', { type: 'file', accept: 'image/*', class: 'chat-file' });
    photoInput.addEventListener('change', function () {
      var file = photoInput.files && photoInput.files[0];
      photoInput.value = '';
      if (!file || aiWaiting !== null) return;
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var big = shrink(img, 1280, 0.85);
        var small = shrink(img, 320, 0.7);
        URL.revokeObjectURL(url);
        var caption = input.value.trim();
        input.value = '';
        ask({ text: caption, image: { data: big.split(',')[1], thumb: small.split(',')[1] } }, caption, small);
      };
      img.onerror = function () { URL.revokeObjectURL(url); haptic('error'); alertMsg(t('aiPhotoBad')); };
      img.src = url;
    });
    var photoBtn = el('button', { class: 'clip', disabled: aiWaiting !== null, 'aria-label': 'photo', onclick: function () { photoInput.click(); } }, icon('camera'), photoInput);
    // Голосове: пишемо звук з мікрофона, на відправці — WAV 16 кГц (однаково на будь-якому телефоні)
    function canAiRecord() { return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext)); }
    function startAiRec() {
      if (aiRec || aiWaiting !== null) return;
      var Ctx = window.AudioContext || window.webkitAudioContext;
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        var ctx = new Ctx();
        var source = ctx.createMediaStreamSource(stream);
        var proc = ctx.createScriptProcessor(4096, 1, 1);
        var cur = { stream: stream, ctx: ctx, proc: proc, chunks: [], start: Date.now() };
        proc.onaudioprocess = function (e) { cur.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
        source.connect(proc);
        proc.connect(ctx.destination);
        aiRec = cur;
        cur.tick = setInterval(function () {
          var tEl = document.getElementById('ai-rec-time');
          if (tEl) tEl.textContent = fmtSec((Date.now() - cur.start) / 1000);
          if (Date.now() - cur.start > 120000) stopAiRec(true);
        }, 250);
        haptic(); render();
      }).catch(function () { alertMsg(t('micDenied')); });
    }
    function stopAiRec(sendIt) {
      var cur = aiRec;
      if (!cur) return;
      aiRec = null;
      clearInterval(cur.tick);
      try { cur.proc.disconnect(); } catch (e) { /* уже відключено */ }
      cur.stream.getTracks().forEach(function (tr) { tr.stop(); });
      var rate = cur.ctx.sampleRate;
      try { cur.ctx.close(); } catch (e) { /* уже закрито */ }
      var total = cur.chunks.reduce(function (n, c) { return n + c.length; }, 0);
      if (!sendIt) { render(); return; }
      if (total < rate * 0.7) { toast(t('recShort')); render(); return; }
      ask({ voice: wavBase64(cur.chunks, total, rate) }, '🎙 …');
    }
    // Float32 будь-якої частоти → моно 16 кГц, PCM 16 біт, WAV → base64
    function wavBase64(chunks, total, rate) {
      var all = new Float32Array(total);
      var at = 0;
      chunks.forEach(function (c) { all.set(c, at); at += c.length; });
      var n = Math.floor(total * 16000 / rate);
      var buf = new ArrayBuffer(44 + n * 2);
      var v = new DataView(buf);
      function str(o, x) { for (var i = 0; i < x.length; i++) v.setUint8(o + i, x.charCodeAt(i)); }
      str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
      str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
      str(36, 'data'); v.setUint32(40, n * 2, true);
      for (var j = 0; j < n; j++) {
        var pos = j * rate / 16000, k = Math.floor(pos), fr = pos - k;
        var smp = Math.max(-1, Math.min(1, all[k] * (1 - fr) + (all[k + 1] || 0) * fr));
        v.setInt16(44 + j * 2, smp < 0 ? smp * 32768 : smp * 32767, true);
      }
      var bytes = new Uint8Array(buf), bin = '';
      for (var b = 0; b < bytes.length; b += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(b, b + 32768));
      return btoa(bin);
    }
    var list = (S.aiChat || []).slice();
    // Оцінка останньої відповіді помічника (одна на відповідь)
    var lastAi = -1;
    list.forEach(function (m, i) { if (m.from === 'ai') lastAi = i; });
    function rate(up) {
      var key = list[lastAi] && list[lastAi].at;
      aiRated[key] = true; render();
      api('airate', { up: up }).then(function () { toast(t('aiThanks')); }).catch(function () {});
    }
    function bubble(from, text, at, extra) {
      var me = from === 'client';
      var photo = me && at && aiThumbs[at];
      return el('div', { class: 'bwrap ' + (me ? 'me' : 'them') },
        me ? null : el('img', { class: 'ava', src: 'a/stk_wave.webp', alt: '' }),
        el('div', { class: 'bubble' }, me ? null : el('small', { class: 'who' }, from === 'studio' ? t('studio') : t('aiWho')),
          photo ? el('img', { class: 'ai-photo', src: photo, alt: '' }) : null,
          el('div', { class: 'pre' }, photo ? text.replace(/^📷\s*/, '') : text), at ? el('small', { class: 'when' }, dtime(at)) : extra || null));
    }
    return [
      pageHead(t('aiTitle')),
      el('div', { class: 'thread' },
        bubble('ai', t('aiHello')),
        list.map(function (m, i) {
          var b = bubble(m.from, m.text, m.at);
          if (i !== lastAi || aiWaiting !== null) return b;
          var chips = aiSuggest.length ? el('div', { class: 'ai-suggest' }, aiSuggest.map(function (q) {
            return el('button', { class: 'btn small ghost', onclick: function () { input.value = q; aiSuggest = []; send(); } }, q);
          })) : null;
          // Розрахунок від помічника: ціна з прайсу й кнопка — майстер замовлення з цим типом і кількістю
          var quote = aiQuote ? el('div', { class: 'card ai-quote' },
            el('div', null, '💰 ', el('b', null, aiQuote.label), ' — ' + aiQuote.price),
            el('small', { class: 'muted' }, t('aiQuoteNote')),
            el('button', { class: 'btn primary small', onclick: function () {
              form.service = 'stickers'; form.typeKey = aiQuote.typeKey; form.qtyKey = aiQuote.qtyKey; form.packageId = ''; form.qtyCustom = '';
              aiQuote = null; startWizard('stickers');
            } }, t('aiQuoteBtn'), icon('arrow-right'))) : null;
          chips = [quote, chips];
          if (aiRated[m.at]) return [b, chips];
          return [b, el('div', { class: 'ai-rate' },
            el('button', { class: 'btn small ghost', onclick: function () { rate(true); } }, '👍'),
            el('button', { class: 'btn small ghost', onclick: function () { rate(false); } }, '👎')), chips];
        }),
        aiWaiting !== null ? [aiWaitingImage
          ? el('div', { class: 'bwrap me' }, el('div', { class: 'bubble' }, el('img', { class: 'ai-photo', src: aiWaitingImage, alt: '' }), aiWaiting ? el('div', { class: 'pre' }, aiWaiting) : null))
          : bubble('client', aiWaiting), bubble('ai', t('aiThinking'), null, el('span', { class: 'spinner sm' }))] : null),
      aiRec
        ? el('div', { class: 'chat-bar rec' },
          el('button', { class: 'clip', 'aria-label': 'cancel', onclick: function () { stopAiRec(false); } }, icon('close')),
          el('span', { class: 'rec-dot' }), el('b', { id: 'ai-rec-time' }, fmtSec((Date.now() - aiRec.start) / 1000)), el('span', { class: 'muted grow' }, t('recording')),
          el('button', { class: 'send', 'aria-label': 'send', onclick: function () { stopAiRec(true); } }, icon('send')))
        : el('div', { class: 'chat-bar' }, el('span', { class: 'att' }, photoBtn), input,
          canAiRecord() ? el('button', { class: 'clip mic', disabled: aiWaiting !== null, 'aria-label': 'voice', onclick: startAiRec }, icon('mic')) : null,
          el('button', { class: 'send', disabled: Boolean(aiWaiting), onclick: send, 'aria-label': 'send' }, icon('send')))
    ];
  }
  function askPage() {
    if (S.aiChat) return aiPage();
    var box = el('textarea', { placeholder: t('askPh'), maxlength: '1000' });
    return [pageHead(t('askQ')), el('div', { class: 'card' }, box, primary(t('askSend'), function () { act('question', { text: box.value }).then(function () { toast(t('askSent')); box.value = ''; }); }, { icon: 'send' }))];
  }
  function worksPage() { return [pageHead(t('worksTitle')), worksList()]; }

  // =================== СТУДІЯ (власник і дизайнери) ===================
  var mode = 'client';     // 'client' | 'studio'
  var ST = null;           // стан студії
  var stab = 'today';      // today | list | order
  var sfilter = 'open', squery = '', OD = null, odLoading = false, orderFrom = 'list';
  var FIN = null, finPeriod = 'month', finLoading = false, psSel = null;
  var DUE = { overdue: '🔥 просрочено', today: '⏰ сегодня', tomorrow: '📅 завтра' };
  var PAYST = { created: '⏳ счёт выставлен', processing: '⏳ оплата идёт', hold: '⏳ оплата идёт', awaiting: '⏳ ждём перевод', reported: '🔔 клиент оплатил?', success: '✅ оплачено', manual: '✅ оплачено', expired: '✖ счёт истёк', failure: '✖ не прошла', cancelled: '✖ отменён', reversed: '↩ возврат', voided: '↩ отметка отменена' };
  var KIND = { advance: 'Аванс', final: 'Остаток', full: 'Полная оплата', stage: 'Этап' };

  function waitAgo(iso) {
    var m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
    return m < 60 ? m + ' мин' : m < 1440 ? Math.floor(m / 60) + ' ч' : Math.floor(m / 1440) + ' дн';
  }
  function rub(v) { return Number(v).toLocaleString('uk-UA', { maximumFractionDigits: 2 }).replace(/ /g, ' ') + ' грн'; }
  function dt(iso) { try { return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
  function confirmAsk(text, yes) {
    try { tg.showConfirm(text, function (ok) { if (ok) yes(); }); } catch (e) { if (confirm(text)) yes(); }
  }
  function sapi(name, body) {
    return api('studio/' + name, body);
  }
  function sact(action, data, okText) {
    if (busy || !OD) return Promise.resolve();
    busy = true; render();
    return sapi('action', { id: OD.id, action: action, data: data || {} }).then(function (r) {
      busy = false; OD = r.order; ST = r.state; haptic('ok'); render();
      toast(r.warning || okText || 'Готово');
      return r;
    }).catch(function (e) {
      busy = false; haptic('error'); render();
      try { tg.showAlert(e.message); } catch (x) { alert(e.message); }
      throw e;
    });
  }
  function loadStudio() {
    return sapi('boot').then(function (s) { ST = s; });
  }
  function openOrder(id) {
    if (stab !== 'order') orderFrom = stab;
    stab = 'order'; OD = null; odLoading = true; haptic(); render(); window.scrollTo(0, 0);
    try { tg.BackButton.show(); } catch (e) {}
    sapi('order', { id: id }).then(function (d) { OD = d; odLoading = false; render(); })
      .catch(function (e) { odLoading = false; stab = 'list'; render(); toast(e.message); });
  }
  function sgo(name) {
    stab = name; OD = null; haptic(); render(); window.scrollTo(0, 0);
    try { if (name === 'order') tg.BackButton.show(); else tg.BackButton.hide(); } catch (e) {}
  }
  function setMode(m) {
    mode = m; store('yabot-mode', m); haptic();
    if (m === 'client') { try { syncBack(); } catch (e) {} }
    if (m === 'studio' && !ST) { loadStudio().then(render).catch(function (e) { toast(e.message); }); }
    render(); window.scrollTo(0, 0);
  }
  function refreshStudio() {
    loadStudio().then(function () { render(); toast('Обновлено'); }).catch(function (e) { toast(e.message); });
  }

  function studioHeader() {
    return el('div', { class: 'head' }, el('img', { src: 'logo.jpg', alt: '' }),
      el('div', { style: 'flex:1' }, el('h1', null, ST.role === 'owner' ? 'Студия YABOT' : 'YABOT · ' + ST.name),
        el('p', null, ST.role === 'owner' ? 'Открытых заявок: ' + ST.counts.open : 'Ваши заявки: ' + ST.counts.open)),
      el('button', { class: 'btn small ghost', onclick: refreshStudio, 'aria-label': 'Обновить' }, '↻'));
  }

  var FILTERS = [
    ['open', 'Открытые', function (o) { return o.status === 'new' || o.status === 'in_progress'; }],
    ['new', 'Новые', function (o) { return o.status === 'new'; }],
    ['due', 'Сроки', function (o) { return o.dueState === 'overdue' || o.dueState === 'today' || o.dueState === 'tomorrow'; }],
    ['waiting', 'Ждут ответа', function (o) { return Boolean(o.waiting); }],
    ['fixes', 'Правки', function (o) { return Boolean(o.fixOpen); }],
    ['unread', 'Сообщения', function (o) { return o.unread > 0; }],
    ['sketch', 'Эскизы', function (o) { return o.sketch && o.sketch.status === 'pending'; }],
    ['pay', 'Оплата', function (o) { return o.pay && ['created', 'processing', 'hold', 'awaiting', 'reported'].indexOf(o.pay.status) >= 0; }, true],
    ['done', 'Готово', function (o) { return o.status === 'done'; }],
    ['all', 'Все', function () { return true; }]
  ];

  function todayPage() {
    var c = ST.counts;
    var tiles = [
      ['new', 'plus', c['new'], 'Новые'],
      ['due', 'clock', c.overdue + c.today, 'Сроки: просрочено и сегодня'],
      ['waiting', 'send', c.waiting || 0, 'Ждут ответа'],
      c.fixes ? ['fixes', 'edit', c.fixes, 'Правки после сдачи'] : null,
      ['unread', 'message', c.unread, 'Непрочитанные сообщения'],
      ['sketch', 'eye', c.sketches, 'Эскизы у клиента'],
      ST.role === 'owner' ? ['pay', 'bell', c.reported, 'Клиент сообщил об оплате'] : null,
      ST.role === 'owner' ? ['pay', 'shield', c.awaitingPay, 'Ждут оплаты'] : null
    ].filter(Boolean);
    var urgent = ST.orders.filter(function (o) {
      return o.fixOpen || (o.status === 'new' || o.status === 'in_progress') && (o.status === 'new' || o.unread > 0 || o.waiting || o.dueState === 'overdue' || o.dueState === 'today' || (o.pay && o.pay.status === 'reported'));
    }).slice(0, 12);
    return [
      studioHeader(),
      el('div', { class: 'tiles' }, tiles.map(function (tl) {
        return el('button', { class: 'tile' + (tl[2] ? ' hot' : ''), onclick: function () { sfilter = tl[0]; sgo('list'); } },
          el('div', { class: 'num' }, icon(tl[1], 'tile-ic'), String(tl[2])), el('div', { class: 'muted' }, tl[3]));
      })),
      el('h2', { style: 'margin:16px 2px 10px' }, urgent.length ? 'Требуют внимания' : 'Всё спокойно 🙌'),
      urgent.map(orderRow)
    ];
  }

  function orderRow(o) {
    return el('button', { class: 'card orow', onclick: function () { openOrder(o.id); } },
      el('div', { class: 'top' }, el('b', null, '#' + String(o.id).padStart(4, '0') + ' · ' + o.client), el('span', { class: 'muted' }, dt(o.createdAt).slice(0, 5))),
      el('div', { class: 'muted one' }, (o.service && o.service !== 'stickers' ? '🧩 ' + o.stickerType + ' — ' : o.stickerType + ', ' + o.quantity + ' — ') + o.hero),
      el('div', { class: 'badges' },
        el('span', { class: 'badge s-' + o.status }, o.statusLabel),
        o.dueState ? el('span', { class: 'badge ' + (o.dueState === 'overdue' ? 'red' : 'warn') }, DUE[o.dueState]) : o.deadline ? el('span', { class: 'badge' }, '📅 ' + o.deadline) : null,
        o.unread ? el('span', { class: 'badge red' }, '💬 ' + o.unread) : null,
        o.waiting ? el('span', { class: 'badge warn' }, '⏳ ждёт ответа ' + waitAgo(o.waiting)) : null,
        o.fixOpen ? el('span', { class: 'badge red' }, '✏️ правка') : null,
        o.sketch && o.sketch.status === 'pending' ? el('span', { class: 'badge warn' }, '🎨 эскизы у клиента') : null,
        o.pay && PAYST[o.pay.status] ? el('span', { class: 'badge' + (o.pay.status === 'reported' ? ' red' : '') }, PAYST[o.pay.status]) : null,
        ST.role === 'owner' && o.assigneeName ? el('span', { class: 'badge' }, '👤 ' + o.assigneeName) : null));
  }

  // ---------- фінанси (лише власник) ----------
  function loadFinance() {
    finLoading = true;
    return sapi('finance', { period: finPeriod }).then(function (f) { FIN = f; finLoading = false; if (stab === 'money') render(); })
      .catch(function (e) { finLoading = false; toast(e.message); });
  }
  function shortMoney(v) { return v >= 1000 ? (Math.round(v / 100) / 10).toString().replace('.', ',') + 'k' : String(Math.round(v)); }
  function financePage() {
    if (!FIN || FIN.period !== finPeriod) { if (!finLoading) loadFinance(); return [studioHeader(), el('div', { class: 'loading' }, el('div', { class: 'spinner' }))]; }
    var f = FIN;
    var max = Math.max.apply(null, f.months.map(function (m) { return m.received; }).concat([1]));
    var periods = [['month', 'Этот месяц'], ['prev', 'Прошлый'], ['year', 'Год'], ['all', 'Всё время']];
    function ftile(ic, value, label, sub, hot) {
      return el('div', { class: 'tile fin-tile' + (hot ? ' hot' : '') }, el('div', { class: 'num' }, icon(ic, 'tile-ic'), el('span', null, value)),
        el('div', null, el('b', null, label)), sub ? el('small', { class: 'muted' }, sub) : null);
    }
    return [
      studioHeader(),
      el('h2', { style: 'margin:14px 2px 8px' }, '💰 Финансы · ' + f.label),
      el('div', { class: 'chips scroll' }, periods.map(function (p) {
        return el('button', { class: 'chip' + (finPeriod === p[0] ? ' on' : ''), onclick: function () { finPeriod = p[0]; haptic(); render(); } }, p[1]);
      })),
      el('div', { class: 'tiles fin-tiles' },
        ftile('download', rub(f.received.sum), 'Получено', f.received.count + ' ' + plural(['платёж', 'платежа', 'платежей'], f.received.count)),
        ftile('bell', rub(f.debts.total), 'Ждём остаток', f.debts.list.length ? f.debts.list.length + ' ' + plural(['заказ', 'заказа', 'заказов'], f.debts.list.length) : 'никто не должен', f.debts.total > 0),
        ftile('orders', f.avgCheck ? rub(f.avgCheck) : '—', 'Средний чек', 'готово: ' + f.done),
        ftile('clock', rub(f.pipeline.sum), 'В работе', f.pipeline.count + ' ' + plural(['заказ', 'заказа', 'заказов'], f.pipeline.count))),
      el('div', { class: 'card' }, el('h3', { style: 'margin-top:0' }, 'Поступления за полгода'),
        el('div', { class: 'fin-bars' }, f.months.map(function (m, i) {
          return el('div', { class: 'fin-bar' + (i === f.months.length - 1 ? ' cur' : '') },
            el('small', { class: 'fin-v' }, m.received ? shortMoney(m.received) : ''),
            el('span', { class: 'fin-col' }, el('i', { style: 'height:' + Math.max(m.received ? 4 : 0, Math.round(m.received / max * 100)) + '%' })),
            el('small', { class: 'muted' }, m.label.slice(0, 3)));
        }))),
      (f.services || []).length ? el('div', { class: 'card' }, el('h3', { style: 'margin-top:0' }, 'По услугам'),
        f.services.map(function (s) {
          var smax = Math.max.apply(null, f.services.map(function (x) { return x.revenue; }).concat([1]));
          return el('div', { class: 'fin-svc' },
            el('div', { class: 'row-between' }, el('b', null, s.name), el('b', null, rub(s.revenue))),
            el('span', { class: 'fin-track' }, el('i', { style: 'width:' + Math.max(3, Math.round(s.revenue / smax * 100)) + '%' })),
            el('small', { class: 'muted' }, s.orders + ' ' + plural(['заказ', 'заказа', 'заказов'], s.orders) + ' · средний чек ' + rub(s.avg)));
        })) : null,
      el('div', { class: 'card' }, el('h3', { style: 'margin-top:0' }, 'Должны остаток'),
        f.debts.list.length ? f.debts.list.map(function (d) {
          return el('button', { class: 'fin-debt', onclick: function () { openOrder(d.id); } },
            el('div', null, el('b', null, '#' + String(d.id).padStart(4, '0') + ' · ' + d.client),
              el('small', { class: 'muted' }, (d.status === 'done' ? '✅ готово' : '🎨 в работе') + ' · оплачено ' + rub(d.paid) + ' из ' + rub(d.amount))),
            el('b', { class: 'orange-t' }, rub(d.remaining)), icon('chevron-right', 'chev'));
        }) : el('p', { class: 'muted' }, 'Все оплатили полностью 🎉'),
        el('p', { class: 'muted small' }, 'Подробнее — на странице бота, вкладка «Финансы».'))
    ];
  }

  function listPage() {
    var f = FILTERS.filter(function (x) { return x[0] === sfilter; })[0] || FILTERS[0];
    var q = squery.trim().toLowerCase();
    var list = ST.orders.filter(f[2]).filter(function (o) {
      return !q || [String(o.id), String(o.id).padStart(4, '0'), o.client, o.hero, o.contact || ''].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    var search = el('input', { value: squery, placeholder: '🔎 Номер, имя, герой…', oninput: function (e) { squery = e.target.value; renderListOnly(); } });
    return [
      studioHeader(),
      el('div', { class: 'chips scroll' }, FILTERS.filter(function (x) { return !x[3] || ST.role === 'owner'; }).map(function (x) {
        return el('button', { class: 'opt' + (x[0] === sfilter ? ' on' : ''), onclick: function () { sfilter = x[0]; haptic(); render(); } }, x[1]);
      })),
      el('div', { style: 'margin:10px 0' }, search),
      el('div', { id: 'slist' }, list.length ? list.slice(0, 100).map(orderRow) : el('div', { class: 'card empty' }, 'Здесь пусто'))
    ];
  }
  function renderListOnly() {
    var box = document.getElementById('slist');
    if (!box) return;
    var f = FILTERS.filter(function (x) { return x[0] === sfilter; })[0] || FILTERS[0];
    var q = squery.trim().toLowerCase();
    var list = ST.orders.filter(f[2]).filter(function (o) {
      return !q || [String(o.id), String(o.id).padStart(4, '0'), o.client, o.hero, o.contact || ''].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    box.replaceChildren.apply(box, list.length ? list.slice(0, 100).map(orderRow) : [el('div', { class: 'card empty' }, 'Здесь пусто')]);
  }

  function kv(k, v) { return v ? el('div', { class: 'kv' }, el('span', null, k), el('span', null, v)) : null; }
  function mediaEl(m) {
    if (m.kind === 'img') return el('img', { src: m.url, alt: '', loading: 'lazy' });
    if (m.kind === 'video') return el('video', { src: m.url, controls: true, playsinline: true });
    if (m.kind === 'audio') return el('audio', { src: m.url, controls: true, preload: 'none' });
    return el('a', { href: m.url, target: '_blank', class: 'filelink' }, '📎 ' + (m.name || 'файл'));
  }

  function orderPageStudio() {
    if (odLoading || !OD) return [el('div', { class: 'loading' }, el('div', { class: 'spinner' }))];
    var o = OD, owner = ST.role === 'owner', open = o.status === 'new' || o.status === 'in_progress';
    var no = '#' + String(o.id).padStart(4, '0');
    var parts = [];
    // --- шапка й статус ---
    var actions = [];
    if (o.status === 'new') actions.push(el('button', { class: 'btn', disabled: busy, onclick: function () { confirmAsk('Взять ' + no + ' в работу? Клиент получит уведомление.', function () { sact('status', { status: 'in_progress' }, 'Взяли в работу'); }); } }, '🎨 Взять в работу'));
    if (o.status === 'in_progress') actions.push(el('button', { class: 'btn', disabled: busy, onclick: function () { confirmAsk('Отметить ' + no + ' готовой? Клиент получит уведомление.', function () { sact('status', { status: 'done' }, 'Готово'); }); } }, '✅ Готово'));
    if (open) actions.push(el('button', { class: 'btn ghost', disabled: busy, onclick: function () { confirmAsk('Отклонить заявку ' + no + '? Клиент получит уведомление.', function () { sact('status', { status: 'rejected' }, 'Отклонено'); }); } }, 'Отклонить'));
    parts.push(el('div', { class: 'card' },
      el('div', { class: 'top' }, el('h2', { style: 'margin:0' }, no + ' · ' + o.client), el('span', { class: 'badge s-' + o.status }, o.statusLabel)),
      el('div', { class: 'muted', style: 'margin:4px 0 8px' }, [o.username ? '@' + o.username : '', o.contact && o.contact !== '@' + o.username ? o.contact : '', 'заказов: ' + (o.clientOrders || 1)].filter(Boolean).join(' · ')),
      o.tgLink ? el('button', { class: 'btn small ghost', onclick: function () { try { tg.openTelegramLink(o.tgLink); } catch (e) { window.open(o.tgLink); } } }, '✈️ Написать в Telegram') : null,
      o.clientBlocked ? el('div', { class: 'note' }, '⚠️ Клиент заблокировал бота — сообщения не доходят.') : null,
      o.cancel ? el('div', { class: 'note' }, '🚫 Клиент отменил: ' + o.cancel.reason) : null,
      actions.length ? el('div', { class: 'row', style: 'margin-top:10px' }, actions) : null));

    // --- правка після здачі ---
    var fopen = (o.fixes || []).filter(function (f) { return f.status === 'open'; })[0];
    if (fopen) {
      var fNotify = el('input', { type: 'checkbox', checked: true });
      parts.push(el('div', { class: 'card', style: 'border-color:#f59e0b' }, el('h3', { style: 'margin-top:0' }, '✏️ Правка после сдачи'),
        el('div', { class: 'lines' }, fopen.text), fopen.photos ? el('div', { class: 'muted' }, 'Фото: ' + fopen.photos + ' (в Telegram)') : null,
        el('label', { class: 'ps-check' }, fNotify, el('span', null, 'Сообщить клиенту')),
        el('div', { style: 'height:8px' }),
        el('button', { class: 'btn', disabled: busy, onclick: function () { sact('fix-done', { notifyClient: fNotify.checked }, 'Правка готова'); } }, '✅ Правка готова')));
    }

    // --- етап проєкту (боти, персонажі) ---
    var ps = o.projectStage;
    if (ps && o.status === 'in_progress') {
      if (!psSel || psSel.id !== o.id) psSel = { id: o.id, idx: ps.idx };
      var si = psSel.idx, sinfo = ps.info[si] || {};
      var MARK = function (inf) { return !inf || !inf.ask ? '' : !inf.answer ? ' · ⏳' : inf.answer.ok ? ' · ✅' : ' · ✏️'; };
      var psLink = el('input', { value: sinfo.link || '', placeholder: 'Демо: https://… (необязательно)', maxlength: '500' });
      var psNote = el('textarea', { value: sinfo.note || '', placeholder: 'Комментарий клиенту (необязательно)', maxlength: '500' });
      var psAsk = el('input', { type: 'checkbox' });
      var psNotify = el('input', { type: 'checkbox', checked: true });
      var ans = sinfo.answer;
      parts.push(el('div', { class: 'card' }, el('h3', { style: 'margin-top:0' }, '🚀 Этап проекта · ' + (ps.idx + 1) + '/' + ps.steps.length),
        el('div', { class: 'ps-list' }, ps.steps.map(function (n, i) {
          return el('button', { class: 'opt' + (i === si ? ' on' : ''), disabled: busy, onclick: function () { psSel.idx = i; render(); } },
            (i < ps.idx ? '✓ ' : (i + 1) + '. ') + n + (i === ps.idx ? ' ◀' : '') + MARK(ps.info[i]));
        })),
        ans ? el('div', { class: 'note' }, (ans.ok ? '✅ Клиент принял этап' : '✏️ Замечания клиента') + (ans.text ? ': «' + ans.text + '»' : '')) : null,
        el('div', { style: 'height:8px' }), psLink, el('div', { style: 'height:8px' }), psNote,
        el('label', { class: 'ps-check' }, psAsk, el('span', null, 'Попросить клиента проверить («Все добре» / «Є зауваження»)')),
        el('label', { class: 'ps-check' }, psNotify, el('span', null, 'Сообщить клиенту')),
        el('div', { style: 'height:8px' }),
        el('button', { class: 'btn', disabled: busy, onclick: function () {
          sact('project-stage', { idx: si, link: psLink.value, note: psNote.value, ask: psAsk.checked, notifyClient: psNotify.checked }, 'Этап: ' + ps.steps[si]);
        } }, si === ps.idx ? 'Отправить / обновить этап' : 'Перейти к этапу «' + ps.steps[si] + '»')));
    }

    // --- план оплати за етапами (власник) ---
    if (owner && ps && (open || o.payPlan)) {
      var PST = { paid: '✅ оплачено', awaiting: '⏳ счёт выставлен', due: '🔔 к оплате', later: 'позже' };
      var sp = o.servicePlan || [];
      parts.push(el('div', { class: 'card' }, el('h3', { style: 'margin-top:0' }, '💳 Оплата по этапам'),
        o.payPlan ? o.payPlan.map(function (p) { return kv(p.stage + ' · ' + p.percent + '%', (p.amount ? rub(p.amount) + ' · ' : '') + (PST[p.status] || p.status)); })
          : el('p', { class: 'muted' }, sp.length ? 'План услуги: ' + sp.map(function (e) { return e.percent + '%'; }).join(' / ') + '. Счета выставятся сами при смене этапа.' : 'План не задан — настройте его в «Услуги Mini App» или в заявке на странице бота.'),
        open && !o.payPlan && sp.length ? el('button', { class: 'btn ghost', disabled: busy, onclick: function () { sact('pay-plan', { useDefault: true }, 'План включён'); } }, '💳 Включить план услуги') : null,
        open && o.payPlan ? el('button', { class: 'link danger', onclick: function () { confirmAsk('Убрать план оплаты?', function () { sact('pay-plan', { plan: [] }, 'План убран'); }); } }, 'убрать план') : null));
    }

    // --- бриф ---
    var md = o.media || { refs: [], voices: [], sketches: [] };
    parts.push(el('div', { class: 'card' }, el('h3', { style: 'margin-top:0' }, '📝 Бриф'),
      o.service && o.service !== 'stickers' ? [
        kv('Услуга', o.stickerType), kv('Что нужно', o.quantity), kv('Дедлайн', o.project && o.project.deadline), kv('Бюджет', o.project && o.project.budget),
        kv('Промокод', owner ? o.promo : ''), kv('Пришёл', o.source),
        el('div', { class: 'lbl' }, 'Проект'), el('div', { class: 'lines' }, o.hero),
        el('div', { class: 'lbl' }, 'Описание'), el('div', { class: 'lines' }, o.emotions)
      ] : [
        kv('Тип', o.stickerType), kv('Количество', o.quantity), kv('Пакет', o.package ? o.package.name : ''), kv('Стиль', o.style ? o.style.name : ''),
        kv('Ориентир цены', o.priceHint), kv('Промокод', owner ? o.promo : ''), kv('Пришёл', o.source),
        el('div', { class: 'lbl' }, 'Главный герой'), el('div', { class: 'lines' }, o.hero),
        el('div', { class: 'lbl' }, 'Эмоции и фразы'), el('div', { class: 'lines' }, o.emotions)
      ],
      md.voices.length ? [el('div', { class: 'lbl' }, '🎤 Голосовые'), md.voices.map(function (v) { return el('div', { class: 'voice' }, el('span', { class: 'muted' }, v.step === 'hero' ? 'герой' : 'эмоции'), mediaEl(v)); })] : null,
      md.refs.length ? [el('div', { class: 'lbl' }, '📎 Референсы (' + md.refs.length + ')'), el('div', { class: 'gallery' }, md.refs.map(mediaEl))] : null));

    // --- переписка ---
    var msgs = (o.messages || []).slice(-30);
    var box = el('textarea', { placeholder: 'Сообщение клиенту…', maxlength: '3000' });
    parts.push(el('div', { class: 'card' }, el('h3', { style: 'margin-top:0' }, '💬 Переписка'),
      msgs.length ? el('div', { class: 'thread' }, msgs.map(function (m) {
        return el('div', { class: 'bubble ' + (m.from === 'client' ? 'in' : 'out') },
          (m.media || []).length ? el('div', { class: 'bmedia n' + Math.min(m.media.length, 4) }, m.media.map(function (x) { return x.kind === 'file' ? el('a', { href: x.url, target: '_blank', class: 'filelink' }, '📎 ' + (x.name || 'файл')) : mediaEl(x); })) : null,
          el('div', null, m.text), el('div', { class: 'when' }, (m.by ? m.by + ' · ' : '') + dt(m.at)));
      })) : el('p', { class: 'muted' }, 'Сообщений пока нет.'),
      (o.quickReplies || []).length ? el('div', { class: 'chips scroll', style: 'margin:8px 0' }, o.quickReplies.map(function (r) {
        return el('button', { class: 'opt', onclick: function () { box.value = r.text; box.focus(); } }, r.title);
      })) : null,
      box, el('div', { style: 'height:8px' }),
      el('button', { class: 'btn', disabled: busy, onclick: function () {
        if (!box.value.trim()) return;
        sact('message', { text: box.value }, 'Отправлено клиенту');
      } }, 'Отправить')));

    // --- кошторис ---
    if (open) {
      var lastQ = (o.quotes || []).slice(-1)[0];
      var qd = o.quoteDefaults || {};
      var qa = el('input', { type: 'number', inputmode: 'decimal', min: '1', value: qd.amount || '', placeholder: 'Сумма, грн' });
      var qdays = el('input', { type: 'number', min: '0', max: '365', placeholder: 'Срок, дней' });
      var qitems = el('textarea', { value: qd.items || '', maxlength: '1500' });
      parts.push(el('div', { class: 'card' }, el('h3', { style: 'margin-top:0' }, '🧾 Смета'),
        lastQ ? el('div', { class: 'note' }, 'Последняя: ' + rub(lastQ.amount) + ' — ' + lastQ.statusLabel) : null,
        el('div', { class: 'row' }, qa, qdays), el('div', { style: 'height:8px' }), qitems, el('div', { style: 'height:8px' }),
        el('button', { class: 'btn', disabled: busy, onclick: function () {
          if (!(Number(qa.value) >= 1)) { toast('Укажите сумму'); return; }
          confirmAsk('Отправить клиенту смету на ' + rub(qa.value) + '?', function () {
            sact('quote', { amount: Number(qa.value), days: Number(qdays.value) || 0, items: qitems.value }, 'Смета отправлена');
          });
        } }, 'Отправить смету')));
    }

    // --- ціна й термін ---
    if (open) {
      var price = el('input', { value: o.studio.price || '', placeholder: 'Например 3500 грн', maxlength: '100' });
      var due = el('input', { type: 'date', value: o.studio.due || '' });
      parts.push(el('div', { class: 'card' }, el('h3', { style: 'margin-top:0' }, '📅 ' + (owner ? 'Цена и срок' : 'Срок')),
        owner ? [el('div', { class: 'lbl' }, 'Согласованная цена'), price] : (o.studio.price ? kv('Цена', o.studio.price) : null),
        el('div', { class: 'lbl' }, 'Срок'), due, el('div', { style: 'height:8px' }),
        el('button', { class: 'btn ghost', disabled: busy, onclick: function () {
          sact('studio', { price: owner ? price.value : o.studio.price, due: due.value, note: o.studio.note || '' }, 'Сохранено');
        } }, 'Сохранить')));
    }

    // --- оплата (лише власник) ---
    if (owner && o.payments) {
      var pays = o.payments, cur = pays[pays.length - 1], idx = pays.length - 1;
      var active = cur && ['created', 'processing', 'hold', 'awaiting', 'reported'].indexOf(cur.status) >= 0;
      var pbody = [el('h3', { style: 'margin-top:0' }, '💳 Оплата'), kv('Цена', o.amount ? rub(o.amount) : '—'), kv('Оплачено', rub(o.paid || 0)), o.remaining ? kv('Осталось', rub(o.remaining)) : null,
        pays.slice(-3).map(function (p) { return el('div', { class: 'kv' }, el('span', null, (KIND[p.kind] || p.kind) + ' ' + rub(p.amount)), el('span', null, PAYST[p.status] || p.statusLabel)); })];
      if (active && cur.method === 'card') {
        pbody.push(cur.status === 'reported' ? el('div', { class: 'note' }, '🔔 Клиент сообщил, что оплатил ' + rub(cur.amount) + '. Проверьте карту.') : el('p', { class: 'muted' }, 'Реквизиты отправлены — ждём перевод.'),
          el('div', { class: 'row' },
            el('button', { class: 'btn', disabled: busy, onclick: function () { confirmAsk('Подтвердить, что ' + rub(cur.amount) + ' пришли?', function () { sact('card-confirm', { idx: idx, received: true }, 'Оплата подтверждена'); }); } }, '✅ Пришли'),
            cur.status === 'reported' ? el('button', { class: 'btn ghost', disabled: busy, onclick: function () { sact('card-confirm', { idx: idx, received: false }, 'Клиенту сообщили'); } }, '❌ Не пришли') : null),
          el('button', { class: 'link danger', onclick: function () { confirmAsk('Отменить запрос оплаты?', function () { sact('cancel-invoice', {}, 'Отменено'); }); } }, 'Отменить запрос'));
      } else if (active) {
        pbody.push(el('p', { class: 'muted' }, 'Счёт monobank выставлен — бот сам увидит оплату.'),
          el('button', { class: 'link danger', onclick: function () { confirmAsk('Отменить счёт?', function () { sact('cancel-invoice', {}, 'Счёт отменён'); }); } }, 'Отменить счёт'));
      } else if (o.status !== 'rejected' && o.status !== 'cancelled') {
        var sug = o.paySuggest || {};
        var amt = el('input', { type: 'number', inputmode: 'decimal', min: '1', value: sug.amount || '', placeholder: 'Сумма, грн' });
        var kindSel = el('select', { class: 'sel' }, ['advance', 'final', 'full'].map(function (k) { var op = el('option', { value: k }, KIND[k]); if (k === (sug.kind || 'advance')) op.selected = true; return op; }));
        var need = function () { if (!(Number(amt.value) >= 1)) { toast('Укажите сумму'); return false; } return true; };
        pbody.push(sug.basis ? el('div', { class: 'muted' }, 'Подсказка: ' + sug.basis) : null,
          el('div', { class: 'row', style: 'margin:8px 0' }, amt, kindSel),
          ST.pay && ST.pay.mono ? el('button', { class: 'btn', disabled: busy, onclick: function () { if (need()) confirmAsk('Выставить счёт monobank на ' + rub(amt.value) + '?', function () { sact('invoice', { amount: Number(amt.value), kind: kindSel.value }, 'Счёт отправлен'); }); } }, '💳 Счёт monobank') : null,
          ST.pay && ST.pay.card ? el('button', { class: 'btn' + (ST.pay.mono ? ' ghost' : ''), style: 'margin-top:8px', disabled: busy, onclick: function () { if (need()) confirmAsk('Отправить реквизиты карты на ' + rub(amt.value) + '?', function () { sact('card-request', { amount: Number(amt.value), kind: kindSel.value }, 'Реквизиты отправлены'); }); } }, '📨 Реквизиты карты') : null,
          el('button', { class: 'link', onclick: function () { if (need()) confirmAsk('Отметить, что клиент оплатил ' + rub(amt.value) + ' (наличные или перевод)? Клиент получит подтверждение.', function () { sact('mark-paid', { amount: Number(amt.value), kind: kindSel.value, notify: true }, 'Оплата отмечена'); }); } }, 'Отметить оплату вручную'));
      }
      parts.push(el('div', { class: 'card' }, pbody));
    }

    // --- дизайнер (власник) ---
    if (owner && open && (o.team || []).length) {
      var sel = el('select', { class: 'sel' }, [el('option', { value: '' }, '— не назначен —')].concat(o.team.map(function (m) { var op = el('option', { value: m.id }, m.name); if (m.id === o.assignee) op.selected = true; return op; })));
      parts.push(el('div', { class: 'card' }, el('h3', { style: 'margin-top:0' }, '👤 Дизайнер'), sel, el('div', { style: 'height:8px' }),
        el('button', { class: 'btn ghost', disabled: busy, onclick: function () { sact('assign', { memberId: sel.value || null }, 'Назначено'); } }, 'Назначить')));
    }

    // --- готові файли для клієнта ---
    parts.push(studioFinals(o));

    // --- ескізи ---
    var sk = (o.sketches || []).slice(-1)[0];
    if (sk || open) {
      var skm = sk && (md.sketches || []).filter(function (x) { return x.round === sk.round; })[0];
      parts.push(el('div', { class: 'card' }, el('h3', { style: 'margin-top:0' }, '🎨 Эскизы'),
        sk ? [kv('Версия ' + sk.round, { pending: '⏳ у клиента', approved: '✅ согласованы', changes: '✏️ правки' }[sk.status] || sk.status),
          sk.feedback ? el('div', { class: 'note' }, 'Правки: ' + sk.feedback) : null,
          skm ? el('div', { class: 'gallery' }, skm.items.map(mediaEl)) : null] : null,
        open ? sketchUploader(o) : null,
        owner ? toExamplesBlock(o, md) : null));
    }
    return [el('button', { class: 'link', onclick: function () { sgo(orderFrom); } }, orderFrom === 'money' ? '← Финансы' : orderFrom === 'today' ? '← Сегодня' : '← Все заявки'), parts];
  }

  // Робота із замовлення → «Приклади робіт» послуги (власник)
  var exOpen = {};
  function toExamplesBlock(o, md) {
    var imgs = [];
    (md.sketches || []).forEach(function (sk) { sk.items.forEach(function (it) { if (it.kind === 'img') imgs.push({ url: it.url, round: sk.round, index: it.index, done: it.done }); }); });
    if (!imgs.length) return null;
    if (!exOpen[o.id]) return el('button', { class: 'btn ghost', style: 'margin-top:8px', onclick: function () { exOpen[o.id] = true; render(); } }, '🖼 Добавить в примеры услуги');
    var cap = el('input', { placeholder: 'Подпись (необязательно)', maxlength: '80' });
    return el('div', { class: 'action' }, el('div', { class: 'lbl', style: 'margin-top:0' }, 'Нажмите на картинку — она появится в «Приклади робіт» услуги'),
      o.showcaseConsent === 'yes' ? null : el('div', { class: 'note' }, '⚠️ Клиент не давал согласия показывать работу — убедитесь, что он не против.'),
      cap, el('div', { style: 'height:8px' }),
      el('div', { class: 'ex-pick' }, imgs.map(function (im) {
        return el('button', { class: 'ex-item' + (im.done ? ' done' : ''), disabled: busy || im.done, onclick: function () {
          sact('to-examples', { round: im.round, index: im.index, caption: cap.value }, 'Добавлено в примеры');
        } }, el('img', { src: im.url, alt: '' }), el('small', null, im.done ? '✓ в примерах' : 'v' + im.round));
      })),
      el('button', { class: 'link', onclick: function () { exOpen[o.id] = false; render(); } }, 'Готово'));
  }
  function studioFinals(o) {
    var fin = (o.finals || []).slice().reverse();
    var url = el('input', { placeholder: 'https://drive.google.com/…', spellcheck: 'false' });
    var title = el('input', { placeholder: 'Подпись (необязательно)', maxlength: '120' });
    var file = el('input', { type: 'file', multiple: true, style: 'display:none' });
    file.addEventListener('change', function () {
      var files = Array.prototype.slice.call(file.files || []);
      file.value = '';
      var chain = Promise.resolve();
      files.forEach(function (f) {
        chain = chain.then(function () {
          if (f.size > 45 * 1024 * 1024) { toast('Больше 45 МБ: ' + f.name + ' — отправьте ссылкой'); return null; }
          busy = true; render(); toast('Отправляю ' + f.name + '…');
          return fetch('api/studio/final', { method: 'POST', headers: { 'content-type': f.type || 'application/octet-stream', 'x-init-data': initData, 'x-order-id': String(o.id), 'x-filename': encodeURIComponent(f.name) }, body: f })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'Ошибка'); return j; }); })
            .then(function (j) { busy = false; OD = j.order; ST = j.state; haptic('ok'); toast('Отправлено клиенту'); render(); })
            .catch(function (e) { busy = false; haptic('error'); render(); try { tg.showAlert(e.message); } catch (x) { alert(e.message); } });
        });
      });
    });
    return el('div', { class: 'card' }, el('h3', { style: 'margin-top:0' }, '📦 Готовые файлы для клиента'),
      fin.length ? fin.map(function (f) {
        return el('div', { class: 'kv' }, el('span', null, (f.kind === 'link' ? '🔗 ' : '📄 ') + f.name), el('button', { class: 'link danger', onclick: function () { confirmAsk('Убрать из списка? У клиента в чате файл останется.', function () { sact('final-remove', { id: f.id }, 'Убрано'); }); } }, 'убрать'));
      }) : el('p', { class: 'muted' }, 'Пока ничего не отправлено.'),
      el('button', { class: 'btn ghost', disabled: busy, onclick: function () { file.click(); } }, '📄 Отправить файлы (до 45 МБ)'), file,
      el('div', { style: 'height:8px' }), url, el('div', { style: 'height:6px' }), title, el('div', { style: 'height:8px' }),
      el('button', { class: 'btn ghost', disabled: busy, onclick: function () { sact('final-link', { url: url.value, title: title.value }, 'Ссылка отправлена'); } }, '🔗 Отправить ссылку'),
      el('p', { class: 'muted' }, 'Файл уходит клиенту в чат бота и появляется у него в Mini App в «Фінальні файли».'));
  }

  var skDraft = {}; // id заявки → { items: [], comment: '' }
  function sketchUploader(o) {
    var d = (skDraft[o.id] = skDraft[o.id] || { items: [], comment: '' });
    var round = (o.sketches || []).length + 1;
    var note = el('textarea', { value: d.comment, placeholder: 'Комментарий к эскизам (необязательно)', maxlength: '1000', oninput: function (e) { d.comment = e.target.value; } });
    return el('div', { class: 'action' }, el('div', { class: 'lbl', style: 'margin-top:0' }, 'Отправить версию ' + round),
      photoPicker(d.items, 10, '+ Фото', function () { render(); }),
      d.items.length ? [el('div', { style: 'height:8px' }), note, el('div', { style: 'height:8px' }),
        el('button', { class: 'btn', disabled: busy || uploading > 0, onclick: function () {
          confirmAsk('Отправить клиенту эскизы (версия ' + round + ', ' + d.items.length + ' фото)?', function () {
            sact('sketch-send', { items: d.items.map(function (x) { return x.token; }), comment: d.comment }, 'Эскизы отправлены').then(function () { delete skDraft[o.id]; render(); });
          });
        } }, '🎨 Отправить клиенту')] : el('p', { class: 'muted' }, 'Добавьте фото — клиент получит их с кнопками «Погоджую» / «Є правки». PDF и другие файлы — кнопкой «🎨 Ескізи» в чате бота.'));
  }

  function renderStudioTabs() {
    var nav = document.getElementById('tabs');
    nav.hidden = false;
    var c = ST.counts;
    var items = [['today', 'home', 'Сегодня', c['new'] + c.reported + c.unread > 0], ['list', 'orders', 'Заявки', false], ST.role === 'owner' ? ['money', 'wallet', 'Финансы', false] : null, ['client', 'user', 'Как клиент', false]].filter(Boolean);
    nav.replaceChildren.apply(nav, items.map(function (it) {
      var on = it[0] === stab || (stab === 'order' && it[0] === orderFrom);
      return el('button', { class: on ? 'on' : '', onclick: function () { if (it[0] === 'client') setMode('client'); else sgo(it[0]); } },
        icon(it[1]), el('span', null, it[2]), it[3] ? el('span', { class: 'dot' }) : null);
    }));
  }

  function renderStudio() {
    var app = document.getElementById('app');
    if (!ST) { app.replaceChildren(el('div', { class: 'loading' }, el('div', { class: 'spinner' }))); return; }
    var page = stab === 'order' ? orderPageStudio() : stab === 'list' ? listPage() : stab === 'money' ? financePage() : todayPage();
    var keepY = window.scrollY;
    app.replaceChildren(el('div', { class: 'page' }, page));
    window.scrollTo(0, keepY);
    renderStudioTabs();
  }

  // ---------- render ----------
  function render() {
    var app = document.getElementById('app');
    if (rec && view.page !== 'chat') stopRec(false);
    if (mode === 'studio') { var sf = document.getElementById('ai-fab'); if (sf) sf.remove(); document.body.classList.add('studio-mode'); return renderStudio(); }
    document.body.classList.remove('studio-mode');
    if (!S) return;
    var pages = { service: servicePage, wizard: wizardPage, order: orderPage, files: filesPage, chat: chatPage, faq: faqPage, prices: pricesPage, ask: askPage, works: worksPage, portfolio: portfolioPage };
    var tabs = { home: homePage, catalog: catalogPage, orders: ordersPage, profile: profilePage };
    var page = view.page ? pages[view.page]() : tabs[view.tab]();
    var keepY = window.scrollY;
    app.replaceChildren(el('div', { class: 'page' + (view.page === 'chat' || (view.page === 'ask' && S.aiChat) ? ' with-bar' : '') }, page));
    window.scrollTo(0, keepY);
    renderTabs();
    // Кнопка ІІ-помічника — на всіх екранах клієнта, крім самого чату з ним, бриф і чату замовлення
    var oldFab = document.getElementById('ai-fab');
    if (oldFab) oldFab.remove();
    if (S.aiChat && ['ask', 'chat', 'wizard'].indexOf(view.page) < 0) {
      document.body.appendChild(el('button', { id: 'ai-fab', class: 'ai-fab', 'aria-label': t('aiTitle'), onclick: function () { haptic('tap'); push('ask'); } },
        el('img', { src: 'a/stk_wave.webp', alt: '' }), el('span', { class: 'ai-badge' }, 'AI')));
    }
    // чат оновлюємо кожні 15 с, поки він відкритий
    clearTimeout(chatTimer);
    if (view.page === 'chat') chatTimer = setTimeout(function () { if (view.page === 'chat' && !busy) refresh(); }, 15000);
  }
  function fatal(text, retry) {
    document.getElementById('app').replaceChildren(el('div', { class: 'page' }, emptyState('empty_orders.svg', text, null,
      retry ? el('button', { class: 'btn', onclick: start }, el('span', null, t('retry'))) : null)));
  }
  function start() {
    var u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
    lang = u && !/^(uk|ru|be)/.test(u.language_code || 'uk') ? 'en' : 'uk';
    if (!initData) return fatal(t('openFromTg'), false);
    api('boot').then(function (s) {
      S = s;
      lang = s.lang === 'en' ? 'en' : 'uk';
      document.documentElement.lang = lang;
      var saved = store('yabot-brief2');
      if (saved) for (var k in form) if (saved[k] !== undefined) form[k] = saved[k];
      if (!form.contact) form.contact = s.contact;
      var sp = tg.initDataUnsafe && tg.initDataUnsafe.start_param;
      var deep = /^o(\d+)$/.exec(sp || '') || /^(\d+)$/.exec(new URLSearchParams(location.search).get('o') || '');
      if (s.studioRole && store('yabot-mode') !== 'client') {
        mode = 'studio';
        return loadStudio().then(function () { if (deep) openOrder(Number(deep[1])); else render(); }).catch(function (e) { mode = 'client'; render(); toast(e.message); });
      }
      var resume = new URLSearchParams(location.search).get('resume');
      if (resume && !s.brief.blocked) {
        // Повернення з нагадування: той самий крок, що й був (з чернетки на цьому пристрої)
        if (!form.service) form.step = 1;
        view = { tab: 'orders', page: 'wizard', params: {} }; history = [{ tab: 'home', page: null, params: {} }];
        render(); syncBack();
      } else if (sp === 'order') startWizard('');
      else if (deep && s.orders.some(function (o) { return o.id === Number(deep[1]); })) { view = { tab: 'orders', page: 'order', params: { id: Number(deep[1]) } }; history = [{ tab: 'orders', page: null, params: {} }]; render(); syncBack(); }
      else if (sp === 'orders' || s.orders.some(needsAction)) go('orders');
      else render();
    }).catch(function (e) { fatal(e.message || t('err'), true); });
  }
  if (tg) {
    tg.ready(); tg.expand();
    if (tg.colorScheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    try { tg.onEvent('themeChanged', function () { document.documentElement.setAttribute('data-theme', tg.colorScheme === 'dark' ? 'dark' : 'light'); }); } catch (e) {}
    try { tg.setHeaderColor(tg.colorScheme === 'dark' ? 'bg_color' : '#FFFFFF'); tg.setBackgroundColor(tg.colorScheme === 'dark' ? 'bg_color' : '#FFFFFF'); } catch (e) {}
    try { tg.onEvent('activated', resync); } catch (e) {}
    try { tg.BackButton.onClick(function () { if (mode === 'studio') sgo(stab === 'order' ? orderFrom : 'today'); else back(); }); } catch (e) {}
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) resync(); });
  start();
})();
`;
