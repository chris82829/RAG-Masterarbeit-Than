import { clearUserSession } from '#server/lib/effect/session'
import { runEffect } from '#server/lib/effect/utils'
import { Effect } from 'effect'

export default defineEventHandler(async (event) => {
  const program = clearUserSession(event).pipe(
    Effect.map(() => ({ loggedOut: true })),
  )
  return await runEffect(program, event)
})
