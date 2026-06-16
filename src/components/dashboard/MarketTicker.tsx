'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatPrice, cn } from '@/lib/utils'
import type { Stock } from '@/types'

interface MarketTickerProps {
  stocks: Stock[]
}

/**
 * Presentational scrolling ticker. It renders whatever `stocks` the parent
 * passes — it does NOT simulate prices itself. The parent page runs a single
 * shared price simulation and passes the same array here and to the stock
 * table, so all price displays stay in sync.
 */
export function MarketTicker({ stocks }: MarketTickerProps) {
  if (!stocks || stocks.length === 0) return null

  const display = stocks.slice(0, 20)
  // Duplicate the set for the seamless infinite-scroll CSS trick.
  const doubled = [...display, ...display]

  return (
    <div className="bg-background-secondary border-b border-border overflow-hidden py-2 ticker-container">
      <div className="ticker-content" aria-label="Live stock prices">
        {doubled.map((stock, i) => (
          <div
            key={`${stock.symbol}-${i}`}
            // Second (duplicate) half is decorative — hide from screen readers.
            aria-hidden={i >= display.length}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <span className="text-xs font-mono font-semibold text-text-primary">{stock.symbol}</span>
            <span className="text-xs font-mono text-text-secondary">{formatPrice(stock.currentPrice)}</span>
            <span className={cn(
              'flex items-center gap-0.5 text-xs',
              stock.changePercent >= 0 ? 'text-profit' : 'text-loss'
            )}>
              {stock.changePercent >= 0
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />
              }
              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </span>
            <span className="text-border">·</span>
          </div>
        ))}
      </div>
    </div>
  )
}
