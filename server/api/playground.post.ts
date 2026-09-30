import { program as hybridSearchProgram } from '#server/eval/validate_hybrid_search'
import { Effect } from 'effect'
import { DbLive } from '../lib/db/client'

export default defineLazyEventHandler(() => {
  return defineEventHandler(async () => {
    await Effect.runPromise(
      hybridSearchProgram.pipe(Effect.provide(DbLive)),
    )
    return { status: 'completed' }
  })
})
