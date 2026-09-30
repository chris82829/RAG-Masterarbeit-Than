import process from 'node:process'
import { Schema as S } from 'effect'

const EnvSchema = S.Struct({
  GOOGLE_API_KEY: S.Redacted(S.String),
  NUXT_SESSION_PASSWORD: S.Redacted(S.String),
  DATABASE_URL: S.Redacted(S.String),
})

export type Env = typeof EnvSchema.Type
export const env: Env = S.decodeSync(EnvSchema)(process.env as any)
