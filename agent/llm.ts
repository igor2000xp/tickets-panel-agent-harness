// Клиент модели. Тот же HTTP-запрос, что в v0, вынесен в отдельный файл.
// Подходит любой OpenAI-совместимый API: адрес, ключ и модель задаются в .env.

export type ToolCall = { id: string; function: { name: string; arguments: string } }

export type Message =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export type AssistantMessage = Extract<Message, { role: 'assistant' }>

export async function chat(messages: Message[], toolSpecs: unknown[]) {
  try {
    process.loadEnvFile()
  } catch {
    // файла .env может не быть, если переменные уже заданы в окружении
  }
  const baseUrl = process.env.LLM_BASE_URL ?? 'https://openrouter.ai/api/v1'
  const apiKey = process.env.LLM_API_KEY
  const model = process.env.LLM_MODEL
  if (!apiKey || !model) throw new Error('Заполни LLM_API_KEY и LLM_MODEL в файле .env')

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, tools: toolSpecs }),
  })
  if (!response.ok) throw new Error(`Модель ответила ${response.status}: ${await response.text()}`)

  const data = (await response.json()) as {
    choices: { message: AssistantMessage }[]
    usage?: { total_tokens?: number }
  }
  return { message: data.choices[0].message, tokens: data.usage?.total_tokens ?? 0 }
}
