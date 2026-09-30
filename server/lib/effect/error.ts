/* eslint-disable unicorn/throw-new-error */
import type { SqlError } from '@effect/sql'
import type { Cause, ParseResult } from 'effect'
import { Schema as S } from 'effect'
import { TaggedError } from 'effect/Data'

export class LlamaCppError extends S.TaggedError<LlamaCppError>()(
  'LlamaCppError',
  {
    action: S.Literal('embed', 'rerank'),
    message: S.String,
    statusCode: S.Number,
    cause: S.optional(S.Defect),
  },
) {}

export class DbError extends S.TaggedError<DbError>()(
  'DbError',
  {
    action: S.String,
    message: S.String,
    statusCode: S.Number,
    cause: S.optional(S.Defect),
  },
) {}

export class NotFoundError extends S.TaggedError<NotFoundError>()(
  'NotFoundError',
  {
    id: S.String,
    message: S.String,
    statusCode: S.Number,
  },
) {}

export class GenerateError extends S.TaggedError<GenerateError>()(
  'GenerateError',
  {
    action: S.String,
    message: S.String,
    statusCode: S.optionalWith(S.Number, { default: () => 500 }),
    cause: S.optional(S.Defect),
  },
) {}

export class SessionError extends S.TaggedError<SessionError>()(
  'SessionError',
  {
    message: S.String,
    statusCode: S.Number,
    cause: S.optional(S.Defect),
  },
) {}

export class RequestError extends S.TaggedError<RequestError>()(
  'RequestError',
  {
    action: S.Literal('readBody', 'readParams', 'readFiles'),
    message: S.String,
    statusCode: S.optionalWith(S.Number, { default: () => 400 }),
    cause: S.optional(S.Defect),
  },
) {}

export class TaggedDrizzleQueryError extends TaggedError('DrizzleQueryError') {
  override readonly message: string

  constructor(
    public readonly query: string,
    public readonly params: any[],
    public override cause?: Error,
  ) {
    super()
    this.message = `Failed query: ${query}\nparams: ${params}`
    Error.captureStackTrace(this, TaggedDrizzleQueryError)

    if (cause)
      (this as any).cause = cause
  }
}

export type AppError
  = ParseResult.ParseError
    | Cause.UnknownException
    | Cause.TimeoutException
    | TaggedDrizzleQueryError
    | SqlError.SqlError
    | LlamaCppError
    | DbError
    | NotFoundError
    | GenerateError
    | SessionError
    | RequestError
