/** Provides height for items. Implement this for each content type. */
export interface HeightProvider {
  getHeight(index: number): number
  /** Invalidate cached measurement. Returns true if the item existed in cache. */
  invalidate(index: number): boolean
  invalidateAll(): void
}

/** What the virtual window calculator returns each frame. */
export interface VirtualWindow {
  items: VirtualItem[]
  totalHeight: number
  /** translateY offset for the item container */
  offsetY: number
  startIndex: number
  endIndex: number
}

export interface VirtualItem {
  index: number
  /** Absolute Y offset from top of scroll container */
  offset: number
  height: number
}

/** Text item descriptor for pretext-based measurement. */
export interface TextItemDescriptor {
  text: string
  /** CSS font shorthand, e.g. "16px Inter" */
  font: string
  /** Line height in px */
  lineHeight: number
  /** Container width in px (minus padding) */
  maxWidth: number
  padding?: { top?: number; bottom?: number }
  whiteSpace?: 'normal' | 'pre-wrap'
}

/** Pretext module interface (injected, not imported). */
export interface PretextAPI {
  prepare(text: string, font: string, options?: { whiteSpace?: string }): unknown
  layout(prepared: unknown, maxWidth: number, lineHeight: number): { height: number; lineCount: number }
}

/** Scroll anchor state for position stabilization. */
export interface AnchorState {
  index: number
  offsetFromViewport: number
}
