import { describe, it, expect } from 'vitest'
import { PrefixSum } from '../src/core/prefix-sum.js'
import { captureAnchor, restoreAnchor } from '../src/core/scroll-anchor.js'

describe('ScrollAnchor', () => {
  it('should return same scrollTop when nothing changed', () => {
    const ps = new PrefixSum(5)
    for (let i = 0; i < 5; i++) ps.update(i, 100)

    const scrollTop = 250 // viewing item 2, 50px into it
    const anchor = captureAnchor(scrollTop, ps)

    expect(anchor.index).toBe(2)
    expect(anchor.offsetFromViewport).toBe(50) // 250 - 200

    const restored = restoreAnchor(anchor, ps)
    expect(restored).toBe(250) // no change
  })

  it('should compensate when item above viewport grows', () => {
    const ps = new PrefixSum(5)
    for (let i = 0; i < 5; i++) ps.update(i, 100)

    // User is viewing item 3 (offset 300), scrollTop = 320 (20px into item 3)
    const scrollTop = 320
    const anchor = captureAnchor(scrollTop, ps)

    expect(anchor.index).toBe(3)
    expect(anchor.offsetFromViewport).toBe(20)

    // Item 0 grows from 100 to 200 (above viewport)
    ps.update(0, 200)

    // Item 3 is now at offset 400 (was 300)
    const restored = restoreAnchor(anchor, ps)
    expect(restored).toBe(420) // 400 + 20 = need to scroll to 420 to keep same view
  })

  it('should compensate when item above viewport shrinks', () => {
    const ps = new PrefixSum(5)
    for (let i = 0; i < 5; i++) ps.update(i, 100)

    const scrollTop = 320
    const anchor = captureAnchor(scrollTop, ps)

    // Item 1 shrinks from 100 to 50
    ps.update(1, 50)

    // Item 3 is now at offset 250 (was 300)
    const restored = restoreAnchor(anchor, ps)
    expect(restored).toBe(270) // 250 + 20
  })

  it('should handle anchor at scroll top = 0', () => {
    const ps = new PrefixSum(3)
    for (let i = 0; i < 3; i++) ps.update(i, 100)

    const anchor = captureAnchor(0, ps)
    expect(anchor.index).toBe(0)
    expect(anchor.offsetFromViewport).toBe(0)

    ps.update(0, 200) // item 0 grows, but we're at the top
    const restored = restoreAnchor(anchor, ps)
    expect(restored).toBe(0) // still at the top
  })

  it('should handle scroll past end', () => {
    const ps = new PrefixSum(3)
    for (let i = 0; i < 3; i++) ps.update(i, 100)

    // scrollTop 500 is past total (300)
    const anchor = captureAnchor(500, ps)
    // findIndex clamps to last item (2), offset = 200
    expect(anchor.index).toBe(2)
    expect(anchor.offsetFromViewport).toBe(300) // 500 - 200

    // After height change, restoreAnchor returns value > total
    ps.update(0, 150)
    const restored = restoreAnchor(anchor, ps)
    // item 2 now at 250, + 300 offset = 550
    expect(restored).toBe(550)
  })

  it('should handle multiple height changes', () => {
    const ps = new PrefixSum(5)
    for (let i = 0; i < 5; i++) ps.update(i, 100)

    const scrollTop = 350 // item 3, 50px in
    const anchor = captureAnchor(scrollTop, ps)

    // Multiple items above viewport change
    ps.update(0, 150) // +50
    ps.update(1, 80)  // -20
    ps.update(2, 120) // +20
    // Net change: +50

    const restored = restoreAnchor(anchor, ps)
    // Item 3 now at: 150 + 80 + 120 = 350
    expect(restored).toBe(350 + 50) // 350 + offsetFromViewport(50)
  })
})
