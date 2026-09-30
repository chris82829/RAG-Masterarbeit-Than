import type { getTools } from '#server/lib/ai/tools'
import type { tables } from '#server/lib/db/query'
import type { FiltersSchema, GetJobsOutputSchema, JobChunkSchema, JobSchema, MemorySchema, UserSchema } from '#shared/schema'
import type { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { InferUITools, LanguageModelUsage, UIMessage, UIMessagePart, UIMessageStreamWriter } from 'ai'

export type Defined<T> = {
  [K in keyof T]-?: NonNullable<T[K]>;
}

export type Job = typeof JobSchema.Type
export type Chunk = typeof JobChunkSchema.Type
export type JobWithChunks = Job & { chunks: Chunk[] }
export type SimplifiedChunk = Omit<Chunk, 'embedding'> & { score: number }
export type Memory = typeof MemorySchema.Type
export type SimplifiedMemory = Omit<Memory, 'embedding'>

export interface Reference {
  job_id: string
  score: number
  chunks: SimplifiedChunk[]
}

export type GetJobsToolOutputJobLabel = typeof GetJobsOutputSchema.Type['jobs'][number]['label']

export type ChatModelKey = Parameters<ReturnType<typeof createGoogleGenerativeAI>>[0]
export interface ChatModel { key: ChatModelKey, name: string, company: string }

export interface ChatConfig { model: ChatModelKey, filters: Filters }

export interface ChatMetadata {
  stats?: {
    model?: string | undefined
    duration?: number | undefined
    totalUsage?: LanguageModelUsage | undefined
  } | undefined
  uploaded_jobs?: Omit<UploadedDocument, 'url'>[] | undefined
  uploaded_documents?: Omit<UploadedDocument, 'url'>[] | undefined
}

// eslint-disable-next-line ts/consistent-type-definitions
export type ChatDataPart = {
  'suggestions': {
    suggestions: readonly string[]
  }
  'tool-denial': {
    messageId: string
    toolCallId: string
    reason: string
  }
}

export type ChatTools = ReturnType<typeof getTools>
export type ChatToolKeys = keyof ChatTools
export type ChatToolSet = InferUITools<{ [K in ChatToolKeys]: NonNullable<ChatTools[K]>; }>
export type ChatUIMessagePart = UIMessagePart<ChatDataPart, never>
export type ChatUIMessage = UIMessage<ChatMetadata, ChatDataPart, ChatToolSet>
export type ChatWriter = UIMessageStreamWriter<ChatUIMessage>

export type Thread = typeof tables.threads.$inferSelect & {
  messages: typeof tables.messages.$inferSelect[]
}

export type Filters = typeof FiltersSchema.Type

export type User = typeof UserSchema.Type
export interface Session { id: string, user: User | undefined }

export interface ToolboxPayload {
  writer: ChatWriter
  userId: string
}

export interface UploadedDocument {
  id: string
  mediaType: string
  filename: string
  url: string
  metadata?: Record<string, string>
}
