import type { PreviewMode } from './types'

interface ViewportMetrics {
  width: number
  height: number
  offsetTop: number
  offsetLeft: number
}

function readWindowViewport(): ViewportMetrics {
  const visual = window.visualViewport
  if (visual) {
    return {
      width: visual.width,
      height: visual.height,
      offsetTop: visual.offsetTop,
      offsetLeft: visual.offsetLeft,
    }
  }

  return {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
    offsetTop: 0,
    offsetLeft: 0,
  }
}

function readContainerViewport(target: HTMLElement): ViewportMetrics {
  const rect = target.getBoundingClientRect()
  return {
    width: Math.max(rect.width, 0),
    height: Math.max(rect.height, 0),
    offsetTop: 0,
    offsetLeft: 0,
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function lerp(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax <= inMin) return outMin
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1)
  return outMin + t * (outMax - outMin)
}

function resolveMetrics(
  mode: PreviewMode,
  mountTarget: HTMLElement,
): ViewportMetrics {
  if (mode === 'container') {
    return readContainerViewport(mountTarget)
  }
  return readWindowViewport()
}

/** 根据视口 / 容器大小计算主图初始缩放比例 */
export function computeInitialImageScale(
  stageEl: HTMLElement,
  imageEl: HTMLImageElement,
  mode: PreviewMode,
  mountTarget: HTMLElement,
): number {
  const stageRect = stageEl.getBoundingClientRect()
  const stageW = stageRect.width
  const stageH = stageRect.height
  if (stageW <= 0 || stageH <= 0) return 1

  const metrics = resolveMetrics(mode, mountTarget)
  // 手机约 60%，PC 约 80%，中间视口线性过渡
  const fillRatio = clamp(lerp(metrics.width, 480, 1280, 0.6, 0.9), 0.6, 0.9)

  const naturalW = imageEl.naturalWidth
  const naturalH = imageEl.naturalHeight
  if (!naturalW || !naturalH) return 1

  // object-fit contain 下，scale=1 时的渲染尺寸
  const containScale = Math.min(stageW / naturalW, stageH / naturalH)
  const renderedW = naturalW * containScale
  const renderedH = naturalH * containScale

  if (renderedW <= 0 || renderedH <= 0) return 1

  const targetW = stageW * fillRatio
  const targetH = stageH * fillRatio
  const initialScale = Math.min(targetW / renderedW, targetH / renderedH)
  const viewportMin = Math.min(metrics.width, metrics.height)
  const maxScale = viewportMin <= 480 ? 3 : viewportMin <= 768 ? 3.5 : 4
  return Number(clamp(initialScale, 0.45, maxScale).toFixed(4))
}

/** 根据视口 / 容器尺寸写入 CSS 变量，并校正 fullscreen 根节点位置 */
export function applyViewportLayout(
  root: HTMLElement,
  mode: PreviewMode,
  mountTarget: HTMLElement,
): void {
  const metrics = resolveMetrics(mode, mountTarget)
  const width = Math.max(metrics.width, 1)
  const height = Math.max(metrics.height, 1)
  const compact = width <= 640
  const narrow = width <= 480

  root.style.setProperty('--ip-vw', `${width}px`)
  root.style.setProperty('--ip-vh', `${height}px`)

  const thumbSize = narrow ? 48 : compact ? 52 : 56
  const btnSize = narrow ? 38 : compact ? 40 : 42
  const cornerBtnSize = narrow ? 44 : compact ? 46 : 48
  const btnFontSize = narrow ? 17 : compact ? 18 : 18
  const cornerFontSize = narrow ? 28 : compact ? 30 : 32
  const footerGap = narrow ? 6 : compact ? 8 : 10
  const footerPaddingX = narrow ? 6 : compact ? 8 : 12
  const footerPaddingY = narrow ? 6 : compact ? 8 : 10

  root.style.setProperty('--ip-thumb-size', `${thumbSize}px`)
  root.style.setProperty('--ip-btn-size', `${btnSize}px`)
  root.style.setProperty('--ip-corner-btn-size', `${cornerBtnSize}px`)
  root.style.setProperty('--ip-btn-font-size', `${btnFontSize}px`)
  root.style.setProperty('--ip-corner-font-size', `${cornerFontSize}px`)
  root.style.setProperty('--ip-footer-gap', `${footerGap}px`)
  root.style.setProperty('--ip-footer-padding-x', `${footerPaddingX}px`)
  root.style.setProperty('--ip-footer-padding-y', `${footerPaddingY}px`)

  if (mode === 'fullscreen') {
    root.style.top = `${metrics.offsetTop}px`
    root.style.left = `${metrics.offsetLeft}px`
    root.style.width = `${width}px`
    root.style.height = `${height}px`
  } else {
    root.style.top = ''
    root.style.left = ''
    root.style.width = ''
    root.style.height = ''
  }
}

export function lockBodyScroll(): string {
  const previous = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  return previous
}

export function restoreBodyScroll(previous: string): void {
  document.body.style.overflow = previous
}
