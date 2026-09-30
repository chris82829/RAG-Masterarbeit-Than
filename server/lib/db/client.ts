import type { EffectPgDatabase } from 'drizzle-orm/effect-postgres'
import { env } from '#server/utils/env'
import { PgClient } from '@effect/sql-pg'
import { drizzle } from 'drizzle-orm/effect-postgres'
import { Context, Effect, Layer } from 'effect'
import { relations } from './relations'
import * as schema from './schema'

// PgClient layer (connection pool)
export const PgClientLive = PgClient.layer({
  url: env.DATABASE_URL,
})

// Database type alias
type Db = EffectPgDatabase<typeof schema, typeof relations>

// Database context tag
export class Database extends Context.Tag('Database')<Database, Db>() {}

// Create database layer from PgClient
export const DatabaseLive = Layer.effect(
  Database,
  Effect.gen(function* () {
    const client = yield* PgClient.PgClient
    return drizzle(client, { schema, relations, casing: 'snake_case' })
  }),
)

// Combined layer: PgClient + Database
export const DbLive = DatabaseLive.pipe(Layer.provide(PgClientLive))
