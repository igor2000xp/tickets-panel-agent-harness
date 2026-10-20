// v0. Весь агент в одном файле: модель, три инструмента, цикл.
// Запуск: npx tsx agent/v0.ts tasks/02-reset-filters.md

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

try {
  process.loadEnvFile()
} catch {
  // файла .env может не быть, если переменные уже заданы в окружении
}
const BASE_URL = process.env.LLM_BASE_URL ?? 'https://openrouter.ai/api/v1'
const API_KEY = process.env.LLM_API_KEY
const MODEL = process.env.LLM_MODEL
if (!API_KEY || !MODEL) throw new Error('Заполни LLM_API_KEY и LLM_MODEL в файле .env')

// ───────── 1. Модель: один HTTP-запрос ─────────

type ToolCall = { id: string; function: { name: string; arguments: string } }
type Message =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

async function chat(messages: Message[]) {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, tools: toolSpecs }),
  })
  if (!response.ok) throw new Error(`Модель ответила ${response.status}: ${await response.text()}`)
  const data = (await response.json()) as { choices: { message: Message }[] }
  return data.choices[0].message as Extract<Message, { role: 'assistant' }>
}

// ───────── 2. Инструменты: описание для модели + обычная функция ─────────

type Tool = {
  description: string
  params: Record<string, string>
  run: (args: Record<string, string>) => string
}

const tools: Record<string, Tool> = {
  read_file: {
    description: 'Прочитать файл проекта',
    params: { path: 'Путь к файлу от корня проекта' },
    run: ({ path }) => readFileSync(path, 'utf8'),
  },
  write_file: {
    description: 'Создать файл или перезаписать его целиком',
    params: { path: 'Путь к файлу от корня проекта', content: 'Полное содержимое файла' },
    run: ({ path, content }) => {
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, content)
      return `Записано: ${path}`
    },
  },
  run_command: {
    description: 'Выполнить команду в терминале и получить её вывод',
    params: { command: 'Команда, например: npm test' },
    run: ({ command }) => {
      try {
        const env = { ...process.env, NO_COLOR: '1', CI: '1' }
        return execSync(command, { encoding: 'utf8', stdio: 'pipe', timeout: 120_000, env })
      } catch (error) {
        const { stdout = '', stderr = '' } = error as { stdout?: string; stderr?: string }
        return `Команда завершилась с ошибкой:\n${stdout}${stderr}`
      }
    },
  },
}

// То же самое в формате, который понимает модель
const toolSpecs = Object.entries(tools).map(([name, tool]) => ({
  type: 'function',
  function: {
    name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(tool.params).map(([key, description]) => [key, { type: 'string', description }]),
      ),
      required: Object.keys(tool.params),
    },
  },
}))

// ───────── 3. Агент: цикл ─────────

const taskArg = process.argv[2]
if (!taskArg) throw new Error('Укажи задачу: npx tsx agent/v0.ts tasks/02-reset-filters.md')
const task = existsSync(taskArg) ? readFileSync(taskArg, 'utf8') : taskArg

const messages: Message[] = [
  {
    role: 'system',
    content:
      'Ты агент-разработчик. Работаешь в папке проекта через инструменты. ' +
      'Сначала изучи нужные файлы, потом вноси изменения. ' +
      'Когда закончишь, коротко напиши, что сделано.\n\n' +
      readFileSync('AGENTS.md', 'utf8'), // контекст проекта: просто текст в первом сообщении
  },
  { role: 'user', content: task },
]

for (let step = 1; step <= 25; step++) {
  const reply = await chat(messages)
  messages.push(reply)

  // Инструменты не нужны: модель считает, что закончила
  if (!reply.tool_calls?.length) {
    console.log(`\n${reply.content}`)
    break
  }

  // Модель только просит. Выполняет наш код.
  for (const call of reply.tool_calls) {
    let result: string
    try {
      const args = JSON.parse(call.function.arguments)
      console.log(`шаг ${step}: ${call.function.name}`, args.path ?? args.command ?? '')
      result = tools[call.function.name].run(args)
    } catch (error) {
      result = `Ошибка: ${error}`
    }
    messages.push({ role: 'tool', tool_call_id: call.id, content: result.slice(0, 6000) })
  }
}
