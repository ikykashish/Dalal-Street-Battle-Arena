'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Users, Plus, Hash, LogOut, Crown, Copy, Check, AlertCircle } from 'lucide-react'
import { formatCurrency, getInitials, cn } from '@/lib/utils'

interface TeamMember {
  id: string
  name: string
  email: string
  cashBalance: number
  createdAt: string
}

interface Team {
  id: string
  name: string
  code: string
  description?: string
  creatorId: string
  members: TeamMember[]
  createdAt: string
}

export default function TeamsPage() {
  const { data: session } = useSession()
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'main' | 'create' | 'join'>('main')
  const [form, setForm] = useState({ name: '', description: '', code: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/teams')
      const data = await res.json()
      setTeam(data.team)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTeam() }, [])

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, description: form.description }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      await fetchTeam()
      setView('main')
      setForm({ name: '', description: '', code: '' })
    } catch {
      setError('Failed to create team')
    } finally {
      setSubmitting(false)
    }
  }

  const joinTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: form.code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      await fetchTeam()
      setView('main')
      setForm({ name: '', description: '', code: '' })
    } catch {
      setError('Failed to join team')
    } finally {
      setSubmitting(false)
    }
  }

  const leaveTeam = async () => {
    if (!confirm('Are you sure you want to leave this team?')) return
    await fetch('/api/teams', { method: 'DELETE' })
    setTeam(null)
  }

  const copyCode = () => {
    if (team?.code) {
      navigator.clipboard.writeText(team.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  if (team) {
    const isCreator = team.creatorId === session?.user?.id

    return (
      <div className="space-y-5 max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-5 h-5 text-brand" /> Team
          </h1>
          <button
            onClick={leaveTeam}
            className="flex items-center gap-2 text-xs text-text-muted hover:text-loss transition-colors px-3 py-1.5 rounded-lg hover:bg-loss/10"
          >
            <LogOut className="w-3.5 h-3.5" /> Leave Team
          </button>
        </div>

        {/* Team card */}
        <div className="card border-brand/20 bg-brand/5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-text-primary">{team.name}</h2>
                {isCreator && (
                  <span className="flex items-center gap-1 text-xs text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                    <Crown className="w-3 h-3" /> Creator
                  </span>
                )}
              </div>
              {team.description && <p className="text-sm text-text-muted">{team.description}</p>}
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="text-xs text-text-muted mb-1">Invite Code</div>
              <div className="flex items-center gap-2">
                <code className="font-mono text-xl font-bold text-brand tracking-widest">
                  {team.code}
                </code>
                <button onClick={copyCode} className="text-text-muted hover:text-text-primary transition-colors">
                  {copied ? <Check className="w-4 h-4 text-profit" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Users className="w-4 h-4 text-brand" />
              Members ({team.members.length})
            </h3>
          </div>
          <div className="divide-y divide-border/40">
            {team.members.map((member, i) => (
              <div key={member.id} className="flex items-center gap-3 px-4 py-3 hover:bg-background-hover/30">
                <div className="w-9 h-9 rounded-full bg-background-tertiary flex items-center justify-center text-xs font-bold text-text-secondary shrink-0">
                  {getInitials(member.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">
                      {member.id === session?.user?.id ? `${member.name} (You)` : member.name}
                    </span>
                    {member.id === team.creatorId && (
                      <Crown className="w-3.5 h-3.5 text-warning" />
                    )}
                  </div>
                  <div className="text-xs text-text-muted">{member.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-text-secondary">Cash</div>
                  <div className="text-sm font-mono font-medium text-text-primary">
                    {formatCurrency(member.cashBalance)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Share instructions */}
        <div className="card bg-background-tertiary border-dashed">
          <div className="flex items-start gap-3">
            <Hash className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-text-primary mb-1">Invite teammates</h4>
              <p className="text-xs text-text-muted">
                Share the code <code className="font-mono text-brand font-bold">{team.code}</code> with friends.
                They can join by going to Teams → Join Team and entering this code.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // No team — show create/join
  if (view === 'create') {
    return (
      <div className="max-w-md space-y-5">
        <button onClick={() => { setView('main'); setError('') }} className="text-sm text-text-muted hover:text-text-primary">← Back</button>
        <h1 className="page-title">Create Team</h1>
        <form onSubmit={createTeam} className="card space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-loss/10 border border-loss/20 rounded-lg text-loss text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Team Name *</label>
            <input className="input-field" placeholder="e.g. Bull Warriors" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Description (optional)</label>
            <input className="input-field" placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
            {submitting ? 'Creating...' : 'Create Team'}
          </button>
        </form>
      </div>
    )
  }

  if (view === 'join') {
    return (
      <div className="max-w-md space-y-5">
        <button onClick={() => { setView('main'); setError('') }} className="text-sm text-text-muted hover:text-text-primary">← Back</button>
        <h1 className="page-title">Join Team</h1>
        <form onSubmit={joinTeam} className="card space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-loss/10 border border-loss/20 rounded-lg text-loss text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Team Code *</label>
            <input className="input-field font-mono text-center text-xl tracking-widest uppercase" placeholder="XXXXXX" maxLength={6} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required />
            <p className="text-xs text-text-muted mt-1.5">Enter the 6-character code shared by your team.</p>
          </div>
          <button type="submit" disabled={submitting || form.code.length < 6} className="btn-primary w-full py-2.5">
            {submitting ? 'Joining...' : 'Join Team'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="page-title flex items-center gap-2">
        <Users className="w-5 h-5 text-brand" /> Teams
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setView('create')}
          className="card card-hover flex flex-col items-center gap-3 py-8 text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center">
            <Plus className="w-6 h-6 text-brand" />
          </div>
          <div>
            <div className="font-semibold text-text-primary">Create Team</div>
            <div className="text-xs text-text-muted mt-1">Start a new team and invite friends</div>
          </div>
        </button>

        <button
          onClick={() => setView('join')}
          className="card card-hover flex flex-col items-center gap-3 py-8 text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-profit/10 flex items-center justify-center">
            <Hash className="w-6 h-6 text-profit" />
          </div>
          <div>
            <div className="font-semibold text-text-primary">Join Team</div>
            <div className="text-xs text-text-muted mt-1">Enter a team code to join</div>
          </div>
        </button>
      </div>

      <div className="card bg-background-tertiary border-dashed text-center py-8">
        <Users className="w-10 h-10 mx-auto mb-3 text-text-disabled" />
        <p className="text-text-secondary text-sm">You&apos;re not in a team yet</p>
        <p className="text-text-muted text-xs mt-1">
          Create or join a team to compete together on the leaderboard
        </p>
      </div>
    </div>
  )
}
