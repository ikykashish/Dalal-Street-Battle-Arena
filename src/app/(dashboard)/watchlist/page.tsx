'use client'

import { useState, useEffect } from 'react'
import { Bookmark, TrendingUp, TrendingDown, Trash2, Plus, Search } from 'lucide-react'
import { TradeModal } from '@/components/trading/TradeModal'
import { formatPrice, formatPercent, cn } from '@/lib/utils'
import { applySimulation } from '@/lib/price-simulator'
import type { Stock } from '@/types'

interface WatchlistItem {
  id: string
  addedAt: string
  stock: Stock
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [portfolio, setPortfolio] = useState<{ cashBalance: number; holdings: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Stock[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [tradeModal, setTradeModal] = useState<{ stock: Stock; type: 'BUY' | 'SELL' } | null>(null)

  const fetchData = async () => {
    try {
      const [wRes, pRes] = await Promise.all([fetch('/api/watchlist'), fetch('/api/portfolio')])
      const [wData, pData] = await Promise.all([wRes.json(), pRes.json()])
      if (wData.watchlist) setWatchlist(wData.watchlist)
      if (pData.portfolio) setPortfolio(pData.portfolio)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // Simulate live prices every 4s
  useEffect(() => {
    const interval = setInterval(() => {
      setWatchlist((prev) => prev.map((item) => ({
        ...item,
        stock: applySimulation([item.stock])[0],
      })))
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Search stocks to add
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(`/api/stocks?search=${encodeURIComponent(search)}&limit=10`)
        const data = await res.json()
        const watchedIds = new Set(watchlist.map((w) => w.stock.id))
        setSearchResults((data.stocks || []).filter((s: Stock) => !watchedIds.has(s.id)))
      } finally {
        setSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search, watchlist])

  const addToWatchlist = async (stock: Stock) => {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockId: stock.id }),
    })
    if (res.ok) {
      await fetchData()
      setSearch('')
      setSearchResults([])
    }
  }

  const removeFromWatchlist = async (stockId: string) => {
    await fetch('/api/watchlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockId }),
    })
    setWatchlist((prev) => prev.filter((w) => w.stock.id !== stockId))
  }

  const holdingsMap = new Map(portfolio?.holdings?.map((h: any) => [h.stock.id, h.quantity]) || [])

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="page-title flex items-center gap-2">
        <Bookmark className="w-5 h-5 text-warning" />
        Watchlist
      </h1>

      {/* Add stocks */}
      <div className="card space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stocks to add..."
            className="input-field pl-9"
          />
        </div>

        {search && (
          <div className="bg-background-secondary border border-border rounded-xl overflow-hidden">
            {searchLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-4 text-sm text-text-muted">No stocks found</div>
            ) : (
              searchResults.map((stock) => (
                <div
                  key={stock.id}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-background-hover cursor-pointer border-b border-border/40 last:border-0"
                >
                  <div>
                    <span className="font-mono font-semibold text-text-primary text-sm">{stock.symbol}</span>
                    <span className="text-xs text-text-muted ml-2">{stock.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-text-primary">{formatPrice(stock.currentPrice)}</span>
                    <button
                      onClick={() => addToWatchlist(stock)}
                      className="flex items-center gap-1 text-xs bg-brand/10 text-brand hover:bg-brand/20 px-2.5 py-1 rounded-lg font-medium"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Watchlist table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
          </div>
        ) : watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Bookmark className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm">Your watchlist is empty</p>
            <p className="text-xs mt-1">Search and add stocks above</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Symbol', 'Name', 'Price', 'Change', '%', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs text-text-muted font-medium uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {watchlist.map(({ id, stock }) => {
                const held = holdingsMap.get(stock.id) || 0
                const isUp = stock.changePercent >= 0
                return (
                  <tr key={id} className="hover:bg-background-hover/40 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-text-primary">{stock.symbol}</span>
                        {held > 0 && (
                          <span className="text-[10px] px-1 py-0.5 bg-brand/10 text-brand rounded">{held}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs max-w-[120px] truncate">{stock.name}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-text-primary">{formatPrice(stock.currentPrice)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('font-mono text-xs', isUp ? 'text-profit' : 'text-loss')}>
                        {isUp ? '+' : ''}{stock.change.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded',
                        isUp ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
                      )}>
                        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {formatPercent(stock.changePercent)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setTradeModal({ stock, type: 'BUY' })}
                          className="px-2.5 py-1 text-xs bg-profit/10 text-profit hover:bg-profit/20 rounded font-medium"
                        >Buy</button>
                        {held > 0 && (
                          <button
                            onClick={() => setTradeModal({ stock, type: 'SELL' })}
                            className="px-2.5 py-1 text-xs bg-loss/10 text-loss hover:bg-loss/20 rounded font-medium"
                          >Sell</button>
                        )}
                        <button
                          onClick={() => removeFromWatchlist(stock.id)}
                          className="p-1 text-text-muted hover:text-loss rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
