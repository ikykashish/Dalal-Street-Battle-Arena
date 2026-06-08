import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const INITIAL_CAPITAL = 1000000

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'individual' // individual | team
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const priceCache = (global as any).priceCache as Map<string, any> | undefined

    if (type === 'team') {
      const teams = await prisma.team.findMany({
        include: {
          members: {
            include: {
              holdings: { include: { stock: true } },
            },
          },
        },
        take: limit,
      })

      const ranked = teams
        .map((team) => {
          let totalValue = 0
          for (const member of team.members) {
            let memberValue = member.cashBalance
            for (const h of member.holdings) {
              const livePrice = priceCache?.get(h.stock.symbol)?.price ?? h.stock.currentPrice
              memberValue += livePrice * h.quantity
            }
            totalValue += memberValue
          }
          const avgValue = totalValue / Math.max(team.members.length, 1)
          const pnl = avgValue - INITIAL_CAPITAL
          return {
            teamId: team.id,
            name: team.name,
            memberCount: team.members.length,
            totalValue: avgValue,
            pnl,
            pnlPercent: (pnl / INITIAL_CAPITAL) * 100,
          }
        })
        .sort((a, b) => b.totalValue - a.totalValue)
        .map((t, i) => ({ ...t, rank: i + 1 }))

      return NextResponse.json({ leaderboard: ranked, type: 'team' })
    }

    // Individual leaderboard
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        cashBalance: true,
        holdings: {
          include: { stock: { select: { symbol: true, currentPrice: true } } },
        },
      },
      take: limit * 2, // fetch more to rank properly
    })

    const ranked = users
      .map((user) => {
        let holdingsValue = 0
        for (const h of user.holdings) {
          const livePrice = priceCache?.get(h.stock.symbol)?.price ?? h.stock.currentPrice
          holdingsValue += livePrice * h.quantity
        }
        const totalValue = user.cashBalance + holdingsValue
        const pnl = totalValue - INITIAL_CAPITAL
        return {
          userId: user.id,
          name: user.name,
          totalValue,
          pnl,
          pnlPercent: (pnl / INITIAL_CAPITAL) * 100,
        }
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit)
      .map((u, i) => ({ ...u, rank: i + 1 }))

    // Find current user rank
    const userRank = ranked.findIndex((u) => u.userId === session.user.id)

    return NextResponse.json({
      leaderboard: ranked,
      type: 'individual',
      currentUserRank: userRank >= 0 ? userRank + 1 : null,
    })
  } catch (err) {
    console.error('Leaderboard error:', err)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
