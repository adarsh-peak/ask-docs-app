import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['react-force-graph-2d'],
  },
  build: {
    outDir: '../src/static',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/chat':  { target: 'http://127.0.0.1:52891', changeOrigin: true },
      '/stats': { target: 'http://127.0.0.1:52891', changeOrigin: true },
      '/docs':  { target: 'http://127.0.0.1:52891', changeOrigin: true },
      '/admin': { target: 'http://127.0.0.1:52891', changeOrigin: true },
    },
  },
})
