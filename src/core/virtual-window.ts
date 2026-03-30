import type { VirtualWindow, VirtualItem } from './types.js'
import type { PrefixSum } from './prefix-sum.js'

/**
 * Hot path: compute which items are visible given scroll position.
 * Pure arithmetic, zero DOM reads.
 */
export function computeWindow(
  scrollTop: number,
  viewportHeight: number,
  prefixSum: PrefixSum,
  count: number,
  overscan: number = 3
): VirtualWindow {
  if (count === 0) {
    return { items: [], totalHeight: 0, offsetY: 0, startIndex: 0, endIndex: 0 }
  }

  const totalHeight = prefixSum.total()

  // Find first and last visible items via binary search - both O(log n)
  let startIndex = prefixSum.findIndex(scrollTop)
  let endIndex = prefixSum.findIndex(scrollTop + viewportHeight)

  // Apply overscan
  startIndex = Math.max(0, startIndex - overscan)
  endIndex = Math.min(count - 1, endIndex + overscan)

  // Build items
  const items: VirtualItem[] = []
  for (let i = startIndex; i <= endIndex; i++) {
    items.push({
      index: i,
      offset: prefixSum.query(i),
      height: prefixSum.getHeight(i),
    })
  }

  const offsetY = prefixSum.query(startIndex)

  return {
    items,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
  }
}
