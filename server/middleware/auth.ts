import { getUserById } from '#server/lib/db/query'
import { clearUserSession, getUserSession } from '#server/lib/effect/session'
import { runEffect } from '#server/lib/effect/utils'
import { Effect } from 'effect'

export default defineEventHandler(async (event) => {
  const program = Effect.gen(function* () {
    const session = yield* getUserSession(event)
    const user = yield* getUserById(session.id)
    if (!user)
      yield* clearUserSession(event)
  })

  return await runEffect(program, event)
})
