import { PrismaClient } from '@prisma/client'
import {
  assertLocalSmokeDatabaseUrl,
  assertSafeDatabaseUrl,
  assertSafeRunId,
  assertSmokeRunId,
  stagingOptionsFromEnv,
} from '../lib/safety.js'

const isSmokeRun = process.env.LOAD_TEST_RUN_ID?.toLowerCase().startsWith('smoke-') ?? false
const runId = isSmokeRun
  ? assertSmokeRunId(process.env.LOAD_TEST_RUN_ID)
  : assertSafeRunId(process.env.LOAD_TEST_RUN_ID)
if (isSmokeRun) assertLocalSmokeDatabaseUrl(process.env.DATABASE_URL)
else assertSafeDatabaseUrl(process.env.DATABASE_URL, stagingOptionsFromEnv())
const expectedSuccesses = process.env.EXPECTED_TRADE_SUCCESSES === undefined
  ? null
  : Number.parseInt(process.env.EXPECTED_TRADE_SUCCESSES, 10)
if (expectedSuccesses !== null && (!Number.isSafeInteger(expectedSuccesses) || expectedSuccesses < 0)) {
  throw new Error('EXPECTED_TRADE_SUCCESSES must be a nonnegative integer')
}
const prisma = new PrismaClient()
const failures = []

try {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: `loadtest-${runId}-`, endsWith: '@example.invalid' } },
    select: { id: true, email: true, cashBalance: true },
  })
  if (users.length === 0) throw new Error(`No generated accounts found for run ${runId}`)

  const userIds = users.map((user) => user.id)
  const [trades, holdings, stocks] = await Promise.all([
    prisma.trade.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, stockId: true, type: true, quantity: true, price: true, total: true },
    }),
    prisma.holding.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, stockId: true, quantity: true },
    }),
    prisma.stock.findMany({ select: { symbol: true, currentPrice: true } }),
  ])

  const expectedCash = new Map(users.map((user) => [user.id, 1_000_000]))
  const expectedHoldings = new Map()
  if (expectedSuccesses !== null && trades.length !== expectedSuccesses) {
    failures.push(`Stored trade count ${trades.length} differs from k6 successful trade count ${expectedSuccesses}`)
  }

  for (const trade of trades) {
    if (!Number.isInteger(trade.quantity) || trade.quantity <= 0 || !Number.isFinite(trade.price) || trade.price <= 0 || !Number.isFinite(trade.total)) {
      failures.push(`Trade data invalid for user ${trade.userId}`)
      continue
    }

    const key = `${trade.userId}:${trade.stockId}`
    const priorQuantity = expectedHoldings.get(key) || 0
    if (trade.type === 'BUY') {
      expectedCash.set(trade.userId, expectedCash.get(trade.userId) - trade.total)
      expectedHoldings.set(key, priorQuantity + trade.quantity)
    } else if (trade.type === 'SELL') {
      expectedCash.set(trade.userId, expectedCash.get(trade.userId) + trade.total)
      expectedHoldings.set(key, priorQuantity - trade.quantity)
    } else {
      failures.push(`Unknown trade type ${trade.type} for user ${trade.userId}`)
    }

    if (Math.abs(trade.total - trade.price * trade.quantity) > 0.01) {
      failures.push(`Trade total differs from price × quantity for user ${trade.userId}`)
    }
  }

  const actualHoldings = new Map()
  for (const holding of holdings) {
    const key = `${holding.userId}:${holding.stockId}`
    actualHoldings.set(key, holding.quantity)
    if (!Number.isInteger(holding.quantity) || holding.quantity <= 0) {
      failures.push(`Non-positive holding quantity for user ${holding.userId}`)
    }
  }

  const allPositionKeys = new Set([...expectedHoldings.keys(), ...actualHoldings.keys()])
  for (const key of allPositionKeys) {
    const expected = expectedHoldings.get(key) || 0
    const actual = actualHoldings.get(key) || 0
    if (expected < 0) failures.push(`Trade ledger implies an oversold position: ${key}`)
    if (actual !== expected) failures.push(`Holding does not match trade ledger: ${key} expected=${expected} actual=${actual}`)
  }

  for (const user of users) {
    const expected = expectedCash.get(user.id)
    if (user.cashBalance < 0) failures.push(`Negative cash balance for ${user.email}`)
    if (Math.abs(user.cashBalance - expected) > 0.01) {
      failures.push(`Cash does not match trade ledger for ${user.email}: expected=${expected} actual=${user.cashBalance}`)
    }
  }

  for (const stock of stocks) {
    if (!Number.isFinite(stock.currentPrice) || stock.currentPrice <= 0) {
      failures.push(`Invalid stored market price for ${stock.symbol}`)
    }
  }

  console.log(JSON.stringify({
    runId,
    users: users.length,
    trades: trades.length,
    holdings: holdings.length,
    stocksChecked: stocks.length,
    integrity: failures.length === 0 ? 'PASS' : 'FAIL',
    failures: failures.slice(0, 20),
  }, null, 2))

  if (failures.length > 0) process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
