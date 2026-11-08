/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Verde de la lona que rodea las canchas de polvo de ladrillo.
const THEME_COLOR = '#1f6f43'

/**
 * Ruta donde se sirve la app. En GitHub Pages es "/<repo>/" (lo pasa el
 * workflow); en local, Netlify o un dominio propio, "/".
 */
const BASE = (process.env.BASE_PATH ?? '/').replace(/\/?$/, '/')

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  build: {
    rollupOptions: {
      output: {
        // Librerías en chunks propios: al publicar un cambio de la app, el
        // iPhone solo vuelve a descargar el código de la app, no las librerías.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/.test(id)) return 'react'
          if (id.includes('dexie')) return 'dexie'
          if (/[\\/]node_modules[\\/]zod[\\/]/.test(id)) return 'zod'
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
    // En GitHub Actions, el commit desplegado; en local, "local"
    __APP_COMMIT__: JSON.stringify(process.env.GITHUB_SHA?.slice(0, 7) ?? 'local'),
    __APP_FECHA_BUILD__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // El SW nuevo espera a que el usuario toque "actualizar" (ver ProveedorActualizacion)
      registerType: 'prompt',
      // globPatterns ya incluye los íconos de public/
      includeManifestIcons: false,
      manifest: {
        id: BASE,
        name: 'Mi Tenis',
        short_name: 'Mi Tenis',
        description: 'Registro personal de partidos de tenis de singles',
        lang: 'es',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: THEME_COLOR,
        background_color: THEME_COLOR,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  test: {
    passWithNoTests: true,
  },
})
