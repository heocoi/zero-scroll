import { describe, it, expect } from 'vitest'
import { PrefixSum } from '../src/core/prefix-sum.js'

describe('PrefixSum (Fenwick Tree)', () => {
  it('should initialize with zero heights', () => {
    const ps = new PrefixSum(5)
    expect(ps.total()).toBe(0)
    expect(ps.query(0)).toBe(0)
    expect(ps.query(5)).toBe(0)
  })

  it('should update and query single item', () => {
    const ps = new PrefixSum(3)
    ps.update(0, 50)
    expect(ps.getHeight(0)).toBe(50)
    expect(ps.query(0)).toBe(0) // offset of item 0 = 0
    expect(ps.query(1)).toBe(50) // offset of item 1 = height of item 0
    expect(ps.total()).toBe(50)
  })

  it('should compute correct offsets for multiple items', () => {
    const ps = new PrefixSum(4)
    ps.update(0, 100) // item 0: height 100, offset 0
    ps.update(1, 50)  // item 1: height 50, offset 100
    ps.update(2, 75)  // item 2: height 75, offset 150
    ps.update(3, 25)  // item 3: height 25, offset 225

    expect(ps.query(0)).toBe(0)
    expect(ps.query(1)).toBe(100)
    expect(ps.query(2)).toBe(150)
    expect(ps.query(3)).toBe(225)
    expect(ps.total()).toBe(250)
  })

  it('should handle height updates (not just initial set)', () => {
    const ps = new PrefixSum(3)
    ps.update(0, 100)
    ps.update(1, 50)
    ps.update(2, 75)

    // Change item 1 from 50 to 80
    ps.update(1, 80)
    expect(ps.getHeight(1)).toBe(80)
    expect(ps.query(2)).toBe(180) // 100 + 80
    expect(ps.total()).toBe(255) // 100 + 80 + 75
  })

  it('should skip update when height unchanged', () => {
    const ps = new PrefixSum(2)
    ps.update(0, 100)
    ps.update(0, 100) // no-op
    expect(ps.total()).toBe(100)
  })

  describe('findIndex', () => {
    it('should find item at offset 0', () => {
      const ps = new PrefixSum(3)
      ps.update(0, 100)
      ps.update(1, 50)
      ps.update(2, 75)
      expect(ps.findIndex(0)).toBe(0)
    })

    it('should find item at exact boundary', () => {
      const ps = new PrefixSum(3)
      ps.update(0, 100)
      ps.update(1, 50)
      ps.update(2, 75)
      // offset 100 = start of item 1
      expect(ps.findIndex(100)).toBe(1)
    })

    it('should find item at mid-point', () => {
      const ps = new PrefixSum(3)
      ps.update(0, 100)
      ps.update(1, 50)
      ps.update(2, 75)
      // offset 120 is inside item 1 (starts at 100, height 50)
      expect(ps.findIndex(120)).toBe(1)
    })

    it('should clamp to last item for offset beyond total', () => {
      const ps = new PrefixSum(3)
      ps.update(0, 100)
      ps.update(1, 50)
      ps.update(2, 75)
      expect(ps.findIndex(9999)).toBe(2)
    })

    it('should handle negative offset', () => {
      const ps = new PrefixSum(3)
      ps.update(0, 100)
      expect(ps.findIndex(-10)).toBe(0)
    })
  })

  describe('resize', () => {
    it('should grow while preserving heights', () => {
      const ps = new PrefixSum(2)
      ps.update(0, 100)
      ps.update(1, 50)

      ps.resize(4)
      expect(ps.count).toBe(4)
      expect(ps.getHeight(0)).toBe(100)
      expect(ps.getHeight(1)).toBe(50)
      expect(ps.query(2)).toBe(150)
      expect(ps.total()).toBe(150)
    })

    it('should shrink while preserving remaining heights', () => {
      const ps = new PrefixSum(4)
      ps.update(0, 100)
      ps.update(1, 50)
      ps.update(2, 75)
      ps.update(3, 25)

      ps.resize(2)
      expect(ps.count).toBe(2)
      expect(ps.getHeight(0)).toBe(100)
      expect(ps.getHeight(1)).toBe(50)
      expect(ps.total()).toBe(150)
    })
  })

  describe('edge cases', () => {
    it('should handle single item', () => {
      const ps = new PrefixSum(1)
      ps.update(0, 100)
      expect(ps.findIndex(0)).toBe(0)
      expect(ps.findIndex(50)).toBe(0)
      expect(ps.findIndex(100)).toBe(0) // clamped to last
      expect(ps.findIndex(999)).toBe(0)
    })

    it('should handle all zero heights', () => {
      const ps = new PrefixSum(5)
      expect(ps.findIndex(0)).toBe(0)
      expect(ps.findIndex(10)).toBe(4) // clamps to last
      expect(ps.total()).toBe(0)
    })

    it('should handle empty PrefixSum (count=0)', () => {
      const ps = new PrefixSum(0)
      expect(ps.total()).toBe(0)
      expect(ps.findIndex(0)).toBe(0)
      expect(ps.findIndex(100)).toBe(0)
    })

    it('should handle resize to 0', () => {
      const ps = new PrefixSum(3)
      ps.update(0, 100)
      ps.update(1, 50)
      ps.resize(0)
      expect(ps.count).toBe(0)
      expect(ps.total()).toBe(0)
      expect(ps.findIndex(0)).toBe(0)
      expect(ps.findIndex(50)).toBe(0)
    })

    it('should find at exact total boundary', () => {
      const ps = new PrefixSum(3)
      ps.update(0, 100)
      ps.update(1, 50)
      ps.update(2, 75)
      expect(ps.findIndex(225)).toBe(2)
      expect(ps.findIndex(300)).toBe(2)
    })
  })

  describe('large scale', () => {
    it('should match naive O(n) sum for 10k items', () => {
      const n = 10_000
      const ps = new PrefixSum(n)
      const heights = new Float64Array(n)

      for (let i = 0; i < n; i++) {
        heights[i] = Math.random() * 200
        ps.update(i, heights[i])
      }

      // Verify prefix sums match naive computation
      let naiveSum = 0
      for (let i = 0; i < n; i++) {
        expect(Math.abs(ps.query(i) - naiveSum)).toBeLessThan(0.001)
        naiveSum += heights[i]
      }
      expect(Math.abs(ps.total() - naiveSum)).toBeLessThan(0.01)
    })

    it('should findIndex round-trip for 10k items', () => {
      const n = 10_000
      const ps = new PrefixSum(n)

      for (let i = 0; i < n; i++) {
        ps.update(i, 40 + Math.random() * 160) // heights 40-200
      }

      // For each item, its offset should map back to itself
      for (let i = 0; i < n; i++) {
        const offset = ps.query(i)
        const found = ps.findIndex(offset)
        // findIndex at exact boundary may return i or i-1, both valid
        // but offset + 1 (inside the item) should definitely return i
        const foundInside = ps.findIndex(offset + 0.5)
        expect(foundInside).toBe(i)
      }
    })
  })
})
