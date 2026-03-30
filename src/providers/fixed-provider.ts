import type { HeightProvider } from '../core/types.js'

/** All items have the same fixed height. */
export class FixedHeightProvider implements HeightProvider {
  constructor(private height: number) {}

  getHeight(_index: number): number {
    return this.height
  }

  invalidate(_index: number): boolean {
    return false
  }

  invalidateAll(): void {}
}
