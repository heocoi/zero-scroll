import type { HeightProvider, TextItemDescriptor, PretextAPI } from '../core/types.js'

/**
 * Measures text height using pretext (injected, not imported).
 * prepare() runs once per item, layout() runs on each getHeight() call (pure math, ~0.0002ms).
 */
export class TextHeightProvider implements HeightProvider {
  private prepared: Map<number, unknown> = new Map()

  constructor(
    private getDescriptor: (index: number) => TextItemDescriptor,
    private pretext: PretextAPI
  ) {}

  getHeight(index: number): number {
    const desc = this.getDescriptor(index)

    let prep = this.prepared.get(index)
    if (!prep) {
      prep = this.pretext.prepare(desc.text, desc.font, {
        whiteSpace: desc.whiteSpace,
      })
      this.prepared.set(index, prep)
    }

    const { height } = this.pretext.layout(prep, desc.maxWidth, desc.lineHeight)
    return height + (desc.padding?.top ?? 0) + (desc.padding?.bottom ?? 0)
  }

  invalidate(index: number): boolean {
    return this.prepared.delete(index)
  }

  invalidateAll(): void {
    this.prepared.clear()
  }
}
