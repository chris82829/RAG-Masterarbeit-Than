import type { ToolboxPayload } from '#shared/types'
import { getFavoritesWithJobsByUserId, getJobsByPayload, getMemoriesByUserInput, saveMemoriesByModelMessages } from '#server/lib/db/query'
import { runEffect } from '#server/lib/effect/utils'
import { GetJobsInputSchema, GetJobsOutputSchema, GetMemoriesInputSchema } from '#shared/schema'
import { effectSchema, getJobLabel } from '#shared/utils'
import { tool } from 'ai'
import { Effect, Schema as S } from 'effect'
import { getReferences } from '../db/reference'

export function getTools(payload: ToolboxPayload) {
  return {
    // jobs
    get_jobs: get_jobs(payload),

    // memories
    get_memories: get_memories(payload),
    save_memories: save_memories(payload),

    // favorites
    get_favorites: get_favorites(payload),
  }
}

function get_jobs(payload: ToolboxPayload) {
  return tool({
    description: 'Search for jobs, internships, or career opportunities on this platform.',
    inputSchema: effectSchema(GetJobsInputSchema),
    outputSchema: effectSchema(GetJobsOutputSchema),
    strict: true,
    needsApproval: true,
    async execute(args) {
      return await runEffect(Effect.gen(function* () {
        if (args.limit === 0) {
          return {
            jobs: [],
            summary: 'No jobs found matching your search settings.',
          }
        }

        const { references } = yield* getReferences({
          ...args,
          userId: payload.userId,
        })

        if (references.length === 0) {
          return {
            jobs: [],
            summary: 'No jobs found matching your search settings.',
          }
        }

        const jobs = yield* getJobsByPayload({ job_ids: references.map(c => c.job_id) })
        const map = new Map(references.map(x => [x.job_id, x]))
        const result = jobs
          .map((j) => {
            const { score, chunks } = map.get(j.id) ?? { score: 0, chunks: [] }
            const label = getJobLabel(score)
            return { ...j, score, label, chunks }
          })
          .sort((a, b) => b.score - a.score)

        return {
          jobs: result,
          summary: `Found ${result.length} jobs based on your search settings.`,
        }
      }))
    },
  })
}

function get_memories(payload: ToolboxPayload) {
  return tool({
    description: `Retrieve the user's saved career preferences (skills, location, job type) when input is vague or references past conversations.`,
    inputSchema: effectSchema(GetMemoriesInputSchema),
    strict: true,
    async execute({ input }) {
      const program = getMemoriesByUserInput(payload.userId, input)
      const memories = await runEffect(program)

      return {
        success: true,
        count: memories.length,
        memories,
      }
    },
  })
}

function save_memories(payload: ToolboxPayload) {
  return tool({
    description: 'Save newly shared persistent career information (skills, preferences, location) from recent user messages.',
    inputSchema: effectSchema(S.Unknown),
    async execute(_, { messages }) {
      const program = Effect.gen(function* () {
        const memories = yield* saveMemoriesByModelMessages(payload.userId, messages)

        return {
          success: true,
          count: memories.length,
          memories,
        }
      })

      return await runEffect(program)
    },
  })
}

function get_favorites(payload: ToolboxPayload) {
  return tool({
    description: 'Retrieves a list of job postings the current user has saved as favorites. Results are sorted by most recently added.',
    inputSchema: effectSchema(S.Unknown),
    async execute() {
      const program = getFavoritesWithJobsByUserId(payload.userId)
      const favorites = await runEffect(program)

      return {
        success: true,
        count: favorites.length,
        favorites,
      }
    },
  })
}
