import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { STOCKS_DATA } from '@/lib/stocks-data'

const SEED_SECRET = process.env.SEED_SECRET || 'dalal-seed-2024'

/**
 * Seeds / re-syncs all stocks via UPSERT (keyed on symbol).
 * - Inserts any missing stocks (so all 101 are present, covering every sector)
 * - Resets existing stocks' prices back to realistic seed values (undoing any
 *   drift from repeated admin actions / trades that pushed % gains unrealistically high)
 * It never deletes, so it is safe even when users already hold stocks (FK-safe).
 */
export async function POST(req: NextRequest) {
  try {
    const { secret } = await req.json()
    if (secret !== SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let upserted = 0
    const CHUNK = 12 // batch to stay well under the serverless time limit

    for (let i = 0; i < STOCKS_DATA.length; i += CHUNK) {
      const slice = STOCKS_DATA.slice(i, i + CHUNK)
      await Promise.all(
        slice.map((s) => {
          const fields = {
            name: s.name,
            sector: s.sector,
            currentPrice: s.currentPrice,
            previousClose: s.previousClose,
            open: s.open,
            dayHigh: s.dayHigh,
            dayLow: s.dayLow,
            high52Week: s.high52Week,
            low52Week: s.low52Week,
            volume: s.volume,
            marketCap: s.marketCap,
            change: Math.round((s.currentPrice - s.previousClose) * 100) / 100,
            changePercent:
              Math.round(((s.currentPrice - s.previousClose) / s.previousClose) * 10000) / 100,
          }
          return prisma.stock.upsert({
            where: { symbol: s.symbol },
            update: fields,
            create: { symbol: s.symbol, ...fields },
          })
        })
      )
      upserted += slice.length
    }

    const total = await prisma.stock.count()
    return NextResponse.json({
      message: `Synced ${upserted} stocks (prices reset, missing stocks added). DB now has ${total} stocks.`,
      upserted,
      total,
    })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  const count = await prisma.stock.count()
  return NextResponse.json({ stocks: count, seeded: count > 0 })
}
