import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
    // The S3 adapters are imported straight from tools/adapters/ at the repo
    // root, outside this package — allow the dev server to serve them.
    fs: { allow: ['../../..'] },
    // Proxy /api calls to the Pipecat bot server during dev
    proxy: {
      '/api': {
        target: 'http://localhost:7860',
        changeOrigin: true,
      },
      // Proxy Maps Routes API calls through Vite to avoid CORS issues in the browser
      '/maps-routes': {
        target: 'https://routes.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/maps-routes/, '/directions/v2:computeRoutes'),
      },
      // Proxy Google Places API (New) text search & photos through Vite
      '/maps-places': {
        target: 'https://places.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/maps-places/, ''),
      },
      // Proxy Open-Meteo live weather API through Vite
      '/open-meteo': {
        target: 'https://api.open-meteo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/open-meteo/, ''),
      },
    },
  },
})
