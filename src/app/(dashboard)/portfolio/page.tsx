'use client'

import { useState, useEffect } from 'react'
import {
  Briefcase, TrendingUp, TrendingDown, DollarSign,
  PieChart, RefreshCw, CheckCircle, Clock,
} from 'lucide-react'
import {
  PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TradeModal } from '@/components/trading/TradeModal'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { formatCurrency, formatPercent, cn } from '@/lib/utils'
import type { Portfolio, Stock, Trade } from '@/types'

const COLORS = ['#387ed1', '#53b987', '#eb5757', '#f59e0b', '#a78bfa', '#22d3ee', '#f472b6', '#60a5fa']

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [tradeModal, setTradeModal] = useState<{ stock: Stock; type: 'BUY' | 'SELL' } | null>(null)

  const fetchData = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        fetch('/api/portfolio'),
        fetch('/api/trades?limit=50'),
      ])
      const [pData, tData] = await Promise.all([pRes.json(), tRes.json()])
      if (pData.portfolio) setPortfolio(pData.portfolio)
      if (tData.trades) setTrades(tData.trades)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  if (!portfolio) {
    return <div className="text-center py-16 text-text-muted">Failed to load portfolio</div>
  }

  // Allocation chart data
  const allocationData = [
    { name: 'Cash', value: portfolio.cashBalance },
    ...portfolio.holdings.map((h) => ({ name: h.stock.symbol, value: h.currentValue })),
  ].filter((d) => d.value > 0)

  const realizedPnL = (portfolio as any).realizedPnL ?? 0
  const unrealizedPnL = (portfolio as any).unrealizedPnL ?? 0

  const statCards = [
    {
      label: 'Total Value',
      value: formatCurrency(portfolio.totalValue),
      sub: `Initial: ${formatCurrency(portfolio.initialCapital)}`,
      icon: Briefcase,
      iconClass: 'bg-brand/10 text-brand',
    },
    {
      label: 'Cash Balance',
      value: formatCurrency(portfolio.cashBalance),
      sub: `${((portfolio.cashBalance / Math.max(portfolio.totalValue, 1)) * 100).toFixed(1)}% of portfolio`,
      icon: DollarSign,
      iconClass: 'bg-warning/10 text-warning',
    },
    {
      label: 'Overall P&L',
      value: formatCurrency(portfolio.totalPnL),
      sub: formatPercent(portfolio.totalPnLPercent),
      icon: portfolio.totalPnL >= 0 ? TrendingUp : TrendingDown,
      iconClass: portfolio.totalPnL >= 0 ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss',
      valueClass: portfolio.totalPnL >= 0 ? 'text-profit' : 'text-loss',
    },
    {
      label: "Today's P&L",
      value: formatCurrency(portfolio.dayPnL),
      sub: formatPercent(portfolio.dayPnLPercent),
      icon: portfolio.dayPnL >= 0 ? TrendingUp : TrendingDown,
      iconClass: portfolio.dayPnL >= 0 ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss',
      valueClass: portfolio.dayPnL >= 0 ? 'text-profit' : 'text-loss',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="page-title flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-brand" />
          Portfolio
        </h1>
        <button onClick={fetchData} className="btn-secondary text-xs flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="card">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs text-text-muted">{s.label}</span>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', s.iconClass)}>
                <s.icon className="w-4 h-4" />
              </div>
            </div>
            <div className={cn('text-xl font-bold font-mono', s.valueClass || 'text-text-primary')}>
              {s.value}
            </div>
            <div className={cn('text-xs mt-1', s.valueClass ? s.valueClass : 'text-text-muted')}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Realized / Unrealized P&L banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={cn(
          'flex items-center gap-3 p-4 rounded-xl border',
          realizedPnL >= 0
            ? 'bg-profit/5 border-profit/20'
            : 'bg-loss/5 border-loss/20',
        )}>
          <CheckCircle className={cn('w-5 h-5 shrink-0', realizedPnL >= 0 ? 'text-profit' : 'text-loss')} />
          <div>
            <div className="text-xs text-text-muted">Realized P&amp;L</div>
            <div className={cn('text-lg font-bold font-mono', realizedPnL >= 0 ? 'text-profit' : 'text-loss')}>
              {realizedPnL >= 0 ? '+' : ''}{formatCurrency(realizedPnL)}
            </div>
            <div className="text-[11px] text-text-disabled">From completed sell trades</div>
          </div>
        </div>

        <div className={cn(
          'flex items-center gap-3 p-4 rounded-xl border',
          unrealizedPnL >= 0
            ? 'bg-profit/5 border-profit/20'
            : 'bg-loss/5 border-loss/20',
        )}>
          <Clock className={cn('w-5 h-5 shrink-0', unrealizedPnL >= 0 ? 'text-profit' : 'text-loss')} />
          <div>
            <div className="text-xs text-text-muted">Unrealized P&amp;L</div>
            <div className={cn('text-lg font-bold font-mono', unrealizedPnL >= 0 ? 'text-profit' : 'text-loss')}>
              {unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(unrealizedPnL)}
            </div>
            <div className="text-[11px] text-text-disabled">Current open positions</div>
          </div>
        </div>
      </div>

      {/* Charts + Holdings */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Holdings table */}
        <div className="xl:col-span-2 card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-brand" />
              Holdings ({portfolio.holdings.length})
            </h2>
          </div>
          {portfolio.holdings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <Briefcase className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">No holdings yet</p>
              <a href="/market" className="text-xs text-brand mt-2">Go to Market →</a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Stock', 'Qty', 'Avg', 'LTP', 'Invested', 'Current', 'Unrlzd P&L', 'Day'].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs text-text-muted font-medium uppercase whitespace-nowrap">{h}</th>
                    ))}
                    <th className="px-3 py-2.5 text-xs text-text-muted font-medium uppercase">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.holdings.map((h) => (
                    <tr key={h.id} className="border-b border-border/40 hover:bg-background-hover/40">
                      <td className="px-3 py-3">
                        <div className="font-mono font-semibold text-text-primary">{h.stock.symbol}</div>
                        <div className="text-xs text-text-muted truncate max-w-[90px]">{h.stock.name}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-text-primary">{h.quantity}</td>
                      <td className="px-3 py-3 font-mono text-text-secondary text-xs whitespace-nowrap">{formatCurrency(h.avgPrice)}</td>
                      <td className="px-3 py-3 font-mono font-semibold text-text-primary whitespace-nowrap">{formatCurrency(h.stock.currentPrice)}</td>
                      <td className="px-3 py-3 font-mono text-text-secondary text-xs whitespace-nowrap">{formatCurrency(h.investedValue)}</td>
                      <td className="px-3 py-3 font-mono text-text-primary text-xs whitespace-nowrap">{formatCurrency(h.currentValue)}</td>
                      <td className="px-3 py-3">
                        <div className={cn('font-mono text-xs font-medium whitespace-nowrap', h.pnl >= 0 ? 'text-profit' : 'text-loss')}>
                          {h.pnl >= 0 ? '+' : ''}{formatCurrency(h.pnl)}
                        </div>
                        <div className={cn('text-[11px]', h.pnl >= 0 ? 'text-profit' : 'text-loss')}>
                          {formatPercent(h.pnlPercent)}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn('font-mono text-xs whitespace-nowrap', h.dayChange >= 0 ? 'text-profit' : 'text-loss')}>
                          {h.dayChange >= 0 ? '+' : ''}{formatCurrency(h.dayChange)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setTradeModal({ stock: h.stock as any, type: 'BUY' })}
                            className="px-2 py-1 text-xs bg-profit/10 text-profit hover:bg-profit/20 rounded font-medium"
                          >B</button>
                          <button
                            onClick={() => setTradeModal({ stock: h.stock as any, type: 'SELL' })}
                            className="px-2 py-1 text-xs bg-loss/10 text-loss hover:bg-loss/20 rounded font-medium"
                          >S</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Allocation chart */}
          <div className="card">
            <h2 className="font-semibold text-text-primary flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4 text-brand" />
              Allocation
            </h2>
            {allocationData.length > 1 ? (
              <ResponsiveContainer width="100%" height={180}>
                <RechartsPie>
                  <Pie
                    data={allocationData}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={75}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {allocationData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => [formatCurrency(v), '']}
                    contentStyle={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#e8e8e8' }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-text-muted text-sm">100% Cash</div>
            )}
            <div className="space-y-1.5 mt-2">
              {allocationData.slice(0, 6).map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-text-secondary">{d.name}</span>
                  </div>
                  <span className="font-mono text-text-primary">
                    {((d.value / portfolio.totalValue) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* P&L summary */}
          <div className="card">
            <h2 className="font-semibold text-text-primary mb-3 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand" /> P&amp;L Summary
            </h2>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Realized', value: realizedPnL, hint: 'Booked profits/losses' },
                { label: 'Unrealized', value: unrealizedPnL, hint: 'Open positions' },
                { label: 'Total P&L', value: portfolio.totalPnL, hint: 'Overall performance', bold: true },
              ].map((item) => (
                <div key={item.label} className={cn('flex items-center justify-between py-1', item.bold && 'border-t border-border pt-2 mt-2')}>
                  <div>
                    <div className={cn('text-text-secondary', item.bold && 'font-semibold text-text-primary')}>{item.label}</div>
                    <div className="text-[10px] text-text-disabled">{item.hint}</div>
                  </div>
                  <span className={cn('font-mono font-semibold', item.value >= 0 ? 'text-profit' : 'text-loss', item.bold && 'text-base')}>
                    {item.value >= 0 ? '+' : ''}{formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trade history */}
          <div className="card">
            <h2 className="font-semibold text-text-primary mb-3 text-sm">Recent Trades</h2>
            <ActivityFeed initialTrades={trades.slice(0, 10) as any} maxItems={10} />
          </div>
        </div>
      </div>

      {tradeModal && (
        <TradeModal
          stock={tradeModal.stock}
          type={tradeModal.type}
          cashBalance={portfolio.cashBalance}
          availableQty={portfolio.holdings.find((h) => h.stock.id === tradeModal.stock.id)?.quantity || 0}
          onClose={() => setTradeModal(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  )
}
