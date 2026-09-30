<script setup lang="ts">
import type { Job } from '#shared/types'

const route = useRoute()

const { data: job } = await useFetch<Job>(`/api/jobs/${route.params.id}`, {
  cache: 'force-cache',
})

if (!job.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Job not found!',
    fatal: true,
  })
}

const { favorites, toggle, pending } = useFavorite()

const fields = computed(() => job.value?.fields

  .flatMap(f => f.split(',').map(f => f.trim()).filter(f => f && f !== 'Sonstige')))
</script>

<template>
  <Panel v-if="job">
    <PanelHeader page>
      <div class="flex items-center gap-2">
        <NuxtLink to="/" class="underline underline-offset-2">
          Open Jobs
        </NuxtLink>
        <UIcon name="i-lucide-chevron-right" class="size-4.5" />
        <span class="text-dimmed">{{ job.id }}</span>
      </div>
    </PanelHeader>

    <PanelBody>
      <div class="max-w-4xl mx-auto">
        <div class="flex justify-between">
          <div>
            <div class="flex flex-wrap gap-2 -ml-1 mb-2">
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

            <h2 class="font-semibold text-2xl leading-tight text-balance mb-4">
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
                  >
                    <UIcon name="i-lucide-briefcase-business" /> {{ type }}
                  </UBadge>
                </template>

                <UBadge
                  color="neutral"
                  variant="subtle"
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
                >
                  <UIcon name="i-lucide-house" /> {{ job.homeoffice }}
                </UBadge>
              </div>
            </div>
          </div>

          <div>
            <UButton
              icon="i-lucide-heart"
              :variant="favorites?.includes(job.id) ? 'subtle' : 'ghost'"
              size="sm"
              color="error"
              :loading="pending"
              @click="toggle(job.id, !!favorites?.includes(job.id))"
            >
              Favorite
            </UButton>
          </div>
        </div>

        <ul class="flex flex-wrap gap-x-2 gap-y-1">
          <li
            v-for="f in fields"
            :key="f"
          >
            <UBadge
              variant="outline"
              color="neutral"
            >
              {{ f }}
            </UBadge>
          </li>
        </ul>

        <div class="text-justify hyphens-auto">
          <template
            v-for="key in [
              'short_description',
              'intro_title',
              'intro_text',
              'task_title',
              'task_text',
              'expectation_title',
              'expectation_text',
              'offer_title',
              'offer_text',
              'contact_title',
              'contact_text',
            ] as const"
            :key="key"
          >
            <MDCCached
              v-if="job[key]"
              :value="job[key]"
              :cache-key="`${job.id}-${key}`"
              :class="{
                'text-primary font-semibold': key === 'intro_title' || key === 'task_title' || key === 'expectation_title' || key === 'contact_title',
              }"
            />
          </template>
        </div>
      </div>
    </PanelBody>
  </Panel>
</template>
