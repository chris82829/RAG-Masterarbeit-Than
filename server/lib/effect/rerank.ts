import { Effect, Schedule } from 'effect'
import { LlamaCppError } from './error'

interface RerankResponse {
  results: {
    index: number
    relevance_score: number
  }[]
}

export const rerank = Effect.fn('Rerank.rerank')(function* (
  query: string,
  documents: string[],
) {
  yield* Effect.annotateCurrentSpan({ count: documents.length })

  return yield* Effect.tryPromise({
    try: () =>
      $fetch<RerankResponse>('http://localhost:8001/v1/reranking', {
        method: 'POST',
        body: { query, documents },
      }),
    catch: e =>
      new LlamaCppError({
        action: 'rerank',
        message: 'Network error',
        statusCode: 502,
        cause: e,
      }),
  }).pipe(
    Effect.flatMap((res) => {
      const scores = res.results.map(x => x.relevance_score)

      if (scores.length === 0) {
        return Effect.succeed(scores)
      }

      if (scores.length !== documents.length) {
        return Effect.fail(new LlamaCppError({
          action: 'rerank',
          message: `Mismatch: expected ${documents.length} scores but got ${scores.length}`,
          statusCode: 500,
        }))
      }

      const min = Math.min(...scores)
      const max = Math.max(...scores)
      const denom = max - min || 1
      const normalizedScores = scores.map(s => (s - min) / denom)

      return Effect.succeed(normalizedScores)
    }),
    Effect.timeout('10 seconds'),
    Effect.retry(Schedule.exponential('100 millis').pipe(Schedule.compose(Schedule.recurs(3)))),
  )
})
