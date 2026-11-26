import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development, /api requests are forwarded to the FastAPI server,
// so the browser never talks to Anthropic directly.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
