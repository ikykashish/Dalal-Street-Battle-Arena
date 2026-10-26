import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession, writeAdminLog } from '@/lib/admin'
import { prisma } from '@/lib/db'
import { notifyAllUsers } from '@/lib/notify'
import { applyAdminPriceUpdates } from '@/lib/market-control'

const VALID_SECTORS = [
  'Finance', 'Technology', 'Healthcare', 'Energy', 'Manufacturing',
  'Consumer Goods', 'Education', 'Infrastructure', 'Automobile', 'Pharmaceuticals',
  'Telecom', 'Media & Entertainment', 'Real Estate', 'Banking', 'FMCG',
]

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const {
    sectors,   // string[]
    percent,   // number — absolute value, e.g. 10 means 10%
    direction, // 'increase' | 'decrease'
  } = body as { sectors: string[]; percent: number; direction: 'increase' | 'decrease' }

  if (!Array.isArray(sectors) || sectors.length === 0)
    return NextResponse.json({ error: 'Select at least one sector' }, { status: 400 })
  if (typeof percent !== 'number' || percent <= 0 || percent > 100)
    return NextResponse.json({ error: 'Percent must be between 1 and 100' }, { status: 400 })
  if (direction !== 'increase' && direction !== 'decrease')
    return NextResponse.json({ error: 'direction must be increase or decrease' }, { status: 400 })

  const multiplier = direction === 'increase' ? 1 + percent / 100 : 1 - percent / 100

  const stocks = await prisma.stock.findMany({
    where: { sector: { in: sectors } },
    select: { id: true, symbol: true, currentPrice: true, previousClose: true, sector: true },
  })

  if (stocks.length === 0)
    return NextResponse.json({ error: 'No stocks found for selected sectors' }, { status: 404 })

  const updates = stocks.map((s) => {
    const price = Math.max(Math.round(s.currentPrice * multiplier * 100) / 100, 0.01)
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

  const sign = direction === 'increase' ? '+' : '-'
  const sectorList = sectors.join(', ')
  const actionKey = direction === 'increase' ? 'INDUSTRY_BOOST' : 'INDUSTRY_RECESSION'
  const details = `${direction === 'increase' ? 'Boosted' : 'Dropped'} ${stocks.length} stocks across [${sectorList}] by ${percent}%`

  await writeAdminLog({
    action: actionKey,
    adminEmail: session.user.email,
    details,
  })

  const notifTitle =
    direction === 'increase'
      ? `📈 Industry Boost: ${sectorList}`
      : `📉 Industry Recession: ${sectorList}`
  const notifMsg =
    direction === 'increase'
      ? `${sectorList} sector(s) increased by ${percent}%. ${stocks.length} stocks affected.`
      : `${sectorList} sector(s) decreased by ${percent}%. ${stocks.length} stocks affected.`

  await notifyAllUsers({ title: notifTitle, message: notifMsg, type: 'MARKET' })

  return NextResponse.json({
    success: true,
    message: `${direction === 'increase' ? '🚀 Boosted' : '🔴 Dropped'} ${stocks.length} stocks across [${sectorList}] by ${sign}${percent}%.`,
    stocksAffected: stocks.length,
    sectors,
    percent,
    direction,
  })
}
