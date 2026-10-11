import { SharedArray } from 'k6/data'
import { sleep } from 'k6'
import { assertSafeOrigin, assertSafeRunId } from '../lib/safety.js'
import { batchGet, checkOk, get, postJson, postTrade, signIn } from '../lib/k6-http.js'

const BASE_URL = assertSafeOrigin(__ENV.BASE_URL, {
  allowStaging: __ENV.LOAD_TEST_ALLOW_STAGING,
  stagingOrigin: __ENV.LOAD_TEST_STAGING_ORIGIN,
})
const RUN_ID = assertSafeRunId(__ENV.RUN_ID)
const VUS = Number.parseInt(__ENV.VUS || '100', 10)
const HOLD_DURATION = __ENV.HOLD_DURATION || '10m'
const ALLOWED_LEVELS = new Set([100, 150, 200, 300])

if (!ALLOWED_LEVELS.has(VUS)) throw new Error('VUS must be one of 100, 150, 200, or 300')

const accounts = new SharedArray(`load-test-accounts-${RUN_ID}`, () =>
  JSON.parse(open(`../data/${RUN_ID}.json`)).accounts
)
if (accounts.length < VUS) throw new Error(`Run ${RUN_ID} has ${accounts.length} users; ${VUS} are required`)

export const options = {
  scenarios: {
    realistic_competition: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: VUS },
        { duration: HOLD_DURATION, target: VUS },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    checks: ['rate>0.98'],
    trade_success_rate: ['rate>0.95'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
}

const pages = ['dashboard', 'market', 'portfolio', 'leaderboard', 'teams', 'watchlist']
let authenticated = false
let page = pages[(__VU - 1) % pages.length]
let iteration = 0
let stocks = []
let position = null
let attemptedTeamJoin = false

function parseStocks(response) {
  try {
    return response.json('stocks') || []
  } catch {
    return []
  }
}

function enterPage(nextPage, account) {
  page = nextPage
  let responses
  switch (page) {
    case 'dashboard':
      responses = batchGet(BASE_URL, [
        { path: '/api/portfolio', endpoint: 'portfolio' },
        { path: '/api/stocks?limit=100&sort=marketCap', endpoint: 'stocks_list' },
        { path: '/api/trades?limit=20', endpoint: 'trades_recent' },
      ])
      if (responses.every((response) => checkOk(response, `${page} initial data`))) stocks = parseStocks(responses[1])
      break
    case 'market':
      responses = batchGet(BASE_URL, [
        { path: '/api/stocks?limit=100', endpoint: 'stocks_list' },
        { path: '/api/portfolio', endpoint: 'portfolio' },
        { path: '/api/watchlist', endpoint: 'watchlist' },
      ])
      if (responses.every((response) => checkOk(response, `${page} initial data`))) stocks = parseStocks(responses[0])
      break
    case 'portfolio':
      responses = batchGet(BASE_URL, [
        { path: '/api/portfolio', endpoint: 'portfolio' },
        { path: '/api/trades?limit=50', endpoint: 'trades_history_recent' },
      ])
      responses.forEach((response) => checkOk(response, `${page} initial data`))
      break
    case 'leaderboard':
      checkOk(get(BASE_URL, '/api/leaderboard?type=individual&limit=50', 'leaderboard_individual'), 'individual leaderboard loads')
      break
    case 'teams':
      checkOk(get(BASE_URL, '/api/teams', 'team_info'), 'team info loads')
      if (account.teamCode && !attemptedTeamJoin) {
        const joinResponse = postJson(BASE_URL, '/api/teams/join', { code: account.teamCode }, 'team_join')
        checkOk(joinResponse, 'generated participant joins a team')
        if (joinResponse.status >= 200 && joinResponse.status < 300) attemptedTeamJoin = true
      }
      break
    case 'watchlist':
      responses = batchGet(BASE_URL, [
        { path: '/api/watchlist', endpoint: 'watchlist' },
        { path: '/api/portfolio', endpoint: 'portfolio' },
      ])
      responses.forEach((response) => checkOk(response, `${page} initial data`))
      break
  }
}

function pollCurrentPage() {
  if (page === 'dashboard' || page === 'portfolio') {
    checkOk(get(BASE_URL, '/api/portfolio', 'portfolio'), 'portfolio polling succeeds')
  } else if (page === 'leaderboard' && iteration % 2 === 0) {
    const type = iteration % 4 === 0 ? 'team' : 'individual'
    checkOk(
      get(BASE_URL, `/api/leaderboard?type=${type}&limit=50`, `leaderboard_${type}`),
      `${type} leaderboard polling succeeds`
    )
  } else if (page === 'market' && stocks.length > 0 && Math.random() < 0.3) {
    const stock = stocks[Math.floor(Math.random() * stocks.length)]
    checkOk(get(BASE_URL, `/api/stocks/${encodeURIComponent(stock.symbol)}`, 'stock_detail'), 'stock detail loads')
  } else if (page === 'watchlist' && Math.random() < 0.12) {
    const query = ['TCS', 'ITC', 'RELIANCE'][Math.floor(Math.random() * 3)]
    checkOk(get(BASE_URL, `/api/stocks?search=${query}&limit=10`, 'stock_search'), 'stock search loads')
  }

  // The shared navbar refreshes notifications every 30 seconds.
  if (iteration % 3 === 0) {
    checkOk(get(BASE_URL, '/api/notifications?limit=20', 'notifications'), 'notifications load')
  }
}

function maybeTrade() {
  if (!['dashboard', 'market', 'portfolio'].includes(page) || stocks.length === 0 || Math.random() >= 0.05) return

  if (!position) {
    const affordable = stocks.filter((stock) => stock.currentPrice > 0 && stock.currentPrice < 100000)
    const choices = affordable.length > 0 ? affordable : stocks
    const stock = choices[Math.floor(Math.random() * choices.length)]
    const response = postTrade(BASE_URL, stock.id, 'BUY', 1)
    if (response.status >= 200 && response.status < 300) position = { stockId: stock.id, quantity: 1 }
  } else {
    const response = postTrade(BASE_URL, position.stockId, 'SELL', position.quantity)
    if (response.status >= 200 && response.status < 300) position = null
  }
}

export default function () {
  const account = accounts[__VU - 1]
  if (!authenticated) {
    authenticated = signIn(BASE_URL, account)
    if (!authenticated) {
      sleep(5)
      return
    }
    enterPage(page, account)
  } else if (Math.random() < 0.12) {
    enterPage(pages[Math.floor(Math.random() * pages.length)], account)
  } else {
    pollCurrentPage()
  }

  maybeTrade()
  iteration += 1
  sleep(6 + Math.random() * 6)
}
