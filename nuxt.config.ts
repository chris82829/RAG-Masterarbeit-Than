export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxtjs/mdc',
    '@pinia/nuxt',
    '@nuxt/hints',
  ],

  devtools: {
    enabled: false,
  },

  css: ['~/assets/css/main.css'],

  mdc: {
    highlight: false,
  },

  ui: {
    fonts: false,
    theme: {
      colors: ['primary', 'success', 'info', 'warning', 'error'],
    },
  },

  future: {
    // compatibilityVersion: 5,
  },

  experimental: {
    viteEnvironmentApi: true,
    typescriptPlugin: true,
    payloadExtraction: true,
  },

  compatibilityDate: '2025-10-26',

  nitro: {
    rollupConfig: {
      onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_DEPENDENCY' || warning.code === 'THIS_IS_UNDEFINED') {
          return
        }

        console.log({ warning })
        warn(warning)
      },
    },
  },

  typescript: {
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: false,
      },
    },
  },

  eslint: {
    config: {
      standalone: false,
      nuxt: {
        sortConfigKeys: true,
      },
    },
  },
})
