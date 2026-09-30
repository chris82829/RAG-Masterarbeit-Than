import type { ChatConfig } from '#shared/types'
import type { H3Event } from 'h3'
import { CHAT_CONFIG_COOKIE, MODELS } from '#shared/constants'
import { destr } from 'destr'

export function getChatConfig(event: H3Event) {
  const config = destr<ChatConfig | undefined>(getCookie(event, CHAT_CONFIG_COOKIE))

  const model = config?.model && MODELS.find(m => m.key === config.model)
    ? config.model
    : MODELS[0]!.key

  const filters = config?.filters ?? {}

  return { model, filters }
}

export function stringifyMemories(memories: { type: string, content: string }[]) {
  if (memories.length === 0)
    return ''
  const lines = memories.map(m => `  - [${m.type}] ${m.content}`)
  return `- User Memories:\n${lines.join('\n')}`
}
