import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/escape-from-cthub/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Escape from CT Hub',
        short_name: 'Escape',
        description: 'Your fastest way home, right now.',
        theme_color: '#0b7a4b',
        background_color: '#f6f5f1',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            // Static stop/route data changes rarely: serve from cache, refresh in background.
            urlPattern: /^https:\/\/data\.busrouter\.sg\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'busrouter-data' },
          },
        ],
      },
    }),
  ],
})
