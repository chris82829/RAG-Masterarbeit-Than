import { getFavoritesByUserId } from '#server/lib/db/query'
import { getUserSession } from '#server/lib/effect/session'
import { runEffect } from '#server/lib/effect/utils'
import { Effect } from 'effect'

export default defineEventHandler(async (event) => {
  const program = getUserSession(event).pipe(
    Effect.flatMap(session =>
      session.user
        ? getFavoritesByUserId(session.user.id).pipe(
            Effect.map(favorites => favorites.map(f => f.job_id)),
          )
        : Effect.succeed([]),
    ),
  )

  return await runEffect(program, event)
})
