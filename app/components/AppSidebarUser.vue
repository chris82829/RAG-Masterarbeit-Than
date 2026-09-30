<script setup lang="ts">
const { user, logout: _logout } = useUserSession()
const store = useGlobalStore()

const { data } = user.value
  ? await useFetch('/api/users')
  : { data: shallowRef([]) }

const users = computed(() => {
  if (!data.value)
    return []
  return data.value.filter(u => u.id !== user.value?.id)
})

async function change(id: string) {
  await $fetch('/api/auth/login', {
    method: 'POST',
    body: { id },
  })
  window.location.reload()
}

async function logout() {
  await _logout()
  window.location.reload()
}
</script>

<template>
  <UPopover
    v-if="user"
    :content="{
      align: 'start',
      side: 'top',
    }"
    :ui="{ content: 'w-54' }"
  >
    <UButton
      class="p-4 -m-4"
      variant="ghost"
      color="neutral"
      :disabled="users.length <= 1"
      :trailing-icon="store.collapsed || users.length <= 1 ? '' : 'i-lucide-chevrons-up-down'"
      :ui="{
        base: 'rounded-none border-t border-default disabled:opacity-100',
        trailingIcon: 'ml-auto text-muted size-5',
      }"
    >
      <div class="flex items-center gap-3">
        <span class="rounded-md overflow-hidden shrink-0">
          <Avatar :name="user.id" :size="36" square />
        </span>
        <div v-if="!store.collapsed" class="grid text-left">
          <span class="font-medium text-sm line-clamp-1">{{ user.username }}</span>
          <span class="text-dimmed text-xs">{{ user.id.split('-').at(-1) }}</span>
        </div>
      </div>
    </UButton>

    <template #content>
      <div>
        <ul class="grid gap-2">
          <UButton
            v-for="u in users"
            :key="u.id" variant="ghost"
            color="neutral"
            @click="change(u.id)"
          >
            <div class="flex items-center gap-3">
              <span class="rounded-md overflow-hidden shrink-0">
                <Avatar :name="u.id" :size="36" square />
              </span>
              <div class="grid text-left">
                <span class="font-medium text-sm line-clamp-1">{{ u.username }}</span>
                <span class="text-dimmed text-xs">{{ u.id.split('-').at(-1) }}</span>
              </div>
            </div>
          </UButton>
        </ul>

        <div class="border-t border-accented p-2">
          <UButton
            block
            icon="i-lucide-log-out"
            variant="subtle"
            color="neutral"
            loading-auto
            size="sm"
            @click="logout()"
          >
            Log out
          </UButton>
        </div>
      </div>
    </template>
  </UPopover>
</template>
