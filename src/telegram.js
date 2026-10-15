// Клієнт Telegram Bot API на вбудованому fetch (без npm-пакетів).
const API = 'https://api.telegram.org';
const MAX_DOWNLOAD = 20 * 1024 * 1024; // ліміт Bot API на завантаження файлів

export class TelegramError extends Error {
  constructor(method, code, description, retryAfter) {
    super(`${method}: ${code} ${description}`);
    this.code = code === 'NETWORK' ? 'NETWORK' : `HTTP_${code}`;
    this.status = code;
    this.description = description;
    this.retryAfter = retryAfter;
  }
}

export class Telegram {
  constructor(token) {
    this.token = token;
  }

  async call(method, params = {}, { timeoutMs = 30000, signal } = {}) {
    for (let attempt = 0; ; attempt++) {
      let res;
      try {
        const signals = [AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])];
        const body = params instanceof FormData ? params : JSON.stringify(params);
        res = await fetch(`${API}/bot${this.token}/${method}`, {
          method: 'POST',
          headers: params instanceof FormData ? {} : { 'content-type': 'application/json' },
          body,
          signal: AbortSignal.any(signals),
        });
      } catch (err) {
        if (signal?.aborted) throw err;
        const e = new TelegramError(method, 'NETWORK', err.cause?.code || err.name || err.message);
        e.code = err.name === 'TimeoutError' ? 'TIMEOUT' : (err.cause?.code || 'NETWORK');
        throw e;
      }
      const json = await res.json().catch(() => ({ ok: false, description: `HTTP ${res.status}` }));
      if (json.ok) {
        // Журнал переписки (journal.js): що бот надіслав людині
        try { Telegram.onSent?.(method, params, json.result); } catch { /* журнал не заважає надсиланню */ }
        return json.result;
      }
      const retryAfter = json.parameters?.retry_after;
      if (res.status === 429 && retryAfter && attempt < 2 && retryAfter <= 30) {
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }
      throw new TelegramError(method, res.status, json.description || 'error', retryAfter);
    }
  }

  /** Надсилання файлу з пам'яті (PDF, картинка). */
  async sendFile(method, field, chatId, buffer, filename, mime, extra = {}) {
    const form = new FormData();
    form.set('chat_id', String(chatId));
    for (const [k, v] of Object.entries(extra)) {
      form.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
    form.set(field, new Blob([buffer], { type: mime }), filename);
    return this.call(method, form, { timeoutMs: 120000 });
  }

  /** Завантаження файлу з довільними полями (наприклад, uploadStickerFile з user_id). */
  async upload(method, fields, fileField, buffer, filename, mime) {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    form.set(fileField, new Blob([buffer], { type: mime }), filename);
    return this.call(method, form, { timeoutMs: 120000 });
  }

  /** Запит з кількома файлами (альбом): files = [{ field, buffer, filename, mime }]. */
  async callWithFiles(method, fields, files) {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined || v === null) continue;
      form.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
    for (const f of files) form.set(f.field, new Blob([f.buffer], { type: f.mime }), f.filename);
    return this.call(method, form, { timeoutMs: 180000 });
  }

  async download(fileId) {
    const file = await this.call('getFile', { file_id: fileId });
    if (!file.file_path || (file.file_size && file.file_size > MAX_DOWNLOAD)) return null;
    const res = await fetch(`${API}/file/bot${this.token}/${file.file_path}`, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new TelegramError('download', res.status, res.statusText);
    return Buffer.from(await res.arrayBuffer());
  }
}
