import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: routeSymbol } = await params
  try {
    const symbol = routeSymbol.toUpperCase()

    const stock = await prisma.stock.findUnique({
      where: { symbol },
    })

    if (!stock) {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 })
    }

    const priceCache = (global as any).priceCache as Map<string, any> | undefined
    const live = priceCache?.get(symbol)

    return NextResponse.json({
      stock: {
        ...stock,
        volume: Number(stock.volume),
        currentPrice: live?.price ?? stock.currentPrice,
        change: live?.change ?? stock.change,
        changePercent: live?.changePercent ?? stock.changePercent,
      },
    })
  } catch (err) {
    console.error('Stock detail error:', err)
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 })
  }
}
