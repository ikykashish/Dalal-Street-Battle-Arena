import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { assertSafeDatabaseUrl, assertSafeRunId, stagingOptionsFromEnv } from '../lib/safety-node.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const runId = assertSafeRunId(process.env.LOAD_TEST_RUN_ID)
assertSafeDatabaseUrl(process.env.DATABASE_URL, stagingOptionsFromEnv())

const countArg = process.argv.indexOf('--count')
const count = countArg >= 0 ? Number.parseInt(process.argv[countArg + 1], 10) : 0
if (![100, 150, 200, 300].includes(count)) {
  throw new Error('Provide --count 100, 150, 200, or 300')
}

const accounts = Array.from({ length: count }, (_, index) => {
  const number = String(index + 1).padStart(3, '0')
  return {
    email: `loadtest-${runId}-${number}@example.invalid`,
    name: `Load Test ${runId} ${number}`,
  }
})
const teamPrefix = `LT_${runId}_TEAM_`
const joinedCount = Math.floor(count * 0.9)
const teamNames = Array.from({ length: Math.ceil(joinedCount / 10) }, (_, index) => `${teamPrefix}${String(index + 1).padStart(2, '0')}`)
const teamCodes = teamNames.map(() => `LT${runId.toUpperCase()}${randomBytes(4).toString('hex').toUpperCase()}`)
const manifestPath = resolve(root, 'load-test', 'data', `${runId}.json`)
const password = randomBytes(24).toString('base64url')
const passwordHash = await bcrypt.hash(password, 12)
const prisma = new PrismaClient()

try {
  const stocks = await prisma.stock.findMany({ select: { id: true }, orderBy: { symbol: 'asc' } })
  if (stocks.length === 0) throw new Error('No stocks found. Seed this dedicated load-test database first.')

  const existing = await prisma.user.count({ where: { email: { in: accounts.map((account) => account.email) } } })
  const existingTeams = await prisma.team.count({ where: { name: { in: teamNames } } })
  if (existing > 0 || existingTeams > 0) {
    throw new Error('This run ID already has test accounts or teams. Clean up that run or choose a new LOAD_TEST_RUN_ID.')
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

    for (let teamIndex = 0; teamIndex < teamNames.length; teamIndex += 1) {
      const members = users.slice(teamIndex * 10, Math.min((teamIndex + 1) * 10, joinedCount))
      const team = await tx.team.create({
        data: {
          name: teamNames[teamIndex],
          code: teamCodes[teamIndex],
          description: 'Generated, disposable load-test team',
          creatorId: members[0].id,
        },
      })
      await tx.user.updateMany({
        where: { id: { in: members.map((member) => member.id) } },
        data: { teamId: team.id },
      })
    }

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
        ...(index >= joinedCount ? { teamCode: teamCodes[index % teamCodes.length] } : {}),
      })),
    }, null, 2)}\n`,
    { flag: 'wx' }
  )
  console.log(`Created ${createdAccounts.length} fake users (${joinedCount} assigned to ${teamNames.length} teams), and one watchlist item per user.`)
  console.log(`Credentials saved to ignored file: ${manifestPath}`)
} finally {
  await prisma.$disconnect()
}
