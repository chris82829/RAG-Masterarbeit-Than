import { getJobs } from '#server/lib/db/query'
import { runEffect } from '#server/lib/effect/utils'
import { Effect } from 'effect'

export default defineLazyEventHandler(() => {
  return defineCachedEventHandler(async (event) => {
    const program = getJobs().pipe(
      Effect.map(jobs => ({ jobs })),
    )

    return await runEffect(program, event)
  }, {
    getKey: () => 'get-jobs',
    swr: true,
    maxAge: 86400,
  })
})
