// Агент-разработчик на общем ядре. Отличия от v0:
// 1. Права: терминала у модели нет совсем, писать можно только в src/, .env закрыт.
// 2. Gate: тесты и типы запускает обвязка. Пока они красные, задача не принята.
// Запуск: npx tsx agent/coding-agent.ts tasks/03-search-by-customer.md

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { runAgent, type Gate, type Tool } from './core'

const ROOT = process.cwd()

/** Путь обязан остаться внутри разрешённой папки */
function allow(path: string, folder: string) {
  const full = resolve(ROOT, path)
  const base = resolve(ROOT, folder)
  if (full !== base && !full.startsWith(base + sep)) throw new Error(folder === '.' ? 'доступ только внутри проекта' : `доступ только внутри ${folder}/`)
  if (basename(full).startsWith('.env')) throw new Error('файлы .env закрыты')
  return full
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', '.git', 'dist'].includes(entry.name)) return []
    const path = join(dir, entry.name)
    return entry.isDirectory() ? listFiles(path) : [relative(ROOT, path)]
  })
}

const tools: Record<string, Tool> = {
  list_files: {
    description: 'Список файлов в папке проекта',
    params: { dir: 'Папка от корня проекта, например: src' },
    run: ({ dir }) => listFiles(allow(dir, '.')).join('\n'),
  },
  read_file: {
    description: 'Прочитать файл проекта',
    params: { path: 'Путь к файлу от корня проекта' },
    run: ({ path }) => readFileSync(allow(path, '.'), 'utf8'),
  },
  write_file: {
    description: 'Создать файл или перезаписать его целиком. Разрешено только внутри src/',
    params: { path: 'Путь к файлу внутри src/', content: 'Полное содержимое файла' },
    run: ({ path, content }) => {
      const full = allow(path, 'src')
      mkdirSync(dirname(full), { recursive: true })
      writeFileSync(full, content)
      return `Записано: ${path}`
    },
  },
}

/** Проверки запускает обвязка. Модель не может их пропустить или пересказать по-своему. */
const gate: Gate = () => {
  for (const command of ['npm test', 'npm run typecheck']) {
    try {
      const env = { ...process.env, NO_COLOR: '1', CI: '1' }
      execSync(command, { encoding: 'utf8', stdio: 'pipe', timeout: 180_000, env })
    } catch (error) {
      const { stdout = '', stderr = '' } = error as { stdout?: string; stderr?: string }
      return { ok: false, report: `$ ${command}\n${(stdout + stderr).slice(-4000)}` }
    }
  }
  return { ok: true, report: '' }
}

const taskArg = process.argv[2]
if (!taskArg) throw new Error('Укажи задачу: npx tsx agent/coding-agent.ts tasks/03-search-by-customer.md')

const accepted = await runAgent({
  system:
    'Ты агент-разработчик. Работаешь с файлами проекта через инструменты. ' +
    'Терминала у тебя нет: тесты и проверку типов запустит система после твоего ответа. ' +
    'Сначала изучи нужные файлы, потом вноси изменения. ' +
    'Когда закончишь, коротко напиши, что сделано.\n\n' +
    readFileSync(join(ROOT, 'AGENTS.md'), 'utf8'),
  task: existsSync(taskArg) ? readFileSync(taskArg, 'utf8') : taskArg,
  tools,
  gate,
})

process.exit(accepted ? 0 : 1)
