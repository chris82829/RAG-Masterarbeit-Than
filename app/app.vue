<script setup lang="ts">
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'

const { user } = useUserSession()

const store = useGlobalStore()

const panelLeft = useTemplateRef('panel-left')
const panelRight = useTemplateRef('panel-right')
onMounted(() => {
  store.panelLeft = panelLeft.value
  store.panelRight = panelRight.value
})

function setLayout(arr: number[]) {
  store.layout = arr.length === 2 ? arr : [100, 0]
}

await Promise.all([
  useFetch('/api/jobs', {
    method: 'GET',
    key: 'get-jobs',
    cache: 'force-cache',
  }),
  useFetch('/api/favorites', {
    key: 'get-favorites',
    cache: 'force-cache',
  }),
])
</script>

<template>
  <UApp :toaster="{ position: 'top-right' }">
    <div class="w-full h-screen flex">
      <ClientOnly v-if="!user">
        <LazyModalRegister />
      </ClientOnly>

      <AppSidebar />

      <SplitterGroup
        id="splitter-group"
        direction="horizontal"
        @layout="setLayout"
      >
        <SplitterPanel
          id="splitter-panel-left"
          ref="panel-left"
          :default-size="user ? store.layout[0]! : 100"
          :min-size="33"
        >
          <NuxtPage />
        </SplitterPanel>

        <SplitterResizeHandle
          id="splitter-handle"
          class="flex-center w-1.5 bg-transparent border border-accented"
        >
          <div class="flex-center">
            <UIcon name="i-lucide-grip-vertical" class="size-4 text-muted" />
          </div>
        </SplitterResizeHandle>

        <SplitterPanel
          v-if="user"
          id="splitter-panel-right"
          ref="panel-right"
          :default-size="user ? store.layout[1]! : 0"
          :max-size="50"
          :min-size="33"
        >
          <AppChat />
        </SplitterPanel>
      </SplitterGroup>
    </div>
  </UApp>
</template>
