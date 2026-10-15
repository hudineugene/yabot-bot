// Картинки для PDF без сторонніх бібліотек: JPEG вбудовується як є, PNG розпаковується.
// Повертає { width, height, ... } або null, якщо формат не підтримується (WebP, GIF, PSD тощо).
import zlib from 'node:zlib';

export const MAX_PIXELS = 2500 * 2500; // більші PNG у превʼю не беремо — PDF вийде завеликим

/** maxPixels — найбільший PNG (ширина × висота), який розпаковуємо; для стікерів більший, ніж для превʼю PDF. */
export function loadImage(buf, { maxPixels = MAX_PIXELS } = {}) {
  if (!buf || buf.length < 16) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return readJpeg(buf);
  if (buf.readUInt32BE(0) === 0x89504e47) return readPng(buf, maxPixels);
  return null;
}

function readJpeg(buf) {
  let p = 2;
  while (p + 9 < buf.length) {
    if (buf[p] !== 0xff) { p++; continue; }
    const marker = buf[p + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { p += 2; continue; }
    const len = buf.readUInt16BE(p + 2);
    // SOF0..SOF15, крім DHT/JPG/DAC
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      const height = buf.readUInt16BE(p + 5);
      const width = buf.readUInt16BE(p + 7);
      const components = buf[p + 9];
      if (!width || !height || ![1, 3, 4].includes(components)) return null;
      return { kind: 'jpeg', width, height, components, data: buf };
    }
    p += 2 + len;
  }
  return null;
}

function readPng(buf, maxPixels) {
  let p = 8;
  let ihdr = null;
  let palette = null;
  let trns = null;
  const idat = [];
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('latin1', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4),
        depth: data[8], color: data[9], interlace: data[12],
      };
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (!ihdr || ihdr.interlace || !ihdr.width || !ihdr.height || ihdr.width * ihdr.height > maxPixels) return null;
  const { width, height, depth, color } = ihdr;
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[color];
  if (!channels || ![1, 2, 4, 8, 16].includes(depth)) return null;
  if (color === 3 && !palette) return null;

  const bitsPerPixel = channels * depth;
  const stride = Math.ceil((width * bitsPerPixel) / 8);
  // Розпаковуємо не більше, ніж має бути за заголовком: «PNG-бомба» (маленький файл → гігабайти) інакше вбила б процес
  let raw;
  try { raw = zlib.inflateSync(Buffer.concat(idat), { maxOutputLength: (stride + 1) * height }); } catch { return null; }
  const bpp = Math.max(1, bitsPerPixel >> 3);
  const pixels = unfilter(raw, height, stride, bpp);

  const rgb = Buffer.alloc(width * height * 3);
  let alpha = null;
  const hasAlpha = color === 4 || color === 6 || trns;
  if (hasAlpha) alpha = Buffer.alloc(width * height, 255);

  const sample = (row, index) => {
    // index — номер семпла в рядку; повертає значення 0..255
    if (depth === 8) return pixels[row * stride + index];
    if (depth === 16) return pixels[row * stride + index * 2];
    const bit = index * depth;
    const byte = pixels[row * stride + (bit >> 3)];
    const v = (byte >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
    return color === 3 ? v : Math.round((v * 255) / ((1 << depth) - 1));
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let r, g, b, a = 255;
      if (color === 3) {
        const idx = sample(y, x);
        r = palette[idx * 3]; g = palette[idx * 3 + 1]; b = palette[idx * 3 + 2];
        if (trns && idx < trns.length) a = trns[idx];
      } else if (color === 0 || color === 4) {
        r = g = b = sample(y, x * channels);
        if (color === 4) a = sample(y, x * channels + 1);
      } else {
        r = sample(y, x * channels); g = sample(y, x * channels + 1); b = sample(y, x * channels + 2);
        if (color === 6) a = sample(y, x * channels + 3);
      }
      rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b;
      if (alpha) alpha[i] = a;
    }
  }
  if (alpha && alpha.every((v) => v === 255)) alpha = null;
  return { kind: 'raw', width, height, rgb, alpha };
}

function unfilter(raw, height, stride, bpp) {
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? out[dst + x - bpp] : 0;
      const up = y ? out[dst - stride + x] : 0;
      const upLeft = y && x >= bpp ? out[dst - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (filter === 1) v += left;
      else if (filter === 2) v += up;
      else if (filter === 3) v += (left + up) >> 1;
      else if (filter === 4) {
        const pp = left + up - upLeft;
        const pa = Math.abs(pp - left), pb = Math.abs(pp - up), pc = Math.abs(pp - upLeft);
        v += pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      out[dst + x] = v & 0xff;
    }
  }
  return out;
}
