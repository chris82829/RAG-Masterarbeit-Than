import { getJobsByPayload } from '#server/lib/db/query'
import { readEffectBody, runEffect } from '#server/lib/effect/utils'
import { GetJobsByPayloadSchema } from '#shared/schema'
import { Effect } from 'effect'

export default defineLazyEventHandler(() => {
  return defineEventHandler(async (event) => {
    const program = readEffectBody(event, GetJobsByPayloadSchema).pipe(
      Effect.flatMap(body => getJobsByPayload(body)),
      Effect.map(jobs => ({ jobs })),
    )

    return await runEffect(program, event)
  })
})
