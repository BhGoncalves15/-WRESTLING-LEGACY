export class Random {
  constructor(public state: number) {
    this.state = state >>> 0 || 0x6d2b79f5
  }

  next(): number {
    let value = this.state
    value ^= value << 13
    value ^= value >>> 17
    value ^= value << 5
    this.state = value >>> 0
    return this.state / 0x100000000
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('A seleção precisa de pelo menos uma opção.')
    return items[Math.floor(this.next() * items.length)]
  }

  weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    const weights = items.map(weight)
    let remaining = this.next() * weights.reduce((total, value) => total + value, 0)
    for (let index = 0; index < items.length; index++) {
      remaining -= weights[index]
      if (remaining < 0) return items[index]
    }
    return items[items.length - 1]
  }
}
