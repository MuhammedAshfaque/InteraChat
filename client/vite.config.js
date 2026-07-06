import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://interachat-backend.onrender.com',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'https://interachat-backend.onrender.com',
        ws: true,
        changeOrigin: true
      },
      '/uploads': {
        target: 'https://interachat-backend.onrender.com',
        changeOrigin: true
      }
    }
  }
})