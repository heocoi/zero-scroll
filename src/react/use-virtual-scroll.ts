import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { PrefixSum } from '../core/prefix-sum.js'
import { HeightCache } from '../core/cache.js'
import { computeWindow } from '../core/virtual-window.js'
import { captureAnchor, restoreAnchor } from '../core/scroll-anchor.js'
import type { HeightProvider, VirtualItem } from '../core/types.js'

export interface UseVirtualScrollConfig {
  count: number
  heightProvider: HeightProvider
  overscan?: number
  scrollRef: React.RefObject<HTMLElement | null>
}

export interface UseVirtualScrollResult {
  items: VirtualItem[]
  totalHeight: number
  offsetY: number
  invalidate: (index: number) => void
  invalidateAll: () => void
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void
}

export function useVirtualScroll(config: UseVirtualScrollConfig): UseVirtualScrollResult {
  const { count, heightProvider, overscan = 3, scrollRef } = config

  // Stable refs for internal state
  const internals = useRef<{
    prefixSum: PrefixSum
    cache: HeightCache
    heightProvider: HeightProvider
    count: number
    lastStartIndex: number
    lastEndIndex: number
  } | null>(null)

  // Track config refs for effect dependencies without causing re-render
  const configRef = useRef({ count, heightProvider, overscan })
  configRef.current = { count, heightProvider, overscan }

  // State for visible items (only updates when range changes)
  const [windowState, setWindowState] = useState<ReturnType<typeof computeWindow> | null>(null)

  // Init/reinit before paint to avoid flash of empty content
  useLayoutEffect(() => {
    const prev = internals.current

    if (!prev || prev.count !== count || prev.heightProvider !== heightProvider) {
      let prefixSum: PrefixSum

      if (prev && prev.count !== count && prev.heightProvider === heightProvider) {
        // Count changed, same provider: resize to preserve existing heights
        prefixSum = prev.prefixSum
        prefixSum.resize(count)
      } else {
        // New provider or first init: fresh PrefixSum
        prefixSum = new PrefixSum(count)
      }

      const cache = new HeightCache(prefixSum, heightProvider)
      cache.rebuild()
      internals.current = {
        prefixSum,
        cache,
        heightProvider,
        count,
        lastStartIndex: -1,
        lastEndIndex: -1,
      }
    }

    // Compute initial window
    const el = scrollRef.current
    const internal = internals.current!
    const scrollTop = el ? el.scrollTop : 0
    const viewportHeight = el ? el.clientHeight : 0
    const win = computeWindow(scrollTop, viewportHeight, internal.prefixSum, count, overscan)
    internal.lastStartIndex = win.startIndex
    internal.lastEndIndex = win.endIndex
    setWindowState(win)
  }, [count, heightProvider, overscan, scrollRef])

  // Scroll handler
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    let rafId: number | null = null

    const onScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const internal = internals.current
        if (!internal) return

        const { count: c, overscan: o } = configRef.current
        const win = computeWindow(
          el.scrollTop,
          el.clientHeight,
          internal.prefixSum,
          c,
          o
        )

        if (
          win.startIndex !== internal.lastStartIndex ||
          win.endIndex !== internal.lastEndIndex
        ) {
          internal.lastStartIndex = win.startIndex
          internal.lastEndIndex = win.endIndex
          setWindowState(win)
        }
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })

    const ro = new ResizeObserver(() => onScroll())
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [scrollRef])

  const invalidate = useCallback((index: number) => {
    const internal = internals.current
    const el = scrollRef.current
    if (!internal || !el) return

    const anchor = captureAnchor(el.scrollTop, internal.prefixSum)
    internal.cache.invalidate(index)
    const targetScrollTop = restoreAnchor(anchor, internal.prefixSum)
    el.scrollTop = targetScrollTop

    const { count: c, overscan: o } = configRef.current
    const win = computeWindow(el.scrollTop, el.clientHeight, internal.prefixSum, c, o)
    internal.lastStartIndex = win.startIndex
    internal.lastEndIndex = win.endIndex
    setWindowState(win)
  }, [scrollRef])

  const invalidateAll = useCallback(() => {
    const internal = internals.current
    const el = scrollRef.current
    if (!internal || !el) return

    internal.cache.rebuild()
    const { count: c, overscan: o } = configRef.current
    const win = computeWindow(el.scrollTop, el.clientHeight, internal.prefixSum, c, o)
    internal.lastStartIndex = win.startIndex
    internal.lastEndIndex = win.endIndex
    setWindowState(win)
  }, [scrollRef])

  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    const internal = internals.current
    const el = scrollRef.current
    if (!internal || !el) return

    const itemOffset = internal.prefixSum.query(index)
    const itemHeight = internal.prefixSum.getHeight(index)
    const viewportHeight = el.clientHeight

    let scrollTop: number
    switch (align) {
      case 'start':
        scrollTop = itemOffset
        break
      case 'center':
        scrollTop = itemOffset - (viewportHeight - itemHeight) / 2
        break
      case 'end':
        scrollTop = itemOffset - viewportHeight + itemHeight
        break
    }

    el.scrollTop = Math.max(0, scrollTop)

    // Ensure window updates even if scroll position didn't change
    const { count: c, overscan: o } = configRef.current
    const win = computeWindow(el.scrollTop, el.clientHeight, internal.prefixSum, c, o)
    internal.lastStartIndex = win.startIndex
    internal.lastEndIndex = win.endIndex
    setWindowState(win)
  }, [scrollRef])

  // Before first effect runs, return empty state
  const win = windowState ?? { items: [], totalHeight: 0, offsetY: 0, startIndex: 0, endIndex: 0 }

  return {
    items: win.items,
    totalHeight: win.totalHeight,
    offsetY: win.offsetY,
    invalidate,
    invalidateAll,
    scrollToIndex,
  }
}
