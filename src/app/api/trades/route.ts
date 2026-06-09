import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const tradeSchema = z.object({
  stockId: z.string(),
  type: z.enum(['BUY', 'SELL']),
  quantity: z.number().int().positive().max(100000),
  clientPrice: z.number().positive().optional(),
})

/** Market impact: buying pushes price up, selling pushes it down */
function calcMarketImpact(price: number, quantity: number, volume: number, type: 'BUY' | 'SELL'): number {
  // Impact as % = quantity / dailyVolume, capped at 1%
  const rawImpact = Math.min((quantity / Math.max(volume, 10000)) * 0.5, 0.01)
  const delta = price * rawImpact
  return type === 'BUY' ? price + delta : price - delta
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { stockId, type, quantity, clientPrice } = tradeSchema.parse(body)

    const [user, stock] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id } }),
      prisma.stock.findUnique({ where: { id: stockId } }),
    ])

    if (!user || !stock) {
      return NextResponse.json({ error: 'User or stock not found' }, { status: 404 })
    }

    // Use client-supplied live price if within ±10% of DB price (anti-cheat)
    let livePrice = stock.currentPrice
    if (clientPrice) {
      const deviation = Math.abs(clientPrice - stock.currentPrice) / stock.currentPrice
      if (deviation <= 0.10) livePrice = clientPrice
    }
    const total = livePrice * quantity

    // Calculate new market price after impact
    const newMarketPrice = Math.round(
      calcMarketImpact(livePrice, quantity, stock.volume, type) * 100
    ) / 100

    if (type === 'BUY') {
      if (user.cashBalance < total) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 })
      }

      const result = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { cashBalance: { decrement: total } },
        })

        const existing = await tx.holding.findUnique({
          where: { userId_stockId: { userId: user.id, stockId: stock.id } },
        })

        if (existing) {
          const newQty = existing.quantity + quantity
          const newAvg = (existing.avgPrice * existing.quantity + livePrice * quantity) / newQty
          await tx.holding.update({
            where: { id: existing.id },
            data: { quantity: newQty, avgPrice: newAvg },
          })
        } else {
          await tx.holding.create({
            data: { userId: user.id, stockId: stock.id, quantity, avgPrice: livePrice },
          })
        }

        const trade = await tx.trade.create({
          data: { userId: user.id, stockId: stock.id, type: 'BUY', quantity, price: livePrice, total },
          include: { stock: { select: { symbol: true, name: true } } },
        })

        // Apply market impact — price goes up on buying pressure
        await tx.stock.update({
          where: { id: stock.id },
          data: {
            currentPrice: newMarketPrice,
            change: newMarketPrice - stock.previousClose,
            changePercent: ((newMarketPrice - stock.previousClose) / stock.previousClose) * 100,
          },
        })

        return trade
      })

      return NextResponse.json({
        trade: result,
        message: `Bought ${quantity} shares of ${stock.symbol}`,
        newPrice: newMarketPrice,
      })
    }

    if (type === 'SELL') {
      const holding = await prisma.holding.findUnique({
        where: { userId_stockId: { userId: user.id, stockId: stock.id } },
      })

      if (!holding || holding.quantity < quantity) {
        return NextResponse.json({ error: 'Insufficient shares' }, { status: 400 })
      }

      // Realized P&L for this sell
      const realizedPnl = (livePrice - holding.avgPrice) * quantity

      const result = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { cashBalance: { increment: total } },
        })

        const newQty = holding.quantity - quantity
        if (newQty === 0) {
          await tx.holding.delete({ where: { id: holding.id } })
        } else {
          await tx.holding.update({
            where: { id: holding.id },
            data: { quantity: newQty },
          })
        }

        const trade = await tx.trade.create({
          data: { userId: user.id, stockId: stock.id, type: 'SELL', quantity, price: livePrice, total },
          include: { stock: { select: { symbol: true, name: true } } },
        })

        // Apply market impact — price goes down on selling pressure
        await tx.stock.update({
          where: { id: stock.id },
          data: {
            currentPrice: newMarketPrice,
            change: newMarketPrice - stock.previousClose,
            changePercent: ((newMarketPrice - stock.previousClose) / stock.previousClose) * 100,
          },
        })

        return trade
      })

      return NextResponse.json({
        trade: result,
        message: `Sold ${quantity} shares of ${stock.symbol}`,
        realizedPnl: Math.round(realizedPnl * 100) / 100,
        newPrice: newMarketPrice,
      })
    }

    return NextResponse.json({ error: 'Invalid trade type' }, { status: 400 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('Trade error:', err)
    return NextResponse.json({ error: 'Trade failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const all = searchParams.get('all') === 'true'

    const trades = await prisma.trade.findMany({
      where: all ? {} : { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        stock: { select: { symbol: true, name: true, currentPrice: true } },
        user: { select: { name: true, id: true } },
      },
    })

    return NextResponse.json({ trades })
  } catch (err) {
    console.error('Trades fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
  }
}
