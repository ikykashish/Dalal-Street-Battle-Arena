'use client'

import { useState, useEffect } from 'react'
import { X, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react'
import { formatPrice, formatCurrency, cn } from '@/lib/utils'
import { useLivePrice } from '@/hooks/useStocks'
import type { Stock } from '@/types'

interface TradeModalProps {
  stock: Stock
  type: 'BUY' | 'SELL'
  availableQty?: number
  cashBalance: number
  onClose: () => void
  onSuccess: () => void
}

export function TradeModal({ stock, type, availableQty = 0, cashBalance, onClose, onSuccess }: TradeModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { price } = useLivePrice(stock.symbol, stock.currentPrice, stock.previousClose)

  const total = price * quantity
  const canAfford = type === 'BUY' ? total <= cashBalance : quantity <= availableQty
  const maxQty = type === 'BUY' ? Math.floor(cashBalance / price) : availableQty

  const handleTrade = async () => {
    if (!canAfford) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockId: stock.id, type, quantity, clientPrice: price }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Trade failed')
      } else {
        setSuccess(data.message || `${type === 'BUY' ? 'Bought' : 'Sold'} successfully!`)
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      }
    } catch {
      setError('Trade failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const quickQty = [1, 5, 10, 25]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl animate-slide-up">
        {/* Header */}
        <div className={cn(
          'flex items-center justify-between p-4 border-b border-border rounded-t-2xl',
          type === 'BUY' ? 'bg-profit/5' : 'bg-loss/5'
        )}>
          <div className="flex items-center gap-3">
            {type === 'BUY'
              ? <TrendingUp className="w-5 h-5 text-profit" />
              : <TrendingDown className="w-5 h-5 text-loss" />
            }
            <div>
              <div className="font-bold text-text-primary">{stock.symbol}</div>
              <div className="text-xs text-text-muted">{stock.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-mono font-bold text-text-primary">{formatPrice(price)}</div>
              <div className={cn('text-xs', stock.changePercent >= 0 ? 'text-profit' : 'text-loss')}>
                {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </div>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {success && (
            <div className="flex items-center gap-2 p-3 bg-profit/10 border border-profit/20 rounded-lg text-profit text-sm">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-loss/10 border border-loss/20 rounded-lg text-loss text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm text-text-secondary mb-2">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(parseInt(e.target.value) || 1, maxQty)))}
              min={1}
              max={maxQty}
              className="input-field text-lg font-mono text-center"
            />
            <div className="flex gap-2 mt-2">
              {quickQty.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuantity(Math.min(q, maxQty))}
                  className="flex-1 py-1.5 text-xs bg-background-tertiary hover:bg-background-hover text-text-secondary hover:text-text-primary rounded border border-border transition-colors"
                >
                  {q}
                </button>
              ))}
              <button
                onClick={() => setQuantity(maxQty)}
                className="flex-1 py-1.5 text-xs bg-background-tertiary hover:bg-background-hover text-text-secondary hover:text-text-primary rounded border border-border transition-colors"
              >
                Max
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-background-tertiary rounded-xl p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Price per share</span>
              <span className="font-mono text-text-primary">{formatPrice(price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Quantity</span>
              <span className="font-mono text-text-primary">{quantity}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
              <span className="font-medium text-text-secondary">Total</span>
              <span className="font-mono font-bold text-text-primary">{formatCurrency(total)}</span>
            </div>
            {type === 'BUY' && (
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Balance after</span>
                <span className={cn('font-mono', canAfford ? 'text-text-secondary' : 'text-loss')}>
                  {formatCurrency(cashBalance - total)}
                </span>
              </div>
            )}
          </div>

          {/* Action button */}
          <button
            onClick={handleTrade}
            disabled={loading || !canAfford || quantity <= 0 || !!success}
            className={cn(
              'w-full py-3 rounded-xl font-bold text-sm transition-all',
              type === 'BUY'
                ? 'bg-profit hover:bg-profit-light text-white disabled:opacity-50'
                : 'bg-loss hover:bg-loss-light text-white disabled:opacity-50',
              'disabled:cursor-not-allowed'
            )}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : !canAfford ? (
              type === 'BUY' ? 'Insufficient Funds' : 'Insufficient Shares'
            ) : (
              `${type} ${quantity} Share${quantity > 1 ? 's' : ''} · ${formatCurrency(total)}`
            )}
          </button>

          {type === 'BUY' && (
            <p className="text-center text-xs text-text-disabled">
              Available: {formatCurrency(cashBalance)} · Max: {maxQty} shares
            </p>
          )}
          {type === 'SELL' && (
            <p className="text-center text-xs text-text-disabled">
              Holdings: {availableQty} shares
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
