import { randomBytes } from 'node:crypto'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { assertLocalSmokeDatabaseUrl, assertSmokeRunId } from '../lib/safety.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const runId = assertSmokeRunId(process.env.LOAD_TEST_RUN_ID)
assertLocalSmokeDatabaseUrl(process.env.DATABASE_URL)

const countArg = process.argv.indexOf('--count')
const countText = countArg >= 0 ? process.argv[countArg + 1] : undefined
const count = countText === undefined ? Number.NaN : Number(countText)
if (!Number.isInteger(count) || count < 2 || count > 5) {
  throw new Error('Local smoke provisioning requires --count between 2 and 5')
}

const accounts = Array.from({ length: count }, (_, index) => {
  const number = String(index + 1).padStart(3, '0')
  return {
    email: `loadtest-${runId}-${number}@example.invalid`,
    name: `Load Test Smoke ${runId} ${number}`,
  }
})
const teamPrefix = `LT_${runId}_TEAM_`
const joinedCount = Math.floor(count * 0.8)
const teamNames = [`${teamPrefix}01`]
const teamCode = `LT${runId.toUpperCase()}${randomBytes(4).toString('hex').toUpperCase()}`
const manifestPath = resolve(root, 'load-test', 'data', `${runId}.json`)

try {
  await access(manifestPath)
  throw new Error(`A manifest already exists for ${runId}; choose a fresh smoke run ID`)
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

const password = randomBytes(24).toString('base64url')
const passwordHash = await bcrypt.hash(password, 12)
const prisma = new PrismaClient()

try {
  const stocks = await prisma.stock.findMany({ select: { id: true }, orderBy: { symbol: 'asc' } })
  if (stocks.length === 0) throw new Error('No stocks found. Seed this dedicated local smoke database first.')

  const existing = await prisma.user.count({ where: { email: { in: accounts.map((account) => account.email) } } })
  const existingTeams = await prisma.team.count({ where: { name: { in: teamNames } } })
  if (existing > 0 || existingTeams > 0) {
    throw new Error('This smoke run ID already has test accounts or teams; choose a fresh LOAD_TEST_RUN_ID.')
  }

  const createdAccounts = await prisma.$transaction(async (tx) => {
    await tx.user.createMany({
      data: accounts.map((account) => ({
        ...account,
        password: passwordHash,
        cashBalance: 1_000_000,
        status: 'ACTIVE',
      })),
    })

    const users = await tx.user.findMany({
      where: { email: { in: accounts.map((account) => account.email) } },
      select: { id: true, email: true },
      orderBy: { email: 'asc' },
    })

    const members = users.slice(0, joinedCount)
    const team = await tx.team.create({
      data: {
        name: teamNames[0],
        code: teamCode,
        description: 'Generated, disposable local smoke-test team',
        creatorId: members[0].id,
      },
    })
    await tx.user.updateMany({
      where: { id: { in: members.map((member) => member.id) } },
      data: { teamId: team.id },
    })

    await tx.watchlistItem.createMany({
      data: users.map((user, index) => ({ userId: user.id, stockId: stocks[index % stocks.length].id })),
    })

    return users
  })

  await mkdir(dirname(manifestPath), { recursive: true })
  await writeFile(
    manifestPath,
    `${JSON.stringify({
      runId,
      createdAt: new Date().toISOString(),
      accounts: createdAccounts.map((account, index) => ({
        ...account,
        password,
        ...(index >= joinedCount ? { teamCode } : {}),
      })),
    }, null, 2)}\n`,
    { flag: 'wx' }
  )

  console.log(`Created ${createdAccounts.length} local smoke-test users (maximum 5) and one watchlist item per user.`)
  console.log(`Credentials saved to ignored file: ${manifestPath}`)
} finally {
  await prisma.$disconnect()
}
