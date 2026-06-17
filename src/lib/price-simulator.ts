/**
 * Single source of truth for live prices.
 *
 * `livePrice` is a PURE, PATH-INDEPENDENT function of (symbol, basePrice, timeBucket).
 * Given the same base price (the value stored in the DB) and the same 4-second
 * time bucket, EVERY client and the SERVER compute the exact same price — so the
 * market list, portfolio, dashboard, charts, leaderboard and trade execution all
 * agree, and they all move together every 4 seconds. No shared state, no caching,
 * no WebSocket required (works on Netlify serverless).
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

/** The current 4-second time bucket (shared clock for all clients + server). */
export function currentBucket(): number {
  return Math.floor(Date.now() / 4000)
}

/**
 * Deterministic live price for a stock at a given time bucket.
 * Path-independent: always derived from the stable `basePrice`, never from a
 * previously-simulated value, so it can't drift or diverge between clients.
 */
export function livePrice(
  symbol: string,
  basePrice: number,
  bucket: number = currentBucket()
): number {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return 0
  const phase = (hashCode(symbol) % 360) / 57.3 // unique phase per symbol
  // Slow sinusoidal drift (~150s period) ±1.2%
  const drift = Math.sin(bucket / 6 + phase) * 0.012
  // Per-bucket deterministic noise ±0.35%
  const noise = (seededRandom(hashCode(`${symbol}:${bucket}`)) - 0.5) * 0.007
  const price = basePrice * (1 + drift + noise)
  return Math.round(price * 100) / 100
}

/**
 * Back-compat wrapper. Older callers pass (symbol, currentPrice, previousClose);
 * we treat the supplied price as the base. previousClose is ignored (the new
 * model oscillates around the base, not the previous close).
 */
export function simulatePrice(
  symbol: string,
  basePrice: number,
  _previousClose?: number
): number {
  return livePrice(symbol, basePrice)
}

type SimStock = {
  symbol: string
  currentPrice: number
  previousClose: number
  basePrice?: number
  change?: number
  changePercent?: number
}

/**
 * Applies the live price to a list of stocks. Captures the stable `basePrice`
 * once (from the DB price) so repeated calls never compound — the price is
 * always recomputed from the same base for the current time bucket.
 */
export function applySimulation<T extends SimStock>(stocks: T[]): T[] {
  const bucket = currentBucket()
  return stocks.map((s) => {
    const base = s.basePrice ?? s.currentPrice
    const price = livePrice(s.symbol, base, bucket)
    const change = Math.round((price - s.previousClose) * 100) / 100
    const changePercent =
      Math.round(((price - s.previousClose) / s.previousClose) * 10000) / 100
    return { ...s, basePrice: base, currentPrice: price, change, changePercent }
  })
}
