// Рахунок на оплату й акт наданих послуг у PDF (для компаній): реквізити виконавця і замовника,
// таблиця послуг, сума цифрами й прописом, підписи.
import fs from 'node:fs';
import path from 'node:path';
import { PdfDocument } from './document.js';
import { loadImage } from './images.js';
import { ASSETS_DIR } from '../config.js';
import { orderNo, todayKey, dateText } from '../util.js';

const INK = [20, 20, 20];
const ACCENT = [249, 68, 0];
const MUTED = [120, 120, 120];
const LINE = [210, 210, 210];
const TILE = [245, 245, 245];
const M = 16;
const W = 210;
const R = W - M;

let cache = null;
function assets() {
  if (!cache) {
    const read = (name) => fs.readFileSync(path.join(ASSETS_DIR, name));
    cache = { regular: read('fonts/NotoSans-Regular.ttf'), bold: read('fonts/NotoSans-Bold.ttf'), logo: loadImage(read('logo.jpg')) };
  }
  return cache;
}

// --- Сума прописом (українською) ---

const ONES_M = ['', 'один', 'два', 'три', 'чотири', "п'ять", 'шість', 'сім', 'вісім', "дев'ять"];
const ONES_F = ['', 'одна', 'дві', 'три', 'чотири', "п'ять", 'шість', 'сім', 'вісім', "дев'ять"];
const TEENS = ['десять', 'одинадцять', 'дванадцять', 'тринадцять', 'чотирнадцять', "п'ятнадцять", 'шістнадцять', 'сімнадцять', 'вісімнадцять', "дев'ятнадцять"];
const TENS = ['', '', 'двадцять', 'тридцять', 'сорок', "п'ятдесят", 'шістдесят', 'сімдесят', 'вісімдесят', "дев'яносто"];
const HUNDREDS = ['', 'сто', 'двісті', 'триста', 'чотириста', "п'ятсот", 'шістсот', 'сімсот', 'вісімсот', "дев'ятсот"];

function form(n, [one, few, many]) {
  const a = n % 100;
  const b = n % 10;
  if (a >= 11 && a <= 14) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
}

function triad(n, female) {
  const words = [];
  words.push(HUNDREDS[Math.floor(n / 100)]);
  const rest = n % 100;
  if (rest >= 10 && rest < 20) words.push(TEENS[rest - 10]);
  else {
    words.push(TENS[Math.floor(rest / 10)]);
    words.push((female ? ONES_F : ONES_M)[rest % 10]);
  }
  return words.filter(Boolean).join(' ');
}

/** 3500.5 → «Три тисячі п'ятсот гривень 50 копійок» */
export function amountInWords(value) {
  const total = Math.round(Number(value) * 100);
  const uah = Math.floor(total / 100);
  const kop = total % 100;
  const parts = [];
  const millions = Math.floor(uah / 1e6);
  const thousands = Math.floor((uah % 1e6) / 1000);
  const units = uah % 1000;
  if (millions) parts.push(`${triad(millions, false)} ${form(millions, ['мільйон', 'мільйони', 'мільйонів'])}`);
  if (thousands) parts.push(`${triad(thousands, true)} ${form(thousands, ['тисяча', 'тисячі', 'тисяч'])}`);
  if (units || !uah) parts.push(units ? triad(units, true) : 'нуль');
  const text = `${parts.join(' ')} ${form(uah, ['гривня', 'гривні', 'гривень'])} ${String(kop).padStart(2, '0')} ${form(kop, ['копійка', 'копійки', 'копійок'])}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const fmtMoney = (n) => Number(n).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\u00a0/g, ' ');

/**
 * kind: 'invoice' | 'act'. company — реквізити студії, billing — реквізити замовника,
 * amount — сума, service — назва послуги.
 */
export function renderDocPdf(kind, { order, company, billing, amount, service, number, date = todayKey() }) {
  const { regular, bold, logo } = assets();
  const isAct = kind === 'act';
  const title = isAct ? 'АКТ надання послуг' : 'РАХУНОК НА ОПЛАТУ';
  const no = number || `${orderNo(order.id)}${isAct ? '-А' : '-Р'}`;
  const pdf = new PdfDocument({ title: `${title} № ${no}`, author: company.name || 'YABOT' });
  pdf.addFont('R', regular);
  pdf.addFont('B', bold);
  pdf.addPage();

  // Шапка
  pdf.image(logo, M, 12, (20 * logo.width) / logo.height, 20);
  pdf.setFont('B', 16);
  pdf.text(R, 22, title, { color: INK, align: 'right' });
  pdf.setFont('R', 10);
  pdf.text(R, 29, `№ ${no} від ${dateText(date)}`, { color: MUTED, align: 'right' });
  pdf.line(M, 38, R, 38, LINE, 0.3);

  let y = 46;
  const label = (x, yy, text) => { pdf.setFont('B', 7); pdf.text(x, yy, text.toUpperCase(), { color: ACCENT, spacing: 0.6 }); };
  const block = (x, w, head, lines) => {
    label(x, y, head);
    let yy = y + 5.5;
    for (const [i, raw] of lines.filter(Boolean).entries()) {
      pdf.setFont(i === 0 ? 'B' : 'R', i === 0 ? 10.5 : 9);
      for (const l of pdf.wrap(pdf.printable(raw, i === 0 ? 'B' : 'R'), w, i === 0 ? 'B' : 'R', i === 0 ? 10.5 : 9)) {
        pdf.text(x, yy, l, { color: INK });
        yy += i === 0 ? 5.2 : 4.6;
      }
    }
    return yy;
  };
  const colW = (R - M - 10) / 2;
  const supplier = [
    company.name, company.code ? `Код ЄДРПОУ / ІПН: ${company.code}` : '', company.iban ? `IBAN: ${company.iban}` : '',
    company.bank ? `Банк: ${company.bank}` : '', company.address, company.phone ? `Тел.: ${company.phone}` : '', company.email,
    company.vat ? 'Платник ПДВ' : 'Не є платником ПДВ',
  ];
  const client = billing?.name ? billing : { name: order.fullName || (order.username ? `@${order.username}` : 'Замовник') };
  const buyer = [client.name, client.code ? `Код ЄДРПОУ / ІПН: ${client.code}` : '', client.address, billing?.name ? '' : order.contact];
  const y1 = block(M, colW, isAct ? 'Виконавець' : 'Постачальник', supplier);
  const y2 = block(M + colW + 10, colW, isAct ? 'Замовник' : 'Покупець', buyer);
  y = Math.max(y1, y2) + 6;

  if (isAct) {
    pdf.setFont('R', 9.5);
    const intro = `Ми, що нижче підписалися, представник Виконавця ${company.signer || company.name || ''} з одного боку та представник Замовника ${client.name} з іншого боку, склали цей акт про те, що Виконавцем були надані такі послуги:`;
    for (const l of pdf.wrap(pdf.printable(intro, 'R'), R - M, 'R', 9.5)) { pdf.text(M, y, l, { color: INK }); y += 4.8; }
    y += 4;
  }

  // Таблиця
  const cols = [[M, 10, '№'], [M + 10, 92, 'Найменування'], [M + 102, 16, 'Од.'], [M + 118, 16, 'К-сть'], [M + 134, 22, 'Ціна'], [M + 156, R - M - 156, 'Сума']];
  pdf.rect(M, y - 5, R - M, 8, TILE);
  pdf.setFont('B', 8.5);
  for (const [x, , h] of cols) pdf.text(x + 2, y, h, { color: INK });
  y += 7;
  pdf.setFont('R', 9.5);
  const nameLines = pdf.wrap(pdf.printable(service, 'R'), 88, 'R', 9.5);
  const row = [['1', 0], [null, 1], ['посл.', 2], ['1', 3], [fmtMoney(amount), 4], [fmtMoney(amount), 5]];
  for (const [val, i] of row) if (val !== null) pdf.text(cols[i][0] + 2, y, val, { color: INK });
  nameLines.forEach((l, i) => pdf.text(cols[1][0] + 2, y + i * 4.8, l, { color: INK }));
  y += Math.max(1, nameLines.length) * 4.8 + 2;
  pdf.line(M, y, R, y, LINE, 0.3);
  y += 7;
  pdf.setFont('B', 11);
  pdf.text(R, y, `Разом: ${fmtMoney(amount)} грн`, { color: INK, align: 'right' });
  y += 5.5;
  pdf.setFont('R', 9);
  pdf.text(R, y, company.vat ? `У тому числі ПДВ (20%): ${fmtMoney(amount / 6)} грн` : 'Без ПДВ', { color: MUTED, align: 'right' });
  y += 8;
  pdf.setFont('R', 9.5);
  for (const l of pdf.wrap(pdf.printable(`${isAct ? 'Загальна вартість наданих послуг' : 'Сума до сплати'}: ${amountInWords(amount)}${company.vat ? ', у т.ч. ПДВ' : ', без ПДВ'}.`, 'R'), R - M, 'R', 9.5)) {
    pdf.text(M, y, l, { color: INK }); y += 4.8;
  }
  y += 3;
  if (isAct) {
    pdf.text(M, y, pdf.printable('Замовник претензій щодо обсягу, якості та строків надання послуг не має.', 'R'), { color: INK });
    y += 16;
    const half = (R - M) / 2;
    label(M, y, 'Від Виконавця');
    label(M + half + 5, y, 'Від Замовника');
    y += 14;
    pdf.line(M, y, M + half - 10, y, INK, 0.3);
    pdf.line(M + half + 5, y, R, y, INK, 0.3);
    pdf.setFont('R', 8.5);
    pdf.text(M, y + 4.5, pdf.printable(company.signer || '', 'R'), { color: MUTED });
    pdf.text(M + half + 5, y + 4.5, pdf.printable(billing?.signer || client.name || '', 'R'), { color: MUTED });
  } else {
    pdf.setFont('R', 9);
    pdf.text(M, y, pdf.printable(`Призначення платежу: оплата за ${service}, рахунок № ${no}`, 'R'), { color: MUTED });
    y += 16;
    label(M, y, 'Виписав(ла)');
    y += 12;
    pdf.line(M, y, M + 70, y, INK, 0.3);
    pdf.setFont('R', 8.5);
    pdf.text(M, y + 4.5, pdf.printable(company.signer || '', 'R'), { color: MUTED });
  }

  pdf.line(M, 284, R, 284, [228, 228, 228], 0.3);
  pdf.setFont('R', 7.5);
  pdf.text(M, 289.6, 'YABOT · Design for humans', { color: MUTED });
  pdf.text(R, 289.6, `Замовлення #${orderNo(order.id)}`, { color: MUTED, align: 'right' });
  return pdf.output();
}
