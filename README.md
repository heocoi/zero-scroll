# zero-scroll

[![npm version](https://img.shields.io/npm/v/zero-scroll.svg)](https://www.npmjs.com/package/zero-scroll)
[![bundle size](https://img.shields.io/bundlephobia/minzip/zero-scroll)](https://bundlephobia.com/package/zero-scroll)
[![license](https://img.shields.io/npm/l/zero-scroll.svg)](./LICENSE)

Virtual scroll engine with **zero DOM measurement** in the scroll hot path.

Pre-compute item heights once. Every scroll frame after that is pure arithmetic - no `offsetHeight`, no `getBoundingClientRect`, no layout thrashing. Built on a [Fenwick tree](https://en.wikipedia.org/wiki/Fenwick_tree) for O(log n) offset lookups and updates.

## Why?

Every existing virtual scroll library measures item heights by reading from the DOM. This works, but it's fundamentally slow:

- `offsetHeight` and `getBoundingClientRect` force the browser to perform layout calculations
- Interleaving DOM writes and reads causes **layout thrashing** - the browser recalculates layout repeatedly
- This gets worse with complex components (nested flex, grid, shadows, images)

**zero-scroll** takes a different approach: if you can compute heights without asking the DOM, the scroll hot path becomes pure math.

```
Traditional:  scroll event -> measure DOM -> compute layout -> render
zero-scroll:  scroll event -> binary search (math) -> render
```

## Benchmarks

All measurements taken in Chrome on Apple M1 Pro.

### Scroll frame time (the number that matters for smooth 60fps)

| Items | zero-scroll | DOM interleaved | Speedup |
|------:|------------:|----------------:|--------:|
| 1,000 | 0.004ms | 0.41ms | **103x** |
| 100,000 | 0.001ms | n/a (too slow) | - |
| 1,000,000 | 0.0003ms | n/a | - |

16.67ms budget per frame at 60fps. zero-scroll uses less than 0.1% of that budget even at 1M items.

### Setup time (one-time cost)

| Items | zero-scroll | DOM batch |
|------:|------------:|----------:|
| 1,000 | 0.9ms | 38.8ms |
| 100,000 | 1.7ms | n/a |

## Install

```bash
npm install zero-scroll
```

## Usage

### Core (framework-agnostic)

The core has **zero dependencies** and works in any JS environment.

```ts
import { PrefixSum, computeWindow } from 'zero-scroll'

// Create a Fenwick tree and populate heights
const ps = new PrefixSum(items.length)
items.forEach((item, i) => ps.update(i, item.height))

// On scroll - pure arithmetic, no DOM
const visible = computeWindow(scrollTop, viewportHeight, ps, items.length, 3)

// Render only what's visible
visible.items.forEach(({ index, offset, height }) => {
  renderItem(items[index], offset, height)
})
```

### React

```tsx
import { useRef, useMemo } from 'react'
import { FixedHeightProvider } from 'zero-scroll'
import { useVirtualScroll } from 'zero-scroll/react'

function MessageList({ messages }) {
  const scrollRef = useRef(null)
  const provider = useMemo(() => new FixedHeightProvider(64), [])

  const { items, totalHeight } = useVirtualScroll({
    count: messages.length,
    heightProvider: provider,
    scrollRef,
  })

  return (
    <div ref={scrollRef} style={{ height: 600, overflow: 'auto' }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        {items.map(({ index, offset, height }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              transform: `translateY(${offset}px)`,
              height,
              left: 0,
              right: 0,
            }}
          >
            {messages[index].text}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### VirtualList component

For simpler cases, use the `VirtualList` component directly:

```tsx
import { VirtualList, FixedHeightProvider } from 'zero-scroll/react'

const provider = new FixedHeightProvider(64)

<VirtualList
  ref={listRef}
  items={messages}
  heightProvider={provider}
  renderItem={(msg, i) => <MessageCard message={msg} />}
  style={{ height: 600 }}
/>

// Imperative API via ref
listRef.current.scrollToIndex(50, 'center')
listRef.current.invalidate(3) // re-measure item 3
```

## Height providers

The core design constraint: **heights must be known before rendering**. This is what enables zero-DOM scrolling. Choose a provider based on your content:

### FixedHeightProvider

Every item has the same height. Simplest and fastest.

```ts
import { FixedHeightProvider } from 'zero-scroll'

const provider = new FixedHeightProvider(64)
```

### TextHeightProvider

Computes text height using [pretext](https://github.com/chenglou/pretext) - a pure-math text measurement library. Pretext is optional; inject it rather than importing.

```ts
import { TextHeightProvider } from 'zero-scroll'
import * as pretext from '@chenglou/pretext'

const provider = new TextHeightProvider(
  (index) => ({
    text: messages[index].text,
    font: '14px Inter',
    lineHeight: 20,
    maxWidth: containerWidth - 32, // minus padding
    padding: { top: 12, bottom: 12 },
  }),
  pretext
)
```

`prepare()` runs once per item (cached). `layout()` runs on each height query but costs ~0.0002ms (pure arithmetic).

### CompositeHeightProvider

Different item types with different height strategies:

```ts
import {
  CompositeHeightProvider,
  FixedHeightProvider,
  TextHeightProvider,
} from 'zero-scroll'

const textProvider = new TextHeightProvider(getDescriptor, pretext)
const separatorProvider = new FixedHeightProvider(32)
const imageProvider = {
  getHeight: (i) => items[i].imageHeight + 80, // image + caption
  invalidate: () => false,
  invalidateAll: () => {},
}

const provider = new CompositeHeightProvider(
  (index) => {
    switch (items[index].type) {
      case 'text': return textProvider
      case 'separator': return separatorProvider
      case 'image': return imageProvider
    }
  },
  [textProvider, separatorProvider, imageProvider]
)
```

### Custom provider

Implement the `HeightProvider` interface for any height logic:

```ts
interface HeightProvider {
  getHeight(index: number): number
  invalidate(index: number): boolean
  invalidateAll(): void
}
```

## Scroll anchoring

When heights change above the viewport (images loading, content expanding), use anchoring to prevent scroll jumping:

```ts
import { captureAnchor, restoreAnchor } from 'zero-scroll'

const anchor = captureAnchor(el.scrollTop, prefixSum)
// ... heights change ...
el.scrollTop = restoreAnchor(anchor, prefixSum)
```

The React hook handles this automatically when you call `invalidate()`.

## API reference

### Core (`zero-scroll`)

| Export | Description |
|--------|-------------|
| `PrefixSum` | Fenwick tree. O(log n) `query`, `update`, `findIndex`, `resize`. |
| `computeWindow(scrollTop, viewportH, prefixSum, count, overscan)` | Returns visible `{ items, totalHeight, startIndex, endIndex }`. |
| `HeightCache` | Coordinates providers with PrefixSum. `ensure`, `invalidate`, `rebuild`. |
| `captureAnchor` / `restoreAnchor` | Scroll position stabilization across height mutations. |
| `FixedHeightProvider` | Constant height. |
| `TextHeightProvider` | Pretext-based text measurement. |
| `CompositeHeightProvider` | Dispatch to sub-providers by item type. |

### React (`zero-scroll/react`)

| Export | Description |
|--------|-------------|
| `useVirtualScroll(config)` | Hook. Returns `{ items, totalHeight, offsetY, invalidate, invalidateAll, scrollToIndex }`. |
| `VirtualList` | Component with `ref` for imperative `invalidate` / `scrollToIndex`. |

## How it works

1. **Fenwick tree** (Binary Indexed Tree) stores cumulative item heights
2. `findIndex(offset)` does O(log n) binary search to find which item is at a given scroll position
3. `computeWindow` calls `findIndex` twice (start + end of viewport), applies overscan, returns visible items with pre-computed offsets
4. React hook gates re-renders: only triggers `setState` when the visible index range changes, not on every scroll pixel
5. `translateY` positioning avoids layout recalculation

The entire scroll hot path is pure arithmetic on a `Float64Array`. No DOM reads, no string operations, no object allocations in the critical path.

## Limitations

- Heights must be computable without DOM measurement. If your item height depends on rendered DOM state, this library isn't for you.
- Text measurement requires [pretext](https://github.com/chenglou/pretext) (optional dependency).
- Vertical scrolling only. No horizontal or grid layout.
- No built-in infinite loading. Manage data fetching externally and update `count`.

## Inspired by

[chenglou/pretext](https://github.com/chenglou/pretext) - Pure TypeScript text measurement that bypasses DOM reflow. zero-scroll applies the same principle to virtual scrolling: measure once, math forever.

## License

[MIT](./LICENSE)
