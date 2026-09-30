import type { Filters } from '#shared/types'
import { DEFAULT_FILTER, JOB_WORKINGTIMES } from '#shared/constants'

export const useGlobalStore = defineStore('global', () => {
  // UI
  const layout = useCookie('app:layout', { default: () => [50, 50] })
  const collapsed = useCookie('app:sidebar:collapsed', { default: () => false })

  const panelLeft = shallowRef<any>()
  const panelRight = shallowRef<any>()

  // State
  const filters = ref<Filters>((() => DEFAULT_FILTER)())

  function clearFilters() {
    filters.value.search = ''
    filters.value.types = []
    filters.value.categories = []
    filters.value.fields = []
    filters.value.homeoffices = []
    filters.value.workingtimes = [JOB_WORKINGTIMES.min, JOB_WORKINGTIMES.max]
    filters.value.locations = []
    filters.value.start_date = undefined
    filters.value.end_date = undefined
  }

  // Event
  const { on: onAskJobby, trigger: triggerAskJobby } = createEventHook<string>()

  return {
    // UI
    layout,
    collapsed,
    panelLeft,
    panelRight,

    // State
    filters,

    // Fns
    clearFilters,
    onAskJobby,
    triggerAskJobby,
  }
})
