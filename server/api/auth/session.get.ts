import { getUserSession } from '#server/lib/effect/session'
import { runEffect } from '#server/lib/effect/utils'

export default defineEventHandler(async (event) => {
  const program = getUserSession(event)
  return await runEffect(program, event)
})
