// Агент для оператора поддержки. Ядро то же, что у агента-разработчика.
// Другой домен: вместо файлов проекта обращения клиентов.
// Запуск: npx tsx agent/tickets-agent.ts "Закрой обращения про оплату, которые сейчас в работе"

import { readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { runAgent, type Tool } from './core'

const DATA = 'src/data/tickets.json'
const LABELS: Record<string, string> = { new: 'Новое', in_progress: 'В работе', closed: 'Закрыто' }

type Ticket = { id: number; title: string; customer: string; status: string; createdAt: string }
const load = (): Ticket[] => JSON.parse(readFileSync(DATA, 'utf8'))

/** Действие с последствиями подтверждает человек */
async function confirm(question: string) {
  const terminal = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await terminal.question(`\n  ${question} (y/n) `)
  terminal.close()
  return answer.trim().toLowerCase() === 'y'
}

const tools: Record<string, Tool> = {
  search_tickets: {
    description: 'Найти обращения по тексту заголовка и статусу',
    params: {
      query: 'Часть заголовка. Пустая строка: без поиска по тексту',
      status: 'new, in_progress, closed или all',
    },
    run: ({ query, status }) => {
      const text = query.trim().toLowerCase()
      const found = load().filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(text) && (status === 'all' || ticket.status === status),
      )
      return JSON.stringify(found, null, 2)
    },
  },
  set_status: {
    description: 'Изменить статус обращения. Перед изменением система спросит оператора',
    params: { id: 'Номер обращения', status: 'new, in_progress или closed' },
    run: async ({ id, status }) => {
      if (!(status in LABELS)) throw new Error(`неизвестный статус ${status}`)
      const all = load()
      const ticket = all.find((item) => item.id === Number(id))
      if (!ticket) throw new Error(`обращение ${id} не найдено`)

      const question = `#${ticket.id} «${ticket.title}»: ${LABELS[ticket.status]} → ${LABELS[status]}. Разрешить?`
      if (!(await confirm(question))) return 'Оператор отклонил изменение'

      ticket.status = status
      writeFileSync(DATA, JSON.stringify(all, null, 2) + '\n')
      return `Статус обращения ${id} изменён`
    },
  },
}

const request = process.argv.slice(2).join(' ')
if (!request) throw new Error('Напиши запрос в кавычках после имени файла')

await runAgent({
  system:
    'Ты помощник оператора поддержки. Работаешь с обращениями только через инструменты. ' +
    'Перед изменением статуса найди обращение поиском. ' +
    'В конце дай короткую сводку: что изменил и что оставил как есть.',
  task: request,
  tools,
})
