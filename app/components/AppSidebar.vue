<script setup lang="ts">
import type { NavigationMenuItem } from '#ui/types'

const store = useGlobalStore()
const { user } = useUserSession()

const navs = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Home',
    icon: 'i-lucide-house',
    to: '/',
  },
  user.value
    ? {
        label: 'Profile',
        icon: 'i-lucide-user',
        to: '/profile',
      }
    : undefined,
].filter(Boolean) as NavigationMenuItem[])

const colorMode = useColorMode()
const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set(_isDark) {
    colorMode.preference = _isDark ? 'dark' : 'light'
  },
})
</script>

<template>
  <div
    :data-collapsed="store.collapsed"
    class="w-75 data-[collapsed=true]:w-18 overflow-hidden border-r border-default transition-[width]"
  >
    <div class="relative flex flex-col min-w-0 min-h-svh flex-1">
      <PanelHeader class="gap-3">
        <div class="bg-primary rounded-md size-9 flex-center shrink-0">
          <UIcon name="i-lucide-briefcase-business" class="text-inverted size-4.5" />
        </div>
        <p v-if="!store.collapsed" class="font-medium">
          Jobby
        </p>
      </PanelHeader>

      <div class="flex flex-col gap-4 flex-1 overflow-hidden p-4">
        <UNavigationMenu
          :collapsed="store.collapsed"
          :items="navs"
          orientation="vertical"
          :ui="{
            list: 'grid gap-3',
            item: store.collapsed ? 'size-10 aspect-square' : '',
            link: store.collapsed ? 'size-full flex-center' : 'h-10 gap-3',
          }"
        />

        <div class="mt-auto grid gap-8">
          <div class="grid gap-4">
            <ClientOnly>
              <UButton
                :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
                block
                class="truncate h-10 justify-start gap-3"
                :class="{ 'w-10': store.collapsed }"
                color="neutral"
                variant="ghost"
                @click="isDark = !isDark"
              >
                {{ store.collapsed ? '' : (isDark ? 'Dark Mode' : 'Light Mode') }}
              </UButton>

              <template #fallback>
                <UButton
                  loading
                  block
                  class="truncate h-10 justify-start"
                  color="neutral"
                  variant="ghost"
                />
              </template>
            </ClientOnly>
          </div>

          <AppSidebarUser />
        </div>
      </div>
    </div>
  </div>
</template>
