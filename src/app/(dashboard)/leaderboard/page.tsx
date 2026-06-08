'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Trophy, TrendingUp, TrendingDown, Users, RefreshCw, Crown, Medal } from 'lucide-react'
import { formatCurrency, formatPercent, getInitials, cn } from '@/lib/utils'

interface LeaderEntry {
  rank: number
  userId?: string
  teamId?: string
  name: string
  totalValue: number
  pnl: number
  pnlPercent: number
  memberCount?: number
}

export default function LeaderboardPage() {
  const { data: session } = useSession()
  const [type, setType] = useState<'individual' | 'team'>('individual')
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leaderboard?type=${type}&limit=50`)
      const data = await res.json()
      if (data.leaderboard) setLeaderboard(data.leaderboard)
      if (data.currentUserRank) setUserRank(data.currentUserRank)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLeaderboard() }, [type])

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(fetchLeaderboard, 15000)
    return () => clearInterval(interval)
  }, [type])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-400" />
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />
    return <span className="text-sm font-mono text-text-muted w-4 text-center">#{rank}</span>
  }

  const getRankBg = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'bg-brand/5 border-l-2 border-l-brand'
    if (rank === 1) return 'bg-yellow-400/5'
    if (rank === 2) return 'bg-gray-400/5'
    if (rank === 3) return 'bg-amber-600/5'
    return ''
  }

  const currentEntry = leaderboard.find((e) => e.userId === session?.user?.id || e.rank === userRank)

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="page-title flex items-center gap-2">
          <Trophy className="w-5 h-5 text-warning" />
          Leaderboard
        </h1>
        <button onClick={fetchLeaderboard} disabled={loading} className="btn-secondary text-xs flex items-center gap-1.5">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Type toggle */}
      <div className="flex bg-background-secondary rounded-xl p-1 w-fit border border-border">
        <button
          onClick={() => setType('individual')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            type === 'individual' ? 'bg-brand text-white' : 'text-text-muted hover:text-text-secondary'
          )}
        >
          <Trophy className="w-4 h-4" /> Individual
        </button>
        <button
          onClick={() => setType('team')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            type === 'team' ? 'bg-brand text-white' : 'text-text-muted hover:text-text-secondary'
          )}
        >
          <Users className="w-4 h-4" /> Teams
        </button>
      </div>

      {/* User rank card (if not in top 10) */}
      {userRank && userRank > 10 && currentEntry && (
        <div className="card border-brand/30 bg-brand/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-muted">Your rank</span>
              <span className="text-2xl font-bold font-mono text-brand">#{userRank}</span>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-text-primary">{formatCurrency(currentEntry.totalValue)}</div>
              <div className={cn('text-sm', currentEntry.pnl >= 0 ? 'text-profit' : 'text-loss')}>
                {formatPercent(currentEntry.pnlPercent)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="card p-0 overflow-hidden">
        {/* Top 3 podium */}
        {!loading && leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-px bg-border border-b border-border">
            {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, idx) => {
              if (!entry) return null
              const isCenter = idx === 1
              const rankColors = ['text-gray-400', 'text-yellow-400', 'text-amber-600']
              const heights = ['h-20', 'h-28', 'h-20']
              return (
                <div
                  key={entry.userId || entry.teamId}
                  className={cn(
                    'flex flex-col items-center justify-end pb-3 bg-background-secondary transition-colors',
                    entry.userId === session?.user?.id && 'bg-brand/5',
                    heights[idx]
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-1.5', isCenter ? 'bg-yellow-400/20 text-yellow-400' : 'bg-background-tertiary text-text-secondary')}>
                    {getInitials(entry.name)}
                  </div>
                  <div className={cn('font-medium text-xs', rankColors[idx])}>
                    {isCenter ? '🥇' : idx === 0 ? '🥈' : '🥉'} #{entry.rank}
                  </div>
                  <div className="text-xs font-medium text-text-primary truncate max-w-[80px]">{entry.name}</div>
                  <div className="text-[11px] font-mono text-text-secondary">{formatCurrency(entry.totalValue)}</div>
                </div>
              )
            })}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {leaderboard.map((entry) => {
              const isCurrentUser = entry.userId === session?.user?.id
              return (
                <div
                  key={entry.userId || entry.teamId}
                  className={cn(
                    'flex items-center gap-4 px-4 py-3 hover:bg-background-hover/40 transition-colors',
                    getRankBg(entry.rank, isCurrentUser)
                  )}
                >
                  <div className="w-8 flex items-center justify-center shrink-0">
                    {getRankIcon(entry.rank)}
                  </div>

                  <div className="w-9 h-9 rounded-full bg-background-tertiary flex items-center justify-center text-xs font-bold text-text-secondary shrink-0">
                    {getInitials(entry.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm font-semibold truncate', isCurrentUser ? 'text-brand' : 'text-text-primary')}>
                        {entry.name}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-brand/10 text-brand rounded font-medium">You</span>
                      )}
                    </div>
                    {entry.memberCount !== undefined && (
                      <span className="text-xs text-text-muted">{entry.memberCount} members</span>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-semibold text-text-primary">
                      {formatCurrency(entry.totalValue)}
                    </div>
                    <div className={cn('text-xs font-mono flex items-center justify-end gap-0.5', entry.pnl >= 0 ? 'text-profit' : 'text-loss')}>
                      {entry.pnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatPercent(entry.pnlPercent)}
                    </div>
                  </div>
                </div>
              )
            })}

            {leaderboard.length === 0 && (
              <div className="text-center py-16 text-text-muted">
                <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No rankings yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
