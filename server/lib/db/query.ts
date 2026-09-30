import type { GetJobsByPayloadSchema, GetReferencesPayloadSchema } from '#shared/schema'
import type { ChatUIMessage, SimplifiedMemory, User } from '#shared/types'
import type { ModelMessage } from 'ai'
import type { SQL } from 'drizzle-orm'
import { embed, embedMany } from '#server/lib/effect/embed'
import { DbError, NotFoundError } from '#server/lib/effect/error'
import { cosineSimilarity } from '#shared/math'
import { generateId } from 'ai'
import { and, cosineDistance, desc, eq, getColumns, gt, gte, inArray, isNull, notInArray, or, sql } from 'drizzle-orm'
import { Effect } from 'effect'
import { generateFilters, generateMemories } from '../effect/generation'
import { Database } from './client'
import * as schema from './schema'
import { buildFiltersSQL } from './utils'

export const tables = schema

// Users

export const getUserById = Effect.fn('Query.getUserById')(function* (id: string) {
  yield* Effect.annotateCurrentSpan({ userId: id })
  const db = yield* Database

  return yield* db.query.users.findFirst({
    where: { id: { eq: id } },
  }).pipe(
    Effect.mapError(cause =>
      new DbError({
        action: 'getUserById',
        message: 'Failed to fetch user',
        statusCode: 500,
        cause,
      })),
  )
})

export const getUsers = Effect.fn('Query.getUsers')(function* () {
  const db = yield* Database

  const result = yield* db.select().from(tables.users).pipe(
    Effect.mapError(cause =>
      new DbError({
        action: 'getUsers',
        message: 'Failed to fetch users',
        statusCode: 500,
        cause,
      })),
  )
  yield* Effect.annotateCurrentSpan({ count: result.length })
  return result
})

export const saveUser = Effect.fn('Query.saveUser')(function* (
  user: Omit<User, 'created_at'>,
) {
  yield* Effect.annotateCurrentSpan({ userId: user.id })
  const db = yield* Database

  const result = yield* db
    .insert(tables.users)
    .values(user)
    .onConflictDoNothing({ target: tables.users.id })
    .returning()
    .pipe(
      Effect.mapError(cause =>
        new DbError({
          action: 'saveUser',
          message: 'Failed to save user',
          statusCode: 500,
          cause,
        })),
    )

  return result[0]!
})

// Jobs

export const getJobById = Effect.fn('Query.getJobById')(function* (id: string) {
  yield* Effect.annotateCurrentSpan({ jobId: id })
  const db = yield* Database

  return yield* db.query.jobs.findFirst({
    where: { id: { eq: id } },
  }).pipe(
    Effect.mapError(cause =>
      new DbError({
        action: 'getJobById',
        message: 'Failed to fetch job',
        statusCode: 500,
        cause,
      })),
  )
})

export const getJobs = Effect.fn('Query.getJobs')(function* () {
  const db = yield* Database

  const result = yield* db
    .select()
    .from(tables.jobs)
    .orderBy(desc(tables.jobs.updated_at))
    .pipe(
      Effect.mapError(cause =>
        new DbError({
          action: 'getJobs',
          message: 'Failed to fetch jobs',
          statusCode: 500,
          cause,
        })),
    )

  yield* Effect.annotateCurrentSpan({ count: result.length })
  return result
})

export const getJobsByPayload = Effect.fn('Query.getJobsByPayload')(function* (
  payload: typeof GetJobsByPayloadSchema.Type,
) {
  yield* Effect.annotateCurrentSpan({
    filters: payload.filters,
    limit: payload.limit ?? 0,
    excludeCount: payload.excludes?.length ?? 0,
    jobIdCount: payload.job_ids?.length ?? 0,
  })

  const db = yield* Database
  const conditions: (SQL | undefined)[] = []
  let score: SQL.Aliased<number> | undefined

  if (payload.filters) {
    const { conditions: _conditions, score: _score } = buildFiltersSQL(payload.filters)
    conditions.push(..._conditions)
    score = _score
  }

  if (payload.job_ids) {
    conditions.push(inArray(tables.jobs.id, payload.job_ids))
  }

  if (payload.excludes?.length) {
    conditions.push(
      ...payload.excludes.map(term =>
        sql`NOT (${tables.jobs.title} ||| ${term})`,
      ),
    )
  }

  const columns = getColumns(tables.jobs)
  const query = db
    .select(score ? { score, ...columns } : columns)
    .from(tables.jobs)
    .where(conditions.length > 0 ? and(...conditions) : sql`TRUE`)
    .orderBy(score ? desc(score) : desc(tables.jobs.updated_at))
    .$dynamic()

  if (payload.limit) {
    query.limit(payload.limit)
  }

  const jobs = yield* query.pipe(
    Effect.mapError(cause =>
      new DbError({
        action: 'getJobsByPayload',
        message: 'Failed to fetch jobs',
        statusCode: 500,
        cause,
      })),
  )

  yield* Effect.annotateCurrentSpan({ count: jobs.length })

  return jobs
})

// Memories

export const getMemoriesByUserId = Effect.fn('Query.getMemoriesByUserId')(function* (
  userId: string,
) {
  yield* Effect.annotateCurrentSpan({ userId })
  const db = yield* Database

  const { embedding, user_id, ...rest } = getColumns(tables.memories)

  const result = yield* db
    .select({ ...rest })
    .from(tables.memories)
    .where(eq(tables.memories.user_id, userId))
    .pipe(
      Effect.mapError(cause =>
        new DbError({
          action: 'getMemoriesByUserId',
          message: `Failed to fetch memories for user ${userId}`,
          statusCode: 500,
          cause,
        })),
    )

  yield* Effect.annotateCurrentSpan({ count: result.length })
  return result
})

export const getMemoriesByUserInput = Effect.fn('Query.getMemoriesByUserInput')(function* (
  userId: string,
  input: string,
  importance: number = 1,
) {
  yield* Effect.annotateCurrentSpan({
    userId,
    importance,
    inputLength: input?.length ?? 0,
  })

  if (!input?.trim()) {
    return []
  }

  const db = yield* Database
  const { embedding, id, user_id, ...rest } = getColumns(tables.memories)

  const inputEmbedding = yield* embed(input)

  const distance = cosineDistance(
    tables.memories.embedding,
    inputEmbedding as number[],
  )

  const score = sql<number>`(
    (1 - (${distance})) * 0.6 +
    (exp(-0.05 * EXTRACT(EPOCH FROM (now()::timestamp - ${tables.memories.created_at}::timestamp)) / 86400)) * 0.2 +
    (${tables.memories.importance}::float / 10.0) * 0.2
  )`

  const result = yield* db
    .select({ ...rest, score })
    .from(tables.memories)
    .where(
      and(
        eq(tables.memories.user_id, userId),
        gte(tables.memories.importance, importance),
        or(
          isNull(tables.memories.valid_until),
          gt(tables.memories.valid_until, sql`CURRENT_DATE`),
        ),
      ),
    )
    .orderBy(desc(score))
    .limit(10)
    .pipe(
      Effect.mapError(cause =>
        new DbError({
          action: 'getMemoriesByUserInput',
          message: `Failed to fetch memories for user ${userId}`,
          statusCode: 500,
          cause,
        })),
    )

  yield* Effect.annotateCurrentSpan({ count: result.length })
  return result
})

export const saveMemories = Effect.fn('Query.saveMemories')(function* (
  userId: string,
  memories: readonly Omit<SimplifiedMemory, 'created_at'>[],
  embeddings: readonly (readonly number[])[],
) {
  yield* Effect.annotateCurrentSpan({ userId, requested: memories.length })

  if (memories.length === 0) {
    return []
  }

  const db = yield* Database

  const uniqueMemories: {
    memory: typeof memories[number]
    embedding: readonly number[]
  }[] = []

  for (let i = 0; i < memories.length; i++) {
    const currentMemory = memories[i]!
    const currentEmbedding = embeddings[i]!

    const isDuplicate = uniqueMemories.some((existing) => {
      if (
        existing.memory.type === currentMemory.type
        && existing.memory.content.toLowerCase().trim() === currentMemory.content.toLowerCase().trim()
      ) {
        return true
      }

      const similarity = cosineSimilarity(currentEmbedding, existing.embedding)
      return similarity >= 0.80
    })

    if (!isDuplicate) {
      uniqueMemories.push({ memory: currentMemory, embedding: currentEmbedding })
    }
  }

  if (uniqueMemories.length === 0) {
    yield* Effect.annotateCurrentSpan({ unique: 0, saved: 0 })
    return []
  }

  const rows = uniqueMemories.map(({ memory: m, embedding }) => {
    const embeddingStr = `[${embedding.join(',')}]`
    return sql`(
      ${userId}::uuid,
      ${m.type}::memory_type,
      ${m.content}::text,
      ${m.importance}::int,
      ${m.valid_until ?? null}::date,
      ${embeddingStr}::vector,
      now()
    )`
  })

  const values = sql.join(rows, sql.raw(', '))

  const result = yield* db.execute<SimplifiedMemory>(sql`
    WITH new_data (
      user_id, type, content, importance, valid_until, embedding, created_at
    ) AS (
      VALUES ${values}
    )
    INSERT INTO ${tables.memories} (
      user_id, type, content, importance, valid_until, embedding, created_at
    )
    SELECT n.*
    FROM new_data n
    WHERE NOT EXISTS (
      SELECT 1
      FROM ${tables.memories} m
      WHERE m.user_id = n.user_id
        AND (
          -- Semantic Check: Distance <= 0.20 (implies >= 80% similarity)
          (m.embedding <=> n.embedding) <= 0.20
          OR
          -- Exact/Substring Check
          (
             LOWER(m.content) = LOWER(n.content)
             OR LOWER(m.content) LIKE '%' || LOWER(n.content) || '%'
             OR LOWER(n.content) LIKE '%' || LOWER(m.content) || '%'
          )
        )
    )
    RETURNING id, type, content, importance, valid_until, created_at
  `).pipe(
    Effect.mapError(cause =>
      new DbError({
        action: 'saveMemories',
        message: 'Failed to save memories',
        statusCode: 500,
        cause,
      })),
  )

  yield* Effect.annotateCurrentSpan({ unique: uniqueMemories.length, saved: result.length })
  return result as unknown as SimplifiedMemory[]
})

export const saveMemoriesByModelMessages = Effect.fn('Query.saveMemoriesByMessages')(function* (
  userId: string,
  _messages: ModelMessage[],
) {
  const messages = _messages.filter(m => m.role === 'user')
  yield* Effect.annotateCurrentSpan({ userId, messageCount: messages.length })

  if (!messages.length) {
    return []
  }

  const memories = yield* generateMemories(messages.slice(-5))
  if (!memories.length)
    return []

  const contents = memories.map(m => m.content)
  const embeddings = yield* embedMany(contents)
  const result = yield* saveMemories(userId, memories, embeddings)

  yield* Effect.annotateCurrentSpan({ savedCount: result.length })
  return result
})

export const deleteMemoriesByIds = Effect.fn('Query.deleteMemoriesByIds')(function* (
  userId: string,
  ids: readonly number[],
) {
  yield* Effect.annotateCurrentSpan({
    userId,
    memoryIds: ids.join(','),
    count: ids.length,
  })

  if (ids.length === 0) {
    return []
  }

  const db = yield* Database

  const deleted = yield* db
    .delete(tables.memories)
    .where(
      and(
        inArray(tables.memories.id, ids as number[]),
        eq(tables.memories.user_id, userId),
      ),
    )
    .returning()
    .pipe(
      Effect.mapError(cause =>
        new DbError({
          action: 'deleteMemoriesByIds',
          message: `Failed to delete memories [${ids.join(', ')}] for user ${userId}`,
          statusCode: 500,
          cause,
        })),
    )

  yield* Effect.annotateCurrentSpan({ deleted: deleted.length })

  if (deleted.length === 0) {
    return yield* Effect.fail(new NotFoundError({
      id: ids.join(','),
      message: 'No memories found to delete',
      statusCode: 404,
    }))
  }

  return deleted
})

// Messages

export const saveMessages = Effect.fn('Query.saveMessages')(function* (
  threadId: string,
  messages: readonly ChatUIMessage[],
) {
  yield* Effect.annotateCurrentSpan({ threadId, count: messages.length })

  if (messages.length === 0) {
    return []
  }

  const db = yield* Database

  const _messages = messages.flatMap((m) => {
    const parts = m.parts.filter(p => p.type !== 'step-start')
    if (!parts.length)
      return []

    return [{
      ...m,
      id: m.id || generateId(),
      thread_id: threadId,
      metadata: m.metadata ?? {},
      // @ts-expect-error created_at exists
      created_at: m.created_at ? new Date(m.created_at).toISOString() : new Date().toISOString(),
    }]
  })

  const messageIds = _messages.map(m => m.id)

  if (messageIds.length > 0) {
    yield* db
      .delete(tables.messages)
      .where(and(
        eq(tables.messages.thread_id, threadId),
        notInArray(tables.messages.id, messageIds),
      ))
  }

  yield* db
    .insert(tables.messages)
    .values(_messages as any)
    .onConflictDoUpdate({
      target: tables.messages.id,
      set: {
        parts: sql`excluded.parts`,
        metadata: sql`excluded.metadata`,
      },
    })

  yield* db
    .update(tables.threads)
    .set({ updated_at: new Date().toISOString() })
    .where(eq(tables.threads.id, threadId))

  return _messages
})

// Threads

export const saveThread = Effect.fn('Query.saveThread')(function* (
  userId: string,
) {
  yield* Effect.annotateCurrentSpan({ userId })
  const db = yield* Database

  const result = yield* db
    .insert(tables.threads)
    .values({ user_id: userId })
    .returning()
    .pipe(
      Effect.mapError(cause =>
        new DbError({
          action: 'saveThread',
          message: `Failed to save thread for user ${userId}`,
          statusCode: 500,
          cause,
        })),
    )

  yield* Effect.annotateCurrentSpan({ threadId: result[0]?.id })
  return result[0]!
})

export const deleteThread = Effect.fn('Query.deleteThread')(function* (
  userId: string,
  threadId: string,
) {
  yield* Effect.annotateCurrentSpan({ userId, threadId })
  const db = yield* Database

  const result = yield* db
    .delete(tables.threads)
    .where(and(
      eq(tables.threads.id, threadId),
      eq(tables.threads.user_id, userId),
    ))
    .returning()
    .pipe(
      Effect.mapError(cause =>
        new DbError({
          action: 'deleteThread',
          message: `Failed to delete thread ${threadId} for user ${userId}`,
          statusCode: 500,
          cause,
        })),
    )

  return result[0]
})

export const getThreadByUserId = Effect.fn('Query.getThreadByUserId')(function* (
  userId: string,
  threadId: string,
) {
  yield* Effect.annotateCurrentSpan({ userId, threadId })
  const db = yield* Database

  const thread = yield* db.query.threads.findFirst({
    where: {
      AND: [
        { id: { eq: threadId } },
        { user_id: { eq: userId } },
      ],
    },
  }).pipe(
    Effect.mapError(cause =>
      new DbError({
        action: 'getThreadByUserId',
        message: `Failed to fetch thread ${threadId} for user ${userId}`,
        statusCode: 500,
        cause,
      })),
  )

  if (!thread) {
    return yield* Effect.fail(new NotFoundError({
      id: threadId,
      message: `Thread ${threadId} not found for user ${userId}`,
      statusCode: 404,
    }))
  }

  return thread
})

export const getThreadsByUserId = Effect.fn('Query.getThreadsByUserId')(function* (
  userId: string,
) {
  yield* Effect.annotateCurrentSpan({ userId })
  const db = yield* Database

  const threads = yield* db.query.threads.findMany({
    where: { user_id: { eq: userId } },
    orderBy: { created_at: 'desc' },
    with: {
      messages: {
        orderBy: { created_at: 'asc' },
      },
    },
  }).pipe(
    Effect.mapError(cause =>
      new DbError({
        action: 'getThreadsByUserId',
        message: `Failed to fetch threads for user ${userId}`,
        statusCode: 500,
        cause,
      })),
  )

  yield* Effect.annotateCurrentSpan({ count: threads.length })

  if (threads.length === 0) {
    const thread = yield* saveThread(userId)
    return [{ ...thread, messages: [] }]
  }

  return threads
})

export const setThreadTitle = Effect.fn('Query.setThreadTitle')(function* (
  userId: string,
  threadId: string,
  title: string,
) {
  yield* Effect.annotateCurrentSpan({ userId, threadId, titleLength: title.length })
  const db = yield* Database

  const result = yield* db.update(tables.threads)
    .set({ title })
    .where(and(
      eq(tables.threads.id, threadId),
      eq(tables.threads.user_id, userId),
    ))
    .returning()
    .pipe(
      Effect.mapError(cause =>
        new DbError({
          action: 'setThreadTitle',
          message: `Failed to set title for thread ${threadId} for user ${userId}`,
          statusCode: 500,
          cause,
        })),
    )

  return result[0]
})

// Chunks

export const getChunksWithRRF = Effect.fn('Query.getChunksWithRRF')(function* (
  prompt: string,
  excludes: readonly string[],
  limit: number,
  w_semantic: number,
  w_lexical: number,
  jobIds?: readonly string[],
) {
  yield* Effect.annotateCurrentSpan({
    excludes,
    limit,
    w_semantic,
    w_lexical,
    jobIdsCount: jobIds?.length ?? 0,
  })

  const db = yield* Database

  // Get embedding for semantic search, fallback to lexical-only if fails
  const embedding = yield* embed(prompt).pipe(
    Effect.tapError(() => Effect.logWarning('getChunksWithRRF: embedding generation failed, using lexical-only')),
    Effect.catchAll(() => Effect.succeed(Array.from({ length: 1024 }).fill(0) as number[])),
  )

  // Build exclude conditions for both CTEs
  const excludeConditions = excludes.length > 0
    ? sql.join(
        excludes.map(term => sql`NOT (content ||| ${term})`),
        sql` AND `,
      )
    : undefined

  // Build jobIds filter for both CTEs
  const jobIdsFilter = jobIds && jobIds.length > 0
    ? inArray(tables.job_chunks.job_id, jobIds as string[])
    : undefined

  // Build WHERE conditions for semantic CTE
  const semanticWhere = [jobIdsFilter, excludeConditions].filter(Boolean)
  const semanticWhereClause = semanticWhere.length > 0
    ? sql`WHERE ${sql.join(semanticWhere, sql` AND `)}`
    : sql``

  // Build WHERE conditions for lexical CTE
  const lexicalWhere = [sql`content ||| ${prompt}`, jobIdsFilter, excludeConditions].filter(Boolean)
  const lexicalWhereClause = sql`WHERE ${sql.join(lexicalWhere, sql` AND `)}`

  const distance = cosineDistance(tables.job_chunks.embedding, embedding as number[])

  const result = yield* db.execute<{
    id: string
    job_id: string
    type: string
    content: string
    score: number
  }>(sql`
    WITH semantic AS (
      SELECT
        id,
        RANK() OVER (ORDER BY ${distance} ASC) AS rank
      FROM ${tables.job_chunks}
      ${semanticWhereClause}
      ORDER BY ${distance} ASC
      LIMIT ${limit}
    ),
    lexical AS (
      SELECT
        id,
        RANK() OVER (ORDER BY pdb.score(id) DESC) AS rank
      FROM ${tables.job_chunks}
      ${lexicalWhereClause}
      ORDER BY pdb.score(id) DESC
      LIMIT ${limit}
    ),
    rrf AS (
      SELECT id, ${w_semantic}::float / (60.0 + rank) AS s FROM semantic
      UNION ALL
      SELECT id, ${w_lexical}::float / (60.0 + rank) AS s FROM lexical
    )
    SELECT
      c.id,
      c.job_id,
      c.type,
      c.content,
      SUM(r.s) as score
    FROM rrf r
    JOIN ${tables.job_chunks} c USING (id)
    GROUP BY c.id, c.job_id, c.type, c.content
    ORDER BY score DESC
    LIMIT ${limit}
  `).pipe(
    Effect.mapError(cause =>
      new DbError({
        action: 'getChunksWithRRF',
        message: 'Failed to fetch chunks with RRF',
        statusCode: 500,
        cause,
      })),
  )

  yield* Effect.annotateCurrentSpan({ count: result.length })
  return result
})

export const getChunksByJobIds = Effect.fn('Query.getChunksByJobIds')(function* (
  job_ids: string[],
) {
  yield* Effect.annotateCurrentSpan({ jobIdCount: job_ids.length })

  const db = yield* Database
  const { embedding, ...rest } = getColumns(tables.job_chunks)

  const result = yield* db
    .select({ ...rest, score: sql<number>`0` })
    .from(tables.job_chunks)
    .where(inArray(tables.job_chunks.job_id, job_ids))
    .pipe(
      Effect.map((chunks) => {
        const grouped = new Map<string, typeof chunks>()
        for (const chunk of chunks) {
          const group = grouped.get(chunk.job_id)
          if (group) {
            group.push(chunk)
            continue
          }
          grouped.set(chunk.job_id, [chunk])
        }
        return grouped
      }),
      Effect.mapError(cause =>
        new DbError({
          action: 'getChunksByJobIds',
          message: `Failed to fetch chunks by job_ids`,
          statusCode: 500,
          cause,
        })),
    )

  yield* Effect.annotateCurrentSpan({ chunkCount: Array.from(result.values()).flat().length })
  return result
})

// Job IDs

export const getJobIdsByFilter = Effect.fn('Query.getJobIdsByFilter')(function* (
  payload: typeof GetReferencesPayloadSchema.Type,
) {
  const result = yield* Effect.gen(function* () {
    const filters = yield* generateFilters(payload.input)
    if (Object.keys(filters).length === 0)
      return []

    const jobs = yield* getJobsByPayload({ filters, excludes: payload.excludes })
    return jobs.map(j => j.id)
  }).pipe(
    Effect.catchAll(() => Effect.succeed<string[]>([])),
  )

  yield* Effect.annotateCurrentSpan({ count: result.length })
  return result
})

export const getSimilarFavoritedJobIds = Effect.fn('Query.getSimilarFavoritedJobIds')(function* (
  userId: string,
  excludes?: readonly string[],
) {
  const SIMILARITY_THRESHOLD = 0.80
  const MAX_RESULTS = 10
  const CANDIDATES_PER_CHUNK = 40
  const RECENT_FAVORITES_LIMIT = 5
  const PROBE_LIMIT = 5

  yield* Effect.annotateCurrentSpan({ userId, threshold: SIMILARITY_THRESHOLD, excludes })

  const db = yield* Database

  const excludeCondition = excludes && excludes.length > 0
    ? sql`AND job_id NOT IN ${excludes}`
    : sql``

  const result = yield* db.execute<{ job_id: string }>(sql`
    WITH all_favorites AS (
      SELECT job_id
      FROM ${tables.favorites}
      WHERE user_id = ${userId}
    ),
    recent_favorites AS (
      SELECT job_id
      FROM ${tables.favorites}
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${RECENT_FAVORITES_LIMIT}
    ),
    favorite_embeddings AS (
      SELECT DISTINCT ON (jc.job_id) jc.embedding
      FROM ${tables.job_chunks} jc
      JOIN recent_favorites fj ON jc.job_id = fj.job_id
      WHERE jc.type = 'header'
      LIMIT ${PROBE_LIMIT}
    ),
    similar_candidates AS (
      SELECT
        candidate.job_id,
        (1 - (candidate.embedding <=> fe.embedding)) as similarity
      FROM favorite_embeddings fe
      CROSS JOIN LATERAL (
        SELECT job_id, embedding
        FROM ${tables.job_chunks}
        ORDER BY embedding <=> fe.embedding
        LIMIT ${CANDIDATES_PER_CHUNK}
      ) candidate
    )
    SELECT job_id
    FROM similar_candidates
    WHERE similarity > ${SIMILARITY_THRESHOLD}
      AND job_id NOT IN (SELECT job_id FROM all_favorites)
      ${excludeCondition}
    GROUP BY job_id
    ORDER BY MAX(similarity) DESC
    LIMIT ${MAX_RESULTS}
  `).pipe(
    Effect.map(res => res.map(r => r.job_id)),
    Effect.tapError(cause => Effect.logError('Failed to find similar favorited jobs', cause)),
    Effect.catchAll(() => Effect.succeed<string[]>([])),
  )

  yield* Effect.annotateCurrentSpan({ count: result.length })
  return result
})

// Favorites

export const getFavoritesByUserId = Effect.fn('Query.getFavoritesByUserId')(function* (
  userId: string,
) {
  yield* Effect.annotateCurrentSpan({ userId })
  const db = yield* Database

  const result = yield* db
    .select()
    .from(tables.favorites)
    .where(eq(tables.favorites.user_id, userId))
    .orderBy(desc(tables.favorites.created_at))
    .pipe(
      Effect.mapError(cause =>
        new DbError({
          action: 'getFavoritesByUserId',
          message: 'Failed to fetch favorites',
          statusCode: 500,
          cause,
        })),
    )

  yield* Effect.annotateCurrentSpan({ count: result.length })
  return result
})

export const getFavoritesWithJobsByUserId = Effect.fn('Query.getFavoritesWithJobsByUserId')(function* (
  userId: string,
) {
  yield* Effect.annotateCurrentSpan({ userId })
  const db = yield* Database

  const result = yield* db.query.favorites.findMany({
    where: { user_id: { eq: userId } },
    with: { job: true },
    orderBy: { created_at: 'desc' },
  }).pipe(
    Effect.mapError(cause =>
      new DbError({
        action: 'getFavoritesWithJobsByUserId',
        message: 'Failed to fetch full favorites',
        statusCode: 500,
        cause,
      })),
  )

  yield* Effect.annotateCurrentSpan({ count: result.length })
  return result
})

export const saveFavorites = Effect.fn('Query.saveFavorites')(function* (
  userId: string,
  jobIds: readonly string[],
) {
  yield* Effect.annotateCurrentSpan({ userId, requested: jobIds.length })

  if (jobIds.length === 0) {
    return []
  }

  const db = yield* Database

  const values = jobIds.map(jobId => ({
    user_id: userId,
    job_id: jobId,
  }))

  const result = yield* db
    .insert(tables.favorites)
    .values(values)
    .onConflictDoNothing({ target: [tables.favorites.user_id, tables.favorites.job_id] })
    .returning()
    .pipe(
      Effect.mapError(cause =>
        new DbError({
          action: 'saveFavorites',
          message: 'Failed to batch save favorites',
          statusCode: 500,
          cause,
        })),
    )

  yield* Effect.annotateCurrentSpan({ saved: result.length })
  return result
})

export const deleteFavorites = Effect.fn('Query.deleteFavorites')(function* (
  userId: string,
  jobIds: readonly string[],
) {
  yield* Effect.annotateCurrentSpan({ userId, requested: jobIds.length })

  if (jobIds.length === 0) {
    return []
  }

  const db = yield* Database

  const result = yield* db
    .delete(tables.favorites)
    .where(and(
      eq(tables.favorites.user_id, userId),
      inArray(tables.favorites.job_id, jobIds as string[]),
    ))
    .returning()
    .pipe(
      Effect.mapError(cause =>
        new DbError({
          action: 'deleteFavorites',
          message: 'Failed to batch delete favorites',
          statusCode: 500,
          cause,
        })),
    )

  yield* Effect.annotateCurrentSpan({ deleted: result.length })
  return result
})
