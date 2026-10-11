import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js'
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

function parseUrl(value, label, { allowCredentials = false, allowQuery = false } = {}) {
  if (!value) throw new Error(`${label} is required`)

  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${label} must be a valid URL`)
  }

  if ((!allowCredentials && (url.username || url.password)) || (!allowQuery && url.search) || url.hash) {
    throw new Error(`${label} contains URL components that are not allowed`)
  }

  return url
}

export function assertSafeOrigin(value, options = {}) {
  const url = parseUrl(value, 'BASE_URL')
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/') {
    throw new Error('BASE_URL must be an HTTP(S) origin without a path')
  }

  const hostname = url.hostname.toLowerCase()
  if (LOOPBACK_HOSTS.has(hostname)) return url.origin

  const expectedOrigin = options.stagingOrigin
  let expected
  try {
    expected = expectedOrigin ? new URL(expectedOrigin) : null
  } catch {
    throw new Error('LOAD_TEST_STAGING_ORIGIN must be a valid origin')
  }

  if (
    options.allowStaging === 'YES' &&
    expected &&
    url.protocol === 'https:' &&
    expected.origin === url.origin &&
    hostname.includes('staging')
  ) {
    return url.origin
  }

  throw new Error('Refusing non-local target. Staging requires an exact staging origin and LOAD_TEST_ALLOW_STAGING=YES')
}

export function assertLocalSmokeOrigin(value) {
  const origin = assertSafeOrigin(value)
  const hostname = new URL(origin).hostname.toLowerCase()
  if (!LOOPBACK_HOSTS.has(hostname)) {
    throw new Error('Local smoke BASE_URL must use a loopback host')
  }
  return origin
}

export function assertSafeDatabaseUrl(value, options = {}) {
  const url = parseUrl(value, 'DATABASE_URL', { allowCredentials: true, allowQuery: true })
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

export function assertLocalSmokeDatabaseUrl(value) {
  const url = parseUrl(value, 'DATABASE_URL', { allowCredentials: true, allowQuery: true })
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL must use PostgreSQL')
  }

  const hostname = url.hostname.toLowerCase()
  if (!LOOPBACK_HOSTS.has(hostname)) {
    throw new Error('Local smoke DATABASE_URL must use a loopback host')
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''))
  if (!/load[-_]?test/i.test(databaseName)) {
    throw new Error('Local smoke database name must contain "loadtest"')
  }

  return databaseName
}

export function assertSafeRunId(value) {
  if (!value || !/^[a-z0-9-]{1,24}$/i.test(value)) {
    throw new Error('LOAD_TEST_RUN_ID must be 1–24 letters, digits, or hyphens')
  }
  return value.toLowerCase()
}

export function assertSmokeRunId(value) {
  const runId = assertSafeRunId(value)
  if (!runId.startsWith('smoke-')) {
    throw new Error('Local smoke LOAD_TEST_RUN_ID must start with "smoke-"')
  }
  return runId
}

export function stagingOptionsFromEnv(env = process.env) {
  return {
    allowStaging: env.LOAD_TEST_ALLOW_STAGING,
    stagingOrigin: env.LOAD_TEST_STAGING_ORIGIN,
    stagingDbHost: env.LOAD_TEST_STAGING_DB_HOST,
  }
}
