import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAdminSession, writeAdminLog } from '@/lib/admin'

const RISE_PERCENT = 0.05 // 5% up (the inverse of Recession Round)

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const stocks = await prisma.stock.findMany({
      select: { id: true, currentPrice: true, previousClose: true },
    })

    // Raise every stock by 5% above its current value, in a single transaction
    await prisma.$transaction(
      stocks.map((s) => {
        const newPrice = Math.round(s.currentPrice * (1 + RISE_PERCENT) * 100) / 100
        const change = newPrice - s.previousClose
        const changePercent = (change / s.previousClose) * 100
        return prisma.stock.update({
          where: { id: s.id },
          data: { currentPrice: newPrice, change, changePercent },
        })
      })
    )

    await writeAdminLog({
      action: 'STOCK_UP',
      adminEmail: session.user.email,
      details: `Raised all ${stocks.length} stocks by ${RISE_PERCENT * 100}%`,
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
