import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    cssTarget: 'safari14',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-quill') || id.includes('quill')) return 'quill';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
          if (
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('/react/') ||
            id.includes('\\react\\')
          ) {
            return 'vendor';
          }
          return 'lib';
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['prepodmgy.ru', 'www.prepodmgy.ru'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['prepodmgy.ru', 'www.prepodmgy.ru'],
  },
})
