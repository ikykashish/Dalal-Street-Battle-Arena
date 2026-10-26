import Link from 'next/link'
import { TrendingUp, Users, Trophy, Zap, BarChart2, Shield } from 'lucide-react'
import { BvpLogo } from '@/components/ui/BvpLogo'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background-primary">

      {/* University banner */}
      <div className="bg-white border-b-4 border-indigo-600 shadow-md shadow-indigo-900/30">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center">
          <BvpLogo size="lg" />
        </div>
      </div>

      {/* Navbar */}
      <nav className="border-b border-border/50 bg-background-secondary/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-base font-bold text-text-primary">
                Trading Floor{' '}
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  Battle Arena
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                Sign In
              </Link>
              <Link href="/signup" className="btn-primary">Get Started</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-28">
        {/* Background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px]" />
          <div className="absolute top-10 right-1/4 w-80 h-80 bg-violet-500/15 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-40 bg-emerald-500/10 rounded-full blur-[80px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-sm font-medium mb-8">
            <Zap className="w-4 h-4 text-indigo-400" />
            Live simulation · 100+ NSE stocks · Real-time prices
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-text-primary mb-6 leading-[1.1] tracking-tight">
            India&apos;s First
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Stock Battle Arena
            </span>
          </h1>

          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Made by the students of <span className="text-indigo-300 font-semibold">Bharati Vidyapeeth Department of Management Studies (BBA)</span>, Navi Mumbai.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="btn-primary px-8 py-3 text-base w-full sm:w-auto text-center">
              Start Trading Free →
            </Link>
            <Link href="/login" className="btn-secondary px-8 py-3 text-base w-full sm:w-auto text-center">
              Sign In
            </Link>
          </div>
          <p className="mt-4 text-xs text-text-disabled">No real money · 100% virtual · Educational</p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border/50 bg-background-secondary/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '100+', label: 'NSE Stocks', color: 'from-indigo-400 to-violet-400' },
              { value: '₹10L',  label: 'Starting Capital', color: 'from-emerald-400 to-teal-400' },
              { value: 'Live',  label: 'Price Updates', color: 'from-cyan-400 to-blue-400' },
              { value: 'Teams', label: 'Battle Mode', color: 'from-amber-400 to-orange-400' },
            ].map((s) => (
              <div key={s.label}>
                <div className={`text-2xl font-black font-mono bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>
                  {s.value}
                </div>
                <div className="text-xs text-text-muted mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-black text-text-primary mb-3">Everything you need to trade</h2>
          <p className="text-text-secondary max-w-md mx-auto">A full-featured trading platform inspired by Zerodha Kite, built for competition.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: BarChart2, title: 'Live Market Data',   desc: 'Track 100 NSE stocks with real-time price simulation and market stats.', gradient: 'from-indigo-500 to-violet-600', glow: 'rgba(99,102,241,0.3)' },
            { icon: TrendingUp, title: 'Smart Portfolio',   desc: 'Track holdings, P&L, returns and allocation with beautiful charts.',       gradient: 'from-emerald-500 to-teal-600', glow: 'rgba(16,217,138,0.3)' },
            { icon: Trophy,     title: 'Leaderboard',       desc: 'Compete globally. Real-time rankings based on portfolio performance.',     gradient: 'from-amber-500 to-orange-600', glow: 'rgba(245,158,11,0.3)' },
            { icon: Users,      title: 'Team Battles',      desc: 'Create or join teams. Collaborate on strategy and dominate together.',     gradient: 'from-violet-500 to-purple-600', glow: 'rgba(139,92,246,0.3)' },
            { icon: Zap,        title: 'Instant Trades',    desc: 'Execute buy/sell orders instantly at live simulated market price.',        gradient: 'from-cyan-500 to-blue-600',   glow: 'rgba(6,182,212,0.3)'  },
            { icon: Shield,     title: 'Watchlist',         desc: 'Save stocks you care about and monitor them in real-time.',               gradient: 'from-pink-500 to-rose-600',   glow: 'rgba(244,63,94,0.3)'  },
          ].map((f) => (
            <div key={f.title} className="card-hover group">
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4`}
                style={{ boxShadow: `0 0 20px ${f.glow}` }}
              >
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-text-primary mb-2">{f.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-border/50 py-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-32 bg-indigo-500/15 rounded-full blur-[60px]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 text-center relative">
          <h2 className="text-3xl font-black text-text-primary mb-4">Ready to enter the arena?</h2>
          <p className="text-text-secondary mb-8">Join traders competing for the top spot on the leaderboard.</p>
          <Link href="/signup" className="btn-primary px-10 py-3 text-base inline-block">
            Start Trading — It&apos;s Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-text-muted text-sm space-y-1">
          <p>Trading Floor Battle Arena · Virtual trading platform for educational purposes only.</p>
          <p className="text-xs text-text-disabled">Not SEBI registered · No real money involved</p>
          <p className="text-xs pt-1">
            Lead developer:{' '}
            <span className="font-semibold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Ashish Rajak
            </span>
            {' '}· Project team:{' '}
            <span className="font-semibold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Avnish Mishra · Pavith Grover
            </span>
          </p>
        </div>
      </footer>
    </div>
  )
}
