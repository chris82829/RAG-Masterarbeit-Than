import { defineRelations } from 'drizzle-orm'
import * as schema from './schema'

export const relations = defineRelations(schema, r => ({
  users: {
    threads: r.many.threads(),
    favorites: r.many.favorites(),
  },
  threads: {
    user: r.one.users({
      from: r.threads.user_id,
      to: r.users.id,
    }),
    messages: r.many.messages(),
  },
  messages: {
    thread: r.one.threads({
      from: r.messages.thread_id,
      to: r.threads.id,
    }),
  },
  memories: {
    user: r.one.users({
      from: r.memories.user_id,
      to: r.users.id,
    }),
  },
  favorites: {
    user: r.one.users({
      from: r.favorites.user_id,
      to: r.users.id,
    }),
    job: r.one.jobs({
      from: r.favorites.job_id,
      to: r.jobs.id,
    }),
  },
}))
