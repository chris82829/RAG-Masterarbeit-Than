import { JOB_CATEGORIES, JOB_FIELDS, JOB_HOMEOFFICES, JOB_TYPES, JOB_WORKINGTIMES } from '#shared/constants'
import { clamp } from '#shared/math'
import { Schema as S } from 'effect'

export const JobSchema = S.Struct({
  id: S.String,
  title: S.String,
  company: S.String,
  location: S.String,

  short_description: S.String,

  worktime_min: S.Number,
  worktime_max: S.Number,
  homeoffice: S.String,

  types: S.Array(S.String),
  categories: S.Array(S.String),
  fields: S.Array(S.String),

  intro_title: S.String,
  intro_text: S.String,

  task_title: S.String,
  task_text: S.String,

  expectation_title: S.String,
  expectation_text: S.String,

  offer_title: S.String,
  offer_text: S.String,

  contact_title: S.String,
  contact_text: S.String,

  updated_at: S.String,
})

export const JobChunkSchema = S.Struct({
  type: S.String,
  id: S.String,
  job_id: S.String,
  content: S.String,
  embedding: S.Array(S.Number),
})

export const FiltersSchema = S.mutable(
  S.Struct({
    search: S.Trim.annotations({ description: 'Primary search query. Should NOT contain negation terms (no, without, kein, ohne) or unwanted keywords.' }),
    categories: S
      .optionalWith(S.mutable(S.Array(S.Literal(...JOB_CATEGORIES))), { default: () => [] })
      .annotations({ description: 'Job categories.' }),
    types: S
      .optionalWith(S.mutable(S.Array(S.Literal(...JOB_TYPES))), { default: () => [] })
      .annotations({ description: 'Contract types.' }),
    fields: S
      .optionalWith(S.mutable(S.Array(S.Literal(...JOB_FIELDS))), { default: () => [] })
      .annotations({ description: 'Job fields or industries.' }),
    homeoffices: S
      .optionalWith(S.mutable(S.Array(S.Literal(...JOB_HOMEOFFICES))), { default: () => [] })
      .annotations({ description: 'Home office preferences.' }),
    workingtimes: S
      .optionalWith(
        S.transform(
          S.mutable(S.Array(S.Int.pipe(S.greaterThanOrEqualTo(0)))),
          S.mutable(S.Array(S.Int.pipe(S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(JOB_WORKINGTIMES.max)))),
          {
            decode: (arr) => {
              const min = JOB_WORKINGTIMES.min
              const max = JOB_WORKINGTIMES.max

              if (!arr.length)
                return [min, max]

              const times = arr.flatMap(x => Number.isInteger(x) ? [clamp(x, min, max)] : [])

              if (!times.length)
                return [min, max]
              if (times.length === 1)
                return [times[0]!, max]

              return times
            },
            encode: arr => arr,
          },
        ),
        { default: () => [JOB_WORKINGTIMES.min, JOB_WORKINGTIMES.max] },
      )
      .annotations({ description: 'Working time in hours per week. Can be one value [value] or a range [min, max].' }),
    locations: S
      .optionalWith(S.mutable(S.Array(S.Trim)), { default: () => [] })
      .annotations({ description: 'Location filters (cities/regions).' }),
    excludes: S
      .optionalWith(S.mutable(S.Array(S.Trim.pipe(S.minLength(1)))), { default: () => [] })
      .annotations({
        description: 'Keywords to exclude from results. Extract terms after negation words (no, without, kein, ohne). Examples: "no Java" → ["Java"], "ohne SAP" → ["SAP"].',
      }),
    start_date: S
      .optional(S.String)
      .annotations({ description: 'Earliest start date (ISO YYYY-MM-DD).' }),
    end_date: S
      .optional(S.String)
      .annotations({ description: 'Latest end date (ISO YYYY-MM-DD).' }),
  }),
)

export const GetJobsByPayloadSchema = S.mutable(
  S.Struct({
    filters: S.optional(FiltersSchema),
    job_ids: S.optional(S.mutable(S.Array(S.String))),
    limit: S.optional(S.Int.pipe(S.greaterThanOrEqualTo(0))),
    excludes: S.optional(S.Array(S.Trim)),
  }),
)

export const UserSchema = S.Struct({
  id: S.String,
  username: S.String,
  created_at: S.String,
})

export const UsernameSchema = S.Trim.pipe(S.minLength(3)).annotations({
  description: 'Must be at least 3 characters',
})

export const MemorySchema = S.Struct({
  type: S.Union(
    S.Literal('core_profile'),
    S.Literal('preference'),
    S.Literal('experience'),
  ).annotations({
    description: 'The category of the memory. \'core_profile\' for unchanging facts (Major, Name), \'preference\' for job constraints, \'experience\' for work history/projects.',
  }),

  content: S.String.annotations({
    description: 'The concise summary of the fact. e.g., "User is a Junior studying Computer Science" or "User requires Visa sponsorship".',
  }),

  importance: S
    .Number
    .pipe(S.int(), S.between(1, 10))
    .annotations({
      description: 'Scale 1-10. 10=Critical constraint (e.g. Visa, Grad Date). 7=Strong Skill/Preference. 1=Trivial detail. High importance memories are always loaded into context.',
    }),

  valid_until: S.optional(S.String).annotations({
    description: 'ISO Date string (YYYY-MM-DD). Only use if this memory expires, e.g., "Available for Summer 2025" expires on 2025-08-31.',
  }),

  embedding: S.Array(S.Number),
  created_at: S.String,
})

export const GenerateMemoriesSchema = S.Struct({
  memories: S.optionalWith(
    S.Array(MemorySchema.omit('embedding').omit('created_at'))
      .annotations({
        description: 'An array of extracted personal facts. Output raw JSON only—no code wrappers like print(...) or markdown fences. If no facts, return empty array [].',
      }),
    { default: () => [] },
  ),
})

const BaseGetJobsInputSchema = S.Struct({
  input: S
    .Trimmed
    .pipe(S.minLength(3))
    .annotations({
      description: 'The primary search query. ',
    }),

  limit: S
    .optionalWith(
      S.Number.pipe(S.int(), S.between(1, 20)),
      { default: () => 5 },
    )
    .annotations({
      description: 'Maximum number of job postings to retrieve (Default: 5, Max: 20).',
    }),

  excludes: S
    .optionalWith(
      S.mutable(S.Array(S.Trimmed.pipe(S.minLength(1)))),
      { default: () => [] },
    )
    .annotations({
      description:
      'List of unwanted keywords. '
      + 'Extract negative signals indicated by \'no\', \'without\', \'kein\', \'ohne\'. '
      + 'Examples: User says \'no Java\' -> output [\'Java\'].',
    }),

  w_lexical: S
    .optionalWith(
      S.transform(
        S.Number.pipe(
          S.filter(n => n >= 0 && n <= 1, {
            message: () => 'w_lexical must be between 0 and 1',
          }),
        ),
        S.Literal(0.2, 0.5, 0.8),
        {
          decode: (n) => {
            if (n <= 0.35)
              return 0.2
            if (n <= 0.65)
              return 0.5
            return 0.8
          },
          encode: n => n,
        },
      ),
      { default: () => 0.5 as const },
    )
    .annotations({
      description:
      'Weight for lexical (keyword-based) search. Semantic weight is derived as (1 - w_lexical). '
      + 'Use 0.8 for specific searches with company names, technologies, or locations. '
      + 'Use 0.2 for vague/conversational queries. Default: 0.5.',
    }),
})

export const GetJobsInputSchema = S.mutable(BaseGetJobsInputSchema)
export const GetJobsOutputSchema = S.Struct({
  summary: S.optional(S.Trim),
  jobs: S.Array(S.Struct({
    id: S.String,
    title: S.String,
    company: S.String,
    location: S.String,
    short_description: S.String,
    worktime_min: S.Number,
    worktime_max: S.Number,
    homeoffice: S.String,
    types: S.Array(S.String),
    categories: S.Array(S.String),
    fields: S.Array(S.String),
    score: S.Number,
    label: S.Literal('Explore This Option', 'Good Possibility', 'Strong Potential', 'Top Choice'),
    chunks: S.Array(S.extend(JobChunkSchema.omit('embedding'), S.Struct({ score: S.Number }))),
  })),
})

export const GetReferencesPayloadSchema = S.extend(
  BaseGetJobsInputSchema,
  S.Struct({ userId: S.Trim }),
)

export const GetMemoriesInputSchema = S.Struct({
  input: S
    .Trim
    .annotations({
      description: 'Keyword or hint for what to retrieve (e.g., \'location\', \'skills\', or \'preferences\').',
    }),
})

export const SuggestionsSchema = S.Array(S.Trim.pipe(S.maxLength(120)))

export const ExcludesSchema = S.Struct({
  excludes: S
    .optionalWith(
      S.mutable(S.Array(S.Trimmed.pipe(S.minLength(1)))),
      { default: () => [] },
    )
    .annotations({
      description:
      'List of keywords to exclude from search results. '
      + 'Extract terms following negation words (ohne, kein, nicht, without, no). '
      + 'Examples: "kein SAP" → ["SAP"], "without travel" → ["Reisen"]',
    }),
})
