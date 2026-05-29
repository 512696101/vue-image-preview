import type { PreviewAction } from './types'
import { isDefaultTransform } from './types'

const globalActions: PreviewAction[] = []

/** 注册全局操作，所有预览实例都会继承 */
export function registerAction(action: PreviewAction): void {
  if (!action?.key || typeof action.handler !== 'function') {
    throw new Error('[imagePreview] action 需要 key 与 handler')
  }

  const index = globalActions.findIndex((item) => item.key === action.key)
  if (index >= 0) {
    globalActions[index] = { ...globalActions[index], ...action }
  } else {
    globalActions.push(action)
  }
}

export function resolveActions(instanceActions: PreviewAction[] = []): PreviewAction[] {
  const map = new Map<string, PreviewAction>()

  globalActions.forEach((action) => map.set(action.key, action))
  instanceActions.forEach((action) => {
    const existing = map.get(action.key)
    map.set(action.key, existing ? { ...existing, ...action } : action)
  })

  return Array.from(map.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

const icon = {
  zoomIn: '+',
  zoomOut: '−',
  rotateLeft: '↺',
  rotateRight: '↻',
  flipX: '⇋',
  flipY: '⇅',
  reset: '⟲',
  prev: '‹',
  next: '›',
  nativeFullscreen: '⛶',
  exitNativeFullscreen: '⤡',
  close: '×',
}

registerAction({
  key: 'zoomIn',
  title: '放大',
  icon: icon.zoomIn,
  order: 10,
  handler: (ctx) => ctx.setState({ scale: Math.min(ctx.state.scale + 0.25, 5) }),
})

registerAction({
  key: 'zoomOut',
  title: '缩小',
  icon: icon.zoomOut,
  order: 20,
  handler: (ctx) => ctx.setState({ scale: Math.max(ctx.state.scale - 0.25, 0.25) }),
})

registerAction({
  key: 'rotateLeft',
  title: '左旋转',
  icon: icon.rotateLeft,
  order: 30,
  handler: (ctx) => ctx.setState({ rotate: ctx.state.rotate - 90 }),
})

registerAction({
  key: 'rotateRight',
  title: '右旋转',
  icon: icon.rotateRight,
  order: 40,
  handler: (ctx) => ctx.setState({ rotate: ctx.state.rotate + 90 }),
})

registerAction({
  key: 'flipX',
  title: '水平翻转',
  icon: icon.flipX,
  order: 50,
  handler: (ctx) => ctx.setState({ flipX: !ctx.state.flipX }),
})

registerAction({
  key: 'flipY',
  title: '垂直翻转',
  icon: icon.flipY,
  order: 60,
  handler: (ctx) => ctx.setState({ flipY: !ctx.state.flipY }),
})

registerAction({
  key: 'reset',
  title: '重置',
  icon: icon.reset,
  order: 65,
  disabled: (ctx) => isDefaultTransform(ctx.state, ctx.baseScale),
  handler: (ctx) => ctx.resetTransform(),
})

registerAction({
  key: 'prev',
  title: '上一张',
  icon: icon.prev,
  order: 70,
  disabled: (ctx) => ctx.urls.length <= 1,
  handler: (ctx) => ctx.prev(),
})

registerAction({
  key: 'next',
  title: '下一张',
  icon: icon.next,
  order: 80,
  disabled: (ctx) => ctx.urls.length <= 1,
  handler: (ctx) => ctx.next(),
})

registerAction({
  key: 'nativeFullscreen',
  title: '浏览器全屏',
  icon: (ctx) =>
    ctx.isNativeFullscreen ? icon.exitNativeFullscreen : icon.nativeFullscreen,
  order: 85,
  visible: (ctx) => ctx.mode === 'fullscreen' && ctx.supportsNativeFullscreen,
  handler: (ctx) => ctx.toggleNativeFullscreen(),
})

registerAction({
  key: 'close',
  title: '关闭',
  icon: icon.close,
  order: 1000,
  placement: 'corner',
  handler: (ctx) => ctx.close(),
})
