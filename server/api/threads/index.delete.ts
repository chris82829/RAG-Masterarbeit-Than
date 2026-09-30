import { deleteThread } from '#server/lib/db/query'
import { requireUserSession } from '#server/lib/effect/session'
import { readEffectBody, runEffect } from '#server/lib/effect/utils'
import { Effect, Schema as S } from 'effect'

export default defineLazyEventHandler(() => {
  const BodySchema = S.Struct({
    id: S.Trim.pipe(S.minLength(1)),
  })

  return defineEventHandler(async (event) => {
    const program = requireUserSession(event).pipe(
      Effect.flatMap(session => readEffectBody(event, BodySchema).pipe(
        Effect.flatMap(body => deleteThread(session.user.id, body.id)),
      )),
    )

    return await runEffect(program, event)
  })
})
