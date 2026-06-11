'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ScrollText, RefreshCw, ChevronLeft, ChevronRight,
  UserX, Ban, IndianRupee, Trash2, TrendingDown, TrendingUp, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdminGuard } from '@/components/admin/AdminGuard'
import type { AdminLogEntry } from '@/types'

const ACTION_META: Record<string, { label: string; icon: any; color: string }> = {
  USER_SUSPENDED: { label: 'User Suspended', icon: UserX, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  USER_BANNED: { label: 'User Banned', icon: Ban, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  USER_ACTIVATED: { label: 'User Activated', icon: ShieldCheck, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  USER_PENALISED: { label: 'User Penalised', icon: IndianRupee, color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
  USER_DELETED: { label: 'User Deleted', icon: Trash2, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  RECESSION_TRIGGERED: { label: 'Recession Triggered', icon: TrendingDown, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  STOCK_UP: { label: 'Stock Up (+5%)', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
}

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'USER_SUSPENDED', label: 'Suspended' },
  { key: 'USER_BANNED', label: 'Banned' },
  { key: 'USER_PENALISED', label: 'Penalised' },
  { key: 'USER_DELETED', label: 'Deleted' },
  { key: 'RECESSION_TRIGGERED', label: 'Recession' },
  { key: 'STOCK_UP', label: 'Stock Up' },
]

function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

function LogsContent() {
  const [logs, setLogs] = useState<AdminLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('ALL')
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ action, page: String(page), pageSize: '25' }).toString()
      const res = await fetch(`/api/admin/logs?${qs}`)
      const data = await res.json()
      if (data.logs) {
        setLogs(data.logs)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      }
    } finally {
      setLoading(false)
    }
  }, [action, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-orange-400" /> Admin Audit Logs
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Every administrative action is permanently recorded here</p>
        </div>
        <button onClick={fetchLogs} className="btn-secondary text-xs flex items-center gap-1.5">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => { setAction(f.key); setPage(1) }}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              action === f.key ? 'bg-brand text-white' : 'bg-background-tertiary text-text-muted hover:text-text-primary')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Logs table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background-tertiary/40">
                {['Action', 'Target User', 'Details', 'Admin', 'Timestamp'].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] text-text-muted font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12"><div className="inline-block w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-text-muted text-sm">No admin actions logged yet</td></tr>
              ) : (
                logs.map((log) => {
                  const meta = ACTION_META[log.action] || { label: log.action, icon: ScrollText, color: 'text-text-muted bg-background-tertiary border-border' }
                  const Icon = meta.icon
                  return (
                    <tr key={log.id} className="border-b border-border/40 hover:bg-background-hover/40">
                      <td className="px-3 py-3">
                        <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap', meta.color)}>
                          <Icon className="w-3.5 h-3.5" /> {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {log.targetName ? (
                          <>
                            <div className="text-text-primary text-xs font-medium">{log.targetName}</div>
                            <div className="text-[10px] text-text-muted">{log.targetEmail}</div>
                          </>
                        ) : (
                          <span className="text-text-disabled text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-text-secondary max-w-[280px] truncate" title={log.details || ''}>
                        {log.details || '—'}
                      </td>
                      <td className="px-3 py-3 text-[11px] text-text-muted font-mono">{log.adminEmail}</td>
                      <td className="px-3 py-3 text-[11px] text-text-muted whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-3 border-t border-border">
          <span className="text-xs text-text-muted">{total} log{total !== 1 ? 's' : ''} · Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="p-1.5 rounded-lg bg-background-tertiary hover:bg-background-hover text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-background-tertiary hover:bg-background-hover text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminLogsPage() {
  return (
    <AdminGuard>
      <LogsContent />
    </AdminGuard>
  )
}
