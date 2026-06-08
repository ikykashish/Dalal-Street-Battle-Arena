import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        holdings: {
          include: {
            stock: true,
          },
        },
      },
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const priceCache = (global as any).priceCache as Map<string, any> | undefined

    const INITIAL_CAPITAL = 1000000

    let totalInvested = 0
    let currentValue = 0
    let dayPnL = 0

    const holdings = user.holdings.map((h) => {
      const live = priceCache?.get(h.stock.symbol)
      const currentPrice = live?.price ?? h.stock.currentPrice
      const prevClose = h.stock.previousClose

      const invested = h.avgPrice * h.quantity
      const current = currentPrice * h.quantity
      const pnl = current - invested
      const pnlPercent = ((currentPrice - h.avgPrice) / h.avgPrice) * 100
      const dayChange = (currentPrice - prevClose) * h.quantity

      totalInvested += invested
      currentValue += current
      dayPnL += dayChange

      return {
        id: h.id,
        quantity: h.quantity,
        avgPrice: h.avgPrice,
        stock: {
          ...h.stock,
          volume: Number(h.stock.volume),
          currentPrice,
          change: live?.change ?? h.stock.change,
          changePercent: live?.changePercent ?? h.stock.changePercent,
        },
        currentValue: current,
        investedValue: invested,
        pnl,
        pnlPercent,
        dayChange,
        dayChangePercent: ((currentPrice - prevClose) / prevClose) * 100,
      }
    })

    const totalValue = user.cashBalance + currentValue
    const totalPnL = totalValue - INITIAL_CAPITAL
    const totalPnLPercent = (totalPnL / INITIAL_CAPITAL) * 100

    return NextResponse.json({
      portfolio: {
        cashBalance: user.cashBalance,
        holdings,
        totalInvested,
        currentValue,
        totalValue,
        totalPnL,
        totalPnLPercent,
        dayPnL,
        dayPnLPercent: totalValue > 0 ? (dayPnL / (totalValue - dayPnL)) * 100 : 0,
        initialCapital: INITIAL_CAPITAL,
      },
    })
  } catch (err) {
    console.error('Portfolio error:', err)
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 })
  }
}
