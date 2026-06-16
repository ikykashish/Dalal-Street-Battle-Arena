import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { STOCKS_DATA } from '@/lib/stocks-data'

const SEED_SECRET = process.env.SEED_SECRET || 'dalal-seed-2024'

/**
 * Seeds / re-syncs stocks via UPSERT (keyed on symbol) — FK-safe (never deletes).
 * - Resets existing stocks' prices to realistic seed values (undoes drift)
 * - Inserts any missing stocks so all 101 + every sector are present
 *
 * Supports chunked processing to stay under the serverless time limit on the
 * production (Neon) database:
 *   body { secret, start?, count? }
 * When `count` is omitted it processes everything (fine locally on SQLite).
 * The response returns `nextStart` (or null when done) so a caller can paginate.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { secret, start = 0, count } = body as { secret?: string; start?: number; count?: number }

    if (secret !== SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const total = STOCKS_DATA.length
    const sliceCount = typeof count === 'number' && count > 0 ? count : total
    const slice = STOCKS_DATA.slice(start, start + sliceCount)

    const CHUNK = 6 // small concurrency to respect the connection pool
    for (let i = 0; i < slice.length; i += CHUNK) {
      const sub = slice.slice(i, i + CHUNK)
      await Promise.all(
        sub.map((s) => {
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
    }

    const nextStart = start + sliceCount
    const done = nextStart >= total

    return NextResponse.json({
      processed: slice.length,
      start,
      count: sliceCount,
      nextStart: done ? null : nextStart,
      total,
      done,
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
