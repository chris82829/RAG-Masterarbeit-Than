<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { Schema as S } from 'effect'

const open = shallowRef(true)
const state = ref({ username: '' })

const schema = S.standardSchemaV1(S.Struct({
  username: S.Trim.pipe(S.minLength(3)).annotations({
    description: 'Must be at least 3 characters',
  }),
}))

async function submit(event: FormSubmitEvent<typeof schema.Type>) {
  await $fetch('/api/auth/register', {
    method: 'POST',
    body: { username: event.data.username },
  })
  open.value = false
   reloadNuxtApp()
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Create Account"
    description="Choose a username to get personalized experience"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="grid gap-4"
        @submit="submit"
      >
        <UFormField label="Username" name="username">
          <UInput v-model="state.username" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton
            type="button"
            variant="outline"
            color="neutral"
            @click="open = false"
          >
            Cancel
          </UButton>

          <UButton type="submit">
            Create
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
