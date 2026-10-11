import { SharedArray } from 'k6/data'
import { sleep } from 'k6'
import { assertSafeOrigin, assertSafeRunId } from '../lib/safety.js'
import { checkOk, get, postTrade, signIn } from '../lib/k6-http.js'

const BASE_URL = assertSafeOrigin(__ENV.BASE_URL, {
  allowStaging: __ENV.LOAD_TEST_ALLOW_STAGING,
  stagingOrigin: __ENV.LOAD_TEST_STAGING_ORIGIN,
})
const RUN_ID = assertSafeRunId(__ENV.RUN_ID)
const VUS = Number.parseInt(__ENV.VUS || '100', 10)
const ALLOWED_LEVELS = new Set([100, 150, 200, 300])

if (!ALLOWED_LEVELS.has(VUS)) throw new Error('VUS must be one of 100, 150, 200, or 300')

const accounts = new SharedArray(`load-test-burst-accounts-${RUN_ID}`, () =>
  JSON.parse(open(`load-test/data/${RUN_ID}.json`)).accounts
)
if (accounts.length < VUS) throw new Error(`Run ${RUN_ID} has ${accounts.length} users; ${VUS} are required`)

export const options = {
  scenarios: {
    simultaneous_trade_burst: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '5m',
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<5000', 'p(99)<15000'],
    checks: ['rate>0.95'],
    trade_success_rate: ['rate>0.95'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
}

const stockSymbol = (__ENV.BURST_STOCK_SYMBOL || 'ITC').toUpperCase()

export function setup() {
  const response = get(BASE_URL, `/api/stocks?search=${encodeURIComponent(stockSymbol)}&limit=10`, 'burst_stock_lookup')
  checkOk(response, 'burst stock lookup succeeds')
  const stocks = response.json('stocks') || []
  const stock = stocks.find((candidate) => candidate.symbol === stockSymbol)
  if (!stock?.id) throw new Error(`Stock ${stockSymbol} was not found in the local/staging database`)
  return { stockId: stock.id }
}

let authenticated = false

export default function (data) {
  const account = accounts[__VU - 1]
  if (!authenticated) {
    authenticated = signIn(BASE_URL, account)
    if (!authenticated) return
  }

  // Give all ramped VUs time to authenticate, then issue one BUY burst against
  // the same stock row. Each successful buyer follows with one SELL.
  sleep(Number.parseFloat(__ENV.BURST_DELAY_SECONDS || '10'))
  const buy = postTrade(BASE_URL, data.stockId, 'BUY', 1)
  if (buy.status < 200 || buy.status >= 300) return

  sleep(0.2)
  postTrade(BASE_URL, data.stockId, 'SELL', 1)
}
