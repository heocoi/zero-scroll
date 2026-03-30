export { PrefixSum } from './core/prefix-sum.js'
export { computeWindow } from './core/virtual-window.js'
export { HeightCache } from './core/cache.js'
export { captureAnchor, restoreAnchor } from './core/scroll-anchor.js'
export { FixedHeightProvider } from './providers/fixed-provider.js'
export { TextHeightProvider } from './providers/text-provider.js'
export { CompositeHeightProvider } from './providers/composite-provider.js'
export type {
  HeightProvider,
  VirtualWindow,
  VirtualItem,
  TextItemDescriptor,
  PretextAPI,
  AnchorState,
} from './core/types.js'
