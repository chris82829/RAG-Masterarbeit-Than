import type { ChatUIMessage, Job, Thread, UploadedDocument } from '#shared/types'
import { THREAD_ID_COOKIE } from '#shared/constants'
import { stringify } from '#shared/utils'
import { Chat } from '@ai-sdk/vue'
import { DefaultChatTransport } from 'ai'

export function useChat(
  threads: Ref<Thread[]>,
  key = 'threads',
) {
  const threadId = useCookie(THREAD_ID_COOKIE, { default: () => '' })
  const thread = shallowRef((() => {
    const first = threads.value[0]!
    if (!threadId.value)
      return first

    const found = threads.value.find(t => t.id === threadId.value)
    if (!found)
      return first

    return found
  })())

  const chat = shallowRef(createChat(thread.value))
  const suggestions = shallowRef<readonly string[]>([])

  function createChat(thread: Thread) {
    const chat = new Chat<ChatUIMessage>({
      messages: thread.messages as any,
      transport: new DefaultChatTransport({
        api: `/api/threads/${thread.id}`,
      }),
      onData(data) {
        if (data.type === 'data-suggestions') {
          suggestions.value = data.data.suggestions
        }
        else if (data.type === 'data-tool-denial') {
          const { messageId, toolCallId } = data.data
          const msg = chat.messages.find(m => m.id === messageId)
          if (msg) {
            for (const part of msg.parts) {
              if (
                typeof part === 'object'
                && part !== null
                && 'toolCallId' in part
                && part.toolCallId === toolCallId
              ) {
                ;(part as { state: string }).state = 'output-denied'
                if ('approval' in part && part.approval) {
                  ;(part.approval as { approved?: boolean, reason?: string }).approved = false
                  ;(part.approval as { approved?: boolean, reason?: string }).reason = data.data.reason
                }
              }
            }
          }
        }
      },
    })

    return chat
  }

  async function createThread() {
    const t = await $fetch('/api/threads', {
      method: 'POST',
    })

    await refreshNuxtData(key)

    if (t)
      changeThread(t.id)
  }

  async function changeThread(id: string) {
    const t = threads.value.find(t => t.id === id)
    if (!t)
      return

    thread.value = t
    chat.value = createChat(t)
    threadId.value = id
    suggestions.value = []
  }

  async function removeThread(id: string) {
    await $fetch('/api/threads', {
      method: 'DELETE',
      body: { id },
    })

    await refreshNuxtData(key)

    if (thread.value.id === id && threads.value[0]) {
      changeThread(threads.value[0].id)
    }
  }

  return { chat, suggestions, thread, createThread, removeThread, changeThread }
}

export function useCopy() {
  const clipboard = useClipboard()
  const copied = shallowRef(false)

  function copy(text: string) {
    clipboard.copy(text)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }

  return { copied, copy }
}

export function useUpload() {
  const { data } = useNuxtData<{ jobs: Job[] }>('get-jobs')
  const toast = useToast()

  const uploads = ref({
    jobs: [] as UploadedDocument[],
    files: [] as UploadedDocument[],
  })

  const isUploading = shallowRef(false)

  const { open: uploadFile, onChange } = useFileDialog({
    accept: 'application/pdf,text/plain,image/*',
  })

  onChange((files) => {
    if (!files?.length || isUploading.value)
      return

    isUploading.value = true

    const formData = new FormData()
    Array.from(files).forEach((f) => {
      formData.append('files', f)
    })

    $fetch<UploadedDocument[]>('/api/documents', {
      method: 'POST',
      body: formData,
    })
      .then((uploaded) => {
        uploads.value.files.push(...(uploaded || []))
        toast.add({
          title: 'Files uploaded',
          description: `${uploaded?.length || 0} file(s) added successfully`,
        })
      })
      .catch((error) => {
        const message = error?.data?.message || 'Failed to upload files'
        toast.add({
          title: 'Upload failed',
          description: message,
          color: 'error',
        })
        console.error('Document upload error:', error)
      })
      .finally(() => {
        isUploading.value = false
      })
  })

  const uploadJob = (id: string | undefined) => {
    if (!id || isUploading.value)
      return

    const job = data.value?.jobs.find(j => j.id === id)
    if (!job)
      return

    if (uploads.value.jobs.find(j => j.metadata?.job_id === id))
      return

    isUploading.value = true

    // @ts-expect-error TODO: fix types
    job.intro_title = job.intro_title ?? ''
    // @ts-expect-error TODO: fix types
    job.intro_text = job.intro_text ?? ''
    // @ts-expect-error TODO: fix types
    job.task_title = job.task_title ?? ''
    // @ts-expect-error TODO: fix types
    job.task_text = job.task_text ?? ''
    // @ts-expect-error TODO: fix types
    job.expectation_title = job.expectation_title ?? ''
    // @ts-expect-error TODO: fix types
    job.expectation_text = job.expectation_text ?? ''
    // @ts-expect-error TODO: fix types
    job.offer_title = job.offer_title ?? ''
    // @ts-expect-error TODO: fix types
    job.offer_text = job.offer_text ?? ''
    // @ts-expect-error TODO: fix types
    job.contact_title = job.contact_title ?? ''
    // @ts-expect-error TODO: fix types
    job.contact_text = job.contact_text ?? ''

    const formData = new FormData()
    const f = new File([stringify(job)], job.title, { type: 'text/plain' })
    formData.append('files', f)

    $fetch<UploadedDocument[]>('/api/documents', {
      method: 'POST',
      body: formData,
    })
      .then((uploaded) => {
        const _uploaded = (uploaded || []).map(u => ({
          ...u,
          metadata: {
            title: job.title,
            job_id: job.id,
          },
        }))
        uploads.value.jobs.push(..._uploaded)
        toast.add({
          title: 'Job added',
          description: `${job.title} added to chat`,
        })
      })
      .catch((error) => {
        const message = error?.data?.message || 'Failed to add job'
        toast.add({
          title: 'Failed to add job',
          description: message,
          color: 'error',
        })
        console.error('Job upload error:', error)
      })
      .finally(() => {
        isUploading.value = false
      })
  }

  const removeJob = (id: string) => {
    uploads.value.jobs = uploads.value.jobs.filter(j => j.id !== id)
  }

  const removeFile = (id: string) => {
    uploads.value.files = uploads.value.files.filter(d => d.id !== id)
  }

  return { uploads, uploadJob, removeJob, removeFile, uploadFile, isUploading }
}
