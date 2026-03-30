import { describe, it, expect, vi } from 'vitest'
import { FixedHeightProvider } from '../src/providers/fixed-provider.js'
import { TextHeightProvider } from '../src/providers/text-provider.js'
import { CompositeHeightProvider } from '../src/providers/composite-provider.js'
import { HeightCache } from '../src/core/cache.js'
import { PrefixSum } from '../src/core/prefix-sum.js'
import type { PretextAPI, TextItemDescriptor } from '../src/core/types.js'

// Mock pretext: deterministic height based on char count
function createMockPretext(): PretextAPI {
  return {
    prepare: vi.fn((text: string, font: string, options?: any) => ({
      _text: text,
      _font: font,
      _options: options,
    })),
    layout: vi.fn((prepared: any, maxWidth: number, lineHeight: number) => {
      const charsPerLine = Math.floor(maxWidth / 8) // ~8px per char
      const lineCount = Math.max(1, Math.ceil(prepared._text.length / charsPerLine))
      return { height: lineCount * lineHeight, lineCount }
    }),
  }
}

describe('FixedHeightProvider', () => {
  it('should return fixed height for any index', () => {
    const provider = new FixedHeightProvider(50)
    expect(provider.getHeight(0)).toBe(50)
    expect(provider.getHeight(999)).toBe(50)
  })

  it('should not invalidate (no cache)', () => {
    const provider = new FixedHeightProvider(50)
    expect(provider.invalidate(0)).toBe(false)
  })
})

describe('TextHeightProvider', () => {
  it('should measure text height via pretext', () => {
    const pretext = createMockPretext()
    const descriptors: TextItemDescriptor[] = [
      { text: 'Hello world', font: '16px Inter', lineHeight: 20, maxWidth: 200 },
      { text: 'A much longer text that should wrap across multiple lines', font: '16px Inter', lineHeight: 20, maxWidth: 200 },
    ]

    const provider = new TextHeightProvider((i) => descriptors[i], pretext)

    const h0 = provider.getHeight(0)
    const h1 = provider.getHeight(1)

    expect(h0).toBeGreaterThan(0)
    expect(h1).toBeGreaterThan(h0) // longer text = taller
    expect(pretext.prepare).toHaveBeenCalledTimes(2)
  })

  it('should cache prepare() result', () => {
    const pretext = createMockPretext()
    const desc: TextItemDescriptor = { text: 'Hello', font: '16px Inter', lineHeight: 20, maxWidth: 200 }
    const provider = new TextHeightProvider(() => desc, pretext)

    provider.getHeight(0)
    provider.getHeight(0) // second call should use cache

    expect(pretext.prepare).toHaveBeenCalledTimes(1) // only once
    expect(pretext.layout).toHaveBeenCalledTimes(2) // called each time (pure math, cheap)
  })

  it('should add padding to height', () => {
    const pretext = createMockPretext()
    const desc: TextItemDescriptor = {
      text: 'Hello',
      font: '16px Inter',
      lineHeight: 20,
      maxWidth: 200,
      padding: { top: 10, bottom: 10 },
    }
    const provider = new TextHeightProvider(() => desc, pretext)

    const withoutPadding = new TextHeightProvider(
      () => ({ ...desc, padding: undefined }),
      pretext
    )

    expect(provider.getHeight(0)).toBe(withoutPadding.getHeight(0) + 20)
  })

  it('should invalidate cached prepare()', () => {
    const pretext = createMockPretext()
    const desc: TextItemDescriptor = { text: 'Hello', font: '16px Inter', lineHeight: 20, maxWidth: 200 }
    const provider = new TextHeightProvider(() => desc, pretext)

    provider.getHeight(0)
    expect(provider.invalidate(0)).toBe(true)
    expect(provider.invalidate(0)).toBe(false) // already cleared

    provider.getHeight(0)
    expect(pretext.prepare).toHaveBeenCalledTimes(2) // re-prepared after invalidation
  })

  it('should invalidateAll', () => {
    const pretext = createMockPretext()
    const desc: TextItemDescriptor = { text: 'Hello', font: '16px Inter', lineHeight: 20, maxWidth: 200 }
    const provider = new TextHeightProvider(() => desc, pretext)

    provider.getHeight(0)
    provider.getHeight(1)
    provider.invalidateAll()
    provider.getHeight(0)
    provider.getHeight(1)

    expect(pretext.prepare).toHaveBeenCalledTimes(4) // 2 initial + 2 after invalidateAll
  })
})

describe('CompositeHeightProvider', () => {
  it('should dispatch to correct provider', () => {
    const fixed = new FixedHeightProvider(50)
    const tall = new FixedHeightProvider(200)

    const composite = new CompositeHeightProvider(
      (i) => i % 2 === 0 ? fixed : tall,
      [fixed, tall]
    )

    expect(composite.getHeight(0)).toBe(50)
    expect(composite.getHeight(1)).toBe(200)
    expect(composite.getHeight(2)).toBe(50)
    expect(composite.getHeight(3)).toBe(200)
  })

  it('should invalidateAll on all sub-providers', () => {
    const pretext = createMockPretext()
    const desc: TextItemDescriptor = { text: 'Hello', font: '16px Inter', lineHeight: 20, maxWidth: 200 }
    const textProvider = new TextHeightProvider(() => desc, pretext)
    const fixed = new FixedHeightProvider(50)

    const composite = new CompositeHeightProvider(
      (i) => i % 2 === 0 ? textProvider : fixed,
      [textProvider, fixed]
    )

    // Populate cache
    composite.getHeight(0)
    expect(pretext.prepare).toHaveBeenCalledTimes(1)

    // invalidateAll should clear text provider cache
    composite.invalidateAll()
    composite.getHeight(0)
    expect(pretext.prepare).toHaveBeenCalledTimes(2) // re-prepared after invalidateAll
  })
})

describe('HeightCache', () => {
  it('should ensure items are measured and synced to PrefixSum', () => {
    const ps = new PrefixSum(3)
    const provider = new FixedHeightProvider(50)
    const cache = new HeightCache(ps, provider)

    expect(cache.ensure(0)).toBe(true) // first time = changed
    expect(cache.ensure(0)).toBe(false) // same height = no change
    expect(ps.getHeight(0)).toBe(50)
    expect(ps.total()).toBe(50)
  })

  it('should invalidate and re-measure', () => {
    const ps = new PrefixSum(3)
    let height = 50
    const provider: any = {
      getHeight: () => height,
      invalidate: vi.fn(() => true),
      invalidateAll: vi.fn(),
    }
    const cache = new HeightCache(ps, provider)

    cache.ensure(0) // height = 50
    expect(ps.getHeight(0)).toBe(50)

    height = 80 // simulate content change
    const delta = cache.invalidate(0)
    expect(delta).toBe(30) // 80 - 50
    expect(ps.getHeight(0)).toBe(80)
  })

  it('should rebuild all items', () => {
    const ps = new PrefixSum(3)
    const provider = new FixedHeightProvider(40)
    const cache = new HeightCache(ps, provider)

    cache.rebuild()
    expect(ps.getHeight(0)).toBe(40)
    expect(ps.getHeight(1)).toBe(40)
    expect(ps.getHeight(2)).toBe(40)
    expect(ps.total()).toBe(120)
  })

  it('should rebuild correctly with CompositeHeightProvider', () => {
    const ps = new PrefixSum(4)
    const pretext = createMockPretext()
    const desc: TextItemDescriptor = { text: 'Hello world test', font: '16px Inter', lineHeight: 20, maxWidth: 200 }
    const textProvider = new TextHeightProvider(() => desc, pretext)
    const fixed = new FixedHeightProvider(50)

    const composite = new CompositeHeightProvider(
      (i) => i % 2 === 0 ? textProvider : fixed,
      [textProvider, fixed]
    )

    const cache = new HeightCache(ps, composite)
    cache.rebuild()

    // All items should have heights
    expect(ps.getHeight(0)).toBeGreaterThan(0) // text
    expect(ps.getHeight(1)).toBe(50)            // fixed
    expect(ps.getHeight(2)).toBeGreaterThan(0) // text
    expect(ps.getHeight(3)).toBe(50)            // fixed

    // Second rebuild should invalidate sub-providers and re-measure
    const prepCallsBefore = (pretext.prepare as any).mock.calls.length
    cache.rebuild()
    const prepCallsAfter = (pretext.prepare as any).mock.calls.length
    // Should have re-prepared text items (invalidateAll clears text cache)
    expect(prepCallsAfter).toBeGreaterThan(prepCallsBefore)
  })
})
