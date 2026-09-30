<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { UBadge, UButton } from '#components'
import { toLocalDate } from '#shared/utils'
import { getPaginationRowModel } from '@tanstack/vue-table'

interface ProfileMemory {
  type: 'core_profile' | 'preference' | 'experience'
  content: string
  created_at: string
  action: string
  id: number
}

const toast = useToast()

const table = useTemplateRef('table')

const columns: TableColumn<ProfileMemory>[] = [
  {
    accessorKey: 'id',
    header: '#',
    cell: ({ row }) => `#${row.getValue('id')}`,
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ getValue }) => h(UBadge, { color: 'neutral', variant: 'subtle' }, () => getValue<string>()),
  },
  {
    accessorKey: 'content',
    header: 'Content',
  },
  {
    accessorKey: 'created_at',
    header: 'Created At',
    cell: ({ getValue }) => toLocalDate(getValue<string>()),
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

const { data: memories, refresh } = await useFetch('/api/memories', {
  key: 'get-memories',
  transform: arr => arr.map(x => ({
    type: x.type,
    content: x.content,
    created_at: x.created_at,
    action: '',
    id: x.id,
  })),
})

async function del(ids: number[]) {
  if (!ids.length)
    return

  try {
    await $fetch('/api/memories', { method: 'DELETE', body: { ids } })
    await refresh()
    toast.add({ title: `${ids.length} memories deleted` })
  }
  catch {
    toast.add({
      title: 'Failed to delete memories',
      description: 'An error occurred while deleting the memories',
      color: 'error',
    })
  }
}
</script>

<template>
  <div
    v-if="memories"
    class="grid gap-4 border border-default p-4 rounded-md bg-default dark:bg-elevated/50"
  >
    <h2 class="text-xl font-medium">
      Memories
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
          @click="del(memories.map(m => m.id))"
        />

        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-refresh-cw"
          size="sm"
          label="Refresh"
          loading-auto
          class="hover:bg-default"
          @click="refreshNuxtData('get-memories')"
        />
      </div>
    </div>

    <UTable
      ref="table"
      v-model:pagination="pagination"
      v-model:global-filter="filter"
      :data="memories"
      :columns="columns"
      :pagination-options="{
        getPaginationRowModel: getPaginationRowModel(),
      }"
      :ui="{ td: 'text-default' }"
      class="flex-1 border rounded-md border-accented bg-default"
    />

    <div class="flex justify-between items-center border-default">
      <span class="text-muted text-sm">Showing {{ table?.tableApi?.getFilteredRowModel().rows.length }} memories.</span>

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
