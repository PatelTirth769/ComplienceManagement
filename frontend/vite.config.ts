import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// Dynamically read PORT from backend/.env so changing backend/.env syncs the entire project automatically
function getBackendPort() {
  try {
    const backendEnvPath = fileURLToPath(new URL('../backend/.env', import.meta.url))
    if (fs.existsSync(backendEnvPath)) {
      const content = fs.readFileSync(backendEnvPath, 'utf-8')
      const match = content.match(/^PORT\s*=\s*(\d+)/m)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
  } catch (err) {
    // fallback
  }
  return '5000'
}

const backendPort = getBackendPort()
const backendEnvPath = fileURLToPath(new URL('../backend/.env', import.meta.url))

// Auto-restart Vite dev server whenever backend/.env changes
const watchBackendEnv: Plugin = {
  name: 'watch-backend-env',
  configureServer(server) {
    server.watcher.add(backendEnvPath)
    server.watcher.on('change', (file) => {
      if (file.replace(/\\/g, '/').endsWith('backend/.env')) {
        server.restart()
      }
    })
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), watchBackendEnv],
  define: {
    '__BACKEND_PORT__': JSON.stringify(backendPort)
  },
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true
      }
    }
  }
})
