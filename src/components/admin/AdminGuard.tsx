'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ShieldAlert } from 'lucide-react'
import { isAdminEmail } from '@/lib/admin-emails'

/**
 * Client-side admin gate for admin pages. Redirects non-admins to the dashboard.
 * This is cosmetic — every admin API independently verifies admin server-side.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const allowed = isAdminEmail(session?.user?.email)

  useEffect(() => {
    if (status === 'authenticated' && !allowed) {
      router.replace('/dashboard')
    }
  }, [status, allowed, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-400 mb-3" />
        <h2 className="text-lg font-bold text-text-primary">Access denied</h2>
        <p className="text-sm text-text-muted mt-1">This area is restricted to tournament administrators.</p>
      </div>
    )
  }

  return <>{children}</>
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    SUSPENDED: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    BANNED: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
        styles[status] || styles.ACTIVE
      }`}
    >
      {status}
    </span>
  )
}
