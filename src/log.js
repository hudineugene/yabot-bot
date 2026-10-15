// Журнал у stdout — його показує панель («Журнал» бота). Формат простий: час, рівень, текст.
import { formatDate } from './util.js';

const stamp = () => formatDate(new Date().toISOString());

export const log = {
  info: (msg) => console.log(`${stamp()}  ${msg}`),
  warn: (msg) => console.warn(`${stamp()}  ! ${msg}`),
  error: (msg) => console.error(`${stamp()}  !!! ${msg}`),
};

/** Блок самоперевірки у форматі, який розбирає панель: «Проверка при запуске:» + рядки. */
export function printSelfCheck(items) {
  const marks = { ok: '  ok  ', warn: '  !   ', fail: ' !!!  ' };
  const lines = ['Проверка при запуске:'];
  for (const { status, title, detail } of items) lines.push(`  ${marks[status] || marks.warn}${title}: ${detail}`);
  console.log(lines.join('\n'));
}
