import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as SocketIOServer } from 'socket.io'
import { PrismaClient } from '@prisma/client'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()
const prisma = new PrismaClient()

// In-memory price cache for fast reads
const priceCache: Map<string, {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  previousClose: number
  holdUntil?: number
}> = new Map()

async function loadInitialPrices() {
  const stocks = await prisma.stock.findMany({
    select: {
      symbol: true,
      currentPrice: true,
      change: true,
      changePercent: true,
      volume: true,
      previousClose: true,
    },
  })
  for (const stock of stocks) {
    priceCache.set(stock.symbol, {
      symbol: stock.symbol,
      price: stock.currentPrice,
      change: stock.change,
      changePercent: stock.changePercent,
      volume: Number(stock.volume),
      previousClose: stock.previousClose,
    })
  }
  console.log(`📈 Loaded ${stocks.length} stocks into price cache`)
}

function simulatePriceMovement(currentPrice: number, previousClose: number): {
  newPrice: number
  change: number
  changePercent: number
} {
  // Realistic market simulation: mean-reverting with noise
  const volatility = 0.0015 // 0.15% standard deviation per tick
  const meanReversion = 0.01 // pull towards previous close

  const drift = meanReversion * (previousClose - currentPrice) / previousClose
  const shock = volatility * (Math.random() * 2 - 1) * Math.sqrt(Math.random())

  const returns = drift + shock
  const newPrice = Math.max(currentPrice * (1 + returns), currentPrice * 0.85) // floor at -15%
  const roundedPrice = Math.round(newPrice * 100) / 100

  return {
    newPrice: roundedPrice,
    change: roundedPrice - previousClose,
    changePercent: ((roundedPrice - previousClose) / previousClose) * 100,
  }
}

function startPriceSimulator(io: SocketIOServer) {
  // Update prices every 3 seconds
  const interval = setInterval(async () => {
    if (priceCache.size === 0) return

    const updates: { symbol: string; price: number; change: number; changePercent: number; volume: number }[] = []
    const dbUpdates: { symbol: string; price: number; change: number; changePercent: number }[] = []

    // Leave admin-adjusted prices untouched for five minutes so the market
    // control remains visible before the normal simulation resumes.
    const now = Date.now()
    const symbols = Array.from(priceCache.values())
      .filter((stock) => !stock.holdUntil || stock.holdUntil <= now)
      .map((stock) => stock.symbol)
    if (symbols.length === 0) return

    // Update a random subset of eligible stocks each tick (40-60% of stocks)
    const updateCount = Math.floor(symbols.length * (0.4 + Math.random() * 0.2))
    const shuffled = symbols.sort(() => Math.random() - 0.5).slice(0, updateCount)

    for (const symbol of shuffled) {
      const cached = priceCache.get(symbol)!
      const { newPrice, change, changePercent } = simulatePriceMovement(cached.price, cached.previousClose)

      const volumeDelta = Math.floor(Math.random() * 50000)
      const newVolume = cached.volume + volumeDelta

      priceCache.set(symbol, {
        ...cached,
        price: newPrice,
        change,
        changePercent,
        volume: newVolume,
      })

      updates.push({ symbol, price: newPrice, change, changePercent, volume: newVolume })
      dbUpdates.push({ symbol, price: newPrice, change, changePercent })
    }

    // Broadcast to all clients
    if (updates.length > 0) {
      io.emit('price_update', updates)
    }

    // Batch update DB every 10 seconds (every ~3 ticks)
    if (Math.random() < 0.33) {
      try {
        await Promise.all(
          dbUpdates.map((u) =>
            prisma.stock.update({
              where: { symbol: u.symbol },
              data: {
                currentPrice: u.price,
                change: u.change,
                changePercent: u.changePercent,
                updatedAt: new Date(),
              },
            })
          )
        )
      } catch {
        // Silent - don't interrupt price simulation on DB errors
      }
    }
  }, 3000)

  return interval
}

app.prepare().then(async () => {
  await loadInitialPrices()

  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error handling request:', req.url, err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  })

  const io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })

  // Make io available globally for API routes
  ;(global as any).io = io
  ;(global as any).priceCache = priceCache

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`)

    // Send current prices immediately on connect
    const allPrices = Array.from(priceCache.values()).map((v) => ({
      symbol: v.symbol,
      price: v.price,
      change: v.change,
      changePercent: v.changePercent,
      volume: v.volume,
    }))
    socket.emit('initial_prices', allPrices)

    socket.on('subscribe_stock', (symbol: string) => {
      socket.join(`stock:${symbol}`)
    })

    socket.on('unsubscribe_stock', (symbol: string) => {
      socket.leave(`stock:${symbol}`)
    })

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} - ${reason}`)
    })
  })

  startPriceSimulator(io)

  httpServer.once('error', (err) => {
    console.error('Server error:', err)
    process.exit(1)
  })

  httpServer.listen(port, () => {
    console.log(`
🚀 Dalal Street Battle Arena
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 URL:     http://${hostname}:${port}
📊 Mode:    ${dev ? 'Development' : 'Production'}
🗃️  DB:      PostgreSQL (Prisma)
⚡ Socket:  Socket.IO on /api/socket
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `)
  })
})
