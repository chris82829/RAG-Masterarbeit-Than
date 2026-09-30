import type { ChatMetadata, ChatUIMessagePart } from '#shared/types'
import { sql } from 'drizzle-orm'
import { date, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, uuid, varchar, vector } from 'drizzle-orm/pg-core'
import { jobs } from './jobs'

export const MessageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system'])
export const MemoryTypeEnum = pgEnum('memory_type', ['core_profile', 'preference', 'experience'])

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    username: varchar('username', { length: 50 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: false, mode: 'string' }).defaultNow().notNull(),
  },
)

export const threads = pgTable(
  'threads',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: varchar({ length: 200 }).notNull().default('Untitled'),
    created_at: timestamp('created_at', { withTimezone: false, mode: 'string' }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: false, mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('threads_user_id_idx').on(table.user_id),
  ],
)

export const messages = pgTable(
  'messages',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    thread_id: uuid('thread_id').notNull().references(() => threads.id, { onDelete: 'cascade' }),
    role: MessageRoleEnum('role').notNull(),
    metadata: jsonb('metadata').$type<ChatMetadata>().notNull().default({}),
    parts: jsonb('parts').$type<ChatUIMessagePart[]>().notNull().default([]),
    created_at: timestamp('created_at', { withTimezone: false, mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('messages_thread_id_idx').on(table.thread_id),
    index('messages_created_at_idx').on(table.created_at),
  ],
)

export const memories = pgTable(
  'memories',
  {
    id: serial('id').primaryKey(),
    user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: MemoryTypeEnum('type').notNull(),
    content: text('content').notNull(),
    importance: integer('importance').default(5).notNull(),
    embedding: vector('embedding', { dimensions: 1024 }).notNull(),
    valid_until: date('valid_until'),
    created_at: timestamp('created_at', { withTimezone: false, mode: 'string' }).defaultNow().notNull(),
  },
  t => [
    index('idx_memories_embedding')
      .using('hnsw', t.embedding.op('vector_cosine_ops'))
      .with({ m: 16, ef_construction: 200 }),

    index('idx_memories_importance').on(t.user_id, t.importance),
  ],
)

export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    job_id: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: false, mode: 'string' }).defaultNow().notNull(),
  },
  table => [
    index('favorites_user_id_idx').on(table.user_id),
    index('favorites_job_id_idx').on(table.job_id),
    uniqueIndex('favorites_user_job_unique_idx').on(table.user_id, table.job_id),
  ],
)
