import type { ModelMessage } from 'ai'
import { getModel } from '#server/lib/effect/utils'
import { GENERATE_EXCLUDES_SYSTEM_PROMPT, GENERATE_FILTERS_SYSTEM_PROMPT, GENERATE_MEMORIES_SYSTEM_PROMPT, GENERATE_SUGGESTIONS_SYSTEM_PROMPT, GENERATE_TITLE_SYSTEM_PROMPT } from '#server/utils/prompt'
import { BASE_MODEL, DEFAULT_SUGGESTIONS } from '#shared/constants'
import { ExcludesSchema, FiltersSchema, GenerateMemoriesSchema, SuggestionsSchema } from '#shared/schema'
import { effectSchema } from '#shared/utils'
import { generateText, Output } from 'ai'
import { Effect } from 'effect'
import { GenerateError } from './error'

export const generateFilters = Effect.fn('Generate.filters')(function* (
  prompt: string,
) {
  yield* Effect.annotateCurrentSpan({ prompt })

  const { output } = yield* Effect.tryPromise({
    try: () =>
      generateText({
        model: getModel(BASE_MODEL),
        output: Output.object({ schema: effectSchema(FiltersSchema) }),
        system: GENERATE_FILTERS_SYSTEM_PROMPT,
        prompt,
      }),
    catch: cause =>
      new GenerateError({
        action: 'generateFilters',
        message: 'Failed to generate filters',
        cause,
      }),
  })

  return output
})

export const generateMemories = Effect.fn('Generate.memories')(function* (
  messages: ModelMessage[],
) {
  yield* Effect.annotateCurrentSpan({ messageCount: messages.length })

  const { output } = yield* Effect.tryPromise({
    try: () =>
      generateText({
        model: getModel(BASE_MODEL),
        output: Output.object({ schema: effectSchema(GenerateMemoriesSchema) }),
        system: GENERATE_MEMORIES_SYSTEM_PROMPT,
        messages,
      }),
    catch: cause =>
      new GenerateError({
        action: 'generateMemories',
        message: 'Failed to generate memories',
        cause,
      }),
  })

  yield* Effect.annotateCurrentSpan({ count: output.memories.length })

  return output.memories
})

export const generateTitle = Effect.fn('Generate.title')(function* (
  prompt: string,
) {
  yield* Effect.annotateCurrentSpan({ prompt })

  const { text } = yield* Effect.tryPromise({
    try: () =>
      generateText({
        model: getModel(BASE_MODEL),
        system: GENERATE_TITLE_SYSTEM_PROMPT,
        prompt,
      }),
    catch: cause =>
      new GenerateError({
        action: 'generateTitle',
        message: 'Failed to generate title',
        cause,
      }),
  })

  yield* Effect.annotateCurrentSpan({ titleLength: text.length })

  return text
})

export const generateSuggestions = Effect.fn('Generate.suggestions')(function* (
  assistantText: string,
  userText: string,
) {
  if (!assistantText) {
    return []
  }

  const result = yield* Effect.tryPromise({
    try: () =>
      generateText({
        model: getModel(BASE_MODEL),
        output: Output.object({ schema: effectSchema(SuggestionsSchema) }),
        prompt: `User: ${userText}

Assistant: ${assistantText}

What would be 3 natural follow-up questions or actions based on the assistant's response?`,
        system: GENERATE_SUGGESTIONS_SYSTEM_PROMPT,
      }),
    catch: cause =>
      new GenerateError({
        action: 'generateSuggestions',
        message: 'Failed to generate suggestions',
        cause,
      }),
  }).pipe(
    Effect.timeout('3 seconds'),
    Effect.map(r => r.output),
    Effect.orElse(() => Effect.succeed(DEFAULT_SUGGESTIONS)),
  )

  return result
})

export const generateExcludes = Effect.fn('Generate.excludes')(function* (
  prompt: string,
) {
  const { output } = yield* Effect.tryPromise({
    try: () =>
      generateText({
        model: getModel(BASE_MODEL),
        output: Output.object({ schema: effectSchema(ExcludesSchema) }),
        system: GENERATE_EXCLUDES_SYSTEM_PROMPT,
        prompt,
      }),
    catch: cause =>
      new GenerateError({
        action: 'generateExcludes',
        message: 'Failed to generate excludes',
        cause,
      }),
  })

  return output.excludes
})
