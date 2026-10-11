import { SharedArray } from 'k6/data'
import { fail, sleep } from 'k6'
import { assertLocalSmokeOrigin, assertSmokeRunId } from '../lib/safety.js'
import { checkOk, get, postTrade, signIn } from '../lib/k6-http.js'

const BASE_URL = assertLocalSmokeOrigin(__ENV.BASE_URL)
const RUN_ID = assertSmokeRunId(__ENV.RUN_ID)
const VUS = Number(__ENV.VUS)

if (!Number.isInteger(VUS) || VUS < 2 || VUS > 5) {
  throw new Error('Local smoke VUS must be an integer from 2 through 5')
}

const accounts = new SharedArray(`local-smoke-accounts-${RUN_ID}`, () => {
  const manifest = JSON.parse(open(`../data/${RUN_ID}.json`))
  if (manifest.runId !== RUN_ID || !Array.isArray(manifest.accounts)) {
    throw new Error('Local smoke credential manifest does not match RUN_ID')
  }
  return manifest.accounts
})
if (accounts.length < VUS || accounts.length > 5) {
  throw new Error(`Local smoke manifest must contain 2–5 users and at least ${VUS} users`)
}
const expectedEmail = new RegExp(`^loadtest-${RUN_ID}-\\d{3}@example\\.invalid$`)
if (accounts.some((account) => typeof account.email !== 'string' || !expectedEmail.test(account.email))) {
  throw new Error('Local smoke manifest may contain only generated @example.invalid accounts for this smoke run')
}

export const options = {
  scenarios: {
    local_smoke: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '5m',
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
    checks: ['rate>0.95'],
    trade_success_rate: ['rate>0.95'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
}

export function setup() {
  const response = get(BASE_URL, '/api/stocks?search=ITC&limit=10', 'smoke_stock_lookup')
  if (!checkOk(response, 'local smoke stock lookup succeeds')) fail('Local smoke stock lookup failed')

  const stocks = response.json('stocks') || []
  const stock = stocks.find((candidate) => candidate.symbol === 'ITC')
  if (!stock?.id || !Number.isFinite(stock.currentPrice) || stock.currentPrice <= 0 || stock.currentPrice > 1_000_000) {
    fail('Local smoke requires a seeded ITC stock with a positive price affordable from fake test balances')
  }
  return { stockId: stock.id }
}

export default function (data) {
  const account = accounts[__VU - 1]
  if (!signIn(BASE_URL, account)) return

  const pagePaths = ['/dashboard', '/market', '/portfolio', '/leaderboard']
  let pagesLoaded = true
  for (const path of pagePaths) {
    if (!checkOk(get(BASE_URL, path, `smoke_page_${path.slice(1)}`), `${path} page responds successfully`)) {
      pagesLoaded = false
    }
  }

  const apiPaths = [
    ['/api/stocks?limit=100', 'smoke_market_data'],
    ['/api/portfolio', 'smoke_portfolio_data'],
    ['/api/trades?limit=20', 'smoke_trade_history'],
    ['/api/leaderboard?type=individual&limit=50', 'smoke_individual_leaderboard'],
    ['/api/leaderboard?type=team&limit=50', 'smoke_team_leaderboard'],
  ]
  let apiResponsesOkay = true
  for (const [path, endpoint] of apiPaths) {
    if (!checkOk(get(BASE_URL, path, endpoint), `${endpoint} responds successfully`)) apiResponsesOkay = false
  }
  if (!pagesLoaded || !apiResponsesOkay) return

  // All VUs reach the same short pause before BUYing the same stock, exercising
  // concurrent, authenticated trade requests without reusing an account.
  sleep(1)
  const buy = postTrade(BASE_URL, data.stockId, 'BUY', 1)
  if (buy.status < 200 || buy.status >= 300) return

  sleep(0.2)
  postTrade(BASE_URL, data.stockId, 'SELL', 1)
}
