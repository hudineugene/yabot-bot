// Голосове з Mini App: браузер (Android, комп'ютер) записує Opus у контейнері WebM, а Telegram
// приймає голосові лише як OGG/Opus, MP3 чи M4A. Тут — перепакування WebM → OGG без перекодування.

const ID = {
  EBML: 0x1a45dfa3, Segment: 0x18538067, Cluster: 0x1f43b675, Tracks: 0x1654ae6b, TrackEntry: 0xae,
  BlockGroup: 0xa0, SimpleBlock: 0xa3, Block: 0xa1, CodecPrivate: 0x63a2, CodecID: 0x86,
};
const MASTERS = new Set([ID.Segment, ID.Cluster, ID.Tracks, ID.TrackEntry, ID.BlockGroup]);

function vint(buf, pos, keepMarker) {
  const first = buf[pos];
  if (first === undefined) return null;
  let len = 1;
  while (len <= 8 && !(first & (0x80 >> (len - 1)))) len++;
  if (len > 8 || pos + len > buf.length) return null;
  let value = keepMarker ? first : first & (0xff >> len);
  let allOnes = (first & (0xff >> len)) === (0xff >> len);
  for (let i = 1; i < len; i++) {
    value = value * 256 + buf[pos + i];
    if (buf[pos + i] !== 0xff) allOnes = false;
  }
  return { value, len, unknown: !keepMarker && allOnes };
}

/** Витягає з WebM заголовок OpusHead і пакети Opus (у порядку запису). null — це не WebM/Opus. */
export function parseWebmOpus(buf) {
  if (buf.length < 4 || buf.readUInt32BE(0) !== ID.EBML) return null;
  let pos = 0, head = null, codec = '';
  const packets = [];
  while (pos < buf.length) {
    const id = vint(buf, pos, true);
    if (!id) break;
    const size = vint(buf, pos + id.len, false);
    if (!size) break;
    const start = pos + id.len + size.len;
    // Контейнери проходимо всередину (у MediaRecorder розмір Segment/Cluster часто «невідомий»)
    if (MASTERS.has(id.value)) { pos = start; continue; }
    if (size.unknown) break;
    const end = Math.min(buf.length, start + size.value);
    if (id.value === ID.CodecPrivate) head = buf.subarray(start, end);
    else if (id.value === ID.CodecID) codec = buf.subarray(start, end).toString('latin1');
    else if (id.value === ID.SimpleBlock || id.value === ID.Block) {
      const track = vint(buf, start, false);
      if (track) {
        const flags = buf[start + track.len + 2];
        const data = buf.subarray(start + track.len + 3, end);
        if ((flags & 0x06) === 0 && data.length) packets.push(Buffer.from(data)); // без «лейсингу» — як пише MediaRecorder
        else if (data.length) return null;
      }
    }
    pos = end;
  }
  if (codec && codec !== 'A_OPUS') return null;
  if (!packets.length) return null;
  return { head: head && head.subarray(0, 8).toString('latin1') === 'OpusHead' ? Buffer.from(head) : defaultHead(), packets };
}

function defaultHead(channels = 1) {
  const h = Buffer.alloc(19);
  h.write('OpusHead', 0, 'latin1');
  h[8] = 1; h[9] = channels;
  h.writeUInt16LE(312, 10);
  h.writeUInt32LE(48000, 12);
  return h;
}

/** Скільки семплів (48 кГц) у пакеті Opus — з байта TOC (RFC 6716, розд. 3.1). */
export function opusSamples(packet) {
  if (!packet.length) return 0;
  const toc = packet[0];
  const config = toc >> 3;
  let ms;
  if (config < 12) ms = [10, 20, 40, 60][config & 3];
  else if (config < 16) ms = [10, 20][config & 1];
  else ms = [2.5, 5, 10, 20][config & 3];
  const c = toc & 3;
  const frames = c === 0 ? 1 : c < 3 ? 2 : (packet[1] || 0) & 0x3f;
  return Math.round(frames * ms * 48);
}

// CRC-32 для OGG (поліном 0x04C11DB7, без віддзеркалення)
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let r = i << 24;
    for (let k = 0; k < 8; k++) r = r & 0x80000000 ? ((r << 1) ^ 0x04c11db7) >>> 0 : (r << 1) >>> 0;
    t[i] = r >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0;
  for (const b of buf) c = ((c << 8) ^ CRC[((c >>> 24) ^ b) & 0xff]) >>> 0;
  return c >>> 0;
}

function page(packets, { granule, serial, seq, flags }) {
  const segs = [];
  for (const p of packets) {
    let n = p.length;
    while (n >= 255) { segs.push(255); n -= 255; }
    segs.push(n);
  }
  const header = Buffer.alloc(27 + segs.length);
  header.write('OggS', 0, 'latin1');
  header[4] = 0;
  header[5] = flags;
  header.writeBigInt64LE(BigInt(granule), 6);
  header.writeUInt32LE(serial, 14);
  header.writeUInt32LE(seq, 18);
  header[26] = segs.length;
  segs.forEach((s, i) => { header[27 + i] = s; });
  const out = Buffer.concat([header, ...packets]);
  out.writeUInt32LE(crc32(out), 22);
  return out;
}

/** Збирає OGG/Opus із заголовка й пакетів. Повертає { buffer, duration } (секунди). */
export function buildOggOpus({ head, packets }, serial = 0x59414254) {
  const vendor = Buffer.from('YABOT', 'latin1');
  const tags = Buffer.alloc(8 + 4 + vendor.length + 4);
  tags.write('OpusTags', 0, 'latin1');
  tags.writeUInt32LE(vendor.length, 8);
  vendor.copy(tags, 12);
  tags.writeUInt32LE(0, 12 + vendor.length);
  const pages = [page([head], { granule: 0, serial, seq: 0, flags: 0x02 }), page([tags], { granule: 0, serial, seq: 1, flags: 0 })];
  let seq = 2, granule = 0, group = [], segCount = 0;
  const flush = (last) => {
    if (!group.length) return;
    pages.push(page(group, { granule, serial, seq: seq++, flags: last ? 0x04 : 0 }));
    group = []; segCount = 0;
  };
  packets.forEach((p, i) => {
    const segs = Math.floor(p.length / 255) + 1;
    if (segCount + segs > 255 || group.length >= 50) flush(false);
    group.push(p);
    segCount += segs;
    granule += opusSamples(p);
    if (i === packets.length - 1) flush(true);
  });
  const preSkip = head.length >= 12 ? head.readUInt16LE(10) : 0;
  return { buffer: Buffer.concat(pages), duration: Math.max(1, Math.round((granule - preSkip) / 48000)) };
}

/** Визначити формат запису: ogg | webm | m4a | mp3 | null. */
export function audioKind(buf) {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 4).toString('latin1') === 'OggS') return 'ogg';
  if (buf.readUInt32BE(0) === ID.EBML) return 'webm';
  if (buf.subarray(4, 8).toString('latin1') === 'ftyp') return 'm4a';
  if (buf.subarray(0, 3).toString('latin1') === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return 'mp3';
  return null;
}
