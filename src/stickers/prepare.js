// Підготовка файлів стікерів під вимоги Telegram (без сторонніх бібліотек):
// PNG до 4096 px → 512 px по більшій стороні (білінійне масштабування + власний PNG-кодер);
// WEBP, TGS, WEBM — перевіряємо розмір і вагу.
import zlib from 'node:zlib';
import { loadImage } from '../pdf/images.js';

const STATIC_MAX = 512 * 1024;
const TGS_MAX = 64 * 1024;
const WEBM_MAX = 256 * 1024;
// Найбільший PNG, який бот зменшує сам: типовий експорт дизайнера до 4096 px (у пам'яті — до ~200 МБ на час обробки)
const STICKER_PNG_SIDE = 4096;

export class StickerFileError extends Error {}

/** Повертає { buffer, format: 'static'|'animated'|'video', filename, mime }. */
export function prepareSticker(buf, name = '') {
  const lower = String(name).toLowerCase();
  if (buf[0] === 0x1f && buf[1] === 0x8b || lower.endsWith('.tgs')) {
    if (buf.length > TGS_MAX) throw new StickerFileError(`${name || 'TGS'}: анимация больше 64 КБ`);
    return { buffer: buf, format: 'animated', filename: 'sticker.tgs', mime: 'application/x-tgsticker' };
  }
  if (buf.readUInt32BE(0) === 0x1a45dfa3 || lower.endsWith('.webm')) {
    if (buf.length > WEBM_MAX) throw new StickerFileError(`${name || 'WEBM'}: видео больше 256 КБ`);
    return { buffer: buf, format: 'video', filename: 'sticker.webm', mime: 'video/webm' };
  }
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    const size = webpSize(buf);
    if (!size || Math.max(size.width, size.height) !== 512) {
      throw new StickerFileError(`${name || 'WEBP'}: нужна сторона 512 px${size ? ` (сейчас ${size.width}×${size.height})` : ''} — пришлите PNG, бот подгонит сам`);
    }
    if (buf.length > STATIC_MAX) throw new StickerFileError(`${name || 'WEBP'}: больше 512 КБ`);
    return { buffer: buf, format: 'static', filename: 'sticker.webp', mime: 'image/webp' };
  }
  if (buf.readUInt32BE(0) === 0x89504e47) {
    const w = buf.length >= 24 ? buf.readUInt32BE(16) : 0;
    const h = buf.length >= 24 ? buf.readUInt32BE(20) : 0;
    if (w > STICKER_PNG_SIDE || h > STICKER_PNG_SIDE) {
      throw new StickerFileError(`${name || 'PNG'}: ${w}×${h} px — слишком большой, нужна сторона до ${STICKER_PNG_SIDE} px`);
    }
    const img = loadImage(buf, { maxPixels: STICKER_PNG_SIDE * STICKER_PNG_SIDE });
    if (!img) throw new StickerFileError(`${name || 'PNG'}: не удалось прочитать (поддерживаются обычные PNG без чересстрочности)`);
    if (Math.max(img.width, img.height) === 512 && buf.length <= STATIC_MAX) {
      return { buffer: buf, format: 'static', filename: 'sticker.png', mime: 'image/png' };
    }
    const png = encodePng(resizeToFit(img, 512));
    if (png.length > STATIC_MAX) throw new StickerFileError(`${name || 'PNG'}: даже после уменьшения больше 512 КБ — упростите картинку`);
    return { buffer: png, format: 'static', filename: 'sticker.png', mime: 'image/png' };
  }
  throw new StickerFileError(`${name || 'файл'}: нужен PNG, WEBP, TGS или WEBM`);
}

function webpSize(buf) {
  const chunk = buf.toString('latin1', 12, 16);
  if (chunk === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff) };
  }
  return null;
}

/** Білінійне масштабування до max сторони (з урахуванням прозорості). Повертає RGBA. */
function resizeToFit(img, max) {
  const scale = max / Math.max(img.width, img.height);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const src = Buffer.alloc(img.width * img.height * 4);
  for (let i = 0; i < img.width * img.height; i++) {
    src[i * 4] = img.rgb[i * 3]; src[i * 4 + 1] = img.rgb[i * 3 + 1]; src[i * 4 + 2] = img.rgb[i * 3 + 2];
    src[i * 4 + 3] = img.alpha ? img.alpha[i] : 255;
  }
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = Math.min(img.height - 1, Math.max(0, (y + 0.5) / scale - 0.5));
    const y0 = Math.floor(sy); const y1 = Math.min(img.height - 1, y0 + 1); const fy = sy - y0;
    for (let x = 0; x < w; x++) {
      const sx = Math.min(img.width - 1, Math.max(0, (x + 0.5) / scale - 0.5));
      const x0 = Math.floor(sx); const x1 = Math.min(img.width - 1, x0 + 1); const fx = sx - x0;
      const p = (xx, yy) => (yy * img.width + xx) * 4;
      const a00 = src[p(x0, y0) + 3], a10 = src[p(x1, y0) + 3], a01 = src[p(x0, y1) + 3], a11 = src[p(x1, y1) + 3];
      const w00 = (1 - fx) * (1 - fy) * a00, w10 = fx * (1 - fy) * a10, w01 = (1 - fx) * fy * a01, w11 = fx * fy * a11;
      const aw = w00 + w10 + w01 + w11;
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        // Колір зважуємо на прозорість, щоб краї не темніли
        out[o + c] = aw > 0
          ? Math.round((src[p(x0, y0) + c] * w00 + src[p(x1, y0) + c] * w10 + src[p(x0, y1) + c] * w01 + src[p(x1, y1) + c] * w11) / aw)
          : 0;
      }
      out[o + 3] = Math.round(a00 * (1 - fx) * (1 - fy) + a10 * fx * (1 - fy) + a01 * (1 - fx) * fy + a11 * fx * fy);
    }
  }
  return { width: w, height: h, rgba: out };
}

/** PNG RGBA 8 біт з адаптивним вибором фільтра рядка. */
function encodePng({ width, height, rgba }) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  const prev = Buffer.alloc(stride);
  const cand = [0, 1, 2, 4].map(() => Buffer.alloc(stride));
  for (let y = 0; y < height; y++) {
    const row = rgba.subarray(y * stride, (y + 1) * stride);
    const up = y ? rgba.subarray((y - 1) * stride, y * stride) : prev;
    let best = 0;
    let bestSum = Infinity;
    [0, 1, 2, 4].forEach((f, k) => {
      const outRow = cand[k];
      let sum = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= 4 ? row[i - 4] : 0;
        const b = up[i];
        const c = i >= 4 ? up[i - 4] : 0;
        let pred = 0;
        if (f === 1) pred = a;
        else if (f === 2) pred = b;
        else if (f === 4) {
          const pp = a + b - c;
          const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
          pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        const v = (row[i] - pred) & 0xff;
        outRow[i] = v;
        sum += v < 128 ? v : 256 - v;
      }
      if (sum < bestSum) { bestSum = sum; best = k; }
    });
    raw[y * (stride + 1)] = [0, 1, 2, 4][best];
    cand[best].copy(raw, y * (stride + 1) + 1);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 біт, RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Емодзі з підпису до файлу (до 20), за замовчуванням 😊. */
export function emojisFrom(caption) {
  const found = String(caption || '').match(/\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?)*/gu) || [];
  return found.length ? found.slice(0, 20) : ['😊'];
}
