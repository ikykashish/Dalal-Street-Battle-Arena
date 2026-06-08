import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const tradeSchema = z.object({
  stockId: z.string(),
  type: z.enum(['BUY', 'SELL']),
  quantity: z.number().int().positive().max(100000),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { stockId, type, quantity } = tradeSchema.parse(body)

    const [user, stock] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id } }),
      prisma.stock.findUnique({ where: { id: stockId } }),
    ])

    if (!user || !stock) {
      return NextResponse.json({ error: 'User or stock not found' }, { status: 404 })
    }

    // Use live price if available
    const priceCache = (global as any).priceCache as Map<string, any> | undefined
    const livePrice = priceCache?.get(stock.symbol)?.price ?? stock.currentPrice
    const total = livePrice * quantity

    if (type === 'BUY') {
      if (user.cashBalance < total) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 })
      }

      const result = await prisma.$transaction(async (tx) => {
        // Deduct cash
        await tx.user.update({
          where: { id: user.id },
          data: { cashBalance: { decrement: total } },
        })

        // Update or create holding
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

        // Record trade
        const trade = await tx.trade.create({
          data: { userId: user.id, stockId: stock.id, type: 'BUY', quantity, price: livePrice, total },
          include: { stock: { select: { symbol: true, name: true } } },
        })

        return trade
      })

      // Broadcast trade to socket
      const io = (global as any).io
      if (io) {
        io.emit('new_trade', {
          type: 'BUY',
          symbol: stock.symbol,
          quantity,
          price: livePrice,
          total,
          userName: user.name,
          userId: user.id,
        })
      }

      return NextResponse.json({ trade: result, message: `Bought ${quantity} shares of ${stock.symbol}` })
    }

    if (type === 'SELL') {
      const holding = await prisma.holding.findUnique({
        where: { userId_stockId: { userId: user.id, stockId: stock.id } },
      })

      if (!holding || holding.quantity < quantity) {
        return NextResponse.json({ error: 'Insufficient shares' }, { status: 400 })
      }

      const result = await prisma.$transaction(async (tx) => {
        // Add cash
        await tx.user.update({
          where: { id: user.id },
          data: { cashBalance: { increment: total } },
        })

        // Update holding
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

        return trade
      })

      const io = (global as any).io
      if (io) {
        io.emit('new_trade', {
          type: 'SELL',
          symbol: stock.symbol,
          quantity,
          price: livePrice,
          total,
          userName: user.name,
          userId: user.id,
        })
      }

      return NextResponse.json({ trade: result, message: `Sold ${quantity} shares of ${stock.symbol}` })
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

    const trades = await prisma.trade.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        stock: { select: { symbol: true, name: true, currentPrice: true } },
      },
    })

    return NextResponse.json({ trades })
  } catch (err) {
    console.error('Trades fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
  }
}
