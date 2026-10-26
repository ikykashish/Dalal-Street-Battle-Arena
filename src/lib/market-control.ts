type MarketPriceUpdate = {
  symbol: string
  price: number
  change: number
  changePercent: number
  previousClose: number
}

const ADMIN_PRICE_HOLD_MS = 5 * 60 * 1000

/** Keep admin market moves in the live cache and broadcast them immediately. */
export function applyAdminPriceUpdates(updates: MarketPriceUpdate[]) {
  const priceCache = (global as any).priceCache as Map<string, any> | undefined
  const io = (global as any).io as { emit?: (event: string, payload: unknown) => void } | undefined
  const holdUntil = Date.now() + ADMIN_PRICE_HOLD_MS

  for (const update of updates) {
    const cached = priceCache?.get(update.symbol)
    if (!priceCache || !cached) continue
    priceCache.set(update.symbol, { ...cached, ...update, holdUntil })
  }

  if (io?.emit) {
    io.emit('price_update', updates.map((update) => ({
      ...update,
      volume: priceCache?.get(update.symbol)?.volume ?? 0,
    })))
  }
}
