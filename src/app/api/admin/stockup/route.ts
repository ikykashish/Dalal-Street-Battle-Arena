import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAdminSession, writeAdminLog } from '@/lib/admin'
import { notifyAllUsers } from '@/lib/notify'
import { applyAdminPriceUpdates } from '@/lib/market-control'

const RISE_PERCENT = 0.05 // 5% up (the inverse of Recession Round)

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const stocks = await prisma.stock.findMany({
      select: { id: true, symbol: true, currentPrice: true, previousClose: true },
    })

    // Raise every stock by 5% above its current value, in a single transaction
    const updates = stocks.map((s) => {
      const price = Math.round(s.currentPrice * (1 + RISE_PERCENT) * 100) / 100
      const change = price - s.previousClose
      return {
        id: s.id,
        symbol: s.symbol,
        price,
        change,
        changePercent: (change / s.previousClose) * 100,
        previousClose: s.previousClose,
      }
    })
    await prisma.$transaction(updates.map((update) => prisma.stock.update({
      where: { id: update.id },
      data: {
        currentPrice: update.price,
        change: update.change,
        changePercent: update.changePercent,
      },
    })))
    applyAdminPriceUpdates(updates)

    await writeAdminLog({
      action: 'STOCK_UP',
      adminEmail: session.user.email,
      details: `Raised all ${stocks.length} stocks by ${RISE_PERCENT * 100}%`,
    })

    notifyAllUsers({
      title: '🚀 Market Surge!',
      message: `All ${stocks.length} stocks have risen by 5%. Great time to review your portfolio!`,
      type: 'MARKET',
    })

    return NextResponse.json({
      success: true,
      message: `🚀 Stock Up triggered! All ${stocks.length} stocks rose by 5%.`,
      stocksAffected: stocks.length,
      risePercent: RISE_PERCENT * 100,
    })
  } catch (err) {
    console.error('Stock up error:', err)
    return NextResponse.json({ error: 'Failed to trigger stock up' }, { status: 500 })
  }
}
