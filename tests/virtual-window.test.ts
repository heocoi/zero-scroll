import { describe, it, expect } from 'vitest'
import { PrefixSum } from '../src/core/prefix-sum.js'
import { computeWindow } from '../src/core/virtual-window.js'

function createPrefixSum(heights: number[]): PrefixSum {
  const ps = new PrefixSum(heights.length)
  heights.forEach((h, i) => ps.update(i, h))
  return ps
}

describe('computeWindow', () => {
  it('should return empty for zero items', () => {
    const ps = new PrefixSum(0)
    const win = computeWindow(0, 500, ps, 0)
    expect(win.items).toEqual([])
    expect(win.totalHeight).toBe(0)
  })

  it('should return all items when they fit in viewport', () => {
    const ps = createPrefixSum([50, 50, 50]) // total 150, viewport 500
    const win = computeWindow(0, 500, ps, 3, 0)
    expect(win.items.length).toBe(3)
    expect(win.startIndex).toBe(0)
    expect(win.endIndex).toBe(2)
    expect(win.totalHeight).toBe(150)
  })

  it('should compute correct offsets at scroll top', () => {
    const ps = createPrefixSum([100, 50, 75, 25, 100])
    const win = computeWindow(0, 200, ps, 5, 0)

    // viewport 200px: items 0 (0-100), 1 (100-150), 2 (150-225)
    expect(win.items[0]).toEqual({ index: 0, offset: 0, height: 100 })
    expect(win.items[1]).toEqual({ index: 1, offset: 100, height: 50 })
    expect(win.items[2]).toEqual({ index: 2, offset: 150, height: 75 })
  })

  it('should handle scrolled position', () => {
    const ps = createPrefixSum([100, 100, 100, 100, 100]) // 5 items, each 100px
    // Scroll to 250: viewport shows 250-450 = items 2 (200-300), 3 (300-400), 4 (400-500)
    const win = computeWindow(250, 200, ps, 5, 0)

    expect(win.startIndex).toBe(2)
    expect(win.items[0].index).toBe(2)
    expect(win.items[0].offset).toBe(200)
  })

  it('should apply overscan', () => {
    const ps = createPrefixSum([100, 100, 100, 100, 100, 100, 100, 100, 100, 100])
    // Scroll to 300, viewport 200 -> visible: items 3-4
    // With overscan 2: items 1-6
    const win = computeWindow(300, 200, ps, 10, 2)

    expect(win.startIndex).toBe(1)
    expect(win.endIndex).toBeGreaterThanOrEqual(6)
  })

  it('should clamp overscan to bounds', () => {
    const ps = createPrefixSum([100, 100, 100])
    // At scroll 0, overscan 5 should not go below 0
    const win = computeWindow(0, 150, ps, 3, 5)
    expect(win.startIndex).toBe(0)
  })

  it('should handle scroll at bottom', () => {
    const ps = createPrefixSum([100, 100, 100, 100, 100])
    const total = 500
    // Scroll to the very bottom
    const win = computeWindow(total - 200, 200, ps, 5, 0)
    expect(win.endIndex).toBe(4)
    expect(win.totalHeight).toBe(total)
  })

  it('should set offsetY to first visible item offset', () => {
    const ps = createPrefixSum([100, 50, 75, 25])
    const win = computeWindow(120, 100, ps, 4, 0)
    // Item at scroll 120 is item 1 (offset 100)
    expect(win.offsetY).toBe(ps.query(win.startIndex))
  })

  it('should handle zero-height items', () => {
    const ps = createPrefixSum([100, 0, 0, 50])
    const win = computeWindow(0, 200, ps, 4, 0)
    // Should include zero-height items in range
    expect(win.items.length).toBeGreaterThanOrEqual(3)
    expect(win.totalHeight).toBe(150)
  })

  it('should handle single item', () => {
    const ps = createPrefixSum([100])
    const win = computeWindow(0, 500, ps, 1, 0)
    expect(win.items.length).toBe(1)
    expect(win.items[0]).toEqual({ index: 0, offset: 0, height: 100 })
    expect(win.totalHeight).toBe(100)
  })

  it('should handle all items same height with large overscan', () => {
    const ps = createPrefixSum([50, 50, 50, 50, 50])
    const win = computeWindow(100, 100, ps, 5, 10)
    // Overscan clamped to bounds
    expect(win.startIndex).toBe(0)
    expect(win.endIndex).toBe(4)
  })

  describe('performance', () => {
    it('should compute window for 100k items quickly', () => {
      const n = 100_000
      const ps = new PrefixSum(n)
      for (let i = 0; i < n; i++) {
        ps.update(i, 40 + Math.random() * 160)
      }

      const scrollTop = ps.total() / 2 // scroll to middle
      const start = performance.now()
      const iterations = 1000
      for (let i = 0; i < iterations; i++) {
        computeWindow(scrollTop, 800, ps, n, 3)
      }
      const elapsed = performance.now() - start
      const perCall = elapsed / iterations

      // Should be well under 0.1ms per call
      expect(perCall).toBeLessThan(0.1)
      console.log(`computeWindow @ ${n} items: ${perCall.toFixed(4)}ms per call`)
    })
  })
})
