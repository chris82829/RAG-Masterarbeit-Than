<script setup lang="ts">
import { toLocalDate } from '#shared/utils'

definePageMeta({
  middleware: ['authenticated'],
})

const { session, logout: _logout } = useUserSession()

async function logout() {
  await _logout()
  window.location.reload()
}
</script>

<template>
  <Panel>
    <PanelHeader page>
      <span>Profile</span>
    </PanelHeader>

    <PanelBody class="gap-12">
      <div class="p-6 flex justify-between items-center rounded-md overflow-hidden border border-accented bg-default dark:bg-elevated/50">
        <div class="flex items-center gap-4">
          <span class="rounded-md overflow-hidden shrink-0 w-fit">
            <Avatar :name="session!.user!.id" :size="60" square />
          </span>

          <div>
            <h2 class="font-bold text-2xl">
              {{ session!.user!.username }}
            </h2>
            <p class="text-sm text-muted">
              Created at {{ toLocalDate(session!.user!.created_at) }}
            </p>
          </div>
        </div>

        <div>
          <UButton
            block
            icon="i-lucide-log-out"
            variant="outline"
            color="neutral"
            loading-auto
            @click="logout()"
          >
            Log out
          </UButton>
        </div>
      </div>

      <ProfileMemories />

      <ProfileFavorites />
    </PanelBody>
  </Panel>
</template>
