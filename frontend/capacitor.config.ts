import type { CapacitorConfig } from '@capacitor/cli'

// The iPhone app (decision 19). It wraps the same React app the browser gets.
//
// In development the app loads the Vite dev server instead of the built files,
// so /api still goes through Vite's proxy on one origin and the login cookie
// works unchanged. Set CAP_SERVER_URL when syncing (frontend/README.md); leave
// it unset to bundle dist/ into the app.
const devServer = process.env.CAP_SERVER_URL

const config: CapacitorConfig = {
  appId: 'com.cathlqj1011.dreamcatcher',
  appName: 'Dream Catcher',
  webDir: 'dist',
  server: devServer ? { url: devServer, cleartext: true } : undefined,
}

export default config
