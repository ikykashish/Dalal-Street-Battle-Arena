'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BarChart2, Briefcase,
  Trophy, Users, Bookmark, TrendingUp, LogOut, X,
  AlertTriangle, Zap, Eye, ScrollText, Rocket,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { isAdminEmail } from '@/lib/admin-emails'
import { BvpLogo } from '@/components/ui/BvpLogo'

const nav = [
  { href: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',   color: 'text-indigo-400' },
  { href: '/market',      icon: BarChart2,        label: 'Market',      color: 'text-cyan-400'   },
  { href: '/portfolio',   icon: Briefcase,        label: 'Portfolio',   color: 'text-violet-400' },
  { href: '/leaderboard', icon: Trophy,           label: 'Leaderboard', color: 'text-amber-400'  },
  { href: '/teams',       icon: Users,            label: 'Teams',       color: 'text-emerald-400'},
  { href: '/watchlist',   icon: Bookmark,         label: 'Watchlist',   color: 'text-pink-400'   },
]

interface SidebarProps { onClose?: () => void; mobile?: boolean }

export function Sidebar({ onClose, mobile }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isAdmin, setIsAdmin] = useState(false)
  const [recessionLoading, setRecessionLoading] = useState(false)
  const [recessionMsg, setRecessionMsg] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [stockUpLoading, setStockUpLoading] = useState(false)
  const [stockUpMsg, setStockUpMsg] = useState('')
  const [stockUpConfirmOpen, setStockUpConfirmOpen] = useState(false)

  useEffect(() => {
    setIsAdmin(isAdminEmail(session?.user?.email))
  }, [session])

  const triggerRecession = async () => {
    setConfirmOpen(false)
    setRecessionLoading(true)
    setRecessionMsg('')
    try {
      const res = await fetch('/api/admin/recession', { method: 'POST' })
      const data = await res.json()
      setRecessionMsg(res.ok ? `✅ ${data.message}` : `❌ ${data.error}`)
    } catch {
      setRecessionMsg('❌ Request failed')
    } finally {
      setRecessionLoading(false)
      setTimeout(() => setRecessionMsg(''), 6000)
    }
  }

  const triggerStockUp = async () => {
    setStockUpConfirmOpen(false)
    setStockUpLoading(true)
    setStockUpMsg('')
    try {
      const res = await fetch('/api/admin/stockup', { method: 'POST' })
      const data = await res.json()
      setStockUpMsg(res.ok ? `✅ ${data.message}` : `❌ ${data.error}`)
    } catch {
      setStockUpMsg('❌ Request failed')
    } finally {
      setStockUpLoading(false)
      setTimeout(() => setStockUpMsg(''), 6000)
    }
  }

  return (
    <aside className={cn(
      'flex flex-col h-full w-64 border-r border-border/60',
      'bg-gradient-to-b from-background-secondary via-background-secondary to-background-primary',
      mobile && 'w-full'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border/60 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onClose}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-text-primary leading-tight">Dalal Street</div>
            <div className="text-xs font-semibold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent leading-tight">
              Battle Arena
            </div>
          </div>
        </Link>
        {mobile && (
          <button onClick={onClose} className="text-text-muted hover:text-text-primary p-1">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* University logo */}
      <div className="px-3 py-2.5 border-b border-border/40 bg-white/95">
        <BvpLogo size="sm" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ href, icon: Icon, label, color }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group',
                active
                  ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/10 border border-indigo-500/30 text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                  : 'text-text-muted hover:text-text-primary hover:bg-background-hover border border-transparent'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0 transition-colors', active ? color : 'group-hover:' + color)} />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.8)]" />}
            </Link>
          )
        })}

        {/* Admin: Recession Round button */}
        {isAdmin && (
          <div className="pt-3 mt-3 border-t border-border/40">
            <div className="px-3 mb-2 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-orange-400" />
              <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Admin Controls</span>
            </div>

            {!confirmOpen ? (
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={recessionLoading}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-orange-300 hover:text-white hover:bg-orange-600/90 border border-orange-500/30 hover:border-orange-500/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-orange-400" />
                {recessionLoading ? 'Triggering…' : 'Recession Round'}
              </button>
            ) : (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 space-y-2">
                <p className="text-xs text-orange-200 leading-snug">
                  ⚠️ Drop <strong>all stocks by 10%</strong> immediately for all users?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={triggerRecession}
                    className="flex-1 py-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors"
                  >
                    Yes, trigger!
                  </button>
                  <button
                    onClick={() => setConfirmOpen(false)}
                    className="flex-1 py-1.5 text-xs font-medium bg-background-tertiary hover:bg-background-hover text-text-secondary rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {recessionMsg && (
              <p className="mt-2 px-3 text-[11px] text-orange-200 leading-snug">{recessionMsg}</p>
            )}

            {/* Admin navigation links */}
            <div className="mt-2 space-y-1">
              {[
                { href: '/admin/monitoring', icon: Eye, label: 'Stock Monitoring' },
                { href: '/admin/logs', icon: ScrollText, label: 'Admin Logs' },
              ].map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium border transition-all',
                      active
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-200'
                        : 'text-orange-300/90 border-orange-500/20 hover:text-white hover:bg-orange-600/80 hover:border-orange-500/50'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.8)]" />}
                  </Link>
                )
              })}
            </div>

            {/* Stock Up button (green) — raises all stocks 5% */}
            <div className="mt-1">
              {!stockUpConfirmOpen ? (
                <button
                  onClick={() => setStockUpConfirmOpen(true)}
                  disabled={stockUpLoading}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-bold text-emerald-300 hover:text-white hover:bg-emerald-600/90 border border-emerald-500/30 hover:border-emerald-500/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Rocket className="w-4 h-4 shrink-0 text-emerald-400" />
                  {stockUpLoading ? 'Boosting…' : 'STOCK UP'}
                </button>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-emerald-200 leading-snug">
                    🚀 Raise <strong>all stocks by 5%</strong> immediately for all users?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={triggerStockUp}
                      className="flex-1 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                    >
                      Yes, boost!
                    </button>
                    <button
                      onClick={() => setStockUpConfirmOpen(false)}
                      className="flex-1 py-1.5 text-xs font-medium bg-background-tertiary hover:bg-background-hover text-text-secondary rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {stockUpMsg && (
                <p className="mt-2 px-3 text-[11px] text-emerald-200 leading-snug">{stockUpMsg}</p>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border/60 shrink-0 space-y-1">
        <div className="px-3 py-2">
          <p className="text-[10px] text-text-disabled text-center">
            Made by{' '}
            <span className="font-semibold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Pavith Grover
            </span>
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-text-muted hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
