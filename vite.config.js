import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/imagePreview/index.ts'),
      name: 'ImagePreview',
      formats: ['es', 'umd'],
      fileName: (format) => `image-preview.${format === 'es' ? 'js' : 'umd.js'}`
    }
  }
})
