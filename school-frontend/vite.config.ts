import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['prepodmgy.ru'], // 🔥 Разрешаем твой домен для прода
  },
  server: {
    allowedHosts: ['prepodmgy.ru'], // 🔥 На всякий случай для дев-режима
  }
})