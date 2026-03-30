import type { HeightProvider } from '../core/types.js'

/**
 * Dispatches to different providers based on item type.
 * Pass all sub-providers so invalidateAll() can propagate correctly.
 */
export class CompositeHeightProvider implements HeightProvider {
  private providers: HeightProvider[]

  constructor(
    private resolve: (index: number) => HeightProvider,
    providers: HeightProvider[]
  ) {
    this.providers = providers
  }

  getHeight(index: number): number {
    return this.resolve(index).getHeight(index)
  }

  invalidate(index: number): boolean {
    return this.resolve(index).invalidate(index)
  }

  invalidateAll(): void {
    for (const provider of this.providers) {
      provider.invalidateAll()
    }
  }
}
