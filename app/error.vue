<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps({
  error: Object as () => NuxtError,
})
</script>

<template>
  <UApp>
    <UError
      :error="props.error ?? { message: 'Unknown Error', statusCode: 500 }"
      :clear="{
        color: 'neutral',
        size: 'xl',
        icon: 'i-lucide-arrow-left',
        class: 'rounded-full',
      }"
    />
  </UApp>
</template>
