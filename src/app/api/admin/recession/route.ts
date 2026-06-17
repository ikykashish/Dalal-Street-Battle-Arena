import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAdminSession, writeAdminLog, isAdminEmail } from '@/lib/admin'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { notifyAllUsers } from '@/lib/notify'

const DROP_PERCENT = 0.10 // 10% drop

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  try {
    const stocks = await prisma.stock.findMany({
      select: { id: true, currentPrice: true, previousClose: true },
    })

    // Drop every stock by 10% in a single transaction
    await prisma.$transaction(
      stocks.map((s) => {
        const newPrice = Math.round(s.currentPrice * (1 - DROP_PERCENT) * 100) / 100
        const change = newPrice - s.previousClose
        const changePercent = (change / s.previousClose) * 100
        return prisma.stock.update({
          where: { id: s.id },
          data: { currentPrice: newPrice, change, changePercent },
        })
      })
    )

    await writeAdminLog({
      action: 'RECESSION_TRIGGERED',
      adminEmail: session.user.email,
      details: `Dropped all ${stocks.length} stocks by ${DROP_PERCENT * 100}%`,
    })

    notifyAllUsers({
      title: '📉 Recession Round Triggered',
      message: `All ${stocks.length} stocks have dropped by 10%. Review your portfolio and adjust positions.`,
      type: 'MARKET',
    })

    return NextResponse.json({
      success: true,
      message: `🔴 Recession Round triggered! All ${stocks.length} stocks dropped by 10%.`,
      stocksAffected: stocks.length,
      dropPercent: DROP_PERCENT * 100,
    })
  } catch (err) {
    console.error('Recession error:', err)
    return NextResponse.json({ error: 'Failed to trigger recession' }, { status: 500 })
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ isAdmin: isAdminEmail(session.user.email) })
}
