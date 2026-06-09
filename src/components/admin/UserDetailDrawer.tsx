'use client'

import { useEffect, useState } from 'react'
import { X, TrendingUp, TrendingDown, IndianRupee, History } from 'lucide-react'
import { formatCurrency, formatPrice, cn } from '@/lib/utils'
import { StatusBadge } from './AdminGuard'
import type { AdminTrade, AdminPenalty, AdminUserRow } from '@/types'

interface Props {
  user: AdminUserRow
  onClose: () => void
}

interface DetailData {
  trades: AdminTrade[]
  penalties: AdminPenalty[]
  summary: { totalTrades: number; realizedPnL: number; totalPenalised: number }
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export function UserDetailDrawer({ user, onClose }: Props) {
  const [data, setData] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'trades' | 'penalties'>('trades')

  useEffect(() => {
    fetch(`/api/admin/users/${user.id}/trades`)
      .then((r) => r.json())
      .then((d) => {
        if (d.trades) setData({ trades: d.trades, penalties: d.penalties || [], summary: d.summary })
      })
      .finally(() => setLoading(false))
  }, [user.id])

  return (
    <div className="fixed inset-0 z-[55] flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background-card border-l border-border w-full max-w-2xl h-full shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-text-primary text-lg">{user.name}</h2>
              <StatusBadge status={user.status} />
            </div>
            <p className="text-xs text-text-muted mt-0.5">{user.email}</p>
            {user.teamName && <p className="text-xs text-text-muted">Team: {user.teamName}</p>}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 p-4 border-b border-border shrink-0">
          <div className="bg-background-tertiary rounded-lg p-2.5">
            <div className="text-[10px] text-text-muted uppercase">Cash</div>
            <div className="font-mono font-bold text-sm text-text-primary">{formatCurrency(user.cashBalance)}</div>
          </div>
          <div className="bg-background-tertiary rounded-lg p-2.5">
            <div className="text-[10px] text-text-muted uppercase">Portfolio</div>
            <div className="font-mono font-bold text-sm text-text-primary">{formatCurrency(user.portfolioValue)}</div>
          </div>
          <div className="bg-background-tertiary rounded-lg p-2.5">
            <div className="text-[10px] text-text-muted uppercase">Total P&L</div>
            <div className={cn('font-mono font-bold text-sm', user.totalPnL >= 0 ? 'text-profit' : 'text-loss')}>
              {user.totalPnL >= 0 ? '+' : ''}{formatCurrency(user.totalPnL)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 shrink-0">
          <button
            onClick={() => setTab('trades')}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5',
              tab === 'trades' ? 'bg-brand/15 text-brand' : 'text-text-muted hover:text-text-primary')}
          >
            <History className="w-3.5 h-3.5" /> Trade History {data && `(${data.trades.length})`}
          </button>
          <button
            onClick={() => setTab('penalties')}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5',
              tab === 'penalties' ? 'bg-amber-500/15 text-amber-300' : 'text-text-muted hover:text-text-primary')}
          >
            <IndianRupee className="w-3.5 h-3.5" /> Penalties {data && `(${data.penalties.length})`}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
            </div>
          ) : tab === 'trades' ? (
            data && data.trades.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Stock', 'Type', 'Qty', 'Price', 'P&L', 'Time'].map((h) => (
                      <th key={h} className="text-left px-2 py-2 text-[10px] text-text-muted font-medium uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.trades.map((t) => (
                    <tr key={t.id} className="border-b border-border/40 hover:bg-background-hover/40">
                      <td className="px-2 py-2.5">
                        <div className="font-mono font-semibold text-text-primary text-xs">{t.stockSymbol}</div>
                        <div className="text-[10px] text-text-muted truncate max-w-[90px]">{t.stockName}</div>
                      </td>
                      <td className="px-2 py-2.5">
                        <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold',
                          t.type === 'BUY' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss')}>
                          {t.type === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {t.type}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 font-mono text-text-primary text-xs">{t.quantity}</td>
                      <td className="px-2 py-2.5 font-mono text-text-secondary text-xs">{formatPrice(t.price)}</td>
                      <td className="px-2 py-2.5">
                        {t.pnl === null ? (
                          <span className="text-text-disabled text-xs">—</span>
                        ) : (
                          <span className={cn('font-mono text-xs font-medium', t.pnl >= 0 ? 'text-profit' : 'text-loss')}>
                            {t.pnl >= 0 ? '+' : ''}{formatCurrency(t.pnl)}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-[10px] text-text-muted whitespace-nowrap">{fmtDate(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-text-muted text-sm">No trades yet</div>
            )
          ) : data && data.penalties.length > 0 ? (
            <div className="space-y-2">
              {data.penalties.map((p) => (
                <div key={p.id} className="bg-background-tertiary rounded-lg p-3 border border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-loss">−{formatCurrency(p.amount)}</span>
                    <span className="text-[10px] text-text-muted">{fmtDate(p.createdAt)}</span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{p.reason}</p>
                  <p className="text-[10px] text-text-disabled mt-1">by {p.adminEmail}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-text-muted text-sm">No penalties issued</div>
          )}
        </div>
      </div>
    </div>
  )
}
