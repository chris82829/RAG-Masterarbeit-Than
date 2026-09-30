<script setup lang="ts">
import type { GetJobsInputSchema } from '#shared/schema'
import type { ChatToolSet } from '#shared/types'
import type { ToolUIPart } from 'ai'

type Part = Extract<ToolUIPart<ChatToolSet>, { type: 'tool-get_jobs' }>
type Args = typeof GetJobsInputSchema.Type

const props = defineProps<{
  part: Part
}>()

const emit = defineEmits<{
  approve: [args: Args]
  deny: []
  regenerate: []
}>()

const args = ref<Args>({
  input: props.part.input?.input ?? '',
  limit: props.part.input?.limit ?? 5,
  excludes: (props.part.input?.excludes as string[]) ?? [],
  w_lexical: props.part.input?.w_lexical ?? 0.5,
})
</script>

<template>
  <div>
    <template v-if="part.state === 'approval-requested' || part.state === 'input-available'">
      <div class="grid gap-4 p-4 border border-accented rounded-md bg-default dark:bg-elevated/50">
        <div class="border-b border-accented pb-4">
          <p class="font-medium">
            Job Search Settings
          </p>
          <p class="text-sm text-muted">
            Configure your search preferences
          </p>
        </div>

        <div class="grid gap-6">
          <div class="flex items-start gap-2">
            <fieldset class="grow">
              <legend class="block font-medium text-sm mb-2">
                Search Query
              </legend>
              <UTextarea
                v-model="args.input"
                class="w-full min-w-64"
                autoresize
              />
            </fieldset>
          </div>

          <div class="grid grid-cols-2 gap-4 auto-cols-fr">
            <fieldset class="grow">
              <legend class="block font-medium text-sm mb-2">
                Must Exclude
              </legend>
              <UInputTags
                v-model="args.excludes"
                class="size-full"
                :ui="{ root: 'items-start' }"
              />
            </fieldset>

            <fieldset class="grow">
              <legend class="block font-medium text-sm mb-2">
                Max Results
              </legend>
              <UInputNumber
                v-model="args.limit"
                class="size-full"
                :min="1"
                :max="20"
              />
            </fieldset>
          </div>

          <div class="flex gap-2">
            <fieldset class="grow">
              <legend class="block font-medium text-sm mb-2">
                Search Focus
              </legend>
              <URadioGroup
                v-model="args.w_lexical"
                color="neutral"
                variant="table"
                orientation="horizontal"
                :ui="{ item: 'grow' }"
                size="sm"
                :items="[
                  { label: 'Exact words', value: 0.8 },
                  { label: 'Balanced', value: 0.5 },
                  { label: 'Similar ideas', value: 0.2 },
                ]"
              />
            </fieldset>

            <!-- <fieldset class="grow">
              <legend class="block font-medium text-sm mb-2">
                Limit Results
              </legend>
              <UInputNumber
                v-model="args.limit"
                class="w-full"
                :min="1"
                :max="20"
                :step="1"
              />
            </fieldset> -->
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-2">
          <UButton
            variant="ghost"
            color="error"
            loading-auto
            @click=" emit('deny')"
          >
            Cancel
          </UButton>
          <UButton
            variant="subtle"
            :loading="props.part.state === 'approval-responded'"
            @click="emit('approve', args)"
          >
            Confirm
          </UButton>
        </div>
      </div>
    </template>

    <template v-else-if="part.state === 'approval-responded'">
      <div class="grid gap-4">
        <UCollapsible class="flex flex-col gap-2">
          <UButton
            class="group px-0 text-muted"
            label="Finding jobs with your settings."
            color="neutral"
            variant="link"
            block
            leading-icon="i-lucide-search"
            loading
            trailing-icon="i-lucide-chevron-down"
            :ui="{
              leadingIcon: 'size-4',
              trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
            }"
          />

          <template #content>
            <div class="grid gap-2 border border-accented px-2.5 py-1 rounded-md">
              <div
                v-if="props.part.input?.input"
                class="grid grid-cols-5"
              >
                <span class="font-medium text-sm text-muted">Input:</span>
                <span class="col-span-4 text-sm"> {{ props.part.input.input }}</span>
              </div>

              <div
                v-if="props.part.input?.w_lexical"
                class="grid grid-cols-5"
              >
                <span class="font-medium text-sm text-muted">Search Focus:</span>
                <span class="col-span-4 text-sm">
                  {{ props.part.input.w_lexical < 0.3 ? 'Exact words' : props.part.input?.w_lexical > 0.7 ? 'Similar ideas' : 'Balanced' }}
                </span>
              </div>

              <div
                v-if="props.part.input?.limit"
                class="grid grid-cols-5"
              >
                <span class="font-medium text-sm text-muted">Limit:</span>
                <span class="col-span-4 text-sm"> {{ props.part.input.limit }}</span>
              </div>

              <div
                v-if="props.part.input?.excludes?.length"
                class="grid grid-cols-5 items-center"
              >
                <span class="font-medium text-sm text-muted">Excludes:</span>
                <ul class="col-span-4 flex items-center gap-1">
                  <li v-for="e in props.part.input.excludes" :key="e">
                    <UBadge variant="subtle" color="error" size="sm">
                      {{ e }}
                    </UBadge>
                  </li>
                </ul>
              </div>
            </div>
          </template>
        </UCollapsible>

        <ul class="grid gap-4">
          <li
            v-for="i in (props.part.input?.limit ?? 5)"
            :key="i"
          >
            <article class="grid gap-4 p-6 bg-elevated/50 dark:bg-elevated/50 rounded-md min-h-65">
              <div class="relative -ml-1">
                <USkeleton class="w-36 h-4 bg-accented/50" />

                <div class="absolute top-0 right-0">
                  <USkeleton class="w-28 h-4 bg-accented/50" />
                </div>
              </div>

              <USkeleton class="w-full h-4 bg-accented/50" />

              <div class="grid gap-2">
                <USkeleton class="w-1/3 h-4 bg-accented/50" />
                <USkeleton class="w-2/3 h-4 bg-accented/50" />
              </div>

              <div class="flex flex-wrap gap-2">
                <USkeleton class="w-1/2 h-4 bg-accented/50" />
                <USkeleton class="w-1/4 h-4 bg-accented/50" />
                <USkeleton class="w-1/5 h-4 bg-accented/50" />
              </div>

              <USkeleton class="w-full h-4 bg-accented/50" />
            </article>
          </li>
        </ul>
      </div>
    </template>

    <template v-else-if="part.state === 'output-available'">
      <div class="grid gap-4">
        <UCollapsible class="flex flex-col gap-2">
          <UButton
            class="group px-0 text-muted"
            :label="`Found ${props.part.output?.jobs?.length} ${(props.part.output?.jobs?.length ?? 0) > 1 ? 'jobs' : 'job'} with your settings.`"
            color="neutral"
            variant="link"
            block
            leading-icon="i-lucide-search"
            trailing-icon="i-lucide-chevron-down"
            :ui="{
              leadingIcon: 'size-4',
              trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
            }"
          />

          <template #content>
            <div class="grid gap-2 border border-accented px-2.5 py-1 rounded-md">
              <div
                v-if="props.part.input?.input"
                class="grid grid-cols-5"
              >
                <span class="font-medium text-sm text-muted">Input:</span>
                <span class="col-span-4 text-sm"> {{ props.part.input.input }}</span>
              </div>

              <div
                v-if="props.part.input?.w_lexical"
                class="grid grid-cols-5"
              >
                <span class="font-medium text-sm text-muted">Search Focus:</span>
                <span class="col-span-4 text-sm">
                  {{ props.part.input.w_lexical < 0.3 ? 'Exact words' : props.part.input?.w_lexical > 0.7 ? 'Similar ideas' : 'Balanced' }}
                </span>
              </div>

              <div
                v-if="props.part.input?.limit"
                class="grid grid-cols-5"
              >
                <span class="font-medium text-sm text-muted">Limit:</span>
                <span class="col-span-4 text-sm"> {{ props.part.input.limit }}</span>
              </div>

              <div
                v-if="props.part.input?.excludes?.length"
                class="grid grid-cols-5 items-center"
              >
                <span class="font-medium text-sm text-muted">Excludes:</span>
                <ul class="col-span-4 flex items-center gap-1">
                  <li v-for="e in props.part.input.excludes" :key="e">
                    <UBadge variant="subtle" color="error" size="sm">
                      {{ e }}
                    </UBadge>
                  </li>
                </ul>
              </div>
            </div>
          </template>
        </UCollapsible>

        <ul
          v-if="props.part.output?.jobs"
          class="grid gap-4"
        >
          <li
            v-for="job in props.part.output.jobs"
            :key="job.id"
          >
            <article class="grid gap-4 p-6 bg-default dark:bg-elevated/50 border border-accented rounded-md has-[.active-link]:border-primary has-[.active-link]:hover:translate-y-0 transition-[box-shadow,translate,border-color] hover:border-primary/80 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 will-change-transform">
              <div class="relative -ml-1">
                <UBadge
                  size="md"
                  variant="subtle"
                  :title="job.score"
                  :color="
                    job.label === 'Top Choice'
                      ? 'success'
                      : job.label === 'Strong Potential'
                        ? 'info' : job.label === 'Good Possibility'
                          ? 'warning'
                          : 'error'"
                >
                  {{ job.label }}
                </UBadge>

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

                <div class="flex items-center flex-wrap gap-2 my-1">
                  <template v-if="job.categories">
                    <UBadge
                      v-for="(category) in job.categories"
                      :key="category"
                      color="neutral"
                      variant="outline"
                      class="text-muted"
                    >
                      {{ category }}
                    </UBadge>
                  </template>

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
                    v-if="job.worktime_min || job.worktime_max"
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
                    color="neutral"
                    variant="subtle"
                    class="text-muted"
                  >
                    <UIcon name="i-lucide-house" /> {{ job.homeoffice }}
                  </UBadge>
                </div>
              </div>

              <UCollapsible class="flex flex-col gap-2">
                <UButton
                  class="group px-0 text-muted"
                  :label="`References (${job.chunks?.length})`"
                  color="neutral"
                  variant="link"
                  block
                  leading-icon="i-lucide-file-text"
                  trailing-icon="i-lucide-chevron-down"
                  :ui="{
                    leadingIcon: 'size-4',
                    trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200',
                  }"
                />

                <template #content>
                  <ul class="grid gap-2">
                    <li
                      v-for="c in job.chunks"
                      :key="c.id"
                      class="border border-default px-2.5 py-1.5 rounded-md bg-default"
                    >
                      <p class="text-xs text-pretty">
                        <span class="text-primary font-medium"> {{ Math.round(c.score * 100) }}%</span>
                        {{ c.content }}
                      </p>
                    </li>
                  </ul>
                </template>
              </UCollapsible>
            </article>
          </li>
        </ul>
      </div>
    </template>

    <template v-else-if="part.state === 'output-denied'">
      <p class="text-right text-muted italic">
        You have canceled the job search.
      </p>
    </template>

    <template v-else>
      <div class="flex justify-between items-center p-4 border border-error/20 rounded-md bg-error/10 text-error">
        <div>
          <span class="font-medium mr-1">Error:</span>
          <span v-if="part.state === 'output-error'">{{ props.part.errorText }}</span>
          <span v-else>Something wrong happened.</span>
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
  </div>
</template>
