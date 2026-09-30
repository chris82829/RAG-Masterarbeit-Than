<script setup lang="ts">
const features = [
  {
    icon: 'i-lucide-search',
    title: 'Smart job search',
    description: 'Search jobs with natural language',
  },
  {
    icon: 'i-lucide-brain',
    title: 'Remember your preferences',
    description: 'I save your preferences for personalized results',
  },
  {
    icon: 'i-lucide-target',
    title: 'Get ranked matches',
    description: 'Jobs are scored and explained based on how well they fit you',
  },
]
</script>

<template>
  <div class="absolute w-full flex justify-center top-1/5">
    <div class="flex justify-center flex-col items-center gap-4 max-w-md pr-8">
      <div class="size-16 bg-primary/10 rounded-full flex-center">
        <UIcon name="i-lucide-bot" class="size-8 " />
      </div>

      <p class="text-2xl font-semibold text-success text-balance">
        Jobby - AI Job Search
      </p>

      <p class="text-muted text-balance text-center">
        Smart search with personalized recommendations and career guidance
      </p>

      <div class="grid gap-2 mt-8">
        <template
          v-for="f in features"
          :key="f.title"
        >
          <div class="flex items-center gap-4 p-4 rounded-md bg-accented/50">
            <UIcon :name="f.icon" class="size-5 shrink-0" />
            <div>
              <p class="font-medium text-sm">
                {{ f.title }}
              </p>
              <p class="text-xs text-dimmed text-balance">
                {{ f.description }}
              </p>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
