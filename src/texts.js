// Усі тексти та кнопки бота (українською — як у брифі студії).
import { escapeHtml, plural, orderNo, dateText, clip } from './util.js';

// Скільки тексту героя та емоцій показуємо у зведенні брифу й картці заявки:
// разом з рештою полів повідомлення має вміститися в 4096 символів. Повний текст — у PDF і на сторінці бота.
export const SUMMARY_HERO = 600;
export const SUMMARY_EMOTIONS = 2000;

export const BTN_ORDER = '🚀 Розпочати';
export const BTN_ORDER_OLD = '📝 Замовити стікерпак';
export const BTN_MY_ORDERS = '📦 Мої замовлення';
export const BTN_ABOUT = 'ℹ️ Про студію';
export const BTN_WORKS = '🎨 Наші роботи';
export const BTN_PRICES = '💰 Вартість';
export const BTN_SHARE_CONTACT = '📱 Поділитися контактом';
export const BTN_FAQ = '❓ Питання';

export const LANG_SWITCH = '🇬🇧 English';
export const LANG_SET = 'Мова: українська 🇺🇦';

export const WELCOME =
  '👋 <b>Привіт! Ми — YABOT &amp; IRISKA.</b>\n\n' +
  'Тут народжуються персонажі, стікери, дизайн і вся та краса, через яку Telegram раптом стає трохи цікавішим 😎\n\n' +
  'А тепер замовляти стало ще простіше: у нашому боті працює <b>miniApp</b>, де можна обрати потрібну послугу, оформити замовлення та передати нам усі деталі без квесту з двадцяти повідомлень.\n\n' +
  '🤖 YABOT відповідає за технології, стиль і трохи роботизованого хаосу.\n' +
  '🧡 IRISKA — за те, щоб у всьому цьому залишались характер, емоції та людяність.\n\n' +
  'Заходьте в бот, відкривайте miniApp і створюймо щось круте разом.\n\n' +
  '<b>YABOT — DESIGN FOR HUMANS.</b>';
export const OPEN_APP = '🚀 Відкрити miniApp';
export const OPEN_IN_APP = '📱 Відкрити в miniApp';
export const finalFileCaption = (o) => `📦 Готові файли до замовлення #${orderNo(o.id)}`;
export const finalLinkMessage = (o, title) => `📦 <b>Готові файли до замовлення #${orderNo(o.id)}</b>${title ? `\n${escapeHtml(title)}` : ''}`;
export const FINAL_LINK_BUTTON = '⬇️ Відкрити файли';
export const stageOf = (n, total) => `Етап ${n} з ${total}`;
export const stageAnswerOk = (name) => `Етап «${name}»: все добре`;
export const stageAnswerChanges = (name) => `Етап «${name}»: є зауваження`;
const waitText = (ms) => { const m = Math.round(ms / 60000); return m < 60 ? `${m} мин` : `${Math.floor(m / 60)} ч${m % 60 ? ` ${m % 60} мин` : ''}`; };
export const replyAlertText = (o, ms, text) =>
  `⏰ <b>Клиент ждёт ответа</b> по #${orderNo(o.id)} уже ${waitText(ms)}` +
  (text ? `\n«${escapeHtml(String(text).slice(0, 200))}»` : '') + '\n\nОтветьте «Ответить» на это сообщение — ответ уйдёт клиенту.';
export const replyEscalateText = (o, ms, text, designer) =>
  `⚠️ <b>Без ответа уже ${waitText(ms)}</b> — #${orderNo(o.id)}${designer ? ` (дизайнер: ${escapeHtml(designer)})` : ''}` +
  (text ? `\n«${escapeHtml(String(text).slice(0, 200))}»` : '') + '\n\nМожно ответить прямо здесь — «Ответить» на это сообщение.';
export const stagePayIntro = (name, percent) => `🧩 Етап «${escapeHtml(name)}» — оплата ${percent}% вартості за планом оплати.`;
export const fixStudioText = (o, text) =>
  `✏️ <b>Правка после сдачи</b> — заявка #${orderNo(o.id)}\n«${escapeHtml(String(text).slice(0, 1500))}»\n\nОтветьте «Ответить» — ответ уйдёт клиенту. Когда внесёте правку — «Правка готова» в карточке заявки (страница или студия Mini App).`;
export const fixDoneClient = (o) => `✅ Правку до замовлення #${orderNo(o.id)} внесено. Дякуємо за терпіння! Якщо щось ще — пишіть 🙂`;
export const fixAcceptedClient = (o) => `✏️ Прийняли вашу правку до замовлення #${orderNo(o.id)} — дизайнер уже бачить її й напише, щойно внесе зміни.`;
export const reviewPromoText = (percent, code, until) =>
  `🎁 <b>Дякуємо за відгук!</b> Ось ваш персональний промокод на наступне замовлення — знижка ${percent}%:\n\n<code>${escapeHtml(code)}</code>\n\nДіє до ${until}. Він сам підставиться в наступну заявку.`;
export const supportOfferText = (o) =>
  `👋 <b>Як працює ваш бот «${escapeHtml(o.hero || '')}»?</b>\n\n` +
  'Минув час після запуску — якщо хочеться щось доробити, додати нові можливості чи доручити нам супровід (оновлення, підтримку, нові функції), ми радо допоможемо.';
export const SUPPORT_YES = '💬 Хочу обговорити';
export const SUPPORT_NO = '👍 Все чудово';
export const SUPPORT_NO_REPLY = 'Радіємо! Якщо щось знадобиться — просто напишіть сюди 🙂';
export const STAGE_ASK = 'Перевірте, будь ласка, і натисніть кнопку нижче 👇';
export const STAGE_OPEN_LINK = '🔗 Відкрити';
export const STAGE_OK_BUTTON = '✅ Все добре';
export const STAGE_CHANGES_BUTTON = '✏️ Є зауваження';
export const STAGE_OK_CLIENT = 'Дякуємо! Передали дизайнеру — рухаємось далі 🚀';
export const STAGE_CHANGES_CLIENT = 'Напишіть, що варто змінити, — повідомлення одразу отримає дизайнер ✍️';
export const stageAnswerStudio = (o, name, ok, text) => (ok
  ? `✅ <b>Клиент принял этап «${escapeHtml(name)}»</b> — заявка #${orderNo(o.id)}`
  : `✏️ <b>Замечания к этапу «${escapeHtml(name)}»</b> — заявка #${orderNo(o.id)}${text ? `\n\n${escapeHtml(text)}` : '\nКлиент напишет, что изменить, — сообщение придёт сюда.'}`);
export const projectStageMessage = (o, n, total, name) => `🚀 <b>Замовлення #${orderNo(o.id)}</b> — новий етап\n\nЕтап ${n} з ${total}: <b>${escapeHtml(name)}</b>`;
export const appDraftReminder = (svc) => `🧡 Ви почали заявку${svc ? ` на «${escapeHtml(svc)}»` : ''} у miniApp, але не відправили її.\n\nПродовжимо? Усе збережено — лишилось кілька кроків.`;
export const APP_DRAFT_BUTTON = '✍️ Продовжити заявку';

export const ABOUT =
  '🎨 <b>YABOT — студія, де народжуються стікери з характером!</b>\n\n' +
  'Створюємо статичні та анімовані стікерпаки для Telegram — ' +
  'для вас, вашої команди чи бренду.\n\n' +
  '<b>Як ми працюємо:</b>\n' +
  '1️⃣ Ви заповнюєте короткий бриф у цьому боті\n' +
  '2️⃣ Ми уточнюємо деталі та називаємо вартість\n' +
  '3️⃣ Малюємо ескізи й погоджуємо їх з вами\n' +
  '4️⃣ Віддаємо готовий стікерпак прямо в Telegram\n\n' +
  '🚀 Готові почати? Натискайте <b>«Розпочати»</b>!';

export const HELP =
  '/order — замовити стікерпак\n' +
  '/works — наші роботи\n' +
  '/prices — вартість\n' +
  '/my_orders — мої замовлення\n' +
  '/faq — часті питання\n' +
  '/language — English / Українська\n' +
  '/cancel — скасувати заповнення брифу';

// --- Каталог робіт ---

export const WORKS_EMPTY =
  'Каталог ще наповнюється — найкращі роботи вже на підході 🙂\n' +
  'А поки можемо створити стікерпак саме для вас: тисніть «🚀 Розпочати»!';

export const WORKS_LIST = '🎨 <b>Наші роботи</b>\n\nОберіть пак — покажемо живі стікери:';

const SET_TYPE_LABELS = { regular: '', static: 'Статичні', animated: 'Анімовані', video: 'Відео' };
const TYPE_EMOJI = { static: '🖼', animated: '✨', video: '🎬' };

export function workButtonLabel(item) {
  return `${TYPE_EMOJI[item.format] || '🎨'} ${item.title}`;
}

export function workCard(item) {
  const count = item.count ? `${item.count} ${plural(item.count, ['стікер', 'стікери', 'стікерів'])}` : '';
  const meta = [SET_TYPE_LABELS[item.format], count]
    .filter(Boolean).join(' · ');
  return (
    `<b>${escapeHtml(item.title)}</b>` +
    (meta ? `\n<i>${escapeHtml(meta)}</i>` : '') +
    (item.description ? `\n\n${escapeHtml(item.description)}` : '')
  );
}

export const workKeyboard = (item) => ({
  inline_keyboard: [
    [{ text: '➕ Додати стікерпак', url: `https://t.me/addstickers/${item.name}` }],
    [{ text: '🚀 Хочу такий самий', callback_data: `wo:${item.id}` }],
    [{ text: '◀️ Усі роботи', callback_data: 'wl' }],
  ],
});

export const worksListKeyboard = (items) => ({
  inline_keyboard: items.map((item) => [{ text: workButtonLabel(item), callback_data: `wv:${item.id}` }]),
});

export const workOrderIntro = (item) =>
  `Класний вибір! Беремо «<b>${escapeHtml(item.title)}</b>» за орієнтир — дизайнер побачить це в заявці 👌`;

// --- Кроки брифу ---

export const ASK_TYPE =
  'Поїхали! 🚀 Кілька коротких питань — і дизайнер матиме все, щоб почати.\n\n' +
  '<b>Які стікери робимо?</b>\n\n<i>Передумали — /cancel</i>';

export const ASK_QUANTITY = '👌 <b>Скільки стікерів буде в паку?</b>\nДля старту можна взяти менше — пак легко доповнити пізніше.';
export const ASK_QUANTITY_CUSTOM = 'Напишіть кількість — наприклад, 12 або 30:';

export const ASK_HERO =
  '<b>Хто головний герой стікерів?</b>\n' +
  'Кілька слів — наприклад: «рудий кіт у краватці», «наш CEO з кавою» ' +
  'або «просто стильний текст».';

export const ASK_EMOTIONS =
  '<b>Які емоції та фрази будуть на стікерах?</b>\n' +
  'Напишіть списком, наприклад:\n1. Радість — «Ура!»\n2. Злість — «Дедлайн горить»\n3. Привітання — рукостискання\n\n' +
  'Немає точного списку? Опишіть ідею своїми словами — або надиктуйте голосовим 🎤 Підберемо разом.';

export const ASK_REFERENCES =
  '<b>Покажіть, що вам подобається 🎨</b>\nНадішліть картинки стікерів у бажаному стилі.\n\n' +
  'Є готовий персонаж, логотип чи брендбук? Додайте файлом, краще у векторі. ' +
  'Для складної анімації знадобляться вихідники з шарами — так рухи вийдуть плавнішими.\n\n' +
  'Коли все надішлете — «Готово». Нічого немає — «Пропустити».';

export const ASK_CONTACT =
  'Супер, все є! 🙌 Залиште юзернейм або номер телефону — дизайнер напише вам, ' +
  'уточнить деталі й назве точну ціну.';

// --- Варіанти для кнопок ---

export const CUSTOM = 'custom';
export const OPTIONS = {
  type: { static: 'Статичні', animated: 'Анімовані' },
  qty: { 5: '5 шт.', 10: '10 шт.', '15-20': '15-20 шт.', [CUSTOM]: 'Свій варіант' },
};

export const STATUS_LABELS = {
  new: '🆕 Нове',
  in_progress: '🎨 В роботі',
  done: '✅ Готово',
  rejected: '❌ Відхилено',
  cancelled: '🚫 Скасовано клієнтом',
};

export const CLIENT_STATUS_MESSAGES = {
  in_progress: (id) => `🎨 Беремося за ваше замовлення #${orderNo(id)}! Дизайнер напише вам найближчим часом.`,
  done: (id) => `🎉 Замовлення #${orderNo(id)} готове! Дякуємо, що обрали YABOT 💛`,
  rejected: (id) =>
    `На жаль, цього разу не зможемо взятися за замовлення #${orderNo(id)} 😔\n` +
    'Якщо хочете обговорити — просто напишіть сюди, щось придумаємо.',
};

// --- Вартість ---

export const PRICE_QTY_KEYS = ['5', '10', '15-20'];
export const PRICE_TYPE_KEYS = ['static', 'animated'];
export const DEFAULT_PRICE_NOTE =
  'Точну ціну назве дизайнер після брифу — вона залежить від складності героя та анімації.';

/** Орієнтир ціни для типу й кількості (рядок, який вписав власник), або null. */
export function priceFor(prices, typeKey, qtyKey) {
  const value = prices?.[typeKey]?.[qtyKey];
  return value && String(value).trim() ? String(value).trim() : null;
}

export function pricesMessage(prices) {
  const blocks = [];
  for (const typeKey of PRICE_TYPE_KEYS) {
    const rows = PRICE_QTY_KEYS
      .map((q) => [OPTIONS.qty[q], priceFor(prices, typeKey, q)])
      .filter(([, price]) => price)
      .map(([label, price]) => `• ${escapeHtml(label)} — ${escapeHtml(price)}`);
    if (rows.length) blocks.push(`<b>${OPTIONS.type[typeKey]}</b>\n${rows.join('\n')}`);
  }
  const note = escapeHtml(prices?.note?.trim() || DEFAULT_PRICE_NOTE);
  if (!blocks.length) return `💰 <b>Вартість</b>\n\n${note}\n\nЗаповніть короткий бриф — і назвемо ціну саме для вашої ідеї.`;
  return `💰 <b>Орієнтовна вартість</b>\n\n${blocks.join('\n\n')}\n\n<i>${note}</i>`;
}

export const pricesKeyboard = () => ({
  inline_keyboard: [[{ text: '🚀 Розпочати бриф', callback_data: 'brief_start' }]],
});

export const priceHintMessage = (price) =>
  `💰 Орієнтовно — <b>${escapeHtml(price)}</b>. Точну суму дизайнер назве після брифу.`;

// --- Переписка з дизайнером ---

export const CHAT_HINT_AFTER_ORDER =
  '💬 Хочете щось додати? Пишіть просто сюди — текст, фото, файл чи голосове. Дизайнер відповість у цьому ж чаті.';
export const CHAT_RELAYED = '✉️ Передали дизайнеру — відповідь прийде сюди.';
export const CHAT_NO_STUDIO = 'Ой, не вийшло передати повідомлення 🙏 Спробуйте, будь ласка, за кілька хвилин.';

/** Підпис над повідомленням клієнта в чаті студії (для власника — російською). */
export function studioChatHeader(order, from) {
  const who = from.username ? `@${escapeHtml(from.username)}` : escapeHtml([from.first_name, from.last_name].filter(Boolean).join(' ') || 'клиент');
  return `💬 <b>#${orderNo(order.id)}</b> · ${who} пишет:`;
}

/** Підпис над відповіддю дизайнера для клієнта. */
export const designerHeader = (order) => `💬 <b>Дизайнер YABOT</b> · замовлення #${orderNo(order.id)}`;

export const STUDIO_REPLY_HINT =
  'Чтобы ответить клиенту, нажмите «Ответить» на его сообщение или на карточку заявки — бот перешлёт ответ.';

// --- Погодження ескізів ---

export const SKETCH_STATUS = {
  pending: '⏳ чекає погодження',
  approved: '✅ погоджено',
  changes: '✏️ клієнт просить правки',
};

/** Клієнту: підпис до ескізів. */
export function sketchIntro(order, round, comment) {
  return (
    `🎨 <b>Ескізи до замовлення #${orderNo(order.id)}</b> · версія ${round}` +
    (comment ? `\n\n${escapeHtml(comment)}` : '')
  );
}
export const SKETCH_DECIDE =
  'Як вам? 👇\nВсе подобається — тисніть «Погоджую». Хочете щось змінити — «Є правки».';
export const sketchDecisionKeyboard = (epoch, orderId, round) => ({
  inline_keyboard: [[
    { text: '✅ Погоджую', callback_data: `ap:${epoch || ''}:${orderId}:${round}` },
    { text: '✏️ Є правки', callback_data: `rv:${epoch || ''}:${orderId}:${round}` },
  ]],
});
export const SKETCH_APPROVED_CLIENT = '🎉 Чудово, ескізи погоджено! Дизайнер береться за фінальну версію.';
export const SKETCH_ASK_CHANGES =
  '✏️ Розкажіть, що змінити — текстом, фото чи голосовим. Дизайнер отримає одразу.';
export const SKETCH_CHANGES_ACK = '🙏 Дякуємо! Правки вже в дизайнера — оновлені ескізи прийдуть сюди.';
export const SKETCH_STALE = 'Ця версія ескізів уже неактуальна.';
export const sketchReminder = (order, round) =>
  `⏰ Ескізи до замовлення #${orderNo(order.id)} (версія ${round}) все ще чекають на вас 🙂 Гляньте, коли буде хвилинка.`;

// Повідомлення для студії (власник читає російською)
export const sketchSessionStart = (order, round) =>
  `🖼 <b>Эскизы для #${orderNo(order.id)}</b> (версия ${round}).\n\n` +
  'Пришлите фото или файлы — можно альбомом — и, если нужно, комментарий текстом (он уйдёт клиенту вместе с эскизами). ' +
  'Потом нажмите «Отправить клиенту».';
export const sketchSessionKeyboard = () => ({
  inline_keyboard: [[
    { text: '✅ Отправить клиенту', callback_data: 'sks' },
    { text: '✖️ Отмена', callback_data: 'skc' },
  ]],
});
export const sketchAdded = (n) => `Добавлено файлов: ${n}. Пришлите ещё или нажмите «Отправить клиенту».`;
export const SKETCH_COMMENT_SAVED = 'Комментарий сохранён — он уйдёт клиенту вместе с эскизами.';
export const sketchSent = (order, round) => `📤 Отправлено клиенту на согласование: #${orderNo(order.id)}, версия ${round}.`;
export const sketchApprovedStudio = (order, round) => `✅ Клиент согласовал эскизы #${orderNo(order.id)} (версия ${round})!`;
export const sketchChangesStudio = (order, round) =>
  `✏️ Клиент просит правки к эскизам #${orderNo(order.id)} (версия ${round}) — описание придёт следующим сообщением.`;
export function sketchChangesHeader(order, round, from) {
  const who = from.username ? `@${escapeHtml(from.username)}` : escapeHtml(from.first_name || 'клиент');
  return `✏️ <b>Правки к эскизам #${orderNo(order.id)}</b> (версия ${round}) · ${who}:`;
}

// --- Відгуки ---

export const stars = (n) => '⭐'.repeat(n) + '☆'.repeat(5 - n);
export const REVIEW_ASK =
  '⭐ <b>Як вам результат?</b>\nОцініть нашу роботу — для невеликої студії це дуже важливо 💛';
export const reviewKeyboard = (epoch, orderId) => ({
  inline_keyboard: [[1, 2, 3, 4, 5].map((n) => ({ text: `${n} ⭐`, callback_data: `rt:${epoch || ''}:${orderId}:${n}` }))],
});
export const reviewAskComment = (rating) =>
  `Дякуємо за ${stars(rating)}!\n\n` +
  'Додасте пару слів? Що сподобалось, що можна зробити краще — ваш відгук допоможе іншим клієнтам 🙏';
export const reviewSkipKeyboard = (epoch, orderId) => ({
  inline_keyboard: [[{ text: 'Пропустити', callback_data: `rs:${epoch || ''}:${orderId}` }]],
});
export const REVIEW_THANKS = '💛 Дякуємо за відгук! Будемо раді зробити для вас ще щось класне.';
export const REVIEW_SKIPPED = 'Без проблем! Дякуємо, що обрали YABOT 💛';
export const REVIEW_ALREADY = 'Ви вже оцінили це замовлення — дякуємо!';
export const REVIEWS_BUTTON = (avg, count) => `⭐ Відгуки клієнтів (${avg} · ${count})`;

// Повідомлення з відгуками має вміститися в 4096 символів: коментарі скорочуємо, зайві відгуки не показуємо
export const REVIEW_COMMENT_MAX = 300;
export function fitReviews(items, budget = 3600) {
  const out = [];
  let used = 0;
  for (const it of items) {
    if (out.length && used + it.length > budget) break;
    out.push(it);
    used += it.length + 2;
  }
  return out;
}

export function reviewsMessage(reviews) {
  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  const items = fitReviews(reviews.slice(0, 10).map((r) =>
    `${stars(r.rating)}\n${r.comment ? `«${escapeHtml(clip(r.comment, REVIEW_COMMENT_MAX))}»\n` : ''}<i>— ${escapeHtml(r.name)}</i>`));
  return `⭐ <b>Відгуки клієнтів</b> · середня оцінка ${avg}\n\n${items.join('\n\n')}`;
}

export function studioReviewText(order, review) {
  const low = review.rating <= 3 ? '\n⚠️ <b>Низкая оценка — стоит связаться с клиентом.</b>' : '';
  return `⭐ <b>Отзыв по #${orderNo(order.id)}</b>: ${stars(review.rating)} (${review.rating}/5)` +
    (review.comment ? `\n\n«${escapeHtml(review.comment)}»` : '') + low;
}

// --- Неробочий час ---

const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

/** «Пн–Пт» / «Пн, Ср, Пт» з номерів днів 1..7. */
export function formatDays(days) {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(j - i >= 2 ? `${DAY_SHORT[sorted[i] - 1]}–${DAY_SHORT[sorted[j] - 1]}` : sorted.slice(i, j + 1).map((d) => DAY_SHORT[d - 1]).join(', '));
    i = j;
  }
  return parts.join(', ');
}

export function offHoursMessage(hours) {
  if (hours?.message?.trim()) return escapeHtml(hours.message.trim());
  return `🌙 Зараз ми відпочиваємо — працюємо ${formatDays(hours.days)} з ${hours.from} до ${hours.to} за Києвом.\n` +
    'Повідомлення вже в нас, дизайнер відповість у робочий час 🙂';
}

// --- Розсилка ---

export const UNSUBSCRIBE_BUTTON = { text: '🔕 Не отримувати розсилки', callback_data: 'unsub' };
export const UNSUBSCRIBED =
  'Добре, розсилок більше не буде. Повідомлення про ваші замовлення приходитимуть, як і раніше.';
export const resubscribeKeyboard = () => ({ inline_keyboard: [[{ text: '🔔 Підписатися знову', callback_data: 'resub' }]] });
export const RESUBSCRIBED = '🔔 Готово! Знову ділитимемося новинами й акціями студії.';
export const BROADCAST_WORKS = '🎨 Наші роботи';
export const BROADCAST_BRIEF = '🚀 Розпочати бриф';

// --- Прогрес замовлення («Мої замовлення») ---

/** Ланцюжок етапів замовлення для клієнта. */
export function orderProgress(o) {
  if (o.status === 'rejected') return '❌ Замовлення відхилено';
  if (o.status === 'cancelled') return '🚫 Замовлення скасовано';
  const s = o.sketches?.at(-1);
  const sketchStep = !s ? '◻️ Ескізи'
    : s.status === 'approved' ? '✅ Ескізи'
      : s.status === 'changes' ? '✏️ Ескізи (правки)' : '⏳ Ескізи (на погодженні)';
  const steps = [
    '✅ Бриф',
    o.status === 'new' ? '⏳ Чекає дизайнера' : '✅ В роботі',
    o.status === 'done' && !s ? null : sketchStep,
    o.status === 'done' ? '✅ Готово' : '◻️ Готово',
  ].filter(Boolean);
  return steps.join(' → ');
}

export function myOrderBlock(o) {
  const lines = [`<b>#${orderNo(o.id)}</b> · ${escapeHtml(o.stickerType)}, ${escapeHtml(o.quantity)}`];
  const hero = o.hero.length > 50 ? `${o.hero.slice(0, 50)}…` : o.hero;
  lines.push(`<i>${escapeHtml(hero)}</i>`);
  if (o.repeatOf) lines.push(`➕ Доповнення до #${orderNo(o.repeatOf.id)}`);
  lines.push(orderProgress(o));
  if (o.studio?.deadline && (o.status === 'new' || o.status === 'in_progress')) lines.push(`📅 Орієнтовний термін: ${escapeHtml(o.studio.deadline)}`);
  if (o.pack) lines.push(`📦 <a href="https://t.me/addstickers/${o.pack.name}">${escapeHtml(o.pack.title)}</a>`);
  return lines.join('\n');
}

export const MY_ORDERS_FOOTER = '💬 Хочете написати дизайнеру? Просто надішліть повідомлення сюди.';

export const isStickerOrder = (o) => !o.service || o.service === 'stickers';

export function myOrdersKeyboard(orders, epoch, referralOn) {
  const rows = [
    ...orders.filter((o) => o.status === 'new').slice(0, 3).map((o) => [cancelButton(o, epoch)]),
    // «Доповнити пак» — лише для стікерпаків (не для ботів і персонажів)
    ...orders.filter((o) => o.status === 'done' && isStickerOrder(o)).slice(0, 3)
      .map((o) => [{ text: `➕ Доповнити пак #${orderNo(o.id)}`, callback_data: `rep:${epoch || ''}:${o.id}` }]),
  ];
  if (referralOn) rows.push([{ text: '🎁 Запросити друга — знижка', callback_data: 'invite' }]);
  return rows.length ? { inline_keyboard: rows } : undefined;
}

// --- Доповнити пак ---

export const repeatIntro = (o) =>
  `➕ <b>Доповнюємо пак із замовлення #${orderNo(o.id)}</b>\n` +
  `Тип (${escapeHtml(o.stickerType)}) і героя («${escapeHtml(o.hero.length > 40 ? `${o.hero.slice(0, 40)}…` : o.hero)}») беремо з минулого разу — залишилось вибрати нове.`;
export const ASK_EMOTIONS_REPEAT =
  '<b>Які нові емоції й фрази додамо?</b>\nНапишіть списком, наприклад:\n1. Сонний — «Ще 5 хвилин»\n2. Танцює — «Пʼятниця!»';

// --- Реферальна програма ---

export const referralLocked = (percent) =>
  `🎁 Запрошувати друзів можна після того, як ваше перше замовлення буде готове. Тоді ви отримаєте посилання: друг — знижку ${percent}% на перше замовлення, ви — бонус ${percent}% на наступне 🙂`;
export function inviteMessage(link, percent) {
  return '🎁 <b>Приведіть друга — і отримайте знижку</b>\n\n' +
    `Надішліть другу це посилання. Щойно він оформить перше замовлення, знижку <b>${percent}%</b> отримаєте обоє: ` +
    'він — одразу, ви — на наступне замовлення.\n\n' + link;
}
export const inviteKeyboard = (link, percent) => ({
  inline_keyboard: [[{
    text: '📤 Поділитися з другом',
    url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Стікери для тебе чи команди — у YABOT 🎨 За цим посиланням знижка ${percent}% на перше замовлення!`)}`,
  }]],
});
export const referralFriendNote = (percent) => `🎁 Ви прийшли за запрошенням друга — на це замовлення діє знижка <b>${percent}%</b>.`;
export const referralReferrerNote = (percent) =>
  `🎉 Ваш друг щойно оформив замовлення в YABOT! Тримайте знижку <b>${percent}%</b> на наступне замовлення 💛`;
export const bonusNote = (percent, n) => `🎁 У вас є бонус: знижка ${percent}%${n > 1 ? ` ×${n}` : ''} на наступне замовлення.`;

// --- Готовий стікерпак ---

export const packReady = (title, count) =>
  `🎉 <b>Ваш стікерпак готовий!</b>\n«${escapeHtml(title)}» — ${count} ${plural(count, ['стікер', 'стікери', 'стікерів'])}.\nТисніть кнопку — і він уже у вашому Telegram 👇`;
export const packUpdated = (title, added) =>
  `✨ У ваш пак «${escapeHtml(title)}» додано ${added} ${plural(added, ['новий стікер', 'нові стікери', 'нових стікерів'])}! Вони вже з'явилися у Telegram.`;
export const packKeyboard = (name) => ({ inline_keyboard: [[{ text: '➕ Додати стікерпак', url: `https://t.me/addstickers/${name}` }]] });

// Для студії (російською)
export function packSessionStart(order, existing, title) {
  return `📦 <b>Стикерпак для #${orderNo(order.id)}</b>${existing ? ` — добавляем в «${escapeHtml(existing.title)}»` : ''}\n\n` +
    'Пришлите финальные стикеры <b>файлами</b> (📎 → Файл, не как фото):\n' +
    '• PNG любого размера — бот сам приведёт к 512 px\n• WEBP 512 px, TGS (анимация) или WEBM (видео)\n\n' +
    'Эмодзи для стикера — в подписи к файлу (по умолчанию 😊).' +
    (existing ? '' : `\nНазвание пака — отдельным сообщением (сейчас: «${escapeHtml(title)}»).`) +
    `\n\nПотом нажмите «${existing ? 'Добавить в пак' : 'Создать стикерпак'}».`;
}
export const packSessionKeyboard = (existing) => ({
  inline_keyboard: [[
    { text: existing ? '✅ Добавить в пак' : '✅ Создать стикерпак', callback_data: 'pks' },
    { text: '✖️ Отмена', callback_data: 'pkc' },
  ]],
});
export const packAdded = (n) => `Добавлено стикеров: ${n}. Пришлите ещё, название или нажмите кнопку.`;
export const PACK_PHOTO_WARNING = '⚠️ Это пришло как фото — Telegram его сжимает. Пришлите стикер как файл: 📎 → Файл.';
export const packTitleSaved = (t) => `Название пака: «${escapeHtml(t)}».`;

// --- Оплата авансу (monobank) ---

export const money = (uah) => `${Number(uah).toLocaleString('uk-UA', { maximumFractionDigits: 2 }).replace(/\u00a0/g, ' ')} грн`;

const PAY_TITLE = { advance: 'Аванс за замовлення', final: 'Оплата залишку за замовлення', full: 'Оплата замовлення', stage: 'Оплата етапу замовлення' };
export function payInvoiceMessage(order, p, expiresText) {
  return `💳 <b>${PAY_TITLE[p.kind] || PAY_TITLE.advance} #${orderNo(order.id)}</b>\n` +
    `Сума: <b>${money(p.amount)}</b>${p.note ? ` (${escapeHtml(p.note)})` : ''}\n\n` +
    'Оплата карткою через monobank — швидко й безпечно, можна Apple Pay чи Google Pay.' +
    (expiresText ? `\nРахунок дійсний до ${expiresText}.` : '') +
    '\n\nЩойно оплатите — дизайнер одразу отримає сповіщення 🙌';
}
export const payRemindIntro = (order, amount) =>
  `🔔 Нагадуємо: за замовленням #${orderNo(order.id)} залишилось сплатити <b>${money(amount)}</b>. Дякуємо, що обрали YABOT 💛`;
export const payKeyboard = (url, amount) => ({ inline_keyboard: [[{ text: `💳 Оплатити ${money(amount)}`, url }]] });
export const payPaidClient = (order, amount, kind = 'advance') => (kind === 'advance'
  ? `✅ Аванс <b>${money(amount)}</b> за замовлення #${orderNo(order.id)} отримали — дякуємо! Дизайнер уже береться до роботи 🎨`
  : `✅ Оплату <b>${money(amount)}</b> за замовлення #${orderNo(order.id)} отримали — дякуємо! 💛`);
export const payExpiredClient = (order) =>
  `⏳ Рахунок на оплату замовлення #${orderNo(order.id)} більше не дійсний. Потрібен новий — просто напишіть, дизайнер надішле.`;

// Для студії (російською)
export const payPaidStudio = (order, amount, kind = 'advance') =>
  `💰 <b>${{ advance: 'Аванс оплачен', final: 'Остаток оплачен', full: 'Оплата получена' }[kind] || 'Оплата получена'}</b> по #${orderNo(order.id)}: ${money(amount)}`;
export const payFailedStudio = (order, status, reason) =>
  `⚠️ Счёт на аванс по #${orderNo(order.id)}: ${status === 'expired' ? 'истёк срок' : status === 'reversed' ? 'платёж возвращён' : 'оплата не прошла'}` +
  (reason ? ` (${escapeHtml(reason)})` : '') + '. Можно выставить новый счёт.';
export const payAskAmount = (order, suggested, basis) =>
  `💳 <b>Аванс для #${orderNo(order.id)}</b>\n\n` +
  (suggested ? `Предлагаю <b>${money(suggested)}</b>${basis ? ` (${escapeHtml(basis)})` : ''}. Нажмите кнопку или пришлите свою сумму числом.`
    : 'Пришлите сумму аванса в гривнах числом (например 1500).');
// У кнопці — номер заявки: стара кнопка не виставить рахунок по іншій заявці
export const payAskKeyboard = (suggested, orderId) => ({
  inline_keyboard: [[
    ...(suggested ? [{ text: `✅ ${money(suggested)}`, callback_data: `pya:${orderId}:${suggested}` }] : []),
    { text: '✖️ Отмена', callback_data: 'pyc' },
  ]],
});
export const paySentStudio = (order, amount) => `📤 Счёт на ${money(amount)} отправлен клиенту (#${orderNo(order.id)}). Сообщу, когда оплатит.`;

export const PAY_STATUS = {
  created: '⏳ ждёт оплаты', processing: '⏳ обрабатывается', hold: '⏳ на удержании', success: '✅ оплачен',
  failure: '❌ не прошла', reversed: '↩️ возвращён', expired: '⌛ истёк', cancelled: '✖️ отменён', manual: '✅ оплачен (вручную)', voided: '✖️ отметка отменена',
  awaiting: '⏳ ждём перевод на карту', reported: '🔔 клиент сообщил об оплате',
};

export const PAUSED =
  '⏸ Зараз у нас повний аншлаг — нові замовлення тимчасово не приймаємо.\n\n' +
  'Зазирніть трохи згодом, а поки подивіться «🎨 Наші роботи» 🙂';

// --- Нагадування про незавершений бриф ---

export const REMINDER =
  '👋 Ваш бриф на стікерпак чекає — залишилось зовсім трохи!\n\n' +
  'Продовжимо з того ж місця?';

export const reminderKeyboard = () => ({
  inline_keyboard: [[
    { text: '▶️ Продовжити', callback_data: 'draft_resume' },
    { text: '✖️ Не зараз', callback_data: 'draft_drop' },
  ]],
});

// --- Клавіатури ---

export const mainMenu = () => ({
  keyboard: [
    [{ text: BTN_ORDER }],
    [{ text: BTN_WORKS }, { text: BTN_PRICES }],
    [{ text: BTN_MY_ORDERS }, { text: BTN_FAQ }, { text: BTN_ABOUT }],
  ],
  resize_keyboard: true,
});

export const contactKeyboard = () => ({
  keyboard: [[{ text: BTN_SHARE_CONTACT, request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
  input_field_placeholder: '@username або номер телефону',
});

export const choiceKeyboard = (field) => ({
  inline_keyboard: Object.entries(OPTIONS[field]).map(([key, label]) => [
    { text: label, callback_data: `ch:${field}:${key}` },
  ]),
});

export const refsKeyboard = (hasRefs) => ({
  inline_keyboard: [[{ text: hasRefs ? '✅ Готово' : 'Пропустити', callback_data: 'refs_done' }]],
});

export const confirmKeyboard = (promo = false) => ({
  inline_keyboard: [
    [{ text: '✅ Надіслати заявку', callback_data: 'order_send' }],
    [{ text: '✏️ Змінити відповідь', callback_data: 'edit_menu' }, ...(promo ? [{ text: PROMO_BUTTON, callback_data: 'promo_ask' }] : [])],
    [
      { text: '🔄 Заповнити заново', callback_data: 'order_restart' },
      { text: '✖️ Скасувати', callback_data: 'order_cancel' },
    ],
  ],
});

/**
 * Кнопки картки заявки. pay — показати «Рахунок»; designer — картка для дизайнера (без оплати й стікерпака).
 */
export function adminOrderKeyboard(id, status, epoch, pay = false, designer = false) {
  // Мітка історії в кнопках: після очищення історії старі картки не чіпають нові заявки з тими ж номерами
  const prefix = epoch ? `oa:${epoch}:` : 'oa:';
  const btn = (text, action) => ({ text, callback_data: `${prefix}${id}:${action}` });
  const work = [
    { text: '🖼 Надіслати ескізи', callback_data: `sk:${epoch || ''}:${id}` },
    ...(designer ? [] : [{ text: '📦 Зібрати стікерпак', callback_data: `pk:${epoch || ''}:${id}` }]),
  ];
  const payRow = pay && !designer ? [[{ text: '💳 Рахунок на оплату', callback_data: `py:${epoch || ''}:${id}` }]] : [];
  if (status === 'new') return { inline_keyboard: [[btn('🎨 Взяти в роботу', 'in_progress'), btn('❌ Відхилити', 'rejected')], work, ...payRow] };
  if (status === 'in_progress') return { inline_keyboard: [[btn('✅ Готово', 'done'), btn('❌ Відхилити', 'rejected')], work, ...payRow] };
  // Готове замовлення: можна дозібрати/оновити стікерпак і виставити залишок
  if (status === 'done' && !designer) return { inline_keyboard: [[{ text: '📦 Стікерпак', callback_data: `pk:${epoch || ''}:${id}` }], ...payRow] };
  return { inline_keyboard: [] };
}

// --- Підсумки ---

/** Підсумок заявки на бота чи персонажа (з Mini App). */
function projectSummary(d, title) {
  const p = d.project || {};
  return [
    `<b>${escapeHtml(title)}</b>\n`,
    `<b>Послуга:</b> ${escapeHtml(d.stickerType)}`,
    `<b>Проєкт:</b> ${escapeHtml(clip(d.hero, SUMMARY_HERO))}`,
    `<b>Що потрібно:</b> ${escapeHtml(d.quantity)}`,
    ...(d.package ? [`<b>Пакет:</b> ${escapeHtml(d.package.name)}${d.package.price ? ` (від ${money(d.package.price)})` : ''}`] : []),
    ...(p.deadline ? [`<b>Дедлайн:</b> ${escapeHtml(p.deadline)}`] : []),
    ...(p.budget ? [`<b>Бюджет:</b> ${escapeHtml(p.budget)}`] : []),
    `<b>Опис:</b>\n${escapeHtml(clip(d.emotions, SUMMARY_EMOTIONS))}`,
    ...(d.likeExample ? [`<b>✨ Як у прикладі:</b> ${escapeHtml(d.likeExample.caption || 'приклад роботи')} (картинка — нижче)`] : []),
    `<b>Референси / файли:</b> ${(d.refs || []).length || 'немає'}`,
    `<b>Контакт:</b> ${escapeHtml(d.contact || '—')}`,
    ...(d.promo ? [`<b>Промокод:</b> ${escapeHtml(d.promo.code)} (−${d.promo.percent}%)`] : []),
  ].join('\n');
}

export function briefSummary(d, title = 'Ваш бриф') {
  if (d.service && d.service !== 'stickers') return projectSummary(d, title);
  const refs = d.refs || [];
  return [
    `<b>${escapeHtml(title)}</b>\n`,
    `<b>Тип:</b> ${escapeHtml(d.stickerType)}`,
    ...(d.repeatOf ? [`<b>Доповнення до:</b> #${orderNo(d.repeatOf.id)}${d.repeatOf.packName ? ` (t.me/addstickers/${escapeHtml(d.repeatOf.packName)})` : ''}`] : []),
    ...(d.package ? [`<b>Пакет:</b> ${escapeHtml(d.package.name)}`] : []),
    `<b>Кількість:</b> ${escapeHtml(d.quantity)}`,
    ...(d.priceHint ? [`<b>Орієнтир ціни:</b> ${escapeHtml(d.priceHint)}`] : []),
    `<b>Головний герой:</b> ${escapeHtml(clip(d.hero, SUMMARY_HERO))}`,
    ...(d.style ? [`<b>Стиль:</b> ${escapeHtml(d.style.name)}`] : []),
    `<b>Емоції та фрази:</b>\n${escapeHtml(clip(d.emotions, SUMMARY_EMOTIONS))}`,
    ...(d.catalogRef ? [`<b>Як у роботі:</b> ${escapeHtml(d.catalogRef.title)} (t.me/addstickers/${escapeHtml(d.catalogRef.name)})`] : []),
    ...(d.likeExample ? [`<b>✨ Як у прикладі:</b> ${escapeHtml(d.likeExample.caption || 'приклад роботи')} (картинка — нижче)`] : []),
    `<b>Референси / файли:</b> ${refs.length || 'немає'}`,
    `<b>Контакт:</b> ${escapeHtml(d.contact || '—')}`,
    ...(d.promo ? [`<b>Промокод:</b> ${escapeHtml(d.promo.code)} (−${d.promo.percent}%)`] : []),
    ...(d.gift ? [`<b>Сертифікат:</b> ${escapeHtml(d.gift.code)} (${money(d.gift.amount)})`] : []),
  ].join('\n');
}

/** Картка заявки для студії. designer — для дизайнера: без оплат, промокодів, рефералів і бонусів. */
export function adminOrderText(o, statusNote = '', { designer = false } = {}) {
  const client = o.username
    ? `@${escapeHtml(o.username)}`
    : `<a href="tg://user?id=${o.userId}">${escapeHtml(o.fullName || 'клієнт')}</a>`;
  return (
    briefSummary(o, `Замовлення #${orderNo(o.id)}`) +
    `\n<b>Клієнт:</b> ${client} (id <code>${o.userId}</code>)` +
    `\n<b>Джерело:</b> ${o.source ? escapeHtml(o.source) : 'напряму'}` +
    `\n<b>Статус:</b> ${STATUS_LABELS[o.status] || o.status}` +
    (o.sketches?.length
      ? `\n<b>Ескізи:</b> версія ${o.sketches.length} — ${SKETCH_STATUS[o.sketches.at(-1).status] || o.sketches.at(-1).status}`
      : '') +
    (o.pack ? `\n<b>Стікерпак:</b> t.me/addstickers/${escapeHtml(o.pack.name)} (${o.pack.count})` : '') +
    (o.showcase?.consent === 'yes' ? '\n📣 Клієнт дозволив показати роботу в каналі' : '') +
    (o.winback ? '\n🔁 Повернувся після нагадування' : '') +
    (!designer && o.promo ? `\n🎟 <b>Промокод</b> ${escapeHtml(o.promo.code)} — знижка ${o.promo.percent}%` : '') +
    (!designer && o.payments?.length ? `\n<b>Оплата:</b> ${money(o.payments.at(-1).amount)} — ${PAY_STATUS[o.payments.at(-1).status] || o.payments.at(-1).status}` : '') +
    (o.assigneeName ? `\n👤 <b>Дизайнер:</b> ${escapeHtml(o.assigneeName)}` : '') +
    (o.studio?.due && (o.status === 'new' || o.status === 'in_progress') ? `\n📅 <b>Термін:</b> до ${dateText(o.studio.due)}` : '') +
    (!designer && o.quotes?.length ? `\n🧾 <b>Кошторис:</b> ${money(o.quotes.at(-1).amount)} — ${QUOTE_STATUS[o.quotes.at(-1).status] || o.quotes.at(-1).status}` : '') +
    (o.cancel ? `\n🚫 <b>Причина скасування:</b> ${escapeHtml(o.cancel.reason)}` : '') +
    (o.lang === 'en' ? '\n🇬🇧 <b>Англомовний клієнт</b> — бот спілкується з ним англійською, відповідайте англійською' : '') +
    (o.viaPost ? `\n📣 <b>З поста в каналі</b> «${escapeHtml(o.viaPost.chatTitle || '')}»${o.viaPost.text ? `: ${escapeHtml(o.viaPost.text)}` : ''}` : '') +
    (o.aiIdeas ? (o.service && o.service !== 'stickers' ? '\n💡 Опис складено з ІІ-підказкою' : '\n💡 Емоції підібрано з ІІ-підказкою') : '') +
    (!designer && o.referral ? `\n🎁 <b>За запрошенням</b> — знижка ${o.referral.percent}% на це замовлення` : '') +
    (!designer && o.bonusAvailable ? `\n🎁 <b>У клієнта бонус</b> — знижка ${o.bonusAvailable.percent}%${o.bonusAvailable.count > 1 ? ` ×${o.bonusAvailable.count}` : ''}` : '') +
    (statusNote ? `\n<i>${statusNote}</i>` : '')
  );
}

// --- ІІ-підказка емоцій у брифі ---

export const AI_IDEAS_BUTTON = '💡 Допоможіть з ідеями';
export const AI_THINKING = '💡 Придумую ідеї для вашого героя… це 10–30 секунд.';
export const aiIdeasMessage = (text) =>
  `💡 <b>Ідеї для ваших стікерів</b>\n\n${escapeHtml(text)}\n\n` +
  '<i>Можна взяти як є, попросити інші варіанти — або написати свій список (скопіюйте ці й змініть що хочете).</i>';
export const aiIdeasKeyboard = (more) => ({
  inline_keyboard: [
    [{ text: '✅ Беру ці', callback_data: 'ai_use' }],
    ...(more ? [[{ text: '🔄 Інші варіанти', callback_data: 'ai_ideas' }]] : []),
  ],
});
export const AI_FAILED = '😔 Зараз не вдалося придумати ідеї. Напишіть, будь ласка, список самі — або просто опишіть загальну ідею, дизайнер допоможе.';
export const AI_LIMIT = 'Це всі варіанти для цього брифу 🙂 Оберіть із запропонованих вище або напишіть свій список.';
export const AI_USED = '✅ Беремо ці ідеї!';

// --- Короткі повідомлення клієнту ---

export const MSG = {
  briefCancelled: 'Заповнення брифу скасовано.',
  nothingToCancel: 'Немає чого скасовувати 🙂',
  notUnderstood: 'Хм, не зовсім зрозумів 🤔 Оберіть дію в меню нижче або напишіть /help.',
  voiceTooLong: 'Голосове задовге для мене 🙈 Розкажіть коротше (до 2 хвилин) або напишіть текстом.',
  voiceUnclear: 'Не розібрав слів у голосовому 🤔 Спробуйте ще раз або напишіть текстом.',
  voiceFailed: 'Зараз не можу прослухати голосове 🙈 Напишіть, будь ласка, текстом — відповім одразу.',
  noOrders: 'Замовлень поки немає — саме час створити перше! Тисніть «🚀 Розпочати».',
  yourOrders: '<b>Ваші замовлення</b>',
  referralOff: 'Реферальна програма зараз не діє 🙂',
  tooLong: (limit) => `Трохи задовго 🙈 Вкладіться, будь ласка, в ${limit} символів.`,
  pickButton: 'Оберіть варіант кнопкою вище 👆',
  textPlease: 'Напишіть, будь ласка, текстом або надиктуйте голосовим 🎤 Картинки й файли можна буде додати трохи пізніше.',
  contactAsk: 'Напишіть юзернейм чи номер телефону — або натисніть «Поділитися контактом».',
  thanks: 'Дякую! 🙌',
  pressBriefButton: 'Натисніть одну з кнопок під брифом 👆',
  refAsk: 'Надішліть картинку, стікер або файл — чи натисніть кнопку, щоб продовжити.',
  refMax: (max) => `Можна не більше ${max} файлів — решту я пропустив.`,
  refGot: 'Є! 👍 Надішліть ще або натисніть «Готово».',
  staleButton: 'Ця кнопка вже не працює. Почніть нову заявку через меню 🙂',
  orderGone: 'Цього замовлення вже немає.',
  noReviews: 'Відгуків поки немає — станьте першим 🙂',
  unsubscribedShort: 'Відписано',
  subscribedShort: 'Підписано',
  workGone: 'Цієї роботи вже немає в каталозі.',
  buttonGone: 'Ця кнопка вже неактуальна',
  draftGone: 'Цей бриф уже неактуальний. Почнемо новий?',
  draftLater: 'Добре! Коли будете готові — тисніть «🚀 Розпочати».',
  requestCancelled: 'Заявку скасовано. Повертайтеся, коли будете готові 🙂',
  allCorrect: 'Все правильно?',
  submitted: (no) => `🎉 Заявку <b>#${no}</b> надіслано! Дизайнер напише вам найближчим часом.\nСтатус — у «📦 Мої замовлення».`,
  approvedNote: '✅ Ви погодили ескізи',
  changesNote: '✏️ Ви попросили правки',
  yourRating: 'Ваша оцінка:',
  rateStale: 'Ця кнопка вже неактуальна.',
  clientName: 'клієнт',
  tooManyOrders: 'Ви вже надіслали кілька заявок сьогодні — дизайнер обробить їх і напише вам 🙂 Якщо хочете щось додати, просто напишіть сюди.',
};

// --- Кошторис ---

export function quoteMessage(order, q, advanceNote) {
  return `🧾 <b>Кошторис на замовлення #${orderNo(order.id)}</b>\n\n` +
    `💰 Вартість: <b>${money(q.amount)}</b>\n` +
    (q.due ? `📅 Термін: до ${dateText(q.due)}\n` : q.days ? `📅 Термін: ${q.days} ${plural(q.days, ['день', 'дні', 'днів'])} після погодження\n` : '') +
    (q.items ? `\n<b>Що входить:</b>\n${escapeHtml(q.items)}\n` : '') +
    (q.comment ? `\n${escapeHtml(q.comment)}\n` : '') +
    (advanceNote ? `\n${advanceNote}\n` : '') +
    '\nПогоджуєте?';
}
export const quoteKeyboard = (epoch, orderId, n) => ({
  inline_keyboard: [
    [{ text: '✅ Погоджую', callback_data: `qa:${epoch || ''}:${orderId}:${n}` }],
    [{ text: '💬 Є питання', callback_data: `qq:${epoch || ''}:${orderId}:${n}` }],
  ],
});
export const quoteAdvanceNote = (amount) => `Після погодження — аванс ${money(amount)}, рахунок надійде сюди.`;
export const QUOTE_ACCEPTED_CLIENT = '🎉 Дякуємо! Кошторис погоджено — беремося до роботи 🎨';
export const QUOTE_QUESTION_CLIENT = '💬 Пишіть питання просто сюди — дизайнер відповість якнайшвидше.';
export const QUOTE_STALE = 'Цей кошторис уже неактуальний.';
export const quoteDecisionNote = (accepted) => (accepted ? '✅ Ви погодили кошторис' : '💬 Ви поставили питання');

// Для студії
export const QUOTE_STATUS = { sent: '⏳ ждёт ответа', accepted: '✅ согласована', question: '💬 есть вопросы', superseded: 'заменена новой' };
export const quoteAcceptedStudio = (order, q) =>
  `✅ <b>Клиент согласовал смету</b> по #${orderNo(order.id)}: ${money(q.amount)}${q.due ? `, срок до ${dateText(q.due)}` : ''}`;
export const quoteQuestionStudio = (order) => `💬 У клиента вопросы по смете #${orderNo(order.id)} — его сообщение придёт следом.`;

// --- Зміна відповіді в брифі ---

export const EDIT_ASK = '✏️ Що змінити?';
export const EDIT_LABELS = { type: 'Тип', qty: 'Кількість', hero: 'Головний герой', style: 'Стиль', emotions: 'Емоції та фрази', refs: 'Референси', contact: 'Контакт' };
export const EDIT_BACK = '◀️ Назад до брифу';
export const EDIT_REFS_NOTE = 'Надішліть референси заново — попередні замінимо новими.';

// --- Скасування заявки клієнтом ---

export const cancelButton = (o, epoch) => ({ text: `✖️ Скасувати #${orderNo(o.id)}`, callback_data: `cx:${epoch || ''}:${o.id}` });
export const cancelAsk = (o) => `Скасувати заявку #${orderNo(o.id)}? Підкажіть, будь ласка, причину — це допоможе нам стати кращими 🙏`;
export const CANCEL_REASONS = ['Передумав(ла)', 'Задорого', 'Обрав(ла) іншого виконавця', 'Інша причина'];
export const CANCEL_KEEP = 'Ні, залишити заявку';
export const cancelDone = (o) => `Заявку #${orderNo(o.id)} скасовано. Шкода, але будемо раді, коли повернетеся 🙂 Якщо хочете щось пояснити — просто напишіть.`;
export const CANCEL_TOO_LATE = 'Заявку вже взяли в роботу — напишіть дизайнеру сюди, якщо хочете її скасувати.';
export const CANCEL_KEPT = 'Добре, заявка лишається в силі 👍';
export const cancelStudio = (o, reason) => `🚫 <b>Клиент отменил заявку</b> #${orderNo(o.id)}. Причина: ${escapeHtml(reason)}.`;

// --- Промокоди ---

export const PROMO_BUTTON = '🎟 Маю промокод';
export const PROMO_ASK = '🎟 Надішліть промокод одним повідомленням:';
export const promoApplied = (code, percent) => `🎟 Промокод <b>${escapeHtml(code)}</b> застосовано — знижка ${percent}%.`;
export const PROMO_BAD = 'Такого промокоду немає або він уже не діє 😔';
export const promoSaved = (code, percent) => `🎟 Промокод <b>${escapeHtml(code)}</b> збережено — знижка ${percent}% діятиме для вашої заявки.`;

// --- Відпустка ---

export const vacationNotice = (until, custom) => (custom ? escapeHtml(custom)
  : `🏖 Студія у відпустці${until ? ` до ${until}` : ''}. Заявку можна залишити вже зараз — відповімо, щойно повернемося 🙂`);
export const vacationClosed = (until, custom) => (custom ? escapeHtml(custom)
  : `🏖 Студія відпочиває${until ? ` до ${until}` : ''} і зараз не приймає нові замовлення. Повертайтеся трохи згодом, а поки подивіться «🎨 Наші роботи» 🙂`);

// --- Пакети й стилі ---

export const ASK_PACKAGE = '<b>Оберіть пакет</b> — або вкажіть свою кількість стікерів:';
export function packagesMessage(list) {
  return `${ASK_PACKAGE}\n\n` + list.map((p) =>
    `📦 <b>${escapeHtml(p.name)} — ${money(p.price)}</b>\n${escapeHtml(p.items)}`).join('\n\n');
}
export const packagesKeyboard = (list) => ({
  inline_keyboard: [
    ...list.map((p) => [{ text: `📦 ${p.name} — ${money(p.price)}`, callback_data: `pg:${p.id}` }]),
    [{ text: '✏️ Свій варіант', callback_data: 'pg:custom' }],
  ],
});
export const packageName = (p) => p.name;
export const packageItems = (p) => p.items;

export const ASK_STYLE = '<b>Який стиль вам ближчий?</b>\nПриклади вище 👆 Оберіть номер — або залиште на розсуд дизайнера.';
export const styleKeyboard = (list) => {
  const rows = [];
  for (let i = 0; i < list.length; i += 2) {
    rows.push(list.slice(i, i + 2).map((s, j) => ({ text: `${i + j + 1}. ${s.name}`, callback_data: `st:${s.id}` })));
  }
  rows.push([{ text: '🎨 На розсуд дизайнера', callback_data: 'st:any' }]);
  return { inline_keyboard: rows };
};
export const STYLE_ANY = 'на розсуд дизайнера';
export const styleName = (s) => s.name;

// --- Згода показати роботу в каналі ---

export const showcaseAsk = (o) =>
  `🎨 Нам дуже подобається ваш стікерпак${o.pack?.title ? ` «${escapeHtml(o.pack.title)}»` : ''}! ` +
  'Можна показати його в нашому каналі як приклад роботи? Ваше імʼя чи контакти ми не публікуємо.';
export const showcaseKeyboard = (epoch, id) => ({
  inline_keyboard: [[
    { text: '✅ Так, можна', callback_data: `sc:${epoch || ''}:${id}:y` },
    { text: 'Ні, дякую', callback_data: `sc:${epoch || ''}:${id}:n` },
  ]],
});
export const SHOWCASE_YES = 'Дякуємо! 💛 Покажемо вашу роботу в каналі.';
export const SHOWCASE_NO = 'Добре, не публікуємо 👍';
export const showcaseStudio = (o, yes) => `📣 Клиент #${orderNo(o.id)} ${yes ? '<b>разрешил</b>' : 'не разрешил'} показать работу в канале.`;

// --- Повернення клієнтів ---

export function winbackMessage(name, percent, code, custom) {
  if (custom) return escapeHtml(custom.replace(/\{ім['ʼ’]я\}/g, name).replace(/\{знижка\}/g, `${percent}%`).replace(/\{код\}/g, code));
  return `👋 ${escapeHtml(name)}, давно не бачились! Як вам ваші стікери? 🙂\n\n` +
    (percent ? `Для вас — знижка <b>${percent}%</b> на новий стікерпак або доповнення паку (промокод <b>${escapeHtml(code)}</b>, вже застосований до наступної заявки, діє 30 днів).\n\n` : '') +
    'Можемо додати нові емоції до вашого паку або створити зовсім новий 🎨';
}
export const winbackKeyboard = (epoch, lastDone) => ({
  inline_keyboard: [
    ...(lastDone ? [[{ text: `➕ Доповнити пак #${orderNo(lastDone.id)}`, callback_data: `rep:${epoch || ''}:${lastDone.id}` }]] : []),
    [{ text: '🚀 Новий стікерпак', callback_data: 'brief_start' }],
    [UNSUBSCRIBE_BUTTON],
  ],
});

// --- Подарункові сертифікати ---

export const GIFT_BUTTON = '🎁 Подарунковий сертифікат';
export const giftOffer = (amounts, days) =>
  '🎁 <b>Подарунковий сертифікат YABOT</b>\n\n' +
  'Подаруйте близьким, колегам чи друзям власний стікерпак! Ви оплачуєте сертифікат — і отримуєте красиву PDF-листівку з кодом, ' +
  `яку можна переслати. Сертифікат діє ${days} днів.\n\nОберіть суму:`;
export const giftAmountsKeyboard = (amounts) => ({
  inline_keyboard: [amounts.map((a) => ({ text: money(a), callback_data: `gf:${a}` }))],
});
export const GIFT_UNAVAILABLE = 'Подарункові сертифікати зараз недоступні — напишіть нам, і ми щось придумаємо 🙂';
export const giftInvoice = (amount) =>
  `🎁 <b>Сертифікат на ${money(amount)}</b>\n\nОплата карткою через monobank. Одразу після оплати бот надішле вам сертифікат з кодом 🙌`;
export const giftReady = (g, link, until) =>
  `🎉 <b>Ваш сертифікат готовий!</b>\n\nСума: <b>${money(g.amount)}</b>\nКод: <code>${escapeHtml(g.code)}</code>\nДіє до: ${until}\n\n` +
  `Перешліть PDF-листівку або це посилання тому, кому даруєте:\n${link}`;
export const giftShareKeyboard = (link, amount) => ({
  inline_keyboard: [[{ text: '📤 Надіслати подарунок', url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`🎁 Тобі подарунковий сертифікат YABOT на власний стікерпак (${money(amount)})!`)}` }]],
});
export const giftSaved = (g, until) =>
  `🎁 Сертифікат на <b>${money(g.amount)}</b> збережено! Його сума врахується у вашій заявці. Діє до ${until}.\n\nНатисніть «🚀 Розпочати», щоб оформити стікерпак.`;
export const GIFT_BAD = 'Цей сертифікат уже використано або він не діє 😔';
export const giftApplied = (g) => `🎁 Сертифікат <b>${escapeHtml(g.code)}</b> на ${money(g.amount)} застосовано.`;
export const giftReturned = (g) => `🎁 Сертифікат <b>${escapeHtml(g.code)}</b> на ${money(g.amount)} знову діє — його буде застосовано до вашої наступної заявки.`;

// --- Оплата переказом на картку ---

export function cardPayMessage(order, p, s) {
  const title = { advance: 'Аванс за замовлення', final: 'Оплата залишку за замовлення', full: 'Оплата замовлення', stage: 'Оплата етапу замовлення' }[p.kind] || 'Оплата замовлення';
  return `💳 <b>${title} #${orderNo(order.id)}</b>\n` +
    `Сума: <b>${money(p.amount)}</b>\n\n` +
    `Переказ на картку:\n<code>${escapeHtml(s.cardNumber)}</code>\n` +
    (s.cardRecipient ? `Отримувач: ${escapeHtml(s.cardRecipient)}\n` : '') +
    (s.cardNote ? `${escapeHtml(s.cardNote.replace(/\{номер\}/g, orderNo(order.id)))}\n` : '') +
    '\nНомер картки можна скопіювати натисканням. Після оплати натисніть кнопку нижче 👇';
}
export const cardPaidKeyboard = (epoch, orderId, idx) => ({
  inline_keyboard: [[{ text: '✅ Я оплатив(ла)', callback_data: `cp:${epoch || ''}:${orderId}:${idx}` }]],
});
export const CARD_REPORTED_CLIENT = '🙏 Дякуємо! Перевіримо надходження й одразу підтвердимо.';
export const cardNotReceived = (order, p) =>
  `🤔 Поки не бачимо оплату ${money(p.amount)} за замовлення #${orderNo(order.id)}. Перевірте, будь ласка, реквізити — або напишіть сюди, якщо все гаразд, розберемося.`;

// Для студії
export const cardReportedStudio = (order, p) =>
  `🔔 <b>Клиент сообщил об оплате</b> по #${orderNo(order.id)}: ${money(p.amount)} переводом на карту. Проверьте поступление.`;
export const cardConfirmKeyboard = (epoch, orderId, idx) => ({
  inline_keyboard: [[
    { text: '✅ Деньги пришли', callback_data: `cpo:${epoch || ''}:${orderId}:${idx}` },
    { text: '❌ Не пришло', callback_data: `cpn:${epoch || ''}:${orderId}:${idx}` },
  ]],
});

// --- Голосові відповіді в брифі ---

export const voiceAnswer = (sec) => `🎤 Голосове повідомлення${sec ? ` (${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')})` : ''} — дизайнер прослухає`;
export const VOICE_SAVED = '🎤 Записали! Дизайнер прослухає ваше голосове.';

// --- Часті питання ---

export const FAQ_LIST = '❓ <b>Часті питання</b>\n\nОберіть питання — або просто напишіть своє сюди.';
export const FAQ_EMPTY = 'Питань поки немає — просто напишіть своє сюди, дизайнер відповість 🙂';
export const faqQ = (f) => f.q;
export const faqA = (f) => f.a;
export const faqListKeyboard = (list) => ({ inline_keyboard: list.map((f) => [{ text: f.q, callback_data: `fq:${f.id}` }]) });
export const faqAnswer = (f) => `❓ <b>${escapeHtml(f.q)}</b>\n\n${escapeHtml(f.a)}`;
export const faqAnswerKeyboard = () => ({
  inline_keyboard: [
    [{ text: '🚀 Розпочати бриф', callback_data: 'brief_start' }],
    [{ text: '❓ Усі питання', callback_data: 'fq:list' }, { text: '💬 Запитати дизайнера', callback_data: 'fq:ask' }],
  ],
});
export const QUESTION_FORWARDED = '✉️ Передали ваше питання студії — відповідь прийде сюди.';
export const QUESTION_LIMIT = 'Ми вже отримали ваші питання сьогодні — дизайнер відповість найближчим часом 🙂';
export const STUDIO_ANSWER = '💬 <b>Студія YABOT</b>';

// Для студії
export function studioQuestionHeader(from) {
  const who = from.username ? `@${escapeHtml(from.username)}` : escapeHtml([from.first_name, from.last_name].filter(Boolean).join(' ') || 'человек');
  return `❓ <b>Вопрос без заявки</b> · ${who} (id <code>${from.id}</code>). Ответьте «Ответить» на это сообщение:`;
}

// --- Бриф із розмови з ІІ-помічником ---
export const AI_BRIEF_BUTTON = '🚀 Розпочати бриф';
export const AI_QUOTE_BUTTON = '🚀 Оформити замовлення';
export const aiQuoteLine = (label, price) =>
  `\n\n💰 <b>${label}</b> — ${price}\n<i>Точну ціну підтвердить дизайнер після брифу.</i>`;
export const aiPrefilled = (lines) =>
  `📝 Дещо з брифу я вже заповнив за нашою розмовою:\n${lines}\n\nРешту спитаю зараз, а в кінці все можна змінити.`;
