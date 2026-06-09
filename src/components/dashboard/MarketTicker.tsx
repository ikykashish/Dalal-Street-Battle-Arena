'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatPrice, cn } from '@/lib/utils'
import { applySimulation } from '@/lib/price-simulator'
import type { Stock } from '@/types'

interface MarketTickerProps {
  stocks: Stock[]
}

export function MarketTicker({ stocks: initialStocks }: MarketTickerProps) {
  const [stocks, setStocks] = useState(() => applySimulation(initialStocks.slice(0, 20)))

  useEffect(() => {
    setStocks(applySimulation(initialStocks.slice(0, 20)))
  }, [initialStocks])

  // Simulate live prices every 4s for the ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setStocks((prev) => applySimulation(prev))
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  if (stocks.length === 0) return null

  const doubled = [...stocks, ...stocks]

  return (
    <div className="bg-background-secondary border-b border-border overflow-hidden py-2 ticker-container">
      <div className="ticker-content">
        {doubled.map((stock, i) => (
          <div key={`${stock.symbol}-${i}`} className="flex items-center gap-2 whitespace-nowrap">
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
