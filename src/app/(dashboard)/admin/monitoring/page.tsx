'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Eye, Search, RefreshCw, IndianRupee, Trash2, Users,
  ChevronLeft, ChevronRight, ArrowUpDown, ShieldCheck,
} from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import { isAdminEmail } from '@/lib/admin-emails'
import { AdminGuard, StatusBadge } from '@/components/admin/AdminGuard'
import { PenaliseModal } from '@/components/admin/PenaliseModal'
import { DeleteUserModal } from '@/components/admin/DeleteUserModal'
import { UserDetailDrawer } from '@/components/admin/UserDetailDrawer'
import type { AdminUserRow, UserStatus } from '@/types'

const SORTS = [
  { key: 'profit', label: 'Profit' },
  { key: 'cash', label: 'Cash' },
  { key: 'trades', label: 'Trades' },
  { key: 'name', label: 'Name' },
] as const

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'SUSPENDED', label: 'Suspended' },
  { key: 'BANNED', label: 'Banned' },
] as const

function fmtDate(d: string | null) {
  if (!d) return 'Never'
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function MonitoringContent() {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [counts, setCounts] = useState({ all: 0, active: 0, suspended: 0, banned: 0 })
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<string>('profit')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [penaliseUser, setPenaliseUser] = useState<AdminUserRow | null>(null)
  const [deleteUser, setDeleteUser] = useState<AdminUserRow | null>(null)
  const [detailUser, setDetailUser] = useState<AdminUserRow | null>(null)

  // debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        search, sort, order, status: statusFilter, page: String(page), pageSize: '15',
      }).toString()
      const res = await fetch(`/api/admin/users?${qs}`)
      const data = await res.json()
      if (data.users) {
        setUsers(data.users)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setCounts(data.counts)
      }
    } catch {
      setToast({ msg: 'Failed to load users', ok: false })
    } finally {
      setLoading(false)
    }
  }, [search, sort, order, statusFilter, page])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const changeStatus = async (user: AdminUserRow, newStatus: UserStatus) => {
    if (newStatus === user.status) return
    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) showToast(data.error || 'Failed', false)
      else { showToast(`${user.name} → ${newStatus}`, true); fetchUsers() }
    } catch {
      showToast('Request failed', false)
    }
  }

  const toggleSort = (key: string) => {
    if (sort === key) setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))
    else { setSort(key); setOrder('desc') }
    setPage(1)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Eye className="w-5 h-5 text-orange-400" /> Stock Monitoring
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Real-time monitoring of all participant trading activity</p>
        </div>
        <button onClick={fetchUsers} className="btn-secondary text-xs flex items-center gap-1.5">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: counts.all, color: 'text-text-primary', icon: Users },
          { label: 'Active', value: counts.active, color: 'text-emerald-400', icon: ShieldCheck },
          { label: 'Suspended', value: counts.suspended, color: 'text-amber-400', icon: IndianRupee },
          { label: 'Banned', value: counts.banned, color: 'text-rose-400', icon: Trash2 },
        ].map((s) => (
          <div key={s.label} className="card">
            <div className="text-xs text-text-muted">{s.label}</div>
            <div className={cn('text-2xl font-bold font-mono mt-1', s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="card space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, email or team…"
              className="input-field pl-9"
            />
          </div>
          {/* Sort */}
          <div className="flex gap-1.5 flex-wrap">
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => toggleSort(s.key)}
                className={cn('px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1 transition-colors',
                  sort === s.key
                    ? 'bg-brand/15 border-brand/40 text-brand'
                    : 'bg-background-tertiary border-border text-text-muted hover:text-text-primary')}
              >
                {s.label}
                {sort === s.key && <ArrowUpDown className="w-3 h-3" />}
                {sort === s.key && <span className="text-[9px]">{order === 'desc' ? '↓' : '↑'}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setPage(1) }}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === tab.key
                  ? 'bg-brand text-white'
                  : 'bg-background-tertiary text-text-muted hover:text-text-primary')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-border bg-background-tertiary/40">
                {['User', 'Team', 'Cash', 'Portfolio', 'Total P&L', 'Bought', 'Sold', 'Trades', 'Last Trade', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] text-text-muted font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-12"><div className="inline-block w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-text-muted text-sm">No users found</td></tr>
              ) : (
                users.map((u) => {
                  const isProtected = isAdminEmail(u.email)
                  return (
                    <tr key={u.id} className="border-b border-border/40 hover:bg-background-hover/40">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-text-primary">{u.name}</div>
                        <div className="text-[11px] text-text-muted">{u.email}</div>
                      </td>
                      <td className="px-3 py-3 text-text-secondary text-xs">{u.teamName || '—'}</td>
                      <td className="px-3 py-3 font-mono text-text-primary text-xs">{formatCurrency(u.cashBalance)}</td>
                      <td className="px-3 py-3 font-mono text-text-secondary text-xs">{formatCurrency(u.portfolioValue)}</td>
                      <td className="px-3 py-3">
                        <span className={cn('font-mono text-xs font-semibold', u.totalPnL >= 0 ? 'text-profit' : 'text-loss')}>
                          {u.totalPnL >= 0 ? '+' : ''}{formatCurrency(u.totalPnL)}
                        </span>
                        <div className={cn('text-[10px]', u.totalPnL >= 0 ? 'text-profit' : 'text-loss')}>
                          {u.totalPnLPercent >= 0 ? '+' : ''}{u.totalPnLPercent.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-profit text-xs">{u.stocksBought}</td>
                      <td className="px-3 py-3 font-mono text-loss text-xs">{u.stocksSold}</td>
                      <td className="px-3 py-3 font-mono text-text-primary text-xs">{u.totalTrades}</td>
                      <td className="px-3 py-3 text-[11px] text-text-muted">{fmtDate(u.lastTradeAt)}</td>
                      <td className="px-3 py-3">
                        {isProtected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-indigo-300 font-bold uppercase">
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <select
                            value={u.status}
                            onChange={(e) => changeStatus(u, e.target.value as UserStatus)}
                            className={cn('bg-background-tertiary border rounded-lg px-2 py-1 text-[11px] font-bold cursor-pointer focus:outline-none',
                              u.status === 'ACTIVE' ? 'border-emerald-500/30 text-emerald-300'
                                : u.status === 'SUSPENDED' ? 'border-amber-500/30 text-amber-300'
                                : 'border-rose-500/30 text-rose-300')}
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="SUSPENDED">SUSPENDED</option>
                            <option value="BANNED">BANNED</option>
                          </select>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailUser(u)} title="View trades"
                            className="p-1.5 rounded-lg bg-background-tertiary hover:bg-brand/20 text-text-muted hover:text-brand">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setPenaliseUser(u)} disabled={isProtected} title="Penalise"
                            className="p-1.5 rounded-lg bg-background-tertiary hover:bg-amber-500/20 text-text-muted hover:text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed">
                            <IndianRupee className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteUser(u)} disabled={isProtected} title="Delete"
                            className="p-1.5 rounded-lg bg-background-tertiary hover:bg-rose-500/20 text-text-muted hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-3 border-t border-border">
          <span className="text-xs text-text-muted">
            {total} user{total !== 1 ? 's' : ''} · Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-background-tertiary hover:bg-background-hover text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-background-tertiary hover:bg-background-hover text-text-secondary disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn('fixed bottom-5 right-5 z-[70] px-4 py-3 rounded-xl shadow-2xl text-sm font-medium border',
          toast.ok ? 'bg-profit/15 border-profit/30 text-profit' : 'bg-loss/15 border-loss/30 text-loss')}>
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      {penaliseUser && (
        <PenaliseModal user={penaliseUser} onClose={() => setPenaliseUser(null)}
          onSuccess={() => { showToast('Penalty applied', true); fetchUsers() }} />
      )}
      {deleteUser && (
        <DeleteUserModal user={deleteUser} onClose={() => setDeleteUser(null)}
          onSuccess={() => { showToast('User deleted', true); fetchUsers() }} />
      )}
      {detailUser && (
        <UserDetailDrawer user={detailUser} onClose={() => setDetailUser(null)} />
      )}
    </div>
  )
}

export default function StockMonitoringPage() {
  return (
    <AdminGuard>
      <MonitoringContent />
    </AdminGuard>
  )
}
