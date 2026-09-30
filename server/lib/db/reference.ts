import type { GetReferencesPayloadSchema } from '#shared/schema'
import type { Chunk } from '#shared/types'
import { getChunksWithRRF, getJobIdsByFilter, getSimilarFavoritedJobIds } from '#server/lib/db/query'
import { rerank as _rerank } from '#server/lib/effect/rerank'
import { Effect } from 'effect'

type ChunkWithScore = Omit<Chunk, 'embedding'> & { score: number }

interface JobEntry {
  job_id: string
  score: number
  chunks: ChunkWithScore[]
}

const rerank = Effect.fn('Reference.rerank')(function* (
  payload: typeof GetReferencesPayloadSchema.Type,
  chunks: ChunkWithScore[],
) {
  if (chunks.length === 0)
    return []

  yield* Effect.annotateCurrentSpan({ count: chunks.length })

  const contents = chunks.map(c => c.content)
  const scores = yield* _rerank(payload.input, contents)

  for (let i = 0; i < chunks.length; i++) {
    chunks[i]!.score = scores[i]!
  }

  return chunks
})

function group(chunks: ChunkWithScore[]) {
  const entries = new Map<string, JobEntry>()

  for (const chunk of chunks) {
    let entry = entries.get(chunk.job_id)
    if (!entry) {
      entry = { job_id: chunk.job_id, score: 0, chunks: [] }
      entries.set(chunk.job_id, entry)
    }
    entry.chunks.push(chunk)
  }

  return entries
}

export const getReferences = Effect.fn('Reference.getReferences')(function* (
  payload: typeof GetReferencesPayloadSchema.Type,
) {
  yield* Effect.annotateCurrentSpan({ payload })

  const topChunksPerQuery = payload.limit * 10

  // Step 1: Get filter job ids and similar favorited job ids in parallel
  const [jobIdsByFilter, similarFavoritedJobIds] = yield* Effect.all(
    [
      getJobIdsByFilter(payload),
      getSimilarFavoritedJobIds(payload.userId, payload.excludes),
    ],
    { concurrency: 'unbounded' },
  )

  // Step 2: Combine unique job ids
  const combinedJobIds = [...new Set([...jobIdsByFilter, ...similarFavoritedJobIds])]
  const filterJobIds = combinedJobIds.length > 0 ? combinedJobIds : undefined

  yield* Effect.annotateCurrentSpan({
    filterJobIdsCount: jobIdsByFilter.length,
    similarFavoritedJobIdsCount: similarFavoritedJobIds.length,
    combinedJobIdsCount: combinedJobIds.length,
    hasFilter: !!filterJobIds,
  })

  // Step 3: Get chunks with RRF
  const chunks = (yield* getChunksWithRRF(
    payload.input,
    payload.excludes,
    topChunksPerQuery,
    1 - payload.w_lexical, // w_semantic
    payload.w_lexical, // w_lexical
    filterJobIds,
  )) as ChunkWithScore[]

  if (chunks.length === 0) {
    yield* Effect.logWarning('getReferences: no chunks found')
    yield* Effect.annotateCurrentSpan({ count: 0 })
    return { references: [] }
  }

  // Step 4: Rerank chunks
  const reranked = yield* rerank(payload, chunks)

  // Step 6: Group by job and assign scores (top chunk score)
  const entries = group(reranked)
  const jobs = Array.from(entries.values())
  for (const j of jobs) {
    j.chunks.sort((a, b) => b.score - a.score)
    j.score = j.chunks[0]?.score ?? 0
  }

  // Step 6: Sort by score, limit, and build response
  const references = jobs
    .sort((a, b) => b.score - a.score)
    .slice(0, payload.limit)
    .map(j => ({
      job_id: j.job_id,
      score: j.score,
      chunks: j.chunks,
    }))

  yield* Effect.annotateCurrentSpan({ count: references.length })

  return { references }
})
