import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
export default defineConfig({
  base: '/',
  worker:{format:'es'},
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: 'dist-standalone', emptyOutDir: true, assetsInlineLimit: 0, sourcemap: false },
  server: { host: '127.0.0.1', port: 5206, strictPort: true },
})
