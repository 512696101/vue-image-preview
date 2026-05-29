import './styles.css'
import { resolveActions } from './actions'
import { applyViewportLayout, computeInitialImageScale, lockBodyScroll, restoreBodyScroll } from './viewport'
import type {
  ImagePreviewOptions,
  PreviewAction,
  PreviewActionIcon,
  PreviewContext,
  PreviewMode,
  PreviewTheme,
  ThumbnailStripOptions,
  TransformState,
} from './types'

export type {
  ImagePreviewOptions,
  PreviewAction,
  PreviewActionIcon,
  PreviewContext,
  PreviewMode,
  PreviewTheme,
  ThumbnailStripOptions,
  TransformState,
}

export { registerAction, resolveActions } from './actions'
export { isDefaultTransform } from './types'

let activeInstance: ImagePreview | null = null

function resolveMountTarget(mountTo?: HTMLElement | string): HTMLElement {
  if (!mountTo || mountTo === document.body) return document.body
  if (typeof mountTo === 'string') {
    const node = document.querySelector(mountTo)
    if (!node) throw new Error(`[imagePreview] 找不到挂载节点: ${mountTo}`)
    return node as HTMLElement
  }
  return mountTo
}

function resolveMode(
  target: HTMLElement,
  mode: ImagePreviewOptions['mode'] = 'auto',
): PreviewMode {
  if (mode === 'fullscreen') return 'fullscreen'
  if (mode === 'container') return 'container'
  return target === document.body ? 'fullscreen' : 'container'
}

function createDefaultState(): TransformState {
  return {
    scale: 1,
    rotate: 0,
    flipX: false,
    flipY: false,
    translateX: 0,
    translateY: 0,
  }
}

function resolveNativeFullscreen(
  mode: PreviewMode,
  value: ImagePreviewOptions['nativeFullscreen'] = 'auto',
): boolean {
  if (value === 'auto') return mode === 'fullscreen'
  return value
}

function resolveThumbnailOptions(
  thumbnails: ImagePreviewOptions['thumbnails'],
  urlCount: number,
): ThumbnailStripOptions & { enabled: boolean } {
  if (thumbnails === false) {
    return { enabled: false }
  }

  const options: ThumbnailStripOptions =
    typeof thumbnails === 'object' ? thumbnails : {}

  const enabled = options.show ?? urlCount > 1
  return { ...options, enabled }
}

function appendClasses(el: HTMLElement, ...classes: Array<string | undefined>) {
  classes.filter(Boolean).forEach((cls) => {
    cls!.split(/\s+/).filter(Boolean).forEach((name) => el.classList.add(name))
  })
}

function applyCssVars(el: HTMLElement, cssVars?: Record<string, string>) {
  if (!cssVars) return
  Object.entries(cssVars).forEach(([key, value]) => {
    el.style.setProperty(key, value)
  })
}

function setButtonIcon(button: HTMLButtonElement, icon: PreviewActionIcon, ctx: PreviewContext) {
  button.replaceChildren()

  const content = typeof icon === 'function' ? icon(ctx) : icon
  if (content instanceof Element) {
    button.appendChild(content)
    return
  }

  button.textContent = content
}

function resolveActionIcon(
  action: PreviewAction,
  theme: PreviewTheme | undefined,
  ctx: PreviewContext,
): PreviewActionIcon {
  if (action.icon !== undefined) {
    return typeof action.icon === 'function' ? action.icon(ctx) : action.icon
  }

  const themed = theme?.actionIcons?.[action.key]
  if (themed !== undefined) {
    return typeof themed === 'function' ? themed(ctx) : themed
  }

  return action.title || action.key
}

export class ImagePreview {
  urls: string[]
  index: number
  mountTarget: HTMLElement
  mode: PreviewMode
  instanceActions: PreviewAction[]
  theme?: PreviewTheme
  thumbnailOptions: ThumbnailStripOptions & { enabled: boolean }
  wheelSensitivity: number
  nativeFullscreenEnabled: boolean
  autoEnterNativeFullscreen: boolean
  isNativeFullscreen = false
  onChange?: (index: number) => void
  onClose?: () => void

  state: TransformState
  baseScale = 1
  visible = false
  loading = false

  root: HTMLElement | null = null
  stageEl: HTMLElement | null = null
  imageEl: HTMLImageElement | null = null
  footerEl: HTMLElement | null = null
  toolbarEl: HTMLElement | null = null
  thumbnailsEl: HTMLElement | null = null
  thumbnailsInnerEl: HTMLElement | null = null
  cornerEl: HTMLElement | null = null
  counterEl: HTMLElement | null = null

  private _handleKeydown: (event: KeyboardEvent) => void
  private _handleWheel: (event: WheelEvent) => void
  private _handleFullscreenChange: () => void
  private _handlePointerDown: (event: PointerEvent) => void
  private _handlePointerMove: (event: PointerEvent) => void
  private _handlePointerUp: (event: PointerEvent) => void
  private _handleViewportChange: () => void
  private _savedContainerPosition = ''
  private _savedBodyOverflow = ''
  private _dragState = {
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startTranslateX: 0,
    startTranslateY: 0,
  }

  constructor(options: ImagePreviewOptions = { urls: [] }) {
    this.urls = [...(options.urls || [])]
    this.index = options.index ?? 0
    this.mountTarget = resolveMountTarget(options.mountTo)
    this.mode = resolveMode(this.mountTarget, options.mode ?? 'auto')
    this.instanceActions = options.actions || []
    this.theme = options.theme
    this.thumbnailOptions = resolveThumbnailOptions(options.thumbnails, this.urls.length)
    this.wheelSensitivity = options.wheelSensitivity ?? 0.0012
    this.nativeFullscreenEnabled = resolveNativeFullscreen(
      this.mode,
      options.nativeFullscreen ?? 'auto',
    )
    this.autoEnterNativeFullscreen = options.autoEnterNativeFullscreen ?? false
    this.onChange = options.onChange
    this.onClose = options.onClose

    this.state = createDefaultState()
    this._handleKeydown = this._handleKeydownImpl.bind(this)
    this._handleWheel = this._handleWheelImpl.bind(this)
    this._handleFullscreenChange = this._handleFullscreenChangeImpl.bind(this)
    this._handlePointerDown = this._handlePointerDownImpl.bind(this)
    this._handlePointerMove = this._handlePointerMoveImpl.bind(this)
    this._handlePointerUp = this._handlePointerUpImpl.bind(this)
    this._handleViewportChange = this._handleViewportChangeImpl.bind(this)
  }

  setUrls(urls: string[]): this {
    this.urls = [...urls]
    if (this.index >= this.urls.length) {
      this.index = Math.max(this.urls.length - 1, 0)
    }
    this.thumbnailOptions = {
      ...this.thumbnailOptions,
      enabled: this.thumbnailOptions.show ?? this.urls.length > 1,
    }
    if (this.visible) {
      this._renderImage()
      this._renderFooter()
      this._syncViewportLayout()
    }
    return this
  }

  open(index = this.index): this {
    if (!this.urls.length) return this

    if (activeInstance && activeInstance !== this) {
      activeInstance.close()
    }

    this.index = Math.min(Math.max(index, 0), this.urls.length - 1)
    this.state = createDefaultState()
    this.baseScale = 1
    this.visible = true
    activeInstance = this

    this._mount()
    this._renderImage()
    this._renderFooter()
    this._syncViewportLayout()
    this._bindViewportListeners()

    if (this.mode === 'fullscreen') {
      this._savedBodyOverflow = lockBodyScroll()
    }

    document.addEventListener('keydown', this._handleKeydown)
    document.addEventListener('fullscreenchange', this._handleFullscreenChange)

    if (this.nativeFullscreenEnabled && this.autoEnterNativeFullscreen) {
      void this._enterNativeFullscreen()
    }

    return this
  }

  close(): this {
    if (!this.visible) return this

    this.visible = false
    document.removeEventListener('keydown', this._handleKeydown)
    document.removeEventListener('fullscreenchange', this._handleFullscreenChange)
    this._unbindViewportListeners()

    if (this.mode === 'fullscreen') {
      restoreBodyScroll(this._savedBodyOverflow)
    }

    if (this.stageEl) {
      this._unbindDragEvents(this.stageEl)
      this.stageEl.removeEventListener('wheel', this._handleWheel)
    }

    void this._exitNativeFullscreen()

    if (this.root?.parentNode) {
      this.root.parentNode.removeChild(this.root)
    }

    if (this.mode === 'container' && this.mountTarget) {
      this.mountTarget.style.position = this._savedContainerPosition
    }

    this.root = null
    this.stageEl = null
    this.imageEl = null
    this.footerEl = null
    this.toolbarEl = null
    this.thumbnailsEl = null
    this.thumbnailsInnerEl = null
    this.cornerEl = null
    this.counterEl = null
    this.isNativeFullscreen = false

    if (activeInstance === this) activeInstance = null
    this.onClose?.()

    return this
  }

  destroy(): this {
    this.close()
    return this
  }

  prev(): this {
    if (this.urls.length <= 1) return this
    this.goTo((this.index - 1 + this.urls.length) % this.urls.length)
    return this
  }

  next(): this {
    if (this.urls.length <= 1) return this
    this.goTo((this.index + 1) % this.urls.length)
    return this
  }

  goTo(index: number): this {
    if (!this.urls.length) return this
    const nextIndex = Math.min(Math.max(index, 0), this.urls.length - 1)
    if (nextIndex === this.index) return this

    this.index = nextIndex
    this.state = createDefaultState()
    this.baseScale = 1
    this._renderImage()
    this._updateThumbnailActive()
    this._updateCounter()
    this._updateToolbarStates()
    this.onChange?.(this.index)
    return this
  }

  setState(patch: Partial<TransformState>): this {
    this._patchState(patch, true)
    return this
  }

  resetTransform(): this {
    this.state = { ...createDefaultState(), scale: this.baseScale }
    this._applyTransform()
    this._updateToolbarStates()
    return this
  }

  toggleNativeFullscreen(): this {
    if (this.isNativeFullscreen) {
      void this._exitNativeFullscreen()
    } else {
      void this._enterNativeFullscreen()
    }
    return this
  }

  get supportsNativeFullscreen(): boolean {
    return this.nativeFullscreenEnabled && Boolean(document.fullscreenEnabled && this.root)
  }

  getContext(): PreviewContext {
    return {
      urls: this.urls,
      index: this.index,
      state: { ...this.state },
      baseScale: this.baseScale,
      mode: this.mode,
      isNativeFullscreen: this.isNativeFullscreen,
      supportsNativeFullscreen: this.supportsNativeFullscreen,
      setState: (patch) => this.setState(patch),
      resetTransform: () => this.resetTransform(),
      toggleNativeFullscreen: () => this.toggleNativeFullscreen(),
      prev: () => this.prev(),
      next: () => this.next(),
      close: () => this.close(),
      root: this.root,
      mountTarget: this.mountTarget,
    }
  }

  private _mount(): void {
    if (this.mode === 'container') {
      const position = getComputedStyle(this.mountTarget).position
      if (position === 'static') {
        this._savedContainerPosition = this.mountTarget.style.position
        this.mountTarget.style.position = 'relative'
      } else {
        this._savedContainerPosition = this.mountTarget.style.position
      }
    }

    const root = document.createElement('div')
    appendClasses(
      root,
      'image-preview-root',
      `image-preview-root--${this.mode}`,
      this.theme?.classNames?.root,
    )
    root.setAttribute('data-image-preview', 'true')
    applyCssVars(root, this.theme?.cssVars)

    const stage = document.createElement('div')
    stage.className = 'image-preview-stage'

    const image = document.createElement('img')
    image.className = 'image-preview-image'
    image.alt = 'preview'

    const corner = document.createElement('div')
    appendClasses(corner, 'image-preview-corner', this.theme?.classNames?.corner)

    const footer = document.createElement('div')
    appendClasses(footer, 'image-preview-footer', this.theme?.classNames?.footer)

    const toolbar = document.createElement('div')
    appendClasses(toolbar, 'image-preview-toolbar', this.theme?.classNames?.toolbar)

    const thumbnails = document.createElement('div')
    appendClasses(
      thumbnails,
      'image-preview-thumbnails',
      this.thumbnailOptions.className,
      this.theme?.classNames?.thumbnailStrip,
    )

    const thumbnailsInner = document.createElement('div')
    thumbnailsInner.className = 'image-preview-thumbnails-inner'
    thumbnails.appendChild(thumbnailsInner)

    const counter = document.createElement('span')
    appendClasses(counter, 'image-preview-counter', this.theme?.classNames?.counter)

    stage.appendChild(image)
    footer.appendChild(toolbar)
    footer.appendChild(thumbnails)
    toolbar.appendChild(counter)

    const main = document.createElement('div')
    main.className = 'image-preview-main'
    main.appendChild(stage)
    main.appendChild(corner)
    root.appendChild(main)
    root.appendChild(footer)

    stage.addEventListener('wheel', this._handleWheel, { passive: false })
    stage.addEventListener('dblclick', () => {
      const zoomedIn = this.state.scale > this.baseScale * 1.05
      this.setState({
        scale: zoomedIn ? this.baseScale : Math.min(this.baseScale * 2, 5),
        ...(zoomedIn ? { translateX: 0, translateY: 0 } : {}),
      })
    })
    this._bindDragEvents(stage)

    this.root = root
    this.stageEl = stage
    this.imageEl = image
    this.footerEl = footer
    this.toolbarEl = toolbar
    this.thumbnailsEl = thumbnails
    this.thumbnailsInnerEl = thumbnailsInner
    this.cornerEl = corner
    this.counterEl = counter

    this.mountTarget.appendChild(root)
  }

  private _renderImage(): void {
    if (!this.imageEl) return

    const url = this.urls[this.index]
    this.loading = true
    this.imageEl.style.opacity = '0.4'

    const loader = document.createElement('div')
    loader.className = 'image-preview-loading'
    loader.textContent = '加载中...'
    this.stageEl?.querySelector('.image-preview-loading')?.remove()
    this.stageEl?.appendChild(loader)

    this.imageEl.onload = () => {
      this.loading = false
      if (this.imageEl) this.imageEl.style.opacity = '1'
      loader.remove()
      this._syncViewportLayout()
      this._applyInitialImageScale()
    }

    this.imageEl.onerror = () => {
      this.loading = false
      loader.textContent = '图片加载失败'
      if (this.imageEl) this.imageEl.style.opacity = '0'
    }

    this.imageEl.src = url
    this._applyTransform()
  }

  private _patchState(patch: Partial<TransformState>, updateToolbar: boolean): void {
    this.state = { ...this.state, ...patch }
    this._applyTransform()
    if (updateToolbar) this._updateToolbarStates()
  }

  private _applyTransform(): void {
    if (!this.imageEl) return

    const { scale, rotate, flipX, flipY, translateX, translateY } = this.state
    const scaleX = flipX ? -scale : scale
    const scaleY = flipY ? -scale : scale
    this.imageEl.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg) scale(${scaleX}, ${scaleY})`

    const canPan =
      this.state.scale > this.baseScale * 1.02 ||
      this.state.translateX !== 0 ||
      this.state.translateY !== 0
    this.stageEl?.classList.toggle('image-preview-stage--pannable', canPan)
  }

  private _applyInitialImageScale(): void {
    if (!this.stageEl || !this.imageEl) return

    this.baseScale = computeInitialImageScale(
      this.stageEl,
      this.imageEl,
      this.mode,
      this.mountTarget,
    )
    this.state = { ...createDefaultState(), scale: this.baseScale }
    this._applyTransform()
    this._updateToolbarStates()
  }

  private _bindDragEvents(stage: HTMLElement): void {
    stage.addEventListener('pointerdown', this._handlePointerDown)
    stage.addEventListener('pointermove', this._handlePointerMove)
    stage.addEventListener('pointerup', this._handlePointerUp)
    stage.addEventListener('pointercancel', this._handlePointerUp)
  }

  private _unbindDragEvents(stage: HTMLElement): void {
    stage.removeEventListener('pointerdown', this._handlePointerDown)
    stage.removeEventListener('pointermove', this._handlePointerMove)
    stage.removeEventListener('pointerup', this._handlePointerUp)
    stage.removeEventListener('pointercancel', this._handlePointerUp)
  }

  private _handlePointerDownImpl(event: PointerEvent): void {
    if (!this.visible || event.button !== 0) return
    if (!(event.target instanceof HTMLElement)) return
    if (!event.target.closest('.image-preview-image')) return

    this._dragState = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTranslateX: this.state.translateX,
      startTranslateY: this.state.translateY,
    }

    this.stageEl?.classList.add('is-dragging')
    this.imageEl?.classList.add('is-dragging')
    this.stageEl?.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  private _handlePointerMoveImpl(event: PointerEvent): void {
    if (!this._dragState.active || event.pointerId !== this._dragState.pointerId) return

    const deltaX = event.clientX - this._dragState.startX
    const deltaY = event.clientY - this._dragState.startY

    this._patchState(
      {
        translateX: this._dragState.startTranslateX + deltaX,
        translateY: this._dragState.startTranslateY + deltaY,
      },
      false,
    )
  }

  private _handlePointerUpImpl(event: PointerEvent): void {
    if (!this._dragState.active || event.pointerId !== this._dragState.pointerId) return

    this._dragState.active = false
    this._dragState.pointerId = -1
    this.stageEl?.classList.remove('is-dragging')
    this.imageEl?.classList.remove('is-dragging')

    if (this.stageEl?.hasPointerCapture(event.pointerId)) {
      this.stageEl.releasePointerCapture(event.pointerId)
    }

    this._updateToolbarStates()
  }

  private async _enterNativeFullscreen(): Promise<void> {
    if (!this.root || !document.fullscreenEnabled || this.isNativeFullscreen) return

    try {
      await this.root.requestFullscreen()
    } catch {
      // 用户拒绝或不支持时静默失败
    }
  }

  private async _exitNativeFullscreen(): Promise<void> {
    if (!document.fullscreenElement) return

    try {
      await document.exitFullscreen()
    } catch {
      // ignore
    }
  }

  private _handleFullscreenChangeImpl(): void {
    const active = document.fullscreenElement === this.root
    if (this.isNativeFullscreen === active) return

    this.isNativeFullscreen = active
    this._updateToolbarStates()
    this._syncViewportLayout()

    const nativeAction = this.toolbarEl?.querySelector('[data-action-key="nativeFullscreen"]')
    const action = resolveActions(this.instanceActions).find(
      (item) => item.key === 'nativeFullscreen',
    )
    if (action && nativeAction instanceof HTMLButtonElement) {
      const ctx = this.getContext()
      setButtonIcon(nativeAction, resolveActionIcon(action, this.theme, ctx), ctx)
      nativeAction.title = this.isNativeFullscreen ? '退出浏览器全屏' : '浏览器全屏'
    }
  }

  private _renderFooter(): void {
    this._renderToolbarButtons()
    this._renderThumbnails()
    this._updateCounter()
    this._syncViewportLayout()
  }

  private _syncViewportLayout(): void {
    if (!this.root) return
    applyViewportLayout(this.root, this.mode, this.mountTarget)
  }

  private _bindViewportListeners(): void {
    window.addEventListener('resize', this._handleViewportChange)
    window.addEventListener('orientationchange', this._handleViewportChange)
    window.visualViewport?.addEventListener('resize', this._handleViewportChange)
    window.visualViewport?.addEventListener('scroll', this._handleViewportChange)
  }

  private _unbindViewportListeners(): void {
    window.removeEventListener('resize', this._handleViewportChange)
    window.removeEventListener('orientationchange', this._handleViewportChange)
    window.visualViewport?.removeEventListener('resize', this._handleViewportChange)
    window.visualViewport?.removeEventListener('scroll', this._handleViewportChange)
  }

  private _handleViewportChangeImpl(): void {
    if (!this.visible) return
    this._syncViewportLayout()
  }

  private _renderToolbarButtons(): void {
    if (!this.toolbarEl || !this.counterEl) return

    const ctx = this.getContext()
    const actions = resolveActions(this.instanceActions)

    Array.from(this.toolbarEl.querySelectorAll('.image-preview-btn')).forEach((node) =>
      node.remove(),
    )
    this.cornerEl?.replaceChildren()

    actions.forEach((action) => {
      if (action.visible && !action.visible(ctx)) return

      const placement = action.placement ?? 'toolbar'
      const button = this._createActionButton(action, ctx)

      if (placement === 'corner') {
        this.cornerEl?.appendChild(button)
      } else {
        this.toolbarEl!.insertBefore(button, this.counterEl)
      }
    })
  }

  private _renderThumbnails(): void {
    if (!this.thumbnailsEl || !this.thumbnailsInnerEl) return

    this.thumbnailsInnerEl.replaceChildren()

    if (!this.thumbnailOptions.enabled || this.urls.length === 0) {
      this.thumbnailsEl.style.display = 'none'
      return
    }

    this.thumbnailsEl.style.display = ''

    this.urls.forEach((url, index) => {
      const thumbUrl = this.thumbnailOptions.getUrl?.(url, index) ?? url
      const button = document.createElement('button')
      button.type = 'button'
      appendClasses(
        button,
        'image-preview-thumb',
        this.thumbnailOptions.itemClassName,
        this.theme?.classNames?.thumbnailItem,
        index === this.index ? 'image-preview-thumb--active' : undefined,
        index === this.index ? this.thumbnailOptions.activeItemClassName : undefined,
        index === this.index ? this.theme?.classNames?.thumbnailItemActive : undefined,
      )
      button.title = `第 ${index + 1} 张`
      button.addEventListener('click', (event) => {
        event.stopPropagation()
        this.goTo(index)
      })

      const img = document.createElement('img')
      img.src = thumbUrl
      img.alt = ''
      button.appendChild(img)
      this.thumbnailsInnerEl.appendChild(button)
    })

    this._scrollActiveThumbnailIntoView(false)
  }

  private _updateThumbnailActive(): void {
    if (!this.thumbnailsEl || !this.thumbnailOptions.enabled) return

    const items = this.thumbnailsEl.querySelectorAll('.image-preview-thumb')
    items.forEach((node, index) => {
      const button = node as HTMLButtonElement
      const active = index === this.index
      button.classList.toggle('image-preview-thumb--active', active)

      const activeClass = this.thumbnailOptions.activeItemClassName
      const themeActiveClass = this.theme?.classNames?.thumbnailItemActive
      if (activeClass) button.classList.toggle(activeClass, active)
      if (themeActiveClass) button.classList.toggle(themeActiveClass, active)
    })

    this._scrollActiveThumbnailIntoView(true)
  }

  private _scrollActiveThumbnailIntoView(smooth: boolean): void {
    if (!this.thumbnailsEl) return
    const active = this.thumbnailsEl.querySelector('.image-preview-thumb--active')
    active?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'nearest',
      inline: 'center',
    })
  }

  private _updateCounter(): void {
    if (!this.counterEl) return
    this.counterEl.textContent =
      this.urls.length > 1 ? `${this.index + 1} / ${this.urls.length}` : ''
    this.counterEl.style.display = this.urls.length > 1 ? '' : 'none'
  }

  private _updateToolbarStates(): void {
    if (!this.toolbarEl && !this.cornerEl) return

    const ctx = this.getContext()
    const actions = resolveActions(this.instanceActions)
    const actionMap = new Map(actions.map((action) => [action.key, action]))

    const buttons = [
      ...Array.from(this.toolbarEl?.querySelectorAll('.image-preview-btn') ?? []),
      ...Array.from(this.cornerEl?.querySelectorAll('.image-preview-btn') ?? []),
    ]

    buttons.forEach((node) => {
      const button = node as HTMLButtonElement
      const action = actionMap.get(button.dataset.actionKey || '')
      if (!action) return
      button.disabled = Boolean(action.disabled?.(ctx))
    })
  }

  private _createActionButton(action: PreviewAction, ctx: PreviewContext): HTMLButtonElement {
    console.log(action,'action')
    const placement = action.placement ?? 'toolbar'
    const button = document.createElement('button')
    button.type = 'button'

    const defaultClass =
      placement === 'corner'
        ? 'image-preview-btn image-preview-btn--corner'
        : 'image-preview-btn'
    const themeClass =
      placement === 'corner'
        ? this.theme?.classNames?.cornerBtn
        : this.theme?.classNames?.toolbarBtn

    appendClasses(button, defaultClass, themeClass, action.className)
    button.title = action.title || action.key
    button.dataset.actionKey = action.key

    const icon = resolveActionIcon(action, this.theme, ctx)
    console.log(icon,'icon')
    setButtonIcon(button, icon, ctx)
    action.render?.(ctx, button)

    button.disabled = Boolean(action.disabled?.(ctx))

    button.addEventListener('click', (event) => {
      event.stopPropagation()
      if (button.disabled) return
      action.handler(this.getContext())
    })

    return button
  }

  private _handleKeydownImpl(event: KeyboardEvent): void {
    if (!this.visible) return

    const map: Record<string, () => void> = {
      Escape: () => {
        if (this.isNativeFullscreen) {
          void this._exitNativeFullscreen()
          return
        }
        this.close()
      },
      ArrowLeft: () => this.prev(),
      ArrowRight: () => this.next(),
      '+': () => this.setState({ scale: Math.min(this.state.scale + 0.25, 5) }),
      '-': () => this.setState({ scale: Math.max(this.state.scale - 0.25, 0.25) }),
      '0': () => this.resetTransform(),
    }

    const handler = map[event.key]
    if (handler) {
      event.preventDefault()
      handler()
    }
  }

  private _handleWheelImpl(event: WheelEvent): void {
    if (!this.visible) return
    event.preventDefault()

    let delta = event.deltaY
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 16
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= 800

    const scaleDelta = -delta * this.wheelSensitivity
    const nextScale = Math.min(Math.max(this.state.scale + scaleDelta, 0.25), 5)
    this.setState({ scale: Number(nextScale.toFixed(4)) })
  }
}

export function createImagePreview(options: ImagePreviewOptions): ImagePreview {
  return new ImagePreview(options)
}

export function openImagePreview(options: ImagePreviewOptions): ImagePreview {
  return createImagePreview(options).open(options.index ?? 0)
}
