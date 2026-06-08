'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BarChart2, Briefcase,
  Trophy, Users, Bookmark, TrendingUp, LogOut, X,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
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
