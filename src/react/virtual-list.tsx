import React, { useRef, forwardRef, useImperativeHandle } from 'react'
import { useVirtualScroll } from './use-virtual-scroll.js'
import type { HeightProvider } from '../core/types.js'

export interface VirtualListHandle {
  invalidate: (index: number) => void
  invalidateAll: () => void
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void
}

export interface VirtualListProps<T> {
  items: T[]
  heightProvider: HeightProvider
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
  style?: React.CSSProperties
}

function VirtualListInner<T>(
  {
    items: data,
    heightProvider,
    renderItem,
    overscan,
    className,
    style,
  }: VirtualListProps<T>,
  ref: React.ForwardedRef<VirtualListHandle>
) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const { items, totalHeight, invalidate, invalidateAll, scrollToIndex } = useVirtualScroll({
    count: data.length,
    heightProvider,
    overscan,
    scrollRef,
  })

  useImperativeHandle(ref, () => ({
    invalidate,
    invalidateAll,
    scrollToIndex,
  }), [invalidate, invalidateAll, scrollToIndex])

  return (
    <div
      ref={scrollRef}
      className={className}
      style={{
        overflow: 'auto',
        position: 'relative',
        ...style,
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {items.map((item) => (
          <div
            key={item.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${item.offset}px)`,
              height: item.height,
            }}
          >
            {renderItem(data[item.index], item.index)}
          </div>
        ))}
      </div>
    </div>
  )
}

export const VirtualList = forwardRef(VirtualListInner) as <T>(
  props: VirtualListProps<T> & { ref?: React.Ref<VirtualListHandle> }
) => React.ReactElement
