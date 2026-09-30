<script setup lang="ts">
import type { Job } from '#shared/types'
import { toLocalDateTime } from '#shared/utils'

const store = useGlobalStore()

const { data, status, error, execute } = useAsyncData(
  () => JSON.stringify(store.filters),
  () => $fetch<{ jobs: Job[] }>('/api/jobs', { method: 'POST', body: { filters: store.filters } }),
  {
    lazy: true,
    immediate: true,
    getCachedData: (key, nuxt) => nuxt.payload.data[key],
  },
)

watch(() => store.filters, () => {
  execute()
}, { deep: true })

const size = 12
const page = shallowRef(1)
const jobs = computed(() => {
  if (!data.value?.jobs)
    return []

  const offset = (page.value - 1) * size
  return data.value.jobs.slice(offset, offset + size)
})
</script>

<template>
  <Panel>
    <PanelHeader page>
      <span>Open Jobs</span>
    </PanelHeader>

    <PanelBody class="p-0!">
      <Filters
        class="sticky top-0 left-0 bg-default z-1 p-4"
        :length="data?.jobs.length"
      />

      <div class="p-4 pt-0">
        <template v-if="status === 'pending' || status === 'idle'">
          <ul class="grid grid-cols-[repeat(auto-fit,minmax(500px,1fr))] auto-rows-fr gap-4">
            <li
              v-for="j in 12"
              :key="j"
            >
              <article class="grid gap-4 p-6 bg-elevated/50 dark:bg-elevated/50 rounded-md min-h-80">
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
        </template>

        <template v-else-if="status === 'success'">
          <div
            v-if="data?.jobs.length"
            class="grid gap-6"
          >
            <div class="grid grid-cols-[repeat(auto-fit,minmax(500px,1fr))] auto-rows-fr gap-4 pb-10">
              <article
                v-for="job in jobs"
                :key="job.id"
                class="group p-6 flex flex-col bg-default dark:bg-elevated/50 border border-accented rounded-md h-full transition-[box-shadow,translate,border-color] hover:border-primary/80 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 will-change-transform"
              >
                <div class="relative mb-4 -ml-1">
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

                <h2 class="font-semibold text-lg leading-tight line-clamp-2 text-balance h-[calc(1.125rem*var(--leading-tight)*2)] mb-4">
                  {{ job.title }}
                </h2>

                <div class="grid gap-1.5 text-sm mb-4">
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
                      v-if="job.homeoffice !== '0% Homeoffice'"
                      color="neutral"
                      variant="subtle"
                      class="text-muted"
                    >
                      <UIcon name="i-lucide-house" /> {{ job.homeoffice }}
                    </UBadge>
                  </div>
                </div>

                <MDCCached
                  v-if="job.short_description"
                  :value="job.short_description"
                  :cache-key="`${job.id}_short_description`"
                  class="text-sm text-muted line-clamp-2 mb-4"
                  :unwrap="true"
                  tag="p"
                />

                <div class="mt-auto border-t border-accented pt-4">
                  <div class="flex items-center gap-2 text-xs text-dimmed">
                    <UIcon name="i-lucide-calendar" /> Updated {{ toLocalDateTime(job.updated_at) }}
                  </div>
                </div>
              </article>
            </div>

            <div class="sticky -bottom-1 flex-center">
              <div class="ring ring-accented p-2 rounded-md bg-default">
                <UPagination
                  v-model:page="page"
                  :items-per-page="size"
                  :total="data?.jobs.length"
                  :sibling-count="1"
                  variant="ghost"
                  :show-controls="false"
                  show-edges
                  size="xs"
                />
              </div>
            </div>
          </div>

          <div
            v-else
            class="flex-center mt-10"
          >
            <UCard class="w-full max-w-100 text-center" :ui="{ body: 'flex-center flex-col gap-4' }">
              <div class="size-16 rounded-full bg-accented flex-center">
                <UIcon name="i-lucide-funnel" class="size-6" />
              </div>
              <p class="text-lg font-medium">
                No jobs match your filters
              </p>
              <p class="text-sm text-muted text-pretty">
                Try adjusting your search criteria or clearing some filters to see more results.
              </p>

              <UButton variant="subtle" @click="store.clearFilters">
                Clear filters
              </UButton>
            </UCard>
          </div>
        </template>

        <template v-else>
          <div class="flex-center mt-10">
            <UCard class="w-full max-w-100 text-center" :ui="{ body: 'flex-center flex-col gap-2' }">
              <div class="size-16 rounded-full bg-accented flex-center">
                <UIcon name="i-lucide-ban" class="size-6" />
              </div>
              <p class="text-lg font-medium">
                Error
              </p>
              <p class="text-sm text-muted text-pretty">
                {{ error }}
              </p>

              <UButton
                class="mt-2"
                variant="subtle"
                color="error"
                @click="reloadNuxtApp()"
              >
                Reload Page
              </UButton>
            </UCard>
          </div>
        </template>
      </div>
    </PanelBody>
  </Panel>
</template>
