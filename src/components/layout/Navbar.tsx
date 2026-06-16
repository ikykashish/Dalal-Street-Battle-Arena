'use client'

import { useSession } from 'next-auth/react'
import { Bell, Menu, Wifi } from 'lucide-react'
import { cn, formatCurrency, getInitials } from '@/lib/utils'
import { BvpLogo } from '@/components/ui/BvpLogo'

interface NavbarProps { onMenuClick: () => void; cashBalance?: number }

export function Navbar({ onMenuClick, cashBalance }: NavbarProps) {
  const { data: session } = useSession()

  return (
    <header className="border-b border-border/60 shrink-0 bg-background-secondary/80 backdrop-blur-md">
      {/* BVP banner — visible on all screens */}
      <div className="bg-white border-b border-gray-200 px-4 py-1.5 flex items-center justify-center">
        <BvpLogo size="sm" />
      </div>
      {/* Main navbar row */}
    <div className="h-14 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 text-text-muted hover:text-text-primary hover:bg-background-hover rounded-xl"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium text-emerald-400 bg-emerald-400/10 border-emerald-400/25">
          <Wifi className="w-3 h-3" /> Live
        </div>
      </div>

      <div className="flex items-center gap-3">
        {cashBalance !== undefined && (
          <div className="hidden sm:flex items-center gap-2 bg-background-tertiary border border-border rounded-xl px-3 py-1.5">
            <span className="text-xs text-text-muted">Balance</span>
            <span className="font-mono font-bold text-sm bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">
              {formatCurrency(cashBalance)}
            </span>
          </div>
        )}

        <button className="relative p-2 text-text-muted hover:text-text-primary hover:bg-background-hover rounded-xl transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        {session?.user && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_12px_rgba(99,102,241,0.4)]">
              {getInitials(session.user.name || 'U')}
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-semibold text-text-primary leading-tight">{session.user.name}</div>
              <div className="text-[10px] text-indigo-400 font-medium leading-tight">Trader</div>
            </div>
          </div>
        )}
      </div>
    </div>
    </header>
  )
}
