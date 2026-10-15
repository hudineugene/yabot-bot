// Мінімальний парсер TrueType-шрифту: метрики, cmap і підмножина гліфів для вбудовування в PDF.
// Підмножина зберігає номери гліфів (невикористані просто порожні), тож у PDF можна
// використовувати CIDToGIDMap /Identity.

const KEEP_TABLES = ['head', 'hhea', 'maxp', 'hmtx', 'loca', 'glyf', 'cvt ', 'fpgm', 'prep'];

export class TrueTypeFont {
  constructor(buffer) {
    this.buf = buffer;
    this.tables = readTableDirectory(buffer);
    for (const tag of ['head', 'hhea', 'maxp', 'hmtx', 'loca', 'glyf', 'cmap']) {
      if (!this.tables[tag]) throw new Error(`Шрифт без таблиці ${tag} (потрібен TrueType, не OTF/CFF)`);
    }

    const head = this.tables.head.offset;
    this.unitsPerEm = buffer.readUInt16BE(head + 18);
    this.bbox = [0, 1, 2, 3].map((i) => buffer.readInt16BE(head + 36 + i * 2));
    this.longLoca = buffer.readInt16BE(head + 50) === 1;

    const hhea = this.tables.hhea.offset;
    this.ascent = buffer.readInt16BE(hhea + 4);
    this.descent = buffer.readInt16BE(hhea + 6);
    this.numHMetrics = buffer.readUInt16BE(hhea + 34);
    this.numGlyphs = buffer.readUInt16BE(this.tables.maxp.offset + 4);

    const os2 = this.tables['OS/2'];
    this.capHeight = os2 && os2.length >= 90 ? buffer.readInt16BE(os2.offset + 88) : this.ascent;

    this.cmap = parseCmap(buffer, this.tables.cmap.offset);
    this.glyphOffsets = this.readLoca();
  }

  /** Ширина гліфа в одиницях 1/1000 em (одиниці PDF). */
  advance(gid) {
    const hmtx = this.tables.hmtx.offset;
    const i = Math.min(gid, this.numHMetrics - 1);
    return (this.buf.readUInt16BE(hmtx + i * 4) * 1000) / this.unitsPerEm;
  }

  glyphFor(codePoint) {
    return this.cmap.get(codePoint) || 0;
  }

  readLoca() {
    const loca = this.tables.loca.offset;
    const out = new Array(this.numGlyphs + 1);
    for (let i = 0; i <= this.numGlyphs; i++) {
      out[i] = this.longLoca ? this.buf.readUInt32BE(loca + i * 4) : this.buf.readUInt16BE(loca + i * 2) * 2;
    }
    return out;
  }

  glyphData(gid) {
    const glyf = this.tables.glyf.offset;
    return this.buf.subarray(glyf + this.glyphOffsets[gid], glyf + this.glyphOffsets[gid + 1]);
  }

  /** Складені гліфи (наприклад «й» = «и» + бреве) тягнуть за собою свої частини. */
  withComponents(gids) {
    const all = new Set([0, ...gids]);
    const queue = [...all];
    while (queue.length) {
      const data = this.glyphData(queue.pop());
      if (data.length < 10 || data.readInt16BE(0) >= 0) continue;
      let p = 10;
      for (;;) {
        const flags = data.readUInt16BE(p);
        const component = data.readUInt16BE(p + 2);
        if (!all.has(component)) { all.add(component); queue.push(component); }
        p += 4 + (flags & 0x0001 ? 4 : 2);
        if (flags & 0x0008) p += 2;
        else if (flags & 0x0040) p += 4;
        else if (flags & 0x0080) p += 8;
        if (!(flags & 0x0020)) break;
      }
    }
    return all;
  }

  /** Файл шрифту лише з потрібними гліфами — інші залишаються порожніми. */
  subset(usedGids) {
    const keep = this.withComponents(usedGids);
    const parts = [];
    const loca = Buffer.alloc((this.numGlyphs + 1) * 4);
    let offset = 0;
    for (let gid = 0; gid < this.numGlyphs; gid++) {
      loca.writeUInt32BE(offset, gid * 4);
      if (!keep.has(gid)) continue;
      const data = this.glyphData(gid);
      const padded = Buffer.alloc((data.length + 3) & ~3);
      data.copy(padded);
      parts.push(padded);
      offset += padded.length;
    }
    loca.writeUInt32BE(offset, this.numGlyphs * 4);

    const head = Buffer.from(this.tableBytes('head'));
    head.writeUInt32BE(0, 8); // checkSumAdjustment
    head.writeInt16BE(1, 50); // довгий формат loca

    const newTables = {};
    for (const tag of KEEP_TABLES) {
      if (tag === 'head') newTables[tag] = head;
      else if (tag === 'loca') newTables[tag] = loca;
      else if (tag === 'glyf') newTables[tag] = Buffer.concat(parts);
      else if (this.tables[tag]) newTables[tag] = this.tableBytes(tag);
    }
    return buildFont(newTables);
  }

  tableBytes(tag) {
    const t = this.tables[tag];
    return this.buf.subarray(t.offset, t.offset + t.length);
  }
}

function readTableDirectory(buf) {
  const numTables = buf.readUInt16BE(4);
  const tables = {};
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = buf.toString('latin1', rec, rec + 4);
    tables[tag] = { offset: buf.readUInt32BE(rec + 8), length: buf.readUInt32BE(rec + 12) };
  }
  return tables;
}

function parseCmap(buf, cmapOffset) {
  const count = buf.readUInt16BE(cmapOffset + 2);
  let best = null;
  for (let i = 0; i < count; i++) {
    const rec = cmapOffset + 4 + i * 8;
    const platform = buf.readUInt16BE(rec);
    const encoding = buf.readUInt16BE(rec + 2);
    const offset = cmapOffset + buf.readUInt32BE(rec + 4);
    const format = buf.readUInt16BE(offset);
    if (platform === 3 && encoding === 10 && format === 12) { best = { offset, format }; break; }
    if (platform === 3 && encoding === 1 && format === 4 && !best) best = { offset, format };
    if (platform === 0 && format === 4 && !best) best = { offset, format };
  }
  if (!best) throw new Error('У шрифті немає Unicode-таблиці cmap');

  const map = new Map();
  const o = best.offset;
  if (best.format === 12) {
    const groups = buf.readUInt32BE(o + 12);
    for (let i = 0; i < groups; i++) {
      const g = o + 16 + i * 12;
      const start = buf.readUInt32BE(g);
      const end = buf.readUInt32BE(g + 4);
      const glyph = buf.readUInt32BE(g + 8);
      for (let c = start; c <= end; c++) map.set(c, glyph + (c - start));
    }
    return map;
  }

  const segX2 = buf.readUInt16BE(o + 6);
  const ends = o + 14;
  const starts = ends + segX2 + 2;
  const deltas = starts + segX2;
  const rangeOffsets = deltas + segX2;
  for (let s = 0; s < segX2; s += 2) {
    const end = buf.readUInt16BE(ends + s);
    const start = buf.readUInt16BE(starts + s);
    const delta = buf.readInt16BE(deltas + s);
    const rangeOffset = buf.readUInt16BE(rangeOffsets + s);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let glyph;
      if (rangeOffset === 0) glyph = (c + delta) & 0xffff;
      else {
        const addr = rangeOffsets + s + rangeOffset + (c - start) * 2;
        glyph = buf.readUInt16BE(addr);
        if (glyph) glyph = (glyph + delta) & 0xffff;
      }
      if (glyph) map.set(c, glyph);
    }
  }
  return map;
}

function checksum(buf) {
  let sum = 0;
  const padded = buf.length % 4 ? Buffer.concat([buf, Buffer.alloc(4 - (buf.length % 4))]) : buf;
  for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0;
  return sum;
}

function buildFont(tables) {
  const tags = Object.keys(tables).sort();
  const n = tags.length;
  const header = Buffer.alloc(12 + n * 16);
  header.writeUInt32BE(0x00010000, 0);
  header.writeUInt16BE(n, 4);
  const pow = 2 ** Math.floor(Math.log2(n));
  header.writeUInt16BE(pow * 16, 6);
  header.writeUInt16BE(Math.log2(pow), 8);
  header.writeUInt16BE(n * 16 - pow * 16, 10);

  const bodies = [];
  let offset = header.length;
  tags.forEach((tag, i) => {
    const data = tables[tag];
    const rec = 12 + i * 16;
    header.write(tag, rec, 'latin1');
    header.writeUInt32BE(checksum(data), rec + 4);
    header.writeUInt32BE(offset, rec + 8);
    header.writeUInt32BE(data.length, rec + 12);
    const padded = Buffer.alloc((data.length + 3) & ~3);
    data.copy(padded);
    bodies.push(padded);
    offset += padded.length;
  });
  return Buffer.concat([header, ...bodies]);
}
