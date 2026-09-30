import { getUsers } from '#server/lib/db/query'
import { requireUserSession } from '#server/lib/effect/session'
import { runEffect } from '#server/lib/effect/utils'
import { Effect } from 'effect'

export default defineEventHandler(async (event) => {
  const program = requireUserSession(event).pipe(
    Effect.flatMap(() => getUsers()),
  )

  return await runEffect(program, event)
})
