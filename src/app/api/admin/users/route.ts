import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAdminSession } from '@/lib/admin'

const INITIAL_CAPITAL = 1000000

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const sort = searchParams.get('sort') || 'profit' // profit | cash | trades | name
    const order = searchParams.get('order') || 'desc'
    const statusFilter = searchParams.get('status') || '' // ACTIVE | SUSPENDED | BANNED
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(50, Math.max(5, parseInt(searchParams.get('pageSize') || '15')))

    const priceCache = (global as any).priceCache as Map<string, any> | undefined

    // Fetch all users (tournament scale) with team + holdings, excluding password
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        cashBalance: true,
        status: true,
        createdAt: true,
        team: { select: { name: true } },
        holdings: {
          select: { quantity: true, stock: { select: { symbol: true, currentPrice: true } } },
        },
      },
    })

    // Aggregate trade stats per user in one grouped query
    const tradeAgg = await prisma.trade.groupBy({
      by: ['userId', 'type'],
      _sum: { quantity: true },
      _count: { _all: true },
      _max: { createdAt: true },
    })

    const aggMap = new Map<
      string,
      { bought: number; sold: number; trades: number; lastTradeAt: Date | null }
    >()
    for (const row of tradeAgg) {
      const cur = aggMap.get(row.userId) || { bought: 0, sold: 0, trades: 0, lastTradeAt: null }
      const qty = row._sum.quantity || 0
      if (row.type === 'BUY') cur.bought += qty
      else if (row.type === 'SELL') cur.sold += qty
      cur.trades += row._count._all
      const last = row._max.createdAt
      if (last && (!cur.lastTradeAt || last > cur.lastTradeAt)) cur.lastTradeAt = last
      aggMap.set(row.userId, cur)
    }

    // Build computed rows
    let rows = users.map((u) => {
      let portfolioValue = 0
      for (const h of u.holdings) {
        const live = priceCache?.get(h.stock.symbol)?.price ?? h.stock.currentPrice
        portfolioValue += live * h.quantity
      }
      const totalValue = u.cashBalance + portfolioValue
      const totalPnL = totalValue - INITIAL_CAPITAL
      const agg = aggMap.get(u.id) || { bought: 0, sold: 0, trades: 0, lastTradeAt: null }
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        teamName: u.team?.name || null,
        status: u.status,
        cashBalance: u.cashBalance,
        portfolioValue: Math.round(portfolioValue * 100) / 100,
        totalValue: Math.round(totalValue * 100) / 100,
        totalPnL: Math.round(totalPnL * 100) / 100,
        totalPnLPercent: Math.round((totalPnL / INITIAL_CAPITAL) * 10000) / 100,
        stocksBought: agg.bought,
        stocksSold: agg.sold,
        totalTrades: agg.trades,
        lastTradeAt: agg.lastTradeAt,
        createdAt: u.createdAt,
      }
    })

    // Search by name / email / team (case-insensitive)
    if (search) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          r.email.toLowerCase().includes(search) ||
          (r.teamName ? r.teamName.toLowerCase().includes(search) : false)
      )
    }

    // Status filter
    if (statusFilter && ['ACTIVE', 'SUSPENDED', 'BANNED'].includes(statusFilter)) {
      rows = rows.filter((r) => r.status === statusFilter)
    }

    // Sort
    const dir = order === 'asc' ? 1 : -1
    rows.sort((a, b) => {
      switch (sort) {
        case 'cash':
          return (a.cashBalance - b.cashBalance) * dir
        case 'trades':
          return (a.totalTrades - b.totalTrades) * dir
        case 'name':
          return a.name.localeCompare(b.name) * dir
        case 'profit':
        default:
          return (a.totalPnL - b.totalPnL) * dir
      }
    })

    const total = rows.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    const paged = rows.slice(start, start + pageSize)

    return NextResponse.json({
      users: paged,
      total,
      page,
      pageSize,
      totalPages,
      counts: {
        all: users.length,
        active: users.filter((u) => u.status === 'ACTIVE').length,
        suspended: users.filter((u) => u.status === 'SUSPENDED').length,
        banned: users.filter((u) => u.status === 'BANNED').length,
      },
    })
  } catch (err) {
    console.error('Admin users error:', err)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
