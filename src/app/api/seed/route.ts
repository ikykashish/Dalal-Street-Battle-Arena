import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { STOCKS_DATA } from '@/lib/stocks-data'

// Secret key to prevent unauthorized seeding
const SEED_SECRET = process.env.SEED_SECRET || 'dalal-seed-2024'

export async function POST(req: NextRequest) {
  try {
    const { secret } = await req.json()
    if (secret !== SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already seeded
    const count = await prisma.stock.count()
    if (count > 0) {
      return NextResponse.json({ message: `Already seeded — ${count} stocks exist`, count })
    }

    // Seed all stocks
    let seeded = 0
    for (const stock of STOCKS_DATA) {
      await prisma.stock.upsert({
        where: { symbol: stock.symbol },
        update: {},
        create: {
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector,
          currentPrice: stock.currentPrice,
          previousClose: stock.previousClose,
          open: stock.open,
          dayHigh: stock.dayHigh,
          dayLow: stock.dayLow,
          high52Week: stock.high52Week,
          low52Week: stock.low52Week,
          volume: stock.volume,
          marketCap: stock.marketCap,
          change: stock.currentPrice - stock.previousClose,
          changePercent: ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100,
        },
      })
      seeded++
    }

    return NextResponse.json({ message: `Successfully seeded ${seeded} stocks!`, count: seeded })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  const count = await prisma.stock.count()
  return NextResponse.json({ stocks: count, seeded: count > 0 })
}
