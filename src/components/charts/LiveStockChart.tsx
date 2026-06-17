'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { TrendingUp, TrendingDown, ChevronDown, RefreshCw } from 'lucide-react'
import { useLivePrice } from '@/hooks/useStocks'
import { formatPrice, formatPercent, formatCurrency, cn } from '@/lib/utils'
import type { Stock } from '@/types'

/* ─── Deterministic helpers — must exactly match price-simulator.ts ──────── */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    hash = (hash << 5) - hash + c
    hash = hash & hash
  }
  return Math.abs(hash)
}
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}
function bucketPrice(symbol: string, basePrice: number, bucket: number): number {
  const phase = (hashCode(symbol) % 360) / 57.3
  const drift = Math.sin(bucket / 6 + phase) * 0.012
  const noise = (seededRandom(hashCode(`${symbol}:${bucket}`)) - 0.5) * 0.007
  return Math.round(basePrice * (1 + drift + noise) * 100) / 100
}

/* ─── OHLC candle data generator ─────────────────────────────────────────── */
interface OHLC {
  time: string
  open: number
  high: number
  low: number
  close: number
  isGreen: boolean
}

function generateCandleHistory(
  symbol: string,
  basePrice: number,
  numCandles = 40,
  ticksPerCandle = 15,
): OHLC[] {
  if (!Number.isFinite(basePrice) || basePrice <= 0) return []
  const currentBucket = Math.floor(Date.now() / 4000)
  const candles: OHLC[] = []

  for (let c = 0; c < numCandles; c++) {
    const startBucket = currentBucket - (numCandles - c) * ticksPerCandle
    const ticks: number[] = []
    for (let t = 0; t < ticksPerCandle; t++) {
      const p = bucketPrice(symbol, basePrice, startBucket + t)
      if (Number.isFinite(p) && p > 0) ticks.push(p)
    }
    if (!ticks.length) continue

    const tsMs = Date.now() - (numCandles - c) * ticksPerCandle * 4000
    const time = new Date(tsMs).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    const open = ticks[0]
    const close = ticks[ticks.length - 1]
    const high = Math.max(...ticks)
    const low = Math.min(...ticks)
    candles.push({ time, open, high, low, close, isGreen: close >= open })
  }
  return candles
}

/* ─── SVG Candlestick chart ──────────────────────────────────────────────── */
const PAD = { top: 12, right: 68, bottom: 30, left: 4 }

function CandleSVG({
  candles,
  previousClose,
  livePrice,
  w,
  h,
}: {
  candles: OHLC[]
  previousClose: number
  livePrice: number
  w: number
  h: number
}) {
  if (!candles.length) return null

  const cw = w - PAD.left - PAD.right
  const ch = h - PAD.top - PAD.bottom

  const safeLive = Number.isFinite(livePrice) && livePrice > 0 ? livePrice : previousClose
  const prices = candles.flatMap((c) => [c.high, c.low]).filter((p) => Number.isFinite(p) && p > 0)
  const domain = [...prices, previousClose, safeLive].filter((p) => Number.isFinite(p) && p > 0)
  if (domain.length === 0) return null

  const rawMin = Math.min(...domain)
  const rawMax = Math.max(...domain)
  const span = rawMax - rawMin || rawMin * 0.02 || 1
  const minP = rawMin - span * 0.08
  const maxP = rawMax + span * 0.08
  const range = maxP - minP || 1

  const py = (p: number) => PAD.top + ((maxP - p) / range) * ch
  const step = cw / Math.max(candles.length, 1)
  const bw = Math.max(3, Math.min(step * 0.7, 16))

  const gridCount = 5
  const gridPrices = Array.from({ length: gridCount }, (_, i) =>
    minP + (range * i) / (gridCount - 1),
  )

  const labelStep = Math.max(1, Math.ceil(candles.length / 6))
  const labelIndices = candles.map((_, i) => i).filter((i) => i % labelStep === 0)

  const isUp = safeLive >= previousClose
  const liveColor = isUp ? '#26a69a' : '#ef5350'

  return (
    <svg width={w} height={h} className="block" style={{ fontFamily: 'monospace' }}>
      {/* Grid lines + Y labels */}
      {gridPrices.map((p, gi) => {
        const yy = py(p)
        return (
          <g key={`grid-${gi}`}>
            <line x1={PAD.left} y1={yy} x2={w - PAD.right} y2={yy} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
            <text x={w - PAD.right + 6} y={yy + 4} fontSize={9.5} fill="#777">
              {p >= 1000 ? p.toFixed(0) : p >= 100 ? p.toFixed(1) : p.toFixed(2)}
            </text>
          </g>
        )
      })}

      {/* Previous close dotted line */}
      <line
        x1={PAD.left} y1={py(previousClose)} x2={w - PAD.right} y2={py(previousClose)}
        stroke="#888" strokeWidth={1} strokeDasharray="5,4"
      />
      <text x={w - PAD.right + 6} y={py(previousClose) + 4} fontSize={9} fill="#999">PC</text>

      {/* Candles */}
      {candles.map((c, i) => {
        const cx = PAD.left + i * step + step / 2
        const color = c.isGreen ? '#26a69a' : '#ef5350'
        const bodyTop = py(Math.max(c.open, c.close))
        const bodyH = Math.max(1.5, py(Math.min(c.open, c.close)) - bodyTop)
        return (
          <g key={i}>
            {/* Wick */}
            <line x1={cx} y1={py(c.high)} x2={cx} y2={py(c.low)} stroke={color} strokeWidth={1.2} />
            {/* Body */}
            <rect
              x={cx - bw / 2}
              y={bodyTop}
              width={bw}
              height={bodyH}
              fill={color}
              opacity={0.9}
            />
          </g>
        )
      })}

      {/* Live price line */}
      <line
        x1={PAD.left} y1={py(safeLive)} x2={w - PAD.right} y2={py(safeLive)}
        stroke={liveColor} strokeWidth={1.5} strokeDasharray="2,3" opacity={0.85}
      />
      <rect x={w - PAD.right + 4} y={py(safeLive) - 8} width={58} height={16} rx={3} fill={liveColor} opacity={0.15} />
      <text x={w - PAD.right + 7} y={py(safeLive) + 4} fontSize={9.5} fill={liveColor} fontWeight="600">
        {safeLive >= 1000 ? safeLive.toFixed(0) : safeLive.toFixed(2)}
      </text>

      {/* X time labels */}
      {labelIndices.map((i) => {
        const xpos = PAD.left + i * step + step / 2
        return (
          <text key={i} x={xpos} y={h - 8} fontSize={9} fill="#666" textAnchor="middle">
            {candles[i].time}
          </text>
        )
      })}
    </svg>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────── */
interface LiveStockChartProps {
  stocks: Stock[]
  initialSymbol?: string
}

export function LiveStockChart({ stocks, initialSymbol }: LiveStockChartProps) {
  const [selected, setSelected] = useState<Stock | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [candles, setCandles] = useState<OHLC[]>([])
  const [dims, setDims] = useState({ w: 800, h: 340 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Pick initial stock
  useEffect(() => {
    if (!stocks.length) return
    const found = initialSymbol ? stocks.find((s) => s.symbol === initialSymbol) : null
    setSelected(found || stocks[0])
  }, [stocks, initialSymbol])

  // Live price for selected stock — use basePrice as the stable DB reference
  const basePrice = selected?.basePrice ?? selected?.currentPrice ?? 0
  const { price: livePrice, change, changePercent } = useLivePrice(
    selected?.symbol ?? '',
    basePrice,
    selected?.previousClose ?? basePrice,
  )

  // Build candles from deterministic bucket history
  const rebuildCandles = useCallback(() => {
    if (!selected || !basePrice) return
    setCandles(generateCandleHistory(selected.symbol, basePrice))
  }, [selected, basePrice])

  useEffect(() => {
    rebuildCandles()
    const t = setInterval(rebuildCandles, 60_000)
    return () => clearInterval(t)
  }, [rebuildCandles])

  // Update last candle's close with live price every 4 s
  useEffect(() => {
    if (!Number.isFinite(livePrice) || livePrice <= 0) return
    setCandles((prev) => {
      if (!prev.length) return prev
      const next = [...prev]
      const last = { ...next[next.length - 1] }
      last.close = livePrice
      last.high = Math.max(last.high, livePrice)
      last.low = Math.min(last.low, livePrice)
      last.isGreen = last.close >= last.open
      next[next.length - 1] = last
      return next
    })
  }, [livePrice])

  // ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect
      setDims({ w: Math.max(300, width), h: Math.max(240, Math.round(width * 0.40)) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const filteredStocks = stocks.filter(
    (s) =>
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()),
  )

  const isUp = change >= 0

  if (!selected) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted text-sm">
        Loading chart…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Top bar: stock selector + stats */}
      <div className="flex flex-wrap items-start gap-4">
        {/* Selector */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((p) => !p)}
            className="flex items-center gap-2 px-3 py-2 bg-background-tertiary hover:bg-background-hover border border-border rounded-xl text-sm font-medium text-text-primary transition-colors min-w-[140px]"
          >
            <span className="font-mono font-bold">{selected.symbol}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 text-text-muted transition-transform', dropdownOpen && 'rotate-180')} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-background-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="p-2 border-b border-border">
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search symbol or name…"
                  className="w-full px-2 py-1.5 bg-background-tertiary rounded-lg text-xs text-text-primary placeholder-text-disabled border border-border/50 focus:outline-none focus:border-brand/60"
                />
              </div>
              <div className="max-h-52 overflow-y-auto">
                {filteredStocks.slice(0, 50).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelected(s)
                      setDropdownOpen(false)
                      setSearch('')
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 hover:bg-background-hover text-sm transition-colors',
                      s.id === selected.id && 'bg-brand/10',
                    )}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-mono font-semibold text-text-primary">{s.symbol}</span>
                      <span className="text-[10px] text-text-muted truncate max-w-[130px]">{s.name}</span>
                    </div>
                    <span className={cn('text-xs font-mono', s.changePercent >= 0 ? 'text-profit' : 'text-loss')}>
                      {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Price + stats */}
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <div className="font-mono text-2xl font-black text-text-primary">{formatPrice(livePrice)}</div>
            <div className={cn('flex items-center gap-1 text-sm font-medium', isUp ? 'text-profit' : 'text-loss')}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isUp ? '+' : ''}{formatPrice(Math.abs(change))} ({isUp ? '+' : ''}{changePercent.toFixed(2)}%)
            </div>
          </div>

          <div className="hidden sm:flex gap-4 text-xs">
            {[
              { label: 'Open', value: formatPrice(selected.open) },
              { label: 'High', value: formatPrice(selected.dayHigh) },
              { label: 'Low', value: formatPrice(selected.dayLow) },
              { label: 'Prev', value: formatPrice(selected.previousClose) },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-text-disabled">{s.label}</div>
                <div className="font-mono text-text-secondary">{s.value}</div>
              </div>
            ))}
          </div>

          <button
            onClick={rebuildCandles}
            className="p-1.5 rounded-lg hover:bg-background-hover text-text-muted hover:text-text-primary transition-colors"
            title="Refresh chart"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="w-full bg-background-tertiary rounded-xl overflow-hidden border border-border/50"
        onClick={() => dropdownOpen && setDropdownOpen(false)}
      >
        {candles.length > 0 ? (
          <CandleSVG
            candles={candles}
            previousClose={selected.previousClose}
            livePrice={livePrice}
            w={dims.w}
            h={dims.h}
          />
        ) : (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">
            Building chart…
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-text-disabled">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#26a69a] inline-block" /> Bull (close ≥ open)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#ef5350] inline-block" /> Bear (close &lt; open)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 border-t border-dashed border-[#888]" /> Prev close
        </span>
      </div>
    </div>
  )
}
