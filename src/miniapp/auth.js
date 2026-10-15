// Перевірка initData від Telegram Mini App: підпис HMAC-SHA256 ключем, похідним від токена бота.
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
import crypto from 'node:crypto';

const MAX_AGE_SEC = 24 * 60 * 60;

/** Повертає { user, authDate } або null, якщо підпис невірний чи дані застарілі. */
export function verifyInitData(initData, botToken, now = Date.now()) {
  if (!initData || !botToken || initData.length > 4096) return null;
  let params;
  try { params = new URLSearchParams(initData); } catch { return null; }
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  params.delete('hash');
  const check = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = crypto.createHmac('sha256', secret).update(check).digest();
  if (!crypto.timingSafeEqual(expected, Buffer.from(hash, 'hex'))) return null;
  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || now / 1000 - authDate > MAX_AGE_SEC || authDate - now / 1000 > 300) return null;
  let user;
  try { user = JSON.parse(params.get('user') || 'null'); } catch { return null; }
  if (!user || !Number.isSafeInteger(user.id) || user.is_bot) return null;
  return { user, authDate, startParam: String(params.get('start_param') || '').slice(0, 64) };
}

/** Підписати initData (для тестів і локального перегляду). */
export function signInitData(fields, botToken) {
  const params = new URLSearchParams(fields);
  const check = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}
