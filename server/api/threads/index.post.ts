import { saveThread } from '#server/lib/db/query'
import { requireUserSession } from '#server/lib/effect/session'
import { runEffect } from '#server/lib/effect/utils'
import { Effect } from 'effect'

export default defineEventHandler(async (event) => {
  const program = requireUserSession(event).pipe(
    Effect.flatMap(session => saveThread(session.user.id)),
  )

  return await runEffect(program, event)
})
