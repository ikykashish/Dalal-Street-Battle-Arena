'use client'

import { useState } from 'react'
import { X, Trash2, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import type { AdminUserRow } from '@/types'

interface Props {
  user: AdminUserRow
  onClose: () => void
  onSuccess: () => void
}

export function DeleteUserModal({ user, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canDelete = confirmText.trim().toUpperCase() === 'DELETE'

  const doDelete = async () => {
    if (!canDelete) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to delete')
      } else {
        setSuccess(data.message || 'User deleted')
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
      <div className="relative bg-background-card border border-rose-500/30 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-border bg-rose-500/10 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            <div className="font-bold text-text-primary">Delete User</div>
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

          {!success && step === 1 && (
            <>
              <div className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-sm text-rose-200 leading-snug">
                  Are you sure you want to <strong>permanently delete</strong> this user and all associated data?
                </p>
              </div>
              <div className="bg-background-tertiary rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-text-muted">Name</span><span className="text-text-primary font-medium">{user.name}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Email</span><span className="text-text-primary font-mono text-xs">{user.email}</span></div>
                <div className="flex justify-between"><span className="text-text-muted">Trades</span><span className="text-text-primary">{user.totalTrades}</span></div>
              </div>
              <p className="text-xs text-text-muted">
                This removes the account, team membership, portfolio, trade history and penalties. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-background-tertiary hover:bg-background-hover text-text-secondary">
                  Cancel
                </button>
                <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-rose-600/80 hover:bg-rose-600 text-white">
                  Continue
                </button>
              </div>
            </>
          )}

          {!success && step === 2 && (
            <>
              <div className="flex items-start gap-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-sm text-rose-200 leading-snug">
                  Final confirmation. Type <strong className="font-mono">DELETE</strong> to permanently remove <strong>{user.name}</strong>.
                </p>
              </div>
              <input
                autoFocus
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="input-field font-mono text-center tracking-widest"
              />
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-background-tertiary hover:bg-background-hover text-text-secondary">
                  Back
                </button>
                <button
                  onClick={doDelete}
                  disabled={!canDelete || loading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Deleting…' : 'Delete Permanently'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
