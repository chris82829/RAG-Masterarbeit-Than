<script setup lang="ts">
import type { Job } from '#shared/types'
import type { TableColumn } from '@nuxt/ui'
import { UButton } from '#components'
import { getPaginationRowModel } from '@tanstack/vue-table'

const toast = useToast()

const { favorites } = useFavorite()

const table = useTemplateRef('table')

const columns: TableColumn<{ id: string, title: string }>[] = [
  {
    accessorKey: 'id',
    header: '#',
    cell: ({ getValue }) => h(UButton, { variant: 'link', color: 'primary', to: `/jobs/${getValue()}` }, () => `#${getValue()}`),
  },
  {
    accessorKey: 'title',
    header: 'Title',
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => h(UButton, {
      icon: 'i-lucide-trash-2',
      color: 'error',
      variant: 'ghost',
      onClick: async () => await del([row.getValue('id')]),
      loadingAuto: true,
    }),
  },
]

const pagination = ref({ pageIndex: 0, pageSize: 10 })

const filter = ref('')

const { data } = useNuxtData<{ jobs: Job[] }>('get-jobs')

const jobs = computed(() => data.value?.jobs
  .filter(x => favorites.value?.includes(x.id))
  .map(x => ({ title: x.title, link: `/jobs/${x.id}`, action: '', id: x.id })),
)

async function del(ids: string[]) {
  if (!ids.length)
    return

  try {
    await $fetch('/api/favorites', { method: 'DELETE', body: { jobIds: ids } })
    await refreshNuxtData('get-favorites')
    toast.add({ title: `${ids.length} memories deleted` })
  }
  catch {
    toast.add({
      title: 'Failed to delete favorites',
      description: 'An error occurred while deleting the favorites',
      color: 'error',
    })
  }
}
</script>

<template>
  <div
    v-if="jobs"
    class="grid gap-4 border border-default p-4 rounded-md bg-default dark:bg-elevated/50"
  >
    <h2 class="text-xl font-medium">
      Favorites
    </h2>

    <div class="flex justify-between items-center">
      <UInput v-model="filter" class="grow max-w-3xs" placeholder="Filter..." />

      <div class="flex gap-2">
        <UButton
          variant="ghost"
          color="error"
          icon="i-lucide-trash"
          size="sm"
          label="Delete All"
          loading-auto
          class="hover:bg-default"
          @click="favorites && del(favorites)"
        />

        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-refresh-cw"
          size="sm"
          label="Refresh"
          loading-auto
          class="hover:bg-default"
          @click="refreshNuxtData('get-jobs')"
        />
      </div>
    </div>

    <UTable
      ref="table"
      v-model:pagination="pagination"
      v-model:global-filter="filter"
      :ui="{ td: 'text-default' }"
      :data="jobs"
      :columns="columns"
      :pagination-options="{
        getPaginationRowModel: getPaginationRowModel(),
      }"
      class="flex-1 border rounded-md border-accented bg-default"
    />

    <div class="flex justify-between items-center border-default">
      <span class="text-muted text-sm">Showing {{ table?.tableApi?.getFilteredRowModel().rows.length }} favorites.</span>

      <UPagination
        :page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
        :items-per-page="table?.tableApi?.getState().pagination.pageSize!"
        :total="table?.tableApi?.getFilteredRowModel().rows.length!"
        color="neutral"
        variant="ghost"
        active-color="neutral"
        active-variant="subtle"
        @update:page="(p) => table?.tableApi?.setPageIndex(p - 1)"
      />
    </div>
  </div>
</template>
