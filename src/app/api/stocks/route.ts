import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const sector = searchParams.get('sector') || ''
    const sort = searchParams.get('sort') || 'marketCap'
    const order = searchParams.get('order') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: any = {}
    if (search) {
      where.OR = [
        { symbol: { contains: search.toUpperCase() } },
        { name: { contains: search } },
      ]
    }
    if (sector) where.sector = sector

    const orderBy: any = {}
    const validSorts = ['marketCap', 'currentPrice', 'changePercent', 'volume', 'symbol']
    if (validSorts.includes(sort)) {
      orderBy[sort] = order === 'asc' ? 'asc' : 'desc'
    }

    const stocks = await prisma.stock.findMany({
      where,
      orderBy,
      take: Math.min(limit, 100),
      select: {
        id: true,
        symbol: true,
        name: true,
        sector: true,
        currentPrice: true,
        previousClose: true,
        open: true,
        dayHigh: true,
        dayLow: true,
        high52Week: true,
        low52Week: true,
        volume: true,
        marketCap: true,
        change: true,
        changePercent: true,
        updatedAt: true,
      },
    })

    // Expose the stable DB price as basePrice so the client-side simulator
    // can always recompute from the same reference point (path-independent).
    const enriched = stocks.map((s) => ({
      ...s,
      volume: Number(s.volume),
      basePrice: s.currentPrice,
    }))

    return NextResponse.json({ stocks: enriched })
  } catch (err) {
    console.error('Stocks fetch error:', err)
    return NextResponse.json({ error: 'Failed to fetch stocks' }, { status: 500 })
  }
}
