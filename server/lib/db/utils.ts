import type { Filters } from '#shared/types'
import type { SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import { JOB_SEARCH_TARGET_COLUMNS, JOB_WORKINGTIMES } from '#shared/constants'
import { clamp } from '#shared/math'
import { and, gte, lte, sql } from 'drizzle-orm'
import { jobs } from './schema/jobs'

export function buildFiltersSQL(filters: Filters) {
  const conditions: (SQL | undefined)[] = []
  let score: SQL.Aliased<number> | undefined

  if (filters.search) {
    const query = filters.search

    const condition = sql.join(
      JOB_SEARCH_TARGET_COLUMNS.map(
        c => sql`${sql.identifier(c)} ||| ${query}::pdb.fuzzy(1)`,
      ),
      sql` OR `,
    )

    conditions.push(sql`(${condition})`)

    score = sql<number>`pdb.score(id)`.as('score')
  }

  if (filters.types?.length) {
    const condition = includedInColumn(filters.types, jobs.types)
    conditions.push(condition)
  }

  if (filters.fields?.length) {
    const condition = includedInColumn(filters.fields, jobs.fields)
    conditions.push(condition)
  }

  if (filters.categories?.length) {
    const condition = includedInColumn(filters.categories, jobs.categories)
    conditions.push(condition)
  }

  if (filters.homeoffices?.length) {
    const condition = sql`${jobs.homeoffice} IN (${sql.join(
      filters.homeoffices.map(h => sql`${h}`),
      sql`, `,
    )})`
    conditions.push(condition)
  }

  if (filters.workingtimes?.length) {
    const min = JOB_WORKINGTIMES.min
    const max = JOB_WORKINGTIMES.max
    const _min = filters.workingtimes[0] || min
    const _max = filters.workingtimes[1] || max
    const condition = and(
      lte(jobs.worktime_min, clamp(_max, min, max)),
      gte(jobs.worktime_max, clamp(_min, min, max)),
    )
    conditions.push(condition)
  }

  if (filters.locations?.length) {
    const locationConditions = filters.locations.map(loc =>
      sql`${jobs.location} ||| ${loc}::pdb.fuzzy(1)`,
    )
    conditions.push(sql`(${sql.join(locationConditions, sql` OR `)})`)
  }

  if (filters.start_date) {
    conditions.push(sql`${jobs.updated_at} >= ${filters.start_date}`)
  }

  if (filters.end_date) {
    conditions.push(sql`${jobs.updated_at} <= ${filters.end_date}`)
  }

  return { score, conditions }
}

function includedInColumn(filter: string[], column: PgColumn) {
  const array = sql`ARRAY[${sql.join(filter.map(t => sql`${t}`), sql`, `)}]`
  return sql`${column} && ${array}`
}
