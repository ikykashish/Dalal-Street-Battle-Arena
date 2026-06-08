import { PrismaClient } from '@prisma/client'
import { STOCKS_DATA } from '../src/lib/stocks-data'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  for (const stock of STOCKS_DATA) {
    await prisma.stock.upsert({
      where: { symbol: stock.symbol },
      update: {
        currentPrice: stock.currentPrice,
        previousClose: stock.previousClose,
        open: stock.open,
        dayHigh: stock.dayHigh,
        dayLow: stock.dayLow,
        change: stock.currentPrice - stock.previousClose,
        changePercent: ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100,
        volume: stock.volume,
        marketCap: stock.marketCap,
      },
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
        change: stock.currentPrice - stock.previousClose,
        changePercent: ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100,
        volume: stock.volume,
        marketCap: stock.marketCap,
      },
    })
  }

  console.log(`✅ Seeded ${STOCKS_DATA.length} stocks`)
  console.log('🎉 Database seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
