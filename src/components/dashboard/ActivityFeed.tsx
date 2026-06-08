'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'

interface ActivityItem {
  id: string
  type: 'BUY' | 'SELL'
  symbol: string
  name: string
  quantity: number
  price: number
  total: number
  userName: string
  time: Date
  isOwn?: boolean
}

interface ActivityFeedProps {
  initialTrades?: Array<{
    id: string
    type: string
    quantity: number
    price: number
    total: number
    createdAt: string | Date
    stock: { symbol: string; name: string }
    user?: { name: string }
  }>
  maxItems?: number
  currentUserId?: string
  poll?: boolean
}

export function ActivityFeed({
  initialTrades = [],
  maxItems = 20,
  currentUserId,
  poll = false,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(() =>
    initialTrades.slice(0, maxItems).map((t) => ({
      id: t.id,
      type: t.type as 'BUY' | 'SELL',
      symbol: t.stock.symbol,
      name: t.stock.name,
      quantity: t.quantity,
      price: t.price,
      total: t.total,
      userName: t.user?.name || 'Trader',
      time: new Date(t.createdAt),
      isOwn: false,
    }))
  )

  // Poll for new trades every 8 seconds if enabled
  useEffect(() => {
    if (!poll) return
    const fetchTrades = async () => {
      try {
        const res = await fetch('/api/trades?limit=20')
        const data = await res.json()
        if (data.trades) {
          setActivities(
            data.trades.slice(0, maxItems).map((t: any) => ({
              id: t.id,
              type: t.type as 'BUY' | 'SELL',
              symbol: t.stock.symbol,
              name: t.stock.name,
              quantity: t.quantity,
              price: t.price,
              total: t.total,
              userName: t.user?.name || 'Trader',
              time: new Date(t.createdAt),
              isOwn: t.userId === currentUserId,
            }))
          )
        }
      } catch {}
    }
    fetchTrades()
    const interval = setInterval(fetchTrades, 8000)
    return () => clearInterval(interval)
  }, [poll, maxItems, currentUserId])

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-text-muted">
        <Activity className="w-8 h-8 mb-2 opacity-30" />
        <p className="text-sm">No recent trades</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border/40">
      {activities.map((a) => (
        <div key={a.id} className="flex items-center gap-3 py-2.5 hover:bg-background-hover/30 px-1 rounded transition-colors">
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
            a.type === 'BUY' ? 'bg-profit/10' : 'bg-loss/10'
          )}>
            {a.type === 'BUY'
              ? <TrendingUp className="w-3.5 h-3.5 text-profit" />
              : <TrendingDown className="w-3.5 h-3.5 text-loss" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-medium text-text-primary truncate max-w-[80px]">
                {a.isOwn ? 'You' : a.userName}
              </span>
              <span className={cn('font-medium', a.type === 'BUY' ? 'text-profit' : 'text-loss')}>
                {a.type === 'BUY' ? 'bought' : 'sold'}
              </span>
              <span className="font-mono font-semibold text-text-primary">{a.quantity}×{a.symbol}</span>
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              {formatCurrency(a.total)} · {formatDistanceToNow(a.time, { addSuffix: true })}
            </div>
          </div>
          <div className={cn('text-xs font-mono font-medium shrink-0', a.type === 'BUY' ? 'text-loss' : 'text-profit')}>
            {a.type === 'BUY' ? '-' : '+'}{formatCurrency(a.total)}
          </div>
        </div>
      ))}
    </div>
  )
}
