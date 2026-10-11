import http from 'k6/http'
import { check } from 'k6'
import { Counter, Rate } from 'k6/metrics'

export const response4xx = new Counter('http_4xx_responses')
export const response5xx = new Counter('http_5xx_responses')
export const transportFailures = new Counter('request_transport_failures')
export const tradeSuccesses = new Counter('trade_successes')
export const tradeFailures = new Counter('trade_failures')
export const tradeSuccessRate = new Rate('trade_success_rate')

function recordResponse(response, endpoint) {
  const tags = { endpoint }
  if (response.status === 0) transportFailures.add(1, tags)
  else if (response.status >= 400 && response.status < 500) response4xx.add(1, tags)
  else if (response.status >= 500) response5xx.add(1, tags)
}

export function get(baseUrl, path, endpoint = path) {
  const response = http.get(`${baseUrl}${path}`, {
    headers: { Accept: 'application/json' },
    tags: { endpoint },
    timeout: '30s',
  })
  recordResponse(response, endpoint)
  return response
}

export function postJson(baseUrl, path, payload, endpoint = path) {
  const response = http.post(`${baseUrl}${path}`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    tags: { endpoint },
    timeout: '30s',
  })
  recordResponse(response, endpoint)
  return response
}

export function batchGet(baseUrl, requests) {
  const responses = http.batch(
    requests.map(({ path, endpoint }) => ({
      method: 'GET',
      url: `${baseUrl}${path}`,
      params: {
        headers: { Accept: 'application/json' },
        tags: { endpoint },
        timeout: '30s',
      },
    }))
  )

  responses.forEach((response, index) => recordResponse(response, requests[index].endpoint))
  return responses
}

export function signIn(baseUrl, account) {
  const csrfResponse = get(baseUrl, '/api/auth/csrf', 'auth_csrf')
  let csrfToken
  try {
    csrfToken = csrfResponse.json('csrfToken')
  } catch {
    csrfToken = null
  }

  if (csrfResponse.status !== 200 || !csrfToken) {
    check(csrfResponse, { 'NextAuth CSRF token loaded': () => false })
    return false
  }

  const body = [
    ['csrfToken', csrfToken],
    ['callbackUrl', `${baseUrl}/dashboard`],
    ['json', 'true'],
    ['email', account.email],
    ['password', account.password],
  ].map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')
  const response = http.post(`${baseUrl}/api/auth/callback/credentials`, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    tags: { endpoint: 'auth_credentials' },
    timeout: '30s',
  })
  recordResponse(response, 'auth_credentials')

  let result
  try {
    result = response.json()
  } catch {
    result = null
  }

  const success = response.status === 200 && typeof result?.url === 'string' && !result.url.includes('error=')
  check(response, { 'credentials login succeeds': () => success })
  if (!success) return false

  const authSessionResponse = get(baseUrl, '/api/auth/session', 'auth_session')
  const authSessionOk = authSessionResponse.status === 200
  check(authSessionResponse, { 'NextAuth session is available': () => authSessionOk })
  if (!authSessionOk) return false

  const sessionResponse = get(baseUrl, '/api/user', 'user_session')
  const sessionOk = sessionResponse.status === 200
  check(sessionResponse, { 'authenticated session is accepted': () => sessionOk })
  return sessionOk
}

export function postTrade(baseUrl, stockId, type, quantity = 1) {
  const response = http.post(
    `${baseUrl}/api/trades`,
    JSON.stringify({ stockId, type, quantity }),
    {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      tags: { endpoint: 'trade_post', trade_type: type },
      timeout: '60s',
    }
  )

  recordResponse(response, 'trade_post')
  const success = response.status >= 200 && response.status < 300
  tradeSuccessRate.add(success ? 1 : 0, { type })
  if (success) tradeSuccesses.add(1, { type })
  else tradeFailures.add(1, { type })
  check(response, { [`${type} trade accepted`]: () => success })
  return response
}

export function checkOk(response, label) {
  const success = response.status >= 200 && response.status < 300
  check(response, { [label]: () => success })
  return success
}
