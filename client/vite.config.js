import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../server/public',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]'
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://interachat.onrender.com',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'https://interachat.onrender.com',
        ws: true
      },
      '/uploads': {
        target: 'https://interachat.onrender.com',
        changeOrigin: true
      }
    }
  }
})
