import { sql } from 'drizzle-orm'
import { index, integer, pgEnum, pgTable, text, timestamp, uuid, vector } from 'drizzle-orm/pg-core'

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    title: text('title').notNull(),
    company: text('company').notNull(),
    location: text('location').notNull(),

    short_description: text('short_description').notNull(),

    worktime_min: integer('worktime_min').default(0).notNull(),
    worktime_max: integer('worktime_max').default(60).notNull(),
    homeoffice: text('homeoffice').default('').notNull(),

    types: text('types').array().notNull(),
    categories: text('categories').array().notNull(),
    fields: text('fields').array().notNull(),

    intro_title: text('intro_title').notNull(),
    intro_text: text('intro_text').notNull(),

    task_title: text('task_title').notNull(),
    task_text: text('task_text').notNull(),

    expectation_title: text('expectation_title').notNull(),
    expectation_text: text('expectation_text').notNull(),

    offer_title: text('offer_title').notNull(),
    offer_text: text('offer_text').notNull(),

    contact_title: text('contact_title').notNull(),
    contact_text: text('contact_text').notNull(),

    updated_at: timestamp('updated_at', { withTimezone: false, mode: 'string' }).notNull(),
  },
  t => [
    index('idx_job_search')
      .using(
        'bm25',
        t.id,
        t.title,
        t.company,
        t.location,
        t.short_description,
        t.intro_text,
        t.task_text,
        t.expectation_text,
        t.offer_text,
        t.contact_text,
      )
      .with({ key_field: 'id' }),
  ],
)

export const job_chunk_type = pgEnum('job_chunk_type', [
  'header',
  'intro_text',
  'task_text',
  'expectation_text',
  'offer_text',
])

export const job_chunks = pgTable(
  'job_chunks',
  {
    id: uuid('id').primaryKey().default(sql`uuidv7()`),
    job_id: uuid('job_id').notNull().references(() => jobs.id, { onDelete: 'cascade' }),
    type: job_chunk_type('type').notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1024 }).notNull(),
  },
  t => [
    index('idx_job_chunks_job_id').on(t.job_id),

    index('idx_job_chunks_embedding')
      .using('hnsw', t.embedding.op('vector_cosine_ops'))
      .with({ m: 16, ef_construction: 200 }),

    index('idx_job_chunk_search')
      .using(
        'bm25',
        t.id,
        t.content,
      )
      .with({ key_field: 'id' }),
  ],
)
