import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/agent/',
  server: {
    proxy: {
      '/gemini-api': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/gemini-api/, ''),
      },
      '/claude-api': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/claude-api/, ''),
      },
      '^.*\/xai-api': {
        target: 'https://api.x.ai',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^.*\/xai-api/, ''),
      },
      '^.*\/local-api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path: string) => path.replace(/^.*\/local-api/, ''),
      },
      '/mcp': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
