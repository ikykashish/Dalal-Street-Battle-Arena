import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAdminSession } from '@/lib/admin'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true, status: true, cashBalance: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Oldest-first to reconstruct running average cost basis
    const tradesAsc = await prisma.trade.findMany({
      where: { userId: params.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        type: true,
        quantity: true,
        price: true,
        total: true,
        createdAt: true,
        stock: { select: { symbol: true, name: true } },
      },
    })

    // Average-cost realized P&L per SELL trade
    const cost = new Map<string, { qty: number; avg: number }>()
    const withPnl = tradesAsc.map((t) => {
      const key = t.stock.symbol
      const pos = cost.get(key) || { qty: 0, avg: 0 }
      let pnl: number | null = null

      if (t.type === 'BUY') {
        const newQty = pos.qty + t.quantity
        pos.avg = newQty > 0 ? (pos.avg * pos.qty + t.price * t.quantity) / newQty : t.price
        pos.qty = newQty
      } else {
        // SELL — realize gain/loss against running average cost
        pnl = Math.round((t.price - pos.avg) * t.quantity * 100) / 100
        pos.qty = Math.max(0, pos.qty - t.quantity)
      }
      cost.set(key, pos)

      return {
        id: t.id,
        type: t.type as 'BUY' | 'SELL',
        stockSymbol: t.stock.symbol,
        stockName: t.stock.name,
        quantity: t.quantity,
        price: t.price,
        total: t.total,
        pnl,
        createdAt: t.createdAt,
      }
    })

    // Newest first for display
    withPnl.reverse()

    const penalties = await prisma.penalty.findMany({
      where: { userId: params.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, amount: true, reason: true, adminEmail: true, createdAt: true },
    })

    const realizedPnL = withPnl.reduce((s, t) => s + (t.pnl || 0), 0)

    return NextResponse.json({
      user,
      trades: withPnl,
      penalties,
      summary: {
        totalTrades: withPnl.length,
        realizedPnL: Math.round(realizedPnL * 100) / 100,
        totalPenalised: penalties.reduce((s, p) => s + p.amount, 0),
      },
    })
  } catch (err) {
    console.error('Admin user trades error:', err)
    return NextResponse.json({ error: 'Failed to fetch trade history' }, { status: 500 })
  }
}
