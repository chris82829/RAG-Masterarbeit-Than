<script setup lang="ts">
const props = defineProps<{
  id: string
}>()

const store = useGlobalStore()
const { favorites, toggle, pending } = useFavorite()
</script>

<template>
  <div class="flex items-center justify-end gap-1">
    <ClientOnly>
      <UTooltip :text="favorites?.includes(props.id) ? 'Remove from favorites' : 'Add to favorites'">
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-lucide-heart"
          class="text-dimmed hover:text-error transition-[color] data-[favorited=true]:text-error"
          :data-favorited="!!favorites?.includes(props.id)"
          :loading="pending"
          @click.prevent="toggle(props.id, !!favorites?.includes(props.id))"
        />
      </UTooltip>

      <UTooltip text="Ask Jobby">
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-lucide-message-square"
          class="text-dimmed hover:text-default transition-[color]"
          @click.prevent="store.triggerAskJobby(props.id)"
        />
      </UTooltip>

      <UTooltip text="View job details">
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          icon="i-lucide-external-link"
          class="text-dimmed hover:text-default transition-[color]"
          active-color="primary"
          active-class="active-link"
          :to="`/jobs/${props.id}`"
        />
      </UTooltip>

      <template #fallback>
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          loading
          class="min-w-20 justify-end text-dimmed"
        />
      </template>
    </ClientOnly>
  </div>
</template>
