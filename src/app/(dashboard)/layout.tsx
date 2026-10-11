'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Navbar } from '@/components/layout/Navbar'
import { cn } from '@/lib/utils'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cashBalance, setCashBalance] = useState<number | undefined>(undefined)
  const [accountStatus, setAccountStatus] = useState<string>('ACTIVE')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetch('/api/user')
        .then((r) => r.json())
        .then((d) => {
          if (d.user) {
            setCashBalance(d.user.cashBalance)
            setAccountStatus(d.user.status || 'ACTIVE')
          }
        })
        .catch(() => {})
    }
  }, [session])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
          <span className="text-text-muted text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="flex h-screen bg-background-primary overflow-hidden">
      {/* Desktop sidebar — persistent at >=768px (md) */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay — only < 768px */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 z-10">
            <Sidebar onClose={() => setSidebarOpen(false)} mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} cashBalance={cashBalance} />
        {accountStatus === 'SUSPENDED' && (
          <div className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-2.5 text-center text-sm text-amber-200 font-medium">
            ⚠️ Your account has been suspended by tournament administration. You cannot trade or join teams.
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-[1600px] mx-auto animate-fade-in">
            {children}
          </div>
          <footer className="border-t border-border/50 py-3 px-6 text-center mt-4">
            <p className="text-xs text-text-disabled">
              Made by{' '}
              <span className="font-semibold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                Finance Club
              </span>
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}
