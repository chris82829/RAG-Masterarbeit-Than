import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { Effect } from 'effect'
import { generateFilters } from '../lib/effect/generation'
import items from './queries_500.json'

const outputPath = join(process.cwd(), 'server/eval/generated_filters.json')
const failuresPath = join(process.cwd(), 'server/eval/generated_filters_failures.json')

async function readJsonFile<T>(path: string): Promise<T[]> {
  try {
    const content = await readFile(path, 'utf-8')
    return JSON.parse(content)
  }
  catch {
    return []
  }
}

export const program = Effect.gen(function* () {
  // Load already processed queries
  const existingResults = yield* Effect.tryPromise({
    try: () => readJsonFile<{ query: string, filters: any }>(outputPath),
    catch: () => new Error('Failed to read existing results'),
  })

  const existingFailures = yield* Effect.tryPromise({
    try: () => readJsonFile<{ query: string, error: string }>(failuresPath),
    catch: () => new Error('Failed to read existing failures'),
  })

  const processedQueries = new Set([
    ...existingResults.map(r => r.query),
    ...existingFailures.map(f => f.query),
  ])

  console.log(`Already processed: ${processedQueries.size} queries`)
  console.log(`Starting from item ${processedQueries.size + 1}/${items.length}\n`)

  const results: Array<{ query: string, filters: any }> = []
  const failures: Array<{ query: string, error: string }> = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (!item)
      continue

    // Skip already processed queries
    if (processedQueries.has(item.query)) {
      console.log(`⏭ ${i + 1}/${items.length}: Skipped (already processed) - ${item.query}`)
      continue
    }

    const filtersResult = yield* generateFilters(item.query).pipe(
      Effect.either,
    )

    if (filtersResult._tag === 'Right') {
      const result = {
        ...item,
        filters: filtersResult.right,
      }
      results.push(result)

      // Write immediately to filesystem
      yield* Effect.tryPromise({
        try: async () => {
          const existing = await readJsonFile<typeof result>(outputPath)
          existing.push(result)
          await writeFile(outputPath, JSON.stringify(existing, null, 2))
        },
        catch: error => new Error(`Failed to write filter: ${error}`),
      })

      console.log(`✓ ${i + 1}/${items.length}: ${item.query}`)
    }
    else {
      const failure = {
        query: item.query,
        error: String(filtersResult.left),
      }
      failures.push(failure)

      // Write failure immediately to filesystem
      yield* Effect.tryPromise({
        try: async () => {
          const existing = await readJsonFile<typeof failure>(failuresPath)
          existing.push(failure)
          await writeFile(failuresPath, JSON.stringify(existing, null, 2))
        },
        catch: error => new Error(`Failed to write failure: ${error}`),
      })

      console.log(`✗ ${i + 1}/${items.length}: Failed - ${item.query}`)
    }
  }

  const totalSuccess = existingResults.length + results.length
  const totalFailures = existingFailures.length + failures.length

  console.log(`\n✓ Completed: ${results.length} new successes (${totalSuccess} total)`)
  console.log(`✗ Failures: ${failures.length} new failures (${totalFailures} total)`)
  console.log(`✓ Results: ${outputPath}`)
  if (totalFailures > 0) {
    console.log(`⚠ Failures: ${failuresPath}`)
  }
})
