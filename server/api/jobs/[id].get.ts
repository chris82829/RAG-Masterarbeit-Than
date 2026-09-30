import { getJobById } from '#server/lib/db/query'
import { readEffectParams, runEffect } from '#server/lib/effect/utils'
import { Effect, Schema as S } from 'effect'

export default defineLazyEventHandler(() => {
  const ParamsSchema = S.Struct({
    id: S.Trim.pipe(S.minLength(1)),
  })

  return defineEventHandler(async (event) => {
    const program = readEffectParams(event, ParamsSchema).pipe(
      Effect.flatMap(params => getJobById(params.id)),
    )

    return await runEffect(program, event)
  })
})
