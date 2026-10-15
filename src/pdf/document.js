// Простий генератор PDF: сторінки A4, текст TrueType-шрифтами (кирилиця), лінії, прямокутники,
// кола, картинки. Координати — у міліметрах від лівого верхнього кута.
import zlib from 'node:zlib';
import { TrueTypeFont } from './ttf.js';

const MM = 72 / 25.4;
const PAGE_W = 210;
const PAGE_H = 297;

const num = (n) => (Math.round(n * 1000) / 1000).toString();
const rgb = ([r, g, b]) => `${num(r / 255)} ${num(g / 255)} ${num(b / 255)}`;

export class PdfDocument {
  constructor({ title = '', author = '' } = {}) {
    this.title = title;
    this.author = author;
    this.fonts = new Map(); // name → { ttf, used: Map(gid → codePoint) }
    this.images = [];
    this.pages = [];
    this.width = PAGE_W;
    this.height = PAGE_H;
    this.font = null;
    this.size = 10;
  }

  addFont(name, buffer) {
    this.fonts.set(name, { ttf: new TrueTypeFont(buffer), used: new Map() });
  }

  addPage() {
    this.page = { ops: [] };
    this.pages.push(this.page);
    return this.page;
  }

  setFont(name, size) {
    this.font = name;
    this.size = size;
  }

  /** Перетворює рядок на гліфи; символів, яких немає у шрифті (емодзі тощо), просто пропускає. */
  glyphs(text, fontName = this.font) {
    const f = this.fonts.get(fontName);
    const out = [];
    for (const ch of String(text)) {
      const cp = ch.codePointAt(0);
      if (cp === 0xfe0f || cp === 0x200d) continue;
      const gid = f.ttf.glyphFor(cp);
      if (!gid) continue;
      out.push({ gid, cp, w: f.ttf.advance(gid) });
    }
    return out;
  }

  /** Прибирає символи, яких немає у шрифті (емодзі), і подвійні пробіли, що лишилися на їхньому місці. */
  printable(text, fontName = this.font) {
    const f = this.fonts.get(fontName);
    return [...String(text ?? '')]
      .filter((ch) => ch === '\n' || f.ttf.glyphFor(ch.codePointAt(0)))
      .join('')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/ +\n/g, '\n')
      .trim();
  }

  textWidth(text, fontName = this.font, size = this.size) {
    return (this.glyphs(text, fontName).reduce((s, g) => s + g.w, 0) * size) / 1000 / MM;
  }

  /** Текст із базовою лінією на висоті y. align: left | right (x — правий край) | center. */
  text(x, y, text, { color = [0, 0, 0], align = 'left', spacing = 0 } = {}) {
    const glyphs = this.glyphs(text);
    if (!glyphs.length) return;
    const f = this.fonts.get(this.font);
    for (const g of glyphs) f.used.set(g.gid, g.cp);
    const width = (glyphs.reduce((s, g) => s + g.w, 0) * this.size) / 1000 / MM + (spacing * (glyphs.length - 1)) / MM;
    let left = x;
    if (align === 'right') left = x - width;
    else if (align === 'center') left = x - width / 2;
    const hex = glyphs.map((g) => g.gid.toString(16).padStart(4, '0')).join('');
    const tc = `${num(spacing)} Tc `; // задаємо завжди: Tc зберігається між текстовими блоками сторінки
    this.page.ops.push(
      `BT ${rgb(color)} rg /${this.font} ${num(this.size)} Tf ${tc}${num(left * MM)} ${num((PAGE_H - y) * MM)} Td <${hex}> Tj ET`,
    );
  }

  /** Розбиває текст на рядки по ширині (з урахуванням \n). */
  wrap(text, maxWidth, fontName = this.font, size = this.size) {
    const lines = [];
    for (const paragraph of String(text).split(/\r?\n/)) {
      let line = '';
      for (const word of paragraph.split(/(\s+)/)) {
        if (!word) continue;
        const candidate = line + word;
        if (this.textWidth(candidate.trimEnd(), fontName, size) <= maxWidth) { line = candidate; continue; }
        if (line.trim()) lines.push(line.trimEnd());
        line = /^\s+$/.test(word) ? '' : word;
        // Дуже довге слово (посилання, хештег) ріжемо по символах. Місце розрізу шукаємо поділом навпіл:
        // перебір по одному символу на слові з 2000 знаків блокував бота на секунди
        while (this.textWidth(line, fontName, size) > maxWidth) {
          let lo = 1;
          let hi = line.length - 1;
          while (lo < hi) {
            const mid = Math.ceil((lo + hi) / 2);
            if (this.textWidth(line.slice(0, mid), fontName, size) <= maxWidth) lo = mid;
            else hi = mid - 1;
          }
          lines.push(line.slice(0, lo));
          line = line.slice(lo);
        }
      }
      lines.push(line.trimEnd());
    }
    return lines;
  }

  rect(x, y, w, h, color) {
    this.page.ops.push(`${rgb(color)} rg ${num(x * MM)} ${num((PAGE_H - y - h) * MM)} ${num(w * MM)} ${num(h * MM)} re f`);
  }

  /** Прямокутник із заокругленими кутами (заливка або обведення). */
  roundRect(x, y, w, h, r, color, { stroke = false, width = 0.3 } = {}) {
    r = Math.min(r, w / 2, h / 2);
    const k = 0.5523 * r;
    const X = (v) => num(v * MM);
    const Y = (v) => num((PAGE_H - v) * MM);
    const path =
      `${X(x + r)} ${Y(y)} m ${X(x + w - r)} ${Y(y)} l ` +
      `${X(x + w - r + k)} ${Y(y)} ${X(x + w)} ${Y(y + r - k)} ${X(x + w)} ${Y(y + r)} c ` +
      `${X(x + w)} ${Y(y + h - r)} l ` +
      `${X(x + w)} ${Y(y + h - r + k)} ${X(x + w - r + k)} ${Y(y + h)} ${X(x + w - r)} ${Y(y + h)} c ` +
      `${X(x + r)} ${Y(y + h)} l ` +
      `${X(x + r - k)} ${Y(y + h)} ${X(x)} ${Y(y + h - r + k)} ${X(x)} ${Y(y + h - r)} c ` +
      `${X(x)} ${Y(y + r)} l ` +
      `${X(x)} ${Y(y + r - k)} ${X(x + r - k)} ${Y(y)} ${X(x + r)} ${Y(y)} c h`;
    this.page.ops.push(stroke
      ? `${rgb(color)} RG ${num(width * MM)} w ${path} S`
      : `${rgb(color)} rg ${path} f`);
  }

  line(x1, y1, x2, y2, color, width = 0.3, dash = 0) {
    const d = dash ? `[${num(dash * MM)} ${num(dash * MM)}] 0 d ` : '';
    this.page.ops.push(
      `q ${d}${rgb(color)} RG ${num(width * MM)} w ${num(x1 * MM)} ${num((PAGE_H - y1) * MM)} m ${num(x2 * MM)} ${num((PAGE_H - y2) * MM)} l S Q`,
    );
  }

  circle(cx, cy, r, color) {
    const k = 0.5523 * r;
    const X = (v) => num(v * MM);
    const Y = (v) => num((PAGE_H - v) * MM);
    this.page.ops.push(
      `${rgb(color)} rg ${X(cx + r)} ${Y(cy)} m ` +
      `${X(cx + r)} ${Y(cy + k)} ${X(cx + k)} ${Y(cy + r)} ${X(cx)} ${Y(cy + r)} c ` +
      `${X(cx - k)} ${Y(cy + r)} ${X(cx - r)} ${Y(cy + k)} ${X(cx - r)} ${Y(cy)} c ` +
      `${X(cx - r)} ${Y(cy - k)} ${X(cx - k)} ${Y(cy - r)} ${X(cx)} ${Y(cy - r)} c ` +
      `${X(cx + k)} ${Y(cy - r)} ${X(cx + r)} ${Y(cy - k)} ${X(cx + r)} ${Y(cy)} c f`,
    );
  }

  /** Картинка (з loadImage), вписана в рамку w×h зі збереженням пропорцій і по центру. */
  image(img, x, y, w, h) {
    let index = this.images.indexOf(img);
    if (index < 0) { this.images.push(img); index = this.images.length - 1; }
    const scale = Math.min(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;
    this.page.ops.push(
      `q ${num(dw * MM)} 0 0 ${num(dh * MM)} ${num(dx * MM)} ${num((PAGE_H - dy - dh) * MM)} cm /Im${index} Do Q`,
    );
    return { x: dx, y: dy, w: dw, h: dh };
  }

  output() {
    const objects = [];
    const add = (body) => { objects.push(body); return objects.length; };
    const stream = (dict, data, compress = true) => {
      const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data, 'latin1');
      const payload = compress ? zlib.deflateSync(bytes) : bytes;
      const filter = compress ? ' /Filter /FlateDecode' : '';
      return Buffer.concat([
        Buffer.from(`<< ${dict}${filter} /Length ${payload.length} >>\nstream\n`, 'latin1'),
        payload,
        Buffer.from('\nendstream', 'latin1'),
      ]);
    };

    const catalogId = add(null);
    const pagesId = add(null);

    // Шрифти
    const fontRefs = [];
    let tagSeed = 0;
    for (const [name, f] of this.fonts) {
      if (!f.used.size) continue;
      const { ttf } = f;
      const gids = [...f.used.keys()].sort((a, b) => a - b);
      const tag = String.fromCharCode(...[...'YABOTA'].map((c, i) => 65 + ((c.charCodeAt(0) + tagSeed++ + i) % 26)));
      const baseName = `${tag}+${name}`;
      const scale = 1000 / ttf.unitsPerEm;
      const fontFile = ttf.subset(gids);
      const fileId = add(stream(`/Length1 ${fontFile.length}`, fontFile));
      const descId = add(
        `<< /Type /FontDescriptor /FontName /${baseName} /Flags 32 ` +
        `/FontBBox [${ttf.bbox.map((v) => Math.round(v * scale)).join(' ')}] /ItalicAngle 0 ` +
        `/Ascent ${Math.round(ttf.ascent * scale)} /Descent ${Math.round(ttf.descent * scale)} ` +
        `/CapHeight ${Math.round(ttf.capHeight * scale)} /StemV 80 /FontFile2 ${fileId} 0 R >>`,
      );
      const widths = gids.map((g) => `${g} [${Math.round(ttf.advance(g))}]`).join(' ');
      const cidId = add(
        `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${baseName} ` +
        `/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> ` +
        `/FontDescriptor ${descId} 0 R /CIDToGIDMap /Identity /W [${widths}] >>`,
      );
      const toUnicodeId = add(stream('', toUnicodeCMap(f.used)));
      const fontId = add(
        `<< /Type /Font /Subtype /Type0 /BaseFont /${baseName} /Encoding /Identity-H ` +
        `/DescendantFonts [${cidId} 0 R] /ToUnicode ${toUnicodeId} 0 R >>`,
      );
      fontRefs.push(`/${name} ${fontId} 0 R`);
    }

    // Картинки
    const imageRefs = this.images.map((img, i) => {
      let id;
      if (img.kind === 'jpeg') {
        const space = img.components === 1 ? '/DeviceGray' : img.components === 4 ? '/DeviceCMYK' : '/DeviceRGB';
        const decode = img.components === 4 ? ' /Decode [1 0 1 0 1 0 1 0]' : '';
        id = add(stream(
          `/Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace ${space} ` +
          `/BitsPerComponent 8${decode} /Filter /DCTDecode`, img.data, false,
        ));
      } else {
        let smask = '';
        if (img.alpha) {
          const maskId = add(stream(
            `/Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceGray /BitsPerComponent 8`,
            img.alpha,
          ));
          smask = ` /SMask ${maskId} 0 R`;
        }
        id = add(stream(
          `/Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8${smask}`,
          img.rgb,
        ));
      }
      return `/Im${i} ${id} 0 R`;
    });

    const resources = `<< /Font << ${fontRefs.join(' ')} >> /XObject << ${imageRefs.join(' ')} >> >>`;
    const pageIds = this.pages.map((page) => {
      const contentId = add(stream('', page.ops.join('\n')));
      return add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${num(PAGE_W * MM)} ${num(PAGE_H * MM)}] ` +
        `/Resources ${resources} /Contents ${contentId} 0 R >>`,
      );
    });
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    const infoId = add(`<< /Title ${pdfString(this.title)} /Author ${pdfString(this.author)} /Producer (YABOT) >>`);

    const chunks = [Buffer.from('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
    let length = chunks[0].length;
    const offsets = [];
    objects.forEach((body, i) => {
      offsets.push(length);
      const content = Buffer.isBuffer(body) ? body : Buffer.from(body, 'latin1');
      const chunk = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), content, Buffer.from('\nendobj\n', 'latin1')]);
      chunks.push(chunk);
      length += chunk.length;
    });
    const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`];
    for (const off of offsets) xref.push(`${String(off).padStart(10, '0')} 00000 n \n`);
    xref.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${length}\n%%EOF\n`);
    chunks.push(Buffer.from(xref.join(''), 'latin1'));
    return Buffer.concat(chunks);
  }
}

/** Текстові рядки PDF у UTF-16BE — щоб кирилиця в назві документа читалася. */
function pdfString(text) {
  const buf = Buffer.from(`﻿${text}`, 'utf16le');
  for (let i = 0; i < buf.length; i += 2) { const t = buf[i]; buf[i] = buf[i + 1]; buf[i + 1] = t; }
  return `<${buf.toString('hex')}>`;
}

/** Відповідність гліфів до Unicode — щоб текст у PDF можна було копіювати і шукати. */
function toUnicodeCMap(used) {
  const entries = [...used.entries()].sort((a, b) => a[0] - b[0]);
  const lines = [];
  for (let i = 0; i < entries.length; i += 100) {
    const chunk = entries.slice(i, i + 100);
    lines.push(`${chunk.length} beginbfchar`);
    for (const [gid, cp] of chunk) {
      const utf16 = Buffer.from(String.fromCodePoint(cp), 'utf16le');
      for (let j = 0; j < utf16.length; j += 2) { const t = utf16[j]; utf16[j] = utf16[j + 1]; utf16[j + 1] = t; }
      lines.push(`<${gid.toString(16).padStart(4, '0')}> <${utf16.toString('hex')}>`);
    }
    lines.push('endbfchar');
  }
  return [
    '/CIDInit /ProcSet findresource begin', '12 dict begin', 'begincmap',
    '/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def',
    '/CMapName /Adobe-Identity-UCS def', '/CMapType 2 def',
    '1 begincodespacerange', '<0000> <FFFF>', 'endcodespacerange',
    ...lines,
    'endcmap', 'CMapName currentdict /CMapResource defineresource pop', 'end', 'end',
  ].join('\n');
}
