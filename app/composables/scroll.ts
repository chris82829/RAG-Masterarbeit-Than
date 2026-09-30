import type { ComponentPublicInstance, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

export function useScroll(container: Ref<HTMLElement | null>) {
  const messagesRefs = ref(new Map<string, HTMLElement>())
  const showAutoScroll = shallowRef(false)
  const lastScrollTop = shallowRef(0)
  const userScrolledUp = shallowRef(false)

  function registerMessageRef(id: string, element: ComponentPublicInstance | Element | null) {
    const el = (element as ComponentPublicInstance)?.$el ?? element
    if (el instanceof HTMLElement) {
      messagesRefs.value.set(id, el)
    }
  }

  function scrollToMessage(id: string) {
    const element = messagesRefs.value.get(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function scrollToBottom(smooth = true) {
    if (!container.value)
      return
    container.value.scrollTo({
      top: container.value.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant',
    })
  }

  function checkScrollPosition() {
    if (!container.value)
      return

    const { scrollTop, scrollHeight, clientHeight } = container.value
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    showAutoScroll.value = distanceFromBottom >= 100

    if (scrollTop < lastScrollTop.value) {
      userScrolledUp.value = true
    }
    else if (distanceFromBottom < 100) {
      userScrolledUp.value = false
    }

    lastScrollTop.value = scrollTop
  }

  function onAutoScrollClick() {
    userScrolledUp.value = false
    scrollToBottom()
  }

  onMounted(() => {
    if (!container.value)
      return

    lastScrollTop.value = container.value.scrollTop

    // Wait for content to fully render (especially MDC components)
    setTimeout(() => {
      scrollToBottom(false)
    }, 100)

    useEventListener(container, 'scroll', checkScrollPosition)
    useEventListener(window, 'resize', checkScrollPosition)
  })

  return {
    messagesRefs,
    showAutoScroll,
    userScrolledUp,
    registerMessageRef,
    scrollToMessage,
    scrollToBottom,
    checkScrollPosition,
    onAutoScrollClick,
  }
}
