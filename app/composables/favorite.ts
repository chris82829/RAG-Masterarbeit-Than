export function useFavorite() {
  const { data: favorites } = useNuxtData<string[]>('get-favorites')
  const pending = shallowRef(false)

  const toggle = async (id: string, isFavorited: boolean) => {
    if (pending.value)
      return

    pending.value = true

    try {
      await $fetch('/api/favorites', {
        method: isFavorited ? 'DELETE' : 'POST',
        body: { jobIds: [id] },
      })
    }
    finally {
      pending.value = false
      await refreshNuxtData('get-favorites')
    }
  }

  return { favorites, toggle, pending }
}
