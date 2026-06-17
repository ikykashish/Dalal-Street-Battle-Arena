'use client'

import { useSession } from 'next-auth/react'
import { Bell, Menu, Wifi, CheckCheck, X } from 'lucide-react'
import { cn, formatCurrency, getInitials } from '@/lib/utils'
import { BvpLogo } from '@/components/ui/BvpLogo'
import { useState, useEffect, useRef, useCallback } from 'react'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

interface NavbarProps { onMenuClick: () => void; cashBalance?: number }

function typeColor(type: string) {
  switch (type) {
    case 'TRADE':  return 'text-brand'
    case 'MARKET': return 'text-warning'
    case 'ADMIN':  return 'text-loss'
    case 'SUCCESS': return 'text-profit'
    case 'WARNING': return 'text-amber-400'
    default:       return 'text-text-muted'
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function Navbar({ onMenuClick, cashBalance }: NavbarProps) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {}
  }, [session])

  // Poll for notifications every 15 seconds
  useEffect(() => {
    fetchNotifications()
    const t = setInterval(fetchNotifications, 15000)
    return () => clearInterval(t)
  }, [fetchNotifications])

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const markRead = async (id: string) => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  return (
    <header className="border-b border-border/60 shrink-0 bg-background-secondary/80 backdrop-blur-md">
      {/* BVP banner */}
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

          {/* Notification bell */}
          <div className="relative" ref={panelRef}>
            <button
              onClick={() => setOpen((p) => !p)}
              className="relative p-2 text-text-muted hover:text-text-primary hover:bg-background-hover rounded-xl transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center text-[10px] font-bold bg-loss text-white rounded-full leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-background-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="font-semibold text-text-primary text-sm">Notifications</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="flex items-center gap-1 text-xs text-brand hover:text-brand-light transition-colors"
                      >
                        <CheckCheck className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                    <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* List */}
                <div className="max-h-96 overflow-y-auto divide-y divide-border/40">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center text-text-muted text-sm">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'px-4 py-3 hover:bg-background-hover/50 transition-colors cursor-default',
                          !n.isRead && 'bg-brand/5'
                        )}
                        onClick={() => !n.isRead && markRead(n.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-xs font-semibold leading-snug', typeColor(n.type))}>
                              {n.title}
                            </p>
                            <p className="text-xs text-text-secondary mt-0.5 leading-snug line-clamp-2">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-text-disabled mt-1">{timeAgo(n.createdAt)}</p>
                          </div>
                          {!n.isRead && (
                            <span className="mt-1 shrink-0 w-2 h-2 rounded-full bg-brand" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-border text-center">
                    <span className="text-[11px] text-text-disabled">{notifications.length} total notification{notifications.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            )}
          </div>

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
