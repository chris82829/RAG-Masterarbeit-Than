import { saveUser } from '#server/lib/db/query'
import { getUserSession, setUserSession } from '#server/lib/effect/session'
import { readEffectBody, runEffect } from '#server/lib/effect/utils'
import { UsernameSchema } from '#shared/schema'
import { Effect, Schema as S } from 'effect'

export default defineLazyEventHandler(() => {
  const BodySchema = S.Struct({
    username: UsernameSchema,
  })

  return defineEventHandler(async (event) => {
    const program = getUserSession(event).pipe(
      Effect.flatMap(session => readEffectBody(event, BodySchema).pipe(
        Effect.flatMap(body => saveUser({ id: session.id, username: body.username })),
        Effect.tap(user => setUserSession(event, user)),
        Effect.map(user => ({ user })),
      )),
    )

    return await runEffect(program, event)
  })
})
