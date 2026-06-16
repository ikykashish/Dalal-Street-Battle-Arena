'use client'

import { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, Star, Plus, Minus } from 'lucide-react'
import { formatPrice, formatPercent, formatChange, formatBigNumber, cn } from '@/lib/utils'
import type { Stock } from '@/types'

interface StockTableProps {
  stocks: Stock[]
  watchlistIds?: Set<string>
  holdings?: Map<string, number>
  cashBalance?: number
  onBuy?: (stock: Stock) => void
  onSell?: (stock: Stock) => void
  onWatchlistToggle?: (stock: Stock) => void
}

export function StockTable({
  stocks: initialStocks,
  watchlistIds = new Set(),
  holdings = new Map(),
  cashBalance = 0,
  onBuy,
  onSell,
  onWatchlistToggle,
}: StockTableProps) {
  const [stocks, setStocks] = useState<Stock[]>(initialStocks)
  const [flashMap, setFlashMap] = useState<Map<string, 'up' | 'down'>>(new Map())
  const prevPrices = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    const newFlash = new Map<string, 'up' | 'down'>()
    initialStocks.forEach((s) => {
      const prev = prevPrices.current.get(s.symbol)
      if (prev !== undefined && prev !== s.currentPrice) {
        newFlash.set(s.symbol, s.currentPrice > prev ? 'up' : 'down')
      }
      prevPrices.current.set(s.symbol, s.currentPrice)
    })
    setStocks(initialStocks)
    if (newFlash.size > 0) {
      setFlashMap(newFlash)
      setTimeout(() => setFlashMap(new Map()), 800)
    }
  }, [initialStocks])

  if (stocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <TrendingUp className="w-10 h-10 mb-3 opacity-30" />
        <p>No stocks found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {['Symbol', 'Name', 'Price', 'Change', '%', 'Volume', 'Sector', ''].map((h) => (
              <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-text-muted uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => {
            const flash = flashMap.get(stock.symbol)
            const held = holdings.get(stock.id) || 0
            const isUp = stock.changePercent >= 0

            return (
              <tr
                key={stock.id}
                className={cn(
                  'border-b border-border/40 transition-colors cursor-pointer group',
                  flash === 'up' && 'flash-green',
                  flash === 'down' && 'flash-red',
                  'hover:bg-background-hover/50'
                )}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-text-primary">{stock.symbol}</span>
                    {held > 0 && (
                      <span className="text-[10px] px-1 py-0.5 bg-brand/10 text-brand rounded">
                        {held}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-text-secondary max-w-[140px] truncate">
                  {stock.name}
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-mono font-semibold text-text-primary">
                    {formatPrice(stock.currentPrice)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn('font-mono text-xs', isUp ? 'text-profit' : 'text-loss')}>
                    {isUp ? '▲ ' : '▼ '}{formatChange(stock.change)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn(
                    'inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded',
                    isUp ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
                  )}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {formatPercent(stock.changePercent)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-text-muted font-mono text-xs">
                  {formatBigNumber(Number(stock.volume))}
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs text-text-muted">{stock.sector}</span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5 justify-end">
                    {onWatchlistToggle && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onWatchlistToggle(stock) }}
                        className={cn(
                          'p-1 rounded hover:bg-background-tertiary transition-colors',
                          watchlistIds.has(stock.id) ? 'text-warning' : 'text-text-muted opacity-60 hover:opacity-100'
                        )}
                        aria-label={watchlistIds.has(stock.id) ? `Remove ${stock.symbol} from watchlist` : `Add ${stock.symbol} to watchlist`}
                        title={watchlistIds.has(stock.id) ? 'Remove from watchlist' : 'Add to watchlist'}
                      >
                        <Star className="w-3.5 h-3.5" fill={watchlistIds.has(stock.id) ? 'currentColor' : 'none'} />
                      </button>
                    )}
                    {onBuy && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onBuy(stock) }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-profit/15 text-profit hover:bg-profit hover:text-white rounded-full font-semibold transition-colors"
                        aria-label={`Buy ${stock.symbol}`}
                      >
                        <Plus className="w-3 h-3" /> Buy
                      </button>
                    )}
                    {onSell && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSell(stock) }}
                        disabled={held === 0}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-loss/15 text-loss hover:bg-loss hover:text-white rounded-full font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-loss/15 disabled:hover:text-loss"
                        aria-label={held > 0 ? `Sell ${stock.symbol}` : `You don't own ${stock.symbol}`}
                        title={held > 0 ? `Sell ${stock.symbol}` : 'You don\'t own this stock'}
                      >
                        <Minus className="w-3 h-3" /> Sell
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
