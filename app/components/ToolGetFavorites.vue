<script setup lang="ts">
import type { ChatToolSet } from '#shared/types'
import type { ToolUIPart } from 'ai'

type Part = Extract<ToolUIPart<ChatToolSet>, { type: 'tool-get_favorites' }>

const props = defineProps<{
  part: Part
}>()

const emit = defineEmits<{
  regenerate: []
}>()

const jobs = computed(() => props.part.output?.favorites.flatMap(f => f.job ? [f.job] : []))
</script>

<template>
  <template v-if="props.part.state === 'output-available'">
    <UCollapsible class="flex flex-col gap-2">
      <UButton
        class="group px-0 text-muted"
        :label="`Found ${jobs?.length} ${(jobs?.length ?? 0) > 1 ? 'jobs' : 'job'} favorite jobs.`"
        color="neutral"
        variant="link"
        block
        leading-icon="i-lucide-search"
        trailing-icon="i-lucide-chevron-down"
        :disabled="!jobs?.length"
        :ui="{
          leadingIcon: 'size-4',
          trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
        }"
      />

      <template #content>
        <ul class="grid gap-4 mt-1">
          <li
            v-for="job in jobs"
            :key="job.id"
          >
            <article class="grid gap-4 p-6 bg-default dark:bg-elevated/50 border border-accented rounded-md has-[.active-link]:border-primary has-[.active-link]:hover:translate-y-0 transition-[box-shadow,translate,border-color] hover:border-primary/80 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 will-change-transform">
              <div class="relative -ml-1">
                <div class="flex flex-wrap gap-2 mr-20">
                  <template v-if="job.categories">
                    <UBadge
                      v-for="(category, i) in job.categories"
                      :key="category"
                      :color="i === 0 ? 'primary' : 'neutral'"
                      variant="subtle"
                      class="line-clamp-1"
                    >
                      {{ category }}
                    </UBadge>
                  </template>
                </div>

                <div class="absolute top-0 right-0">
                  <JobActions :id="job.id" />
                </div>
              </div>

              <p class="font-semibold text-lg leading-tight">
                {{ job.title }}
              </p>

              <div class="grid gap-1.5 text-sm">
                <div class="flex gap-2">
                  <UIcon class="shrink-0 mt-0.5" name="i-lucide-building-2" />
                  <span class="text-muted">{{ job.company }}</span>
                </div>
                <div class="flex gap-2">
                  <UIcon class="shrink-0 mt-0.5" name="i-lucide-map-pin" />
                  <span class="text-muted">{{ job.location }}</span>
                </div>

                <div class="flex flex-wrap items-center gap-2 my-1">
                  <template v-if="job.types">
                    <UBadge
                      v-for="type in job.types"
                      :key="type"
                      color="neutral"
                      variant="subtle"
                      class="text-muted"
                    >
                      <UIcon name="i-lucide-briefcase-business" /> {{ type }}
                    </UBadge>
                  </template>

                  <UBadge
                    color="neutral"
                    variant="subtle"
                    class="text-muted"
                  >
                    <UIcon name="i-lucide-clock" />
                    <template v-if="job.worktime_min === job.worktime_max">
                      {{ job.worktime_max }}h/week
                    </template>
                    <template v-else>
                      {{ job.worktime_min }}-{{ job.worktime_max }}h/week
                    </template>
                  </UBadge>

                  <UBadge
                    v-if="job.homeoffice !== '0% Homeoffice'"
                    color="neutral"
                    variant="subtle"
                    class="text-muted"
                  >
                    <UIcon name="i-lucide-house" /> {{ job.homeoffice }}
                  </UBadge>
                </div>
              </div>
            </article>
          </li>
        </ul>
      </template>
    </UCollapsible>
  </template>

  <template v-else-if="props.part.state === 'output-error'">
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
