import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { BvpLogo } from '@/components/ui/BvpLogo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background-primary flex flex-col">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/15 rounded-full blur-[120px]" />
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-violet-500/10 rounded-full blur-[100px]" />
      </div>

      {/* University logo banner */}
      <div className="relative z-10 bg-white border-b-4 border-indigo-600 shadow-lg shadow-indigo-900/20">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-center">
          <BvpLogo size="lg" />
        </div>
      </div>

      {/* App nav */}
      <nav className="relative z-10 px-4 py-3 flex items-center justify-between border-b border-border/40 bg-background-secondary/50 backdrop-blur-sm">
        <Link href="/" className="inline-flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.4)]">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-text-primary">
            Dalal Street{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Battle Arena
            </span>
          </span>
        </Link>
        <Link href="/" className="text-xs text-text-muted hover:text-text-primary transition-colors">
          ← Back to home
        </Link>
      </nav>

      {/* Page content */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        {children}
      </div>

      {/* Footer */}
      <div className="relative z-10 py-3 text-center border-t border-border/30">
        <p className="text-xs text-text-disabled">
          Made by{' '}
          <span className="font-semibold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Pavith Grover
          </span>
          {' '}·{' '}
          <span className="text-text-disabled">Bharati Vidyapeeth DMS, Pune</span>
        </p>
      </div>
    </div>
  )
}
