import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import generateHandler from './api/generate.js'

/*
 * Dev-only: serve the /api/generate serverless function locally so the full
 * Capture → Loading → Results flow works under `vite dev` (no Vercel CLI/login
 * needed). Production runs this SAME handler as a Vercel function — this plugin
 * just mounts it as dev middleware, so there's one mock and zero drift. Only
 * applies in `serve`; never touches the production build.
 */
function devApi() {
  return {
    name: 'echo-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/generate', async (req, res) => {
        // Vite's dev server hands us a raw Node req/res; the Vercel handler
        // expects a parsed body + Express-style res helpers. Bridge both.
        let raw = ''
        try {
          for await (const chunk of req) raw += chunk
          req.body = raw ? JSON.parse(raw) : {}
        } catch {
          req.body = {}
        }
        res.status = (code) => ((res.statusCode = code), res)
        res.json = (obj) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(obj))
          return res
        }
        generateHandler(req, res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['echo-icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Echo — your creator digital twin',
        short_name: 'Echo',
        description:
          'One input becomes a full multi-platform content kit: a Reel, an Instagram carousel, and an X thread — in your brand voice.',
        theme_color: '#0B0B0F',
        background_color: '#0B0B0F',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        // Never serve the SPA shell for /api/* — let those hit the function (CP7).
        navigateFallbackDenylist: [/^\/api\//],
      },
      // The PWA is tested on the deployed HTTPS URL, not the local dev server.
      devOptions: { enabled: false },
    }),
    devApi(),
  ],
  server: {
    // Expose the dev server on the local network (unused for PWA testing).
    host: true,
  },
})
