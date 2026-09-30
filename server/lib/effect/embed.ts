import { Effect, Schedule } from 'effect'
import { LlamaCppError } from './error'

interface EmbeddingsResponse {
  data: { embedding: number[] }[]
}

function fetch(values: readonly string[]) {
  return Effect.tryPromise({
    try: () =>
      $fetch<EmbeddingsResponse>('http://localhost:8000/v1/embeddings', {
        method: 'POST',
        body: { input: values, encoding_format: 'float' },
      }),
    catch: e =>
      new LlamaCppError({
        action: 'embed',
        message: 'Network error',
        statusCode: 502,
        cause: e,
      }),
  }).pipe(
    Effect.map(res => res.data.map(x => x.embedding)),
    Effect.flatMap((embeddings) => {
      if (embeddings.length !== values.length) {
        return Effect.fail(new LlamaCppError({
          action: 'embed',
          message: `Mismatch: expected ${values.length} embeddings but got ${embeddings.length}`,
          statusCode: 500,
        }))
      }
      return Effect.succeed(embeddings as readonly (readonly number[])[])
    }),
    Effect.timeout('10 seconds'),
    Effect.retry(Schedule.exponential('100 millis').pipe(Schedule.compose(Schedule.recurs(3)))),
  )
}

export const embedMany = Effect.fn('Embed.embedMany')(function* (
  values: string[],
) {
  if (values.length === 0)
    return []

  yield* Effect.annotateCurrentSpan({ count: values.length })

  return yield* fetch(values)
})

export const embed = Effect.fn('Embed.embed')(function* (value: string) {
  if (!value)
    return []

  const result = yield* fetch([value])
  return result[0]
})
