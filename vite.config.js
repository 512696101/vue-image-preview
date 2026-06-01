import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true, // 在 package.json 自动插入 types 字段
      include: ['src/lib/imagePreview'], // 指定源码目录
    }),
  ],
  build: {
    target: 'es2015',
    lib: {
      entry: resolve(__dirname, 'src/lib/imagePreview/index.ts'),
      name: 'ImagePreview',
      formats: ['es', 'umd'],
      fileName: (format) =>
        `image-preview.${format === 'es' ? 'js' : 'umd.js'}`,
    },
    minify: 'terser',
  },
})
