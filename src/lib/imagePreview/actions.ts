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
  console.log(globalActions,'globalActions')
}

export function resolveActions(
  instanceActions: PreviewAction[] = [],
): PreviewAction[] {
  const map = new Map<string, PreviewAction>()

  globalActions.forEach((action) => map.set(action.key, action))
  instanceActions.forEach((action) => {
    const existing = map.get(action.key)
    map.set(action.key, existing ? { ...existing, ...action } : action)
  })

  return Array.from(map.values()).sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  )
}

const icon = {
  zoomIn: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
	<path d="M0 0h24v24H0z" fill="none" />
	<path fill="currentColor" d="M18 10h-4V6a2 2 0 0 0-4 0l.071 4H6a2 2 0 0 0 0 4l4.071-.071L10 18a2 2 0 0 0 4 0v-4.071L18 14a2 2 0 0 0 0-4" />
</svg>

`,
  zoomOut: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	<path d="M0 0h24v24H0z" fill="none" />
	<path fill="currentColor" d="M19 13H5v-2h14z" />
</svg>
`,
  rotateLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 56 56">
	<path d="M0 0h56v56H0z" fill="none" />
	<path fill="currentColor" d="M25.656 49.504c1.57 0 2.742-1.172 2.742-2.742v-8.953h.68c9.07 0 14.813 2.297 18.89 9.96c.821 1.5 1.9 1.735 2.884 1.735c1.265 0 2.414-1.125 2.414-3.14c0-17.321-7.336-28.126-24.188-28.126h-.68v-8.86c0-1.57-1.171-2.882-2.788-2.882c-1.172 0-1.876.586-3.188 1.688L3.93 25.48c-.867.867-1.195 1.734-1.195 2.53c0 .774.328 1.641 1.195 2.509l18.492 17.46c1.172 1.008 2.062 1.524 3.234 1.524" />
</svg>
`,
  rotateRight: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 56 56">
	<path d="M0 0h56v56H0z" fill="none" />
	<path fill="currentColor" d="M30.344 49.504c1.148 0 2.039-.516 3.234-1.523L52.07 30.52c.867-.868 1.196-1.735 1.196-2.508c0-.797-.329-1.664-1.196-2.532L33.578 8.185c-1.336-1.102-2.039-1.688-3.188-1.688c-1.617 0-2.788 1.313-2.788 2.883v8.86h-.68c-16.852 0-24.188 10.804-24.188 28.124c0 2.016 1.149 3.14 2.39 3.14c1.009 0 2.087-.233 2.884-1.733c4.101-7.665 9.844-9.961 18.914-9.961h.68v8.953c0 1.57 1.171 2.742 2.742 2.742" />
</svg>
`,
  flipX: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	<path d="M0 0h24v24H0z" fill="none" />
	<path fill="currentColor" d="M19.235 13.234H4.765v3.494L0 11.964l4.765-4.765v3.494h14.47V7.199L24 11.964l-4.765 4.765z" />
</svg>
`,
  flipY: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	<path d="M0 0h24v24H0z" fill="none" />
	<path fill="currentColor" d="M11.3 19.5v-15h2.4v15H17L12.5 24L8 19.5zM12.5 0L17 4.5H8z" />
</svg>
`,
  reset: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 12 12">
	<path d="M0 0h12v12H0z" fill="none" />
	<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M10 4c-.8-1.1-2-2.5-4.1-2.5c-2.5 0-4.4 2-4.4 4.5s2 4.5 4.4 4.5c1.3 0 2.5-.6 3.3-1.5M11 1.5v3c0 .3-.2.5-.5.5h-3" />
</svg>
`,
  prev: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	<path d="M0 0h24v24H0z" fill="none" />
	<g fill="none" fill-rule="evenodd">
		<path d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
		<path fill="currentColor" d="M7.94 13.06a1.5 1.5 0 0 1 0-2.12l5.656-5.658a1.5 1.5 0 1 1 2.121 2.122L11.122 12l4.596 4.596a1.5 1.5 0 1 1-2.12 2.122l-5.66-5.658Z" />
	</g>
</svg>
`,
  next: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	<path d="M0 0h24v24H0z" fill="none" />
	<g fill="none" fill-rule="evenodd">
		<path d="M24 0v24H0V0zM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
		<path fill="currentColor" d="M16.06 10.94a1.5 1.5 0 0 1 0 2.12l-5.656 5.658a1.5 1.5 0 1 1-2.121-2.122L12.879 12L8.283 7.404a1.5 1.5 0 0 1 2.12-2.122l5.658 5.657Z" />
	</g>
</svg>`,
  nativeFullscreen: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	<path d="M0 0h24v24H0z" fill="none" />
	<path fill="currentColor" d="M8 5.14v14l11-7z" />
</svg>
`,
  exitNativeFullscreen: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	<path d="M0 0h24v24H0z" fill="none" />
	<path fill="currentColor" d="M7 5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" />
</svg>
`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
	<path d="M0 0h24v24H0z" fill="none" />
	<path fill="currentColor" d="M18.3 5.71a.996.996 0 0 0-1.41 0L12 10.59L7.11 5.7A.996.996 0 1 0 5.7 7.11L10.59 12L5.7 16.89a.996.996 0 1 0 1.41 1.41L12 13.41l4.89 4.89a.996.996 0 1 0 1.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4" />
</svg>
`,
}
const handlerSvgIcon = (svgTag = '') => {
  if (!svgTag) {
    return 'x'
  }
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgTag, 'image/svg+xml')
  const svg = doc.documentElement
  // 包装
  const wrapper = document.createElement('span')
  wrapper.style.display= 'flex'
  wrapper.style.alignItems= 'center'
  wrapper.style.justifyContent= 'center'
  wrapper.appendChild(svg)
  console.log(wrapper, 'wrapperwrapperwrapper')
  return wrapper
}
registerAction({
  key: 'zoomIn',
  title: '放大',
  icon: handlerSvgIcon(icon.zoomIn),
  order: 1,
  handler: (ctx) =>
    ctx.setState({ scale: Math.min(ctx.state.scale + 0.25, 5) }),
})

registerAction({
  key: 'zoomOut',
  title: '缩小',
  icon: handlerSvgIcon(icon.zoomOut),
  order: 2,
  handler: (ctx) =>
    ctx.setState({ scale: Math.max(ctx.state.scale - 0.25, 0.25) }),
})

registerAction({
  key: 'rotateLeft',
  title: '左旋转',
  icon: handlerSvgIcon(icon.rotateLeft),
  order: 7,
  handler: (ctx) => ctx.setState({ rotate: ctx.state.rotate - 90 }),
})

registerAction({
  key: 'reset',
  title: '重置',
  icon: handlerSvgIcon(icon.reset),
  order: 3,
  disabled: (ctx) => isDefaultTransform(ctx.state, ctx.baseScale),
  handler: (ctx) => ctx.resetTransform(),
})

registerAction({
  key: 'prev',
  title: '上一张',
  icon: handlerSvgIcon(icon.prev),
  order: 4,
  disabled: (ctx) => ctx.urls.length <= 1,
  handler: (ctx) => ctx.prev(),
})
registerAction({
  key: 'nativeFullscreen',
  title: '浏览器全屏',
  icon: (ctx) =>
    ctx.isNativeFullscreen
      ? handlerSvgIcon(icon.exitNativeFullscreen)
      : handlerSvgIcon(icon.nativeFullscreen),
  order: 5,
  visible: (ctx) => ctx.mode === 'fullscreen' && ctx.supportsNativeFullscreen,
  handler: (ctx) => ctx.toggleNativeFullscreen(),
})
registerAction({
  key: 'next',
  title: '下一张',
  icon: handlerSvgIcon(icon.next),
  order: 6,
  disabled: (ctx) => ctx.urls.length <= 1,
  handler: (ctx) => ctx.next(),
})

registerAction({
  key: 'flipY',
  title: '垂直翻转',
  icon: handlerSvgIcon(icon.flipY),
  order: 10,
  handler: (ctx) => ctx.setState({ flipY: !ctx.state.flipY }),
})

registerAction({
  key: 'rotateRight',
  title: '右旋转',
  icon: handlerSvgIcon(icon.rotateRight),
  order: 8,
  handler: (ctx) => ctx.setState({ rotate: ctx.state.rotate + 90 }),
})

registerAction({
  key: 'flipX',
  title: '水平翻转',
  icon: handlerSvgIcon(icon.flipX),
  order: 9,
  handler: (ctx) => ctx.setState({ flipX: !ctx.state.flipX }),
})

registerAction({
  key: 'close',
  title: '关闭',
  icon: handlerSvgIcon(icon.close),
  order: 11,
  placement: 'corner',
  handler: (ctx) => ctx.close(),
})
