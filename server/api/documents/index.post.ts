import { Buffer } from 'node:buffer'
import { requireUserSession } from '#server/lib/effect/session'
import { readEffectFiles, runEffect } from '#server/lib/effect/utils'
import { Effect } from 'effect'

export default defineLazyEventHandler(() => {
  return defineEventHandler(async (event) => {
    const program = requireUserSession(event).pipe(
      Effect.flatMap(() => readEffectFiles(event)),
      Effect.map(files => files.map((f) => {
        const id = crypto.randomUUID()
        const filename = f.filename
        const mediaType = f.type
        const data = Buffer.from(f.data).toString('base64')
        const url = `data:${mediaType};base64,${data}`

        return { id, filename, mediaType, url }
      })),
    )

    return await runEffect(program, event)
  })
})
