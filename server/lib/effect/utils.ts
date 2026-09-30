import type { Database } from '#server/lib/db/client'
import type { ChatModelKey } from '#shared/types'
import type { ExportResult } from '@opentelemetry/core'
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base'
import type { ParseResult } from 'effect'
import type { H3Event } from 'h3'
import type { AppError } from './error'
import { Buffer } from 'node:buffer'
import { DbLive } from '#server/lib/db/client'
import { env } from '#server/utils/env'
import { devToolsMiddleware } from '@ai-sdk/devtools'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { NodeSdk } from '@effect/opentelemetry'
import { SpanStatusCode } from '@opentelemetry/api'
import { ExportResultCode, hrTimeToMilliseconds } from '@opentelemetry/core'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { wrapLanguageModel } from 'ai'
import { consola } from 'consola'
import { Cause, Effect, Exit, Layer, Logger, ManagedRuntime, Match, Redacted, Schema as S } from 'effect'
import { createError, getRouterParams, readBody, readMultipartFormData } from 'h3'
import { RequestError } from './error'

class PrettySpanExporter implements SpanExporter {
  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    for (const span of spans) {
      const timestamp = new Date().toISOString()
      const name = span.name
      const durationMs = Math.round(hrTimeToMilliseconds(span.duration))
      const isError = span.status.code === SpanStatusCode.ERROR

      // Format attributes
      const attrParts: string[] = []
      for (const [key, value] of Object.entries(span.attributes)) {
        if (value !== undefined) {
          const v = typeof value === 'string' ? value : JSON.stringify(value)
          attrParts.push(`${key}=${v}`)
        }
      }

      const attrs = attrParts.length > 0 ? ` · ${attrParts.join(' ')}` : ''
      const prefix = isError ? '[ERROR] ' : ''
      const message = `${timestamp} ${prefix}${name}: ${durationMs}ms${attrs}`

      if (isError) {
        consola.error(message)
      }
      else {
        consola.info(message)
      }
    }

    resultCallback({ code: ExportResultCode.SUCCESS })
  }

  shutdown(): Promise<void> {
    return Promise.resolve()
  }

  forceFlush(): Promise<void> {
    return Promise.resolve()
  }
}

const provider = createGoogleGenerativeAI({ apiKey: Redacted.value(env.GOOGLE_API_KEY) })
export function getModel(key: ChatModelKey) {
  return import.meta.dev
    ? wrapLanguageModel({
        model: provider(key),
        middleware: devToolsMiddleware(),
      })
    : provider(key)
}

function toHttpError(error: AppError) {
  return Match.type<AppError>().pipe(
    Match.tag('ParseError', (error: ParseResult.ParseError) =>
      createError({
        statusCode: 422,
        statusMessage: 'Invalid request or response schema',
        data: {
          message: error.message,
          issue: error.issue,
        },
      })),

    Match.tag('UnknownException', error =>
      createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
        data: {
          message: error.message,
        },
      })),

    Match.tag('DbError', error =>
      createError({
        statusCode: error.statusCode,
        statusMessage: `DB ${error.action} failed: ${error.message}`,
        data: {
          action: error.action,
          message: error.message,
        },
      })),

    Match.tag('LlamaCppError', error =>
      createError({
        statusCode: error.statusCode,
        statusMessage: `Llama ${error.action} failed: ${error.message}`,
        data: {
          action: error.action,
          message: error.message,
        },
      })),

    Match.tag('NotFoundError', error =>
      createError({
        statusCode: error.statusCode,
        statusMessage: error.message,
        data: {
          id: error.id,
          message: error.message,
        },
      })),

    Match.tag('GenerateError', error =>
      createError({
        statusCode: error.statusCode,
        statusMessage: error.message,
        data: {
          action: error.action,
          message: error.message,
        },
      })),

    Match.tag('SessionError', error =>
      createError({
        statusCode: error.statusCode,
        statusMessage: error.message,
        data: {
          message: error.message,
        },
      })),

    Match.tag('TimeoutException', () =>
      createError({
        statusCode: 504,
        statusMessage: 'Gateway Timeout',
        data: {
          message: 'Request timed out',
        },
      })),

    Match.tag('RequestError', error =>
      createError({
        statusCode: error.statusCode,
        statusMessage: `Request ${error.action} failed`,
        data: {
          action: error.action,
          message: error.message,
        },
      })),

    Match.tag('DrizzleQueryError', error =>
      createError({
        statusCode: 500,
        statusMessage: 'Database query failed',
        data: {
          message: error.message,
          query: error.query,
        },
      })),

    Match.tag('SqlError', error =>
      createError({
        statusCode: 500,
        statusMessage: 'Database connection failed',
        data: {
          message: error.message,
        },
      })),

    Match.exhaustive,
  )(error)
}

const customLogger = Logger.make((options) => {
  const timestamp = new Date().toISOString()
  const level = options.logLevel.label
  const parts = [timestamp, options.message, '·']

  for (const entry of options.annotations) {
    const [key, value] = entry
    if (!key.startsWith('_') && key !== 'fiber_name' && key !== 'span_name') {
      const v = typeof value === 'string' ? value : JSON.stringify(value)
      parts.push(`${key}=${v}`)
    }
  }

  const message = parts.join(' ')

  switch (level) {
    case 'ALL':
    case 'TRACE':
      consola.trace(message)
      break
    case 'DEBUG':
      consola.debug(message)
      break
    case 'INFO':
      consola.info(message)
      break
    case 'WARN':
      consola.warn(message)
      break
    case 'ERROR':
      consola.error(message)
      break
    case 'FATAL':
      consola.fatal(message)
      break
    default:
      consola.log(message)
  }
})

const devTracingLayer = NodeSdk.layer(() => ({
  resource: { serviceName: 'jobby-dev' },
  spanProcessor: new SimpleSpanProcessor(new PrettySpanExporter()),
}))

// Shared runtime with logger, database, and tracing pre-configured
const appLayer = true || import.meta.dev
  ? Layer.mergeAll(
      Logger.replace(Logger.defaultLogger, customLogger),
      devTracingLayer,
      DbLive,
    )
  : Layer.merge(
      Logger.replace(Logger.defaultLogger, customLogger),
      DbLive,
    )

const runtime = ManagedRuntime.make(appLayer)

function handleExit<A>(exit: Exit.Exit<A, AppError>, event?: H3Event): A {
  if (Exit.isSuccess(exit)) {
    return exit.value
  }

  const method = event?.node.req.method ?? 'UNKNOWN'
  const url = event?.node.req.url ?? 'UNKNOWN'
  const failureEither = Cause.failureOrCause(exit.cause)

  // Defect (unexpected error / bug)
  if (failureEither._tag === 'Right') {
    const defect = Cause.pretty(exit.cause)
    consola.error(`[${method}] ${url} :: Defect\n${defect}`)

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
    })
  }

  // Expected failure
  const error = failureEither.left

  // Format cause for logging
  const causeStr = error.cause
    ? (error.cause instanceof Error ? error.cause.message : JSON.stringify(error.cause))
    : ''

  // Log expected failures too
  consola.error(`[${method}] ${url} :: ${error._tag}`, error.message, causeStr)

  if (!event) {
    throw new Error(error.message || 'Effect failure')
  }

  throw toHttpError(error)
}

export async function runEffect<A>(
  program: Effect.Effect<A, AppError, Database>,
  event?: H3Event,
) {
  const method = event?.node.req.method ?? 'UNKNOWN'
  const url = event?.node.req.url ?? 'UNKNOWN'

  const instrumented = program.pipe(
    Effect.withSpan(`${method} ${url}`, { attributes: { method, url } }),
  )

  const exit = await runtime.runPromiseExit(instrumented)
  return handleExit(exit, event)
}

export const readEffectBody = Effect.fn('Utils.readEffectBody')(function* <A, I = unknown>(
  event: H3Event,
  schema: S.Schema<A, I, never>,
) {
  const body = yield* Effect.tryPromise({
    try: () => readBody(event),
    catch: cause => new RequestError({
      action: 'readBody',
      message: 'Failed to read request body',
      cause,
    }),
  })
  return yield* S.decodeUnknown(schema)(body)
})

export const readEffectParams = Effect.fn('Utils.readEffectParams')(function* <A, I = unknown>(
  event: H3Event,
  schema: S.Schema<A, I, never>,
) {
  const params = yield* Effect.sync(() => getRouterParams(event))
  return yield* S.decodeUnknown(schema)(params)
})

const DocumentsSchema = S.Array(S.Struct({
  filename: S.String,
  type: S.String,
  data: S.instanceOf(Buffer),
}).pipe(
  S.filter((file) => {
    const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB

    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        message: `File type "${file.type}" is not allowed. Allowed types: PDF, plain text, and images (JPEG, PNG, GIF, WebP)`,
        path: ['type'],
      }
    }

    if (file.data.length > MAX_SIZE) {
      return {
        message: `File "${file.filename}" exceeds maximum size of 5MB (${(file.data.length / 1024 / 1024).toFixed(2)}MB)`,
        path: ['data'],
      }
    }

    return true
  }),
))

export const readEffectFiles = Effect.fn('Utils.readEffectFiles')(function* (
  event: H3Event,
) {
  const files = yield* Effect.tryPromise({
    try: () => readMultipartFormData(event),
    catch: cause => new RequestError({
      action: 'readFiles',
      message: 'Failed to read multipart form data',
      cause,
    }),
  })
  return yield* S.decodeUnknown(DocumentsSchema)(files)
})
