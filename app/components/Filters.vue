<script setup lang="ts">
import type { Filters } from '#shared/types'
import { JOB_CATEGORIES, JOB_FIELDS, JOB_HOMEOFFICES, JOB_TYPES, JOB_WORKINGTIMES } from '#shared/constants'
import { DateFormatter, getLocalTimeZone, parseDate } from '@internationalized/date'

const props = defineProps<{
  length: number | undefined
}>()

const store = useGlobalStore()

const input = shallowRef('')

const filters = shallowRef<Filters>()
const status = shallowRef<'idle' | 'pending'>('idle')
async function send() {
  if (!input.value.trim())
    return

  status.value = 'pending'
  filters.value = await $fetch<Filters>('/api/filters', {
    method: 'POST',
    body: { input: input.value.trim() },
  })
  status.value = 'idle'
}

watch(filters, (v) => {
  if (!v)
    return

  store.filters = structuredClone(v)
})

function clear() {
  input.value = ''
  store.clearFilters()
}

const df = new DateFormatter('en-US', { dateStyle: 'medium' })

const startDate = computed({
  get: () => store.filters.start_date ? parseDate(store.filters.start_date) : undefined,
  set: (v) => { store.filters.start_date = v?.toString() },
})

const endDate = computed({
  get: () => store.filters.end_date ? parseDate(store.filters.end_date) : undefined,
  set: (v) => { store.filters.end_date = v?.toString() },
})
</script>

<template>
  <div
    v-if="store.filters"
    class="grid gap-4"
  >
    <div class="flex items-center gap-2">
      <UInput
        v-model="store.filters.search"
        leading-icon="i-lucide-search"
        placeholder="Search for title, company, location, keyword"
        class="w-full max-w-sm"
        variant="subtle"
      >
        <template
          v-if="store.filters.search.length"
          #trailing
        >
          <UButton
            color="neutral"
            variant="link"
            size="sm"
            icon="i-lucide-x"
            aria-label="Clear input"
            @click="store.filters.search = ''"
          />
        </template>
      </UInput>

      <UPopover
        :content="{ align: 'end' }"
      >
        <UButton
          label="Filter"
          color="neutral"
          variant="subtle"
          class="ml-auto"
          icon="i-lucide-funnel"
        />

        <template #content>
          <div class="px-4 pb-4 grid gap-4">
            <div class="-mx-4 px-4 flex justify-between gap-2 items-center border-b border-accented py-2">
              <p class="text-xs">
                Show <span class="text-success">{{ props.length }}</span> results
              </p>

              <UButton variant="ghost" size="xs" @click="clear">
                Clear
              </UButton>
            </div>

            <form class="border-b border-accented -mx-4 px-4 pb-6" @submit.prevent>
              <fieldset>
                <legend class="block font-medium text-sm mb-2 text-color">
                  Smart filters
                </legend>
                <UTextarea
                  v-model="input"
                  autoresize
                  class="w-full"
                  trailing-icon="i-lucide-sparkles"
                  :loading="status === 'pending'"
                  :ui="{ trailingIcon: 'size-4 mt-0.5 inline-block bg-color' }"
                  placeholder="Describe what you want to filter"
                  autofocus
                  :rows="1"
                  @keydown.enter.exact.prevent.stop="send"
                />
              </fieldset>
            </form>

            <UCheckboxGroup
              v-model="store.filters.types"
              size="lg"
              legend="Types"
              :items="JOB_TYPES as unknown as string[]"
              :ui="{ item: 'mb-1', legend: 'mb-2' }"
            />

            <fieldset>
              <legend class="block font-medium text-sm mb-2">
                Search
              </legend>
              <UInput
                v-model="store.filters.search"
                placeholder="Search for title, company, location, keyword"
                class="w-full max-w-sm"
              />
            </fieldset>

            <fieldset>
              <legend class="block font-medium text-sm mb-2">
                Location
              </legend>
              <UInputTags
                v-model="store.filters.locations"
                placeholder="City or region"
                class="w-full max-w-sm"
              />
            </fieldset>

            <fieldset>
              <legend class="block font-medium text-sm mb-2">
                Fields
              </legend>
              <USelectMenu
                v-model="store.filters.fields"
                placeholder="Select fields"
                class="w-80"
                multiple
                :items="JOB_FIELDS as unknown as string[]"
              />
            </fieldset>

            <fieldset>
              <legend class="block font-medium text-sm mb-2">
                Categories
              </legend>
              <USelectMenu
                v-model="store.filters.categories"
                placeholder="Select categories"
                class="w-80"
                multiple
                :items="JOB_CATEGORIES as unknown as string[]"
              />
            </fieldset>

            <UCheckboxGroup
              v-model="store.filters.homeoffices"
              size="lg"
              legend="Homeoffice"
              :items="JOB_HOMEOFFICES as unknown as string[]"
              :ui="{ item: 'mb-1', legend: 'mb-2' }"
            />

            <fieldset>
              <legend class="block font-medium text-sm mb-4">
                Working time
                <span class="text-dimmed">
                  ({{ store.filters.workingtimes?.[0] }}-{{ store.filters.workingtimes?.[1] }}h)
                </span>
              </legend>
              <USlider
                v-model="store.filters.workingtimes"
                :min="JOB_WORKINGTIMES.min"
                :max="JOB_WORKINGTIMES.max"
              />
            </fieldset>

            <div class="flex gap-2 *:grow *:w-full">
              <fieldset>
                <legend class="block font-medium text-sm mb-2">
                  Start date
                </legend>
                <UPopover>
                  <UButton
                    color="neutral"
                    variant="subtle"
                    icon="i-lucide-calendar"
                    block
                    class="justify-start"
                  >
                    {{ startDate ? df.format(startDate.toDate(getLocalTimeZone())) : 'Select date' }}
                  </UButton>
                  <template #content>
                    <UCalendar v-model="startDate" class="p-2" />
                  </template>
                </UPopover>
              </fieldset>

              <fieldset>
                <legend class="block font-medium text-sm mb-2">
                  End date
                </legend>
                <UPopover>
                  <UButton
                    color="neutral"
                    variant="subtle"
                    icon="i-lucide-calendar"
                    block
                    class="justify-start"
                  >
                    {{ endDate ? df.format(endDate.toDate(getLocalTimeZone())) : 'Select date' }}
                  </UButton>
                  <template #content>
                    <UCalendar v-model="endDate" class="p-2" />
                  </template>
                </UPopover>
              </fieldset>
            </div>
          </div>
        </template>
      </UPopover>
    </div>

    <div class="group flex items-start gap-2">
      <div class="group flex items-center flex-wrap gap-2 min-h-7">
        <UBadge
          v-if="store.filters.search"
          data-slot="badge"
          color="neutral"
          variant="subtle"
          size="lg"
        >
          Search: {{ store.filters.search }}
        </UBadge>

        <template
          v-for="[k, v] in Object.entries(store.filters)"
          :key="k"
        >
          <template v-if="k === 'search'" />

          <template v-else-if="k === 'locations'">
            <UBadge
              v-for="loc in (v as string[])"
              :key="loc"
              data-slot="badge"
              class="items-center"
              color="neutral"
              variant="subtle"
              size="lg"
            >
              Location: {{ loc }}
              <template #trailing>
                <button class="flex-center" @click="store.filters.locations = store.filters.locations.filter(l => l !== loc)">
                  <UIcon name="i-lucide-x" />
                </button>
              </template>
            </UBadge>
          </template>

          <template v-else-if="k === 'start_date'">
            <UBadge
              v-if="v"
              data-slot="badge"
              class="items-center"
              color="neutral"
              variant="subtle"
              size="lg"
            >
              From: {{ v }}
              <template #trailing>
                <button class="flex-center" @click="store.filters.start_date = undefined">
                  <UIcon name="i-lucide-x" />
                </button>
              </template>
            </UBadge>
          </template>

          <template v-else-if="k === 'end_date'">
            <UBadge
              v-if="v"
              data-slot="badge"
              class="items-center"
              color="neutral"
              variant="subtle"
              size="lg"
            >
              Until: {{ v }}
              <template #trailing>
                <button class="flex-center" @click="store.filters.end_date = undefined">
                  <UIcon name="i-lucide-x" />
                </button>
              </template>
            </UBadge>
          </template>

          <template v-else-if="k === 'workingtimes'">
            <UBadge
              v-if="v?.[0] !== JOB_WORKINGTIMES.min || v?.[1] !== JOB_WORKINGTIMES.max "
              data-slot="badge"
              class="items-center"
              color="neutral"
              variant="subtle"
              size="lg"
            >
              {{ `${v?.[0]} - ${v?.[1]}h` }}

              <template #trailing>
                <button
                  class="flex-center"
                  @click="store.filters.workingtimes = [
                    JOB_WORKINGTIMES.min,
                    JOB_WORKINGTIMES.max,
                  ]"
                >
                  <UIcon name="i-lucide-x" />
                </button>
              </template>
            </UBadge>
          </template>

          <template v-else>
            <UBadge
              v-for="x in v"
              :key="x"
              data-slot="badge"
              class="items-center"
              color="neutral"
              variant="subtle"
              size="lg"
            >
              {{ x }}

              <template #trailing>
                <button
                  class="flex-center"
                  @click="(store.filters as any)[k] = (store.filters as any)[k]?.filter((f: string | number) => f !== x)"
                >
                  <UIcon name="i-lucide-x" />
                </button>
              </template>
            </UBadge>
          </template>
        </template>

        <UButton
          size="sm"
          variant="ghost"
          class="hidden group-has-data-[slot=badge]:inline-flex"
          @click="store.clearFilters"
        >
          Clear all
        </UButton>
      </div>

      <span class="ml-auto my-0.5 text-sm text-muted text-nowrap">
        Show <span class="text-success">{{ props.length }}</span> results
      </span>
    </div>
  </div>
</template>
