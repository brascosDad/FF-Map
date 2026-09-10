import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Two entry points: the map itself, and the style guide. The guide is a real
// build target rather than a static copy so it renders from the same token and
// component files the app loads -- it cannot drift.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        designSystem: resolve(import.meta.dirname, 'design-system.html'),
      },
    },
  },
})
