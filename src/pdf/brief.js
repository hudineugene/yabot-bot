// PDF-бланк брифу у фірмовому стилі YABOT: шапка з номером, плитки ключових фактів,
// дві колонки (зміст брифу + картка клієнта й нотатки студії), окрема сторінка референсів.
import fs from 'node:fs';
import path from 'node:path';
import { PdfDocument } from './document.js';
import { loadImage } from './images.js';
import { ASSETS_DIR } from '../config.js';
import { formatDate, orderNo } from '../util.js';

const INK = [20, 20, 20];
const ACCENT = [249, 68, 0]; // помаранчевий з крапок логотипу
const MUTED = [128, 128, 128];
const LINE = [228, 228, 228];
const TILE = [244, 244, 244];
const DARK = [24, 24, 24];
const DARK_MUTED = [150, 150, 150];
const WHITE = [255, 255, 255];

const M = 16; // поля
const PAGE_W = 210;
const RIGHT = PAGE_W - M;
const CONTENT_W = PAGE_W - M * 2;
const BOTTOM = 297 - 18;
const LEFT_W = 112;
const GAP = 8;
const SIDE_X = M + LEFT_W + GAP;
const SIDE_W = RIGHT - SIDE_X;

let cachedAssets = null;
function assets() {
  if (!cachedAssets) {
    const read = (name) => fs.readFileSync(path.join(ASSETS_DIR, name));
    cachedAssets = {
      regular: read('fonts/NotoSans-Regular.ttf'),
      bold: read('fonts/NotoSans-Bold.ttf'),
      logo: loadImage(read('logo.jpg')),
    };
  }
  return cachedAssets;
}

/** Перевірка при запуску: шрифти й логотип читаються. */
export function checkPdfAssets() {
  const a = assets();
  if (!a.logo) throw new Error('logo.jpg не прочитано');
  return true;
}

// Підписи бланка: українською або англійською (для англомовних клієнтів)
const WORDS = {
  uk: {
    types: { photo: 'фото', video: 'відео', animation: 'GIF', sticker: 'стікери', document: 'файли' },
    brief: 'бриф', title: 'Бриф на стікерпак', format: 'Формат', quantity: 'Кількість', price: 'Орієнтир ціни', priceTbd: 'уточнюється',
    source: 'Звідки прийшов', direct: 'напряму', post: 'пост у каналі', noUsername: 'без юзернейму', contact: 'Контакт', contactTg: 'писати в Telegram',
    client: 'Клієнт', notes: ['Вартість', 'Терміни', 'Дизайнер', 'Погоджено'], studioNotes: 'Нотатки студії', hero: 'Головний герой',
    emotions: 'Емоції та фрази', refs: 'Референси та вихідні файли', sent: 'Надіслано', files: 'Файли', noRefs: 'Клієнт не надсилав',
    like: 'Як у роботі:', promo: 'Промокод:', pkg: 'Пакет:', style: 'Стиль:', gift: 'Сертифікат:', addTo: 'Доповнення до:', invite: 'Запрошення:', discount: (p) => `знижка ${p}% на це замовлення`,
    previewNote: 'Превʼю зображень — на наступній сторінці, оригінали — у чаті з ботом.', refsPage: 'Референси', ref: 'Референс', briefNo: 'Бриф',
  },
  en: {
    types: { photo: 'photos', video: 'videos', animation: 'GIF', sticker: 'stickers', document: 'files' },
    brief: 'brief', title: 'Sticker pack brief', format: 'Format', quantity: 'Quantity', price: 'Price estimate', priceTbd: 'to be quoted',
    source: 'Came from', direct: 'direct', post: 'channel post', noUsername: 'no username', contact: 'Contact', contactTg: 'write in Telegram',
    client: 'Client', notes: ['Price', 'Deadline', 'Designer', 'Approved'], studioNotes: 'Studio notes', hero: 'Main character',
    emotions: 'Emotions and phrases', refs: 'References and source files', sent: 'Sent', files: 'Files', noRefs: 'The client sent none',
    like: 'Like the work:', promo: 'Promo code:', pkg: 'Package:', style: 'Style:', gift: 'Gift certificate:', addTo: 'Addition to:', invite: 'Referral:', discount: (p) => `${p}% discount on this order`,
    previewNote: 'Image previews are on the next page, originals are in the bot chat.', refsPage: 'References', ref: 'Reference', briefNo: 'Brief',
  },
};
// Заявка на бота чи персонажа — інші підписи
const PROJECT_WORDS = {
  uk: { title: 'Бриф на проєкт', format: 'Послуга', quantity: 'Що потрібно', price: 'Бюджет', hero: 'Проєкт', emotions: 'Опис' },
  en: { title: 'Project brief', format: 'Service', quantity: 'Needed', price: 'Budget', hero: 'Project', emotions: 'Description' },
};
const R = 'NotoSans-Regular';
const B = 'NotoSans-Bold';

/**
 * order — замовлення з bot-data.json, images — масив картинок з loadImage (превʼю референсів).
 */
export function renderBriefPdf(order, images = []) {
  const { regular, bold, logo } = assets();
  const lang = order.lang === 'en' ? 'en' : 'uk';
  const project = Boolean(order.service && order.service !== 'stickers');
  const W = project ? { ...WORDS[lang], ...PROJECT_WORDS[lang] } : WORDS[lang];
  const pdf = new PdfDocument({ title: `YABOT — ${W.brief} #${orderNo(order.id)}`, author: 'YABOT' });
  pdf.addFont(R, regular);
  pdf.addFont(B, bold);

  // Обрізає рядок під ширину з «…»
  const fit = (text, font, size, maxW) => {
    let t = pdf.printable(text, font);
    if (pdf.textWidth(t, font, size) <= maxW) return t;
    while (t.length > 1 && pdf.textWidth(`${t}…`, font, size) > maxW) t = t.slice(0, -1);
    return `${t.trimEnd()}…`;
  };
  const label = (x, y, text, color = MUTED, align = 'left') => {
    pdf.setFont(B, 6.8);
    pdf.text(x, y, text.toUpperCase(), { color, spacing: 0.7, align });
  };

  pdf.addPage();

  // ---------- Шапка ----------
  pdf.image(logo, M, 11, (25 * logo.width) / logo.height, 25);
  const no = `№ ${orderNo(order.id)}`;
  pdf.setFont(B, 9.5);
  const pillW = pdf.textWidth(no) + 8;
  pdf.roundRect(RIGHT - pillW, 12, pillW, 7, 3.5, ACCENT);
  pdf.text(RIGHT - pillW / 2, 17, no, { color: WHITE, align: 'center' });
  pdf.setFont(B, 21);
  pdf.text(RIGHT, 30.5, W.title, { color: INK, align: 'right' });
  pdf.setFont(R, 9);
  pdf.text(RIGHT, 36.5, formatDate(order.createdAt), { color: MUTED, align: 'right' });
  pdf.line(M, 43, RIGHT, 43, LINE, 0.3);

  // ---------- Плитки ключових фактів ----------
  const facts = [
    [W.format, order.stickerType, INK],
    [W.quantity, order.quantity, INK],
    [W.price, order.priceHint || W.priceTbd, order.priceHint ? ACCENT : MUTED],
    [W.source, /^p_[0-9a-f]{8}$/.test(order.source || '') ? W.post : order.source || W.direct, INK],
  ];
  const tileGap = 4;
  const tileW = (CONTENT_W - tileGap * 3) / 4;
  const clipped = []; // значення, що не вмістились у плитку — покажемо повністю в лівій колонці
  facts.forEach(([name, value, color], i) => {
    const x = M + i * (tileW + tileGap);
    pdf.roundRect(x, 49, tileW, 20, 3, TILE);
    label(x + 4, 55.5, name);
    const v = pdf.printable(value || '—', B);
    if (pdf.textWidth(v, B, 11.5) <= tileW - 8) {
      pdf.setFont(B, 11.5);
      pdf.text(x + 4, 64, v, { color });
    } else {
      // Довге значення (наприклад, своя кількість) — дрібніше у два рядки, щоб нічого не загубити
      const two = pdf.wrap(v, tileW - 8, B, 8.5);
      pdf.setFont(B, 8.5);
      pdf.text(x + 4, 61, two[0], { color });
      if (two[1]) pdf.text(x + 4, 65.2, two.length > 2 ? fit(two.slice(1).join(' '), B, 8.5, tileW - 8) : two[1], { color });
      if (two.length > 2) clipped.push([name, v]);
    }
  });

  // ---------- Права колонка: клієнт + нотатки ----------
  const bodyTop = 77;
  const pad = 6;
  const innerW = SIDE_W - pad * 2;
  const tg = order.username ? `@${order.username}` : W.noUsername;
  const rows = [
    [W.contact, order.contact || W.contactTg],
    ['Telegram', tg],
    ['Telegram ID', String(order.userId)],
  ];
  // Довге ім'я — зменшуємо шрифт, щоб слова не рвалися посередині
  const name = pdf.printable(order.fullName || W.client, B);
  const longestWord = Math.max(...name.split(/\s+/).map((w) => pdf.textWidth(w, B, 12)));
  const nameSize = longestWord <= innerW ? 12 : longestWord * (10 / 12) <= innerW ? 10 : 8.5;
  const nameLines = pdf.wrap(name, innerW, B, nameSize).slice(0, 2);
  const rowLines = rows.map(([k, v]) => [k, pdf.wrap(pdf.printable(v, R), innerW, R, 9.5).slice(0, 3)]);
  const cardH = pad + 6 + nameLines.length * 5.6 + 3 + rowLines.reduce((s, [, l]) => s + 4.5 + l.length * 4.6 + 2.5, 0) + pad - 2;
  pdf.roundRect(SIDE_X, bodyTop, SIDE_W, cardH, 4, DARK);
  let sy = bodyTop + pad + 3;
  label(SIDE_X + pad, sy, W.client, ACCENT);
  sy += 6.5;
  pdf.setFont(B, nameSize);
  for (const l of nameLines) { pdf.text(SIDE_X + pad, sy, l, { color: WHITE }); sy += 5.6; }
  sy += 2;
  for (const [k, lines] of rowLines) {
    label(SIDE_X + pad, sy, k, DARK_MUTED);
    sy += 4.5;
    pdf.setFont(R, 9.5);
    for (const l of lines) { pdf.text(SIDE_X + pad, sy, l, { color: WHITE }); sy += 4.6; }
    sy += 2.5;
  }

  // Нотатки студії — для друку й записів від руки
  const notesTop = bodyTop + cardH + 6;
  const notes = W.notes;
  const notesH = pad + 4 + notes.length * 10 + 3 * 7 + pad;
  pdf.roundRect(SIDE_X, notesTop, SIDE_W, notesH, 4, TILE);
  let ny = notesTop + pad + 3;
  label(SIDE_X + pad, ny, W.studioNotes);
  ny += 4;
  for (const n of notes) {
    pdf.setFont(R, 8);
    pdf.text(SIDE_X + pad, ny + 4.5, n, { color: MUTED });
    pdf.line(SIDE_X + pad + 17, ny + 5, SIDE_X + SIDE_W - pad, ny + 5, [200, 200, 200], 0.25, 0.6);
    ny += 10;
  }
  for (let i = 0; i < 3; i++) {
    pdf.line(SIDE_X + pad, ny + 5, SIDE_X + SIDE_W - pad, ny + 5, [200, 200, 200], 0.25, 0.6);
    ny += 7;
  }

  // ---------- Ліва колонка: зміст брифу ----------
  let y = bodyTop + 3;
  const ensure = (h) => {
    if (y + h > BOTTOM) { pdf.addPage(); y = 22; }
  };
  const heading = (text) => {
    ensure(14);
    label(M, y, text, ACCENT);
    y += 6;
  };
  const paragraph = (text, size = 11.5, lh = 5.9, color = INK, font = R) => {
    pdf.setFont(font, size);
    for (const l of pdf.wrap(pdf.printable(text, font) || '—', LEFT_W, font, size)) {
      ensure(lh);
      pdf.text(M, y, l, { color });
      y += lh;
    }
  };
  const divider = () => {
    y += 3;
    pdf.line(M, y, M + LEFT_W, y, LINE, 0.3);
    y += 7;
  };

  if (clipped.length) {
    for (const [name, v] of clipped) paragraph(`${name}: ${v}`, 9.5, 4.9, INK);
    divider();
  }

  heading(W.hero);
  paragraph(order.hero, 12.5, 6.3);
  divider();

  heading(W.emotions);
  const lines = String(order.emotions || '').split(/\r?\n/).map((l) => pdf.printable(l, R)).filter(Boolean);
  if (project) {
    // Опис проєкту — абзацами, без нумерованого списку; дедлайн окремим рядком
    for (const l of lines) paragraph(l, 10.5, 5.4);
    if (order.project?.deadline) paragraph(`${lang === 'en' ? 'Deadline' : 'Дедлайн'}: ${order.project.deadline}`, 10.5, 5.4, ACCENT);
  } else if (lines.length >= 2) {
    lines.forEach((raw, i) => {
      const text = raw.replace(/^\s*\d+\s*[.)]\s*/, '');
      pdf.setFont(R, 10.5);
      const wrapped = pdf.wrap(text, LEFT_W - 9, R, 10.5);
      ensure(wrapped.length * 5.2 + 2);
      pdf.circle(M + 2.6, y - 1.3, 2.6, ACCENT);
      pdf.setFont(B, 7);
      pdf.text(M + 2.6, y - 0.1, String(i + 1), { color: WHITE, align: 'center' });
      pdf.setFont(R, 10.5);
      for (const l of wrapped) { pdf.text(M + 9, y, l, { color: INK }); y += 5.2; }
      y += 2;
    });
    y -= 2;
  } else {
    paragraph(lines[0] || '—', 10.5, 5.3);
  }
  divider();

  heading(W.refs);
  const refs = order.refs || [];
  if (refs.length) {
    const counts = {};
    for (const r of refs) counts[r.type] = (counts[r.type] || 0) + 1;
    paragraph(`${W.sent} ${refs.length}: ` + Object.entries(counts).map(([t, n]) => `${W.types[t] || t} — ${n}`).join(', '), 10.5, 5.3);
    const files = refs.filter((r) => r.type === 'document' && r.name).map((r) => r.name);
    if (files.length) { y += 1; paragraph(`${W.files}: ${files.join(', ')}`, 8.5, 4.4, MUTED); }
  } else {
    paragraph(W.noRefs, 10.5, 5.3, MUTED);
  }
  const plaque = (tag, text) => {
    y += 2;
    ensure(10);
    pdf.roundRect(M, y - 4.2, LEFT_W, 9, 2.5, [255, 241, 233]);
    pdf.setFont(B, 8.5);
    pdf.text(M + 3.5, y + 1.2, tag, { color: ACCENT });
    const tagW = pdf.textWidth(tag, B, 8.5) + 2.5;
    pdf.setFont(R, 8.5);
    pdf.text(M + 3.5 + tagW, y + 1.2, fit(text, R, 8.5, LEFT_W - 7 - tagW), { color: INK });
    y += 9;
  };
  if (order.catalogRef) plaque(W.like, `${order.catalogRef.title} · t.me/addstickers/${order.catalogRef.name}`);
  if (order.repeatOf) {
    plaque(W.addTo, `#${orderNo(order.repeatOf.id)}${order.repeatOf.packName ? ` · t.me/addstickers/${order.repeatOf.packName}` : ''}`);
  }
  if (order.referral) plaque(W.invite, W.discount(order.referral.percent));
  if (order.package) plaque(W.pkg, `${order.lang === 'en' && order.package.nameEn ? order.package.nameEn : order.package.name} · ${Number(order.package.price).toLocaleString('uk-UA').replace(/\u00a0/g, ' ')} грн`);
  if (order.style) plaque(W.style, order.lang === 'en' && order.style.nameEn ? order.style.nameEn : order.style.name);
  if (order.gift) plaque(W.gift, `${order.gift.code} · ${order.gift.amount} грн`);
  if (order.promo) plaque(W.promo, `${order.promo.code} · ${W.discount(order.promo.percent)}`);
  if (images.length) {
    y += 1;
    paragraph(W.previewNote, 8.5, 4.4, MUTED);
  }

  // ---------- Сторінка референсів ----------
  if (images.length) {
    pdf.addPage();
    pdf.setFont(B, 18);
    pdf.text(M, 26, W.refsPage, { color: INK });
    pdf.setFont(R, 9);
    pdf.text(RIGHT, 26, `${W.briefNo} ${no} · ${pdf.printable(order.fullName || '', R)}`, { color: MUTED, align: 'right' });
    pdf.line(M, 32, RIGHT, 32, LINE, 0.3);
    const gap = 6;
    const cellW = (CONTENT_W - gap) / 2;
    const cellH = cellW * 0.8;
    let top = 39;
    images.forEach((img, i) => {
      const col = i % 2;
      if (col === 0 && i) top += cellH + gap + 7;
      if (top + cellH + 6 > BOTTOM) { pdf.addPage(); top = 22; }
      const x = M + col * (cellW + gap);
      pdf.roundRect(x, top, cellW, cellH, 4, TILE);
      pdf.image(img, x + 5, top + 5, cellW - 10, cellH - 10);
      label(x, top + cellH + 5, `${W.ref} ${i + 1}`);
    });
  }

  // ---------- Футер на кожній сторінці ----------
  const total = pdf.pages.length;
  pdf.pages.forEach((page, i) => {
    pdf.page = page;
    pdf.line(M, 284, RIGHT, 284, LINE, 0.3);
    for (let d = 0; d < 3; d++) pdf.circle(M + 0.8 + d * 2.6, 288.6, 0.8, ACCENT);
    pdf.setFont(R, 7.5);
    pdf.text(M + 10, 289.6, 'YABOT · Design for humans', { color: MUTED });
    pdf.text(RIGHT, 289.6, `${W.briefNo} ${no} · ${i + 1} / ${total}`, { color: MUTED, align: 'right' });
  });

  return pdf.output();
}
