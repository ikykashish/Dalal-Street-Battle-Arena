import { URL } from 'node:url'

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

export function assertSafeRunId(value) {
  if (!value || !/^[a-z0-9-]{1,24}$/i.test(value)) {
    throw new Error('LOAD_TEST_RUN_ID must be 1–24 letters, digits, or hyphens')
  }
  return value.toLowerCase()
}

export function stagingOptionsFromEnv(env = process.env) {
  return {
    allowStaging: env.LOAD_TEST_ALLOW_STAGING,
    stagingOrigin: env.LOAD_TEST_STAGING_ORIGIN,
    stagingDbHost: env.LOAD_TEST_STAGING_DB_HOST,
  }
}

export function assertSafeDatabaseUrl(value, options = {}) {
  if (!value) throw new Error('DATABASE_URL is required')

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('DATABASE_URL must be a valid URL')
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use PostgreSQL')
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))
  if (!/load[-_]?test/i.test(databaseName)) {
    throw new Error('Refusing database without "loadtest" in its name')
  }

  const hostname = url.hostname.toLowerCase()
  if (LOOPBACK_HOSTS.has(hostname)) return databaseName

  if (
    options.allowStaging === 'YES' &&
    options.stagingDbHost &&
    hostname === options.stagingDbHost.toLowerCase() &&
    hostname.includes('staging')
  ) {
    return databaseName
  }

  throw new Error('Refusing non-local database. Staging requires its exact host and LOAD_TEST_ALLOW_STAGING=YES')
}
