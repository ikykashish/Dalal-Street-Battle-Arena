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
    const tick = () => {
      const newPrice = simulatePrice(symbol, prevRef.current, previousClose)
      const dir = newPrice > prevRef.current ? 'up' : newPrice < prevRef.current ? 'down' : null
      if (dir) {
        setFlash(dir)
        setTimeout(() => setFlash(null), 800)
      }
      prevRef.current = newPrice
      setPrice(newPrice)
      setChange(newPrice - previousClose)
      setChangePercent(((newPrice - previousClose) / previousClose) * 100)
    }

    tick() // run immediately
    const interval = setInterval(tick, 4000)
    return () => clearInterval(interval)
  }, [symbol, previousClose])

  return { price, change, changePercent, flash }
}
