'use client'

import { useCallback } from 'react'

/**
 * Socket.IO is not used in the Netlify deployment.
 * This is a safe no-op stub so no components break.
 * Real-time updates are handled by client-side price simulation.
 */
export function useSocket() {
  const on = useCallback(<T>(_event: string, _handler: (data: T) => void) => {
    return () => {} // no-op cleanup
  }, [])

  const emit = useCallback((_event: string, _data?: unknown) => {}, [])

  return { socket: null, connected: true, on, emit }
}
