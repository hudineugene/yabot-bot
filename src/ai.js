// ІІ-помічник на Claude API (без npm — прямий HTTP-запит до Messages API):
// ідеї емоцій і фраз для брифу клієнта та чернетки постів для каналу.
// Ключ: секрет панелі ANTHROPIC_API_KEY або поле на сторінці бота (секрет важливіший).
import { store } from './store.js';
import { log } from './log.js';
import { todayKey } from './util.js';

const API = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/+$/, '');

export const AI_MODELS = {
  'claude-opus-5-5': { label: 'Claude Opus 5.5 — лучшее качество', input: 4, output: 20, fallbacks: true },
  'claude-sonnet-5-5': { label: 'Claude Sonnet 5.5 — быстрее и дешевле', input: 2, output: 10, fallbacks: true },
  'claude-haiku-5-5': { label: 'Claude Haiku 5.5 — самый дешёвый', input: 0.1, output: 0.5, fallbacks: false },
};

export const AI_DEFAULTS = { key: '', model: 'claude-opus-5-5', briefIdeas: true, channelWriter: true };

export class AiError extends Error {}

export function aiSettings() {
  const c = store.data.config;
  c.ai = { ...AI_DEFAULTS, ...(c.ai || {}) };
  if (!AI_MODELS[c.ai.model]) c.ai.model = AI_DEFAULTS.model;
  return c.ai;
}

export function aiKey() {
  return (process.env.ANTHROPIC_API_KEY || aiSettings().key || '').trim();
}

export function aiKeySource() {
  if (process.env.ANTHROPIC_API_KEY) return 'env';
  return aiSettings().key ? 'page' : null;
}

/** Чи доступна функція: є ключ і функцію не вимкнено. */
/**
 * Загальний денний ліміт ІІ-підказок для клієнтів (усі разом, чат і Mini App): навіть якщо хтось
 * наробить багато акаунтів, рахунок у Anthropic не виросте. Повертає true й рахує спробу або false.
 */
export const CLIENT_AI_DAILY = 200;
export function takeClientAi() {
  const st = store.data.stats;
  const day = todayKey();
  if (st.aiClient?.day !== day) st.aiClient = { day, n: 0 };
  if (st.aiClient.n >= CLIENT_AI_DAILY) return false;
  st.aiClient.n++;
  return true;
}
export function returnClientAi() {
  const st = store.data.stats;
  if (st.aiClient?.n > 0) st.aiClient.n--;
}

export function aiAvailable(feature) {
  return Boolean(aiKey()) && aiSettings()[feature] !== false;
}

function headers(key, model) {
  return {
    'content-type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    // Якщо модель відмовить за правилами безпеки — сервер сам перезапустить запит на рекомендованій моделі
    ...(AI_MODELS[model]?.fallbacks ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {}),
  };
}

function countUsage(model, usage) {
  const st = store.data.stats;
  const month = todayKey().slice(0, 7);
  if (st.ai?.month !== month) st.ai = { month, calls: 0, input: 0, output: 0, cost: 0 };
  const price = AI_MODELS[model] || AI_MODELS[AI_DEFAULTS.model];
  const input = (usage?.input_tokens || 0) + (usage?.cache_creation_input_tokens || 0) + (usage?.cache_read_input_tokens || 0);
  const output = usage?.output_tokens || 0;
  st.ai.calls++;
  st.ai.input += input;
  st.ai.output += output;
  st.ai.cost = Math.round((st.ai.cost + (input * price.input + output * price.output) / 1e6) * 10000) / 10000;
  store.save();
}

/**
 * Один запит до Claude зі структурованою відповіддю (JSON за схемою).
 * Повертає розібраний об'єкт.
 */
async function ask({ system, prompt, schema, maxTokens = 4000, timeoutMs = 90000 }) {
  const key = aiKey();
  if (!key) throw new AiError('Не задан ключ Claude API (Настройки → ИИ-помощник).');
  const { model } = aiSettings();
  const body = {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema } },
    ...(AI_MODELS[model]?.fallbacks ? { fallbacks: 'default' } : {}),
  };
  let res;
  try {
    res = await fetch(`${API}/v1/messages`, {
      method: 'POST', headers: headers(key, model), body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new AiError(err.name === 'TimeoutError' ? 'Claude не ответил вовремя.' : `Нет связи с Claude API (${err.cause?.code || err.name}).`);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const text = json.error?.message || `HTTP ${res.status}`;
    if (res.status === 401 || res.status === 403) throw new AiError(`Claude API не принял ключ (${text}).`);
    if (res.status === 429) throw new AiError('Claude API: слишком много запросов или исчерпан лимит — попробуйте позже.');
    throw new AiError(`Claude API: ${text}`);
  }
  countUsage(json.model || model, json.usage);
  if (json.stop_reason === 'refusal') throw new AiError('Claude отказался выполнять этот запрос.');
  if (json.stop_reason === 'max_tokens') throw new AiError('Ответ Claude оказался слишком длинным.');
  const text = (json.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError('Claude вернул ответ в неожиданном формате.');
  }
}

/** Перевірка ключа і моделі без генерації (GET /v1/models/{id}). */
export async function verifyKey(rawKey) {
  const key = String(rawKey || '').trim() || aiKey();
  if (!key) throw new AiError('Введите ключ Claude API.');
  const { model } = aiSettings();
  let res;
  try {
    res = await fetch(`${API}/v1/models/${encodeURIComponent(model)}`, { headers: headers(key, null), signal: AbortSignal.timeout(20000) });
  } catch (err) {
    throw new AiError(`Нет связи с Claude API (${err.cause?.code || err.name}).`);
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 || res.status === 403) throw new AiError('Ключ не подходит — проверьте, что скопировали его полностью.');
  if (!res.ok) throw new AiError(`Claude API: ${json.error?.message || `HTTP ${res.status}`}`);
  return { model: json.display_name || json.id || model };
}

// --- Ідеї емоцій для брифу ---

const IDEAS_SCHEMA = {
  type: 'object',
  properties: {
    ideas: {
      type: 'array',
      items: {
        type: 'object',
        properties: { emotion: { type: 'string' }, phrase: { type: 'string' } },
        required: ['emotion', 'phrase'],
        additionalProperties: false,
      },
    },
  },
  required: ['ideas'],
  additionalProperties: false,
};

/** Скільки ідей просити: під кількість стікерів у брифі (5…20). */
function ideasCount(quantity) {
  const n = Math.max(...(String(quantity || '').match(/\d+/g) || ['15']).map(Number));
  return Math.min(20, Math.max(8, n + 3));
}

/**
 * Список емоцій і фраз для стікерів клієнта.
 * avoid — попередні ідеї, щоб наступний варіант був іншим.
 */
export async function suggestEmotions({ hero, stickerType, quantity, catalogTitle, lang = 'uk', avoid = [] }) {
  const count = ideasCount(quantity);
  const language = lang === 'en' ? 'English' : 'Ukrainian';
  const system =
    'You help clients of YABOT, a Telegram sticker design studio, fill in a brief for a custom sticker pack. ' +
    'Suggest emotions and short phrases (captions) for stickers that people will actually send in everyday chats: ' +
    'greetings, thanks, agreement, refusal, laughter, surprise, tiredness, support, celebration and so on, ' +
    `adapted to the character. Write in ${language}. Phrases are short (1–4 words), lively and natural for messengers, ` +
    'without profanity, politics or offensive content. Each emotion is 1–3 words. Never repeat ideas.';
  const prompt = [
    `Main character of the sticker pack: ${hero || 'not specified'}`,
    `Sticker type: ${stickerType || 'not specified'}`,
    `Planned number of stickers: ${quantity || 'not specified'}`,
    ...(catalogTitle ? [`The client likes the studio's pack «${catalogTitle}» as a reference.`] : []),
    ...(avoid.length ? [`Already suggested (give different ideas): ${avoid.join('; ')}`] : []),
    `Suggest ${count} ideas.`,
  ].join('\n');
  const result = await ask({ system, prompt, schema: IDEAS_SCHEMA, maxTokens: 4000, timeoutMs: 60000 });
  const ideas = (result.ideas || [])
    .map((i) => ({ emotion: String(i.emotion || '').trim().slice(0, 40), phrase: String(i.phrase || '').trim().slice(0, 60) }))
    .filter((i) => i.emotion)
    .slice(0, 20);
  if (!ideas.length) throw new AiError('Claude не предложил идей.');
  return ideas;
}

export function ideasText(ideas, lang = 'uk') {
  const [open, close] = lang === 'en' ? ['“', '”'] : ['«', '»'];
  return ideas.map((i, n) => `${n + 1}. ${i.emotion}${i.phrase ? ` (${open}${i.phrase}${close})` : ''}`).join('\n');
}

// --- Опис проєкту (бот, персонаж) для заявки в Mini App ---

const PROJECT_SCHEMA = {
  type: 'object',
  properties: { description: { type: 'string' } },
  required: ['description'],
  additionalProperties: false,
};

/**
 * Готовий опис проєкту для брифу: мета, аудиторія, ключові можливості чи образ, побажання.
 * current — те, що клієнт уже написав (зберігаємо його факти).
 */
export async function suggestProjectBrief({ service, title, need, current = '', lang = 'uk' }) {
  const language = lang === 'en' ? 'English' : 'Ukrainian';
  const bot = service === 'bots';
  const kind = bot ? 'a Telegram bot with a mini app (miniApp)' : 'a brand character or mascot';
  const focus = bot
    ? 'the goal, who will use it, key features and screens, payments or integrations if relevant, and style wishes'
    : 'the goal, the audience, personality, look, key emotions and poses, and where the character will be used';
  const system =
    `You help clients of YABOT, a design and development studio, write a clear brief for ${kind}. ` +
    `Write in ${language}, in plain text without Markdown or headings. Cover ${focus}. ` +
    'Give 5–8 short lines, each starting with "• ". Keep every fact the client already wrote; where details are missing, ' +
    'suggest sensible options the client can easily edit. No prices, no deadlines, no greetings or closing remarks.';
  const prompt = [
    `Project name: ${title || 'not specified'}`,
    `What the client needs: ${need || 'a new project'}`,
    `Client's own draft: ${String(current || '').trim() || '(empty)'}`,
  ].join('\n');
  const result = await ask({ system, prompt, schema: PROJECT_SCHEMA, maxTokens: 1500, timeoutMs: 60000 });
  const text = String(result.description || '').trim().slice(0, 1900);
  if (text.length < 10) throw new AiError('Claude не предложил описание.');
  return text;
}

// --- Чернетка поста для каналу ---

const POST_SCHEMA = {
  type: 'object',
  properties: { post: { type: 'string' } },
  required: ['post'],
  additionalProperties: false,
};

const TONES = {
  friendly: 'friendly and playful, with a few emoji',
  business: 'business-like and concise, minimal emoji',
  festive: 'festive and energetic, with emoji',
  sale: 'promotional: a clear offer and a call to action',
};
const LENGTHS = { short: 'short: 2–4 sentences', medium: 'medium: 1–3 short paragraphs', long: 'detailed: up to 5 short paragraphs' };

/** Текст поста у HTML Telegram (b, i, u, s, a, blockquote). */
export async function writePost({ brief, tone = 'friendly', length = 'medium', lang = 'uk', current = '' }) {
  const about = String(brief || '').trim();
  if (!about) throw new AiError('Опишите, о чём пост.');
  const language = lang === 'en' ? 'English' : 'Ukrainian';
  const system =
    'You write posts for the Telegram channel of YABOT, a studio that designs custom static and animated Telegram sticker packs ' +
    '(for people, teams and brands; clients order through the bot @' + (store.data.bot.username || 'yabotuabot') + '). ' +
    `Write in ${language}. Format with Telegram HTML only: <b>, <i>, <u>, <s>, <a href="...">, <blockquote>; ` +
    'use plain line breaks (\\n) for paragraphs — no <p>, <br>, markdown or hashtag spam (at most 2 hashtags). ' +
    'Do not add a signature or contact block — the studio adds its own. Do not invent prices, dates, discounts or facts that are not in the request.';
  const prompt = [
    `What the post is about: ${about.slice(0, 2000)}`,
    `Tone: ${TONES[tone] || TONES.friendly}.`,
    `Length: ${LENGTHS[length] || LENGTHS.medium}.`,
    ...(current.trim() ? [`Current draft in the editor (improve or rewrite it according to the request):\n${current.slice(0, 3000)}`] : []),
  ].join('\n');
  const result = await ask({ system, prompt, schema: POST_SCHEMA, maxTokens: 6000, timeoutMs: 90000 });
  const post = String(result.post || '').trim();
  if (!post) throw new AiError('Claude вернул пустой пост.');
  log.info('ИИ подготовил черновик поста для канала');
  return post;
}
