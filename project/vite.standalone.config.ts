import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import {existsSync} from 'node:fs'
export default defineConfig({
  base: '/',
  worker:{format:'es'},
  plugins: [{
    name:'mobile-character-media',enforce:'pre',
    resolveId(source){
      const prefix='@/assets/character/'
      const originalRoot=fileURLToPath(new URL('./src/assets/character/',import.meta.url))
      const relative=source.startsWith(prefix)?source.slice(prefix.length):source.startsWith(originalRoot)?source.slice(originalRoot.length):undefined
      if(process.env.XIAOAZI_ORIGINAL_MEDIA==='1'||!relative||!relative.endsWith('.webm'))return
      const path=fileURLToPath(new URL('../.cache/mobile-media/'+relative,import.meta.url))
      if(!existsSync(path))throw new Error('Run python3 scripts/prepare_mobile_media.py before starting Vite.')
      return path
    },
  },react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: 'dist-standalone', emptyOutDir: true, assetsInlineLimit: 0, sourcemap: false },
  server: { host: '127.0.0.1', port: 5206, strictPort: true,fs:{allow:[fileURLToPath(new URL('..',import.meta.url))]} },
})
