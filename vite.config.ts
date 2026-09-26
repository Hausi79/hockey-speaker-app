import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves the production build under
  // /hockey-speaker-app/, so built asset URLs need that prefix. The
  // dev server (`npm run dev`) must stay at `/` so it keeps matching
  // the local Spotify redirect URI (http://127.0.0.1:5173/).
  base: command === 'build' ? '/hockey-speaker-app/' : '/',
  // Bind explicitly to the IPv4 loopback: on some macOS setups Vite's
  // default `localhost` binding resolves to IPv6-only ([::1]), which
  // the browser can't reach via 127.0.0.1 (needed to match the
  // registered Spotify redirect URI).
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'IceVibe',
        short_name: 'IceVibe',
        description:
          'Musiksteuerung für Hockey-Stadion und Speaker über Spotify (Situationsbuttons, Soundboard).',
        theme_color: '#0f1115',
        background_color: '#0f1115',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the app shell for offline use. The Spotify API itself
        // always requires network access - only the UI works offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
}))
