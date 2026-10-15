// Подарунковий сертифікат YABOT у PDF: темна картка з логотипом, сумою, кодом і терміном дії, під нею — як скористатися.
import fs from 'node:fs';
import path from 'node:path';
import { PdfDocument } from './document.js';
import { loadImage } from './images.js';
import { ASSETS_DIR } from '../config.js';

const INK = [20, 20, 20];
const ACCENT = [249, 68, 0];
const MUTED = [128, 128, 128];
const DARK = [24, 24, 24];
const LIGHT = [200, 200, 200];
const WHITE = [255, 255, 255];
const TILE = [244, 244, 244];
const M = 18;
const W = 210;

let fonts = null;
function assets() {
  if (!fonts) {
    const read = (name) => fs.readFileSync(path.join(ASSETS_DIR, name));
    fonts = { regular: read('fonts/NotoSans-Regular.ttf'), bold: read('fonts/NotoSans-Bold.ttf'), logo: loadImage(read('logo.jpg')) };
  }
  return fonts;
}

const WORDS = {
  uk: {
    title: 'Подарунковий сертифікат', on: 'на власний стікерпак від студії YABOT', code: 'Код', until: 'Діє до', amount: 'грн',
    howTitle: 'Як скористатися', steps: (link) => [
      `Відкрийте посилання ${link} — бот збереже сертифікат за вами.`,
      'Або в боті на кроці перевірки брифу натисніть «Маю промокод» і введіть код.',
      'Заповніть короткий бриф — сума сертифіката врахується у вартості стікерпаку.',
    ],
    from: 'Від кого', note: 'Сертифікат можна використати один раз. Якщо стікерпак коштує більше — доплачується різниця.',
  },
  en: {
    title: 'Gift certificate', on: 'for your own sticker pack from YABOT studio', code: 'Code', until: 'Valid until', amount: 'UAH',
    howTitle: 'How to use it', steps: (link) => [
      `Open the link ${link} — the bot will save the certificate for you.`,
      'Or in the bot, at the brief check step, tap «I have a promo code» and enter the code.',
      'Fill in a short brief — the certificate amount will count towards the price.',
    ],
    from: 'From', note: 'The certificate can be used once. If the sticker pack costs more, you pay the difference.',
  },
};

/** g = { code, amount, until (YYYY-MM-DD), from? }, link — посилання на бота з кодом. */
export function renderCertificatePdf(g, link, lang = 'uk') {
  const t = WORDS[lang === 'en' ? 'en' : 'uk'];
  const { regular, bold, logo } = assets();
  const pdf = new PdfDocument({ title: `YABOT — ${t.title}`, author: 'YABOT' });
  pdf.addFont('R', regular);
  pdf.addFont('B', bold);
  pdf.addPage();

  // Темна картка
  const top = 18;
  const h = 128;
  pdf.roundRect(M, top, W - M * 2, h, 6, DARK);
  // Білий «бейдж» під логотип (логотип чорний на білому)
  pdf.roundRect(M + 10, top + 10, 34, 34, 5, WHITE);
  pdf.image(logo, M + 13, top + 13, 28, 28);
  for (let d = 0; d < 3; d++) pdf.circle(W - M - 14 - d * 5, top + 16, 1.4, ACCENT);

  pdf.setFont('B', 9);
  pdf.text(M + 52, top + 22, t.title.toUpperCase(), { color: ACCENT, spacing: 1.2 });
  pdf.setFont('R', 10.5);
  pdf.text(M + 52, top + 30, t.on, { color: LIGHT });

  const amount = `${Number(g.amount).toLocaleString('uk-UA').replace(/\u00a0/g, ' ')} ${t.amount}`;
  pdf.setFont('B', 44);
  pdf.text(M + 10, top + 78, pdf.printable(amount, 'B'), { color: WHITE });

  // Код і термін
  pdf.setFont('B', 7.5);
  pdf.text(M + 10, top + 96, t.code.toUpperCase(), { color: LIGHT, spacing: 0.8 });
  pdf.text(M + 100, top + 96, t.until.toUpperCase(), { color: LIGHT, spacing: 0.8 });
  pdf.setFont('B', 16);
  const codeW = pdf.textWidth(g.code, 'B', 16) + 10;
  pdf.roundRect(M + 10, top + 99, codeW, 11, 5.5, ACCENT);
  pdf.text(M + 15, top + 107.2, g.code, { color: WHITE });
  pdf.setFont('B', 14);
  pdf.text(M + 100, top + 107, g.until ? g.until.split('-').reverse().join('.') : '—', { color: WHITE });
  if (g.from) {
    pdf.setFont('R', 9);
    pdf.text(M + 10, top + 121, `${t.from}: ${pdf.printable(g.from, 'R')}`, { color: LIGHT });
  }

  // Як скористатися
  let y = top + h + 16;
  pdf.setFont('B', 8);
  pdf.text(M, y, t.howTitle.toUpperCase(), { color: ACCENT, spacing: 0.8 });
  y += 8;
  t.steps(link).forEach((step, i) => {
    pdf.circle(M + 3, y - 1.4, 3, ACCENT);
    pdf.setFont('B', 8);
    pdf.text(M + 3, y - 0.1, String(i + 1), { color: WHITE, align: 'center' });
    pdf.setFont('R', 11);
    for (const line of pdf.wrap(pdf.printable(step, 'R'), W - M * 2 - 12, 'R', 11)) {
      pdf.text(M + 10, y, line, { color: INK });
      y += 5.8;
    }
    y += 3;
  });
  y += 4;
  pdf.roundRect(M, y, W - M * 2, 16, 4, TILE);
  pdf.setFont('R', 9);
  const note = pdf.wrap(pdf.printable(t.note, 'R'), W - M * 2 - 10, 'R', 9);
  note.forEach((line, i) => pdf.text(M + 5, y + 6.5 + i * 4.6, line, { color: MUTED }));

  pdf.line(M, 284, W - M, 284, [228, 228, 228], 0.3);
  pdf.setFont('R', 7.5);
  pdf.text(M, 289.6, 'YABOT · Design for humans', { color: MUTED });
  return pdf.output();
}
