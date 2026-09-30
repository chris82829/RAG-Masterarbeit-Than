import { generateFilters } from '#server/lib/effect/generation'
import { requireUserSession } from '#server/lib/effect/session'
import { readEffectBody, runEffect } from '#server/lib/effect/utils'
import { Effect, Schema as S } from 'effect'

export default defineLazyEventHandler(() => {
  const BodySchema = S.Struct({
    input: S.Trim,
  })

  return defineEventHandler(async (event) => {
    const program = requireUserSession(event).pipe(
      Effect.flatMap(() => readEffectBody(event, BodySchema)),
      Effect.flatMap(body => generateFilters(body.input)),
    )

    return await runEffect(program, event)
  })
})
