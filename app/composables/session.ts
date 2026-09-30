import type { Session } from '#shared/types'

export function useUserSession() {
  const requestFetch = useRequestFetch()

  const session = useState<Session | undefined>('nuxt-session', () => undefined)

  const fetch = async () => {
    session.value = await requestFetch<Session>('/api/auth/session', {
      headers: { accept: 'application/json' },
      retry: false,
    }).catch(() => undefined)
  }

  const logout = async () => await $fetch('/api/auth/session', { method: 'DELETE' })

  return {
    user: computed(() => session.value?.user),
    fetch,
    logout,
    session,
  }
}
