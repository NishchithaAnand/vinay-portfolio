import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  build: {
    // Two real pages, so /works/ works on any static host without rewrite rules.
    rollupOptions: {
      input: {
        home: path.resolve(import.meta.dirname, 'index.html'),
        works: path.resolve(import.meta.dirname, 'works/index.html'),
      },
    },
  },
})
