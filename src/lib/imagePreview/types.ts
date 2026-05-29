export interface TransformState {
  scale: number
  rotate: number
  flipX: boolean
  flipY: boolean
  translateX: number
  translateY: number
}

export type PreviewMode = 'fullscreen' | 'container'

export interface PreviewContext {
  urls: string[]
  index: number
  state: TransformState
  baseScale: number
  mode: PreviewMode
  isNativeFullscreen: boolean
  supportsNativeFullscreen: boolean
  setState: (patch: Partial<TransformState>) => void
  resetTransform: () => void
  toggleNativeFullscreen: () => void
  prev: () => void
  next: () => void
  close: () => void
  root: HTMLElement | null
  mountTarget: HTMLElement
}

/** 图标：文字 / HTML 节点 / 动态渲染函数 */
export type PreviewActionIcon =
  | string
  | HTMLElement
  | ((ctx: PreviewContext) => string | HTMLElement)

export interface PreviewAction {
  key: string
  title?: string
  icon?: PreviewActionIcon
  order?: number
  placement?: 'toolbar' | 'corner'
  /** 自定义按钮 class，会与默认 class 合并 */
  className?: string
  visible?: (ctx: PreviewContext) => boolean
  disabled?: (ctx: PreviewContext) => boolean
  handler: (ctx: PreviewContext) => void
  /** 完全自定义按钮内容（在默认按钮创建后调用） */
  render?: (ctx: PreviewContext, button: HTMLButtonElement) => void
}

/** 操作栏 / 底部区域样式配置 */
export interface PreviewTheme {
  /** 追加到各区域的 class */
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
  /** 覆盖 CSS 变量，如 { '--ip-toolbar-bg': 'rgba(0,0,0,0.8)' } */
  cssVars?: Record<string, string>
  /** 按 action key 覆盖默认图标 */
  actionIcons?: Record<string, PreviewActionIcon>
}

export interface ThumbnailStripOptions {
  /** 是否显示，默认多图时显示 */
  show?: boolean
  className?: string
  itemClassName?: string
  activeItemClassName?: string
  /** 缩略图地址，默认与 urls 相同 */
  getUrl?: (url: string, index: number) => string
}

export interface ImagePreviewOptions {
  urls: string[]
  index?: number
  mountTo?: HTMLElement | string
  mode?: PreviewMode | 'auto'
  actions?: PreviewAction[]
  theme?: PreviewTheme
  /** 底部缩略图条，默认多图时开启 */
  thumbnails?: boolean | ThumbnailStripOptions
  /** 滚轮缩放灵敏度，默认 0.0012，值越小越慢 */
  wheelSensitivity?: number
  /** 浏览器原生全屏，fullscreen 模式下默认 auto（开启） */
  nativeFullscreen?: boolean | 'auto'
  /** 打开预览时自动进入浏览器全屏，默认 false */
  autoEnterNativeFullscreen?: boolean
  onChange?: (index: number) => void
  onClose?: () => void
}

export function isDefaultTransform(state: TransformState, baseScale = 1): boolean {
  return (
    Math.abs(state.scale - baseScale) < 0.001 &&
    state.rotate === 0 &&
    !state.flipX &&
    !state.flipY &&
    state.translateX === 0 &&
    state.translateY === 0
  )
}
