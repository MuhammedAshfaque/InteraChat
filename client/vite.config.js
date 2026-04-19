import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
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
        target: 'https://chatify-connect-backend.onrender.com',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'https://chatify-connect-backend.onrender.com',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
})
