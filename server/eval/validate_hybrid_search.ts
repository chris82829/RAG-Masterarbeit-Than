import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { Effect } from 'effect'
import { getChunksWithRRF, getJobsByPayload } from '../lib/db/query'
import excludesData from './generated_excludes.json'
import filtersData from './generated_filters.json'
import queriesData from './queries_500.json'

const outputPath = join(process.cwd(), 'server/eval/validated_hybrid_search.json')

// Configuration
const W_SEMANTIC = 0.5
const W_LEXICAL = 0.5
const CHUNK_LIMIT = 10

// Scenario definitions
interface Scenario {
  name: string
  useFilters: boolean
  useExcludes: boolean
  filterAfter: boolean // Apply filters after hybrid search
}

const scenarios: Scenario[] = [
  { name: 'baseline', useFilters: false, useExcludes: false, filterAfter: false },
  { name: 'filter_before', useFilters: true, useExcludes: false, filterAfter: false },
  { name: 'with_excludes', useFilters: false, useExcludes: true, filterAfter: false },
  { name: 'filter_before_and_excludes', useFilters: true, useExcludes: true, filterAfter: false },
  { name: 'filter_after', useFilters: true, useExcludes: false, filterAfter: true },
  { name: 'filter_after_and_excludes', useFilters: true, useExcludes: true, filterAfter: true },
]

// Result type
interface ValidationResult {
  scenario: string
  query: string
  job_id: string
  archetype: string
  rank: number | null
  found_in_top5: boolean
  found_in_top10: boolean
  total_chunks: number
  total_unique_jobs: number
}

// Metrics types
interface ArchetypeMetrics {
  count: number
  top1_count: number
  top5_count: number
  top10_count: number
  top1_accuracy: number
  top5_accuracy: number
  top10_accuracy: number
  mrr: number
  avg_rank_when_found: number
  median_rank_when_found: number
}

interface SummaryMetrics {
  total: number
  top1_accuracy: number
  top5_accuracy: number
  top10_accuracy: number
  mrr: number
  avg_rank_when_found: number
  median_rank_when_found: number
}

function calculateMetrics(results: ValidationResult[]): {
  summary: SummaryMetrics
  by_archetype: Record<string, ArchetypeMetrics>
} {
  // Overall metrics
  const top1 = results.filter(r => r.rank === 1).length
  const top5 = results.filter(r => r.found_in_top5).length
  const top10 = results.filter(r => r.found_in_top10).length

  const mrr = results.reduce((sum, r) =>
    sum + (r.rank ? 1 / r.rank : 0), 0) / results.length

  const ranksWhenFound = results
    .filter(r => r.rank !== null)
    .map(r => r.rank!)
    .sort((a, b) => a - b)

  const avgRank = ranksWhenFound.length > 0
    ? ranksWhenFound.reduce((a, b) => a + b, 0) / ranksWhenFound.length
    : 0

  const medianRank = ranksWhenFound.length > 0
    ? ranksWhenFound[Math.floor(ranksWhenFound.length / 2)]!
    : 0

  // Per-archetype breakdown
  const archetypes = [...new Set(results.map(r => r.archetype))]
  const by_archetype: Record<string, ArchetypeMetrics> = {}

  for (const arch of archetypes) {
    const archResults = results.filter(r => r.archetype === arch)
    const archTop1 = archResults.filter(r => r.rank === 1).length
    const archTop5 = archResults.filter(r => r.found_in_top5).length
    const archTop10 = archResults.filter(r => r.found_in_top10).length

    const archMrr = archResults.reduce((sum, r) =>
      sum + (r.rank ? 1 / r.rank : 0), 0) / archResults.length

    const archRanks = archResults
      .filter(r => r.rank !== null)
      .map(r => r.rank!)
      .sort((a, b) => a - b)

    by_archetype[arch] = {
      count: archResults.length,
      top1_count: archTop1,
      top5_count: archTop5,
      top10_count: archTop10,
      top1_accuracy: archTop1 / archResults.length,
      top5_accuracy: archTop5 / archResults.length,
      top10_accuracy: archTop10 / archResults.length,
      mrr: archMrr,
      avg_rank_when_found: archRanks.length > 0
        ? archRanks.reduce((a, b) => a + b, 0) / archRanks.length
        : 0,
      median_rank_when_found: archRanks.length > 0
        ? archRanks[Math.floor(archRanks.length / 2)]!
        : 0,
    }
  }

  return {
    summary: {
      total: results.length,
      top1_accuracy: top1 / results.length,
      top5_accuracy: top5 / results.length,
      top10_accuracy: top10 / results.length,
      mrr,
      avg_rank_when_found: avgRank,
      median_rank_when_found: medianRank,
    },
    by_archetype,
  }
}

export const program = Effect.gen(function* () {
  // 1. Setup: Create lookup maps
  const filtersMap = new Map(filtersData.map(f => [f.query, f.filters]))
  const excludesMap = new Map(excludesData.map(e => [e.query, e.excludes]))

  // 2. Extract all 100 job_ids
  const all_job_ids = queriesData.map(q => q.job_id)

  console.log(`Starting hybrid search validation of ${queriesData.length} queries...`)
  console.log(`Config: w_semantic=${W_SEMANTIC}, w_lexical=${W_LEXICAL}, limit=${CHUNK_LIMIT}\n`)

  // 3. Process each scenario
  const allResults: ValidationResult[] = []

  for (const scenario of scenarios) {
    console.log(`\n=== Scenario: ${scenario.name} ===`)
    console.log(`  Filters: ${scenario.useFilters}, Excludes: ${scenario.useExcludes}, FilterAfter: ${scenario.filterAfter}\n`)

    const scenarioResults: ValidationResult[] = []

    // 4. Process each query within scenario
    for (let i = 0; i < queriesData.length; i++) {
      const item = queriesData[i]!

      // 5. Determine jobIds based on scenario (filter BEFORE)
      let jobIds = all_job_ids

      if (scenario.useFilters && !scenario.filterAfter) {
        const filters = filtersMap.get(item.query)
        if (filters) {
          const jobsResult = yield* getJobsByPayload({
            filters: filters as any,
            job_ids: all_job_ids,
          }).pipe(Effect.either)

          if (jobsResult._tag === 'Right') {
            jobIds = jobsResult.right.map(j => j.id)
          }
          else {
            // Filter query failed, use all job_ids
            console.log(`  ⚠ ${String(i + 1).padStart(3)}: Filter failed, using all job_ids`)
          }
        }
      }

      // 6. Determine excludes based on scenario
      const excludes = scenario.useExcludes
        ? (excludesMap.get(item.query) || [])
        : []

      // 7. Call getChunksWithRRF
      const chunksResult = yield* getChunksWithRRF(
        item.query,
        excludes as any,
        CHUNK_LIMIT,
        W_SEMANTIC,
        W_LEXICAL,
        jobIds.length > 0 ? jobIds : undefined,
      ).pipe(Effect.either)

      // 8. Handle result
      if (chunksResult._tag === 'Left') {
        console.log(`  ✗ ${String(i + 1).padStart(3)}: Query failed - ${item.query}`)
        scenarioResults.push({
          scenario: scenario.name,
          query: item.query,
          job_id: item.job_id,
          archetype: item.archetype,
          rank: null,
          found_in_top5: false,
          found_in_top10: false,
          total_chunks: 0,
          total_unique_jobs: 0,
        })
        continue
      }

      const chunks = chunksResult.right

      // 9. Extract unique job_ids in order (Option A: first occurrence)
      let rankedJobIds: string[] = []
      for (const chunk of chunks) {
        if (!rankedJobIds.includes(chunk.job_id)) {
          rankedJobIds.push(chunk.job_id)
        }
      }

      // 10. Apply filters AFTER if filterAfter=true
      if (scenario.useFilters && scenario.filterAfter) {
        const filters = filtersMap.get(item.query)
        if (filters && rankedJobIds.length > 0) {
          const jobsResult = yield* getJobsByPayload({
            filters: filters as any,
            job_ids: rankedJobIds,
          }).pipe(Effect.either)

          if (jobsResult._tag === 'Right') {
            const filteredJobIds = new Set(jobsResult.right.map(j => j.id))
            // Keep original ranking, just filter out non-matching jobs
            rankedJobIds = rankedJobIds.filter(id => filteredJobIds.has(id))
          }
          else {
            console.log(`  ⚠ ${String(i + 1).padStart(3)}: Filter-after failed, keeping all results`)
          }
        }
      }

      // 11. Find rank of target job_id
      const rankIndex = rankedJobIds.findIndex(id => id === item.job_id)
      const rank = rankIndex === -1 ? null : rankIndex + 1

      const result: ValidationResult = {
        scenario: scenario.name,
        query: item.query,
        job_id: item.job_id,
        archetype: item.archetype,
        rank,
        found_in_top5: rankIndex !== -1 && rankIndex < 5,
        found_in_top10: rankIndex !== -1 && rankIndex < 10,
        total_chunks: chunks.length,
        total_unique_jobs: rankedJobIds.length,
      }

      scenarioResults.push(result)

      const rankDisplay = rank === null ? 'NOT FOUND' : String(rank).padStart(3)
      console.log(
        `  ${String(i + 1).padStart(3)}/${queriesData.length}: ${item.archetype.padEnd(10)} | `
        + `Rank: ${rankDisplay} | Jobs: ${rankedJobIds.length} | ${item.query.substring(0, 50)}`,
      )
    }

    allResults.push(...scenarioResults)

    // 12. Calculate metrics for this scenario
    const metrics = calculateMetrics(scenarioResults)
    console.log(`\n  ${scenario.name} Summary:`)
    console.log(`    Top-1: ${(metrics.summary.top1_accuracy * 100).toFixed(1)}% | `
      + `Top-5: ${(metrics.summary.top5_accuracy * 100).toFixed(1)}% | `
      + `Top-10: ${(metrics.summary.top10_accuracy * 100).toFixed(1)}% | `
      + `MRR: ${metrics.summary.mrr.toFixed(3)}`)
  }

  // 13. Calculate metrics per scenario for output
  const scenarioMetrics: Record<string, {
    summary: SummaryMetrics
    by_archetype: Record<string, ArchetypeMetrics>
  }> = {}

  for (const scenario of scenarios) {
    const scenarioResults = allResults.filter(r => r.scenario === scenario.name)
    scenarioMetrics[scenario.name] = calculateMetrics(scenarioResults)
  }

  // 14. Write output
  const output = {
    config: {
      w_semantic: W_SEMANTIC,
      w_lexical: W_LEXICAL,
      chunk_limit: CHUNK_LIMIT,
      total_queries: queriesData.length,
    },
    scenarios: scenarioMetrics,
    results: allResults,
  }

  yield* Effect.tryPromise({
    try: () => writeFile(outputPath, JSON.stringify(output, null, 2)),
    catch: error => new Error(`Failed to write results: ${error}`),
  })

  console.log(`\n\n✓ Validation complete: ${outputPath}`)

  // 15. Print comparison table
  console.log('\n=== Scenario Comparison ===')
  console.log('Scenario                      | Top-1  | Top-5  | Top-10 | MRR   ')
  console.log('------------------------------|--------|--------|--------|-------')
  for (const scenario of scenarios) {
    const m = scenarioMetrics[scenario.name]!.summary
    console.log(
      `${scenario.name.padEnd(29)} | `
      + `${(m.top1_accuracy * 100).toFixed(1).padStart(5)}% | `
      + `${(m.top5_accuracy * 100).toFixed(1).padStart(5)}% | `
      + `${(m.top10_accuracy * 100).toFixed(1).padStart(5)}% | `
      + `${m.mrr.toFixed(3)}`,
    )
  }
})
