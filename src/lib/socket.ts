'use client'

/**
 * Socket.IO is not used in the Netlify deployment.
 * Real-time price updates are handled by client-side deterministic simulation.
 * This file is kept as a stub so any legacy imports don't break the build.
 */

export function getSocket() {
  return null
}

export function disconnectSocket() {
  // no-op
}
