import { defineConfig } from '@vite-pwa/assets-generator/config'

const fondo = '#1f6f43'

export default defineConfig({
  preset: {
    transparent: { sizes: [64, 192, 512], favicons: [[48, 'favicon.ico']] },
    maskable: { sizes: [512], padding: 0.2, resizeOptions: { background: fondo } },
    apple: { sizes: [180], padding: 0.2, resizeOptions: { background: fondo } },
  },
  images: ['public/logo.svg'],
})
