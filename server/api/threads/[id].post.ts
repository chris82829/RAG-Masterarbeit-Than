import type { ChatUIMessage } from '#shared/types'
import type { TextStreamPart, ToolSet, UIMessageStreamWriter } from 'ai'
import { getTools } from '#server/lib/ai/tools'
import { getMemoriesByUserInput, getThreadByUserId, saveMemoriesByModelMessages, saveMessages, setThreadTitle } from '#server/lib/db/query'
import { generateSuggestions, generateTitle } from '#server/lib/effect/generation'
import { requireUserSession } from '#server/lib/effect/session'
import { getModel, readEffectBody, readEffectParams, runEffect } from '#server/lib/effect/utils'
import { getChatConfig, stringifyMemories } from '#server/utils/chat'
import { MAIN_AGENT_SYSTEM_PROMPT } from '#server/utils/prompt'
import { getTextFromUIMessage, toLocalDate } from '#shared/utils'
import { convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse, generateId, smoothStream, stepCountIs, streamText } from 'ai'
import { Effect, Schema as S } from 'effect'

export default defineLazyEventHandler(() => {
  const ParamsSchema = S.Struct({
    id: S.Trim.pipe(S.minLength(1)),
  })

  const BodySchema = S.Struct({
    messages: S.mutable(S.NonEmptyArray(S.Unknown as S.Schema<ChatUIMessage>)),
  })

  return defineEventHandler(async event => await runEffect(Effect.gen(function* () {
    const session = yield* requireUserSession(event)
    const params = yield* readEffectParams(event, ParamsSchema)
    const body = yield* readEffectBody(event, BodySchema)
    const thread = yield* getThreadByUserId(session.user.id, params.id)

    if ((!thread.title || thread.title === 'Untitled')) {
      const text = getTextFromUIMessage(body.messages[0])
      runEffect(Effect.gen(function* () {
        const title = yield* generateTitle(text)
        yield* setThreadTitle(session.user.id, params.id, title)
      }), event)
    }

    const { model } = getChatConfig(event)
    const startTime = Date.now()

    // Collect stale approval requests to deny (not in last message)
    const toolDenials: { messageId: string, toolCallId: string, approvalId: string }[] = []
    const inputMessages = body.messages
    const lastIndex = inputMessages.length - 1
    for (let i = 0; i < lastIndex; i++) {
      const msg = inputMessages[i]
      if (!msg || msg.role !== 'assistant')
        continue

      for (const part of msg.parts) {
        if (
          typeof part === 'object'
          && part !== null
          && 'state' in part
          && part.state === 'approval-requested'
          && 'approval' in part
          && part.approval
          && typeof part.approval === 'object'
          && 'id' in part.approval
          && 'toolCallId' in part
        ) {
          toolDenials.push({
            messageId: msg.id,
            toolCallId: part.toolCallId as string,
            approvalId: part.approval.id as string,
          })
          // Mutate to denied state for convertToModelMessages
          ;(part as { state: string }).state = 'output-denied'
          ;(part as { approval: { id: string, approved?: boolean, reason?: string } }).approval.approved = false
          ;(part as { approval: { id: string, approved?: boolean, reason?: string } }).approval.reason = 'Auto-denied: stale approval request'
        }
      }
    }

    const execute = async ({ writer}: { writer: UIMessageStreamWriter<ChatUIMessage> }) => {
      // Notify client about tool denials
      for (const denial of toolDenials) {
        writer.write({
          type: 'data-tool-denial',
          data: {
            messageId: denial.messageId,
            toolCallId: denial.toolCallId,
            reason: 'Auto-denied: stale approval request',
          },
          transient: true,
        })
      }
      try {
        // Retrieve relevant memories for context
        const lastUserMessage = [...body.messages].findLast(m => m.role === 'user')
        const userText = lastUserMessage ? getTextFromUIMessage(lastUserMessage) : ''
        let memoriesContext = ''
        try {
          const memories = await runEffect(getMemoriesByUserInput(session.user.id, userText, 3), event)
          memoriesContext = stringifyMemories(memories.slice(0, 5))
        }
        catch {
          // Continue without memories on failure
        }

        const system = MAIN_AGENT_SYSTEM_PROMPT
          .replace('{current_date}', toLocalDate(new Date()))
          .replace('{username}', session.user.username)
          .replace('{memories}', memoriesContext)

        const messages = await convertToModelMessages(body.messages)

        const result = streamText({
          model: getModel(model),
          system,
          messages,
          stopWhen: stepCountIs(5),
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: getTools({ writer, userId: session.user.id }),
        })

        result.consumeStream()

        writer.merge(result.toUIMessageStream<ChatUIMessage>({
          originalMessages: body.messages,
          messageMetadata: ({ part }) => messageMetadata(startTime, part),
          async onFinish({ responseMessage, messages, isAborted }) {
            if (isAborted)
              return

            const assistantText = getTextFromUIMessage(responseMessage)
            const userText = getTextFromUIMessage(messages.findLast(m => m.role === 'user'))
            const suggestions = await runEffect(generateSuggestions(assistantText, userText), event)
            if (suggestions.length > 0) {
              writer.write({
                type: 'data-suggestions',
                data: { suggestions },
                transient: true,
              })
            }

            // @ts-expect-error TODO
            runEffect(Effect.gen(function* () {
              yield* saveMessages(params.id, messages)
              yield* Effect.tryPromise(() => convertToModelMessages(messages.slice(-5))).pipe(
                Effect.flatMap(_messages => saveMemoriesByModelMessages(session.user.id, _messages)),
                Effect.catchAll(() => Effect.void),
              )
            }), event)
          },
        }))
      }
      catch (error) {
        console.error('[thread_id.post.ts/execute]', error)
        const id = generateId()
        writer.write({ type: 'text-start', id })
        writer.write({ type: 'text-delta', id, delta: 'An error occurred while processing your request.' })
        writer.write({ type: 'text-end', id })
      }
    }

    const stream = createUIMessageStream<ChatUIMessage>({
      originalMessages: body.messages,
      execute,
      onError(error) {
        console.error('[thread_id.post.ts/stream]', error)
        return 'Oops, an error occurred!'
      },
    })

    return createUIMessageStreamResponse({ stream })
  }), event),
  )
})

function messageMetadata(startTime: number, part: TextStreamPart<ToolSet>) {
  if (part.type === 'finish-step') {
    return {
      stats: {
        model: part.response.modelId,
      },
    }
  }

  if (part.type === 'finish') {
    return {
      stats: {
        totalUsage: part.totalUsage,
        duration: (Date.now() - startTime) / 1000,
      },
    }
  }
}
