import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'strip-crossorigin',
      enforce: 'post',
      transformIndexHtml(html) {
        return html.replace(/ crossorigin/g, '')
      },
    },
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  build: {
    target: ['es2015', 'safari13'],
    cssTarget: 'safari12',
    modulePreload: false,
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
