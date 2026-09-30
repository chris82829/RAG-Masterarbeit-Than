import { getUserById } from '#server/lib/db/query'
import { clearUserSession, setUserSession } from '#server/lib/effect/session'
import { readEffectBody, runEffect } from '#server/lib/effect/utils'
import { Effect, Schema as S } from 'effect'

export default defineLazyEventHandler(() => {
  const BodySchema = S.Struct({
    id: S.Trim.pipe(S.minLength(1)),
  })

  return defineEventHandler(async (event) => {
    const program = Effect.gen(function* () {
      const body = yield* readEffectBody(event, BodySchema)
      const user = yield* getUserById(body.id)
      if (!user) {
        yield* clearUserSession(event)
        return
      }

      yield* setUserSession(event, user)
      return user
    })

    return await runEffect(program, event)
  })
})
