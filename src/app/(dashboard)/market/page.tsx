'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, SlidersHorizontal, TrendingUp, TrendingDown, BarChart2, X } from 'lucide-react'
import { StockTable } from '@/components/market/StockTable'
import { TradeModal } from '@/components/trading/TradeModal'
import { MarketTicker } from '@/components/dashboard/MarketTicker'
import { formatPrice, formatPercent, cn } from '@/lib/utils'
import { applySimulation } from '@/lib/price-simulator'
import type { Stock } from '@/types'

const SECTORS = ['All', 'IT', 'Banking', 'Energy', 'Pharma', 'Auto', 'FMCG', 'Metal', 'Telecom', 'Power', 'Infrastructure', 'NBFC', 'Finance', 'Healthcare', 'Cement']

export default function MarketPage() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [filtered, setFiltered] = useState<Stock[]>([])
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('All')
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'marketCap', dir: 'desc' })
  const [loading, setLoading] = useState(true)
  const [portfolio, setPortfolio] = useState<{ cashBalance: number; holdings: any[] } | null>(null)
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set())
  const [tradeModal, setTradeModal] = useState<{ stock: Stock; type: 'BUY' | 'SELL' } | null>(null)
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [stocksRes, portfolioRes, watchlistRes] = await Promise.all([
        fetch('/api/stocks?limit=100'),
        fetch('/api/portfolio'),
        fetch('/api/watchlist'),
      ])
      const [sData, pData, wData] = await Promise.all([
        stocksRes.json(), portfolioRes.json(), watchlistRes.json()
      ])
      if (sData.stocks) setStocks(sData.stocks)
      if (pData.portfolio) setPortfolio(pData.portfolio)
      if (wData.watchlist) {
        setWatchlistIds(new Set(wData.watchlist.map((w: any) => w.stock.id)))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Single shared price simulation — ticker and table both read from `stocks`,
  // so every price display on the page stays in sync.
  useEffect(() => {
    if (stocks.length === 0) return
    const interval = setInterval(() => {
      setStocks((prev) => applySimulation(prev))
    }, 4000)
    return () => clearInterval(interval)
  }, [stocks.length])

  useEffect(() => {
    let result = [...stocks]
    if (sector !== 'All') result = result.filter((s) => s.sector === sector)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    }
    result.sort((a, b) => {
      const av = (a as any)[sort.key] ?? 0
      const bv = (b as any)[sort.key] ?? 0
      return sort.dir === 'desc' ? bv - av : av - bv
    })
    setFiltered(result)
  }, [stocks, search, sector, sort])

  const holdingsMap = new Map(portfolio?.holdings?.map((h: any) => [h.stock.id, h.quantity]) || [])

  const toggleWatchlist = async (stock: Stock) => {
    const isWatched = watchlistIds.has(stock.id)
    const method = isWatched ? 'DELETE' : 'POST'
    await fetch('/api/watchlist', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockId: stock.id }),
    })
    setWatchlistIds((prev) => {
      const next = new Set(prev)
      isWatched ? next.delete(stock.id) : next.add(stock.id)
      return next
    })
  }

  const topGainers = [...stocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 3)
  const topLosers = [...stocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 3)

  return (
    <div className="space-y-5">
      <MarketTicker stocks={stocks.slice(0, 15)} />

      <div className="flex items-center justify-between">
        <h1 className="page-title flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-brand" />
          Market
        </h1>
        <span className="text-xs text-text-muted">{filtered.length} stocks</span>
      </div>

      {/* Movers */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-profit" /> Top Gainers
            </h3>
            <div className="space-y-2">
              {topGainers.map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-semibold text-text-primary text-sm">{s.symbol}</span>
                    <span className="text-xs text-text-muted ml-2">{s.sector}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-text-primary">{formatPrice(s.currentPrice)}</div>
                    <div className="text-xs text-profit">{formatPercent(s.changePercent)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-loss" /> Top Losers
            </h3>
            <div className="space-y-2">
              {topLosers.map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div>
                    <span className="font-mono font-semibold text-text-primary text-sm">{s.symbol}</span>
                    <span className="text-xs text-text-muted ml-2">{s.sector}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-text-primary">{formatPrice(s.currentPrice)}</div>
                    <div className="text-xs text-loss">{formatPercent(s.changePercent)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol or company name..."
              className="input-field pl-9 pr-8"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select
            value={`${sort.key}-${sort.dir}`}
            onChange={(e) => {
              const [key, dir] = e.target.value.split('-')
              setSort({ key, dir: dir as 'asc' | 'desc' })
            }}
            className="input-field w-full sm:w-48"
          >
            <option value="marketCap-desc">Market Cap ↓</option>
            <option value="changePercent-desc">Gainers First</option>
            <option value="changePercent-asc">Losers First</option>
            <option value="currentPrice-desc">Price ↓</option>
            <option value="volume-desc">Volume ↓</option>
          </select>
        </div>

        {/* Sector pills */}
        <div className="flex flex-wrap gap-1.5">
          {SECTORS.map((s) => (
            <button
              key={s}
              onClick={() => setSector(s)}
              className={cn(
                'px-3 py-1 text-xs rounded-full border transition-all',
                sector === s
                  ? 'bg-brand text-white border-brand'
                  : 'bg-background-tertiary text-text-muted border-border hover:border-border-light hover:text-text-secondary'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stock table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
          </div>
        ) : (
          <StockTable
            stocks={filtered}
            watchlistIds={watchlistIds}
            holdings={holdingsMap}
            cashBalance={portfolio?.cashBalance || 0}
            onBuy={(s) => setTradeModal({ stock: s, type: 'BUY' })}
            onSell={(s) => setTradeModal({ stock: s, type: 'SELL' })}
            onWatchlistToggle={toggleWatchlist}
          />
        )}
      </div>

      {tradeModal && portfolio && (
        <TradeModal
          stock={tradeModal.stock}
          type={tradeModal.type}
          cashBalance={portfolio.cashBalance}
          availableQty={holdingsMap.get(tradeModal.stock.id) || 0}
          onClose={() => setTradeModal(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  )
}
