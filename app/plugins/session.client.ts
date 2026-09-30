export default defineNuxtPlugin(async (app) => {
  if (!app.payload.serverRendered) {
    await useUserSession().fetch()
  }
  else if (app.payload.prerenderedAt || app.payload.isCached) {
    app.hook('app:mounted', async () => {
      await useUserSession().fetch()
    })
  }
})
