// Налаштування з оточення. На сервері їх задає панель YABOT (шаблон контейнера):
// PORT, ADMIN_HOST, BOT_DATA_FILE, ADMIN_ALLOWED_HOSTS, NODE_ENV, NO_AUTO_OPEN.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ASSETS_DIR = path.join(APP_DIR, 'assets');

export const PORT = Number(process.env.PORT || 3000);
export const HOST = process.env.ADMIN_HOST || '127.0.0.1';

// Локально дані лежать поруч із кодом (bot-data.json і backups/ панель при завантаженні не бере).
export const DATA_FILE = path.resolve(process.env.BOT_DATA_FILE || path.join(APP_DIR, 'bot-data.json'));
export const DATA_DIR = path.dirname(DATA_FILE);
export const BACKUP_DIR = path.join(DATA_DIR, 'backups');

export const ALLOWED_HOSTS = (process.env.ADMIN_ALLOWED_HOSTS || '')
  .split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);

export const IS_TRIAL = process.env.YABOT_TRIAL === '1';
export const TIME_ZONE = 'Europe/Kyiv';
