import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const ADMIN_EMAILS = ['pavithandgrover@outlook.com']
const DROP_PERCENT = 0.10 // 10% drop

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!ADMIN_EMAILS.includes(session.user.email || '')) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

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
  const isAdmin = ADMIN_EMAILS.includes(session.user.email || '')
  return NextResponse.json({ isAdmin })
}
