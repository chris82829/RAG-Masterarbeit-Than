<script setup lang="ts">
const props = defineProps<{
  page?: boolean
}>()

const store = useGlobalStore()
</script>

<template>
  <div class="h-16 shrink-0 flex items-center border-b border-default p-4">
    <template v-if="props.page">
      <UButton
        :icon="store.collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
        variant="ghost"
        color="neutral"
        @click="store.collapsed = !store.collapsed"
      />
      <span class="h-5 w-px bg-accented ml-2 mr-3" />
    </template>

    <slot />
  </div>
</template>
