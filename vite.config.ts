import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api/mvrv': {
        target: 'https://bitcoin-data.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mvrv/, '/api/v1/mvrv'),
      },
    },
  },
})
