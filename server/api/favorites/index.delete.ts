import { deleteFavorites } from '#server/lib/db/query'
import { requireUserSession } from '#server/lib/effect/session'
import { readEffectBody, runEffect } from '#server/lib/effect/utils'
import { Effect, Schema as S } from 'effect'

export default defineLazyEventHandler(() => {
  const BodySchema = S.Struct({
    jobIds: S.Array(S.Trim),
  })

  return defineEventHandler(async (event) => {
    const program = requireUserSession(event).pipe(
      Effect.flatMap(session => readEffectBody(event, BodySchema).pipe(
        Effect.flatMap(body => deleteFavorites(session.user.id, body.jobIds)),
      )),
    )

    return await runEffect(program, event)
  })
})
