import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx,js,jsx}'],
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://localhost:3000' },
  },
  preview: { port: 4173, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/node_modules\/(recharts|d3-|victory|internmap|decimal\.js)/.test(id)) return 'charts';
          if (id.includes('node_modules/qrcode')) return 'qrcode';
          if (/node_modules\/(i18next|react-i18next)/.test(id)) return 'i18n';
          if (/node_modules\/(react-router|react-router-dom|@remix-run)/.test(id)) return 'router';
        },
      },
    },
  },
})
