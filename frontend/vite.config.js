import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy les requêtes API vers Django en développement (évite les CORS)
      '/api': {
        target:      'http://localhost:8000',
        changeOrigin: true,
        secure:      false,
      },
      // Proxy WebSocket
      '/ws': {
        target:      'ws://localhost:8000',
        ws:          true,
        changeOrigin: true,
      },
    },
  },
})