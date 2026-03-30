/**
 * Fenwick tree (Binary Indexed Tree) for O(log n) prefix sum queries and updates.
 * Stores item heights and supports:
 * - update(index, height): set height at index
 * - query(index): cumulative height [0, index) = Y offset of item[index]
 * - total(): sum of all heights
 * - findIndex(offset): binary search for item at Y offset
 */
export class PrefixSum {
  private tree: Float64Array
  private heights: Float64Array
  private _count: number

  constructor(count: number) {
    this._count = count
    this.tree = new Float64Array(count + 1)
    this.heights = new Float64Array(count)
  }

  get count(): number {
    return this._count
  }

  /** Set height at index. Propagates delta through the tree. */
  update(index: number, height: number): void {
    const delta = height - this.heights[index]
    if (delta === 0) return
    this.heights[index] = height
    let i = index + 1 // Fenwick tree is 1-indexed
    while (i <= this._count) {
      this.tree[i] += delta
      i += i & (-i)
    }
  }

  /** Get height stored at index. */
  getHeight(index: number): number {
    return this.heights[index]
  }

  /** Cumulative height [0, index) = Y offset of item at index. */
  query(index: number): number {
    let sum = 0
    let i = index // 1-indexed: query(index) = sum of [1..index] = sum of heights [0..index-1]
    while (i > 0) {
      sum += this.tree[i]
      i -= i & (-i)
    }
    return sum
  }

  /** Total height of all items. */
  total(): number {
    return this.query(this._count)
  }

  /**
   * Binary search: find the item index at the given Y offset.
   * Returns the index of the item that contains the offset.
   */
  findIndex(offset: number): number {
    if (this._count === 0 || offset <= 0) return 0
    let pos = 0
    let bitMask = 1
    // Find highest bit
    while (bitMask <= this._count) bitMask <<= 1
    bitMask >>= 1

    while (bitMask > 0) {
      const next = pos + bitMask
      if (next <= this._count && this.tree[next] <= offset) {
        pos = next
        offset -= this.tree[next]
      }
      bitMask >>= 1
    }

    // pos is now the 1-indexed position, convert to 0-indexed
    return Math.min(pos, this._count - 1)
  }

  /** Resize the tree. Preserves existing heights up to min(old, new) count. */
  resize(newCount: number): void {
    const oldHeights = this.heights
    const preserveCount = Math.min(this._count, newCount)

    this._count = newCount
    this.tree = new Float64Array(newCount + 1)
    this.heights = new Float64Array(newCount)

    // Re-insert preserved heights
    for (let i = 0; i < preserveCount; i++) {
      if (oldHeights[i] !== 0) {
        this.heights[i] = oldHeights[i]
        let j = i + 1
        while (j <= newCount) {
          this.tree[j] += oldHeights[i]
          j += j & (-j)
        }
      }
    }
  }
}
