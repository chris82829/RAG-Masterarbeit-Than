<script setup lang="ts">
import type { Thread } from '#shared/types'
import type { FileUIPart } from 'ai'
import { BASE_MODEL, MODELS } from '#shared/constants'
import { getTextFromUIMessage } from '#shared/utils'
import { watchThrottled } from '@vueuse/core'
import { Presence } from 'reka-ui'

const store = useGlobalStore()

// Autoscroll
const container = useTemplateRef('container')
const {
  showAutoScroll,
  userScrolledUp,
  registerMessageRef,
  scrollToMessage,
  scrollToBottom,
  onAutoScrollClick,
} = useScroll(container)

const { data: threads } = await useFetch<Thread[]>(
  '/api/threads',
  { key: 'threads' },
)

if (!threads.value || !threads.value?.length) {
  window?.location.reload()
  throw createError({
    statusCode: 404,
    statusMessage: 'Failed to get threads.',
  })
}

const { chat, suggestions, thread, changeThread, createThread, removeThread } = useChat(
  threads as Ref<Thread[]>,
  'threads',
)

const { uploads, removeJob, removeFile, uploadFile, uploadJob } = useUpload()
store.onAskJobby(uploadJob)

const { copied, copy } = useCopy()

watchThrottled([() => chat.value.messages, () => chat.value.status], ([_, status]) => {
  if (status !== 'streaming' || !container.value || userScrolledUp.value)
    return

  const { scrollHeight, scrollTop, clientHeight } = container.value
  if ((scrollHeight - scrollTop - clientHeight) < 150) {
    scrollToBottom(false)
  }
}, { deep: true, throttle: 50, leading: true })

watch(() => chat.value.status, (status) => {
  if (status !== 'submitted')
    return

  const lastMessage = chat.value.messages[chat.value.messages.length - 1]
  if (!lastMessage || lastMessage.role !== 'user')
    return

  userScrolledUp.value = false
  nextTick(() => {
    scrollToMessage(lastMessage.id)
  })
})

const input = shallowRef('')
async function sendInput() {
  if (!input.value)
    return

  const message: Parameters<typeof chat.value.sendMessage>[0] = {
    text: input.value,
  }

  const files: FileUIPart[] = []

  if (uploads.value.jobs.length) {
    const _files = uploads.value.jobs.map(({ metadata, id, ...rest }) => ({ ...rest, type: 'file' as const }))
    files.push(..._files)

    message.metadata ??= {}
    message.metadata.uploaded_jobs = uploads.value.jobs.map(({ url, ...rest }) => ({ ...rest }))
  }

  if (uploads.value.files.length) {
    const _files = uploads.value.files.map(({ metadata, id, ...rest }) => ({ ...rest, type: 'file' as const }))
    files.push(..._files)

    message.metadata ??= {}
    message.metadata.uploaded_documents = uploads.value.files.map(({ url, ...rest }) => ({ ...rest }))
  }

  message.files = files
  chat.value.sendMessage(message)

  uploads.value = { files: [], jobs: [] }
  input.value = ''
  suggestions.value = []
}

function regenerate(id?: string) {
  suggestions.value = []
  chat.value.regenerate(id ? { messageId: id } : undefined)
}
</script>

<template>
  <Panel>
    <PanelHeader class="gap-2">
      <UIcon name="i-lucide-bot" class="size-5" />
      <p class="font-semibold text-highlighted truncate">
        AI Assistant
      </p>

      <AppChatHeaderMenu
        v-if="threads"
        :threads="threads"
        :thread="thread"
        class="ml-auto"
        @create="createThread"
        @change="changeThread"
        @remove="removeThread"
      />
    </PanelHeader>

    <div
      ref="container"
      class="flex flex-col gap-4 flex-1 overflow-y-auto p-4"
    >
      <div
        v-if="chat"
        :key="chat.id"
        class="grid gap-4 pb-20"
      >
        <template v-if="chat.messages.length">
          <template
            v-for="message in chat.messages"
            :key="message.id"
          >
            <template v-if="message.role === 'user'">
              <div :ref="(el) => registerMessageRef(message.id, el)" class="group grid gap-2">
                <ul
                  v-if="message.metadata?.uploaded_jobs"
                  class="w-fit ms-auto bg-elevated px-3 py-1.5 rounded-md grid gap-2 text-sm"
                >
                  <li
                    v-for="job of message.metadata.uploaded_jobs"
                    :key="job.id"
                  >
                    <NuxtLink
                      class="flex gap-1 items-center text-muted"
                      :to="`/jobs/${job?.metadata?.job_id}`"
                      active-class="text-primary"
                    >
                      <UIcon name="i-lucide-info" />
                      <span class="line-clamp-1">{{ job?.metadata?.title }}</span>
                    </NuxtLink>
                  </li>
                </ul>

                <ul
                  v-if="message.metadata?.uploaded_documents"
                  class="w-fit ms-auto bg-elevated px-3 py-1.5 rounded-md grid gap-2 text-sm"
                >
                  <li
                    v-for="file of message.metadata.uploaded_documents"
                    :key="file.id"
                    class="flex gap-2 items-center"
                  >
                    <UIcon v-if="file.mediaType.startsWith('image')" name="i-lucide-image" class="size-4 text-muted" />
                    <UIcon v-else name="i-lucide-file" class="size-4 text-muted" />

                    <span class="line-clamp-1">{{ file.filename }}</span>
                  </li>
                </ul>

                <div
                  v-for="part in message.parts"
                  :key="`${message.id}-${message.role}-${part.type}`"
                  class="grid gap-2"
                >
                  <template v-if="part.type === 'step-start'" />

                  <template v-else-if="part.type === 'text'">
                    <div class="text-pretty min-w-0 bg-default dark:bg-elevated/50 px-3 py-1.5 rounded-md w-fit ms-auto border border-default">
                      {{ part.text }}
                    </div>
                  </template>
                </div>

                <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center w-fit ms-auto">
                  <div class="flex item-center gap-2">
                    <UTooltip text="Regenerate">
                      <UButton
                        icon="i-lucide-refresh-ccw"
                        square
                        variant="ghost"
                        color="neutral"
                        size="sm"
                        @click="regenerate(message.id)"
                      />
                    </UTooltip>

                    <UTooltip text="Copy">
                      <UButton
                        :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                        square
                        variant="ghost"
                        color="neutral"
                        size="sm"
                        @click="copy(getTextFromUIMessage(message))"
                      />
                    </UTooltip>
                  </div>
                </div>
              </div>
            </template>

            <template v-if="message.role === 'assistant'">
              <div :ref="(el) => registerMessageRef(message.id, el)" class="group grid gap-2">
                <div
                  v-for="(part, index) in message.parts"
                  :key="`${message.id}-${part.type}-${index}${'state' in part ? `-${part.state}` : ''}`"
                  class="grid gap-2"
                >
                  <template v-if="part.type === 'step-start'" />

                  <MDCCached
                    v-else-if="part.type === 'text'"
                    :value="part.text"
                    :parser-options="{ highlight: false }"
                    :cache-key="`${message.id}-${index}`"
                    class="text-pretty min-w-0 *:first:mt-0 *:last:mb-0"
                  />

                  <ToolGetJobs
                    v-else-if="part.type === 'tool-get_jobs'"
                    :part="part"
                    @approve="async (args) => {
                      await chat.addToolApprovalResponse({
                        id: part.approval!.id,
                        approved: true,
                        reason: 'User has approved.',
                      })
                      if (chat.lastMessage?.parts){
                        chat.lastMessage.parts = chat.lastMessage.parts.map(p => {
                          if (p.type !== 'tool-get_jobs') return p

                          if (p.state === 'approval-responded' || p.state === 'input-available'){
                            p.input = args
                          }

                          return p
                        })
                      }
                      chat.sendMessage()
                    }"
                    @deny="() => {
                      chat.addToolApprovalResponse({
                        id: part.approval!.id,
                        approved: false,
                        reason: 'User has denied.',
                      })
                      chat.sendMessage()
                    }"
                    @regenerate="regenerate(message.id)"
                  />

                  <ToolGetMemories
                    v-else-if="part.type === 'tool-get_memories'"
                    :part="part"
                    @regenerate="regenerate(message.id)"
                  />

                  <ToolSaveMemories
                    v-else-if="part.type === 'tool-save_memories'"
                    :part="part"
                    @regenerate="regenerate(message.id)"
                  />

                  <ToolGetFavorites
                    v-else-if="part.type === 'tool-get_favorites'"
                    :part="part"
                    @regenerate="regenerate(message.id)"
                  />
                </div>

                <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4">
                  <div class="flex item-center gap-2">
                    <UTooltip text="Copy">
                      <UButton
                        :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                        square
                        variant="ghost"
                        color="neutral"
                        size="sm"
                        @click="copy(getTextFromUIMessage(message))"
                      />
                    </UTooltip>

                    <UTooltip text="Regenerate">
                      <UButton
                        icon="i-lucide-refresh-ccw"
                        square
                        variant="ghost"
                        color="neutral"
                        size="sm"
                        @click="regenerate(message.id)"
                      />
                    </UTooltip>
                  </div>

                  <div
                    v-if="message.metadata?.stats"
                    class="flex items-center gap-3 text-xs text-dimmed"
                  >
                    <span
                      v-if="message.metadata?.stats?.model"
                      class="font-medium"
                    >
                      {{ message.metadata?.stats?.model }}
                    </span>

                    <span
                      v-if="message.metadata?.stats?.duration"
                      class="flex items-center gap-1"
                    >
                      <UIcon name="i-lucide-zap" class="size-3" />
                      {{ message.metadata?.stats?.duration }} sec
                    </span>
                  </div>
                </div>
              </div>
            </template>
          </template>

          <div
            v-if="chat.status === 'submitted' || chat.status === 'streaming'"
            class="flex items-center gap-2 text-dimmed"
          >
            <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
            <span class="font-medium text-sm">Thinking...</span>
          </div>

          <div
            v-if="chat.error"
            class="flex justify-between items-center p-4 border border-error/20 rounded-md bg-error/10 text-error"
          >
            <div>
              <span class="font-medium mr-1">Error:</span>
              <span>{{ chat.error.message }}</span>
            </div>

            <UButton
              variant="subtle"
              color="neutral"
              class="w-fit shrink-0"
              @click="chat.regenerate()"
            >
              Try again
            </UButton>
          </div>

          <DevOnly>
            <ClientOnly>
              <div class="h-px bg-accented mt-16" />

              <MDC
                class="[&_pre]:text-xs"
                :value="`<details><summary>Debug Messages</summary>\n\n\`\`\`json\n${JSON.stringify(chat.messages, null, 2)}\n\`\`\`\n</details>`"
              />
            </ClientOnly>
          </DevOnly>
        </template>

        <template v-else>
          <AppChatPlaceholder />
        </template>
      </div>
    </div>

    <Presence :present="showAutoScroll">
      <div class="absolute bottom-50 left-1/2 -translate-x-1/2">
        <UButton
          icon="i-lucide-arrow-down"
          color="neutral"
          variant="outline"
          @click="onAutoScrollClick"
        />
      </div>
    </Presence>

    <div class="p-4 w-full grid gap-2">
      <Transition
        enter-active-class="transition-[translate,opacity,scale] duration-300 ease-out"
        leave-active-class="transition-[translate,opacity,scale] duration-200 ease-in"
        enter-from-class="opacity-0 translate-y-2 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 -translate-y-1 scale-95"
      >
        <ul
          v-if="suggestions.length"
          class="flex flex-wrap gap-x-1 gap-y-1.5"
        >
          <li
            v-for="(suggestion, i) in suggestions"
            :key="i"
          >
            <UButton
              variant="outline"
              color="neutral"
              @click="input = suggestion; sendInput()"
            >
              {{ suggestion }}
            </UButton>
          </li>
        </ul>
      </Transition>

      <UChatPrompt
        v-model="input"
        :error="chat.error!"
        :status="chat.status"
        variant="subtle"
        :ui="{ root: 'backdrop-blur-none bg-muted!', body: uploads.jobs.length ? 'mt-2' : 'mt-0' }"
        :autoresize="!!store.layout[1]"
        :maxrows="10"
        :rows="2"
        @submit.prevent="sendInput"
      >
        <template #header>
          <ul
            v-if="uploads.jobs.length"
            class="flex flex-wrap gap-2"
          >
            <li
              v-for="job in uploads.jobs"
              :key="job.id"
              class="bg-default border border-muted px-2 py-1 rounded-md w-fit flex items-center gap-2"
            >
              <span class="line-clamp-1 text-default/80 text-sm select-none">{{ job?.metadata?.title }}</span>

              <UButton
                icon="i-lucide-x"
                size="xs"
                variant="ghost"
                color="error"
                @click="removeJob(job.id)"
              />
            </li>
          </ul>

          <ul
            v-if="uploads.files"
            class="flex flex-wrap gap-2"
          >
            <li
              v-for="file in uploads.files"
              :key="file.id"
              class="bg-default border border-muted px-2 py-1 rounded-md w-fit flex items-center gap-2"
            >
              <UIcon v-if="file.mediaType.startsWith('image')" name="i-lucide-image" class="size-4 text-muted" />
              <UIcon v-else name="i-lucide-file" class="size-4 text-muted" />

              <span class="line-clamp-1 text-default/80 text-sm select-none">{{ file.filename }}</span>

              <UButton
                icon="i-lucide-x"
                size="xs"
                variant="ghost"
                color="error"
                @click="removeFile(file.id)"
              />
            </li>
          </ul>
        </template>
        <template #footer>
          <div class="flex gap-1">
            <UButton
              icon="i-lucide-paperclip"
              color="neutral"
              size="sm"
              variant="ghost"
              class="hover:bg-default"
              @click="uploadFile()"
            >
              Upload
            </UButton>
          </div>

          <div class="flex items-center gap-2">
            <USelect
              :default-value="BASE_MODEL"
              :items="MODELS"
              label-key="name"
              value-key="key"
              variant="ghost"
              class="hover:bg-default focus:bg-default data-[state=open]:bg-default"
              :ui="{ content: 'min-w-fit' }"
            >
              <template #item-trailing="{ item }">
                <span class="text-xs text-muted">{{ item.company }}</span>
              </template>
            </USelect>

            <UChatPromptSubmit
              :status="chat.status"
              size="sm"
              @stop="chat.stop"
              @reload="regenerate()"
            />
          </div>
        </template>
      </UChatPrompt>
    </div>
  </Panel>
</template>
