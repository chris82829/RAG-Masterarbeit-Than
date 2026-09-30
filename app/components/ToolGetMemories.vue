<script setup lang="ts">
import type { ChatToolSet } from '#shared/types'
import type { ToolUIPart } from 'ai'
import { toLocalDate } from '#shared/utils'

type Part = Extract<ToolUIPart<ChatToolSet>, { type: 'tool-get_memories' }>

const props = defineProps<{
  part: Part
}>()

const emit = defineEmits<{
  regenerate: []
}>()

watch(() => props.part.output?.memories.length, (v) => {
  if (v)
    refreshNuxtData('get-memories')
}, { once: true })
</script>

<template>
  <template v-if="props.part.state === 'input-streaming' || props.part.state === 'input-available'">
    <ul class="grid gap-4">
      <li class="flex items-center gap-1 text-dimmed">
        <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
        <span class="font-medium text-sm">Searching memories... </span>
      </li>
    </ul>
  </template>

  <template v-else-if="props.part.state === 'output-available'">
    <UCollapsible class="flex flex-col gap-2">
      <UButton
        class="group px-0 text-muted"
        :label="`Found ${props.part.output?.memories.length} ${(props.part.output?.memories.length ?? 0) > 1 ? 'memories' : 'memory'}.`"
        color="neutral"
        variant="link"
        block
        leading-icon="i-lucide-brain"
        trailing-icon="i-lucide-chevron-down"
        :disabled="!props.part.output?.memories.length"
        :ui="{
          leadingIcon: 'size-4',
          trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
        }"
      />

      <template #content>
        <ul
          v-if="props.part.output?.memories.length"
          class="grid gap-2 border border-accented px-2.5 py-1 rounded-md"
        >
          <li
            v-for="(m, i) in props.part.output.memories"
            :key="i"
          >
            <div class="grid gap-1">
              <div class="flex items-center gap-2">
                <UBadge
                  size="sm"
                  color="neutral"
                  variant="subtle"
                  class="w-fit"
                >
                  {{ m.type }}
                </UBadge>

                <span>·</span>

                <span class="text-xs">{{ toLocalDate(m.created_at) }}</span>
              </div>
              <span class="text-default text-sm">{{ m.content }}</span>
            </div>
          </li>
        </ul>
      </template>
    </UCollapsible>
  </template>

  <template v-else>
    <div class="flex justify-between items-center p-4 border border-error/20 rounded-md bg-error/10 text-error">
      <div>
        <span class="font-medium mr-1">Error:</span>
        <span>{{ props.part.errorText }}</span>
      </div>

      <UButton
        variant="subtle"
        color="neutral"
        class="w-fit shrink-0"
        @click="emit('regenerate')"
      >
        Try again
      </UButton>
    </div>
  </template>
</template>
