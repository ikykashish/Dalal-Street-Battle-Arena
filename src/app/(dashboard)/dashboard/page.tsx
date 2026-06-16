'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  TrendingUp, TrendingDown, Briefcase, DollarSign,
  BarChart2, Activity, ArrowUpRight, ArrowDownRight, Zap
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatPercent, cn } from '@/lib/utils'
import { applySimulation } from '@/lib/price-simulator'
import { MarketTicker } from '@/components/dashboard/MarketTicker'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { StockTable } from '@/components/market/StockTable'
import { TradeModal } from '@/components/trading/TradeModal'
import { LiveStockChart } from '@/components/charts/LiveStockChart'
import type { Portfolio, Stock, Trade } from '@/types'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [stocks, setStocks] = useState<Stock[]>([])
  const [trades, setTrades] = useState<Trade[]>([])
  const [tradeModal, setTradeModal] = useState<{ stock: Stock; type: 'BUY' | 'SELL' } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAll = async () => {
    try {
      const [portfolioRes, stocksRes, tradesRes] = await Promise.all([
        fetch('/api/portfolio'),
        fetch('/api/stocks?limit=100&sort=marketCap'),
        fetch('/api/trades?limit=20'),
      ])
      const [pData, sData, tData] = await Promise.all([
        portfolioRes.json(),
        stocksRes.json(),
        tradesRes.json(),
      ])
      if (pData.portfolio) setPortfolio(pData.portfolio)
      if (sData.stocks) setStocks(sData.stocks)
      if (tData.trades) setTrades(tData.trades)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  // Single shared price simulation — ticker, table and chart stay in sync.
  useEffect(() => {
    if (stocks.length === 0) return
    const interval = setInterval(() => {
      setStocks((prev) => applySimulation(prev))
    }, 4000)
    return () => clearInterval(interval)
  }, [stocks.length])

  const holdingsMap = new Map(portfolio?.holdings.map((h) => [h.stock.id, h.quantity]) || [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  const stats = portfolio ? [
    {
      label: 'Portfolio Value',
      value: formatCurrency(portfolio.totalValue),
      sub: `${portfolio.totalPnL >= 0 ? '+' : ''}${formatCurrency(portfolio.totalPnL)}`,
      subColor: portfolio.totalPnL >= 0 ? 'text-profit' : 'text-loss',
      icon: Briefcase,
      iconBg: 'bg-brand/10',
      iconColor: 'text-brand',
    },
    {
      label: 'Cash Balance',
      value: formatCurrency(portfolio.cashBalance),
      sub: `${((portfolio.cashBalance / portfolio.initialCapital) * 100).toFixed(1)}% of capital`,
      subColor: 'text-text-muted',
      icon: DollarSign,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    {
      label: 'Total P&L',
      value: formatCurrency(portfolio.totalPnL),
      sub: formatPercent(portfolio.totalPnLPercent),
      subColor: portfolio.totalPnL >= 0 ? 'text-profit' : 'text-loss',
      icon: portfolio.totalPnL >= 0 ? TrendingUp : TrendingDown,
      iconBg: portfolio.totalPnL >= 0 ? 'bg-profit/10' : 'bg-loss/10',
      iconColor: portfolio.totalPnL >= 0 ? 'text-profit' : 'text-loss',
    },
    {
      label: "Today's P&L",
      value: formatCurrency(portfolio.dayPnL),
      sub: formatPercent(portfolio.dayPnLPercent),
      subColor: portfolio.dayPnL >= 0 ? 'text-profit' : 'text-loss',
      icon: portfolio.dayPnL >= 0 ? ArrowUpRight : ArrowDownRight,
      iconBg: portfolio.dayPnL >= 0 ? 'bg-profit/10' : 'bg-loss/10',
      iconColor: portfolio.dayPnL >= 0 ? 'text-profit' : 'text-loss',
    },
  ] : []

  return (
    <div className="space-y-5">
      {/* Ticker */}
      {stocks.length > 0 && <MarketTicker stocks={stocks} />}

      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Welcome back, {session?.user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Here&apos;s your trading overview</p>
        </div>
        <div className="flex gap-2">
          <Link href="/market" className="btn-secondary text-xs flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" /> Market
          </Link>
          <Link href="/portfolio" className="btn-primary text-xs flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" /> Portfolio
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs text-text-muted">{stat.label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', stat.iconBg)}>
                <stat.icon className={cn('w-4 h-4', stat.iconColor)} />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-text-primary">{stat.value}</div>
            <div className={cn('text-xs mt-1', stat.subColor)}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Candlestick Chart */}
      {stocks.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-brand" />
              Live Chart · 1-min candles
            </h2>
            <span className="text-xs text-text-muted px-2 py-0.5 rounded-full bg-brand/10 text-brand">LIVE</span>
          </div>
          <LiveStockChart stocks={stocks} initialSymbol="RELIANCE" />
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Market overview — all 100+ stocks */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-brand" />
              All Stocks ({stocks.length})
            </h2>
            <Link href="/market" className="text-xs text-brand hover:text-brand-light">
              Full market →
            </Link>
          </div>
          <StockTable
            stocks={stocks}
            holdings={holdingsMap}
            cashBalance={portfolio?.cashBalance || 0}
            onBuy={(s) => setTradeModal({ stock: s, type: 'BUY' })}
            onSell={(s) => setTradeModal({ stock: s, type: 'SELL' })}
          />
        </div>

        {/* Activity feed */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand" />
              Activity
            </h2>
            <span className="text-xs text-text-muted">Live</span>
          </div>
          <ActivityFeed
            initialTrades={trades as any}
            currentUserId={session?.user?.id}
          />
          {trades.length === 0 && (
            <div className="text-center py-6">
              <Zap className="w-8 h-8 text-text-disabled mx-auto mb-2" />
              <p className="text-sm text-text-muted">No trades yet</p>
              <Link href="/market" className="text-xs text-brand mt-2 block">
                Start trading →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Holdings preview */}
      {portfolio && portfolio.holdings.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-brand" />
              My Holdings
            </h2>
            <Link href="/portfolio" className="text-xs text-brand hover:text-brand-light">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Stock', 'Qty', 'Avg Price', 'LTP', 'P&L', 'Day'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs text-text-muted font-medium uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.slice(0, 5).map((h) => (
                  <tr key={h.id} className="border-b border-border/40 hover:bg-background-hover/40">
                    <td className="px-3 py-2.5">
                      <div className="font-mono font-semibold text-text-primary">{h.stock.symbol}</div>
                      <div className="text-xs text-text-muted truncate max-w-[100px]">{h.stock.name}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-text-primary">{h.quantity}</td>
                    <td className="px-3 py-2.5 font-mono text-text-secondary">{formatCurrency(h.avgPrice)}</td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-text-primary">{formatCurrency(h.stock.currentPrice)}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn('font-mono text-xs font-medium', h.pnl >= 0 ? 'text-profit' : 'text-loss')}>
                        {h.pnl >= 0 ? '+' : ''}{formatCurrency(h.pnl)}
                      </span>
                      <div className={cn('text-[11px]', h.pnlPercent >= 0 ? 'text-profit' : 'text-loss')}>
                        {formatPercent(h.pnlPercent)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn('font-mono text-xs', h.dayChange >= 0 ? 'text-profit' : 'text-loss')}>
                        {h.dayChange >= 0 ? '+' : ''}{formatCurrency(h.dayChange)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trade modal */}
      {tradeModal && portfolio && (
        <TradeModal
          stock={tradeModal.stock}
          type={tradeModal.type}
          cashBalance={portfolio.cashBalance}
          availableQty={holdingsMap.get(tradeModal.stock.id) || 0}
          onClose={() => setTradeModal(null)}
          onSuccess={fetchAll}
        />
      )}
    </div>
  )
}
