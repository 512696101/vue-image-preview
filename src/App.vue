<script setup>
import { ref } from 'vue'
import {
  openImagePreview,
  createImagePreview,
} from './lib/imagePreview'

const sampleImages = [
  'https://picsum.photos/seed/preview1/1200/800',
  'https://picsum.photos/seed/preview2/900/1200',
  'https://picsum.photos/seed/preview3/1000/700',
]

const containerRef = ref(null)
let containerPreview = null

function openFullscreen(index = 0) {
  openImagePreview({
    urls: sampleImages,
    index,
    mountTo: document.body,
    mode: 'fullscreen',
    thumbnails: true,
    theme: {
      cssVars: {
        '--ip-footer-bg': 'rgba(15, 23, 42, 0.88)',
        '--ip-thumb-border-active': '#38bdf8',
      },
      classNames: {
        footer: 'demo-preview-footer',
        toolbarBtn: 'demo-preview-btn',
      },
      actionIcons: {
        zoomIn: '🔍+',
        zoomOut: '🔍−',
        close: '✕',
      },
    },
    onClose: () => console.log('fullscreen preview closed'),
  })
}

function openInContainer(index = 0) {
  if (!containerRef.value) return

  if (!containerPreview) {
    containerPreview = createImagePreview({
      urls: sampleImages,
      mountTo: containerRef.value,
      mode: 'container',
      thumbnails: { show: true },
      onClose: () => console.log('container preview closed'),
    })
  } else {
    containerPreview.setUrls(sampleImages)
  }

  containerPreview.open(index)
}
</script>

<template>
  <main class="page">
    <header class="hero">
      <h1>Vue3 图片预览</h1>
      <p>纯 JS 实现，支持全屏与容器内两种挂载方式，操作栏可扩展。</p>
    </header>

    <section class="panel">
      <h2>全屏模式（挂载到 body）</h2>
      <div class="thumb-grid">
        <button
          v-for="(url, index) in sampleImages"
          :key="url"
          class="thumb"
          type="button"
          @click="openFullscreen(index)"
        >
          <img :src="url" alt="" />
        </button>
      </div>
    </section>

    <section class="panel">
      <h2>容器模式（仅在指定节点内弹出）</h2>
      <div ref="containerRef" class="preview-container">
        <p class="container-tip">点击下方缩略图，预览只在这个区域内显示</p>
        <div class="thumb-grid compact">
          <button
            v-for="(url, index) in sampleImages"
            :key="`c-${url}`"
            class="thumb"
            type="button"
            @click="openInContainer(index)"
          >
            <img :src="url" alt="" />
          </button>
        </div>
      </div>
    </section>

    <section class="panel code-hint">
      <h2>使用方式</h2>
      <pre><code>import { openImagePreview, createImagePreview, registerAction } from '@/lib/imagePreview'

// 全屏预览
openImagePreview({ urls: ['a.jpg', 'b.jpg'], index: 0 })

// 容器内预览
const preview = createImagePreview({
  urls: ['a.jpg', 'b.jpg'],
  mountTo: document.querySelector('#box'),
  mode: 'container',
})
preview.open(0)

// 扩展新操作
registerAction({
  key: 'download',
  title: '下载',
  icon: '↓',
  order: 90,
  handler: (ctx) => { /* ... */ },
})</code></pre>
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 20px 64px;
}

.hero h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.hero p {
  margin: 0;
  color: #666;
}

.panel {
  margin-top: 28px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.panel h2 {
  margin: 0 0 16px;
  font-size: 18px;
}

.thumb-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.thumb-grid.compact {
  grid-template-columns: repeat(3, 80px);
}

.thumb {
  padding: 0;
  border: 0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: #f3f4f6;
}

.thumb img {
  display: block;
  width: 100%;
  height: 120px;
  object-fit: cover;
}

.thumb-grid.compact .thumb img {
  height: 80px;
}

.preview-container {
  position: relative;
  min-height: 280px;
  padding: 16px;
  border-radius: 10px;
  background: linear-gradient(180deg, #f8fafc, #eef2ff);
  overflow: hidden;
}

.container-tip {
  margin: 0 0 12px;
  color: #64748b;
  font-size: 14px;
}

.code-hint pre {
  margin: 0;
  padding: 14px;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  overflow: auto;
  font-size: 13px;
  line-height: 1.6;
}
</style>
