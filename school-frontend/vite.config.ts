import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['iOS >= 13', 'Safari >= 13', 'Chrome >= 64', 'Firefox >= 67'],
      modernPolyfills: true,
      renderLegacyChunks: true,
    }),
  ],
  build: {
    target: ['es2018', 'safari13'],
    cssTarget: 'safari13',
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
