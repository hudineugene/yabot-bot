// English texts for foreign clients. Same names as in texts.js — only what the client sees.
// Messages for the studio stay in texts.js (Russian/Ukrainian).
import { escapeHtml, orderNo, dateText, clip } from './util.js';
import { SUMMARY_HERO, SUMMARY_EMOTIONS, isStickerOrder, fitReviews, REVIEW_COMMENT_MAX } from './texts.js';

export const BTN_ORDER = '🚀 Start';
export const BTN_MY_ORDERS = '📦 My orders';
export const BTN_ABOUT = 'ℹ️ About the studio';
export const BTN_WORKS = '🎨 Our works';
export const BTN_PRICES = '💰 Prices';
export const BTN_SHARE_CONTACT = '📱 Share contact';
export const BTN_FAQ = '❓ Questions';

export const LANG_SWITCH = '🇺🇦 Українська';
export const OPEN_APP = '🚀 Open miniApp';
export const OPEN_IN_APP = '📱 Open in miniApp';
export const finalFileCaption = (o) => `📦 Final files for order #${orderNo(o.id)}`;
export const finalLinkMessage = (o, title) => `📦 <b>Final files for order #${orderNo(o.id)}</b>${title ? `\n${escapeHtml(title)}` : ''}`;
export const FINAL_LINK_BUTTON = '⬇️ Open files';
export const stageOf = (n, total) => `Stage ${n} of ${total}`;
export const stageAnswerOk = (name) => `Stage «${name}»: all good`;
export const stageAnswerChanges = (name) => `Stage «${name}»: I have comments`;
export const stagePayIntro = (name, percent) => `🧩 Stage «${escapeHtml(name)}» — ${percent}% of the price, as per the payment plan.`;
export const fixDoneClient = (o) => `✅ The fix for order #${orderNo(o.id)} is done. Thank you for your patience! If anything else comes up, just write 🙂`;
export const fixAcceptedClient = (o) => `✏️ We have received your fix request for order #${orderNo(o.id)} — the designer can see it and will message you once the changes are made.`;
export const reviewPromoText = (percent, code, until) =>
  `🎁 <b>Thank you for the review!</b> Here is your personal promo code for the next order — ${percent}% off:\n\n<code>${escapeHtml(code)}</code>\n\nValid until ${until}. It will be applied to your next request automatically.`;
export const supportOfferText = (o) =>
  `👋 <b>How is your bot «${escapeHtml(o.hero || '')}» doing?</b>\n\n` +
  'Some time has passed since the launch — if you would like to improve something, add new features or let us handle support (updates, maintenance, new functions), we are happy to help.';
export const SUPPORT_YES = '💬 Let us discuss';
export const SUPPORT_NO = '👍 All good';
export const SUPPORT_NO_REPLY = 'Glad to hear it! If you need anything, just write here 🙂';
export const STAGE_ASK = 'Please take a look and tap a button below 👇';
export const STAGE_OPEN_LINK = '🔗 Open';
export const STAGE_OK_BUTTON = '✅ All good';
export const STAGE_CHANGES_BUTTON = '✏️ I have comments';
export const STAGE_OK_CLIENT = 'Thank you! We have let the designer know — moving on 🚀';
export const STAGE_CHANGES_CLIENT = 'Tell us what to change — the designer will get your message right away ✍️';
export const projectStageMessage = (o, n, total, name) => `🚀 <b>Order #${orderNo(o.id)}</b> — new stage\n\nStage ${n} of ${total}: <b>${escapeHtml(name)}</b>`;
export const appDraftReminder = (svc) => `🧡 You started a request${svc ? ` for «${escapeHtml(svc)}»` : ''} in the miniApp but didn't send it.\n\nShall we continue? Everything is saved — just a few steps left.`;
export const APP_DRAFT_BUTTON = '✍️ Continue the request';
export const LANG_SET = 'Language: English 🇬🇧';

export const WELCOME =
  '👋 <b>Hi! We are YABOT &amp; IRISKA.</b>\n\n' +
  'This is where characters, stickers, design and all the beauty that suddenly makes Telegram a little more interesting are born 😎\n\n' +
  'And now ordering is even easier: our bot has a <b>miniApp</b> where you can pick a service, place an order and send us all the details without a twenty-message quest.\n\n' +
  '🤖 YABOT is in charge of technology, style and a bit of robotic chaos.\n' +
  '🧡 IRISKA makes sure all of it keeps character, emotions and humanity.\n\n' +
  'Open the miniApp and let\'s create something cool together.\n\n' +
  '<b>YABOT — DESIGN FOR HUMANS.</b>';

export const ABOUT =
  '🎨 <b>YABOT — the studio where stickers with character are born!</b>\n\n' +
  'We create static and animated Telegram sticker packs — ' +
  'for you, your team or your brand.\n\n' +
  '<b>How we work:</b>\n' +
  '1️⃣ You fill in a short brief in this bot\n' +
  '2️⃣ We clarify the details and quote the price\n' +
  '3️⃣ We draw sketches and agree them with you\n' +
  '4️⃣ You get the finished sticker pack right in Telegram\n\n' +
  '🚀 Ready? Tap <b>«Start»</b>!';

export const HELP =
  '/order — order a sticker pack\n' +
  '/works — our works\n' +
  '/prices — prices\n' +
  '/my_orders — my orders\n' +
  '/faq — frequent questions\n' +
  '/language — Українська / English\n' +
  '/cancel — cancel the brief';

// --- Catalog ---

export const WORKS_EMPTY =
  'Our catalog is still filling up — the best works are on their way 🙂\n' +
  'Meanwhile we can create a sticker pack just for you: tap «🚀 Start»!';

export const WORKS_LIST = '🎨 <b>Our works</b>\n\nPick a pack — we will show you the live stickers:';

const SET_TYPE_LABELS = { regular: '', static: 'Static', animated: 'Animated', video: 'Video' };

export function workCard(item) {
  const count = item.count ? `${item.count} ${item.count === 1 ? 'sticker' : 'stickers'}` : '';
  const meta = [SET_TYPE_LABELS[item.format], count].filter(Boolean).join(' · ');
  return (
    `<b>${escapeHtml(item.title)}</b>` +
    (meta ? `\n<i>${escapeHtml(meta)}</i>` : '') +
    (item.description ? `\n\n${escapeHtml(item.description)}` : '')
  );
}

export const workKeyboard = (item) => ({
  inline_keyboard: [
    [{ text: '➕ Add sticker pack', url: `https://t.me/addstickers/${item.name}` }],
    [{ text: '🚀 I want the same', callback_data: `wo:${item.id}` }],
    [{ text: '◀️ All works', callback_data: 'wl' }],
  ],
});

export const workOrderIntro = (item) =>
  `Nice pick! We'll use «<b>${escapeHtml(item.title)}</b>» as a reference — the designer will see it in your request 👌`;

// --- Brief steps ---

export const ASK_TYPE =
  "Let's go! 🚀 A few quick questions — and the designer will have everything to start.\n\n" +
  '<b>What kind of stickers are we making?</b>\n\n<i>Changed your mind — /cancel</i>';

export const ASK_QUANTITY = '👌 <b>How many stickers will the pack have?</b>\nYou can start small — the pack is easy to extend later.';
export const ASK_QUANTITY_CUSTOM = 'Write the number — for example, 12 or 30:';

export const ASK_HERO =
  '<b>Who is the main character of the stickers?</b>\n' +
  'A few words — for example: «a ginger cat in a tie», «our CEO with coffee» ' +
  'or «just stylish lettering».';

export const ASK_EMOTIONS =
  '<b>Which emotions and phrases go on the stickers?</b>\n' +
  'Write a list, for example:\n1. Joy — «Hooray!»\n2. Anger — «Deadline is on fire»\n3. Greeting — handshake\n\n' +
  'No exact list yet? Describe the idea in your own words — or send a voice message 🎤 We will pick them together.';

export const ASK_REFERENCES =
  '<b>Show us what you like 🎨</b>\nSend pictures of stickers in the style you want.\n\n' +
  'Have a character, logo or brand book? Add them as a file, vector preferred. ' +
  'For complex animation we will need layered source files — the motion will come out smoother.\n\n' +
  'When everything is sent — «Done». Nothing to send — «Skip».';

export const ASK_CONTACT =
  'Great, got everything! 🙌 Leave your username or phone number — the designer will message you, ' +
  'clarify the details and quote the exact price.';

// --- Button options ---

export const OPTIONS = {
  type: { static: 'Static', animated: 'Animated' },
  qty: { 5: '5 pcs', 10: '10 pcs', '15-20': '15-20 pcs', custom: 'Other amount' },
};

export const CLIENT_STATUS_MESSAGES = {
  in_progress: (id) => `🎨 We're on it — order #${orderNo(id)} is in progress! The designer will message you soon.`,
  done: (id) => `🎉 Order #${orderNo(id)} is ready! Thank you for choosing YABOT 💛`,
  rejected: (id) =>
    `Unfortunately, we can't take order #${orderNo(id)}. ` +
    'If you want to discuss it — write to us and we will figure something out.',
};

// --- Prices ---

const PRICE_QTY_KEYS = ['5', '10', '15-20'];
const PRICE_TYPE_KEYS = ['static', 'animated'];
export const DEFAULT_PRICE_NOTE =
  'The designer will quote the exact price after the brief — it depends on the complexity of the character and animation.';

export function pricesMessage(prices) {
  const blocks = [];
  for (const typeKey of PRICE_TYPE_KEYS) {
    const rows = PRICE_QTY_KEYS
      .map((q) => [OPTIONS.qty[q], prices?.[typeKey]?.[q] && String(prices[typeKey][q]).trim()])
      .filter(([, price]) => price)
      .map(([label, price]) => `• ${escapeHtml(label)} — ${escapeHtml(price)}`);
    if (rows.length) blocks.push(`<b>${OPTIONS.type[typeKey]}</b>\n${rows.join('\n')}`);
  }
  // Примітку власник пише українською — англомовним показуємо стандартну
  const note = escapeHtml(DEFAULT_PRICE_NOTE);
  if (!blocks.length) return `💰 <b>Prices</b>\n\n${note}\n\nFill in a short brief — and we will quote the price for your idea.`;
  return `💰 <b>Approximate prices</b>\n\n${blocks.join('\n\n')}\n\n<i>${note}</i>`;
}

export const pricesKeyboard = () => ({
  inline_keyboard: [[{ text: '🚀 Start the brief', callback_data: 'brief_start' }]],
});

export const priceHintMessage = (price) =>
  `💰 Approximately: <b>${escapeHtml(price)}</b>. The designer will quote the exact price after the brief.`;

// --- Chat with the designer ---

export const CHAT_HINT_AFTER_ORDER =
  '💬 Want to add something? Just write here — text, photo, file or voice. The designer will reply in this chat. ' +
  'Our designers speak English 🙂';
export const CHAT_RELAYED = '✉️ Passed to the designer — the reply will come here.';
export const CHAT_NO_STUDIO = "Oops, couldn't pass the message 🙏 Please try again in a few minutes.";

export const designerHeader = (order) => `💬 <b>YABOT designer</b> · order #${orderNo(order.id)}`;

// --- Sketches ---

export function sketchIntro(order, round, comment) {
  return (
    `🎨 <b>Sketches for order #${orderNo(order.id)}</b> · version ${round}` +
    (comment ? `\n\n${escapeHtml(comment)}` : '')
  );
}
export const SKETCH_DECIDE =
  'How do you like them? 👇\nAll good — tap «Approve». Want something changed — «Changes needed».';
export const sketchDecisionKeyboard = (epoch, orderId, round) => ({
  inline_keyboard: [[
    { text: '✅ Approve', callback_data: `ap:${epoch || ''}:${orderId}:${round}` },
    { text: '✏️ Changes needed', callback_data: `rv:${epoch || ''}:${orderId}:${round}` },
  ]],
});
export const SKETCH_APPROVED_CLIENT = '🎉 Great, the sketches are approved! The designer is moving on to the final version.';
export const SKETCH_ASK_CHANGES =
  '✏️ Write what exactly to change — as text, photo or voice. The designer will get it right away.';
export const SKETCH_CHANGES_ACK = '🙏 Thank you! The changes are passed to the designer — updated sketches will come here.';
export const SKETCH_STALE = 'This version of the sketches is no longer current.';
export const sketchReminder = (order, round) =>
  `⏰ The sketches for order #${orderNo(order.id)} (version ${round}) are still waiting for you 🙂 Take a look when you have a minute.`;

// --- Reviews ---

export const REVIEW_ASK =
  '⭐ <b>How do you like the result?</b>\nRate our work — for a small studio it means a lot 💛';
export const reviewSkipKeyboard = (epoch, orderId) => ({
  inline_keyboard: [[{ text: 'Skip', callback_data: `rs:${epoch || ''}:${orderId}` }]],
});
export const reviewAskComment = (rating) =>
  `Thank you for the rating ${'⭐'.repeat(rating)}${'☆'.repeat(5 - rating)}!\n\n` +
  'Write a few words about working with us — what you liked, what to improve. It helps other clients 🙏';
export const REVIEW_THANKS = '💛 Thank you for the review! We will be happy to create something cool for you again.';
export const REVIEW_SKIPPED = 'Okay! Thank you for choosing YABOT 💛';
export const REVIEW_ALREADY = 'You have already rated this order — thank you!';
export const REVIEWS_BUTTON = (avg, count) => `⭐ Client reviews (${avg} · ${count})`;

export function reviewsMessage(reviews) {
  const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  const items = fitReviews(reviews.slice(0, 10).map((r) =>
    `${'⭐'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}\n${r.comment ? `«${escapeHtml(clip(r.comment, REVIEW_COMMENT_MAX))}»\n` : ''}<i>— ${escapeHtml(r.name)}</i>`));
  return `⭐ <b>Client reviews</b> · average rating ${avg}\n\n${items.join('\n\n')}`;
}

// --- Off hours ---

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDays(days) {
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

// Свій текст власника — українською, тож англомовним завжди автоматичний
export function offHoursMessage(hours) {
  return `🌙 We're taking a break right now — working hours: ${formatDays(hours.days)}, ${hours.from}–${hours.to} Kyiv time.\n` +
    'Your message is with us — the designer will reply during working hours 🙂';
}

// --- Broadcasts ---

export const UNSUBSCRIBE_BUTTON = { text: '🔕 Unsubscribe from news', callback_data: 'unsub' };
export const UNSUBSCRIBED = "Okay, we won't send news anymore. Messages about your orders will still come as usual.";
export const resubscribeKeyboard = () => ({ inline_keyboard: [[{ text: '🔔 Subscribe again', callback_data: 'resub' }]] });
export const RESUBSCRIBED = '🔔 Done! We will send studio news and offers again.';
export const BROADCAST_WORKS = '🎨 Our works';
export const BROADCAST_BRIEF = '🚀 Start the brief';

// --- My orders ---

export function orderProgress(o) {
  if (o.status === 'rejected') return '❌ Order declined';
  if (o.status === 'cancelled') return '🚫 Order cancelled';
  const s = o.sketches?.at(-1);
  const sketchStep = !s ? '◻️ Sketches'
    : s.status === 'approved' ? '✅ Sketches'
      : s.status === 'changes' ? '✏️ Sketches (changes)' : '⏳ Sketches (awaiting approval)';
  const steps = [
    '✅ Brief',
    o.status === 'new' ? '⏳ Waiting for designer' : '✅ In progress',
    o.status === 'done' && !s ? null : sketchStep,
    o.status === 'done' ? '✅ Done' : '◻️ Done',
  ].filter(Boolean);
  return steps.join(' → ');
}

export function myOrderBlock(o) {
  const lines = [`<b>#${orderNo(o.id)}</b> · ${escapeHtml(o.stickerType)}, ${escapeHtml(o.quantity)}`];
  const hero = o.hero.length > 50 ? `${o.hero.slice(0, 50)}…` : o.hero;
  lines.push(`<i>${escapeHtml(hero)}</i>`);
  if (o.repeatOf) lines.push(`➕ Addition to #${orderNo(o.repeatOf.id)}`);
  lines.push(orderProgress(o));
  if (o.studio?.deadline && (o.status === 'new' || o.status === 'in_progress')) lines.push(`📅 Estimated deadline: ${escapeHtml(o.studio.deadline)}`);
  if (o.pack) lines.push(`📦 <a href="https://t.me/addstickers/${o.pack.name}">${escapeHtml(o.pack.title)}</a>`);
  return lines.join('\n');
}

export const MY_ORDERS_FOOTER = '💬 To write to the designer — just send a message here.';


export const repeatIntro = (o) =>
  `➕ <b>Extending the pack from order #${orderNo(o.id)}</b>\n` +
  `We take the type (${escapeHtml(o.stickerType)}) and the character («${escapeHtml(o.hero.length > 40 ? `${o.hero.slice(0, 40)}…` : o.hero)}») from last time.`;
export const ASK_EMOTIONS_REPEAT =
  '<b>Which new emotions and phrases should we add?</b>\nWrite a list — for example: 1. Sleepy (5 more minutes), 2. Dancing (It\'s Friday!).';

// --- Referral ---

export function inviteMessage(link, percent) {
  return '🎁 <b>Invite a friend to YABOT</b>\n\n' +
    `Send this link to a friend. When they place their first order — you both get a <b>${percent}%</b> discount: ` +
    'they on their order, you on your next one.\n\n' + link;
}
export const inviteKeyboard = (link, percent) => ({
  inline_keyboard: [[{
    text: '📤 Share with a friend',
    url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Stickers for you or your team — at YABOT 🎨 ${percent}% off your first order with this link!`)}`,
  }]],
});
export const referralLocked = (percent) =>
  `🎁 You can invite friends once your first order is completed. Then you will get a link: your friend gets ${percent}% off the first order, and you get a ${percent}% bonus on the next one 🙂`;
export const referralFriendNote = (percent) => `🎁 You came by invitation — this order gets a <b>${percent}%</b> discount.`;
export const referralReferrerNote = (percent) =>
  `🎉 Your friend placed an order at YABOT! Your next order gets a <b>${percent}%</b> discount 💛`;
export const bonusNote = (percent, n) => `🎁 You have a bonus: ${percent}% off${n > 1 ? ` ×${n}` : ''} your next order.`;

// --- Finished sticker pack ---

export const packReady = (title, count) =>
  `🎉 <b>Your sticker pack is ready!</b>\n«${escapeHtml(title)}» — ${count} ${count === 1 ? 'sticker' : 'stickers'}.\nTap the button — and it's in your Telegram 👇`;
export const packUpdated = (title, added) =>
  `✨ ${added} new ${added === 1 ? 'sticker was' : 'stickers were'} added to your sticker pack «${escapeHtml(title)}»!`;
export const packKeyboard = (name) => ({ inline_keyboard: [[{ text: '➕ Add sticker pack', url: `https://t.me/addstickers/${name}` }]] });

// --- Advance payment ---

export const money = (uah) => `${Number(uah).toLocaleString('en-US', { maximumFractionDigits: 2 })} UAH`;

const PAY_TITLE = { advance: 'Advance payment for order', final: 'Remaining payment for order', full: 'Payment for order', stage: 'Stage payment for order' };
export function payInvoiceMessage(order, p, expiresText) {
  return `💳 <b>${PAY_TITLE[p.kind] || PAY_TITLE.advance} #${orderNo(order.id)}</b>\n` +
    `Amount: <b>${money(p.amount)}</b>\n\n` +
    'Card payment via monobank — secure, Apple Pay and Google Pay are supported.' +
    (expiresText ? `\nThe invoice is valid until ${expiresText} (Kyiv time).` : '') +
    '\n\nAfter payment the designer will be notified right away 🙌';
}
export const payRemindIntro = (order, amount) =>
  `🔔 A friendly reminder: <b>${money(amount)}</b> is still due for order #${orderNo(order.id)}. Thank you for choosing YABOT 💛`;
export const payKeyboard = (url, amount) => ({ inline_keyboard: [[{ text: `💳 Pay ${money(amount)}`, url }]] });
export const payPaidClient = (order, amount, kind = 'advance') => (kind === 'advance'
  ? `✅ Advance payment of <b>${money(amount)}</b> for order #${orderNo(order.id)} received — thank you! The designer is getting to work 🎨`
  : `✅ Payment of <b>${money(amount)}</b> for order #${orderNo(order.id)} received — thank you! 💛`);
export const payExpiredClient = (order) =>
  `⏳ The advance invoice for order #${orderNo(order.id)} has expired. If needed, the designer will send a new one.`;

export const PAUSED =
  "⏸ We're fully booked right now — new orders are paused for a while.\n\n" +
  'Check back a bit later, and meanwhile take a look at «🎨 Our works» 🙂';

// --- Brief reminder ---

export const REMINDER =
  '👋 Your sticker pack brief is waiting — just a little left!\n\n' +
  'Shall we continue where you left off?';

export const reminderKeyboard = () => ({
  inline_keyboard: [[
    { text: '▶️ Continue', callback_data: 'draft_resume' },
    { text: '✖️ Not now', callback_data: 'draft_drop' },
  ]],
});

// --- Keyboards ---

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
  input_field_placeholder: '@username or phone number',
});

export const choiceKeyboard = (field) => ({
  inline_keyboard: Object.entries(OPTIONS[field]).map(([key, label]) => [
    { text: label, callback_data: `ch:${field}:${key}` },
  ]),
});

export const refsKeyboard = (hasRefs) => ({
  inline_keyboard: [[{ text: hasRefs ? '✅ Done' : 'Skip', callback_data: 'refs_done' }]],
});

export const confirmKeyboard = (promo = false) => ({
  inline_keyboard: [
    [{ text: '✅ Send the request', callback_data: 'order_send' }],
    [{ text: '✏️ Change an answer', callback_data: 'edit_menu' }, ...(promo ? [{ text: PROMO_BUTTON, callback_data: 'promo_ask' }] : [])],
    [
      { text: '🔄 Start over', callback_data: 'order_restart' },
      { text: '✖️ Cancel', callback_data: 'order_cancel' },
    ],
  ],
});

export function briefSummary(d, title = 'Your brief') {
  const refs = d.refs || [];
  return [
    `<b>${escapeHtml(title)}</b>\n`,
    `<b>Type:</b> ${escapeHtml(d.stickerType)}`,
    ...(d.repeatOf ? [`<b>Addition to:</b> #${orderNo(d.repeatOf.id)}`] : []),
    ...(d.package ? [`<b>Package:</b> ${escapeHtml(d.package.nameEn || d.package.name)}`] : []),
    `<b>Quantity:</b> ${escapeHtml(d.quantity)}`,
    ...(d.priceHint ? [`<b>Approximate price:</b> ${escapeHtml(d.priceHint)}`] : []),
    `<b>Main character:</b> ${escapeHtml(clip(d.hero, SUMMARY_HERO))}`,
    ...(d.style ? [`<b>Style:</b> ${escapeHtml(d.style.nameEn || d.style.name)}`] : []),
    `<b>Emotions and phrases:</b>\n${escapeHtml(clip(d.emotions, SUMMARY_EMOTIONS))}`,
    ...(d.catalogRef ? [`<b>Like the work:</b> ${escapeHtml(d.catalogRef.title)}`] : []),
    `<b>References / files:</b> ${refs.length || 'none'}`,
    `<b>Contact:</b> ${escapeHtml(d.contact || '—')}`,
    ...(d.promo ? [`<b>Promo code:</b> ${escapeHtml(d.promo.code)} (−${d.promo.percent}%)`] : []),
    ...(d.gift ? [`<b>Gift certificate:</b> ${escapeHtml(d.gift.code)} (${money(d.gift.amount)})`] : []),
  ].join('\n');
}

// --- AI ideas for emotions ---

export const AI_IDEAS_BUTTON = '💡 Help me with ideas';
export const AI_THINKING = '💡 Coming up with ideas for your character… it takes 10–30 seconds.';
export const aiIdeasMessage = (text) =>
  `💡 <b>Ideas for your stickers</b>\n\n${escapeHtml(text)}\n\n` +
  '<i>Take them as they are, ask for other options — or write your own list (you can copy these and edit).</i>';
export const aiIdeasKeyboard = (more) => ({
  inline_keyboard: [
    [{ text: '✅ Use these', callback_data: 'ai_use' }],
    ...(more ? [[{ text: '🔄 Other options', callback_data: 'ai_ideas' }]] : []),
  ],
});
export const AI_FAILED = "😔 Couldn't come up with ideas right now. Please write the list yourself — or just describe the general idea, the designer will help.";
export const AI_LIMIT = "That's all the options for this brief 🙂 Choose from the ones above or write your own list.";
export const AI_USED = '✅ Taken these ideas!';

// --- Other short messages ---

export const MSG = {
  briefCancelled: 'The brief has been cancelled.',
  nothingToCancel: 'Nothing to cancel 🙂',
  notUnderstood: "Hmm, didn't quite get that 🤔 Pick an action in the menu below or type /help.",
  voiceTooLong: "That voice message is too long for me 🙈 Please keep it under 2 minutes or type it.",
  voiceUnclear: "I couldn't make out the words 🤔 Please try again or type your question.",
  voiceFailed: "I can't listen to voice messages right now 🙈 Please type your question and I'll answer right away.",
  noOrders: 'No orders yet — a perfect time to create the first one! Tap «🚀 Start».',
  yourOrders: '<b>Your orders</b>',
  referralOff: 'The referral program is not active right now 🙂',
  tooLong: (limit) => `Too long 🙈 Please keep it within ${limit} characters.`,
  pickButton: 'Choose an option with the button above 👆',
  textPlease: 'Please write it as text or send a voice message 🎤 You can add pictures and files a bit later.',
  contactAsk: 'Write your username or phone number, or tap «Share contact».',
  thanks: 'Thank you! 🙌',
  pressBriefButton: 'Tap one of the buttons under the brief 👆',
  refAsk: 'Send a picture, sticker or file — or tap the button to continue.',
  refMax: (max) => `You can send at most ${max} files — I skipped the rest.`,
  refGot: 'Got it 👍 Send more or tap «Done».',
  staleButton: 'This button is no longer active. Start a new request via the menu.',
  orderGone: 'This order no longer exists.',
  noReviews: 'No reviews yet — be the first 🙂',
  unsubscribedShort: 'Unsubscribed',
  subscribedShort: 'Subscribed',
  workGone: 'This work is no longer in the catalog.',
  buttonGone: 'This button is no longer active',
  draftGone: 'This brief is no longer active. Shall we start a new one?',
  draftLater: 'Okay! When you are ready — tap «🚀 Start».',
  requestCancelled: 'Request cancelled. Come back when you are ready!',
  allCorrect: 'Is everything correct?',
  submitted: (no) => `🎉 Request <b>#${no}</b> sent! The designer will message you soon.\nStatus — in «📦 My orders».`,
  approvedNote: '✅ You approved the sketches',
  changesNote: '✏️ You asked for changes',
  yourRating: 'Your rating:',
  rateStale: 'This button is no longer active.',
  clientName: 'client',
  tooManyOrders: 'You have already sent several requests today — the designer will process them and message you 🙂 To add something, just write here.',
};

// --- Quote ---

export function quoteMessage(order, q, advanceNote) {
  return `🧾 <b>Quote for order #${orderNo(order.id)}</b>\n\n` +
    `💰 Price: <b>${money(q.amount)}</b>\n` +
    (q.due ? `📅 Deadline: by ${dateText(q.due)}\n` : q.days ? `📅 Deadline: ${q.days} ${q.days === 1 ? 'day' : 'days'} after approval\n` : '') +
    (q.items ? `\n<b>What's included:</b>\n${escapeHtml(q.items)}\n` : '') +
    (q.comment ? `\n${escapeHtml(q.comment)}\n` : '') +
    (advanceNote ? `\n${advanceNote}\n` : '') +
    '\nDo you approve?';
}
export const quoteKeyboard = (epoch, orderId, n) => ({
  inline_keyboard: [
    [{ text: '✅ I approve', callback_data: `qa:${epoch || ''}:${orderId}:${n}` }],
    [{ text: '💬 I have questions', callback_data: `qq:${epoch || ''}:${orderId}:${n}` }],
  ],
});
export const quoteAdvanceNote = (amount) => `After approval — an advance payment of ${money(amount)}, the invoice will come here.`;
export const QUOTE_ACCEPTED_CLIENT = '✅ Thank you! The quote is approved — we are getting to work 🎨';
export const QUOTE_QUESTION_CLIENT = '💬 Write your question here — the designer will reply as soon as possible.';
export const QUOTE_STALE = 'This quote is no longer current.';
export const quoteDecisionNote = (accepted) => (accepted ? '✅ You approved the quote' : '💬 You asked a question');

// --- Editing the brief ---

export const EDIT_ASK = '✏️ What would you like to change?';
export const EDIT_LABELS = { type: 'Type', qty: 'Quantity', hero: 'Main character', style: 'Style', emotions: 'Emotions and phrases', refs: 'References', contact: 'Contact' };
export const EDIT_BACK = '◀️ Back to the brief';
export const EDIT_REFS_NOTE = 'Send the references again — they will replace the previous ones.';

// --- Cancelling ---

export const cancelButton = (o, epoch) => ({ text: `✖️ Cancel #${orderNo(o.id)}`, callback_data: `cx:${epoch || ''}:${o.id}` });
export const cancelAsk = (o) => `Cancel request #${orderNo(o.id)}? Please tell us why — it helps us get better 🙏`;
export const CANCEL_REASONS = ['Changed my mind', 'Too expensive', 'Chose another studio', 'Other reason'];
export const CANCEL_KEEP = 'No, keep the request';
export const cancelDone = (o) => `Request #${orderNo(o.id)} is cancelled. We'll be happy to see you again 🙂 If you want to explain something — just write here.`;
export const CANCEL_TOO_LATE = 'The request is already in progress — write to the designer here if you want to cancel it.';
export const CANCEL_KEPT = 'Okay, the request stays active 👍';

export function myOrdersKeyboard(orders, epoch, referralOn) {
  const rows = [
    ...orders.filter((o) => o.status === 'new').slice(0, 3).map((o) => [cancelButton(o, epoch)]),
    ...orders.filter((o) => o.status === 'done' && isStickerOrder(o)).slice(0, 3)
      .map((o) => [{ text: `➕ Extend pack #${orderNo(o.id)}`, callback_data: `rep:${epoch || ''}:${o.id}` }]),
  ];
  if (referralOn) rows.push([{ text: '🎁 Invite a friend — get a discount', callback_data: 'invite' }]);
  return rows.length ? { inline_keyboard: rows } : undefined;
}

// --- Promo codes ---

export const PROMO_BUTTON = '🎟 I have a promo code';
export const PROMO_ASK = '🎟 Send the promo code in one message:';
export const promoApplied = (code, percent) => `🎟 Promo code <b>${escapeHtml(code)}</b> applied — ${percent}% off.`;
export const PROMO_BAD = 'This promo code does not exist or is no longer valid 😔';
export const promoSaved = (code, percent) => `🎟 Promo code <b>${escapeHtml(code)}</b> saved — ${percent}% off will apply to your request.`;

// --- Vacation ---

export const vacationNotice = (until) =>
  `🏖 The studio is on vacation${until ? ` until ${until}` : ''}. You can leave a request now — we will reply when we are back 🙂`;
export const vacationClosed = (until) =>
  `🏖 The studio is on vacation${until ? ` until ${until}` : ''} and is not taking new orders right now. Please come back a bit later, and meanwhile take a look at «🎨 Our works» 🙂`;

// --- Packages and styles ---

export const ASK_PACKAGE = '<b>Choose a package</b> — or enter your own number of stickers:';
export function packagesMessage(list) {
  return `${ASK_PACKAGE}\n\n` + list.map((p) =>
    `📦 <b>${escapeHtml(p.nameEn || p.name)} — ${money(p.price)}</b>\n${escapeHtml(p.itemsEn || p.items)}`).join('\n\n');
}
export const packagesKeyboard = (list) => ({
  inline_keyboard: [
    ...list.map((p) => [{ text: `📦 ${p.nameEn || p.name} — ${money(p.price)}`, callback_data: `pg:${p.id}` }]),
    [{ text: '✏️ My own amount', callback_data: 'pg:custom' }],
  ],
});
export const packageName = (p) => p.nameEn || p.name;
export const packageItems = (p) => p.itemsEn || p.items;

export const ASK_STYLE = '<b>Which style do you like more?</b>\nExamples above 👆 Choose a number — or leave it to the designer.';
export const styleKeyboard = (list) => {
  const rows = [];
  for (let i = 0; i < list.length; i += 2) {
    rows.push(list.slice(i, i + 2).map((s, j) => ({ text: `${i + j + 1}. ${s.nameEn || s.name}`, callback_data: `st:${s.id}` })));
  }
  rows.push([{ text: "🎨 Up to the designer", callback_data: 'st:any' }]);
  return { inline_keyboard: rows };
};
export const STYLE_ANY = 'up to the designer';
export const styleName = (s) => s.nameEn || s.name;

// --- Permission to show the work in the channel ---

export const showcaseAsk = (o) =>
  `🎨 We really like your sticker pack${o.pack?.title ? ` «${escapeHtml(o.pack.title)}»` : ''}! ` +
  'May we show it in our channel as an example of our work? We do not publish your name or contacts.';
export const showcaseKeyboard = (epoch, id) => ({
  inline_keyboard: [[
    { text: '✅ Yes, sure', callback_data: `sc:${epoch || ''}:${id}:y` },
    { text: 'No, thanks', callback_data: `sc:${epoch || ''}:${id}:n` },
  ]],
});
export const SHOWCASE_YES = 'Thank you! 💛 We will show your work in the channel.';
export const SHOWCASE_NO = "Okay, we won't publish it 👍";

// --- Win-back ---

export function winbackMessage(name, percent, code) {
  return `👋 ${escapeHtml(name)}, long time no see! How do you like your stickers? 🙂\n\n` +
    (percent ? `Here is <b>${percent}% off</b> a new sticker pack or extending your pack (promo code <b>${escapeHtml(code)}</b>, already applied to your next request, valid for 30 days).\n\n` : '') +
    'We can add new emotions to your pack or create a brand new one 🎨';
}
export const winbackKeyboard = (epoch, lastDone) => ({
  inline_keyboard: [
    ...(lastDone ? [[{ text: `➕ Extend pack #${orderNo(lastDone.id)}`, callback_data: `rep:${epoch || ''}:${lastDone.id}` }]] : []),
    [{ text: '🚀 New sticker pack', callback_data: 'brief_start' }],
    [UNSUBSCRIBE_BUTTON],
  ],
});

// --- Gift certificates ---

export const GIFT_BUTTON = '🎁 Gift certificate';
export const giftOffer = (amounts, days) =>
  '🎁 <b>YABOT gift certificate</b>\n\n' +
  'Give your loved ones, colleagues or friends their own sticker pack! You pay for the certificate and get a beautiful PDF card with a code ' +
  `that you can forward. The certificate is valid for ${days} days.\n\nChoose the amount:`;
export const giftAmountsKeyboard = (amounts) => ({
  inline_keyboard: [amounts.map((a) => ({ text: money(a), callback_data: `gf:${a}` }))],
});
export const GIFT_UNAVAILABLE = 'Gift certificates are not available right now — write to us and we will figure something out 🙂';
export const giftInvoice = (amount) =>
  `🎁 <b>Certificate for ${money(amount)}</b>\n\nCard payment via monobank. Right after the payment the bot will send you the certificate with a code 🙌`;
export const giftReady = (g, link, until) =>
  `🎉 <b>Your certificate is ready!</b>\n\nAmount: <b>${money(g.amount)}</b>\nCode: <code>${escapeHtml(g.code)}</code>\nValid until: ${until}\n\n` +
  `Forward the PDF card or this link to the person you are giving it to:\n${link}`;
export const giftShareKeyboard = (link, amount) => ({
  inline_keyboard: [[{ text: '📤 Send the gift', url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`🎁 A YABOT gift certificate for your own sticker pack (${money(amount)})!`)}` }]],
});
export const giftSaved = (g, until) =>
  `🎁 Certificate for <b>${money(g.amount)}</b> saved! Its amount will count towards your request. Valid until ${until}.\n\nTap «🚀 Start» to order a sticker pack.`;
export const GIFT_BAD = 'This certificate has already been used or is no longer valid 😔';
export const giftApplied = (g) => `🎁 Certificate <b>${escapeHtml(g.code)}</b> for ${money(g.amount)} applied.`;
export const giftReturned = (g) => `🎁 Certificate <b>${escapeHtml(g.code)}</b> for ${money(g.amount)} is valid again — it will be applied to your next request.`;

// --- Card transfer payment ---

export function cardPayMessage(order, p, s) {
  const title = { advance: 'Advance payment for order', final: 'Remaining payment for order', full: 'Payment for order', stage: 'Stage payment for order' }[p.kind] || 'Payment for order';
  return `💳 <b>${title} #${orderNo(order.id)}</b>\n` +
    `Amount: <b>${money(p.amount)}</b>\n\n` +
    `Card transfer (Ukrainian bank card):\n<code>${escapeHtml(s.cardNumber)}</code>\n` +
    (s.cardRecipient ? `Recipient: ${escapeHtml(s.cardRecipient)}\n` : '') +
    '\nTap the card number to copy it. After paying, press the button below 👇';
}
export const cardPaidKeyboard = (epoch, orderId, idx) => ({
  inline_keyboard: [[{ text: '✅ I have paid', callback_data: `cp:${epoch || ''}:${orderId}:${idx}` }]],
});
export const CARD_REPORTED_CLIENT = '🙏 Thank you! We will check the transfer and confirm right away.';
export const cardNotReceived = (order, p) =>
  `🤔 We don't see the payment of ${money(p.amount)} for order #${orderNo(order.id)} yet. Please check the details — or write here if everything is fine, we will sort it out.`;

// --- Voice answers in the brief ---

export const voiceAnswer = (sec) => `🎤 Voice message${sec ? ` (${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')})` : ''} — the designer will listen`;
export const VOICE_SAVED = '🎤 Got it! The designer will listen to your voice message.';

// --- FAQ ---

export const FAQ_LIST = '❓ <b>Frequent questions</b>\n\nPick a question — or just type your own here.';
export const FAQ_EMPTY = 'No questions yet — just type yours here, the designer will reply 🙂';
export const faqQ = (f) => f.qEn || f.q;
export const faqA = (f) => f.aEn || f.a;
export const faqListKeyboard = (list) => ({ inline_keyboard: list.map((f) => [{ text: f.qEn || f.q, callback_data: `fq:${f.id}` }]) });
export const faqAnswer = (f) => `❓ <b>${escapeHtml(f.qEn || f.q)}</b>\n\n${escapeHtml(f.aEn || f.a)}`;
export const faqAnswerKeyboard = () => ({
  inline_keyboard: [
    [{ text: '🚀 Start the brief', callback_data: 'brief_start' }],
    [{ text: '❓ All questions', callback_data: 'fq:list' }, { text: '💬 Ask the designer', callback_data: 'fq:ask' }],
  ],
});
export const QUESTION_FORWARDED = '✉️ We passed your question to the studio — the reply will come here.';
export const QUESTION_LIMIT = 'We have already received your questions today — the designer will reply soon 🙂';
export const STUDIO_ANSWER = '💬 <b>YABOT studio</b>';

// --- Brief from the AI assistant conversation ---
export const AI_BRIEF_BUTTON = '🚀 Start the brief';
export const AI_QUOTE_BUTTON = '🚀 Place the order';
export const aiQuoteLine = (label, price) =>
  `\n\n💰 <b>${label}</b> — ${price}\n<i>The designer will confirm the exact price after the brief.</i>`;
export const aiPrefilled = (lines) =>
  `📝 I've already filled in part of the brief from our chat:\n${lines}\n\nI'll ask the rest now, and you can change anything at the end.`;
