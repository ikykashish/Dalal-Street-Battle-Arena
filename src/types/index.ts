export interface Stock {
  id: string
  symbol: string
  name: string
  sector: string
  currentPrice: number
  /** Stable reference price (DB value) used by the live-price simulator. */
  basePrice?: number
  previousClose: number
  open: number
  dayHigh: number
  dayLow: number
  high52Week: number
  low52Week: number
  volume: number | bigint
  marketCap: number
  change: number
  changePercent: number
  updatedAt: string | Date
}

export interface Holding {
  id: string
  quantity: number
  avgPrice: number
  stock: Stock
  currentValue: number
  investedValue: number
  pnl: number
  pnlPercent: number
  dayChange: number
  dayChangePercent: number
}

export interface Trade {
  id: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  total: number
  createdAt: string | Date
  stock: {
    symbol: string
    name: string
    currentPrice: number
  }
  user?: {
    name: string
  }
}

export interface User {
  id: string
  email: string
  name: string
  cashBalance: number
  teamId?: string | null
  team?: Team | null
  createdAt: string | Date
}

export interface Team {
  id: string
  name: string
  code: string
  description?: string | null
  creatorId: string
  members: User[]
  createdAt: string | Date
  totalValue?: number
  rank?: number
}

export interface Portfolio {
  cashBalance: number
  holdings: Holding[]
  totalInvested: number
  currentValue: number
  totalValue: number
  totalPnL: number
  totalPnLPercent: number
  dayPnL: number
  dayPnLPercent: number
  initialCapital: number
}

export interface LeaderboardEntry {
  rank: number
  userId?: string
  teamId?: string
  name: string
  totalValue: number
  pnl: number
  pnlPercent: number
  memberCount?: number
  change24h?: number
}

export interface SocketPriceUpdate {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
}

export interface TradePayload {
  stockId: string
  type: 'BUY' | 'SELL'
  quantity: number
}

export interface WatchlistItem {
  id: string
  stock: Stock
  addedAt: string | Date
}

// ---- Admin Control Center ----
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED'

export interface AdminUserRow {
  id: string
  name: string
  email: string
  teamName: string | null
  status: UserStatus
  cashBalance: number
  portfolioValue: number
  totalValue: number
  totalPnL: number
  totalPnLPercent: number
  stocksBought: number
  stocksSold: number
  totalTrades: number
  lastTradeAt: string | null
  createdAt: string
}

export interface AdminTrade {
  id: string
  type: 'BUY' | 'SELL'
  stockSymbol: string
  stockName: string
  quantity: number
  price: number
  total: number
  pnl: number | null
  createdAt: string
}

export interface AdminPenalty {
  id: string
  amount: number
  reason: string
  adminEmail: string
  createdAt: string
}

export interface AdminLogEntry {
  id: string
  action: string
  targetUserId: string | null
  targetName: string | null
  targetEmail: string | null
  adminEmail: string
  details: string | null
  createdAt: string
}
