# ImagePreview 图片预览组件

一个功能强大、高度可定制的图片预览组件，支持全屏/容器模式、手势拖拽、缩放旋转、缩略图导航、原生全屏、Action 插件系统等。

## ✨ 特性

- 🔍 **丰富的变换**：缩放、旋转、水平/垂直翻转、拖拽平移
- 🖼️ **缩略图条**：多图时自动显示，支持自定义缩略图 URL 和滚动定位
- 📱 **响应式设计**：自动适应 PC/移动端视口，触控友好
- 🎨 **高度可定制**：通过 Action 系统增减/修改按钮，支持主题 CSS 变量
- 🖱️ **手势与键盘**：拖拽平移、双指缩放（移动端）、滚轮缩放、键盘快捷键
- 🖥️ **两种模式**：`fullscreen`（模拟全屏，覆盖整个视口）或 `container`（嵌入指定容器）
- 🌐 **原生全屏**：可切换到浏览器原生全屏 API，并获得相应按钮状态
- 🎯 **TypeScript**：完整的类型定义

## 📦 安装

```bash
npm install your-image-preview
```

## 🚀 快速开始

```ts
import { openImagePreview } from 'your-image-preview'
import 'your-image-preview/dist/styles.css'

openImagePreview({
  urls: [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
  ],
  index: 0,
  mode: 'fullscreen',
})
```

## 🎮 基础用法

### 创建实例并手动控制

```ts
import { ImagePreview } from 'your-image-preview'

const preview = new ImagePreview({
  urls: ['a.jpg', 'b.jpg'],
  mountTo: '#preview-container',
  mode: 'container',
})

preview.open(1)       // 打开第二张
preview.next()        // 下一张
preview.prev()        // 上一张
preview.close()       // 关闭
```

### 函数式调用

```ts
import { openImagePreview } from 'your-image-preview'

const instance = openImagePreview({
  urls: ['a.jpg', 'b.jpg'],
  onChange: (index) => console.log('当前索引', index),
  onClose: () => console.log('预览关闭'),
})
```

## ⚙️ 配置选项 (ImagePreviewOptions)

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `urls` | `string[]` | **必填** | 图片地址数组 |
| `index` | `number` | `0` | 初始显示的图片索引 |
| `mountTo` | `HTMLElement \| string` | `document.body` | 挂载的父容器（元素或选择器） |
| `mode` | `'fullscreen' \| 'container' \| 'auto'` | `'auto'` | `auto` 根据 `mountTo === body` 自动选择 |
| `actions` | `PreviewAction[]` | `[]` | 实例级别的操作按钮配置（覆盖或新增） |
| `theme` | `PreviewTheme` | - | 主题配置，详见下方 |
| `thumbnails` | `boolean \| ThumbnailStripOptions` | `true`（多图时） | 缩略图条配置 |
| `wheelSensitivity` | `number` | `0.0012` | 滚轮缩放灵敏度 |
| `nativeFullscreen` | `boolean \| 'auto'` | `'auto'`（fullscreen 模式开启） | 是否启用浏览器原生全屏 |
| `autoEnterNativeFullscreen` | `boolean` | `false` | 打开预览时自动进入原生全屏 |
| `onChange` | `(index: number) => void` | - | 切换图片回调 |
| `onClose` | `() => void` | - | 关闭预览回调 |

## 🎛️ 实例方法

| 方法 | 说明 |
|------|------|
| `open(index?: number)` | 打开预览，可选指定起始索引 |
| `close()` | 关闭预览 |
| `destroy()` | 销毁实例（调用 close 并移除所有监听） |
| `goTo(index: number)` | 跳转到指定图片 |
| `prev()` / `next()` | 上一张 / 下一张 |
| `setState(patch: Partial<TransformState>)` | 更新变换状态（缩放、旋转、平移等） |
| `resetTransform()` | 重置所有变换（缩放恢复初始、旋转归零、翻转取消、平移归零） |
| `toggleNativeFullscreen()` | 切换浏览器原生全屏 |
| `setUrls(urls: string[])` | 动态更新图片列表 |
| `getContext()` | 获取当前上下文对象（供 action 使用） |

## 🖱️ 变换状态 (TransformState)

```ts
interface TransformState {
  scale: number        // 缩放比例
  rotate: number       // 旋转角度（度）
  flipX: boolean       // 水平翻转
  flipY: boolean       // 垂直翻转
  translateX: number   // 水平平移（px）
  translateY: number   // 垂直平移（px）
}
```

## 🧩 Action 按钮系统

所有工具栏按钮（缩放、旋转、前后切换、关闭等）都是通过 `PreviewAction` 定义的。你可以：
- **覆盖** 内置按钮的图标、标题、行为
- **新增** 自定义按钮
- **全局注册** 所有实例共享的按钮

### PreviewAction 接口

```ts
interface PreviewAction {
  key: string                     // 唯一标识，内置 key 见下表
  title?: string                  // 按钮 hover 提示
  icon?: PreviewActionIcon        // 图标：字符串 / Element / 动态函数
  order?: number                  // 显示顺序（越小越靠前）
  placement?: 'toolbar' | 'corner' // 位置：底部工具栏 或 右上角
  className?: string              // 自定义类名
  visible?: (ctx) => boolean      // 是否显示
  disabled?: (ctx) => boolean     // 是否禁用
  handler: (ctx) => void          // 点击处理
  render?: (ctx, button) => void  // 完全自定义渲染
}
```

`PreviewActionIcon` 类型：
```ts
type PreviewActionIcon = string | Element | ((ctx: PreviewContext) => string | Element)
```

### 内置 Action Key

| key | 默认标题 | 默认放置位置 | 说明 |
|-----|----------|--------------|------|
| `zoomIn` | 放大 | toolbar | 放大图片 |
| `zoomOut` | 缩小 | toolbar | 缩小图片 |
| `rotateLeft` | 左旋转 | toolbar | 逆时针旋转90° |
| `rotateRight` | 右旋转 | toolbar | 顺时针旋转90° |
| `flipX` | 水平翻转 | toolbar | 水平镜像 |
| `flipY` | 垂直翻转 | toolbar | 垂直镜像 |
| `reset` | 重置 | toolbar | 重置所有变换 |
| `prev` | 上一张 | toolbar | 上一张图片 |
| `next` | 下一张 | toolbar | 下一张图片 |
| `nativeFullscreen` | 浏览器全屏 | toolbar | 切换原生全屏 |
| `close` | 关闭 | corner | 关闭预览 |

### 覆盖内置按钮示例

```ts
import { openImagePreview } from 'your-image-preview'

openImagePreview({
  urls: ['a.jpg'],
  actions: [
    {
      key: 'zoomIn',
      icon: '🔍+',
      title: '放大图片',
      order: 1,
      handler: (ctx) => ctx.setState({ scale: ctx.state.scale + 0.5 })
    },
    {
      key: 'close',
      placement: 'toolbar',   // 将关闭按钮移到工具栏
      icon: '✖️'
    }
  ]
})
```

### 新增自定义按钮

```ts
openImagePreview({
  urls: ['a.jpg'],
  actions: [
    {
      key: 'myAction',
      title: '我的按钮',
      icon: '⭐',
      handler: (ctx) => {
        alert(`当前第 ${ctx.index + 1} 张`)
      }
    }
  ]
})
```

### 全局注册（所有实例共享）

```ts
import { registerAction } from 'your-image-preview'

registerAction({
  key: 'share',
  title: '分享',
  icon: '📤',
  handler: (ctx) => {
    navigator.share?.({ url: ctx.urls[ctx.index] })
  }
})
```

> 全局注册的 action 会与实例 `actions` 合并，实例中相同 key 的配置会覆盖全局。

## 🎨 主题定制 (PreviewTheme)

```ts
interface PreviewTheme {
  classNames?: {
    root?: string
    footer?: string
    toolbar?: string
    toolbarBtn?: string
    corner?: string
    cornerBtn?: string
    counter?: string
    thumbnailStrip?: string
    thumbnailItem?: string
    thumbnailItemActive?: string
  }
  cssVars?: Record<string, string>     // 自定义 CSS 变量
  actionIcons?: Record<string, PreviewActionIcon> // 批量覆盖图标
}
```

示例：修改背景色和按钮颜色

```ts
openImagePreview({
  urls: ['a.jpg'],
  theme: {
    cssVars: {
      '--ip-bg': 'rgba(0, 0, 0, 0.9)',
      '--ip-btn-color': '#ffcc00',
    },
    actionIcons: {
      zoomIn: '🔍',
      close: '❌'
    }
  }
})
```

可用的 CSS 变量（更多见 `styles.css`）：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `--ip-bg` | 背景色 | `rgba(0,0,0,0.75)` |
| `--ip-footer-bg` | 底部栏背景 | `rgba(0,0,0,0.55)` |
| `--ip-btn-color` | 按钮颜色 | `#fff` |
| `--ip-btn-hover` | 按钮悬停背景 | `rgba(255,255,255,0.16)` |
| `--ip-btn-disabled` | 禁用按钮颜色 | `rgba(255,255,255,0.35)` |
| `--ip-thumb-size` | 缩略图尺寸 | `56px` |
| `--ip-thumb-gap` | 缩略图间距 | `8px` |
| `--ip-thumb-border-active` | 激活缩略图边框色 | `#fff` |

## 🖼️ 缩略图条配置 (ThumbnailStripOptions)

```ts
interface ThumbnailStripOptions {
  show?: boolean                 // 是否显示，默认多图时显示
  className?: string             // 缩略图容器的类名
  itemClassName?: string         // 每个缩略图按钮的类名
  activeItemClassName?: string   // 当前激活缩略图的类名
  getUrl?: (url: string, index: number) => string  // 自定义缩略图地址
}
```

示例：使用图片的缩略图版本

```ts
openImagePreview({
  urls: ['large1.jpg', 'large2.jpg'],
  thumbnails: {
    getUrl: (url) => url.replace('large', 'thumb'),
    show: true,
    itemClassName: 'my-thumb'
  }
})
```

## ⌨️ 键盘快捷键

| 按键 | 操作 |
|------|------|
| `←` | 上一张 |
| `→` | 下一张 |
| `+` | 放大 |
| `-` | 缩小 |
| `0` | 重置变换 |
| `Esc` | 关闭预览（若处于原生全屏则先退出全屏） |

## 📱 手势支持（移动端）

- **单指拖拽**：平移图片（缩放 > 1 时可用）
- **双指捏合**：缩放图片
- **双击**：在 1x 和 2x 缩放之间切换

## 🌐 浏览器兼容性

- 现代浏览器（Chrome, Firefox, Safari, Edge）
- 需要 `PointerEvent`、`visualViewport`、`fullscreen API` 支持（不支持的浏览器会优雅降级）

## 📄 完整示例

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="node_modules/your-image-preview/dist/styles.css">
</head>
<body>
  <div id="app">
    <button id="previewBtn">预览图片</button>
  </div>
  <script type="module">
    import { openImagePreview, registerAction } from 'your-image-preview'

    // 全局添加一个“下载”按钮
    registerAction({
      key: 'download',
      title: '下载',
      icon: '💾',
      order: 85,
      handler: (ctx) => {
        const link = document.createElement('a')
        link.href = ctx.urls[ctx.index]
        link.download = ''
        link.click()
      }
    })

    document.getElementById('previewBtn').onclick = () => {
      openImagePreview({
        urls: [
          'https://picsum.photos/id/1015/1200/800',
          'https://picsum.photos/id/1018/1200/800',
          'https://picsum.photos/id/104/1200/800'
        ],
        mode: 'fullscreen',
        thumbnails: true,
        wheelSensitivity: 0.001,
        onChange: (idx) => console.log('切换至', idx),
        onClose: () => console.log('预览关闭')
      })
    }
  </script>
</body>
</html>
```

## 🛠️ 开发与构建

```bash
npm install
npm run build   # 使用 rollup 构建，输出到 dist/
```

## 📝 注意事项

- 图片跨域问题：确保图片服务器支持 CORS，或者将图片放在同源下。
- 容器模式下，挂载节点的 CSS `position` 若为 `static` 会被自动改为 `relative`。
- 组件不会自动为图片添加加载失败的重试机制，可在业务层监听 `onChange` 并结合 `setUrls` 更新。

## 📄 许可证

MIT

---

欢迎提 Issue 或 PR 贡献代码！