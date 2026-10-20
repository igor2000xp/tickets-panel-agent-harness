// Ядро. Тот же цикл, что в v0, плюс три вещи вокруг него:
// gate (кто решает, что задача выполнена), trace (что происходило) и лимит шагов.
// О файлах, тестах и обращениях ядро ничего не знает: инструменты приходят снаружи.

import { chat, type Message } from './llm'

export type Tool = {
  description: string
  params: Record<string, string>
  run: (args: Record<string, string>) => string | Promise<string>
}

/** Проверка, которую запускает обвязка, а не модель */
export type Gate = () => { ok: boolean; report: string }

export interface AgentOptions {
  system: string
  task: string
  tools: Record<string, Tool>
  gate?: Gate
  maxSteps?: number
}

export async function runAgent({ system, task, tools, gate, maxSteps = 30 }: AgentOptions) {
  const startedAt = Date.now()
  let tokens = 0

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

  const messages: Message[] = [
    { role: 'system', content: system },
    { role: 'user', content: task },
  ]

  const finish = (accepted: boolean, answer: string | null) => {
    const seconds = Math.round((Date.now() - startedAt) / 1000)
    if (answer) console.log(`\n${answer}`)
    console.log(`\nИтог: ${accepted ? 'принято' : 'НЕ принято'} · токенов: ${tokens} · секунд: ${seconds}`)
    return accepted
  }

  for (let step = 1; step <= maxSteps; step++) {
    const callStartedAt = Date.now()
    const reply = await chat(messages, toolSpecs)
    tokens += reply.tokens
    messages.push(reply.message)
    console.log(`шаг ${step} · модель · ${Date.now() - callStartedAt} мс · ${reply.tokens} токенов`)

    // Модель говорит «готово». Решение принимает не она, а gate.
    if (!reply.message.tool_calls?.length) {
      if (!gate) return finish(true, reply.message.content)

      const check = gate()
      console.log(`       gate · ${check.ok ? 'пройден' : 'НЕ пройден, возвращаю модели'}`)
      if (check.ok) return finish(true, reply.message.content)

      messages.push({
        role: 'user',
        content: `Задача не принята: проверки не прошли.\n\n${check.report}\n\nИсправь причину и сообщи, когда закончишь.`,
      })
      continue
    }

    for (const call of reply.message.tool_calls) {
      let result: string
      let label = ''
      try {
        const args = JSON.parse(call.function.arguments)
        label = Object.values<string>(args)[0]?.slice(0, 60) ?? ''
        const tool = tools[call.function.name]
        if (!tool) throw new Error(`нет инструмента ${call.function.name}`)
        result = await tool.run(args)
      } catch (error) {
        result = `Отказ: ${error instanceof Error ? error.message : error}`
      }
      console.log(`       tool · ${call.function.name} ${label}${result.startsWith('Отказ') ? ' · ОТКАЗ' : ''}`)
      messages.push({ role: 'tool', tool_call_id: call.id, content: result.slice(0, 6000) })
    }
  }

  return finish(false, 'Лимит шагов исчерпан.')
}
