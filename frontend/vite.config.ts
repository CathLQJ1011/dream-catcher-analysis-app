import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // The backend runs separately (backend/README.md). Passing /api through the dev
    // server keeps everything on one origin, so the login cookie just works, even
    // when the app is opened from a phone on the same Wi-Fi.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
