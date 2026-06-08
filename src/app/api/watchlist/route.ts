import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const items = await prisma.watchlistItem.findMany({
      where: { userId: session.user.id },
      include: { stock: true },
      orderBy: { createdAt: 'desc' },
    })

    const priceCache = (global as any).priceCache as Map<string, any> | undefined

    const enriched = items.map((item) => ({
      id: item.id,
      addedAt: item.createdAt,
      stock: {
        ...item.stock,
        volume: Number(item.stock.volume),
        currentPrice: priceCache?.get(item.stock.symbol)?.price ?? item.stock.currentPrice,
        change: priceCache?.get(item.stock.symbol)?.change ?? item.stock.change,
        changePercent: priceCache?.get(item.stock.symbol)?.changePercent ?? item.stock.changePercent,
      },
    }))

    return NextResponse.json({ watchlist: enriched })
  } catch (err) {
    console.error('Watchlist error:', err)
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { stockId } = await req.json()
    if (!stockId) return NextResponse.json({ error: 'stockId required' }, { status: 400 })

    const stock = await prisma.stock.findUnique({ where: { id: stockId } })
    if (!stock) return NextResponse.json({ error: 'Stock not found' }, { status: 404 })

    const existing = await prisma.watchlistItem.findUnique({
      where: { userId_stockId: { userId: session.user.id, stockId } },
    })
    if (existing) return NextResponse.json({ error: 'Already in watchlist' }, { status: 409 })

    const item = await prisma.watchlistItem.create({
      data: { userId: session.user.id, stockId },
      include: { stock: true },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (err) {
    console.error('Add watchlist error:', err)
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { stockId } = await req.json()
    if (!stockId) return NextResponse.json({ error: 'stockId required' }, { status: 400 })

    await prisma.watchlistItem.deleteMany({
      where: { userId: session.user.id, stockId },
    })

    return NextResponse.json({ message: 'Removed from watchlist' })
  } catch (err) {
    console.error('Remove watchlist error:', err)
    return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 })
  }
}
