import { getMemoriesByUserInput } from '#server/lib/db/query'
import { requireUserSession } from '#server/lib/effect/session'
import { readEffectBody, runEffect } from '#server/lib/effect/utils'
import { Effect, Schema as S } from 'effect'

export default defineLazyEventHandler(() => {
  const BodySchema = S.Struct({
    input: S.Trim,
    importance: S.optionalWith(S.Number.pipe(S.int(), S.between(1, 10)), { default: () => 1 }),
  })

  return defineEventHandler(async (event) => {
    const program = requireUserSession(event).pipe(
      Effect.flatMap(session => readEffectBody(event, BodySchema).pipe(
        Effect.flatMap(body => getMemoriesByUserInput(session.user.id, body.input, body.importance)),
      )),
    )

    return await runEffect(program, event)
  })
})
