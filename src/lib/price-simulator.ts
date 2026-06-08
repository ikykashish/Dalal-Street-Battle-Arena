/**
 * Deterministic client-side price simulator.
 * All users see the same prices because it's based on time + symbol only.
 * No server, no WebSocket needed — works perfectly on Netlify.
 */

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

/** Returns a simulated price for a stock based on current time bucket */
export function simulatePrice(
  symbol: string,
  currentPrice: number,
  previousClose: number
): number {
  const bucket = Math.floor(Date.now() / 4000) // new value every 4 seconds
  const seed = hashCode(`${symbol}:${bucket}`)
  const rand = seededRandom(seed)

  // Mean-revert toward previous close + small noise
  const deviation = (currentPrice - previousClose) / previousClose
  const meanReversion = -deviation * 0.08
  const noise = (rand - 0.5) * 0.009 // ±0.45% per tick

  const newPrice = currentPrice * (1 + meanReversion + noise)
  const floored = Math.max(newPrice, previousClose * 0.75)
  return Math.round(floored * 100) / 100
}

/** Applies simulation to a list of stocks and returns updated array */
export function applySimulation<T extends {
  symbol: string
  currentPrice: number
  previousClose: number
  change?: number
  changePercent?: number
}>(stocks: T[]): T[] {
  return stocks.map((s) => {
    const newPrice = simulatePrice(s.symbol, s.currentPrice, s.previousClose)
    const change = newPrice - s.previousClose
    const changePercent = (change / s.previousClose) * 100
    return { ...s, currentPrice: newPrice, change, changePercent }
  })
}
