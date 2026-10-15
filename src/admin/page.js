// Інтерфейс сторінки бота (HTML/CSS/JS віддаються окремими файлами — так дозволяє суворий CSP).
// Мова сторінки — російська (для власника студії); тексти бота для клієнтів — українською.

export const PAGE_HTML = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>YABOT — управление ботом</title>
<link rel="stylesheet" href="/app.css">
<script src="/app.js" defer></script>
</head>
<body>
<header class="top">
  <img src="/logo.jpg" alt="YABOT" class="logo">
  <div class="top-text">
    <div class="title">Бот брифов на стикерпаки</div>
    <div class="sub"><span id="botName"></span> <span class="pill hidden" id="statusPill"></span></div>
  </div>
  <button class="link hidden" id="logoutBtn" type="button">Выйти</button>
</header>

<nav class="tabs hidden" id="tabs">
  <a href="#overview" data-tab="overview" data-owner>Обзор</a>
  <a href="#orders" data-tab="orders">Заявки <span class="badge hidden" id="badgeNew"></span> <span class="badge chat-badge hidden" id="badgeChat"></span></a>
  <a href="#finance" data-tab="finance" data-owner>Финансы</a>
  <a href="#clients" data-tab="clients" data-owner>Клиенты</a>
  <a href="#drafts" data-tab="drafts" data-owner>Брифы сейчас <span class="badge muted-badge hidden" id="badgeDrafts"></span></a>
  <a href="#reviews" data-tab="reviews" data-owner>Отзывы</a>
  <a href="#broadcast" data-tab="broadcast" data-owner>Рассылка</a>
  <a href="#channel" data-tab="channel" data-owner>Канал</a>
  <a href="#catalog" data-tab="catalog" data-owner>Каталог</a>
  <a href="#prices" data-tab="prices" data-owner>Цены</a>
  <a href="#sources" data-tab="sources" data-owner>Источники</a>
  <a href="#settings" data-tab="settings" data-owner>Настройки</a>
</nav>

<main>
  <p class="loading" id="loading">Загрузка…</p>

  <!-- Первичная настройка -->
  <section class="card narrow hidden" id="setupView">
    <h1>Первичная настройка</h1>
    <p class="muted">Код настройки напечатан в журнале бота в панели YABOT (строка «Код первичной настройки»).</p>
    <form id="setupForm" autocomplete="off">
      <label>Код настройки<input name="code" inputmode="numeric" maxlength="6" required></label>
      <label>Токен бота от @BotFather<input name="token" placeholder="123456789:AAH..." spellcheck="false"></label>
      <p class="muted hidden" id="tokenPresetNote">Токен уже задан панелью — поле можно оставить пустым.</p>
      <label>Пароль для этой страницы (минимум 8 символов)<input name="password" type="password" minlength="8" required autocomplete="new-password"></label>
      <label>Ваш Telegram ID — сюда будут приходить заявки и PDF<input name="adminChatId" inputmode="numeric" placeholder="например 8310127198"></label>
      <p class="muted">Узнать ID: напишите боту команду /chatid. Можно указать позже.</p>
      <button type="submit">Сохранить и запустить бота</button>
      <p class="error" id="setupError"></p>
    </form>
  </section>

  <!-- Вход -->
  <section class="card narrow hidden" id="loginView">
    <h1>Вход</h1>
    <form id="loginForm">
      <label>Логин <span class="muted">— только для дизайнеров; владелец оставляет пустым</span><input name="login" autocomplete="username" spellcheck="false"></label>
      <label>Пароль<input name="password" type="password" required autocomplete="current-password"></label>
      <button type="submit">Войти</button>
      <p class="error" id="loginError"></p>
    </form>
    <form id="codeForm" class="hidden code-step">
      <p class="muted" id="codeNote"></p>
      <label>Код из Telegram<input name="code" inputmode="numeric" maxlength="6" required autocomplete="one-time-code"></label>
      <div class="actions"><button type="submit">Войти</button><button type="button" class="ghost" id="codeBack">Назад</button></div>
      <p class="error" id="codeError"></p>
    </form>
  </section>

  <!-- Обзор -->
  <section class="view hidden" data-view="overview">
    <section class="card wizard hidden" id="wizard"></section>
    <div id="alerts"></div>
    <div class="stats" id="kpis"></div>
    <div class="grid2">
      <section class="card">
        <h2>Последние 30 дней</h2>
        <div class="legend"><span class="sw sw-users"></span>новые клиенты <span class="sw sw-starts"></span>начали бриф <span class="sw sw-orders"></span>заявки</div>
        <div id="chart"></div>
      </section>
      <section class="card">
        <h2>Воронка брифа</h2>
        <p class="muted">Сколько людей дошло до каждого шага — видно, где бросают.</p>
        <div id="funnel"></div>
      </section>
    </div>
    <section class="card">
      <h2>Свежие заявки</h2>
      <div id="recentOrders"></div>
    </section>
  </section>

  <!-- Заявки -->
  <section class="view hidden" data-view="orders">
    <div id="ordersList">
      <div class="toolbar">
        <div class="view-toggle"><button type="button" id="viewList">☰ Список</button><button type="button" id="viewBoard">▦ Доска</button></div>
        <div class="chips" id="statusChips"></div>
        <input type="search" id="orderSearch" placeholder="Поиск: №, имя, контакт, герой, метка">
        <select id="designerFilter" class="hidden" data-owner></select>
        <a class="btn" href="/api/export.xlsx" data-owner>⬇ Excel</a>
      </div>
      <div class="chips hidden" id="clientFilter"></div>
      <label class="check archive-toggle"><input type="checkbox" id="showArchived"> Показать архивные заявки</label>
      <section class="card flush"><div id="ordersTable"></div></section>
    </div>
    <div class="hidden" id="orderDetail"></div>
  </section>

  <!-- Финансы -->
  <section class="view hidden" data-view="finance">
    <div class="toolbar">
      <select id="finPeriod">
        <option value="month">Этот месяц</option><option value="prev">Прошлый месяц</option><option value="30">Последние 30 дней</option>
        <option value="year">Этот год</option><option value="all">Всё время</option>
      </select>
      <a class="btn" href="/api/export.xlsx">⬇ Excel</a>
    </div>
    <div class="stats" id="finKpis"></div>
    <p class="muted" id="finNote"></p>
    <section class="card">
      <h2>Последние 6 месяцев</h2>
      <div class="legend"><span class="sw sw-orders"></span>получено денег <span class="sw sw-starts"></span>выручка готовых заказов</div>
      <div class="fin-chart" id="finChart"></div>
    </section>
    <section class="card">
      <h2>📊 Показатели студии</h2>
      <p class="muted">За тот же период: как быстро вы отвечаете на новые заявки, сколько смет согласуют, сколько длится заказ, почему отменяют.</p>
      <div class="stats" id="anKpis"></div>
      <div id="anReasons"></div>
      <div id="anDesigners"></div>
    </section>
    <div class="grid2">
      <section class="card"><h2>Кто должен</h2><p class="muted">Заказы в работе и готовые, где оплачено меньше согласованной цены.</p><div id="finDebts"></div></section>
      <section class="card"><h2>Выручка по источникам</h2><div id="finSources"></div></section>
    </div>
    <section class="card"><h2>Выручка по услугам</h2><p class="muted">Готовые заказы с ценой за период: стикерпаки, боты, персонажи.</p><div id="finServices"></div></section>
  </section>

  <!-- Клиенты -->
  <section class="view hidden" data-view="clients">
    <div id="clientsListBox">
      <div class="toolbar">
        <input type="search" id="clientSearch" placeholder="Поиск: имя, @username, метка, ID">
        <select id="clientTagFilter"><option value="">Все метки</option></select>
        <span class="muted" id="clientsInfo"></span>
        <a class="btn" href="/api/export.xlsx">⬇ Excel</a>
      </div>
      <section class="card flush"><div id="clientsTable"></div></section>
    </div>
    <div class="hidden" id="clientDetail"></div>
  </section>

  <!-- Брифы в процессе -->
  <section class="view hidden" data-view="drafts">
    <section class="card">
      <h2>Кто сейчас заполняет бриф</h2>
      <p class="muted">Начатые, но не отправленные брифы. Через сутки тишины бот один раз напоминает клиенту (днём, 10:00–20:00 по Киеву); через 7 дней бриф удаляется.</p>
      <p class="muted" id="remindersInfo"></p>
      <div id="draftsTable"></div>
    </section>
  </section>

  <!-- Отзывы -->
  <section class="view hidden" data-view="reviews">
    <div class="stats" id="reviewStats"></div>
    <section class="card">
      <h2>Отзывы клиентов</h2>
      <p class="muted">Когда вы ставите заказу «Готово» (с уведомлением клиента), бот просит оценку от 1 до 5 и пару слов. Отмеченные «Показывать в каталоге» клиенты видят в «🎨 Наші роботи» → «⭐ Відгуки клієнтів». Оценки 3 и ниже бот сразу присылает вам в Telegram.</p>
      <div id="reviewsList"></div>
    </section>
  </section>

  <!-- Рассылка -->
  <section class="view hidden" data-view="broadcast">
    <div class="alert info hidden" id="bcRunning"></div>
    <section class="card">
      <h2>Новая рассылка</h2>
      <p class="muted">Пишите на украинском — так же, как говорит бот. В каждое сообщение бот добавит кнопку «🔕 Не отримувати розсилки»; отписавшимся рассылки больше не приходят (сообщения по их заказам — приходят).</p>
      <form id="bcForm">
        <label>Текст<textarea name="text" rows="6" maxlength="3500" required placeholder="Наприклад: 🎉 Нові роботи в каталозі! До кінця тижня — знижка 10% на анімовані стікерпаки."></textarea></label>
        <label>Картинка (необязательно) — ссылка https://…<input name="photo" placeholder="https://… .jpg / .png" spellcheck="false"></label>
        <div class="grid2">
          <label>Кнопка под сообщением
            <select name="buttonKind" id="bcButtonKind">
              <option value="none">Без кнопки</option>
              <option value="works">🎨 Наші роботи (каталог)</option>
              <option value="brief">🚀 Розпочати бриф</option>
              <option value="url">Своя ссылка</option>
            </select>
          </label>
          <label>Кому
            <select name="audience" id="bcAudience">
              <option value="all">Всем клиентам</option>
              <option value="orders">Тем, у кого были заказы</option>
              <option value="no_orders">Тем, кто ещё не заказывал</option>
              <option value="source">По метке источника…</option>
              <option value="lang_uk">Украиноязычным 🇺🇦</option>
              <option value="lang_en">Англоязычным 🇬🇧 (пишите текст по-английски)</option>
            </select>
          </label>
        </div>
        <div class="grid2 hidden" id="bcUrlFields">
          <label>Текст кнопки<input name="buttonText" maxlength="40" placeholder="Детальніше"></label>
          <label>Ссылка кнопки<input name="buttonUrl" placeholder="https://…" spellcheck="false"></label>
        </div>
        <label class="hidden" id="bcSourceField">Метка источника<select name="source" id="bcSource"></select></label>
        <p class="muted" id="bcCount"></p>
        <div class="actions">
          <button type="button" class="ghost" id="bcTest">Отправить себе тест</button>
          <button type="submit">Начать рассылку</button>
        </div>
      </form>
      <p class="error" id="bcError"></p>
      <p class="ok" id="bcOk"></p>
    </section>
    <section class="card">
      <h2>История рассылок</h2>
      <div id="bcHistory"></div>
    </section>
  </section>

  <!-- Канал -->
  <section class="view hidden" data-view="channel">
    <div class="ch-layout">
      <div class="ch-editor-col">
        <section class="card">
          <div class="card-head"><h2>Новый пост</h2><button type="button" class="small ghost" id="chManageBtn">Каналы и подпись</button></div>
          <label>Куда публиковать<select id="chTarget"></select></label>
          <p class="muted hidden" id="chNoChannels">Добавьте канал или группу кнопкой «Каналы и подпись» — бот должен быть там администратором.</p>

          <div class="tpl-bar">
            <select id="tplSelect"><option value="">📄 Шаблоны…</option></select>
            <button type="button" class="small ghost" id="tplInsert">Вставить</button>
            <button type="button" class="small ghost" id="tplSave">💾 Сохранить как шаблон</button>
            <button type="button" class="small ghost" id="tplManageBtn">Управлять</button>
          </div>
          <p class="muted hidden" id="tplLoaded"></p>

          <div class="edit-banner hidden" id="chEditBanner">
            <b>✏️ Редактирование опубликованного поста</b>
            <p class="muted" id="chEditText"></p>
            <div class="actions"><button type="button" id="chEditSave">💾 Сохранить изменения в Telegram</button><button type="button" class="ghost" id="chEditCancel">Отмена</button></div>
          </div>
          <div class="ai-box hidden" id="aiBox">
            <div class="ai-head"><button type="button" class="small" id="aiToggle">✨ Написать с ИИ</button><span class="muted">Claude подготовит черновик по описанию — дальше правите как обычно.</span></div>
            <div class="ai-panel hidden" id="aiPanel">
              <textarea id="aiBrief" rows="3" maxlength="2000" placeholder="О чём пост. Например: показать новый пак для IT-команды — 12 стикеров с котом-тимлидом, позвать заказывать подарочные паки к Новому году"></textarea>
              <div class="row">
                <label>Тон<select id="aiTone"><option value="friendly">дружеский</option><option value="business">деловой</option><option value="festive">праздничный</option><option value="sale">акция / продажа</option></select></label>
                <label>Длина<select id="aiLength"><option value="short">короткий</option><option value="medium" selected>средний</option><option value="long">подробный</option></select></label>
                <label>Язык<select id="aiLang"><option value="uk">украинский</option><option value="en">английский</option></select></label>
              </div>
              <label class="check"><input type="checkbox" id="aiUseCurrent"> Взять за основу текст из редактора (улучшить или переписать)</label>
              <div class="actions"><button type="button" id="aiGo">✨ Сгенерировать</button></div>
              <p class="error" id="aiPostError"></p>
            </div>
          </div>
          <div class="ch-toolbar" id="chToolbar">
            <button type="button" data-cmd="bold" title="Жирный (Ctrl+B)"><b>Ж</b></button>
            <button type="button" data-cmd="italic" title="Курсив (Ctrl+I)"><i>К</i></button>
            <button type="button" data-cmd="underline" title="Подчёркнутый (Ctrl+U)"><u>Ч</u></button>
            <button type="button" data-cmd="strike" title="Зачёркнутый"><s>З</s></button>
            <button type="button" data-cmd="spoiler" title="Скрытый текст (спойлер)">▒</button>
            <button type="button" data-cmd="code" title="Моноширинный">&lt;/&gt;</button>
            <button type="button" data-cmd="link" title="Ссылка">🔗</button>
            <button type="button" data-cmd="quote" title="Цитата">❝</button>
            <button type="button" data-cmd="clear" title="Убрать форматирование">⌫</button>
          </div>
          <div class="ch-editor" id="chEditor" contenteditable="true" data-placeholder="Текст поста… Выделите слово и нажмите кнопку форматирования."></div>
          <p class="muted" id="chCounter"></p>
          <p class="muted">Подстановки: <code>{дата}</code> — дата публикации, <code>{бот}</code> — @username бота.</p>

          <h3>Медиа</h3>
          <div class="ch-drop" id="chDrop">
            <input type="file" id="chFiles" multiple class="hidden">
            <button type="button" class="small ghost" id="chPick">📎 Добавить фото, видео или файл</button>
            <span class="muted">или перетащите сюда · до 10 файлов, до 20 МБ · несколько фото уйдут альбомом</span>
          </div>
          <div class="ch-thumbs" id="chThumbs"></div>

          <h3>Кнопки под постом</h3>
          <div id="chButtons"></div>
          <div class="actions">
            <button type="button" class="small ghost" id="chAddBtn">+ Кнопка-ссылка</button>
            <button type="button" class="small ghost" id="chAddOrder">+ «🚀 Замовити стікери» (в бота)</button>
          </div>

          <h3>Параметры</h3>
          <div class="ch-options">
            <label class="check"><input type="checkbox" id="chSig" checked> Подпись <span class="muted" id="chSigText"></span></label>
            <label class="check"><input type="checkbox" id="chSilent"> Без звука</label>
            <label class="check"><input type="checkbox" id="chNoPreview"> Без превью ссылок</label>
            <label class="check"><input type="checkbox" id="chPin"> Закрепить</label>
            <label class="check"><input type="checkbox" id="chProtect"> Запретить пересылку и сохранение</label>
          </div>
          <label>Опубликовать позже (необязательно, время вашего устройства)<input type="datetime-local" id="chSchedule"></label>

          <div class="actions ch-send">
            <button type="button" class="ghost" id="chTest">Отправить себе тест</button>
            <button type="button" id="chPublish">Опубликовать</button>
          </div>
          <p class="error" id="chError"></p>
          <p class="ok" id="chOk"></p>
        </section>
      </div>

      <div class="ch-preview-col">
        <div class="ch-sticky">
          <h3>Предпросмотр</h3>
          <div class="tg-chat" id="chPreview"></div>
          <p class="muted" id="chPreviewNote"></p>
        </div>
      </div>
    </div>

    <section class="card hidden" id="tplManage">
      <h2>Шаблоны постов</h2>
      <p class="muted">Шаблон хранит текст с форматированием, медиа, кнопки и параметры поста. «Вставить» загружает его в редактор — дальше правьте и публикуйте. Медиа шаблонов хранятся, пока шаблон существует.</p>
      <div id="tplList"></div>
    </section>

    <section class="card hidden" id="chManage">
      <h2>Каналы и группы</h2>
      <p class="muted">Добавьте бота в канал администратором с правом «Публикация сообщений» (в группу — участником или администратором), затем укажите @username или ID. Чтобы узнать ID приватного канала, перешлите из него пост боту @userinfobot.</p>
      <div id="chList"></div>
      <form id="chAddForm" class="row">
        <input name="ref" placeholder="@yabotua или -1001234567890" required spellcheck="false">
        <button type="submit">Добавить</button>
      </form>
      <p class="error" id="chAddError"></p>
      <h2 class="mt">Конструктор подписи</h2>
      <p class="muted">Заполните ссылки и нажмите «Собрать подпись» — она появится в поле ниже, где её можно поправить и сохранить.</p>
      <form id="sigBuilder" class="sig-builder" autocomplete="off">
        <label>Строка сверху (необязательно)<input name="intro" maxlength="120" placeholder="YABOT — стікери з характером"></label>
        <div class="sig-links">
          <div class="sig-link"><input name="label0" maxlength="40" placeholder="Название"><input name="url0" placeholder="yabotua.com" spellcheck="false"></div>
          <div class="sig-link"><input name="label1" maxlength="40" placeholder="Название"><input name="url1" placeholder="instagram.com/yabotua" spellcheck="false"></div>
          <div class="sig-link"><input name="label2" maxlength="40" placeholder="Название"><input name="url2" placeholder="threads.net/@yabotua" spellcheck="false"></div>
        </div>
        <div class="sig-row">
          <span class="sig-cap">Разделитель</span>
          <label class="sep"><input type="radio" name="sep" value="🟠"> 🟠</label>
          <label class="sep"><input type="radio" name="sep" value="•"> •</label>
          <label class="sep"><input type="radio" name="sep" value="·"> ·</label>
          <label class="sep"><input type="radio" name="sep" value="|"> |</label>
          <label class="sep"><input type="radio" name="sep" value="✦"> ✦</label>
          <label class="sep"><input type="radio" name="sep" value="⚡"> ⚡</label>
          <label class="sep"><input type="radio" name="sep" value="custom"> свой <input name="sepCustom" maxlength="8" class="sep-custom"></label>
        </div>
        <div class="sig-row">
          <span class="sig-cap">Раскладка</span>
          <select name="layout"><option value="line">В одну строку</option><option value="column">Столбиком</option></select>
          <label class="check"><input type="checkbox" name="bold"> Жирные названия</label>
        </div>
        <div class="sig-preview"><small class="small-muted">Получится:</small><div class="tg-text" id="sigBuilderPreview"></div></div>
        <button type="button" id="sigBuild">Собрать подпись ↓</button>
      </form>

      <h2 class="mt">Подпись к постам</h2>
      <p class="muted">Добавляется в конец каждого поста (можно выключить для отдельного поста). Ссылка-слово: <code>[Instagram](instagram.com/yabotua)</code> — адрес можно без https://. Эмодзи вставляйте как есть (🟠) или кодом <code>U+1F7E0</code>. @упоминания Telegram сделает кликабельными сам.</p>
      <form id="chSigForm" class="stack">
        <textarea name="signature" rows="2" maxlength="500" placeholder="[www](yabotua.com) 🟠 [Instagram](instagram.com/yabotua) 🟠 [Threads](threads.net/@yabotua)"></textarea>
        <div class="sig-preview"><small class="small-muted">Так будет в посте:</small><div class="tg-text" id="chSigPreview"></div></div>
        <button type="submit">Сохранить подпись</button>
      </form>
      <p class="ok" id="chSigOk"></p>
    </section>

    <section class="card">
      <h2>Запланированные</h2>
      <div id="chQueue"></div>
      <h2 class="mt">Опубликованные</h2>
      <div id="chHistory"></div>
    </section>
  </section>

  <!-- Каталог -->
  <section class="view hidden" data-view="catalog">
    <section class="card">
      <h2>Каталог готовых работ</h2>
      <p class="muted">Клиенты видят его по кнопке «🎨 Наші роботи»: бот показывает живые стикеры из пака, кнопки «Додати стікерпак» и «Хочу такий самий».</p>
      <form id="catalogForm" class="stack">
        <input name="link" placeholder="Ссылка на стикерпак: https://t.me/addstickers/…" required spellcheck="false">
        <textarea name="description" maxlength="500" rows="2" placeholder="Описание для клиентов (необязательно; бот на украинском)"></textarea>
        <button type="submit">Добавить в каталог</button>
      </form>
      <p class="error" id="catalogError"></p>
      <div id="catalogList"></div>
    </section>
  </section>

  <!-- Цены -->
  <section class="view hidden" data-view="prices">
    <section class="card">
      <h2>Цены для клиентов</h2>
      <p class="muted">Показываются по кнопке «💰 Вартість» и в брифе сразу после выбора типа и количества. Пишите как удобно: «від 1500 грн», «1500–2000 грн». Пустая ячейка — не показывать.</p>
      <form id="pricesForm">
        <div class="table-wrap">
          <table class="prices">
            <thead><tr><th></th><th>5 шт.</th><th>10 шт.</th><th>15-20 шт.</th></tr></thead>
            <tbody>
              <tr><th>Статичні</th><td><input name="static.5"></td><td><input name="static.10"></td><td><input name="static.15-20"></td></tr>
              <tr><th>Анімовані</th><td><input name="animated.5"></td><td><input name="animated.10"></td><td><input name="animated.15-20"></td></tr>
            </tbody>
          </table>
        </div>
        <textarea name="note" rows="2" maxlength="300" placeholder="Примечание под ценами (по умолчанию: «Точну вартість дизайнер назве після брифу — вона залежить від складності персонажа та анімації.»)"></textarea>
        <button type="submit">Сохранить цены</button>
      </form>
      <p class="error" id="pricesError"></p>
      <p class="ok" id="pricesOk"></p>
    </section>
    <section class="card">
      <h2>📦 Пакеты в брифе</h2>
      <p class="muted">Готовые предложения с ценой. Если есть включённые пакеты для выбранного типа стикеров, бот вместо вопроса «сколько стикеров» показывает их — клиент выбирает пакет кнопкой или «Свій варіант». Цена пакета попадает в заявку и подставляется в смету. Пакет без цены не показывается.</p>
      <div id="pkgList"></div>
      <div class="actions"><button type="button" class="small ghost" id="pkgAdd">+ Добавить пакет</button><button type="button" id="pkgSave">Сохранить пакеты</button></div>
      <p class="error" id="pkgError"></p>
      <p class="ok" id="pkgOk"></p>
    </section>
    <section class="card">
      <h2>🎨 Стили в брифе</h2>
      <p class="muted">Картинки-примеры стилей (мультяшный, плоский, 3D, пиксель-арт, леттеринг…). После вопроса о герое бот присылает их альбомом с номерами и просит выбрать — или «на розсуд дизайнера», или описать словами. До 8 стилей. Нет включённых стилей — шага нет.</p>
      <div id="styleList"></div>
      <div class="actions"><button type="button" class="small ghost" id="styleAdd">+ Добавить стиль</button><button type="button" id="styleSave">Сохранить стили</button></div>
      <p class="error" id="styleError"></p>
      <p class="ok" id="styleOk"></p>
    </section>
    <section class="card">
      <h2>🎟 Промокоды</h2>
      <p class="muted">Клиент вводит код на шаге проверки брифа («🎟 Маю промокод») или приходит по ссылке <code>t.me/бот?start=promo_КОД</code> — тогда скидка применяется сама. Скидку в цене вы учитываете сами; в заявке видно «🎟 Промокод … — знижка N%».</p>
      <form id="promoForm">
        <div class="grid2">
          <label>Код (латиница и цифры)<input name="code" required maxlength="20" placeholder="NEWYEAR15" spellcheck="false"></label>
          <label>Скидка, %<input name="percent" type="number" min="1" max="90" required></label>
        </div>
        <div class="grid2">
          <label>Действует до (необязательно)<input name="until" type="date"></label>
          <label>Сколько раз можно использовать (пусто — без ограничений)<input name="maxUses" type="number" min="1"></label>
        </div>
        <label>Заметка для себя<input name="note" maxlength="100" placeholder="например: для поста в Instagram"></label>
        <button type="submit">Добавить промокод</button>
      </form>
      <p class="error" id="promoError"></p>
      <div id="promoList"></div>
    </section>
  </section>

  <!-- Источники -->
  <section class="view hidden" data-view="sources">
    <section class="card">
      <h2>Откуда приходят клиенты</h2>
      <p class="muted">Создайте отдельную ссылку для каждого места: Instagram, сайт, реклама, визитка. Бот запомнит, по какой ссылке пришёл человек, и покажет это в заявке и в таблице ниже.</p>
      <form id="sourceForm" class="row">
        <input name="label" placeholder="Метка латиницей, например insta" maxlength="64" required spellcheck="false">
        <button type="submit">Создать ссылку</button>
      </form>
      <p class="error" id="sourceError"></p>
      <div class="linkbox hidden" id="sourceLinkBox">
        <code id="sourceLink"></code>
        <button type="button" class="small" id="copyLink">Копировать</button>
      </div>
      <div id="sourcesTable"></div>
    </section>
  </section>

  <!-- Настройки -->
  <section class="view hidden" data-view="settings">
    <div class="subnav" id="settingsNav"></div>
    <input type="search" id="settingsSearch" class="settings-search" placeholder="🔎 Поиск по настройкам: «оплата», «пароль», «канал»…">
    <div class="grid2">
      <section class="card">
        <h2>Приём заказов</h2>
        <p id="activeText"></p>
        <button type="button" id="activeBtn"></button>
        <p class="muted">На паузе бот продолжает отвечать, показывать каталог и цены, а на «Розпочати» вежливо сообщает, что студия загружена. Уже начатые брифы можно дозаполнить.</p>
      </section>
      <section class="card">
        <h2>Получатель заявок</h2>
        <p class="muted">Сюда бот присылает карточку заявки с кнопками статуса, PDF-бланк и файлы клиента.</p>
        <form id="settingsForm" class="row">
          <input name="adminChatId" inputmode="numeric" placeholder="Telegram ID, например 8310127198" required>
          <button type="submit">Сохранить</button>
        </form>
        <p class="muted">Перед сохранением отправьте боту /start с этого аккаунта — бот пришлёт проверочное сообщение.</p>
        <p class="error" id="settingsError"></p>
        <p class="ok" id="settingsOk"></p>
      </section>
    </div>
    <section class="card pay-card">
      <div class="card-head"><h2>💳 Оплата: monobank и перевод на карту</h2><span class="pill" id="payState"></span></div>
      <p class="muted">Счёт на аванс выставляется из карточки заявки (здесь или кнопкой «💳 Рахунок на аванс» в Telegram). Клиент платит картой, Apple Pay или Google Pay на странице monobank. Бот сам проверяет оплату раз в 30 секунд и сообщает вам и клиенту — отдельный адрес для уведомлений не нужен.</p>
      <form id="payForm">
        <label class="check pay-toggle"><input type="checkbox" name="enabled"> <b>Приём оплаты включён</b></label>
        <label>Токен мерчанта monobank
          <input name="token" type="password" autocomplete="off" spellcheck="false" placeholder="Вставьте токен из кабинета web.monobank.ua → Еквайринг → Інтеграція / API">
        </label>
        <p class="muted" id="payTokenInfo"></p>
        <div class="actions"><button type="button" class="small ghost" id="payVerify">Проверить токен</button><button type="button" class="small ghost danger hidden" id="payClearToken">Удалить сохранённый токен</button></div>
        <p class="ok" id="payVerifyOk"></p>
        <div class="grid2">
          <label>Аванс по умолчанию
            <select name="mode"><option value="percent">Процент от согласованной цены</option><option value="fixed">Фиксированная сумма</option></select>
          </label>
          <label id="payPercentField">Процент<input type="number" name="percent" min="1" max="100"></label>
          <label class="hidden" id="payFixedField">Сумма, грн<input type="number" name="fixed" min="1"></label>
        </div>
        <div class="grid2">
          <label>Счёт действует, часов<input type="number" name="validityHours" min="1" max="720"></label>
          <label>Назначение платежа<input name="destination" maxlength="280" placeholder="Аванс за стікерпак, замовлення #{номер}"></label>
        </div>
        <label class="check"><input type="checkbox" name="autoStart"> После оплаты автоматически брать заявку «в работу»</label>
        <label class="check"><input type="checkbox" name="autoInvoice"> Когда клиент согласует смету — сразу отправлять ему счёт на аванс</label>
        <h3>Перевод на карту (без ФОП)</h3>
        <p class="muted">Клиент получает сумму, номер карты (копируется нажатием) и кнопку «✅ Я оплатив». Вам приходит «Клиент сообщил об оплате» с кнопками «Деньги пришли» / «Не пришло». Если включён и monobank — счёт идёт через monobank, а реквизиты карты можно отправить кнопкой в карточке заявки.</p>
        <label class="check"><input type="checkbox" name="cardEnabled"> <b>Принимать оплату переводом на карту</b></label>
        <div class="grid2">
          <label>Номер карты или IBAN<input name="cardNumber" maxlength="40" placeholder="5375 4141 0000 0000" spellcheck="false" autocomplete="off"></label>
          <label>Получатель<input name="cardRecipient" maxlength="80" placeholder="Прізвище Ім'я"></label>
        </div>
        <label>Подсказка клиенту (необязательно, {номер} — номер заявки)<input name="cardNote" maxlength="200" placeholder="У коментарі до переказу вкажіть: замовлення #{номер}"></label>
        <h3>🔔 Напоминание об оплате остатка</h3>
        <p class="muted">Заказ готов, а клиент не доплатил остаток? Бот сам вежливо напомнит: одно сообщение с суммой и кнопкой оплаты (счёт monobank или реквизиты карты — что включено). Только днём. Если счёт вы выставили сами — бот его не трогает.</p>
        <div class="grid2">
          <label>Напомнить через, дней после «Готово» (0 — выключено)<input type="number" name="remindDays" min="0" max="30"></label>
          <label>Сколько раз<select name="remindTimes"><option value="1">1 раз</option><option value="2">2 раза (второй — ещё через столько же дней)</option></select></label>
        </div>
        <button type="submit">Сохранить</button>
      </form>
      <p class="muted" id="payStats"></p>
      <p class="error" id="payError"></p>
      <p class="ok" id="payOk"></p>
    </section>
    <section class="card">
      <div class="card-head"><h2>✨ ИИ-помощник (Claude)</h2><span class="pill" id="aiState"></span></div>
      <p class="muted">Две функции. В брифе на шаге эмоций у клиента появляется кнопка «💡 Допоможіть з ідеями» — бот предлагает 10–20 эмоций и фраз под его героя. Во вкладке «Канал» — «✨ Написать с ИИ»: черновик поста по описанию. Нужен ключ Claude API (console.anthropic.com → API Keys), оплата у Anthropic по факту использования. Без ключа эти кнопки не показываются.</p>
      <form id="aiForm">
        <label>Ключ Claude API
          <input name="key" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…">
        </label>
        <p class="muted" id="aiKeyInfo"></p>
        <div class="actions"><button type="button" class="small ghost" id="aiVerify">Проверить ключ</button><button type="button" class="small ghost danger hidden" id="aiClearKey">Удалить сохранённый ключ</button></div>
        <p class="ok" id="aiVerifyOk"></p>
        <label>Модель<select name="model" id="aiModel"></select></label>
        <label class="check"><input type="checkbox" name="briefIdeas"> «💡 Допоможіть з ідеями» в брифе (до 3 раз на бриф и 10 в день на клиента)</label>
        <label class="check"><input type="checkbox" name="channelWriter"> «✨ Написать с ИИ» во вкладке «Канал»</label>
        <button type="submit">Сохранить</button>
      </form>
      <p class="muted" id="aiStats"></p>
      <p class="error" id="aiError"></p>
      <p class="ok" id="aiOk"></p>
    </section>
    <section class="card">
      <div class="card-head"><h2>🤖 ИИ-агент студии (GenAgent)</h2><span class="pill" id="gaState"></span></div>
      <p class="muted">Агент на сайте и в почте отвечает клиентам по базе знаний. Бот сам отправляет ему цены, услуги, пакеты, график работы и частые вопросы с этой страницы — поменяли цену здесь, и через несколько минут агент называет новую. В GenAgent создайте у агента канал «Свой бот (API)» и скопируйте сюда адрес и ключ.</p>
      <form id="gaForm">
        <label>Адрес агента
          <input name="url" type="url" autocomplete="off" spellcheck="false" placeholder="https://agents.yabotua.com/api/agent/…">
        </label>
        <label>Ключ канала
          <input name="key" type="password" autocomplete="off" spellcheck="false" placeholder="ключ из GenAgent">
        </label>
        <p class="muted" id="gaKeyInfo"></p>
        <label class="check"><input type="checkbox" name="enabled"> Отправлять цены, услуги и FAQ агенту</label>
        <label class="check"><input type="checkbox" name="chat"> Отвечать клиентам в чате бота и в Mini App</label>
        <p class="muted">На вопросы людей без заказа отвечает ИИ-агент (вместо подбора из частых вопросов). Если нужен человек — вопрос приходит вам как раньше, с кратким пересказом разговора; ответьте «Ответить», как обычно. Клиенты с заказом по-прежнему пишут дизайнеру напрямую. В Mini App «Задать вопрос» превращается в чат с помощником.</p>
        <label class="check"><input type="checkbox" name="comments"> Отвечать на комментарии в канале</label>
        <p class="muted">Бот должен быть администратором группы обсуждений канала (там, где собираются комментарии). Агент отвечает на комментарии под постами и на ответы на сообщения бота; переписку людей между собой не трогает. Ответы публикуются от имени этого бота — сразу или после одобрения в GenAgent (настройка канала «Свой бот (API)»).</p>
        <div class="actions"><button type="submit">Сохранить</button><button type="button" class="small ghost" id="gaSync">Отправить сейчас</button></div>
      </form>
      <p class="muted" id="gaStatus"></p>
      <p class="error" id="gaError"></p>
      <p class="ok" id="gaOk"></p>
    </section>
    <section class="card">
      <h2>🇬🇧 Английская версия</h2>
      <p class="muted">Если язык Telegram у клиента не украинский, не русский и не белорусский, бот говорит с ним по-английски: меню, бриф, уведомления, эскизы, оплата, PDF-бланк. Под приветствием — кнопка смены языка, ещё есть команда /language. Карточки заявок приходят вам как обычно, с пометкой «🇬🇧 Англомовний клієнт» — отвечайте такому клиенту по-английски.</p>
      <form id="langForm" class="row">
        <label class="check"><input type="checkbox" name="english"> Включить английскую версию</label>
        <button type="submit">Сохранить</button>
      </form>
      <p class="muted" id="langStats"></p>
      <p class="error" id="langError"></p>
      <p class="ok" id="langOk"></p>
    </section>
    <section class="card">
      <h2>💬 Быстрые ответы</h2>
      <p class="muted">Шаблоны частых фраз клиенту. На странице — кнопки над полем ответа в карточке заявки. В Telegram — ответьте на сообщение клиента (или на карточку заявки) командой <code>/r 1</code>, где 1 — номер шаблона; просто <code>/r</code> покажет список. Подстановки: <code>{ім'я}</code>, <code>{номер}</code>, <code>{ціна}</code>, <code>{термін}</code> (цена и срок — из полей «Для студии»). Английский текст — для англоязычных клиентов, необязательно.</p>
      <div id="qrList"></div>
      <div class="actions"><button type="button" class="small ghost" id="qrAdd">+ Добавить шаблон</button><button type="button" id="qrSave">Сохранить шаблоны</button></div>
      <p class="error" id="qrError"></p>
      <p class="ok" id="qrOk"></p>
    </section>
    <section class="card">
      <h2>🔔 Утренняя сводка и оповещения</h2>
      <p class="muted">Каждое утро бот присылает вам в Telegram сводку: новые заявки, кто ждёт ответа, сроки (просрочено / сегодня / завтра), правки к эскизам, сметы без ответа, оплаты. Дизайнерам из команды — сводка по их заявкам. Отдельно бот напоминает о сроке за день, в день срока и при просрочке.</p>
      <form id="digestForm">
        <div class="row">
          <label class="check"><input type="checkbox" name="enabled"> Присылать утреннюю сводку</label>
          <label>Во сколько (по Киеву)<select name="hour"><option value="5">05:00</option><option value="6">06:00</option><option value="7">07:00</option><option value="8">08:00</option><option value="9">09:00</option><option value="10">10:00</option><option value="11">11:00</option><option value="12">12:00</option><option value="13">13:00</option><option value="14">14:00</option><option value="15">15:00</option><option value="16">16:00</option><option value="17">17:00</option><option value="18">18:00</option><option value="19">19:00</option><option value="20">20:00</option><option value="21">21:00</option><option value="22">22:00</option><option value="23">23:00</option></select></label>
        </div>
        <label class="check"><input type="checkbox" name="weekly"> По понедельникам — недельный отчёт (заявки, деньги, конверсия, лучший источник, дизайнеры)</label>
        <label class="check"><input type="checkbox" name="alerts"> Сообщать о сбоях: ошибки в боте (не чаще раза в 30 минут) и пропадание связи с Telegram дольше 3 минут</label>
        <div class="actions"><button type="submit">Сохранить</button><button type="button" class="ghost" id="digestSend">Прислать сводку сейчас</button><button type="button" class="ghost" id="weeklySend">Прислать недельный отчёт</button></div>
      </form>
      <p class="muted" id="digestInfo"></p>
      <p class="error" id="digestError"></p>
      <p class="ok" id="digestOk"></p>
      <div class="digest-preview hidden" id="digestPreview"></div>
    </section>
    <section class="card">
      <h2>🧾 Журнал действий</h2>
      <p class="muted">Кто и когда менял статус, цену, срок, дизайнера, этап, оплату, смету и план оплаты — и откуда: со страницы, из студии Mini App или в Telegram / клиентом (кнопки в чате, оплата, решение клиента; такие изменения попадают в журнал в течение 10 минут). Последние 150 записей; по каждой заявке — в её карточке.</p>
      <div id="auditFeed"></div>
    </section>
    <section class="card">
      <h2>⏰ Ответы клиентам</h2>
      <p class="muted">Если клиент написал, а ему никто не ответил, бот напоминает назначенному дизайнеру (нет дизайнера — вам), а если тишина продолжается — пишет вам. Только в рабочие часы (если они не заданы — с 9 до 21). Ответить можно прямо на напоминание — «Ответить», и ответ уйдёт клиенту. В студии Mini App — плитка «Ждут ответа».</p>
      <form id="slaForm">
        <label class="check"><input type="checkbox" name="enabled"> Напоминать о неотвеченных сообщениях</label>
        <div class="grid2">
          <label>Дизайнеру через, часов<input type="number" name="hours" min="0.5" max="48" step="0.5"></label>
          <label>Вам через, часов<input type="number" name="escalateHours" min="0.5" max="96" step="0.5"></label>
        </div>
        <label class="check"><input type="checkbox" name="showTime"> Показывать клиентам в Mini App «Зазвичай відповідаємо за ~N хв» (по вашей статистике за 30 дней, если ответов хотя бы 5 и время меньше суток)</label>
        <button type="submit">Сохранить</button>
      </form>
      <p class="muted" id="slaStats"></p>
      <p class="error" id="slaError"></p>
      <p class="ok" id="slaOk"></p>
    </section>
    <section class="card">
      <div class="card-head"><h2>🏖 Режим отпуска</h2><span class="pill" id="vacState"></span></div>
      <p class="muted">Бот предупреждает клиентов, что студия отдыхает: при начале брифа, после заявки и на сообщения дизайнеру (вместо автоответа о рабочих часах). В указанную дату режим выключится сам, и бот сообщит вам.</p>
      <form id="vacForm">
        <label class="check"><input type="checkbox" name="enabled"> <b>Режим отпуска включён</b></label>
        <div class="grid2">
          <label>До какой даты (включительно)<input type="date" name="until"></label>
          <label class="check vac-accept"><input type="checkbox" name="acceptOrders"> Принимать заявки во время отпуска</label>
        </div>
        <label>Свой текст для клиентов (пусто — бот составит сам; англоязычным — всегда стандартный английский)<textarea name="message" rows="2" maxlength="600"></textarea></label>
        <button type="submit">Сохранить</button>
      </form>
      <p class="error" id="vacError"></p>
      <p class="ok" id="vacOk"></p>
    </section>
    <section class="card">
      <h2>👥 Команда дизайнеров</h2>
      <p class="muted">Дизайнер входит на эту страницу со своим логином и паролем и видит только назначенные ему заявки: бриф, смету, сроки, переписку, эскизы. Оплаты, клиенты, настройки и канал ему не видны. В Telegram ему приходят карточки его заявок, PDF, сообщения клиентов — отвечать можно через «Ответить», отправлять эскизы и менять статус. Назначить дизайнера — в карточке заявки. Перед добавлением дизайнер должен отправить боту /start.</p>
      <div id="teamList"></div>
      <h3>Автораспределение новых заявок</h3>
      <form id="assignForm" class="row">
        <label>Назначать дизайнера сам<select name="mode"><option value="off">Нет — назначаю вручную</option><option value="round">По очереди</option><option value="least">Тому, у кого меньше открытых заявок</option></select></label>
        <button type="submit" class="small">Сохранить</button>
      </form>
      <p class="muted">Берутся активные дизайнеры с Telegram ID. Галочки «стикеры / боты / персонажи» у дизайнера — какие заявки ему можно давать (ни одной — любые). Дизайнер сразу получает карточку, PDF и файлы.</p>
      <p class="error" id="assignError"></p>
      <p class="ok" id="assignOk"></p>
      <h3>Добавить дизайнера</h3>
      <form id="teamForm">
        <div class="grid2">
          <label>Имя<input name="name" required maxlength="40" placeholder="Аня"></label>
          <label>Логин для входа<input name="login" required maxlength="32" placeholder="anya" spellcheck="false" autocomplete="off"></label>
        </div>
        <div class="grid2">
          <label>Пароль (минимум 8)<input name="password" type="password" required minlength="8" autocomplete="new-password"></label>
          <label>Telegram ID дизайнера<input name="telegramId" inputmode="numeric" placeholder="узнать: /chatid в боте"></label>
        </div>
        <button type="submit">Добавить дизайнера</button>
      </form>
      <p class="error" id="teamError"></p>
      <p class="ok" id="teamOk"></p>
    </section>
    <section class="card">
      <h2>🔁 Возврат клиентов</h2>
      <p class="muted">Через N дней после «Готово», если клиент больше не заказывал, бот пишет ему: предлагает дополнить пак или заказать новый, со скидкой по персональному промокоду (одноразовый, 30 дней, уже применён к его следующей заявке). Один раз на заказ, днём, не больше 20 сообщений за раз, отписавшимся от рассылок — не пишет.</p>
      <form id="wbForm">
        <label class="check"><input type="checkbox" name="enabled"> Включить</label>
        <div class="grid2">
          <label>Через сколько дней после «Готово»<input type="number" name="days" min="14" max="365"></label>
          <label>Скидка, % (0 — без скидки)<input type="number" name="percent" min="0" max="50"></label>
        </div>
        <label>Свой текст (необязательно; подстановки {ім'я}, {знижка}, {код}; англоязычным — стандартный английский)<textarea name="message" rows="3" maxlength="800"></textarea></label>
        <button type="submit">Сохранить</button>
      </form>
      <p class="muted" id="wbStats"></p>
      <p class="error" id="wbError"></p>
      <p class="ok" id="wbOk"></p>
    </section>
    <section class="card">
      <h2>✏️ Правка после сдачи</h2>
      <p class="muted">N дней после «Готово» у клиента в Mini App в готовом заказе есть кнопка «✏️ Потрібна правка»: он описывает, что поправить, и может приложить фото. Вам и дизайнеру приходит сообщение (ответить можно «Ответить»), у заявки — пометка «правка». Статус остаётся «Готово», финансы не меняются. Когда поправите — «Правка готова» в карточке заявки, клиенту придёт уведомление. До 3 правок на заказ.</p>
      <form id="fixForm">
        <label class="check"><input type="checkbox" name="enabled"> Включить</label>
        <label>Сколько дней после «Готово»<input type="number" name="days" min="1" max="90"></label>
        <button type="submit">Сохранить</button>
      </form>
      <p class="error" id="fixError"></p>
      <p class="ok" id="fixOk"></p>
    </section>
    <section class="card">
      <h2>🎁 Промокод за отзыв</h2>
      <p class="muted">Клиент оставил отзыв с комментарием (в чате бота или в Mini App) — бот благодарит и присылает персональный промокод на следующий заказ: одноразовый, только для этого клиента, сам подставляется в его следующую заявку. В Mini App на карточке «Як вам результат?» клиент заранее видит, что за отзыв будет скидка.</p>
      <form id="rpForm">
        <label class="check"><input type="checkbox" name="enabled"> Включить</label>
        <div class="grid2">
          <label>Скидка, %<input type="number" name="percent" min="1" max="50"></label>
          <label>Действует, дней<input type="number" name="days" min="7" max="365"></label>
        </div>
        <button type="submit">Сохранить</button>
      </form>
      <p class="muted" id="rpStats"></p>
      <p class="error" id="rpError"></p>
      <p class="ok" id="rpOk"></p>
    </section>
    <section class="card">
      <h2>🤝 Поддержка после запуска бота</h2>
      <p class="muted">Через N дней после «Готово» по Telegram-боту бот спрашивает клиента: «Як працює ваш бот?» и предлагает доработки и сопровождение. Кнопка «💬 Хочу обговорити» сразу создаёт заявку-консультацию на бота (с пометкой «Дополнение к #…»), «👍 Все чудово» — просто благодарит. Один раз на заказ, днём; не пишет, если клиент уже заказал новый бот.</p>
      <form id="supForm">
        <label class="check"><input type="checkbox" name="enabled"> Включить</label>
        <label>Через сколько дней после «Готово»<input type="number" name="days" min="7" max="365"></label>
        <div class="grid2">
          <label>Свой текст (укр., необязательно; {проєкт} — название бота)<textarea name="message" rows="3" maxlength="800"></textarea></label>
          <label>Свой текст (англ., необязательно)<textarea name="messageEn" rows="3" maxlength="800"></textarea></label>
        </div>
        <button type="submit">Сохранить</button>
      </form>
      <p class="muted" id="supStats"></p>
      <p class="error" id="supError"></p>
      <p class="ok" id="supOk"></p>
    </section>
    <section class="card">
      <h2>👋 Приветствие и описание бота</h2>
      <p class="muted">Описание Telegram показывает в пустом чате <b>до</b> кнопки «Старт» (картинку к нему ставят в @BotFather → Edit Bot → Edit Description Picture). Короткое описание — в профиле бота и при пересылке ссылки на него.</p>
      <form id="welcomeForm">
        <label class="check"><input type="checkbox" name="onStart"> Присылать приветственный текст после «Старт» (с кнопками «Відкрити miniApp» и смены языка)</label>
        <p class="muted">Выключено — после «Старт» бот молчит, у человека внизу только кнопка YABOT. Выключить можно, только когда Mini App включена; иначе приветствие приходит всегда.</p>
        <div class="grid2">
          <label>Описание (укр., до 512)<textarea name="description" rows="8" maxlength="512"></textarea></label>
          <label>Описание (англ., до 512)<textarea name="descriptionEn" rows="8" maxlength="512"></textarea></label>
          <label>Короткое (укр., до 120)<input name="short" maxlength="120"></label>
          <label>Короткое (англ., до 120)<input name="shortEn" maxlength="120"></label>
        </div>
        <div class="actions">
          <button type="submit">Сохранить</button>
          <button type="button" class="ghost" id="welcomeApply">Сохранить и применить в Telegram</button>
        </div>
      </form>
      <p class="muted" id="welcomeStatus"></p>
      <p class="error" id="welcomeError"></p>
      <p class="ok" id="welcomeOk"></p>
    </section>
    <section class="card">
      <h2>🧩 Услуги Mini App</h2>
      <p class="muted">Каталог в Mini App: какие услуги показывать и цена «від …» на карточке (в гривнах; 0 — без цены). Заявки на ботов и персонажей приходят как обычные заявки: карточка, PDF, смета, оплата, эскизы.</p>
      <div id="svcList"></div>
      <button type="button" id="svcSave">Сохранить</button>
      <p class="error" id="svcError"></p>
      <p class="ok" id="svcOk"></p>
    </section>
    <section class="card">
      <h2>📱 Mini App</h2>
      <p class="muted">Приложение внутри Telegram: витрина работ, бриф одной формой, «Мои заказы» со сметой, эскизами и оплатой. Открывается кнопкой слева от поля ввода в чате бота. Нужен публичный адрес https:// — на сервере его отдаёт Caddy (см. README, раздел «Mini App»).</p>
      <form id="miniForm">
        <label class="check"><input type="checkbox" name="enabled"> <b>Включить Mini App</b></label>
        <div class="grid2">
          <label>Адрес<input name="url" placeholder="https://app.yabotua.com" spellcheck="false" autocomplete="off"></label>
          <label>Текст кнопки в чате<input name="menuText" maxlength="30" placeholder="YABOT"></label>
        </div>
        <div class="grid2">
          <label>Порт (пусто — автоматически)<input name="port" type="number" min="1024" max="65535"></label>
          <label>@username для «Написати нам» на главной<input name="support" placeholder="yabotdfh" spellcheck="false" autocomplete="off"></label>
        </div>
        <p class="muted">Кнопка «Написати нам» в блоке «Потрібна допомога?» открывает чат с этим аккаунтом в Telegram. Пусто — открывается «Поставити питання» в приложении (вопрос придёт вам через бота).</p>
        <button type="submit">Сохранить</button>
      </form>
      <p class="muted" id="miniStatus"></p>
      <h3>🎉 Баннер акции на главной</h3>
      <p class="muted">Яркий блок над «Мої проєкти»: заголовок, текст, промокод (копируется нажатием, сам подставляется в заявку) и кнопка «Замовити». После даты «до» баннер скрывается сам. Клиент может закрыть его крестиком — новый или изменённый баннер покажется снова.</p>
      <form id="bannerForm">
        <label class="check"><input type="checkbox" name="enabled"> <b>Показывать баннер</b></label>
        <div class="grid2">
          <label>Заголовок (укр.)<input name="title" maxlength="60" placeholder="−15% на стікерпаки до кінця жовтня"></label>
          <label>Заголовок (англ.)<input name="titleEn" maxlength="60" placeholder="−15% on sticker packs till the end of October"></label>
        </div>
        <div class="grid2">
          <label>Текст (укр.)<textarea name="text" rows="2" maxlength="200" placeholder="Встигніть замовити пак для своєї команди"></textarea></label>
          <label>Текст (англ.)<textarea name="textEn" rows="2" maxlength="200"></textarea></label>
        </div>
        <div class="grid2">
          <label>Промокод (необязательно)<input name="promo" maxlength="30" placeholder="OCTOBER15" spellcheck="false" autocomplete="off"></label>
          <label>Показывать до (включительно)<input name="until" type="date"></label>
        </div>
        <button type="submit">Сохранить баннер</button>
      </form>
      <p class="error" id="bannerError"></p>
      <p class="ok" id="bannerOk"></p>
      <h3>⏱ Срок старта в заявке</h3>
      <p class="muted">На последнем шаге заявки клиент видит, когда вы примерно начнёте: «Зараз у черзі 4 проєкти — почнемо приблизно за 5 днів». Автоматически — из числа открытых заявок; вручную — вы сами пишете число дней.</p>
      <form id="queueForm">
        <div class="grid2">
          <label>Показывать<select name="mode"><option value="off">Не показывать</option><option value="auto">Считать автоматически</option><option value="manual">Задать вручную</option></select></label>
          <label class="q-manual">Начнём примерно через, дней (0 — «найближчими днями»)<input type="number" name="days" min="0" max="180"></label>
        </div>
        <div class="grid2 q-auto">
          <label>Сколько проектов ведёте одновременно<input type="number" name="parallel" min="1" max="50"></label>
          <label>Сколько дней в среднем длится проект<input type="number" name="avgDays" min="1" max="180"></label>
        </div>
        <button type="submit">Сохранить</button>
      </form>
      <p class="muted" id="queueNow"></p>
      <p class="error" id="queueError"></p>
      <p class="ok" id="queueOk"></p>
      <h3>Воронка за 30 дней</h3>
      <div id="miniFunnel" class="funnel"></div>
      <p class="muted">Уникальные люди: сколько открыли Mini App, начали заявку и дошли до каждого шага. Видно, на каком шаге теряются клиенты.</p>
      <h3>По источникам за 30 дней</h3>
      <div id="miniSources"></div>
      <p class="muted" id="miniSourcesHint"></p>
      <p class="error" id="miniError"></p>
      <p class="ok" id="miniOk"></p>
    </section>
    <section class="card">
      <h2>❓ Частые вопросы</h2>
      <p class="muted">Кнопка «❓ Питання» в меню бота. Если человек без заявки пишет боту вопрос, бот ищет похожий здесь (по словам вопроса и ключевым словам) и отвечает сам. Не нашёл — пересылает вопрос вам: ответьте «Ответить» на это сообщение, и бот передаст ответ. До 20 вопросов, английский перевод — по желанию.</p>
      <div id="faqList"></div>
      <div class="actions">
        <button type="button" class="ghost" id="faqAdd">+ Вопрос</button>
        <button type="button" id="faqSave">Сохранить</button>
      </div>
      <p class="muted" id="faqStats"></p>
      <p class="error" id="faqError"></p>
      <p class="ok" id="faqOk"></p>
    </section>
    <section class="card">
      <h2>🎁 Подарочные сертификаты</h2>
      <p class="muted">Клиент нажимает «🎁 Подарунковий сертифікат» (в «💰 Вартість» или командой /gift), выбирает сумму и платит через monobank. Бот присылает ему PDF-открытку с кодом и ссылкой для подарка. Получатель открывает ссылку — сумма сертификата засчитывается оплатой его заявки. В «Финансах» деньги учитываются один раз — при продаже сертификата.</p>
      <p class="muted" id="giftNote"></p>
      <form id="giftForm">
        <label class="check"><input type="checkbox" name="enabled"> Продавать сертификаты в боте</label>
        <div class="grid2">
          <label>Суммы через запятую, грн<input name="amounts" placeholder="1500, 3000, 5000"></label>
          <label>Срок действия, дней<input type="number" name="validityDays" min="30" max="730"></label>
        </div>
        <button type="submit">Сохранить</button>
      </form>
      <h3>Выпустить вручную</h3>
      <form id="giftIssueForm" class="row">
        <input name="amount" type="number" min="100" placeholder="Сумма, грн" required>
        <input name="from" maxlength="40" placeholder="От кого (на открытке, необязательно)">
        <label class="check"><input type="checkbox" name="paid" checked> Деньги получены</label>
        <button type="submit">Выпустить</button>
      </form>
      <p class="error" id="giftError"></p>
      <p class="ok" id="giftOk"></p>
      <div id="giftList"></div>
    </section>
    <section class="card">
      <h2>🧾 Реквизиты для документов</h2>
      <p class="muted">Нужны для счёта на оплату и акта выполненных работ (карточка заявки → «📄 Счёт и акт»).</p>
      <form id="companyForm">
        <div class="grid2">
          <label>Исполнитель (ФОП / компания)<input name="name" maxlength="150" placeholder="ФОП Прізвище Ім'я"></label>
          <label>Код ЄДРПОУ / ІПН<input name="code" maxlength="20"></label>
        </div>
        <div class="grid2">
          <label>IBAN<input name="iban" maxlength="40" placeholder="UA…" spellcheck="false"></label>
          <label>Банк<input name="bank" maxlength="100"></label>
        </div>
        <div class="grid2">
          <label>Адрес<input name="address" maxlength="200"></label>
          <label>Подписант<input name="signer" maxlength="100" placeholder="Ім'я Прізвище"></label>
        </div>
        <div class="grid2">
          <label>Телефон<input name="phone" maxlength="40"></label>
          <label>Email<input name="email" maxlength="80"></label>
        </div>
        <label class="check"><input type="checkbox" name="clientDocs"> <b>Клиенты сами скачивают счёт и акт в Mini App</b> — в заказе блок «Документи»: клиент вносит реквизиты своей компании и скачивает счёт (а после «Готово» — акт). Нужны заполненные реквизиты выше и цена заявки.</label>
        <label class="check"><input type="checkbox" name="vat"> Плательщик НДС (в документах выделяется НДС 20%)</label>
        <button type="submit">Сохранить</button>
      </form>
      <p class="error" id="companyError"></p>
      <p class="ok" id="companyOk"></p>
    </section>
    <section class="card">
      <h2>✅ Этапы работы (чек-лист)</h2>
      <p class="muted">Одинаковый список для каждой заявки — отмечается в карточке заявки (вами и дизайнером), прогресс виден на доске. По одному этапу в строке, до 12.</p>
      <form id="checklistForm">
        <textarea name="steps" rows="6"></textarea>
        <div class="actions"><button type="submit">Сохранить</button><button type="button" class="ghost" id="checklistReset">Вернуть стандартные</button></div>
      </form>
      <p class="error" id="checklistError"></p>
      <p class="ok" id="checklistOk"></p>
    </section>
    <section class="card">
      <h2>🔐 Вход с кодом из Telegram</h2>
      <p class="muted">После пароля бот присылает шестизначный код в Telegram: вам — на получателя заявок, дизайнеру — на его Telegram ID. Даже если пароль узнают, без вашего Telegram войти не получится. Если бот в момент входа без связи, код печатается в журнале бота в панели.</p>
      <form id="secForm" class="row">
        <label class="check"><input type="checkbox" name="twoFactor"> Включить вход с кодом</label>
        <button type="submit">Сохранить</button>
      </form>
      <p class="error" id="secError"></p>
      <p class="ok" id="secOk"></p>
    </section>
    <section class="card">
      <h2>🗄 Архив заявок</h2>
      <p class="muted">Закрытые заявки (готово, отклонено, отменено) старше выбранного срока переносятся в отдельный файл архива: переписка, история и эскизы уходят туда, а в рабочем файле остаётся главное. Финансы, клиенты, «Мої замовлення» и «Доповнити пак» работают как раньше; архивную заявку можно открыть и посмотреть целиком. Так бот не замедляется со временем. Перенос — раз в сутки.</p>
      <form id="archiveForm">
        <div class="row">
          <label class="check"><input type="checkbox" name="enabled"> Переносить автоматически</label>
          <label>Старше<select name="days"><option value="90">3 месяцев</option><option value="180">6 месяцев</option><option value="365">года</option><option value="730">2 лет</option></select></label>
        </div>
        <div class="actions"><button type="submit">Сохранить</button><button type="button" class="ghost" id="archiveNow">Перенести сейчас</button><a class="btn ghost" href="/api/backups/download?name=archive">⬇ Скачать архив</a></div>
      </form>
      <p class="muted" id="archiveInfo"></p>
      <p class="error" id="archiveError"></p>
      <p class="ok" id="archiveOk"></p>
    </section>
    <section class="card">
      <h2>💾 Резервные копии</h2>
      <p class="muted">Скачайте полную копию данных бота (заявки, клиенты, переписка, настройки) себе на компьютер. Файл содержит токены и пароли в зашифрованном виде — храните его в надёжном месте. Медиа шаблонов постов в копию не входят. Бот и сам делает ежедневную копию на сервере (14 дней).</p>
      <div class="actions"><a class="btn" href="/api/backups/download?name=current">⬇ Скачать копию сейчас</a></div>
      <h3>📨 Копия в Telegram</h3>
      <p class="muted">Бот сам присылает вам в личку файл с данными: заявки, клиенты, переписка, настройки и архив заявок. Токенов и паролей в нём нет — при восстановлении они остаются текущими. Если с сервером что-то случится, поставьте бота заново и восстановите последний файл (ниже, «Восстановить из копии»). Приходит днём, без звука.</p>
      <form id="tgBackupForm">
        <div class="grid2">
          <label class="check"><input type="checkbox" name="enabled"> Присылать копию в Telegram</label>
          <label>Как часто<select name="every"><option value="week">Раз в неделю</option><option value="day">Каждый день</option></select></label>
        </div>
        <div class="actions"><button type="submit">Сохранить</button><button type="button" class="ghost" id="tgBackupSend">📨 Отправить копию сейчас</button></div>
      </form>
      <p class="muted" id="tgBackupInfo"></p>
      <p class="error" id="tgBackupError"></p>
      <p class="ok" id="tgBackupOk"></p>
      <h3>Копии на сервере</h3>
      <div id="backupList"></div>
      <h3>Восстановить из копии</h3>
      <form id="restoreForm">
        <div class="grid2">
          <label>Файл копии (.json)<input type="file" name="file" accept=".json,application/json"></label>
          <label>Пароль страницы<input name="password" type="password" required autocomplete="current-password"></label>
        </div>
        <button type="submit" class="danger-btn">Восстановить</button>
      </form>
      <p class="muted">Токен бота, пароль и получатель заявок останутся текущими. Перед восстановлением бот сохранит копию нынешних данных.</p>
      <p class="error" id="restoreError"></p>
      <p class="ok" id="restoreOk"></p>
    </section>
    <section class="card">
      <h2>Реферальная программа «Приведи друга»</h2>
      <p class="muted">У каждого клиента своя ссылка (команда /invite и кнопка в «Мої замовлення»). Когда приглашённый оформит первый заказ, скидка положена обоим: другу — на этот заказ, пригласившему — бонус на следующий. Бот предупредит обоих, а в карточке заявки появится «🎁». Скидку вы учитываете в цене сами; бонусы списываются кнопкой в карточке заявки.</p>
      <form id="refForm" class="row">
        <label class="check"><input type="checkbox" name="enabled"> Включить</label>
        <label>Скидка, %<input type="number" name="percent" min="1" max="90" required></label>
        <button type="submit">Сохранить</button>
      </form>
      <p class="muted" id="refStats"></p>
      <p class="error" id="refError"></p>
      <p class="ok" id="refOk"></p>
    </section>
    <section class="card">
      <h2>Рабочие часы и автоответ</h2>
      <p class="muted">Вне рабочего времени (по Киеву) бот сразу отвечает клиенту, когда вы на связи — на новую заявку и на сообщения дизайнеру. Не чаще раза в 12 часов одному человеку. Бриф и каталог работают как обычно.</p>
      <p id="whNow"></p>
      <form id="whForm">
        <label class="check"><input type="checkbox" name="enabled"> Включить автоответ в нерабочее время</label>
        <div class="days" id="whDays"></div>
        <div class="grid2">
          <label>Начало рабочего дня<input type="time" name="from" required></label>
          <label>Конец рабочего дня<input type="time" name="to" required></label>
        </div>
        <label>Текст автоответа (пусто — бот составит сам из часов)<textarea name="message" rows="3" maxlength="1000"></textarea></label>
        <p class="muted">Клиент увидит: <span id="whPreview"></span></p>
        <button type="submit">Сохранить</button>
      </form>
      <p class="error" id="whError"></p>
      <p class="ok" id="whOk"></p>
    </section>
    <div class="grid2">
      <section class="card">
        <h2>Состояние бота</h2>
        <div id="systemInfo"></div>
      </section>
      <section class="card">
        <h2>Сменить пароль</h2>
        <form id="passwordForm" class="stack">
          <input name="current" type="password" placeholder="Текущий пароль" required autocomplete="current-password">
          <input name="next" type="password" placeholder="Новый пароль (минимум 8)" minlength="8" required autocomplete="new-password">
          <button type="submit">Сменить</button>
        </form>
        <p class="error" id="passwordError"></p>
        <p class="ok" id="passwordOk"></p>
      </section>
    </div>
    <section class="card">
      <div class="card-head"><h2>Ошибки</h2><button type="button" class="small ghost" id="clearErrors">Очистить список</button></div>
      <div id="errorsList"></div>
    </section>
    <section class="card danger">
      <h2>Опасная зона: очистка истории заказов</h2>
      <p id="historyInfo"></p>
      <p class="muted">Удаляются все заявки и переписка по ним, нумерация начнётся заново с <b>#0001</b>. Каталог, цены, настройки и пароль не меняются. Перед очисткой бот сохраняет полную копию данных в резервные копии (её можно восстановить из панели). Кнопки на старых карточках в Telegram перестанут работать.</p>
      <form id="historyForm">
        <label class="check"><input type="checkbox" name="stats" checked> Обнулить статистику (график, воронку, напоминания)</label>
        <label class="check"><input type="checkbox" name="drafts" checked> Удалить незаконченные брифы</label>
        <label class="check"><input type="checkbox" name="clients"> Удалить список клиентов и метки источников</label>
        <div class="grid2">
          <label>Пароль страницы<input name="password" type="password" required autocomplete="current-password"></label>
          <label>Для подтверждения введите УДАЛИТЬ<input name="confirm" required autocomplete="off"></label>
        </div>
        <button type="submit" class="danger-btn">Очистить историю заказов</button>
      </form>
      <p class="error" id="historyError"></p>
      <p class="ok" id="historyOk"></p>
    </section>
  </section>
</main>
</body>
</html>`;

export const PAGE_CSS = `
:root { --ink:#141414; --accent:#f94400; --muted:#7d7d7d; --line:#ececec; --bg:#f5f5f5; --card:#fff;
  --ok:#2e7d32; --bad:#c62828; --warn:#ef8f00; --soft:#fff4ec; }
* { box-sizing: border-box; }
body { margin:0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color:var(--ink); background:var(--bg); font-size:15px; }
a { color:inherit; }
.top { display:flex; align-items:center; gap:16px; padding:12px 20px; background:#fff; }
.logo { height:52px; }
.top-text { flex:1; min-width:0; }
.title { font-weight:700; font-size:18px; }
.sub { color:var(--muted); font-size:14px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.pill { display:inline-block; padding:2px 10px; border-radius:20px; font-size:12px; font-weight:600; background:#eee; color:var(--ink); }
.pill.ok { background:#e7f4e8; color:var(--ok); } .pill.bad { background:#fdecea; color:var(--bad); } .pill.warn { background:#fff3e0; color:#b26a00; }
.tabs { display:flex; gap:4px; padding:0 16px; background:#fff; border-bottom:3px solid var(--ink); overflow-x:auto; position:sticky; top:0; z-index:5; }
.tabs a { padding:12px 14px; text-decoration:none; color:var(--muted); font-weight:600; white-space:nowrap; border-bottom:3px solid transparent; margin-bottom:-3px; }
.tabs a:hover { color:var(--ink); }
.tabs a.active { color:var(--ink); border-bottom-color:var(--accent); }
.badge { display:inline-block; min-width:20px; padding:1px 6px; border-radius:10px; background:var(--accent); color:#fff; font-size:12px; text-align:center; }
.muted-badge { background:#ddd; color:var(--ink); }
main { max-width:1100px; margin:20px auto; padding:0 16px 48px; }
.card { background:var(--card); border-radius:14px; padding:18px 20px; margin-bottom:16px; box-shadow:0 1px 3px rgba(0,0,0,.06); min-width:0; }
.card.flush { padding:0; overflow:hidden; }
.card.narrow { max-width:560px; margin:24px auto; }
.card-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.grid2 > .card { margin-bottom:16px; }
h1 { margin:0 0 8px; font-size:22px; }
h2 { margin:0 0 8px; font-size:17px; }
h3 { margin:16px 0 6px; font-size:14px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }
label { display:block; font-size:14px; font-weight:600; margin:14px 0 0; }
input, textarea, select { display:block; width:100%; margin-top:6px; padding:10px 12px; font:inherit; font-size:15px; border:1px solid #d2d2d2; border-radius:10px; background:#fff; }
textarea { resize:vertical; }
input:focus, textarea:focus, select:focus { outline:2px solid var(--accent); border-color:transparent; }
button { margin-top:14px; padding:10px 18px; font:inherit; font-size:15px; font-weight:600; color:#fff; background:var(--ink); border:0; border-radius:10px; cursor:pointer; }
button:hover { background:var(--accent); }
button:disabled { opacity:.5; cursor:default; }
button.link { margin:0; background:none; color:var(--muted); padding:6px 8px; }
button.link:hover { color:var(--accent); }
button.small { margin:0; padding:7px 12px; font-size:13px; }
button.ghost { background:#efefef; color:var(--ink); }
button.ghost:hover { background:var(--accent); color:#fff; }
button.danger:hover { background:var(--bad); }
button.danger-btn { background:var(--bad); }
button.danger-btn:hover { background:#8e1b1b; }
.row { display:flex; gap:10px; align-items:flex-end; }
.row input { flex:1; }
.row button { margin-top:6px; white-space:nowrap; }
.stack input, .stack textarea { margin-top:10px; }
.muted { color:var(--muted); font-size:13px; margin:6px 0 0; }
.error { color:var(--bad); font-size:14px; margin:10px 0 0; }
.error:empty, .ok:empty { display:none; }
.ok { color:var(--ok); font-size:14px; margin:8px 0 0; }
.hidden { display:none !important; }
.loading { color:var(--muted); }
/* KPI */
.stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px,1fr)); gap:12px; margin-bottom:16px; }
.stat { background:#fff; border-radius:14px; padding:14px 16px; box-shadow:0 1px 3px rgba(0,0,0,.06); text-decoration:none; display:block; }
a.stat:hover { outline:2px solid var(--accent); }
.stat b { display:block; font-size:26px; line-height:1.2; }
.stat span { color:var(--muted); font-size:13px; }
.stat small { display:block; color:var(--muted); font-size:12px; margin-top:2px; }
.stat.accent b { color:var(--accent); }
/* Сповіщення */
.alert { display:block; line-height:1.6; padding:12px 14px; border-radius:12px; margin-bottom:10px; background:var(--soft); border-left:4px solid var(--accent); font-size:14px; }
.alert.bad { background:#fdecea; border-color:var(--bad); }
.alert.info { background:#eef4ff; border-color:#4a6cf7; }
.alert a { font-weight:600; }
/* Таблиці */
.table-wrap { overflow-x:auto; }
table { width:100%; border-collapse:collapse; font-size:14px; }
th, td { text-align:left; padding:10px 12px; border-bottom:1px solid var(--line); vertical-align:top; }
th { color:var(--muted); font-weight:600; font-size:12px; text-transform:uppercase; letter-spacing:.04em; background:#fafafa; }
tr.click { cursor:pointer; }
tr.click:hover td { background:#fff8f3; }
td small, .small-muted { color:var(--muted); font-size:12px; }
tbody tr:last-child td { border-bottom:0; }
.empty { padding:18px 20px; color:var(--muted); }
.status { display:inline-block; padding:2px 10px; border-radius:20px; font-size:12px; font-weight:600; white-space:nowrap; }
.status.new { background:#fff0e8; color:var(--accent); } .status.in_progress { background:#eef4ff; color:#2f4fd8; }
.status.done { background:#e7f4e8; color:var(--ok); } .status.rejected { background:#f1f1f1; color:var(--muted); }
.tag { display:inline-block; padding:1px 8px; border-radius:6px; background:#f1f1f1; font-size:12px; }
/* Тулбар і фільтри */
.toolbar { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:12px; }
.toolbar input[type=search] { flex:1; min-width:220px; margin:0; }
.chips { display:flex; gap:6px; flex-wrap:wrap; }
.chips button, .chip { margin:0; padding:7px 12px; font-size:13px; background:#fff; color:var(--ink); border:1px solid #ddd; border-radius:20px; }
.chips button.active { background:var(--ink); color:#fff; border-color:var(--ink); }
.chips button:hover { border-color:var(--accent); background:#fff; color:var(--ink); }
.chips button.active:hover { background:var(--ink); color:#fff; }
#clientFilter { margin-bottom:12px; }
/* Графік і воронка */
.legend { display:flex; gap:12px; flex-wrap:wrap; align-items:center; font-size:12px; color:var(--muted); margin-bottom:8px; }
.sw { display:inline-block; width:10px; height:10px; border-radius:3px; margin-right:-6px; }
.sw-users { background:#cfcfcf; } .sw-starts { background:#ffc4a8; } .sw-orders { background:var(--accent); }
#chart svg { width:100%; height:auto; display:block; }
.fun { display:grid; grid-template-columns:170px 1fr 70px; gap:8px; align-items:center; font-size:13px; margin:6px 0; }
.fun .bar { height:14px; background:#f1f1f1; border-radius:7px; overflow:hidden; }
.fun .bar i { display:block; height:100%; background:var(--accent); border-radius:7px; }
.fun .val { text-align:right; color:var(--muted); }
/* Картка заявки */
.detail-head { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:12px; }
.detail-head h1 { margin:0; }
.kv { display:grid; grid-template-columns:170px 1fr; gap:6px 14px; font-size:14px; }
.kv dt { color:var(--muted); }
.kv dd { margin:0; white-space:pre-wrap; word-break:break-word; }
.actions { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.actions button, .actions a.btn { margin:0; }
a.btn { display:inline-block; padding:10px 18px; border-radius:10px; background:var(--ink); color:#fff; text-decoration:none; font-weight:600; }
a.btn:hover { background:var(--accent); }
.check { display:flex; gap:8px; align-items:center; font-weight:400; margin:10px 0 0; }
.check input { width:auto; margin:0; }
.timeline { list-style:none; padding:0; margin:0; font-size:14px; }
.timeline li { padding:6px 0 6px 16px; border-left:2px solid var(--line); position:relative; }
.timeline li::before { content:""; position:absolute; left:-6px; top:11px; width:10px; height:10px; border-radius:50%; background:var(--accent); }
.msg { background:#f7f7f7; border-radius:10px; padding:10px 12px; margin:8px 0; font-size:14px; white-space:pre-wrap; word-break:break-word; max-width:88%; }
.msg small { display:block; color:var(--muted); margin-bottom:4px; }
.msg.from-client { background:#f2f2f2; margin-right:auto; }
.msg.from-studio { background:var(--soft); margin-left:auto; }
.thread { display:flex; flex-direction:column; max-height:420px; overflow-y:auto; margin:10px 0; }
.chat-badge { background:#2f4fd8; margin-left:4px; }
/* Канал: редактор і предпросмотр */
.mt { margin-top:22px; }
.pay-card { border:2px solid #ffe2d3; }
.pay-toggle { font-size:16px; padding:10px 12px; background:var(--soft); border-radius:10px; }
.pay-row { display:flex; gap:10px; align-items:baseline; flex-wrap:wrap; padding:8px 0; border-top:1px solid var(--line); }
.pay-row:first-child { border-top:0; }
.ai-box { background:var(--soft); border:1px solid #ffd9c4; border-radius:12px; padding:10px 12px; margin:0 0 12px; }
.ai-head { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.ai-head button { margin:0; }
.ai-panel { margin-top:10px; }
.ai-panel .row label { flex:1; min-width:140px; }
.qr-item { border-top:1px solid var(--line); padding:10px 0; }
.qr-item:first-child { border-top:0; }
.qr-head { display:flex; gap:8px; align-items:center; }
.qr-head input { flex:1; margin:0; }
.qr-head button { margin:0; }
.qr-item textarea { margin-top:6px; }
.qr-chips { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin:8px 0 6px; }
.qr-chips .chip { cursor:pointer; }
.post-stats { display:flex; flex-wrap:wrap; gap:4px 14px; margin-top:4px; font-size:13px; }
.pay-row.voided b { text-decoration:line-through; color:var(--muted); }
.pay-form { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:10px; }
.pay-form input { width:160px; margin:0; }
.pay-form button { margin:0; }
.tpl-bar { display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-top:12px; padding:8px; background:#fafafa; border:1px solid var(--line); border-radius:10px; }
.tpl-bar select { width:auto; min-width:220px; flex:1; margin:0; padding:7px 10px; font-size:14px; }
.tpl-bar button { margin:0; }
.tpl-item { display:flex; gap:10px; align-items:center; padding:10px 0; border-top:1px solid var(--line); flex-wrap:wrap; }
.tpl-item:first-child { border-top:0; }
.tpl-item .grow { flex:1; min-width:220px; }
.tpl-item .actions { gap:6px; }
.sig-preview { margin-top:10px; padding:8px 12px; background:#f6f6f6; border-radius:10px; }
.sig-builder { padding:14px 16px; background:#fafafa; border:1px solid var(--line); border-radius:12px; }
.sig-links { display:grid; gap:8px; margin-top:12px; }
.sig-link { display:grid; grid-template-columns:160px 1fr; gap:8px; }
.sig-link input { margin:0; }
.sig-row { display:flex; gap:8px 14px; align-items:center; flex-wrap:wrap; margin-top:12px; }
.sig-row select { width:auto; margin:0; }
.sig-row .check { margin:0; }
.sig-cap { font-size:14px; font-weight:600; }
.sep { display:inline-flex; gap:4px; align-items:center; margin:0; font-weight:400; font-size:15px; }
.sep input[type=radio] { width:auto; margin:0; }
.sep-custom { width:56px !important; display:inline-block !important; margin:0 !important; padding:4px 6px !important; }
@media (max-width:600px) { .sig-link { grid-template-columns:1fr; } }
.sig-preview .tg-text { padding:4px 0 0; }
code { font-family:ui-monospace, Consolas, monospace; background:#f1f1f1; padding:0 4px; border-radius:4px; font-size:.92em; }
.ch-layout { display:grid; grid-template-columns:minmax(0,1fr) 380px; gap:16px; align-items:start; }
.ch-sticky { position:sticky; top:64px; }
.ch-toolbar { display:flex; gap:4px; flex-wrap:wrap; margin-top:14px; padding:6px; background:#f3f3f3; border-radius:10px 10px 0 0; border:1px solid #d2d2d2; border-bottom:0; }
.ch-toolbar button { margin:0; padding:6px 10px; min-width:36px; font-size:14px; background:#fff; color:var(--ink); border:1px solid #e0e0e0; border-radius:7px; }
.ch-toolbar button:hover { background:var(--accent); color:#fff; border-color:var(--accent); }
.ch-editor { min-height:170px; max-height:420px; overflow-y:auto; padding:12px 14px; border:1px solid #d2d2d2; border-radius:0 0 10px 10px; background:#fff; font-size:15px; line-height:1.5; white-space:pre-wrap; word-break:break-word; outline:none; }
.ch-editor:focus { border-color:var(--accent); box-shadow:0 0 0 2px rgba(249,68,0,.15); }
.ch-editor:empty::before { content:attr(data-placeholder); color:#aaa; }
.ch-editor blockquote, .tg-text blockquote { margin:4px 0; padding:2px 0 2px 10px; border-left:3px solid var(--accent); }
.ch-editor code, .tg-text code { font-family:ui-monospace, Consolas, monospace; background:#f1f1f1; padding:0 4px; border-radius:4px; font-size:.92em; }
.ch-editor .spoiler { background:#d9d9d9; border-radius:4px; }
.ch-drop { display:flex; gap:10px; align-items:center; flex-wrap:wrap; padding:12px; border:2px dashed #d6d6d6; border-radius:10px; }
.ch-drop.over { border-color:var(--accent); background:var(--soft); }
.ch-thumbs { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
.ch-thumb { position:relative; width:86px; height:86px; border-radius:10px; background:#f3f3f3; overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:12px; text-align:center; padding:4px; }
.ch-thumb img, .ch-thumb video { width:100%; height:100%; object-fit:cover; position:absolute; inset:0; }
.ch-thumb button { position:absolute; top:3px; right:3px; margin:0; padding:0 6px; font-size:13px; line-height:20px; border-radius:10px; background:rgba(0,0,0,.6); }
.ch-thumb .busy { position:absolute; inset:0; background:rgba(255,255,255,.7); display:flex; align-items:center; justify-content:center; }
.ch-btn-row { display:grid; grid-template-columns:1fr 1.4fr auto auto; gap:6px; align-items:center; margin-bottom:6px; }
.ch-btn-row input { margin:0; padding:8px 10px; font-size:14px; }
.ch-btn-row label { margin:0; font-weight:400; font-size:12px; white-space:nowrap; display:flex; gap:4px; align-items:center; }
.ch-btn-row label input { width:auto; }
.ch-btn-row button { margin:0; padding:6px 10px; }
.ch-options { display:flex; gap:6px 18px; flex-wrap:wrap; }
.ch-options .check { margin:4px 0; }
.ch-send { margin-top:16px; }
.ch-send button { margin:0; }
.ch-item { display:flex; gap:10px; align-items:center; padding:10px 0; border-top:1px solid var(--line); flex-wrap:wrap; }
.ch-item:first-child { border-top:0; }
.ch-item .grow { flex:1; min-width:200px; }
/* Telegram-подібний предпросмотр */
.tg-chat { background:#cfe0c3 linear-gradient(135deg,#d5e6c6,#b9d3a8); border-radius:14px; padding:12px 10px 14px; min-height:200px; }
.tg-head { display:flex; gap:10px; align-items:center; background:rgba(255,255,255,.85); border-radius:10px; padding:8px 10px; margin-bottom:12px; }
.tg-ava { width:36px; height:36px; border-radius:50%; background:var(--ink); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; }
.tg-head small { display:block; color:var(--muted); font-size:12px; }
.tg-msg { background:#fff; border-radius:14px 14px 14px 4px; max-width:100%; overflow:hidden; box-shadow:0 1px 1px rgba(0,0,0,.12); margin-bottom:6px; }
.tg-media { display:grid; gap:2px; }
.tg-media.n1 { grid-template-columns:1fr; } .tg-media.n2, .tg-media.n4 { grid-template-columns:1fr 1fr; } .tg-media.many { grid-template-columns:1fr 1fr 1fr; }
.tg-media img, .tg-media video { width:100%; height:100%; max-height:300px; object-fit:cover; display:block; background:#eee; }
.tg-media.n1 img, .tg-media.n1 video { max-height:360px; object-fit:contain; background:#f4f4f4; }
.tg-file { display:flex; gap:10px; align-items:center; padding:10px 12px; font-size:14px; }
.tg-file b { display:inline-flex; width:40px; height:40px; border-radius:50%; background:var(--accent); color:#fff; align-items:center; justify-content:center; }
.tg-text { padding:8px 12px 2px; font-size:14.5px; line-height:1.45; white-space:pre-wrap; word-break:break-word; }
.tg-text a { color:#2a7bd3; text-decoration:none; }
.tg-text .spoiler { background:#c9c9c9; color:transparent; border-radius:4px; cursor:pointer; transition:.2s; }
.tg-text .spoiler.shown { background:#eee; color:inherit; }
.tg-meta { text-align:right; font-size:11px; color:#9aa; padding:2px 10px 6px; }
.tg-buttons { display:flex; flex-direction:column; gap:4px; }
.tg-buttons div { display:flex; gap:4px; }
.tg-buttons span { flex:1; text-align:center; background:rgba(255,255,255,.75); color:#2a7bd3; border-radius:10px; padding:8px 6px; font-size:13.5px; font-weight:600; }
.tg-empty { color:#567; font-size:14px; text-align:center; padding:40px 10px; }
@media (max-width:900px) { .ch-layout { grid-template-columns:1fr; } .ch-sticky { position:static; } .ch-btn-row { grid-template-columns:1fr 1fr; } }
.review { border-top:1px solid var(--line); padding:12px 0; }
.review:first-child { border-top:0; }
.review.low .stars { color:var(--bad); }
.review-head { display:flex; gap:10px; align-items:baseline; flex-wrap:wrap; }
.review p { margin:6px 0; }
.stars { color:#f5a300; font-size:18px; letter-spacing:1px; }
.days { display:flex; gap:14px; flex-wrap:wrap; margin:8px 0 4px; }
.days .day { margin:0; font-weight:600; }
select { cursor:pointer; }
.sketch-tag { margin-left:4px; }
.sketch-round { border-top:1px solid var(--line); padding:12px 0; }
.sketch-round:first-of-type { border-top:0; }
.sketch-head { display:flex; gap:10px; align-items:baseline; flex-wrap:wrap; }
.sketch-status { font-size:13px; font-weight:600; }
.sketch-status.pending { color:#b26a00; } .sketch-status.approved { color:var(--ok); } .sketch-status.changes { color:var(--accent); }
.thumbs { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
.thumbs img { width:120px; height:120px; object-fit:contain; background:#f5f5f5; border-radius:10px; display:block; }
.thumb-file { display:inline-flex; align-items:center; padding:8px 12px; background:#f5f5f5; border-radius:10px; font-size:13px; }
.danger { border:2px solid #f3c7c3; }
.danger h2 { color:var(--bad); }
.danger .check { margin-top:6px; }
.progress { height:6px; background:#eee; border-radius:3px; overflow:hidden; margin-top:4px; width:120px; }
.progress i { display:block; height:100%; background:var(--accent); }
/* Каталог і ціни */
.prices th { text-transform:none; letter-spacing:0; font-size:13px; color:var(--ink); background:none; }
.prices thead th { color:var(--muted); }
.prices input { margin-top:0; padding:8px 10px; font-size:14px; min-width:110px; }
.linkbox { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin:10px 0; padding:10px 12px; background:var(--soft); border-radius:10px; }
.linkbox code { font-size:14px; word-break:break-all; flex:1; }
.work { border-top:1px solid var(--line); padding:14px 0; }
.work:first-child { border-top:0; }
.work-head { display:flex; gap:10px; align-items:baseline; flex-wrap:wrap; }
.work-head a { font-weight:700; text-decoration:none; }
.work-head a:hover { color:var(--accent); }
.work textarea { margin-top:8px; font-size:14px; }
.work-actions { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
.work-actions button { margin:0; padding:7px 12px; font-size:13px; background:#efefef; color:var(--ink); }
.work-actions button:hover { background:var(--accent); color:#fff; }
.work-actions button.danger:hover { background:var(--bad); }
.err-item { border-top:1px solid var(--line); padding:8px 0; font-size:13px; }
.err-item:first-child { border-top:0; }
.dot { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:6px; }
.dot.ok { background:var(--ok); } .dot.bad { background:var(--bad); } .dot.wait { background:#f9a825; }
@media (max-width:820px) {
  .grid2 { grid-template-columns:1fr; gap:0; }
  .kv { grid-template-columns:1fr; gap:2px; }
  .kv dt { margin-top:8px; }
  .fun { grid-template-columns:120px 1fr 56px; }
  .hide-sm { display:none; }
  .logo { height:42px; }
  .row { flex-direction:column; align-items:stretch; }
}
`;

export const PAGE_JS = `
'use strict';
const $ = (id) => document.getElementById(id);
const STATUS = { new: 'Новая', in_progress: 'В работе', done: 'Готово', rejected: 'Отклонена', cancelled: 'Отменена клиентом' };
const TABS = ['overview', 'orders', 'finance', 'clients', 'drafts', 'reviews', 'broadcast', 'channel', 'catalog', 'prices', 'sources', 'settings'];
const state = { tab: 'overview', orders: [], status: 'all', q: '', userFilter: null, clients: [], openOrder: null, openClient: null, botUsername: null, role: 'owner', designer: '' };

// ---------- утиліти ----------
async function api(path, body) {
  const opts = body === undefined ? {} : {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-yabot': '1' }, body: JSON.stringify(body),
  };
  const res = await fetch(path, { credentials: 'same-origin', ...opts });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/login') { refresh(); throw new Error('Нужно войти заново.'); }
  if (!res.ok) throw new Error(data.error || ('Ошибка ' + res.status));
  return data;
}

function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'style') node.style.cssText = v; // через CSSOM — суворий CSP забороняє атрибут style
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

/** replaceChildren без порожніх значень (null/false не перетворюються на текст). */
function fill(node, ...children) {
  node.replaceChildren(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false));
}

const fmt = (iso) => iso ? new Date(iso).toLocaleString('ru-RU', { timeZone: 'Europe/Kyiv', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
function ago(iso) {
  if (!iso) return '—';
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'только что';
  if (s < 3600) return Math.floor(s / 60) + ' мин назад';
  if (s < 86400) return Math.floor(s / 3600) + ' ч назад';
  return Math.floor(s / 86400) + ' дн назад';
}
const no = (id) => '#' + String(id).padStart(4, '0');
const statusTag = (s) => el('span', { class: 'status ' + s }, STATUS[s] || s);
const empty = (text) => el('div', { class: 'empty' }, text);

function show(view) {
  $('loading').classList.add('hidden');
  for (const id of ['setupView', 'loginView']) $(id).classList.toggle('hidden', id !== view);
  const dash = view === 'dash';
  $('tabs').classList.toggle('hidden', !dash);
  $('logoutBtn').classList.toggle('hidden', !dash);
  for (const v of document.querySelectorAll('.view')) v.classList.toggle('hidden', !dash || v.dataset.view !== state.tab);
}

function bindForm(id, handler, errorId, okId) {
  $(id).addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = ev.target.querySelector('button[type=submit]');
    if (errorId) $(errorId).textContent = '';
    if (okId) $(okId).textContent = '';
    if (btn) btn.disabled = true;
    try { await handler(Object.fromEntries(new FormData(ev.target).entries()), ev.target); }
    catch (err) { if (errorId) $(errorId).textContent = err.message; else alert(err.message); }
    finally { if (btn) btn.disabled = false; }
  });
}

function action(label, handler, cls) {
  const b = el('button', { type: 'button', class: cls || '' }, label);
  b.addEventListener('click', async () => {
    b.disabled = true;
    try { await handler(); } catch (err) { alert(err.message); } finally { b.disabled = false; }
  });
  return b;
}

// ---------- навігація ----------
function openTab(tab) {
  if ($('tabs').classList.contains('hidden')) return; // ще не увійшли
  if (!TABS.includes(tab)) tab = TABS[0];
  state.tab = tab;
  for (const a of document.querySelectorAll('.tabs a')) a.classList.toggle('active', a.dataset.tab === tab);
  for (const v of document.querySelectorAll('.view')) v.classList.toggle('hidden', v.dataset.view !== tab);
  loadTab(tab).catch((err) => console.error(err));
}

function routeFromHash() {
  const [tab, arg] = location.hash.slice(1).split('/');
  if (tab === 'orders' && arg) { state.openOrder = Number(arg); }
  else if (tab === 'orders') state.openOrder = null;
  state.openClient = tab === 'clients' && arg ? arg : null;
  if (tab === 'settings' && arg) {
    // Переключення розділу всередині «Настроек» — лише показуємо інші картки, без повторного завантаження ~45 запитів
    const sameView = state.tab === 'settings' && !$('tabs').classList.contains('hidden');
    state.settingsGroup = arg;
    if (sameView) { applySettingsGroup(); window.scrollTo(0, 0); return; }
  }
  openTab(tab || TABS[0]);
}
window.addEventListener('hashchange', routeFromHash);

async function loadTab(tab) {
  if (tab === 'overview') return loadOverview();
  if (tab === 'orders') return state.openOrder ? loadOrderDetail(state.openOrder) : loadOrders();
  if (tab === 'clients') return state.openClient ? loadClientDetail(state.openClient) : loadClients();
  if (tab === 'finance') return loadFinance();
  if (tab === 'drafts') return loadDrafts();
  if (tab === 'reviews') return loadReviews();
  if (tab === 'broadcast') return loadBroadcast();
  if (tab === 'channel') return loadChannel();
  if (tab === 'catalog') return loadCatalog();
  if (tab === 'prices') return loadPrices();
  if (tab === 'sources') return loadSources();
  if (tab === 'settings') return loadSettings();
}

// ---------- шапка ----------
function setHeader(o) {
  $('botName').textContent = o.bot || '';
  const pill = $('statusPill');
  pill.classList.remove('hidden', 'ok', 'bad', 'warn');
  if (!o.active) { pill.textContent = '⏸ приём на паузе'; pill.classList.add('warn'); }
  else if (o.telegram.state === 'ok') { pill.textContent = '● работает'; pill.classList.add('ok'); }
  else if (o.telegram.state === 'error') { pill.textContent = '● нет связи с Telegram'; pill.classList.add('bad'); }
  else { pill.textContent = '● подключается'; pill.classList.add('warn'); }
  const cb = $('badgeChat');
  cb.textContent = '💬 ' + o.unread; cb.classList.toggle('hidden', !o.unread);
  const nb = $('badgeNew');
  nb.textContent = o.counts.new; nb.classList.toggle('hidden', !o.counts.new);
  const db = $('badgeDrafts');
  db.textContent = o.briefs.active; db.classList.toggle('hidden', !o.briefs.active);
}

// ---------- огляд ----------
async function loadOverview() {
  const [o, list] = await Promise.all([api('/api/overview'), api('/api/orders')]);
  setHeader(o);
  state.orders = list.orders;

  const alerts = [];
  const a = o.attention;
  if (a.noRecipient) alerts.push(el('div', { class: 'alert bad' }, '⚠️ Не указан получатель заявок — клиенты отправляют брифы, но они никуда не приходят. ', el('a', { href: '#settings' }, 'Указать ID')));
  if (a.paused) alerts.push(el('div', { class: 'alert' }, '⏸ Приём заказов на паузе — новые брифы не начинаются. ', el('a', { href: '#settings' }, 'Возобновить')));
  if (o.telegram.state === 'error') alerts.push(el('div', { class: 'alert bad' }, '📡 Нет связи с Telegram: ' + (o.telegram.detail || '')));
  if (a.staleNew.length) alerts.push(el('div', { class: 'alert' }, '⏰ Ждут больше суток без ответа: ',
    a.staleNew.map((x, i) => [i ? ', ' : '', el('a', { href: '#orders/' + x.id }, no(x.id) + ' ' + x.client)])));
  if (a.longInProgress.length) alerts.push(el('div', { class: 'alert info' }, '🐢 В работе больше 2 недель: ',
    a.longInProgress.map((x, i) => [i ? ', ' : '', el('a', { href: '#orders/' + x.id }, no(x.id))])));
  if (a.sketchChanges.length) alerts.push(el('div', { class: 'alert' }, '✏️ Клиенты прислали правки к эскизам: ',
    a.sketchChanges.map((x, i) => [i ? ', ' : '', el('a', { href: '#orders/' + x.id }, no(x.id) + ' ' + x.client + ' (v' + x.round + ')')])));
  if (a.sketchWaiting.length) alerts.push(el('div', { class: 'alert info' }, '⏳ Эскизы ждут согласования клиента больше 2 дней: ',
    a.sketchWaiting.map((x, i) => [i ? ', ' : '', el('a', { href: '#orders/' + x.id }, no(x.id) + ' ' + x.client)])));
  if (a.awaitingPayment.length) alerts.push(el('div', { class: 'alert info' }, '💳 Ждут оплаты аванса: ',
    a.awaitingPayment.map((x, i) => [i ? ', ' : '', el('a', { href: '#orders/' + x.id }, no(x.id) + ' (' + x.amount.toLocaleString('ru-RU') + ' грн)')])));
  if (a.unreadChats.length) alerts.push(el('div', { class: 'alert' }, '💬 Новые сообщения от клиентов: ',
    a.unreadChats.map((x, i) => [i ? ', ' : '', el('a', { href: '#orders/' + x.id }, no(x.id) + ' ' + x.client + ' (' + x.unread + ')')])));
  alerts.push(...extraAlerts(a));
  renderWizard();
  if (a.errors24h) alerts.push(el('div', { class: 'alert info' }, 'Ошибок за сутки: ' + a.errors24h + '. ', el('a', { href: '#settings' }, 'Посмотреть')));
  $('alerts').replaceChildren(...alerts);

  const kpi = (value, label, href, extra, accent) => el(href ? 'a' : 'div', { class: 'stat' + (accent ? ' accent' : ''), href },
    el('b', {}, String(value)), el('span', {}, label), extra ? el('small', {}, extra) : null);
  const conv = o.funnel[0].value ? Math.round((o.funnel.at(-1).value / o.funnel[0].value) * 100) + '%' : '—';
  $('kpis').replaceChildren(
    kpi(o.counts.new, 'Новые заявки', '#orders', null, o.counts.new > 0),
    kpi(o.counts.in_progress, 'В работе', '#orders'),
    kpi(o.orders.today, 'Заявок сегодня', '#orders', 'за 7 дней: ' + o.orders.week + ' · за 30: ' + o.orders.month),
    kpi(o.counts.done, 'Выполнено', '#orders', 'всего заявок: ' + o.orders.total),
    kpi(o.clients.total, 'Клиентов', '#clients', '+' + o.clients.week + ' за 7 дней'),
    kpi(o.briefs.active, 'Заполняют бриф', '#drafts', 'начали за 7 дней: ' + o.briefs.week),
    kpi(conv, 'Конверсия брифа', null, 'отправили / начали'),
    kpi(o.reviews.avg ? '⭐ ' + o.reviews.avg : '—', 'Средняя оценка', '#reviews', 'отзывов: ' + o.reviews.count),
    ...(o.payments.enabled || o.payments.paid30 ? [kpi(o.payments.paid30.toLocaleString('ru-RU') + ' ₴', 'Авансы за 30 дней', '#settings')] : []),
  );

  drawChart(o.series);
  drawFunnel(o.funnel);
  $('recentOrders').replaceChildren(ordersTable(list.orders.slice(0, 6), true));
}

function drawChart(series) {
  const W = 600, H = 190, pad = 22, n = series.length;
  const max = Math.max(1, ...series.map((r) => Math.max(r.users, r.starts, r.orders)));
  const slot = (W - pad) / n, bw = Math.max(2, slot / 4);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (H + 20));
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
    add('text', { x: 0, y: y + 4, 'font-size': 10, fill: '#999' }, String(Math.round(f * max)));
  }
  series.forEach((r, i) => {
    const x = pad + i * slot + slot / 2 - bw * 1.5;
    [['users', '#cfcfcf'], ['starts', '#ffc4a8'], ['orders', '#f94400']].forEach(([k, color], j) => {
      const h = (r[k] / max) * (H - 10);
      if (h > 0) {
        const rect = add('rect', { x: x + j * bw, y: H - h, width: bw - 1, height: h, rx: 1.5, fill: color });
        const t = document.createElementNS(NS, 'title');
        t.textContent = r.day + ': клиентов ' + r.users + ', начали бриф ' + r.starts + ', заявок ' + r.orders;
        rect.append(t);
      }
    });
    if (i % 5 === 0 || i === n - 1) add('text', { x: pad + i * slot + slot / 2, y: H + 15, 'font-size': 10, fill: '#999', 'text-anchor': 'middle' }, r.day.slice(8) + '.' + r.day.slice(5, 7));
  });
  $('chart').replaceChildren(svg);
}

function drawFunnel(funnel) {
  const top = funnel[0].value || 0;
  if (!top) { $('funnel').replaceChildren(el('p', { class: 'muted' }, 'Данные появятся, когда клиенты начнут заполнять брифы.')); return; }
  $('funnel').replaceChildren(...funnel.map((f) => {
    const pct = Math.round((f.value / top) * 100);
    return el('div', { class: 'fun' }, el('span', {}, f.label),
      el('div', { class: 'bar' }, el('i', { style: 'width:' + pct + '%' })),
      el('span', { class: 'val' }, f.value + ' · ' + pct + '%'));
  }));
}

// ---------- заявки ----------
function ordersTable(orders, compact) {
  if (!orders.length) return empty('Заявок нет.');
  const rows = orders.map((r) => {
    const tr = el('tr', { class: 'click' },
      el('td', {}, el('b', {}, no(r.id)), el('br'), el('small', {}, fmt(r.createdAt))),
      el('td', {}, r.client, el('br'), el('small', {}, r.contact || '')),
      el('td', { class: 'hide-sm' }, r.stickerType + ', ' + r.quantity, el('br'), el('small', {}, r.hero.length > 70 ? r.hero.slice(0, 70) + '…' : r.hero)),
      compact ? null : el('td', { class: 'hide-sm' }, r.source ? el('span', { class: 'tag' }, r.source) : el('small', {}, '—')),
      compact ? null : el('td', { class: 'hide-sm' }, r.studioPrice || el('small', {}, '—'), r.due ? [el('br'), dueTag(r) || el('small', {}, 'до ' + dmy(r.due))] : r.deadline ? [el('br'), el('small', {}, 'срок: ' + r.deadline)] : null, r.assigneeName ? [el('br'), el('small', {}, '👤 ' + r.assigneeName)] : null),
      el('td', {}, statusTag(r.status), r.pay ? el('span', { class: 'tag sketch-tag', title: 'Аванс ' + r.pay.amount + ' грн' }, '💳' + ({ success: '✅', manual: '✅', created: '⏳', processing: '⏳', hold: '⏳' }[r.pay.status] || '✖')) : null, r.pack ? el('span', { class: 'tag sketch-tag', title: 'Стикерпак готов' }, '📦') : null, r.repeatOf ? el('span', { class: 'tag sketch-tag', title: 'Дополнение к ' + no(r.repeatOf) }, '➕') : null, r.referral ? el('span', { class: 'tag sketch-tag', title: 'По приглашению' }, '🎁') : null, r.sketch ? el('span', { class: 'tag sketch-tag', title: 'Эскизы, версия ' + r.sketch.round }, '🖼 ' + ({ pending: '⏳', approved: '✅', changes: '✏️' }[r.sketch.status] || '')) : null, r.unread ? el('span', { class: 'badge chat-badge' }, '💬 ' + r.unread) : null, r.hasNote ? el('small', {}, ' 📝') : null));
    tr.addEventListener('click', () => { location.hash = 'orders/' + r.id; });
    return tr;
  });
  // [заголовок, ховати на телефоні]
  const head = [['Заявка'], ['Клиент'], ['Бриф', true]]
    .concat(compact ? [] : [['Метка', true], ['Цена / срок', true]])
    .concat([['Статус']]);
  return el('div', { class: 'table-wrap' }, el('table', {},
    el('thead', {}, el('tr', {}, head.map(([h, hideSm]) => el('th', { class: hideSm ? 'hide-sm' : null }, h)))),
    el('tbody', {}, rows)));
}

async function loadOrders() {
  $('orderDetail').classList.add('hidden');
  $('ordersList').classList.remove('hidden');
  const data = await api('/api/orders' + ($('showArchived').checked ? '?archived=1' : ''));
  state.orders = data.orders;
  renderOrders();
}
$('showArchived').addEventListener('change', () => loadOrders().catch((err) => alert(err.message)));

function renderOrders() {
  const counts = { all: state.orders.length, new: 0, in_progress: 0, done: 0, rejected: 0, cancelled: 0 };
  for (const o of state.orders) counts[o.status]++;
  $('viewList').classList.toggle('active', boardView !== 'board');
  $('viewBoard').classList.toggle('active', boardView === 'board');
  $('statusChips').classList.toggle('hidden', boardView === 'board');
  $('statusChips').replaceChildren(...[['all', 'Все'], ['new', 'Новые'], ['in_progress', 'В работе'], ['done', 'Готово'], ['rejected', 'Отклонены'], ['cancelled', 'Отменены']].filter(([k]) => k !== 'cancelled' || counts.cancelled)
    .map(([key, label]) => {
      const b = el('button', { type: 'button', class: state.status === key ? 'active' : '' }, label + ' · ' + counts[key]);
      b.addEventListener('click', () => { state.status = key; renderOrders(); });
      return b;
    }));
  const cf = $('clientFilter');
  if (state.userFilter) {
    cf.classList.remove('hidden');
    cf.replaceChildren(el('span', { class: 'chip' }, 'Клиент: ' + state.userFilter.name + ' '),
      action('✕ показать всех', async () => { state.userFilter = null; renderOrders(); }, 'small ghost'));
  } else cf.classList.add('hidden');

  // Фільтр за дизайнером (для власника, якщо є команда)
  const names = [...new Map(state.orders.filter((o) => o.assignee).map((o) => [o.assignee, o.assigneeName])).entries()];
  const df = $('designerFilter');
  df.classList.toggle('hidden', !names.length || state.role === 'designer');
  df.replaceChildren(el('option', { value: '' }, 'Все дизайнеры'), el('option', { value: '-' }, 'Без дизайнера'), ...names.map(([id, name]) => el('option', { value: id }, '👤 ' + name)));
  df.value = state.designer;
  const q = state.q.trim().toLowerCase().replace(/^#/, '');
  const list = state.orders.filter((o) =>
    (boardView === 'board' || state.status === 'all' || o.status === state.status) &&
    (!state.userFilter || o.userId === state.userFilter.id) &&
    (!state.designer || (state.designer === '-' ? !o.assignee : o.assignee === state.designer)) &&
    (!q || [String(o.id), no(o.id).slice(1), o.client, o.contact, o.hero, o.source, o.stickerType, o.assigneeName, o.promo].some((v) => v && String(v).toLowerCase().includes(q))));
  $('ordersTable').replaceChildren(boardView === 'board' ? renderBoard(list) : ordersTable(list, false));
}

$('orderSearch').addEventListener('input', (e) => { state.q = e.target.value; renderOrders(); });
$('designerFilter').addEventListener('change', (e) => { state.designer = e.target.value; renderOrders(); });
$('viewList').addEventListener('click', () => setOrdersView('list'));
$('viewBoard').addEventListener('click', () => setOrdersView('board'));

async function loadOrderDetail(id) {
  $('ordersList').classList.add('hidden');
  const box = $('orderDetail');
  box.classList.remove('hidden');
  box.replaceChildren(el('p', { class: 'loading' }, 'Загрузка заявки…'));
  try { renderOrderDetail(await api('/api/orders/' + id)); }
  catch (err) { box.replaceChildren(el('p', { class: 'error' }, err.message), el('a', { href: '#orders' }, '← ко всем заявкам')); }
}

function renderOrderDetail(o) {
  const box = $('orderDetail');
  const designer = state.role === 'designer';
  const notify = el('input', { type: 'checkbox', checked: true });
  const statusButtons = Object.keys(STATUS).filter((s) => s !== o.status && s !== 'cancelled').map((s) =>
    action(s === 'in_progress' && o.status !== 'new' ? 'Вернуть в работу' : { in_progress: 'Взять в работу', done: 'Готово', rejected: 'Отклонить', new: 'Сделать новой' }[s],
      async () => {
        const r = await api('/api/orders/' + o.id + '/status', { status: s, notifyClient: notify.checked });
        renderOrderDetail(r.order);
        if (r.warning) alert(r.warning);
        refreshBadges();
      }, s === 'rejected' ? 'ghost danger' : s === 'new' ? 'ghost' : ''));

  const tgLink = o.username ? el('a', { href: 'https://t.me/' + o.username, target: '_blank', rel: 'noopener noreferrer' }, '@' + o.username) : el('span', {}, o.fullName || '');
  const refsTypes = { photo: 'фото', video: 'видео', animation: 'GIF', sticker: 'стикер', document: 'файл' };

  // Дизайнер заявки (призначає власник)
  let assignBox = null;
  if (!designer && o.team && (o.team.length || o.assignee)) {
    const sel = el('select', {}, el('option', { value: '' }, '— не назначен'), o.team.map((m) => el('option', { value: m.id }, m.name)));
    sel.value = o.assignee || '';
    sel.addEventListener('change', async () => {
      try { renderOrderDetail((await api('/api/orders/' + o.id + '/assign', { memberId: sel.value || null })).order); }
      catch (err) { alert(err.message); sel.value = o.assignee || ''; }
    });
    assignBox = el('label', { class: 'assign' }, '👤 Дизайнер', sel);
  }

  const studioForm = el('form', { class: 'stack' },
    el('div', { class: 'grid2' },
      el('label', {}, 'Согласованная цена', el('input', { name: 'price', value: o.studio.price, placeholder: 'например 3500 грн' })),
      el('label', {}, 'Срок (дата)', el('input', { name: 'due', type: 'date', value: o.studio.due || '' }))),
    o.studio.deadline && !o.studio.due ? el('p', { class: 'small-muted' }, 'Раньше срок был записан текстом: «' + o.studio.deadline + '». Выберите дату — бот напомнит о сроке.') : null,
    designer ? null : el('label', {}, 'Заметка (видите только вы)', el('textarea', { name: 'note', rows: 3 }, o.studio.note)),
    el('button', { type: 'submit' }, 'Сохранить'),
    el('p', { class: 'ok' }));
  studioForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const r = await api('/api/orders/' + o.id + '/studio', Object.fromEntries(new FormData(studioForm).entries()));
    renderOrderDetail(r.order);
  });

  const msgText = el('textarea', { rows: 3, maxlength: 3000, placeholder: o.lang === 'en' ? 'Ответ клиенту по-английски — клиент англоязычный 🇬🇧' : 'Ответ клиенту — уйдёт от имени «Дизайнер YABOT» (лучше на украинском)' });
  const quick = o.quickReplies.length ? el('div', { class: 'qr-chips' }, el('small', { class: 'muted' }, 'Быстрые ответы:'),
    o.quickReplies.map((r) => el('button', { type: 'button', class: 'chip', title: r.text, onclick: () => { msgText.value = r.text; msgText.focus(); } }, r.title))) : null;
  const msgErr = el('p', { class: 'error' });
  const sendBtn = action('Отправить клиенту', async () => {
    msgErr.textContent = '';
    try {
      const r = await api('/api/orders/' + o.id + '/message', { text: msgText.value });
      renderOrderDetail(r.order);
    } catch (err) { msgErr.textContent = err.message; }
  });

  const clientExtra = designer ? null : [
    o.clientTags.length ? el('div', { class: 'tags' }, o.clientTags.map((t) => el('span', { class: 'tag ctag' }, t))) : null,
    o.clientNote ? el('p', { class: 'small-muted' }, '📝 ' + (o.clientNote.length > 160 ? o.clientNote.slice(0, 160) + '…' : o.clientNote)) : null,
    el('a', { href: '#clients/' + o.userId, class: 'small-link' }, 'Карточка клиента →'),
  ];

  fill(box,
    el('p', {}, el('a', { href: '#orders' }, '← ко всем заявкам')),
    el('div', { class: 'detail-head' }, el('h1', {}, 'Заявка ' + no(o.id)), statusTag(o.status), dueTag(o), el('span', { class: 'muted' }, fmt(o.createdAt) + ' · ' + ago(o.createdAt)), assignBox),
    o.archived ? el('div', { class: 'archive-banner' }, '🗄 Заявка в архиве с ' + fmt(o.archived) + ' — только просмотр.') : null,
    o.cancel ? el('div', { class: 'alert' }, '🚫 Клиент отменил заявку ' + fmt(o.cancel.at) + '. Причина: ' + o.cancel.reason + '.') : null,
    el('section', { class: 'card' },
      el('h2', {}, 'Статус'),
      el('div', { class: 'actions' }, statusButtons, el('a', { class: 'btn', href: '/api/orders/' + o.id + '/pdf', download: 'YABOT_brief_' + no(o.id).slice(1) + '.pdf' }, '📄 Скачать PDF')),
      el('label', { class: 'check' }, notify, 'Сообщить клиенту о смене статуса'),
      el('p', { class: 'muted' }, 'Карточка в Telegram обновится автоматически.')),
    el('div', { class: 'grid2' },
      el('section', { class: 'card' },
        el('h2', {}, 'Бриф'),
        el('dl', { class: 'kv' },
          el('dt', {}, 'Тип'), el('dd', {}, o.stickerType),
          o.repeatInfo ? [el('dt', {}, 'Дополнение к'), el('dd', {}, el('a', { href: '#orders/' + o.repeatInfo.id }, no(o.repeatInfo.id)), o.repeatInfo.packName ? ' · пак ' + o.repeatInfo.packName : '')] : null,
          el('dt', {}, 'Количество'), el('dd', {}, o.quantity),
          el('dt', {}, 'Ориентир цены'), el('dd', {}, o.priceHint || '—'),
          el('dt', {}, 'Главный герой'), el('dd', {}, o.hero),
          el('dt', {}, 'Эмоции и фразы'), el('dd', {}, o.emotions, o.aiIdeas ? el('div', { class: 'small-muted' }, '💡 подобраны с ИИ-подсказкой') : null),
          el('dt', {}, 'Как в работе'), el('dd', {}, o.catalogRef ? el('a', { href: 'https://t.me/addstickers/' + o.catalogRef.name, target: '_blank', rel: 'noopener noreferrer' }, o.catalogRef.title) : '—'),
          o.likeExample ? [el('dt', {}, '✨ Как в примере'), el('dd', {}, el('a', { href: '/api/channel/upload/' + o.likeExample.image, target: '_blank', rel: 'noopener' },
            el('img', { src: '/api/channel/upload/' + o.likeExample.image, alt: '', class: 'like-ex' })), o.likeExample.caption ? el('div', { class: 'small-muted' }, o.likeExample.caption) : null)] : null,
          el('dt', {}, 'Референсы'), el('dd', {}, o.refsList.length ? o.refsList.map((r) => (refsTypes[r.type] || r.type) + (r.name ? ' «' + r.name + '»' : '')).join(', ') : 'нет'),
          o.promo ? [el('dt', {}, 'Промокод'), el('dd', {}, '🎟 ' + o.promo)] : null,
          o.package ? [el('dt', {}, 'Пакет'), el('dd', {}, '📦 ' + o.package.name + ' — ' + money(o.package.price))] : null,
          o.style ? [el('dt', {}, 'Стиль'), el('dd', {}, '🎨 ' + o.style.name)] : null,
          o.gift ? [el('dt', {}, 'Сертификат'), el('dd', {}, '🎁 ' + o.gift.code + ' — ' + money(o.gift.amount))] : null,
        ),
        el('p', { class: 'muted' }, 'Сами файлы — в Telegram, ответом на карточку заявки.')),
      el('section', { class: 'card' },
        el('h2', {}, 'Клиент'),
        o.clientBlocked ? el('div', { class: 'alert bad' }, 'Клиент заблокировал бота — сообщения ему не доходят.') : null,
        el('dl', { class: 'kv' },
          el('dt', {}, 'Имя'), el('dd', {}, o.fullName || '—'),
          el('dt', {}, 'Telegram'), el('dd', {}, tgLink, ' · ID ', o.userId),
          el('dt', {}, 'Контакт'), el('dd', {}, o.contact || '—'),
          el('dt', {}, 'Пришёл по ссылке'), el('dd', {}, o.source || 'напрямую', o.viaPost ? el('div', { class: 'small-muted' }, '📣 из поста в «' + (o.viaPost.chatTitle || 'канале') + '»' + (o.viaPost.text ? ': ' + o.viaPost.text : '')) : null),
          el('dt', {}, 'Язык'), el('dd', {}, o.lang === 'en' ? '🇬🇧 английский — отвечайте по-английски' : 'украинский'),
          el('dt', {}, 'Заявок всего'), el('dd', {}, String(o.clientOrders))),
        clientExtra,
        designer ? null : o.referralInfo ? el('div', { class: 'alert' }, '🎁 Пришёл по приглашению ' + (o.referralInfo.byName || '') + ' — скидка ' + o.referralInfo.percent + '% на этот заказ.') : null,
        designer ? null : o.bonusUsed ? el('p', { class: 'ok' }, '🎁 На этот заказ списан бонус клиента.')
          : o.clientBonuses > 0 ? el('div', { class: 'alert info' }, '🎁 У клиента бонусов: ' + o.clientBonuses + ' (скидка ' + o.referralPercent + '%). ',
            action('Списать бонус на этот заказ', async () => { if (confirm('Списать один бонус клиента на этот заказ?')) renderOrderDetail((await api('/api/orders/' + o.id + '/bonus', {})).order); }, 'small')) : null,
        !designer && o.clientOrders > 1 ? action('Все заявки клиента', async () => { state.userFilter = { id: o.userId, name: o.client }; location.hash = 'orders'; }, 'small ghost') : null)),
    quoteSection(o),
    designer ? null : paySection(o),
    fixSection(o),
    projectStageSection(o),
    payPlanSection(o),
    checklistSection(o),
    sketchesSection(o),
    finalsSection(o),
    designer ? null : packSection(o),
    showcaseSection(o),
    docsSection(o),
    el('div', { class: 'grid2' },
      el('section', { class: 'card' }, el('h2', {}, 'Для студии'), studioForm),
      el('section', { class: 'card' },
        el('h2', {}, 'Переписка с клиентом'),
        el('p', { class: 'muted' }, 'Всё, что клиент пишет боту после заявки, приходит в Telegram. Ответить можно там — кнопкой «Ответить» на его сообщение или на карточку заявки — или прямо здесь.'),
        el('div', { class: 'thread' }, o.messages.length ? o.messages.map((m) => el('div', { class: 'msg ' + (m.from === 'client' ? 'from-client' : 'from-studio') },
          el('small', {}, (m.from === 'client' ? 'Клиент' : 'Студия' + (m.by ? ' · ' + m.by : '') + (m.via === 'page' ? ' (со страницы)' : '')) + ' · ' + fmt(m.at)), m.text)) : el('p', { class: 'muted' }, 'Сообщений пока нет.')),
        quick, msgText, el('div', { class: 'actions' }, sendBtn), msgErr, scheduleBlock(o, msgText))),
    auditSection(o),
    el('section', { class: 'card' },
      el('h2', {}, 'История'),
      el('ul', { class: 'timeline' }, o.history.map((h) => el('li', {}, fmt(h.at) + ' — ' + (h.note || STATUS[h.status] || h.status) + ' (' + h.by + ')')))),
  );
  window.scrollTo(0, 0);
}

const money = (n) => Number(n || 0).toLocaleString('ru-RU') + ' грн';
const dmy = (key) => (key ? key.split('-').reverse().join('.') : '');

function dueTag(o) {
  if (!o.due || !(o.status === 'new' || o.status === 'in_progress')) return null;
  const label = { overdue: 'просрочен', today: 'сегодня', tomorrow: 'завтра' }[o.dueState];
  return el('span', { class: 'due-tag ' + (o.dueState || 'later'), title: 'Срок' }, '📅 ' + dmy(o.due).slice(0, 5) + (label ? ' · ' + label : ''));
}

function quoteSection(o) {
  const open = o.status === 'new' || o.status === 'in_progress';
  const list = o.quotes.slice().reverse().map((q) => el('div', { class: 'pay-row' + (q.status === 'superseded' ? ' voided' : '') },
    el('b', {}, money(q.amount)), el('span', {}, q.statusLabel),
    el('small', { class: 'small-muted' }, 'отправлена ' + fmt(q.sentAt) + (q.due ? ' · срок до ' + dmy(q.due) : '') + (q.decidedAt ? ' · ответ ' + fmt(q.decidedAt) : '') + (q.by ? ' · ' + q.by : ''))));
  if (!open) return list.length ? el('section', { class: 'card' }, el('h2', {}, '🧾 Смета'), list) : null;
  const d = o.quoteDefaults;
  const amount = el('input', { type: 'number', min: 1, step: 1, value: d.amount || '', placeholder: 'Стоимость, грн' });
  const due = el('input', { type: 'date', value: d.due || '' });
  const items = el('textarea', { rows: 3, maxlength: 1500 }, d.items);
  const comment = el('textarea', { rows: 2, maxlength: 1000, placeholder: 'Комментарий (необязательно)' });
  const days = el('input', { type: 'number', min: 1, max: 365, placeholder: 'или дней после согласования' });
  due.addEventListener('input', () => { if (due.value) days.value = ''; });
  days.addEventListener('input', () => { if (days.value) due.value = ''; });
  const pkgSel = o.packages && o.packages.length ? el('select', {}, el('option', { value: '' }, '📦 Заполнить из пакета…'), o.packages.map((p) => el('option', { value: p.id }, p.name + ' — ' + money(p.price)))) : null;
  if (pkgSel) pkgSel.addEventListener('change', () => {
    const p = o.packages.find((x) => x.id === pkgSel.value);
    if (!p) return;
    amount.value = p.price;
    items.value = p.items || items.value;
    if (p.days) { days.value = p.days; due.value = ''; }
  });
  const err = el('p', { class: 'error' });
  const last = o.quotes[o.quotes.length - 1];
  return el('section', { class: 'card' },
    el('h2', {}, '🧾 Смета'),
    list.length ? el('div', {}, list) : null,
    last && last.status === 'accepted' ? el('p', { class: 'ok' }, 'Клиент согласовал смету — цена и срок записаны в «Для студии».') : null,
    pkgSel ? el('label', {}, 'Шаблон', pkgSel) : null,
    el('div', { class: 'grid2' }, el('label', {}, 'Стоимость, грн', amount), el('label', {}, 'Срок: дата или число дней', el('div', { class: 'row' }, due, days))),
    el('label', {}, 'Что входит (каждый пункт с новой строки)', items),
    el('label', {}, 'Комментарий', comment),
    el('div', { class: 'actions' }, action(last ? '🧾 Отправить новую смету' : '🧾 Отправить смету клиенту', async () => {
      err.textContent = '';
      if (!(Number(amount.value) >= 1)) { err.textContent = 'Укажите стоимость.'; return; }
      if (!confirm('Отправить клиенту смету на ' + money(amount.value) + (due.value ? ', срок до ' + dmy(due.value) : days.value ? ', срок ' + days.value + ' дн. после согласования' : '') + '?')) return;
      try { renderOrderDetail((await api('/api/orders/' + o.id + '/quote', { amount: Number(amount.value), due: due.value, days: Number(days.value) || 0, items: items.value, comment: comment.value })).order); }
      catch (e) { err.textContent = e.message; }
    })),
    err,
    el('p', { class: 'muted' }, 'Клиент получит смету с кнопками «✅ Погоджую» и «💬 Є питання» (на своём языке). После согласования цена и срок попадут в «Для студии», новая заявка перейдёт «в работу»' +
      (o.payEnabled ? ', а вам придёт кнопка счёта на аванс (или счёт уйдёт сам — см. «Настройки» → «Оплата»).' : '.')));
}

const SKETCH = { pending: '⏳ ждёт решения клиента', approved: '✅ согласовано', changes: '✏️ клиент просит правки' };

// Робота із замовлення → «Приклади робіт» послуги в Mini App (лише власник)
async function toExamples(o, payload) {
  const caption = prompt('Подпись к примеру (необязательно), например «Стікерпак для кав’ярні»:', '');
  if (caption === null) return;
  if (o.showcaseConsent !== 'yes' && !confirm('Клиент не давал согласия показывать работу. Всё равно добавить в примеры?')) return;
  try {
    const r = await api('/api/orders/' + o.id + '/to-examples', { ...payload, caption });
    alert(r.warning || ('Готово: в примерах услуги теперь ' + r.added.count + ' из 8.'));
    renderOrderDetail(r.order);
  } catch (err) { alert(err.message); }
}

function sketchesSection(o) {
  const howto = el('p', { class: 'muted' }, 'Отправить эскизы: в Telegram на карточке заявки нажмите «🖼 Надіслати ескізи», пришлите файлы и комментарий, затем «Отправить клиенту». Клиент ответит кнопками «Погоджую» / «Є правки».');
  if (!o.sketches.length) return el('section', { class: 'card' }, el('h2', {}, 'Эскизы'), el('p', {}, 'Эскизы ещё не отправлялись.'), howto);
  const rounds = o.sketches.slice().reverse().map((s) => el('div', { class: 'sketch-round' },
    el('div', { class: 'sketch-head' },
      el('b', {}, 'Версия ' + s.round), el('span', { class: 'sketch-status ' + s.status }, SKETCH[s.status] || s.status),
      el('small', {}, 'отправлено ' + fmt(s.sentAt) + (s.decidedAt ? ' · ответ ' + fmt(s.decidedAt) : '') + (s.reminded && s.status === 'pending' ? ' · напоминание отправлено' : ''))),
    s.comment ? el('p', { class: 'small-muted' }, 'Комментарий: ' + s.comment) : null,
    el('div', { class: 'thumbs' }, s.items.map((it) => it.preview
      ? el('div', { class: 'thumb-ex' }, el('a', { href: '/api/orders/' + o.id + '/sketch/' + s.round + '/' + it.index, target: '_blank', rel: 'noopener' },
        el('img', { src: '/api/orders/' + o.id + '/sketch/' + s.round + '/' + it.index, alt: 'эскиз', loading: 'lazy' })),
        state.role === 'designer' ? null : it.inExamples ? el('small', { class: 'small-muted' }, '✓ в примерах')
          : action('🖼 В примеры', () => toExamples(o, { round: s.round, index: it.index }), 'small ghost'))
      : el('span', { class: 'thumb-file' }, it.type === 'document' ? '📎 ' + (it.name || 'файл') : it.type === 'video' ? '🎬 видео' : '🎞 GIF'))),
    s.feedback ? el('div', { class: 'msg from-client' }, el('small', {}, 'Правки клиента'), s.feedback) : null));
  return el('section', { class: 'card' }, el('h2', {}, 'Эскизы'), rounds, howto);
}

// Готові файли для клієнта: файл (до 45 МБ) уходить клієнту в чат документом, посилання — повідомленням
function finalsSection(o) {
  const err = el('p', { class: 'error' });
  const status = el('p', { class: 'muted' });
  const file = el('input', { type: 'file', multiple: true, class: 'hidden' });
  file.addEventListener('change', async () => {
    err.textContent = '';
    let last = null;
    for (const f of [...file.files]) {
      if (f.size > 45 * 1024 * 1024) { err.textContent = 'Файл больше 45 МБ: ' + f.name + ' — отправьте ссылкой (Google Drive и т. п.).'; continue; }
      status.textContent = 'Отправляю ' + f.name + '…';
      const res = await fetch('/api/orders/' + o.id + '/final-file', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': f.type || 'application/octet-stream', 'x-filename': encodeURIComponent(f.name), 'x-yabot': '1' }, body: f });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { err.textContent = j.error || 'Не удалось отправить.'; continue; }
      last = j.order;
    }
    status.textContent = '';
    file.value = '';
    if (last) renderOrderDetail(last);
  });
  const url = el('input', { placeholder: 'https://drive.google.com/…', spellcheck: 'false' });
  const title = el('input', { placeholder: 'Подпись (необязательно)', maxlength: '120' });
  const list = (o.finals || []).slice().reverse();
  return el('section', { class: 'card' }, el('h2', {}, '📦 Готовые файлы для клиента'),
    list.length ? el('div', { class: 'finals' }, list.map((f) => el('div', { class: 'kv' },
      el('span', {}, (f.kind === 'link' ? '🔗 ' : '📄 ') + f.name + (f.size ? ' · ' + (f.size / 1048576).toFixed(1) + ' МБ' : '') + ' · ' + fmt(f.at) + (f.by ? ' · ' + f.by : '')),
      state.role !== 'designer' && f.kind === 'file' && /\\.(png|jpe?g|webp)$/i.test(f.name || '') && !f.inExamples
        ? action('🖼 В примеры', () => toExamples(o, { finalId: f.id }), 'small ghost') : null,
      action('Убрать из списка', async () => { if (confirm('Убрать из списка? У клиента в чате файл останется.')) renderOrderDetail((await api('/api/orders/' + o.id + '/final-remove', { id: f.id })).order); }, 'small ghost')))) : el('p', { class: 'muted' }, 'Пока ничего не отправлено.'),
    el('div', { class: 'actions' }, el('button', { type: 'button', onclick: () => file.click() }, '📄 Отправить файлы'), file),
    el('div', { class: 'grid2' }, url, title),
    action('🔗 Отправить ссылку', async () => {
      err.textContent = '';
      try { renderOrderDetail((await api('/api/orders/' + o.id + '/final-link', { url: url.value, title: title.value })).order); } catch (e) { err.textContent = e.message; }
    }, 'small ghost'),
    status, err,
    el('p', { class: 'muted' }, 'Файл (до 45 МБ) сразу уходит клиенту в чат бота, ссылка — сообщением с кнопкой. Всё это клиент видит в Mini App: «Замовлення» → заказ → «Файли» → «Фінальні файли».'));
}

const PAY_ACTIVE = ['created', 'processing', 'hold', 'awaiting', 'reported'];

function paySection(o) {
  // Розділ видно завжди (крім відхилених/скасованих без платежів): ручна позначка працює й без monobank
  if ((o.status === 'rejected' || o.status === 'cancelled') && !o.payments.length) return null;
  const cur = o.payments[o.payments.length - 1];
  const active = cur && PAY_ACTIVE.includes(cur.status);
  const KIND = o.payKinds;
  const list = o.payments.slice().reverse().map((p) => el('div', { class: 'pay-row' + (p.status === 'voided' ? ' voided' : '') },
    el('b', {}, p.amount.toLocaleString('ru-RU') + ' грн'), el('span', { class: 'tag' }, KIND[p.kind] || 'Аванс'), el('span', {}, p.statusLabel),
    el('small', { class: 'small-muted' }, fmt(p.createdAt) + (p.paidAt && p.status !== 'voided' ? ' · оплачен ' + fmt(p.paidAt) : p.expiresAt && PAY_ACTIVE.includes(p.status) ? ' · до ' + fmt(p.expiresAt) : '') + (p.voidedAt ? ' · отменено ' + fmt(p.voidedAt) : '') + (p.by ? ' · ' + p.by : '')),
    p.pageUrl && PAY_ACTIVE.includes(p.status) ? el('a', { href: p.pageUrl, target: '_blank', rel: 'noopener noreferrer', class: 'small-muted' }, 'страница оплаты') : null,
    p.deliveryError ? el('small', { class: 'error' }, 'клиенту не доставлено: ' + p.deliveryError) : null,
    p.failureReason ? el('small', { class: 'small-muted' }, p.failureReason) : null));

  const summary = o.amount ? el('p', { class: 'pay-sum' }, 'Цена: ', el('b', {}, money(o.amount)), ' · оплачено: ', el('b', {}, money(o.paid)),
    ' · осталось: ', el('b', { class: o.remaining > 0 ? 'debt' : 'ok' }, money(o.remaining))) : null;

  const controls = [];
  const err = el('p', { class: 'error' });
  const run = async (url, body) => {
    err.textContent = '';
    try { renderOrderDetail((await api('/api/orders/' + o.id + url, body)).order); } catch (e) { err.textContent = e.message; }
  };
  if (active && cur.method === 'card') {
    // Переказ на картку: студія сама підтверджує надходження
    const idx = o.payments.length - 1;
    controls.push(
      cur.status === 'reported' ? el('div', { class: 'alert' }, '🔔 Клиент сообщил, что оплатил ' + money(cur.amount) + ' (' + fmt(cur.reportedAt) + '). Проверьте поступление на карту.') : el('p', { class: 'muted' }, 'Реквизиты отправлены клиенту — ждём перевод и нажатие «Я оплатив».'),
      el('div', { class: 'actions' },
        action('✅ Деньги пришли', async () => { if (confirm('Подтвердить, что ' + money(cur.amount) + ' пришли на карту? Клиент получит подтверждение.')) await run('/card-confirm', { idx, received: true }); }),
        cur.status === 'reported' ? action('❌ Не пришло', async () => { if (confirm('Сообщить клиенту, что оплата пока не поступила?')) await run('/card-confirm', { idx, received: false }); }, 'small ghost') : null,
        action('Отменить', async () => { if (confirm('Отменить запрос оплаты?')) await run('/cancel-invoice', {}); }, 'small ghost danger')));
  } else if (active) {
    controls.push(el('div', { class: 'actions' },
      action('Отменить счёт', async () => { if (confirm('Отменить неоплаченный счёт?')) await run('/cancel-invoice', {}); }, 'small ghost danger')));
  } else if (o.status !== 'rejected' && o.status !== 'cancelled' && !(o.amount && o.remaining === 0 && o.paid > 0)) {
    const kind = el('select', {}, Object.entries(KIND).map(([k, label]) => el('option', { value: k }, label)));
    kind.value = o.paySuggest.kind || 'advance';
    const amount = el('input', { type: 'number', min: 1, step: 1, value: o.paySuggest.amount || '', placeholder: 'Сумма, грн' });
    // Тип платежу змінили — підставляємо відповідну суму
    kind.addEventListener('change', () => {
      if (kind.value === 'full' && o.amount) amount.value = o.amount;
      else if (kind.value === 'final' && o.remaining) amount.value = o.remaining;
      else if (kind.value === 'advance' && o.paySuggest.kind === 'advance') amount.value = o.paySuggest.amount || '';
    });
    const notify = el('input', { type: 'checkbox' });
    controls.push(el('div', { class: 'pay-form' }, kind, amount,
      o.cardEnabled ? action('📨 Реквизиты на карту', async () => {
        if (!(Number(amount.value) >= 1)) { err.textContent = 'Укажите сумму.'; return; }
        if (!confirm('Отправить клиенту реквизиты карты для оплаты ' + money(amount.value) + '?')) return;
        await run('/card-request', { amount: Number(amount.value), kind: kind.value });
      }, o.payEnabled ? 'small ghost' : '') : null,
      o.payEnabled ? action('💳 Выставить счёт', async () => {
        if (!(Number(amount.value) >= 1)) { err.textContent = 'Укажите сумму.'; return; }
        if (!confirm('Отправить клиенту счёт (' + KIND[kind.value].toLowerCase() + ') на ' + money(amount.value) + '?')) return;
        await run('/invoice', { amount: Number(amount.value), kind: kind.value });
      }) : null,
      action('✅ Отметить оплату вручную', async () => {
        if (!(Number(amount.value) > 0)) { err.textContent = 'Укажите сумму, которую клиент оплатил.'; return; }
        if (confirm('Отметить, что клиент оплатил ' + money(amount.value) + ' (' + KIND[kind.value].toLowerCase() + ', наличными / переводом)?')) await run('/mark-paid', { amount: Number(amount.value), notify: notify.checked, kind: kind.value });
      }, o.payEnabled ? 'small ghost' : '')),
      el('label', { class: 'check' }, notify, ' Сообщить клиенту, что оплата получена'),
      o.paySuggest.basis ? el('p', { class: 'muted' }, 'Подсказка: ' + o.paySuggest.basis + '.') : el('p', { class: 'muted' }, 'Чтобы сумма подставлялась сама, отправьте смету или заполните «Согласованная цена».'),
      o.payEnabled || o.cardEnabled ? null : el('p', { class: 'muted' }, 'Онлайн-оплата не настроена: включите monobank или перевод на карту в «Настройки» → «Оплата и документы». Здесь можно отметить оплату вручную.'));
  }
  if (cur && cur.status === 'manual') {
    controls.push(el('div', { class: 'actions' },
      action('↩️ Отменить отметку об оплате', async () => {
        if (confirm('Отменить ручную отметку об оплате ' + cur.amount.toLocaleString('ru-RU') + ' грн? Запись останется в истории как отменённая. Клиенту ничего не придёт.')) await run('/unmark-paid', {});
      }, 'small ghost danger')));
  }
  controls.push(err);
  return el('section', { class: 'card' }, el('h2', {}, '💳 Оплата'), summary, list.length ? el('div', {}, list) : el('p', { class: 'muted' }, 'Оплат ещё не было.'), ...controls);
}

function packSection(o) {
  const howto = el('p', { class: 'muted' }, 'Собрать пак: в Telegram на карточке заявки нажмите «📦 Зібрати стікерпак», пришлите финальные стикеры файлами (PNG любого размера — бот подгонит до 512 px; WEBP, TGS, WEBM) и нажмите «Создать». Пак создаётся на имя клиента, клиенту приходит кнопка «Додати стікерпак», заказ переходит в «Готово».');
  if (!o.packInfo) return el('section', { class: 'card' }, el('h2', {}, 'Стикерпак'), el('p', {}, o.repeatInfo && o.repeatInfo.packName ? 'Стикеры добавятся в пак клиента «' + (o.repeatInfo.packTitle || o.repeatInfo.packName) + '».' : 'Пак ещё не собран.'), howto);
  const link = 'https://t.me/addstickers/' + o.packInfo.name;
  const msg = el('p', { class: 'ok' });
  return el('section', { class: 'card' },
    el('h2', {}, 'Стикерпак'),
    el('p', {}, '📦 ', el('a', { href: link, target: '_blank', rel: 'noopener noreferrer' }, o.packInfo.title), ' · ' + o.packInfo.count + ' шт. · обновлён ' + fmt(o.packInfo.updatedAt)),
    el('div', { class: 'actions' },
      action('Добавить в каталог работ', async () => {
        try { await api('/api/catalog/add', { link, description: '' }); msg.textContent = 'Добавлено в каталог — описание можно дописать во вкладке «Каталог».'; }
        catch (err) { msg.textContent = ''; alert(err.message); }
      }, 'small ghost')),
    msg);
}

// ---------- клієнти ----------
async function loadClients() {
  $('clientDetail').classList.add('hidden');
  $('clientsListBox').classList.remove('hidden');
  state.clients = (await api('/api/clients')).clients;
  const tags = [...new Set(state.clients.flatMap((c) => c.tags))].sort();
  const sel = $('clientTagFilter');
  const cur = sel.value;
  sel.replaceChildren(el('option', { value: '' }, 'Все метки'), ...tags.map((t) => el('option', { value: t }, t)));
  sel.value = tags.includes(cur) ? cur : '';
  sel.classList.toggle('hidden', !tags.length);
  renderClients();
}

function renderClients() {
  const q = ($('clientSearch').value || '').trim().toLowerCase().replace(/^@/, '');
  const tag = $('clientTagFilter').value;
  const list = state.clients.filter((c) => (!tag || c.tags.includes(tag)) && (!q || [c.name, c.username, c.source, String(c.id), ...c.tags].some((v) => v && v.toLowerCase().includes(q))));
  const blocked = state.clients.filter((c) => c.blocked).length;
  $('clientsInfo').textContent = 'Всего: ' + state.clients.length + (blocked ? ' · заблокировали бота: ' + blocked : '');
  if (!list.length) { $('clientsTable').replaceChildren(empty('Никого не найдено.')); return; }
  const rows = list.map((c) => el('tr', { class: 'click', onclick: (e) => { if (!e.target.closest('a')) location.hash = 'clients/' + c.id; } },
    el('td', {}, el('a', { href: '#clients/' + c.id }, c.name), c.lang === 'en' ? el('span', { title: 'Англоязычный клиент' }, ' 🇬🇧') : null, c.hasNote ? el('span', { title: 'Есть заметка' }, ' 📝') : null,
      c.tags.length ? el('div', { class: 'tags' }, c.tags.map((t) => el('span', { class: 'tag ctag' }, t))) : null, el('br'), c.username ? el('a', { href: 'https://t.me/' + c.username, target: '_blank', rel: 'noopener noreferrer' }, el('small', {}, '@' + c.username)) : el('small', {}, 'ID ' + c.id)),
    el('td', { class: 'hide-sm' }, c.source ? el('span', { class: 'tag' }, c.source) : el('small', {}, '—')),
    el('td', { class: 'hide-sm' }, el('small', {}, fmt(c.firstSeenAt))),
    el('td', {}, el('small', {}, ago(c.lastSeenAt))),
    el('td', {}, c.orders ? el('a', { href: '#orders', onclick: () => { state.userFilter = { id: c.id, name: c.username ? '@' + c.username : c.name }; } }, c.orders + (c.done ? ' (готово ' + c.done + ')' : '')) : '0'),
    el('td', { class: 'hide-sm' }, c.referredBy ? el('small', {}, 'от ' + c.referredBy) : null, c.invited ? el('small', {}, (c.referredBy ? ' · ' : '') + 'привёл ' + c.invited) : null,
      c.bonuses ? el('small', {}, ' · 🎁 ' + c.bonuses) : null, !c.referredBy && !c.invited && !c.bonuses ? el('small', {}, '—') : null),
    el('td', {}, c.studioBlocked ? el('span', { class: 'status rejected' }, '🚫 заблокирован') : c.blocked ? el('span', { class: 'status rejected' }, 'заблокировал') : c.inBrief ? el('span', { class: 'status new' }, 'заполняет бриф') : c.unsubscribed ? el('small', {}, 'отписан от рассылок') : el('small', {}, '—'))));
  $('clientsTable').replaceChildren(el('div', { class: 'table-wrap' }, el('table', {},
    el('thead', {}, el('tr', {}, el('th', {}, 'Клиент'), el('th', { class: 'hide-sm' }, 'Метка'), el('th', { class: 'hide-sm' }, 'Первый визит'), el('th', {}, 'Был'), el('th', {}, 'Заявок'), el('th', { class: 'hide-sm' }, 'Рефералы'), el('th', {}, 'Статус'))),
    el('tbody', {}, rows))));
}
$('clientSearch').addEventListener('input', renderClients);
$('clientTagFilter').addEventListener('change', renderClients);

// ---------- брифи в процесі ----------
async function loadDrafts() {
  const [data, src] = await Promise.all([api('/api/drafts'), api('/api/sources')]);
  $('remindersInfo').textContent = 'Напоминаний отправлено: ' + src.reminders.sent + ', вернулись к брифу: ' + src.reminders.resumed + '.';
  renderDrafts(data.drafts);
}

function renderDrafts(drafts) {
  if (!drafts.length) { $('draftsTable').replaceChildren(el('p', { class: 'muted' }, 'Сейчас никто не заполняет бриф.')); return; }
  const rows = drafts.map((d) => el('tr', {},
    el('td', {}, d.client),
    el('td', {}, d.step + ' (' + d.stepIndex + '/' + d.steps + ')', el('div', { class: 'progress' }, el('i', { style: 'width:' + Math.round((d.stepIndex / d.steps) * 100) + '%' }))),
    el('td', { class: 'hide-sm' }, el('small', {}, [d.stickerType, d.quantity, d.hero && (d.hero.length > 40 ? d.hero.slice(0, 40) + '…' : d.hero), d.catalogRef && 'как «' + d.catalogRef + '»'].filter(Boolean).join(' · ') || '—')),
    el('td', {}, el('small', {}, ago(d.updatedAt)), el('br'), el('small', {}, 'начал ' + fmt(d.startedAt))),
    el('td', { class: 'hide-sm' }, d.reminded ? 'отправлено' : el('small', {}, '—')),
    el('td', {}, action('Удалить', async () => {
      if (confirm('Удалить незаконченный бриф ' + d.client + '? Клиенту ничего не придёт.')) renderDrafts((await api('/api/drafts/delete', { userId: d.userId })).drafts);
    }, 'small ghost danger'))));
  $('draftsTable').replaceChildren(el('div', { class: 'table-wrap' }, el('table', {},
    el('thead', {}, el('tr', {}, el('th', {}, 'Клиент'), el('th', {}, 'Шаг'), el('th', { class: 'hide-sm' }, 'Уже ответил'), el('th', {}, 'Активность'), el('th', { class: 'hide-sm' }, 'Напоминание'), el('th', {}, ''))),
    el('tbody', {}, rows))));
}

// ---------- відгуки ----------
const starsText = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

async function loadReviews() { renderReviews(await api('/api/reviews')); }

function renderReviews(data) {
  const dist = [5, 4, 3, 2, 1].map((n) => data.items.filter((r) => r.rating === n).length);
  $('reviewStats').replaceChildren(
    el('div', { class: 'stat accent' }, el('b', {}, data.avg ? '⭐ ' + data.avg : '—'), el('span', {}, 'Средняя оценка')),
    el('div', { class: 'stat' }, el('b', {}, String(data.count)), el('span', {}, 'Отзывов'), el('small', {}, 'запросов отправлено: ' + data.asked)),
    el('div', { class: 'stat' }, el('b', {}, String(data.published)), el('span', {}, 'В каталоге')),
    el('div', { class: 'stat' }, el('span', {}, 'Оценки'), el('small', {}, dist.map((c, i) => (5 - i) + '★ — ' + c).join(' · '))));
  if (!data.items.length) {
    $('reviewsList').replaceChildren(el('p', { class: 'muted' }, 'Отзывов пока нет. Они появятся после первых выполненных заказов.'));
    return;
  }
  $('reviewsList').replaceChildren(...data.items.map((r) => {
    const toggle = el('input', { type: 'checkbox', checked: r.published });
    toggle.addEventListener('change', async () => {
      try { renderReviews(await api('/api/reviews/publish', { orderId: r.orderId, published: toggle.checked })); }
      catch (err) { alert(err.message); toggle.checked = !toggle.checked; }
    });
    return el('div', { class: 'review' + (r.rating <= 3 ? ' low' : '') },
      el('div', { class: 'review-head' },
        el('span', { class: 'stars' }, starsText(r.rating)),
        el('a', { href: '#orders/' + r.orderId }, no(r.orderId)), el('span', {}, r.client), r.service ? el('span', { class: 'muted' }, r.service) : null,
        r.via === 'app' ? el('span', { class: 'status new' }, 'из Mini App') : null, el('small', {}, fmt(r.at))),
      r.comment ? el('p', {}, '«' + r.comment + '»') : el('p', { class: 'muted' }, 'Без комментария'),
      el('label', { class: 'check' }, toggle, 'Показывать клиентам — в каталоге бота и в Mini App на главной и странице услуги (имя «' + (r.name.split(' ')[0] || 'клієнт') + '»)'),
      reviewPostControl(r, data.channels || []));
  }));
}

// ---------- розсилка ----------
let bcPoll = null;
const BC_STATUS = { sending: '⏳ идёт', done: '✅ завершена', cancelled: '⏹ остановлена', interrupted: '⚠️ прервана перезапуском' };
const AUD = { all: 'всем', orders: 'с заказами', no_orders: 'без заказов', source: 'по метке', lang_uk: 'украиноязычным', lang_en: 'англоязычным' };

async function loadBroadcast() {
  const data = await api('/api/broadcast');
  const sel = $('bcSource');
  const current = sel.value;
  sel.replaceChildren(...(data.sources.length ? data.sources.map((s) => el('option', { value: s }, s)) : [el('option', { value: '' }, 'меток пока нет')]));
  if (current) sel.value = current;
  renderBroadcast(data);
  updateBcCount();
}

function renderBroadcast(data) {
  const run = data.running;
  const box = $('bcRunning');
  if (run) {
    box.classList.remove('hidden');
    box.replaceChildren('📨 Идёт рассылка: отправлено ' + run.sent + ' из ' + run.total + (run.blocked ? ', заблокировали бота: ' + run.blocked : '') + ' ',
      action('Остановить', async () => { if (confirm('Остановить рассылку?')) renderBroadcast(await api('/api/broadcast/cancel', {})); }, 'small ghost danger'));
    if (!bcPoll) bcPoll = setInterval(() => { if (state.tab === 'broadcast') api('/api/broadcast').then(renderBroadcast).catch(() => {}); }, 3000);
  } else {
    box.classList.add('hidden');
    if (bcPoll) { clearInterval(bcPoll); bcPoll = null; }
  }
  const hist = data.history;
  if (!hist.length) { $('bcHistory').replaceChildren(el('p', { class: 'muted' }, 'Рассылок ещё не было.' + (data.unsubscribed ? ' Отписались: ' + data.unsubscribed + '.' : ''))); return; }
  $('bcHistory').replaceChildren(
    data.unsubscribed ? el('p', { class: 'muted' }, 'Отписались от рассылок: ' + data.unsubscribed) : null,
    el('div', { class: 'table-wrap' }, el('table', {},
      el('thead', {}, el('tr', {}, el('th', {}, 'Когда'), el('th', {}, 'Текст'), el('th', { class: 'hide-sm' }, 'Кому'), el('th', {}, 'Доставлено'), el('th', {}, 'Статус'))),
      el('tbody', {}, hist.map((j) => el('tr', {},
        el('td', {}, el('small', {}, fmt(j.createdAt))),
        el('td', {}, j.text.length > 90 ? j.text.slice(0, 90) + '…' : j.text, j.photo ? el('small', {}, ' 🖼') : null),
        el('td', { class: 'hide-sm' }, el('small', {}, AUD[j.audience.type] + (j.audience.type === 'source' ? ' «' + j.audience.source + '»' : ''))),
        el('td', {}, j.sent + ' / ' + j.total, (j.blocked || j.failed) ? el('small', {}, el('br'), (j.blocked ? 'заблок.: ' + j.blocked : '') + (j.failed ? ' ошибок: ' + j.failed : '')) : null),
        el('td', {}, BC_STATUS[j.status] || j.status)))))));
}

function bcData() {
  return Object.fromEntries(new FormData($('bcForm')).entries());
}

async function updateBcCount() {
  const f = bcData();
  $('bcUrlFields').classList.toggle('hidden', f.buttonKind !== 'url');
  $('bcSourceField').classList.toggle('hidden', f.audience !== 'source');
  try {
    const r = await api('/api/broadcast/count', { audience: f.audience, source: f.source });
    $('bcCount').textContent = 'Получат: ' + r.count + ' чел. (без заблокировавших бота и отписавшихся)';
  } catch (e) { /* тихо */ }
}
for (const id of ['bcButtonKind', 'bcAudience', 'bcSource']) $(id).addEventListener('change', updateBcCount);

$('bcTest').addEventListener('click', async () => {
  $('bcError').textContent = ''; $('bcOk').textContent = '';
  try { await api('/api/broadcast/test', bcData()); $('bcOk').textContent = 'Тест отправлен вам в Telegram — посмотрите, как выглядит.'; }
  catch (err) { $('bcError').textContent = err.message; }
});

bindForm('bcForm', async (data, form) => {
  const count = (await api('/api/broadcast/count', { audience: data.audience, source: data.source })).count;
  if (!confirm('Отправить рассылку ' + count + ' клиентам? Отменить уже отправленные сообщения будет нельзя.')) return;
  renderBroadcast(await api('/api/broadcast/send', data));
  form.reset();
  updateBcCount();
  $('bcOk').textContent = 'Рассылка запущена — прогресс вверху страницы.';
}, 'bcError', 'bcOk');

// ---------- канал: публікації ----------
const ch = { data: null, files: [], buttons: [] };

const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const okUrl = (u) => /^(https?:\\/\\/|tg:\\/\\/)\\S+$/i.test(u || '');

/** DOM редактора → HTML у форматі Telegram (лише дозволені теги). */
function toTgHtml(node) {
  let out = '';
  for (const n of node.childNodes) {
    if (n.nodeType === 3) { out += escHtml(n.nodeValue.replace(/\\u00a0/g, ' ')); continue; }
    if (n.nodeType !== 1) continue;
    const tag = n.tagName;
    if (tag === 'BR') { out += '\\n'; continue; }
    const inner = toTgHtml(n);
    if (tag === 'DIV' || tag === 'P') {
      const block = inner === '\\n' ? '' : inner;
      out += (out && !out.endsWith('\\n') ? '\\n' : '') + block;
      continue;
    }
    if (!inner) continue;
    if (tag === 'B' || tag === 'STRONG') out += '<b>' + inner + '</b>';
    else if (tag === 'I' || tag === 'EM') out += '<i>' + inner + '</i>';
    else if (tag === 'U') out += '<u>' + inner + '</u>';
    else if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') out += '<s>' + inner + '</s>';
    else if (tag === 'CODE') out += '<code>' + inner + '</code>';
    else if (tag === 'BLOCKQUOTE') out += (out && !out.endsWith('\\n') ? '\\n' : '') + '<blockquote>' + inner + '</blockquote>\\n';
    else if (tag === 'A' && okUrl(n.getAttribute('href'))) out += '<a href="' + escHtml(n.getAttribute('href')) + '">' + inner + '</a>';
    else if (tag === 'SPAN' && n.classList.contains('spoiler')) out += '<tg-spoiler>' + inner + '</tg-spoiler>';
    else out += inner;
  }
  return out;
}

/** HTML Telegram → безпечні DOM-вузли для предпросмотру (лише дозволені теги). */
function fromTgHtml(html) {
  const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
  const map = { B: 'b', I: 'i', U: 'u', S: 's', CODE: 'code', BLOCKQUOTE: 'blockquote' };
  const build = (src, dst) => {
    for (const n of src.childNodes) {
      if (n.nodeType === 3) { dst.append(document.createTextNode(n.nodeValue)); continue; }
      if (n.nodeType !== 1) continue;
      let node;
      if (map[n.tagName]) node = document.createElement(map[n.tagName]);
      else if (n.tagName === 'TG-SPOILER') { node = document.createElement('span'); node.className = 'spoiler'; node.addEventListener('click', () => node.classList.toggle('shown')); }
      else if (n.tagName === 'A' && okUrl(n.getAttribute('href'))) { node = document.createElement('a'); node.href = n.getAttribute('href'); node.target = '_blank'; node.rel = 'noopener noreferrer'; }
      else node = document.createDocumentFragment();
      build(n, node);
      dst.append(node);
    }
  };
  const frag = document.createDocumentFragment();
  build(doc.body.firstChild, frag);
  return frag;
}

const plainLen = (html) => html.replace(/<[^>]+>/g, '').replace(/&(lt|gt|amp|quot|#\\d+);/g, 'x').length;

function postHtml() {
  return toTgHtml($('chEditor')).replace(/\\n{3,}/g, '\\n\\n').trim();
}

/** Те саме, що signatureHtml на сервері: [текст](адреса) → посилання, U+1F7E0 → 🟠. */
function sigHtml(raw) {
  const s = String(raw || '').trim().replace(/U\\+([0-9A-Fa-f]{4,6})/g, (m, hex) => {
    const cp = parseInt(hex, 16);
    return cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
  });
  const inline = (t) => escHtml(t).replace(/\\*\\*([^*\\n]{1,100})\\*\\*/g, '<b>$1</b>');
  let out = '';
  let last = 0;
  for (const m of s.matchAll(/\\[([^\\]\\n]{1,100})\\]\\(([^)\\s]{1,300})\\)/g)) {
    out += inline(s.slice(last, m.index));
    const url = /^(https?|tg):\\/\\//i.test(m[2]) ? m[2] : 'https://' + m[2].replace(/^\\/+/, '');
    out += '<a href="' + escHtml(url) + '">' + inline(m[1]) + '</a>';
    last = m.index + m[0].length;
  }
  return out + inline(s.slice(last));
}

// --- Конструктор підпису ---
const SIG_DEFAULT = {
  intro: '', separator: '🟠', layout: 'line', bold: false,
  links: [{ label: 'Сайт', url: '' }, { label: 'Instagram', url: '' }, { label: 'Threads', url: '' }],
};

/** Збирає підпис у форматі [назва](адреса) з полів конструктора. */
function buildSignature(b) {
  const links = b.links.filter((l) => l.label.trim() && l.url.trim())
    .map((l) => {
      const label = l.label.trim().replace(/[\\[\\]]/g, '');
      return '[' + (b.bold ? '**' + label + '**' : label) + '](' + l.url.trim().replace(/\\s+/g, '') + ')';
    });
  const sep = (b.separator || '').trim();
  const body = b.layout === 'column'
    ? links.map((l) => (sep ? sep + ' ' : '') + l).join('\\n')
    : links.join(sep ? ' ' + sep + ' ' : '  ');
  const intro = b.intro.trim();
  return [intro ? (b.bold ? '**' + intro + '**' : intro) : '', body].filter(Boolean).join('\\n');
}

function readBuilder() {
  const f = $('sigBuilder');
  const sepChoice = f.querySelector('input[name=sep]:checked');
  return {
    intro: f.intro.value,
    separator: sepChoice && sepChoice.value === 'custom' ? f.sepCustom.value : (sepChoice ? sepChoice.value : '🟠'),
    layout: f.layout.value,
    bold: f.bold.checked,
    links: [0, 1, 2].map((i) => ({ label: f['label' + i].value, url: f['url' + i].value })),
  };
}

function fillBuilder(b) {
  const v = { ...SIG_DEFAULT, ...(b || {}) };
  const f = $('sigBuilder');
  f.intro.value = v.intro;
  f.layout.value = v.layout;
  f.bold.checked = v.bold;
  const preset = [...f.querySelectorAll('input[name=sep]')].find((r) => r.value === v.separator);
  (preset || f.querySelector('input[name=sep][value=custom]')).checked = true;
  f.sepCustom.value = preset ? '' : v.separator;
  (v.links.length ? v.links : SIG_DEFAULT.links).slice(0, 3).forEach((l, i) => { f['label' + i].value = l.label; f['url' + i].value = l.url; });
  renderBuilderPreview();
}

function renderBuilderPreview() {
  const sig = buildSignature(readBuilder());
  $('sigBuilderPreview').replaceChildren(sig ? fromTgHtml(sigHtml(sig)) : document.createTextNode('Заполните хотя бы одну ссылку'));
}

/** {дата} і {бот} — так само, як бот підставить при публікації. */
function fillPh(html) {
  const date = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  return html.replace(/\\{дата\\}/gi, date).replace(/\\{бот\\}/gi, ch.data && ch.data.bot ? '@' + ch.data.bot : '');
}

function fullHtml() {
  const sig = $('chSig').checked && ch.data && ch.data.signature.trim();
  const html = fillPh(postHtml());
  return sig ? html + (html ? '\\n\\n' : '') + sigHtml(ch.data.signature) : html;
}

function renderSigPreview() {
  const box = $('chSigPreview');
  const raw = $('chSigForm').signature.value;
  box.replaceChildren(raw.trim() ? fromTgHtml(sigHtml(raw)) : document.createTextNode('—'));
}

function buttonRows() {
  const rows = [];
  for (const b of ch.buttons) {
    if (!b.text.trim() || !b.url.trim()) continue;
    const btn = { text: b.text.trim(), url: b.url.trim() };
    if (b.sameRow && rows.length && rows[rows.length - 1].length < 4) rows[rows.length - 1].push(btn); else rows.push([btn]);
  }
  return rows;
}

// --- Панель форматування ---
function wrapSelection(tag, cls) {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed || !$('chEditor').contains(sel.anchorNode)) return;
  const range = sel.getRangeAt(0);
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  el.append(range.extractContents());
  range.insertNode(el);
  sel.removeAllRanges();
  const r = document.createRange(); r.selectNodeContents(el); sel.addRange(r);
}

$('chToolbar').addEventListener('mousedown', (e) => e.preventDefault()); // не втрачати виділення
$('chToolbar').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  $('chEditor').focus();
  document.execCommand('styleWithCSS', false, false);
  const cmd = btn.dataset.cmd;
  if (cmd === 'bold' || cmd === 'italic' || cmd === 'underline') document.execCommand(cmd);
  else if (cmd === 'strike') document.execCommand('strikeThrough');
  else if (cmd === 'spoiler') wrapSelection('span', 'spoiler');
  else if (cmd === 'code') wrapSelection('code');
  else if (cmd === 'quote') wrapSelection('blockquote');
  else if (cmd === 'link') {
    const url = prompt('Ссылка (https://…)', 'https://');
    if (url && okUrl(url)) document.execCommand('createLink', false, url);
    else if (url) alert('Ссылка должна начинаться с https://');
  } else if (cmd === 'clear') {
    const sel = window.getSelection();
    if (sel.rangeCount && !sel.isCollapsed) document.execCommand('insertText', false, sel.toString());
  }
  renderChPreview();
});
$('chEditor').addEventListener('paste', (e) => {
  e.preventDefault();
  document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
});
$('chEditor').addEventListener('input', renderChPreview);

// --- Медіа ---
async function uploadFiles(list) {
  for (const file of [...list]) {
    if (ch.files.length >= 10) { $('chError').textContent = 'Не больше 10 файлов в посте.'; break; }
    if (file.size > 20 * 1024 * 1024) { $('chError').textContent = '«' + file.name + '» больше 20 МБ.'; continue; }
    const item = { name: file.name, type: file.type, url: URL.createObjectURL(file), busy: true };
    ch.files.push(item);
    renderThumbs(); renderChPreview();
    try {
      const res = await fetch('/api/channel/upload', {
        method: 'POST', credentials: 'same-origin', body: file,
        headers: { 'content-type': file.type || 'application/octet-stream', 'x-filename': encodeURIComponent(file.name), 'x-yabot': '1' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка загрузки');
      Object.assign(item, { id: data.id, kind: data.kind, busy: false });
    } catch (err) {
      ch.files.splice(ch.files.indexOf(item), 1);
      $('chError').textContent = '«' + file.name + '»: ' + err.message;
    }
    renderThumbs(); renderChPreview();
  }
}

function renderThumbs() {
  $('chThumbs').replaceChildren(...ch.files.map((f) => {
    const kind = f.kind || (f.type.startsWith('image/') ? 'photo' : f.type.startsWith('video/') ? 'video' : 'document');
    const media = kind === 'photo' || kind === 'animation' ? el('img', { src: f.url, alt: '' })
      : kind === 'video' ? el('video', { src: f.url, muted: true }) : el('span', {}, '📎 ' + f.name);
    const rm = el('button', { type: 'button', title: 'Убрать' }, '✕');
    rm.addEventListener('click', () => { ch.files.splice(ch.files.indexOf(f), 1); URL.revokeObjectURL(f.url); renderThumbs(); renderChPreview(); });
    return el('div', { class: 'ch-thumb' }, media, rm, f.busy ? el('div', { class: 'busy' }, '⏳') : null);
  }));
}

$('chPick').addEventListener('click', () => $('chFiles').click());
$('chFiles').addEventListener('change', (e) => { $('chError').textContent = ''; uploadFiles(e.target.files); e.target.value = ''; });
const drop = $('chDrop');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); $('chError').textContent = ''; uploadFiles(e.dataTransfer.files); });

// --- Кнопки ---
function renderButtons() {
  $('chButtons').replaceChildren(...ch.buttons.map((b, i) => {
    const text = el('input', { placeholder: 'Текст кнопки', maxlength: 64, value: b.text });
    const url = el('input', { placeholder: 'https://…', value: b.url, spellcheck: 'false' });
    const same = el('input', { type: 'checkbox', checked: b.sameRow });
    text.addEventListener('input', () => { b.text = text.value; renderChPreview(); });
    url.addEventListener('input', () => { b.url = url.value; renderChPreview(); });
    same.addEventListener('change', () => { b.sameRow = same.checked; renderChPreview(); });
    const rm = el('button', { type: 'button', class: 'small ghost danger' }, '✕');
    rm.addEventListener('click', () => { ch.buttons.splice(i, 1); renderButtons(); renderChPreview(); });
    return el('div', { class: 'ch-btn-row' }, text, url, i ? el('label', {}, same, 'в ряд') : el('span'), rm);
  }));
}
$('chAddBtn').addEventListener('click', () => { ch.buttons.push({ text: '', url: 'https://', sameRow: false }); renderButtons(); });
$('chAddOrder').addEventListener('click', () => {
  if (!ch.data || !ch.data.bot) return alert('Имя бота ещё не известно — подождите подключения к Telegram.');
  ch.buttons.push({ text: '🚀 Замовити стікери', url: 'https://t.me/' + ch.data.bot + '?start=channel', sameRow: false });
  renderButtons(); renderChPreview();
});
for (const id of ['chSig', 'chSilent', 'chNoPreview', 'chPin', 'chProtect', 'chTarget']) $(id).addEventListener('change', renderChPreview);

// --- Предпросмотр ---
function renderChPreview() {
  const target = ch.data && ch.data.channels.find((c) => String(c.id) === $('chTarget').value);
  const html = fullHtml();
  const len = plainLen(html);
  const files = ch.files;
  const rows = buttonRows();
  const head = el('div', { class: 'tg-head' },
    el('div', { class: 'tg-ava' }, target ? target.title.slice(0, 1).toUpperCase() : 'Y'),
    el('div', {}, el('b', {}, target ? target.title : 'Выберите канал'), el('small', {}, target ? (target.type === 'channel' ? 'канал' : 'группа') + (target.username ? ' · @' + target.username : '') : '')));
  const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const meta = () => el('div', { class: 'tg-meta' }, ($('chPin').checked ? '📌 ' : '') + ($('chSilent').checked ? '🔕 ' : '') + (target && target.type === 'channel' ? '👁 1 · ' : '') + time);
  const textBlock = () => el('div', { class: 'tg-text' }, fromTgHtml(html));
  const btnBlock = () => rows.length ? el('div', { class: 'tg-buttons' }, rows.map((r) => el('div', {}, r.map((b) => el('span', {}, b.text + ' ↗'))))) : null;

  const visual = files.filter((f) => (f.kind || '') === 'photo' || (f.kind || '') === 'video' || (!f.kind && /^(image|video)\\//.test(f.type)));
  const docs = files.filter((f) => !visual.includes(f));
  const mediaBlock = () => {
    const parts = [];
    if (visual.length) {
      const cls = visual.length === 1 ? 'n1' : visual.length === 2 ? 'n2' : visual.length === 4 ? 'n4' : 'many';
      parts.push(el('div', { class: 'tg-media ' + cls }, visual.map((f) => (f.kind === 'video' || f.type.startsWith('video/')) ? el('video', { src: f.url, muted: true, controls: true }) : el('img', { src: f.url, alt: '' }))));
    }
    for (const d of docs) parts.push(el('div', { class: 'tg-file' }, el('b', {}, d.kind === 'animation' ? 'GIF' : '📄'), el('span', {}, d.name)));
    return parts;
  };

  const msgs = [];
  const notes = [];
  if (!files.length && !len) {
    msgs.push(el('div', { class: 'tg-empty' }, 'Начните писать пост — здесь появится, как он будет выглядеть в Telegram.'));
  } else if (!files.length) {
    msgs.push(el('div', { class: 'tg-msg' }, textBlock(), meta()), btnBlock());
    if (len > 4096) notes.push('⚠️ Текст длиннее 4096 символов — Telegram не примет.');
  } else {
    // Так само, як відправляє бот: підпис до медіа ≤1024; в альбомі кнопки й довгий текст — окремим повідомленням
    const captionFits = len <= 1024 && !(files.length > 1 && rows.length);
    msgs.push(el('div', { class: 'tg-msg' }, mediaBlock(), captionFits && len ? textBlock() : null, meta()));
    if (captionFits) msgs.push(btnBlock());
    else {
      if (len || rows.length) msgs.push(el('div', { class: 'tg-msg' }, len ? textBlock() : null, meta()), btnBlock());
      notes.push(len > 1024 ? 'Подпись к медиа в Telegram — до 1024 символов, поэтому текст уйдёт отдельным сообщением.' : 'К альбому нельзя прикрепить кнопки — текст с кнопками уйдёт отдельным сообщением.');
    }
  }
  $('chPreview').replaceChildren(head, ...msgs.filter(Boolean));
  $('chPreviewNote').textContent = notes.join(' ');
  const limit = files.length ? 1024 : 4096;
  $('chCounter').textContent = 'Символов: ' + len + ' / ' + limit + (files.length ? ' (подпись к медиа)' : '') + ($('chSig').checked && ch.data && ch.data.signature ? ' · с подписью' : '');
  $('chCounter').className = len > (files.length ? 4096 : 4096) ? 'error' : 'muted';
}

// --- Дані вкладки ---
async function loadChannel() { renderChannel(await api('/api/channel')); }

function renderChannel(d) {
  ch.data = d;
  $('aiBox').classList.toggle('hidden', !d.aiWriter);
  const sel = $('chTarget');
  const cur = sel.value;
  sel.replaceChildren(...d.channels.map((c) => el('option', { value: String(c.id) }, (c.type === 'channel' ? '📣 ' : '👥 ') + c.title + (c.username ? ' (@' + c.username + ')' : ''))));
  if (cur && d.channels.some((c) => String(c.id) === cur)) sel.value = cur;
  $('chNoChannels').classList.toggle('hidden', d.channels.length > 0);
  if (!d.channels.length) $('chManage').classList.remove('hidden');
  const sigPlain = d.signature ? sigHtml(d.signature).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\\n/g, ' ') : '';
  $('chSigText').textContent = sigPlain ? '«' + (sigPlain.length > 40 ? sigPlain.slice(0, 40) + '…' : sigPlain) + '»' : '(не задана)';
  if (document.activeElement !== $('chSigForm').signature) $('chSigForm').signature.value = d.signature;
  renderSigPreview();
  if (!$('sigBuilder').contains(document.activeElement)) fillBuilder(d.signatureBuilder);
  renderTemplates(d.templates || []);

  $('chList').replaceChildren(...(d.channels.length ? d.channels.map((c) => el('div', { class: 'ch-item' },
    el('span', {}, c.type === 'channel' ? '📣' : '👥'),
    el('div', { class: 'grow' }, el('b', {}, c.title), el('br'), el('small', { class: 'small-muted' },
      (c.username ? '@' + c.username + ' · ' : '') + 'ID ' + c.id + (c.canPin ? ' · может закреплять' : ' · без права закрепления') + (c.canDelete ? ' · может удалять' : ''))),
    action('Убрать', async () => { if (confirm('Убрать «' + c.title + '» из списка? Из самого канала бот не выйдет.')) renderChannel(await api('/api/channel/remove', { id: c.id })); }, 'small ghost danger')))
    : [el('p', { class: 'muted' }, 'Пока нет каналов.')]));

  $('chQueue').replaceChildren(...(d.queue.length ? d.queue.map((q) => el('div', { class: 'ch-item' },
    el('span', {}, '⏰'), el('div', { class: 'grow' }, el('b', {}, fmt(q.at) + ' · ' + q.chatTitle), el('br'), el('small', { class: 'small-muted' }, (q.text || '(без текста)') + (q.files ? ' · медиа: ' + q.files : ''))),
    action('Отменить', async () => { if (confirm('Отменить публикацию?')) renderChannel(await api('/api/channel/cancel', { id: q.id })); }, 'small ghost danger')))
    : [el('p', { class: 'muted' }, 'Нет запланированных постов.')]));

  $('chHistory').replaceChildren(...(d.posts.length ? d.posts.map((p) => el('div', { class: 'ch-item' },
    el('span', {}, p.deleted ? '🗑' : '✅'),
    el('div', { class: 'grow' }, el('b', {}, fmt(p.sentAt) + ' · ' + p.chatTitle), p.pinned ? ' 📌' : null, el('br'),
      el('small', { class: 'small-muted' }, (p.text || '(без текста)') + (p.files ? ' · медиа: ' + p.files : '') + (p.deleted ? ' · удалён' : '')),
      p.tracked ? el('div', { class: 'post-stats' },
        el('span', { title: 'Сколько раз нажали кнопку или ссылку на бота в этом посте' }, '👆 переходов: ' + p.stats.starts),
        el('span', { title: 'Разных людей; в скобках — впервые пришли в бота' }, '👤 людей: ' + p.stats.people + (p.stats.newPeople ? ' (новых ' + p.stats.newPeople + ')' : '')),
        el('span', { title: 'Заявки, оформленные в течение 14 дней после перехода' }, '📝 заявок: ' + p.orders + (p.done ? ', готово: ' + p.done : '')),
        p.stats.people ? el('span', {}, '🎯 конверсия ' + Math.round((p.orders / p.stats.people) * 100) + '%') : null)
        : el('div', { class: 'small-muted' }, p.tracked === false ? 'Статистика: в посте нет кнопки или ссылки на бота' : 'Статистика считается для постов, опубликованных после обновления 2.12')),
    p.link && !p.deleted ? el('a', { href: p.link, target: '_blank', rel: 'noopener noreferrer', class: 'small-muted' }, 'Открыть') : null,
    !p.deleted && p.edit ? action('✏️ Изменить', async () => startEditPost(p), 'small ghost') : null,
    !p.deleted ? action('Удалить из канала', async () => { if (confirm('Удалить этот пост из «' + p.chatTitle + '»?')) renderChannel(await api('/api/channel/delete', { id: p.id })); }, 'small ghost danger') : null))
    : [el('p', { class: 'muted' }, 'Постов ещё не было.')]));
  renderChPreview();
}

$('chManageBtn').addEventListener('click', () => $('chManage').classList.toggle('hidden'));

// --- ІІ: чернетка поста ---
$('aiToggle').addEventListener('click', () => $('aiPanel').classList.toggle('hidden'));
$('aiGo').addEventListener('click', async () => {
  const btn = $('aiGo');
  $('aiPostError').textContent = '';
  const brief = $('aiBrief').value.trim();
  if (!brief) { $('aiPostError').textContent = 'Опишите, о чём пост.'; return; }
  const useCurrent = $('aiUseCurrent').checked;
  if ($('chEditor').textContent.trim() && !useCurrent && !confirm('Заменить текст в редакторе черновиком от ИИ?')) return;
  btn.disabled = true;
  btn.textContent = '⏳ Пишу… до минуты';
  try {
    const r = await api('/api/channel/ai', { brief, tone: $('aiTone').value, length: $('aiLength').value, lang: $('aiLang').value, current: useCurrent ? postHtml() : '' });
    $('chEditor').replaceChildren(fromTgHtml(r.html));
    renderChPreview();
  } catch (err) { $('aiPostError').textContent = err.message; }
  finally { btn.disabled = false; btn.textContent = '✨ Сгенерировать'; }
});

// --- Шаблони постів ---
function tplSnippet(t) {
  const text = t.html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\\s+/g, ' ').trim();
  return (text.length > 110 ? text.slice(0, 110) + '…' : text) || '(без текста)';
}

function renderTemplates(list) {
  const sel = $('tplSelect');
  const cur = sel.value;
  sel.replaceChildren(el('option', { value: '' }, list.length ? '📄 Шаблоны (' + list.length + ')…' : '📄 Шаблонов пока нет'),
    ...list.map((t) => el('option', { value: t.id }, t.name)));
  if (cur && list.some((t) => t.id === cur)) sel.value = cur;
  $('tplList').replaceChildren(...(list.length ? list.map((t) => el('div', { class: 'tpl-item' },
    el('div', { class: 'grow' }, el('b', {}, t.name), el('br'),
      el('small', { class: 'small-muted' }, tplSnippet(t) + (t.files.length ? ' · медиа: ' + t.files.length : '') + (t.buttons.length ? ' · кнопок: ' + t.buttons.length : ''))),
    el('div', { class: 'actions' },
      action('Вставить', () => applyTemplate(t), 'small'),
      action('Перезаписать текущим', async () => {
        if (!confirm('Заменить шаблон «' + t.name + '» тем, что сейчас в редакторе?')) return;
        renderChannel(await api('/api/channel/template/save', { ...templateBody(), id: t.id, name: t.name }));
      }, 'small ghost'),
      action('Переименовать', async () => {
        const name = prompt('Новое название шаблона', t.name);
        if (name && name.trim()) renderChannel(await api('/api/channel/template/rename', { id: t.id, name }));
      }, 'small ghost'),
      action('Удалить', async () => {
        if (confirm('Удалить шаблон «' + t.name + '»?')) renderChannel(await api('/api/channel/template/delete', { id: t.id }));
      }, 'small ghost danger'))))
    : [el('p', { class: 'muted' }, 'Шаблонов пока нет — соберите пост и нажмите «Сохранить как шаблон».')]));
}

function composerEmpty() {
  return !postHtml() && !ch.files.length && !ch.buttons.length;
}

function templateBody() {
  if (ch.files.some((f) => f.busy)) throw new Error('Дождитесь окончания загрузки файлов.');
  return {
    html: postHtml(), files: ch.files.map((f) => f.id), buttons: ch.buttons,
    options: { signature: $('chSig').checked, silent: $('chSilent').checked, noPreview: $('chNoPreview').checked, pin: $('chPin').checked, protect: $('chProtect').checked },
  };
}

async function applyTemplate(t) {
  if (!composerEmpty() && !confirm('Заменить текущий пост шаблоном «' + t.name + '»?')) return;
  $('chEditor').replaceChildren(fromTgHtml(t.html));
  ch.buttons = t.buttons.map((b) => ({ ...b }));
  $('chSig').checked = t.options.signature !== false;
  $('chSilent').checked = Boolean(t.options.silent);
  $('chNoPreview').checked = Boolean(t.options.noPreview);
  $('chPin').checked = Boolean(t.options.pin);
  $('chProtect').checked = Boolean(t.options.protect);
  ch.files.forEach((f) => URL.revokeObjectURL(f.url));
  ch.files = [];
  const missing = [];
  for (const f of t.files) {
    try {
      const res = await fetch('/api/channel/upload/' + f.id, { credentials: 'same-origin' });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      ch.files.push({ id: f.id, name: f.name, kind: f.kind, type: blob.type, url: URL.createObjectURL(blob), busy: false });
    } catch (e) { missing.push(f.name); }
  }
  ch.loadedTemplate = { id: t.id, name: t.name };
  $('tplLoaded').classList.remove('hidden');
  $('tplLoaded').textContent = 'Вставлен шаблон «' + t.name + '»' + (missing.length ? ' · не найдены файлы: ' + missing.join(', ') : '') + '. Правки в редакторе шаблон не меняют, пока вы его не перезапишете.';
  renderThumbs(); renderButtons(); renderChPreview();
  $('chEditor').focus();
}

$('tplInsert').addEventListener('click', () => {
  const t = ch.data && (ch.data.templates || []).find((x) => x.id === $('tplSelect').value);
  if (!t) { alert('Выберите шаблон в списке.'); return; }
  applyTemplate(t);
});
$('tplSelect').addEventListener('dblclick', () => $('tplInsert').click());
$('tplManageBtn').addEventListener('click', () => $('tplManage').classList.toggle('hidden'));
$('tplSave').addEventListener('click', async () => {
  $('chError').textContent = ''; $('chOk').textContent = '';
  try {
    const body = templateBody();
    if (!body.html && !body.files.length) throw new Error('Сначала напишите пост или добавьте медиа.');
    const first = tplSnippet({ html: body.html }).slice(0, 40);
    const name = prompt('Название шаблона', ch.loadedTemplate ? ch.loadedTemplate.name : first);
    if (!name || !name.trim()) return;
    const exists = (ch.data.templates || []).find((t) => t.name.toLowerCase() === name.trim().toLowerCase());
    if (exists && !confirm('Шаблон «' + exists.name + '» уже есть. Перезаписать?')) return;
    const r = await api('/api/channel/template/save', { ...body, name, id: exists ? exists.id : undefined });
    renderChannel(r);
    ch.loadedTemplate = { id: r.saved, name: name.trim() };
    $('tplSelect').value = r.saved;
    $('chOk').textContent = 'Шаблон «' + name.trim() + '» сохранён.';
  } catch (err) { $('chError').textContent = err.message; }
});
$('chSigForm').signature.addEventListener('input', renderSigPreview);
$('sigBuilder').addEventListener('input', renderBuilderPreview);
$('sigBuilder').addEventListener('change', renderBuilderPreview);
$('sigBuilder').sepCustom.addEventListener('focus', () => { $('sigBuilder').querySelector('input[name=sep][value=custom]').checked = true; });
$('sigBuild').addEventListener('click', () => {
  const sig = buildSignature(readBuilder());
  if (!sig) { alert('Заполните хотя бы одну ссылку: название и адрес.'); return; }
  $('chSigForm').signature.value = sig;
  renderSigPreview();
  $('chSigOk').textContent = 'Подпись собрана — проверьте и нажмите «Сохранить подпись».';
  $('chSigForm').signature.scrollIntoView({ block: 'center', behavior: 'smooth' });
});
bindForm('chAddForm', async (data, form) => { renderChannel(await api('/api/channel/add', { ref: data.ref })); form.reset(); }, 'chAddError');
bindForm('chSigForm', async (data) => {
  renderChannel(await api('/api/channel/signature', { signature: data.signature, builder: readBuilder() }));
  $('chSigOk').textContent = 'Подпись сохранена.';
}, null, 'chSigOk');

function postBody(extra) {
  if (ch.files.some((f) => f.busy)) throw new Error('Дождитесь окончания загрузки файлов.');
  const bad = ch.buttons.find((b) => (b.text.trim() || b.url.trim() !== 'https://') && (!b.text.trim() || !okUrl(b.url.trim())));
  if (bad) throw new Error('Проверьте кнопки: нужен текст и ссылка, начинающаяся с https://');
  return {
    chatId: $('chTarget').value, html: postHtml(), files: ch.files.map((f) => f.id), buttons: buttonRows(),
    signature: $('chSig').checked, silent: $('chSilent').checked, noPreview: $('chNoPreview').checked,
    pin: $('chPin').checked, protect: $('chProtect').checked, ...extra,
  };
}

async function chSend(extra, okText) {
  $('chError').textContent = ''; $('chOk').textContent = '';
  const btns = [$('chTest'), $('chPublish')];
  btns.forEach((b) => { b.disabled = true; });
  try {
    const r = await api('/api/channel/post', postBody(extra));
    if (!extra.test) renderChannel(r);
    $('chOk').textContent = typeof okText === 'function' ? okText(r) : okText;
    return r;
  } catch (err) { $('chError').textContent = err.message; return null; }
  finally { btns.forEach((b) => { b.disabled = false; }); }
}

function resetComposer() {
  $('chEditor').replaceChildren();
  ch.files.forEach((f) => URL.revokeObjectURL(f.url));
  ch.files = []; ch.buttons = [];
  ch.loadedTemplate = null;
  $('tplLoaded').classList.add('hidden');
  $('chSchedule').value = '';
  for (const id of ['chSilent', 'chNoPreview', 'chPin', 'chProtect']) $(id).checked = false;
  renderThumbs(); renderButtons(); renderChPreview();
}

$('chTest').addEventListener('click', () => chSend({ test: true }, 'Тест отправлен вам в Telegram — посмотрите, как выглядит пост.'));
$('chPublish').addEventListener('click', async () => {
  const target = ch.data && ch.data.channels.find((c) => String(c.id) === $('chTarget').value);
  if (!target) { $('chError').textContent = 'Выберите канал или группу.'; return; }
  const when = $('chSchedule').value;
  const scheduleAt = when ? new Date(when).toISOString() : null;
  if (!confirm(scheduleAt ? 'Запланировать пост в «' + target.title + '» на ' + fmt(scheduleAt) + '?' : 'Опубликовать пост в «' + target.title + '» сейчас?')) return;
  const r = await chSend({ scheduleAt }, (res) => res.result && res.result.scheduled ? 'Пост запланирован на ' + fmt(res.result.scheduled.at) + '.' : 'Опубликовано в «' + target.title + '».');
  if (r) resetComposer();
});
$('chSchedule').addEventListener('change', () => { $('chPublish').textContent = $('chSchedule').value ? 'Запланировать' : 'Опубликовать'; });

// ---------- робочі години ----------
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
$('whDays').replaceChildren(...DAYS.map((d, i) => el('label', { class: 'check day' }, el('input', { type: 'checkbox', name: 'day', value: String(i + 1) }), d)));

function renderHours(r) {
  const f = $('whForm');
  f.enabled.checked = r.hours.enabled;
  for (const box of f.querySelectorAll('input[name=day]')) box.checked = r.hours.days.includes(Number(box.value));
  f.from.value = r.hours.from;
  f.to.value = r.hours.to;
  if (document.activeElement !== f.message) f.message.value = r.hours.message || '';
  $('whPreview').textContent = r.preview;
  $('whNow').replaceChildren(!r.hours.enabled
    ? el('span', { class: 'muted' }, 'Автоответ выключен.')
    : r.working ? el('span', {}, el('span', { class: 'dot ok' }), 'Сейчас рабочее время.') : el('span', {}, el('span', { class: 'dot wait' }), 'Сейчас нерабочее время — бот отвечает автоответом.'));
}

bindForm('whForm', async (data, form) => {
  const days = [...form.querySelectorAll('input[name=day]:checked')].map((b) => Number(b.value));
  renderHours(await api('/api/workhours', { enabled: form.enabled.checked, days, from: data.from, to: data.to, message: data.message }));
  $('whOk').textContent = 'Сохранено.';
}, 'whError', 'whOk');

// ---------- каталог ----------
function renderCatalog(data) {
  const list = $('catalogList');
  if (!data.items.length) { list.replaceChildren(el('p', { class: 'muted' }, 'Каталог пуст — клиенты увидят «каталог наполняется». Добавьте первый стикерпак.')); return; }
  list.replaceChildren(...data.items.map((item, i) => {
    const desc = el('textarea', { rows: '2', maxlength: '500', placeholder: 'Описание для клиентов' });
    desc.value = item.description || '';
    const call = async (path, body) => renderCatalog(await api('/api/catalog/' + path, { id: item.id, ...body }));
    const buttons = [action('Сохранить описание', () => call('describe', { description: desc.value }))];
    if (i > 0) buttons.push(action('↑', () => call('move', { direction: -1 })));
    if (i < data.items.length - 1) buttons.push(action('↓', () => call('move', { direction: 1 })));
    buttons.push(action('Обновить из Telegram', () => call('refresh')));
    buttons.push(action('Удалить', async () => {
      if (confirm('Убрать «' + item.title + '» из каталога? Сам стикерпак в Telegram останется.')) await call('delete');
    }, 'danger'));
    return el('div', { class: 'work' },
      el('div', { class: 'work-head' }, el('a', { href: 'https://t.me/addstickers/' + item.name, target: '_blank', rel: 'noopener noreferrer' }, item.title),
        el('span', { class: 'muted' }, item.format + ' · ' + item.count)),
      desc, el('div', { class: 'work-actions' }, buttons));
  }));
}
async function loadCatalog() { renderCatalog(await api('/api/catalog')); }
bindForm('catalogForm', async (data, form) => { renderCatalog(await api('/api/catalog/add', data)); form.reset(); }, 'catalogError');

// ---------- ціни ----------
function fillPrices(prices) {
  const form = $('pricesForm');
  for (const input of form.querySelectorAll('input')) {
    const [type, qty] = input.name.split('.');
    input.value = (prices[type] && prices[type][qty]) || '';
  }
  form.note.value = prices.note || '';
}
async function loadPrices() { fillPrices((await api('/api/prices')).prices); await Promise.all([loadPromos(), loadPackages()]); }
bindForm('pricesForm', async (data) => {
  const body = { note: data.note, static: {}, animated: {} };
  for (const [key, value] of Object.entries(data)) {
    const [type, qty] = key.split('.');
    if (qty) body[type][qty] = value;
  }
  fillPrices((await api('/api/prices', body)).prices);
  $('pricesOk').textContent = 'Сохранено. Клиенты уже видят новые цены.';
}, 'pricesError', 'pricesOk');

// ---------- джерела ----------
async function loadSources() {
  const data = await api('/api/sources');
  state.botUsername = data.bot;
  if (!data.rows.length) { $('sourcesTable').replaceChildren(el('p', { class: 'muted' }, 'Пока никто не приходил.')); return; }
  $('sourcesTable').replaceChildren(el('div', { class: 'table-wrap' }, el('table', {},
    el('thead', {}, el('tr', {}, ['Метка', 'Пришли', 'Оставили заявку', 'Заявок', 'Готово', 'Конверсия'].map((h) => el('th', {}, h)))),
    el('tbody', {}, data.rows.map((r) => el('tr', {},
      el('td', {}, r.source ? el('span', { class: 'tag' }, r.source) : 'без метки (напрямую)', r.title ? el('div', { class: 'small-muted' }, r.title) : null),
      el('td', {}, String(r.users)), el('td', {}, String(r.buyers)), el('td', {}, String(r.orders)), el('td', {}, String(r.done)),
      el('td', {}, r.users ? Math.round((r.buyers / r.users) * 100) + '%' : '—')))))));
}
bindForm('sourceForm', async (data) => {
  const label = data.label.trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(label)) throw new Error('Метка — латинские буквы, цифры, «_» или «-», без пробелов.');
  if (!state.botUsername) await loadSources();
  if (!state.botUsername) throw new Error('Имя бота ещё не известно — подождите подключения к Telegram.');
  $('sourceLink').textContent = 'https://t.me/' + state.botUsername + '?start=' + label;
  $('sourceLinkBox').classList.remove('hidden');
}, 'sourceError');
$('copyLink').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('sourceLink').textContent);
    $('copyLink').textContent = 'Скопировано ✓';
    setTimeout(() => { $('copyLink').textContent = 'Копировать'; }, 2000);
  } catch (e) { $('sourceError').textContent = 'Не удалось скопировать — выделите ссылку вручную.'; }
});

// ---------- налаштування ----------
async function loadSettings() {
  const [s, sys] = await Promise.all([api('/api/settings'), api('/api/system')]);
  const f = $('settingsForm');
  if (document.activeElement !== f.adminChatId) f.adminChatId.value = s.adminChatId || '';
  $('activeText').replaceChildren(s.active
    ? el('span', {}, el('span', { class: 'dot ok' }), 'Бот принимает новые заказы.')
    : el('span', {}, el('span', { class: 'dot wait' }), 'Приём новых заказов на паузе.'));
  const btn = $('activeBtn');
  btn.textContent = s.active ? '⏸ Поставить приём на паузу' : '▶️ Возобновить приём заказов';
  btn.className = s.active ? 'ghost' : '';
  btn.onclick = async () => {
    if (s.active && !confirm('Поставить приём заказов на паузу? Клиенты увидят, что студия загружена.')) return;
    await api('/api/active', { active: !s.active });
    loadSettings();
    refreshBadges();
  };
  renderSystem(sys);
  renderHours(await api('/api/workhours'));
  renderReferral(await api('/api/referral'));
  renderPayments(await api('/api/payments'));
  renderAi(await api('/api/ai'));
  renderGenagent(await api('/api/genagent'));
  await loadSettings2();
  await loadSettings3();
  await loadArchiveCard();
  applySettingsGroup();
  renderLang(await api('/api/language'));
  renderQr((await api('/api/quick-replies')).replies);
}

function renderPayments(p) {
  const f = $('payForm');
  f.enabled.checked = p.enabled;
  f.mode.value = p.mode;
  f.percent.value = p.percent;
  f.fixed.value = p.fixed;
  f.validityHours.value = p.validityHours;
  if (document.activeElement !== f.destination) f.destination.value = p.destination;
  f.autoStart.checked = p.autoStart;
  f.autoInvoice.checked = Boolean(p.autoInvoice);
  f.cardEnabled.checked = Boolean(p.cardEnabled);
  f.cardNumber.value = p.cardNumber || '';
  f.cardRecipient.value = p.cardRecipient || '';
  f.cardNote.value = p.cardNote || '';
  f.remindDays.value = p.remindDays || 0;
  f.remindTimes.value = String(p.remindTimes || 2);
  f.token.value = '';
  togglePayMode();
  const pill = $('payState');
  pill.textContent = p.enabled ? '● включена' : '● выключена';
  pill.className = 'pill ' + (p.enabled ? 'ok' : 'warn');
  $('payTokenInfo').textContent = p.tokenSource === 'env'
    ? 'Токен задан секретом панели MONOBANK_TOKEN (' + p.tokenMasked + ') — поле можно не заполнять.'
    : p.tokenSource === 'page' ? 'Токен сохранён: ' + p.tokenMasked + '. Чтобы заменить — вставьте новый.' : 'Токен ещё не указан.';
  $('payClearToken').classList.toggle('hidden', p.tokenSource !== 'page');
  $('payStats').textContent = 'Оплачено авансов за 30 дней: ' + p.paid30.count + ' на сумму ' + p.paid30.sum.toLocaleString('ru-RU') + ' грн.'
    + (p.payReminders ? ' Напоминаний об остатке отправлено: ' + p.payReminders + '.' : '');
}

function togglePayMode() {
  const fixed = $('payForm').mode.value === 'fixed';
  $('payFixedField').classList.toggle('hidden', !fixed);
  $('payPercentField').classList.toggle('hidden', fixed);
}
$('payForm').mode.addEventListener('change', togglePayMode);

bindForm('payForm', async (data, form) => {
  if (form.enabled.checked && !confirm('Включить приём оплаты? У открытых заявок в Telegram появится кнопка «Рахунок на аванс».')) form.enabled.checked = false;
  renderPayments(await api('/api/payments', {
    enabled: form.enabled.checked, token: data.token, mode: data.mode, percent: Number(data.percent), fixed: Number(data.fixed),
    validityHours: Number(data.validityHours), destination: data.destination, autoStart: form.autoStart.checked, autoInvoice: form.autoInvoice.checked,
    cardEnabled: form.cardEnabled.checked, cardNumber: data.cardNumber, cardRecipient: data.cardRecipient, cardNote: data.cardNote,
    remindDays: Number(data.remindDays) || 0, remindTimes: Number(data.remindTimes) || 2,
  }));
  $('payOk').textContent = 'Сохранено.';
}, 'payError', 'payOk');

$('payVerify').addEventListener('click', async () => {
  $('payError').textContent = ''; $('payVerifyOk').textContent = '';
  try {
    const r = await api('/api/payments/verify', { token: $('payForm').token.value });
    $('payVerifyOk').textContent = '✅ Токен рабочий: ' + r.merchantName;
  } catch (err) { $('payError').textContent = err.message; }
});
$('payClearToken').addEventListener('click', async () => {
  if (!confirm('Удалить сохранённый токен? Приём оплаты выключится.')) return;
  const f = $('payForm');
  renderPayments(await api('/api/payments', { enabled: false, clearToken: true, mode: f.mode.value, percent: Number(f.percent.value), fixed: Number(f.fixed.value), validityHours: Number(f.validityHours.value), destination: f.destination.value, autoStart: f.autoStart.checked }));
});

function renderAi(a) {
  const f = $('aiForm');
  $('aiModel').replaceChildren(...a.models.map((m) => el('option', { value: m.id }, m.label)));
  f.model.value = a.model;
  f.briefIdeas.checked = a.briefIdeas;
  f.channelWriter.checked = a.channelWriter;
  f.key.value = '';
  const pill = $('aiState');
  pill.textContent = a.keySource ? '● ключ задан' : '● нет ключа';
  pill.className = 'pill ' + (a.keySource ? 'ok' : 'warn');
  $('aiKeyInfo').textContent = a.keySource === 'env'
    ? 'Ключ задан секретом панели ANTHROPIC_API_KEY (' + a.keyMasked + ') — поле можно не заполнять.'
    : a.keySource === 'page' ? 'Ключ сохранён: ' + a.keyMasked + '. Чтобы заменить — вставьте новый.' : 'Ключ не указан — ИИ-кнопки скрыты.';
  $('aiClearKey').classList.toggle('hidden', a.keySource !== 'page');
  $('aiStats').textContent = (a.usage ? 'В этом месяце: запросов ' + a.usage.calls + ', примерно $' + a.usage.cost.toFixed(2) + '. ' : '') +
    (a.briefsWithAi ? 'Заявок с эмоциями от ИИ: ' + a.briefsWithAi + '.' : '');
}
function renderGenagent(g) {
  const f = $('gaForm');
  f.url.value = g.url || '';
  f.key.value = '';
  f.enabled.checked = g.enabled;
  const pill = $('gaState');
  pill.textContent = !g.enabled ? '● выключено' : g.lastError ? '● ошибка' : '● подключено';
  pill.className = 'pill ' + (g.enabled && !g.lastError ? 'ok' : 'warn');
  $('gaKeyInfo').textContent = g.keyMasked ? 'Ключ сохранён: ' + g.keyMasked + '. Чтобы заменить — вставьте новый.' : 'Ключ не указан.';
  $('gaStatus').textContent = g.lastSyncAt ? 'Последняя отправка: ' + new Date(g.lastSyncAt).toLocaleString('ru-RU') + '.' : '';
  f.comments.checked = g.comments;
  f.chat.checked = g.chat;
  $('gaError').textContent = [g.enabled && g.lastError ? 'Не получилось отправить: ' + g.lastError : '', g.enabled && g.comments && g.commentsError ? 'Комментарии: ' + g.commentsError : '', g.enabled && g.chat && g.chatError ? 'Помощник: ' + g.chatError : ''].filter(Boolean).join(' · ');
}
bindForm('gaForm', async (data, form) => {
  renderGenagent(await api('/api/genagent', { url: data.url, key: data.key, enabled: form.enabled.checked, comments: form.comments.checked, chat: form.chat.checked }));
  if (!$('gaError').textContent) $('gaOk').textContent = form.enabled.checked ? 'Сохранено и отправлено агенту.' : 'Сохранено.';
}, 'gaError', 'gaOk');
$('gaSync').addEventListener('click', async () => {
  $('gaError').textContent = ''; $('gaOk').textContent = '';
  const b = $('gaSync');
  b.disabled = true;
  try {
    renderGenagent(await api('/api/genagent/sync', {}));
    $('gaOk').textContent = '✅ Агент получил актуальные цены и FAQ.';
  } catch (err) { $('gaError').textContent = err.message; } finally { b.disabled = false; }
});
bindForm('aiForm', async (data, form) => {
  renderAi(await api('/api/ai', { key: data.key, model: data.model, briefIdeas: form.briefIdeas.checked, channelWriter: form.channelWriter.checked }));
  $('aiOk').textContent = 'Сохранено.';
}, 'aiError', 'aiOk');
$('aiVerify').addEventListener('click', async () => {
  $('aiError').textContent = ''; $('aiVerifyOk').textContent = '';
  const b = $('aiVerify');
  b.disabled = true;
  try {
    const r = await api('/api/ai/verify', { key: $('aiForm').key.value });
    $('aiVerifyOk').textContent = '✅ Ключ рабочий, модель доступна: ' + r.model;
  } catch (err) { $('aiError').textContent = err.message; } finally { b.disabled = false; }
});
$('aiClearKey').addEventListener('click', async () => {
  if (!confirm('Удалить сохранённый ключ Claude API? ИИ-кнопки пропадут.')) return;
  const f = $('aiForm');
  renderAi(await api('/api/ai', { clearKey: true, model: f.model.value, briefIdeas: f.briefIdeas.checked, channelWriter: f.channelWriter.checked }));
});

function renderLang(l) {
  $('langForm').english.checked = l.english;
  $('langStats').textContent = 'Клиентов: украиноязычных ' + l.uk + ', англоязычных ' + l.en + '. Заявок на английском: ' + l.ordersEn + '.';
}
bindForm('langForm', async (data, form) => {
  renderLang(await api('/api/language', { english: form.english.checked }));
  $('langOk').textContent = 'Сохранено.';
}, 'langError', 'langOk');

let qrItems = [];
function renderQr(list) {
  qrItems = list.map((r) => ({ id: r.id, title: r.title, text: r.text, textEn: r.textEn || '' }));
  drawQr();
}
function drawQr() {
  $('qrList').replaceChildren(...(qrItems.length ? qrItems.map((r, i) => {
    const title = el('input', { value: r.title, maxlength: 40, placeholder: 'Название — видите только вы' });
    const text = el('textarea', { rows: 2, maxlength: 2000, placeholder: 'Текст клиенту (українською)' }, r.text);
    const textEn = el('textarea', { rows: 2, maxlength: 2000, placeholder: 'English — для англоязычных клиентов (необязательно)' }, r.textEn);
    title.addEventListener('input', () => { r.title = title.value; });
    text.addEventListener('input', () => { r.text = text.value; });
    textEn.addEventListener('input', () => { r.textEn = textEn.value; });
    return el('div', { class: 'qr-item' },
      el('div', { class: 'qr-head' }, el('b', {}, '/r ' + (i + 1)), title,
        i ? action('↑', () => { qrItems.splice(i - 1, 0, qrItems.splice(i, 1)[0]); drawQr(); }, 'small ghost') : null,
        action('✕', () => { qrItems.splice(i, 1); drawQr(); }, 'small ghost danger')),
      text, textEn);
  }) : [el('p', { class: 'muted' }, 'Шаблонов нет — добавьте первый.')]));
}
$('qrAdd').addEventListener('click', () => { qrItems.push({ title: '', text: '', textEn: '' }); drawQr(); });
$('qrSave').addEventListener('click', async () => {
  $('qrError').textContent = ''; $('qrOk').textContent = '';
  if (qrItems.some((r) => !r.title.trim() || !r.text.trim())) { $('qrError').textContent = 'У каждого шаблона должны быть название и текст.'; return; }
  try {
    renderQr((await api('/api/quick-replies', { replies: qrItems })).replies);
    $('qrOk').textContent = 'Сохранено.';
  } catch (err) { $('qrError').textContent = err.message; }
});

function renderReferral(r) {
  const f = $('refForm');
  f.enabled.checked = r.enabled;
  f.percent.value = r.percent;
  $('refStats').textContent = (r.enabled ? 'Включена. ' : 'Выключена. ') +
    'Пришли по приглашению: ' + r.invitedTotal + ', оформили заказ: ' + r.converted + ', неиспользованных бонусов: ' + r.bonusesOpen + '.' +
    (r.top.length ? ' Лучшие: ' + r.top.map((t) => t.name + ' (' + t.invited + ')').join(', ') + '.' : '');
}

bindForm('refForm', async (data, form) => {
  renderReferral(await api('/api/referral', { enabled: form.enabled.checked, percent: Number(data.percent) }));
  $('refOk').textContent = 'Сохранено.';
}, 'refError', 'refOk');

function renderSystem(sys) {
  $('historyInfo').textContent = 'Сейчас в истории заявок: ' + sys.orders + ', клиентов: ' + sys.clients +
    '. Следующая заявка получит номер ' + no(sys.nextOrderId) + '.' +
    (sys.historyClearedAt ? ' Последняя очистка: ' + fmt(sys.historyClearedAt) + '.' : '');
  const t = sys.telegram;
  const dot = t.state === 'ok' ? 'ok' : t.state === 'error' ? 'bad' : 'wait';
  const up = sys.uptimeSec > 86400 ? Math.floor(sys.uptimeSec / 86400) + ' дн' : sys.uptimeSec > 3600 ? Math.floor(sys.uptimeSec / 3600) + ' ч' : Math.floor(sys.uptimeSec / 60) + ' мин';
  $('systemInfo').replaceChildren(el('dl', { class: 'kv' },
    el('dt', {}, 'Telegram'), el('dd', {}, el('span', { class: 'dot ' + dot }), ({ ok: 'подключён', error: 'нет связи', waiting: 'подключается' }[t.state] || t.state) + (t.detail ? ' — ' + t.detail : '')),
    el('dt', {}, 'Версия бота'), el('dd', {}, sys.version + ' · Node ' + sys.node),
    el('dt', {}, 'Работает'), el('dd', {}, up + ' (запущен ' + fmt(sys.startedAt) + ')'),
    el('dt', {}, 'Сообщений'), el('dd', {}, 'получено ' + sys.messagesReceived + ', отправлено ' + sys.messagesSent),
    el('dt', {}, 'Данные'), el('dd', {}, (sys.dataSize >= 1048576 ? (sys.dataSize / 1048576).toFixed(1) + ' МБ' : Math.round(sys.dataSize / 1024) + ' КБ') + (sys.saveMs ? ' · сохранение ' + sys.saveMs + ' мс' : ''),
      sys.dataSize > 15 * 1048576 || sys.saveMs > 300 ? el('div', { class: 'small-muted' }, '⚠️ Файл данных большой — бот может отвечать медленнее. «Архив заявок»: уменьшите срок (например, до 90 дней) и нажмите «Перенести сейчас».') : null),
    el('dt', {}, 'Резервные копии'), el('dd', {}, sys.backups.length ? sys.backups.length + ' шт., последняя ' + sys.backups[0].replace('bot-data-', '').replace('.json', '') : 'пока нет')));
  $('errorsList').replaceChildren(...(sys.errors.length
    ? sys.errors.map((e) => el('div', { class: 'err-item' }, el('small', {}, fmt(e.createdAt) + ' · ' + e.area + (e.code ? ' · ' + e.code : '')), el('div', {}, e.message)))
    : [el('p', { class: 'muted' }, 'Ошибок нет 👍')]));
}

bindForm('historyForm', async (data, form) => {
  if (!confirm('Точно удалить всю историю заказов? Это действие нельзя отменить со страницы (только восстановлением копии в панели).')) return;
  const r = await api('/api/history/clear', {
    password: data.password, confirm: data.confirm,
    stats: Boolean(data.stats), drafts: Boolean(data.drafts), clients: Boolean(data.clients),
  });
  form.password.value = '';
  form.confirm.value = '';
  $('historyOk').textContent = 'Готово: удалено заявок — ' + r.removed.orders + '. Следующая заявка будет #0001. Копия данных: ' + r.backup;
  loadSettings();
  refreshBadges();
}, 'historyError', 'historyOk');

$('clearErrors').addEventListener('click', async () => {
  if (confirm('Очистить список ошибок?')) renderSystem(await api('/api/errors/clear', {}));
});

bindForm('settingsForm', async () => {
  await api('/api/settings', { adminChatId: $('settingsForm').adminChatId.value });
  $('settingsOk').textContent = 'Сохранено. Проверочное сообщение отправлено в Telegram.';
}, 'settingsError', 'settingsOk');

bindForm('passwordForm', async (data, form) => {
  await api('/api/password', data);
  form.reset();
  $('passwordOk').textContent = 'Пароль изменён.';
}, 'passwordError', 'passwordOk');

// ---------- вхід ----------
bindForm('setupForm', async (data) => {
  const r = await api('/api/setup', data);
  if (r.warning) alert(r.warning);
  await refresh();
}, 'setupError');

bindForm('loginForm', async (data, form) => {
  const r = await api('/api/login', data);
  form.reset();
  if (r.need2fa) { showCodeStep(r); return; }
  await refresh();
}, 'loginError');

$('logoutBtn').addEventListener('click', async () => {
  await api('/api/logout', {}).catch(() => {});
  await refresh();
});

async function refreshBadges() {
  try { setHeader(await api('/api/overview')); } catch (e) { /* тихо */ }
}

async function refresh() {
  const s = await fetch('/api/status', { credentials: 'same-origin' }).then((r) => r.json());
  $('botName').textContent = s.bot || '';
  if (!s.configured) {
    show('setupView');
    $('tokenPresetNote').classList.toggle('hidden', !s.tokenPreset);
    $('setupForm').token.required = !s.tokenPreset;
    return;
  }
  if (!s.loggedIn) { document.body.classList.remove('role-designer'); return show('loginView'); }
  applyRole(await api('/api/me'));
  show('dash');
  if (state.role !== 'designer') refreshBadges();
  routeFromHash();
}

refresh().catch((err) => { $('loading').textContent = err.message; });

// Автооновлення: огляд, список заявок і брифи — раз на 30 секунд (картку заявки не чіпаємо, щоб не збити введення)
setInterval(() => {
  if ($('tabs').classList.contains('hidden') || document.hidden) return;
  if (state.role !== 'designer') refreshBadges();
  if (state.tab === 'overview') loadOverview().catch(() => {});
  if (state.tab === 'orders' && !state.openOrder) loadOrders().catch(() => {});
  if (state.tab === 'drafts') loadDrafts().catch(() => {});
}, 30000);
`;
