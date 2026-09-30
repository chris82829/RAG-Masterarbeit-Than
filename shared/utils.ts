import type { ChatUIMessage, GetJobsToolOutputJobLabel, SimplifiedMemory } from '#shared/types'
import type { Schema } from '@ai-sdk/provider-utils'
import type { ModelMessage } from 'ai'
import { jsonSchema } from '@ai-sdk/provider-utils'
import { decode, encode } from '@toon-format/toon'
import { Schema as EffectSchema, JSONSchema } from 'effect'
import striptags from 'striptags'

export function effectSchema<A, I>(s: EffectSchema.Schema<A, I>): Schema<A> {
  const schema = JSONSchema.make(s)

  return jsonSchema(schema, {
    validate: (value) => {
      const result = EffectSchema.decodeUnknownEither(s)(value)

      if (result._tag === 'Right') {
        return { success: true, value: result.right }
      }
      else {
        return { success: false, error: result.left }
      }
    },
  })
}

export function stringify(value: unknown) {
  return encode(value)
}

export function unstringify(value: string) {
  return decode(value)
}

export function strip(value: string | undefined | null) {
  return value ? striptags(value).replace(/[\r\n]+/g, '') : ''
}

export function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function toLocalDate(date: string | Date) {
  return new Date(date).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function toLocalDateTime(date: string | Date) {
  return new Date(date).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// TODO: Also include tool result
export function getTextFromUIMessage(message: ChatUIMessage | undefined) {
  if (!message)
    return ''
  return message.parts.flatMap(p => p.type === 'text' ? [p.text.trim()] : []).join('')
}

export function getTextFromModelMessage(message: ModelMessage) {
  const content = message.content

  if (typeof content === 'string')
    return content

  if (!Array.isArray(content))
    return ''

  return content.flatMap((x) => {
    if (x.type === 'text')
      return [x.text]

    if (x.type === 'tool-call' && x.toolName === 'get_jobs') {
      const input = x.input as { input: string }
      return [`Searching for jobs: ${input.input}`]
    }

    if (x.type === 'tool-result' && x.toolName === 'save_memories') {
      const output = x.output as { type: 'json', value: { memories: SimplifiedMemory[] } }
      if (output.type === 'json' && output.value.memories) {
        const memories = output.value.memories.map(m => m.content).join(', ')
        return [`Saved ${output.value.memories.length} memories (${memories})`]
      }
    }

    return []
  }).join('')
}

export function getJobLabel(score: number): GetJobsToolOutputJobLabel {
  const normalized = Math.max(0, Math.min(1, score))

  if (normalized <= 0.25)
    return 'Explore This Option'
  if (normalized <= 0.55)
    return 'Good Possibility'
  if (normalized <= 0.8)
    return 'Strong Potential'
  return 'Top Choice'
}
