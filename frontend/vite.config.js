import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5000',
        ws: true,
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          reactCore: ['react', 'react-dom', 'react-router-dom', 'react-redux'],
          appState: ['@reduxjs/toolkit', '@tanstack/react-query'],
          dataViz: ['recharts'],
          formUi: ['react-hook-form', '@hookform/resolvers', 'zod'],
          motion: ['framer-motion'],
          pdf: ['jspdf', 'html2canvas'],
          ui: ['lucide-react', 'sonner', 'react-hot-toast'],
        },
      },
    },
  },
})
