'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { TrendingUp, TrendingDown, ChevronDown, RefreshCw } from 'lucide-react'
import { useLivePrice } from '@/hooks/useStocks'
import { formatPrice, formatPercent, formatCurrency, cn } from '@/lib/utils'
import type { Stock } from '@/types'

/* ─── deterministic helpers (mirrors price-simulator.ts) ─────────────────── */
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
  dbPrice: number,
  previousClose: number,
  numCandles = 40,
  ticksPerCandle = 15,   // 15 × 4 s = 60 s per candle
): OHLC[] {
  const currentBucket = Math.floor(Date.now() / 4000)
  const totalTicks = numCandles * ticksPerCandle
  const startBucket = currentBucket - totalTicks

  // Simulate every 4-s bucket from startBucket onward
  const ticks: number[] = []
  let price = previousClose
  for (let b = startBucket; b <= currentBucket; b++) {
    const seed = hashCode(`${symbol}:${b}`)
    const rand = seededRandom(seed)
    const dev = (price - previousClose) / previousClose
    price = Math.max(price * (1 + -dev * 0.08 + (rand - 0.5) * 0.009), previousClose * 0.75)
    price = Math.round(price * 100) / 100
    ticks.push(price)
  }

  const candles: OHLC[] = []
  for (let c = 0; c < numCandles; c++) {
    const slice = ticks.slice(c * ticksPerCandle, (c + 1) * ticksPerCandle)
    if (!slice.length) continue
    const tsMs = Date.now() - (numCandles - c) * ticksPerCandle * 4000
    const d = new Date(tsMs)
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    const open = slice[0]
    const close = slice[slice.length - 1]
    const high = Math.max(...slice)
    const low = Math.min(...slice)
    candles.push({ time, open, high, low, close, isGreen: close >= open })
  }

  // Pin last candle to DB price so chart ends where live price is
  if (candles.length) {
    const last = candles[candles.length - 1]
    last.close = dbPrice
    last.high = Math.max(last.high, dbPrice)
    last.low = Math.min(last.low, dbPrice)
    last.isGreen = last.close >= last.open
  }
  return candles
}

/* ─── SVG Candlestick chart ──────────────────────────────────────────────── */
const PAD = { top: 8, right: 62, bottom: 28, left: 4 }

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

  // Price domain with padding
  const prices = candles.flatMap((c) => [c.high, c.low])
  const rawMin = Math.min(...prices, previousClose, livePrice)
  const rawMax = Math.max(...prices, previousClose, livePrice)
  const span = rawMax - rawMin || 1
  const minP = rawMin - span * 0.06
  const maxP = rawMax + span * 0.06
  const range = maxP - minP

  const py = (p: number) => PAD.top + ((maxP - p) / range) * ch
  const step = cw / candles.length
  const bw = Math.max(2, step * 0.65)

  // Y grid lines
  const gridCount = 5
  const gridPrices = Array.from({ length: gridCount }, (_, i) =>
    minP + (range * i) / (gridCount - 1),
  )

  // X-axis labels (show ~6 evenly spaced)
  const labelStep = Math.ceil(candles.length / 6)
  const labelIndices = candles
    .map((_, i) => i)
    .filter((i) => i % labelStep === 0)

  return (
    <svg
      width={w}
      height={h}
      className="block"
      style={{ fontFamily: 'var(--font-mono, monospace)' }}
    >
      {/* Grid lines + Y labels */}
      {gridPrices.map((p) => {
        const yy = py(p)
        return (
          <g key={p}>
            <line
              x1={PAD.left}
              y1={yy}
              x2={w - PAD.right}
              y2={yy}
              stroke="#222"
              strokeWidth={1}
            />
            <text x={w - PAD.right + 5} y={yy + 4} fontSize={9.5} fill="#555">
              {p >= 100 ? p.toFixed(0) : p.toFixed(1)}
            </text>
          </g>
        )
      })}

      {/* Previous close dotted line */}
      <line
        x1={PAD.left}
        y1={py(previousClose)}
        x2={w - PAD.right}
        y2={py(previousClose)}
        stroke="#666"
        strokeWidth={1}
        strokeDasharray="5,4"
      />
      <text
        x={w - PAD.right + 5}
        y={py(previousClose) + 4}
        fontSize={9}
        fill="#888"
      >
        PC
      </text>

      {/* Candles */}
      {candles.map((c, i) => {
        const cx = PAD.left + i * step + step / 2
        const color = c.isGreen ? '#26a69a' : '#ef5350'
        const bodyTop = py(Math.max(c.open, c.close))
        const bodyH = Math.max(1, py(Math.min(c.open, c.close)) - bodyTop)
        return (
          <g key={i}>
            {/* Wick */}
            <line x1={cx} y1={py(c.high)} x2={cx} y2={py(c.low)} stroke={color} strokeWidth={1} />
            {/* Body */}
            <rect
              x={cx - bw / 2}
              y={bodyTop}
              width={bw}
              height={bodyH}
              fill={c.isGreen ? color : color}
              opacity={0.88}
            />
          </g>
        )
      })}

      {/* Live price line */}
      <line
        x1={PAD.left}
        y1={py(livePrice)}
        x2={w - PAD.right}
        y2={py(livePrice)}
        stroke={livePrice >= previousClose ? '#26a69a' : '#ef5350'}
        strokeWidth={1.5}
        strokeDasharray="2,3"
        opacity={0.7}
      />

      {/* X labels */}
      {labelIndices.map((i) => {
        const xpos = PAD.left + i * step + step / 2
        return (
          <text key={i} x={xpos} y={h - 6} fontSize={9} fill="#555" textAnchor="middle">
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
  const [dims, setDims] = useState({ w: 800, h: 320 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Pick initial stock
  useEffect(() => {
    if (!stocks.length) return
    const found = initialSymbol ? stocks.find((s) => s.symbol === initialSymbol) : null
    setSelected(found || stocks[0])
  }, [stocks, initialSymbol])

  // Live price for selected stock
  const { price: livePrice, change, changePercent } = useLivePrice(
    selected?.symbol ?? '',
    selected?.currentPrice ?? 0,
    selected?.previousClose ?? selected?.currentPrice ?? 0,
  )

  // Regenerate candles every 60 s (or when stock changes)
  const rebuildCandles = useCallback(() => {
    if (!selected) return
    setCandles(generateCandleHistory(selected.symbol, selected.currentPrice, selected.previousClose))
  }, [selected])

  useEffect(() => {
    rebuildCandles()
    const t = setInterval(rebuildCandles, 60_000)
    return () => clearInterval(t)
  }, [rebuildCandles])

  // Update last candle's close with live price every 4 s
  useEffect(() => {
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
      setDims({ w: Math.max(300, width), h: Math.max(220, Math.round(width * 0.38)) })
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
        <CandleSVG
          candles={candles}
          previousClose={selected.previousClose}
          livePrice={livePrice}
          w={dims.w}
          h={dims.h}
        />
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
          <span className="w-4 border-t border-dashed border-[#666]" /> Prev close
        </span>
      </div>
    </div>
  )
}
