'use client'

import { useState } from 'react'
import { X, IndianRupee, AlertCircle, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { AdminUserRow } from '@/types'

interface Props {
  user: AdminUserRow
  onClose: () => void
  onSuccess: () => void
}

const MIN = 1
const MAX = 500000

export function PenaliseModal({ user, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState<number>(10000)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const valid = amount >= MIN && amount <= MAX && reason.trim().length >= 3

  const submit = async () => {
    if (!valid) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${user.id}/penalise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason: reason.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to penalise')
      } else {
        setSuccess(data.message || 'Penalty applied')
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1200)
      }
    } catch {
      setError('Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-border bg-amber-500/5 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-amber-400" />
            <div>
              <div className="font-bold text-text-primary">Penalise User</div>
              <div className="text-xs text-text-muted">{user.name} · {user.email}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {success && (
            <div className="flex items-center gap-2 p-3 bg-profit/10 border border-profit/20 rounded-lg text-profit text-sm">
              <CheckCircle className="w-4 h-4 shrink-0" /> {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-loss/10 border border-loss/20 rounded-lg text-loss text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="bg-background-tertiary rounded-lg p-3 flex justify-between text-sm">
            <span className="text-text-muted">Current cash balance</span>
            <span className="font-mono font-semibold text-text-primary">{formatCurrency(user.cashBalance)}</span>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Penalty amount (₹{MIN.toLocaleString('en-IN')} – ₹{MAX.toLocaleString('en-IN')})
            </label>
            <input
              type="number"
              value={amount}
              min={MIN}
              max={MAX}
              onChange={(e) => setAmount(Math.max(0, Math.min(MAX, parseInt(e.target.value) || 0)))}
              className="input-field font-mono"
            />
            <div className="flex gap-2 mt-2">
              {[5000, 25000, 100000, 500000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className="flex-1 py-1.5 text-xs bg-background-tertiary hover:bg-background-hover text-text-secondary rounded border border-border"
                >
                  ₹{v >= 100000 ? `${v / 100000}L` : `${v / 1000}K`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={200}
              placeholder="e.g. Violation of tournament rules"
              className="input-field resize-none"
            />
            <div className="text-right text-[10px] text-text-disabled mt-1">{reason.length}/200</div>
          </div>

          <div className="bg-background-tertiary rounded-lg p-3 flex justify-between text-sm">
            <span className="text-text-muted">Balance after penalty</span>
            <span className="font-mono font-semibold text-loss">
              {formatCurrency(Math.max(0, user.cashBalance - amount))}
            </span>
          </div>

          <button
            onClick={submit}
            disabled={!valid || loading || !!success}
            className="w-full py-3 rounded-xl font-bold text-sm bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Applying…' : `Penalise ${formatCurrency(amount)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
