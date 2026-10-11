import { readFile, unlink } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import {
  assertLocalSmokeDatabaseUrl,
  assertSafeDatabaseUrl,
  assertSafeRunId,
  assertSmokeRunId,
  stagingOptionsFromEnv,
} from '../lib/safety.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const isSmokeRun = process.env.LOAD_TEST_RUN_ID?.toLowerCase().startsWith('smoke-') ?? false
const runId = isSmokeRun
  ? assertSmokeRunId(process.env.LOAD_TEST_RUN_ID)
  : assertSafeRunId(process.env.LOAD_TEST_RUN_ID)
if (isSmokeRun) assertLocalSmokeDatabaseUrl(process.env.DATABASE_URL)
else assertSafeDatabaseUrl(process.env.DATABASE_URL, stagingOptionsFromEnv())

const manifestPath = resolve(root, 'load-test', 'data', `${runId}.json`)
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
if (manifest.runId !== runId || !Array.isArray(manifest.accounts) || manifest.accounts.length === 0) {
  throw new Error('The generated account manifest is missing or does not match this run ID')
}
if (manifest.accounts.some((account) => !account.email.startsWith(`loadtest-${runId}-`) || !account.email.endsWith('@example.invalid'))) {
  throw new Error('Manifest contains an account outside the generated fake-account namespace')
}

const prisma = new PrismaClient()
try {
  const deleted = await prisma.$transaction(async (tx) => {
    const users = await tx.user.deleteMany({
      where: { email: { startsWith: `loadtest-${runId}-`, endsWith: '@example.invalid' } },
    })
    const teams = await tx.team.deleteMany({ where: { name: { startsWith: `LT_${runId}_TEAM_` } } })
    return { users: users.count, teams: teams.count }
  })
  await unlink(manifestPath)
  console.log(`Removed ${deleted.users} generated users and ${deleted.teams} generated teams for run ${runId}.`)
} finally {
  await prisma.$disconnect()
}
