import type { AnchorState } from './types.js'
import type { PrefixSum } from './prefix-sum.js'

/**
 * Stabilizes scroll position when item heights change above viewport.
 *
 * Usage:
 *   const anchor = captureAnchor(scrollTop, prefixSum)
 *   // ... heights change ...
 *   const targetScrollTop = restoreAnchor(anchor, prefixSum)
 *   scrollContainer.scrollTop = targetScrollTop
 */

/** Capture the current anchor before height mutations. */
export function captureAnchor(scrollTop: number, prefixSum: PrefixSum): AnchorState {
  const index = prefixSum.findIndex(scrollTop)
  const itemOffset = prefixSum.query(index)
  return {
    index,
    offsetFromViewport: scrollTop - itemOffset,
  }
}

/** After height mutations, compute the corrected scrollTop to maintain visual position. */
export function restoreAnchor(anchor: AnchorState, prefixSum: PrefixSum): number {
  const newItemOffset = prefixSum.query(anchor.index)
  return newItemOffset + anchor.offsetFromViewport
}
