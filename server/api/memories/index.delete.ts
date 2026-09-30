import { deleteMemoriesByIds } from '#server/lib/db/query'
import { requireUserSession } from '#server/lib/effect/session'
import { readEffectBody, runEffect } from '#server/lib/effect/utils'
import { Effect, Schema as S } from 'effect'

export default defineLazyEventHandler(() => {
  const BodySchema = S.Struct({
    ids: S.Array(S.Number),
  })

  return defineEventHandler(async (event) => {
    const program = requireUserSession(event).pipe(
      Effect.flatMap(session => readEffectBody(event, BodySchema).pipe(
        Effect.flatMap(body => deleteMemoriesByIds(session.user.id, body.ids)),
      )),
    )

    return await runEffect(program, event)
  })
})
