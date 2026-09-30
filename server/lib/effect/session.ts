import type { User } from '#shared/types'
import type { H3Event } from 'h3'
import { env } from '#server/utils/env'
import { UserSchema } from '#shared/schema'
import { Effect, Redacted, Schema as S } from 'effect'
import { SessionError } from './error'

const _useSession = Effect.fn('Session._useSession')(function* (
  event: H3Event,
) {
  return yield* Effect.tryPromise(
    () => useSession<{ user: User | undefined }>(event, {
      password: Redacted.value(env.NUXT_SESSION_PASSWORD),
      maxAge: 60 * 60 * 24 * 7,
      cookie: {
        sameSite: 'lax',
        secure: false,
      },
    }),
  )
})

export const getUserSession = Effect.fn('Session.getUserSession')(function* (
  event: H3Event,
) {
  const session = yield* _useSession(event)
  const result = {
    id: session.id!,
    user: session.data.user,
  }

  if (result.user) {
    yield* Effect.annotateCurrentSpan({ userId: result.user.id })
  }

  return result
})

export const requireUserSession = Effect.fn('Session.requireUserSession')(function* (
  event: H3Event,
) {
  const session = yield* _useSession(event)
  const user = session.data.user

  if (!user) {
    return yield* Effect.fail(new SessionError({
      statusCode: 401,
      message: 'Unauthorized',
    }))
  }

  yield* Effect.annotateCurrentSpan({ userId: user.id })

  return { id: session.id!, user }
})

export const clearUserSession = Effect.fn('Session.clearUserSession')(function* (
  event: H3Event,
) {
  const session = yield* _useSession(event)
  yield* Effect.tryPromise(() => session.clear()).pipe(
    Effect.catchAll(e => Effect.logWarning('Failed to clear session').pipe(
      Effect.annotateLogs({ cause: e }),
    )),
  )
})

export const setUserSession = Effect.fn('Session.setUserSession')(function* (
  event: H3Event,
  user: User,
) {
  yield* Effect.annotateCurrentSpan({ userId: user.id })

  const session = yield* _useSession(event)
  const _user = yield* S.decode(UserSchema)({
    id: user.id,
    username: user.username,
    created_at: user.created_at,
  })
  yield* Effect.tryPromise(() => session.update({ user: _user }))
  return _user
})
