'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { applySimulation, simulatePrice } from '@/lib/price-simulator'
import type { Stock } from '@/types'

/** Fetches stocks once then simulates live prices client-side every 4 seconds */
export function useStocks() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const baseStocksRef = useRef<Stock[]>([])

  const fetchStocks = useCallback(async (params?: Record<string, string>) => {
    try {
      const qs = new URLSearchParams(params || {}).toString()
      const res = await fetch(`/api/stocks${qs ? `?${qs}` : ''}`)
      const data = await res.json()
      if (data.stocks) {
        baseStocksRef.current = data.stocks
        setStocks(applySimulation(data.stocks))
      }
    } catch {
      setError('Failed to load stocks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStocks()
  }, [fetchStocks])

  // Simulate live prices every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setStocks((prev) => {
        if (prev.length === 0) return prev
        return applySimulation(prev)
      })
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return { stocks, loading, error, refetch: fetchStocks }
}

/** Hook for a single stock's live simulated price */
export function useLivePrice(symbol: string, initialPrice: number, previousClose: number = initialPrice) {
  const [price, setPrice] = useState(initialPrice)
  const [change, setChange] = useState(0)
  const [changePercent, setChangePercent] = useState(0)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  const prevRef = useRef(initialPrice)

  useEffect(() => {
    // Don't simulate until we have a valid symbol and a real price.
    // (Prevents NaN when called with placeholder 0/'' before data loads.)
    if (!symbol || !Number.isFinite(initialPrice) || initialPrice <= 0) return

    const base =
      Number.isFinite(previousClose) && previousClose > 0 ? previousClose : initialPrice

    // Reset the baseline whenever the stock (symbol or price) changes,
    // so switching stocks shows the new price immediately instead of a stale one.
    prevRef.current = initialPrice
    setPrice(initialPrice)
    setChange(initialPrice - base)
    setChangePercent(((initialPrice - base) / base) * 100)

    const tick = () => {
      const newPrice = simulatePrice(symbol, prevRef.current, base)
      if (!Number.isFinite(newPrice) || newPrice <= 0) return // never propagate NaN
      const dir = newPrice > prevRef.current ? 'up' : newPrice < prevRef.current ? 'down' : null
      if (dir) {
        setFlash(dir)
        setTimeout(() => setFlash(null), 800)
      }
      prevRef.current = newPrice
      setPrice(newPrice)
      setChange(newPrice - base)
      setChangePercent(((newPrice - base) / base) * 100)
    }

    const interval = setInterval(tick, 4000)
    return () => clearInterval(interval)
  }, [symbol, initialPrice, previousClose])

  return { price, change, changePercent, flash }
}
