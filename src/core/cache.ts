import type { HeightProvider } from './types.js'
import type { PrefixSum } from './prefix-sum.js'

/**
 * Coordinates height measurements between providers and the PrefixSum.
 * Ensures PrefixSum stays in sync with provider heights.
 */
export class HeightCache {
  constructor(
    private prefixSum: PrefixSum,
    private provider: HeightProvider
  ) {}

  /** Ensure item is measured. Returns true if height changed. */
  ensure(index: number): boolean {
    const height = this.provider.getHeight(index)
    const current = this.prefixSum.getHeight(index)
    if (height === current) return false
    this.prefixSum.update(index, height)
    return true
  }

  /** Invalidate + re-measure item. Returns height delta. */
  invalidate(index: number): number {
    const oldHeight = this.prefixSum.getHeight(index)
    this.provider.invalidate(index)
    const newHeight = this.provider.getHeight(index)
    if (newHeight !== oldHeight) {
      this.prefixSum.update(index, newHeight)
    }
    return newHeight - oldHeight
  }

  /** Invalidate and re-measure a range. */
  invalidateRange(start: number, end: number): void {
    for (let i = start; i < end; i++) {
      this.invalidate(i)
    }
  }

  /** Full rebuild (e.g. container width changed). */
  rebuild(): void {
    this.provider.invalidateAll()
    for (let i = 0; i < this.prefixSum.count; i++) {
      this.prefixSum.update(i, this.provider.getHeight(i))
    }
  }
}
