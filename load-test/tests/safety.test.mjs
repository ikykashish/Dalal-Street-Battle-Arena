import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assertLocalSmokeDatabaseUrl,
  assertLocalSmokeOrigin,
  assertSafeDatabaseUrl,
  assertSafeOrigin,
  assertSafeRunId,
  assertSmokeRunId,
} from '../lib/safety.js'

test('accepts only local application origins by default', () => {
  assert.equal(assertSafeOrigin('http://localhost:3000'), 'http://localhost:3000')
  assert.equal(assertSafeOrigin('http://127.0.0.1:3000'), 'http://127.0.0.1:3000')
  assert.throws(() => assertSafeOrigin('https://competition.example.edu'), /Refusing non-local target/)
  assert.throws(() => assertSafeOrigin('http://localhost:3000/dashboard'), /without a path/)
})

test('requires explicit exact staging confirmation', () => {
  const options = {
    allowStaging: 'YES',
    stagingOrigin: 'https://dsba-staging.example.edu',
  }
  assert.equal(assertSafeOrigin('https://dsba-staging.example.edu', options), 'https://dsba-staging.example.edu')
  assert.throws(() => assertSafeOrigin('http://dsba-staging.example.edu', options), /Refusing non-local target/)
  assert.throws(() => assertSafeOrigin('https://dsba-prod.example.edu', options), /Refusing non-local target/)
  assert.throws(() => assertSafeOrigin('https://other-staging.example.edu', options), /Refusing non-local target/)
})

test('database must be local or explicitly named staging and have a loadtest database name', () => {
  assert.equal(
    assertSafeDatabaseUrl('postgresql://user:password@localhost:5433/dalal_street_loadtest'),
    'dalal_street_loadtest'
  )
  assert.equal(
    assertSafeDatabaseUrl('postgresql://user:password@localhost:5433/dalal_street_loadtest?schema=public'),
    'dalal_street_loadtest'
  )
  assert.throws(
    () => assertSafeDatabaseUrl('postgresql://user:password@localhost:5432/dalal_street_db'),
    /without "loadtest"/
  )
  assert.throws(
    () => assertSafeDatabaseUrl('postgresql://user:password@prod-db.example.edu/dalal_street_loadtest'),
    /Refusing non-local database/
  )
  assert.equal(
    assertSafeDatabaseUrl('postgresql://user:password@dsba-staging-db.example.edu/dalal_street_loadtest', {
      allowStaging: 'YES',
      stagingDbHost: 'dsba-staging-db.example.edu',
    }),
    'dalal_street_loadtest'
  )
})

test('run IDs are restricted to safe filename characters', () => {
  assert.equal(assertSafeRunId('loadtest-300'), 'loadtest-300')
  assert.throws(() => assertSafeRunId('../prod'), /LOAD_TEST_RUN_ID/)
})

test('local smoke accepts only loopback PostgreSQL URLs with a loadtest database name', () => {
  assert.equal(
    assertLocalSmokeDatabaseUrl('postgresql://loadtest:local-only@127.0.0.1:5433/dalal_street_loadtest'),
    'dalal_street_loadtest'
  )
  assert.equal(
    assertLocalSmokeDatabaseUrl('postgresql://loadtest:local-only@localhost:5433/dalal_street_loadtest?schema=public'),
    'dalal_street_loadtest'
  )
  assert.throws(() => assertLocalSmokeDatabaseUrl(undefined), /DATABASE_URL is required/)
  assert.throws(() => assertLocalSmokeDatabaseUrl('mysql://localhost/dalal_street_loadtest'), /must use PostgreSQL/)
  assert.throws(
    () => assertLocalSmokeDatabaseUrl('postgresql://loadtest:local-only@prod-db.example.edu/dalal_street_loadtest'),
    /must use a loopback host/
  )
  assert.throws(
    () => assertLocalSmokeDatabaseUrl('postgresql://loadtest:local-only@127.0.0.1:5433/dalal_street_db'),
    /must contain "loadtest"/
  )
})

test('local smoke origin cannot opt in to a remote target', () => {
  assert.equal(assertLocalSmokeOrigin('http://127.0.0.1:3000'), 'http://127.0.0.1:3000')
  assert.equal(assertLocalSmokeOrigin('http://localhost:3000'), 'http://localhost:3000')
  assert.throws(() => assertLocalSmokeOrigin(undefined), /BASE_URL is required/)
  assert.throws(() => assertLocalSmokeOrigin('https://competition.example.edu'), /Refusing non-local target/)
  assert.throws(() => assertLocalSmokeOrigin('http://localhost:3000/dashboard'), /without a path/)
})

test('local smoke IDs are explicitly namespaced', () => {
  assert.equal(assertSmokeRunId('smoke-20261004-a'), 'smoke-20261004-a')
  assert.throws(() => assertSmokeRunId('normal-100'), /must start with "smoke-"/)
  assert.throws(() => assertSmokeRunId('../smoke'), /LOAD_TEST_RUN_ID/)
})
