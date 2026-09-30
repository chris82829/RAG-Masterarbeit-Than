export default defineNuxtPlugin({
  name: 'user-session-fetch-plugin',
  enforce: 'pre',
  async setup(app) {
    const event = useRequestEvent()

    app.payload.isCached = event?.context.cache
    if (app.payload.serverRendered && !app.payload.prerenderedAt && !app.payload.isCached) {
      await useUserSession().fetch()
    }
  },
})
