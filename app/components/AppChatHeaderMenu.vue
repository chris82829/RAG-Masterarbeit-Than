<script setup lang="ts">
import type { Thread } from '#shared/types'
import { LazyModalDeleteThread } from '#components'

const props = defineProps<{
  threads: Thread[]
  thread: Thread
}>()

const emit = defineEmits<{
  create: []
  remove: [id: string]
  change: [id: string]
}>()

const overlay = useOverlay()

const modal = overlay.create(LazyModalDeleteThread)

const groups = computed(() => {
  const today = new Date().setHours(0, 0, 0, 0)
  const day = 1000 * 60 * 60 * 24

  const result = props.threads.reduce(
    (acc, cur) => {
      const date = new Date(cur.updated_at).setHours(0, 0, 0, 0)
      const diff = (today - date) / day

      if (diff <= 0)
        acc.today.threads.push(cur)

      else if (diff === 1)
        acc.yesterday.threads.push(cur)

      else
        acc.older.threads.push(cur)

      return acc
    },
    {
      today: { label: 'Today', threads: [] as Thread[] },
      yesterday: { label: 'Yesterday', threads: [] as Thread[] },
      older: { label: 'Older', threads: [] as Thread[] },
    },
  )

  for (const key in result) {
    result[key as keyof typeof result].threads.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
  }

  return result
})
</script>

<template>
  <div>
    <UPopover :content="{ align: 'end' }">
      <UButton
        icon="i-lucide-ellipsis"
        variant="ghost"
        color="neutral"
      />
      <template #content>
        <div class="grid gap-2 p-2 min-w-64">
          <UButton
            block
            class="justify-center h-10"
            variant="subtle"
            color="neutral"
            @click="emit('create')"
          >
            New Thread
          </UButton>

          <div class="bg-accented h-px w-full my-1" />

          <ul class="grid gap-4">
            <template
              v-for="g in groups"
              :key="g.label"
            >
              <li v-if="g.threads.length">
                <p class="ml-2 mb-2 text-primary text-xs font-semibold">
                  {{ g.label }}
                </p>

                <ul class="grid gap-1">
                  <li
                    v-for="t in g.threads"
                    :key="t.id"
                  >
                    <UButton
                      class="group justify-start"
                      :variant="props.thread.id === t.id ? 'soft' : 'ghost'"
                      block
                      color="neutral"
                      @click="emit('change', t.id)"
                    >
                      <span class="truncate max-w-48">{{ t.title }}</span>

                      <UButton
                        icon="i-lucide-x"
                        size="xs"
                        variant="ghost"
                        color="error"
                        class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                        @click.stop="modal.open({
                          title: t.title,
                          onConfirm(){
                            emit('remove', t.id)
                            modal.close()
                          },
                        })"
                      />
                    </UButton>
                  </li>
                </ul>
              </li>
            </template>
          </ul>
        </div>
      </template>
    </UPopover>
  </div>
</template>
