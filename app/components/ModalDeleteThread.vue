<script setup lang="ts">
const props = defineProps<{
  title: string
}>()
const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<template>
  <UModal title="Remove Thread">
    <template #body>
      <p>Are you sure you want to remove "{{ props.title }}"? This action cannot be undone.</p>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="emit('close')"
        >
          Cancel
        </UButton>

        <UButton
          color="error"
          @click="emit('confirm')"
        >
          Delete
        </UButton>
      </div>
    </template>

    <template #description>
      <span />
    </template>
  </UModal>
</template>
