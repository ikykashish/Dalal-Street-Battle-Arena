# Trading Floor Battle Arena 🚀

A production-ready virtual stock market trading competition platform built with Next.js, TypeScript, PostgreSQL, and Socket.IO.

## Features

- 🏦 **Virtual Trading** — Start with ₹10,00,000 and trade 100 NSE stocks
- 📊 **Live Prices** — Real-time price simulation via Socket.IO
- 🏆 **Leaderboard** — Individual & team rankings
- 👥 **Teams** — Create/join teams with invite codes
- 📈 **Portfolio** — Holdings, P&L, sector allocation charts
- 👁️ **Watchlist** — Track stocks of interest
- 🌙 **Dark UI** — Zerodha/Kite-inspired design

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React, TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js (JWT) |
| Real-time | Socket.IO |
| Charts | Recharts |
| Icons | Lucide React |

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Clone & Install

```bash
git clone <repo>
cd dalal-street-battle-arena
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/dalal_street_db"
NEXTAUTH_SECRET="generate-a-random-32-char-string-here"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

Generate a secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Database Setup

```bash
# Create database, run migrations, and seed 100 stocks
npm run db:migrate
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Docker Deployment

The easiest way to deploy with Docker Compose:

```bash
# Copy and edit environment file
cp .env.example .env.production

# Build and start
docker-compose up -d

# View logs
docker-compose logs -f app
```

This starts:
- PostgreSQL on port 5432
- App on port 3000

---

## Production Deployment

### Option A: Railway / Render / Fly.io

1. Create a PostgreSQL database on your platform
2. Set environment variables:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET` (min 32 chars)
   - `NEXTAUTH_URL` (your production URL)
   - `NEXT_PUBLIC_SOCKET_URL` (your production URL)
3. Deploy the repo

### Option B: VPS (Ubuntu/Debian)

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Create database
sudo -u postgres createdb dalal_street_db
sudo -u postgres psql -c "CREATE USER appuser WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE dalal_street_db TO appuser;"

# Clone and install
git clone <repo>
cd dalal-street-battle-arena
npm install
cp .env.example .env
# Edit .env with your values

# Setup DB
npm run db:migrate
npm run db:seed

# Build
npm run build

# Start with PM2
npm install -g pm2
pm2 start "npm run start" --name "dsba"
pm2 save
pm2 startup
```

### Option C: Vercel + Neon/Supabase

> Note: Vercel does not support Socket.IO. Use Railway or a VPS for full real-time support.

---

## Database Commands

```bash
npm run db:generate    # Regenerate Prisma client
npm run db:push        # Push schema changes (no migration)
npm run db:migrate     # Create and run migration
npm run db:seed        # Seed 100 NSE stocks
npm run db:studio      # Open Prisma Studio (DB GUI)
npm run db:reset       # Reset and reseed database
```

---

## Project Structure

```
dalal-street-battle-arena/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Stock seed data
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login, signup pages
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   │   ├── dashboard/     # Main dashboard
│   │   │   ├── market/        # Stock market
│   │   │   ├── portfolio/     # Holdings & P&L
│   │   │   ├── leaderboard/   # Rankings
│   │   │   ├── teams/         # Team management
│   │   │   └── watchlist/     # Watchlist
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth + register
│   │   │   ├── stocks/        # Stock data
│   │   │   ├── trades/        # Buy/sell
│   │   │   ├── portfolio/     # Portfolio calculation
│   │   │   ├── teams/         # Team management
│   │   │   ├── watchlist/     # Watchlist CRUD
│   │   │   └── leaderboard/   # Rankings
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── layout/            # Sidebar, Navbar
│   │   ├── market/            # Stock table
│   │   ├── trading/           # Trade modal
│   │   ├── dashboard/         # Ticker, Activity feed
│   │   └── ...
│   ├── hooks/
│   │   ├── useSocket.ts       # Socket.IO hook
│   │   └── useStocks.ts       # Stock data + live updates
│   ├── lib/
│   │   ├── db.ts              # Prisma client
│   │   ├── auth.ts            # NextAuth config
│   │   ├── utils.ts           # Formatting utilities
│   │   └── stocks-data.ts     # 100 NSE stock definitions
│   └── types/index.ts         # TypeScript types
├── server.ts                  # Custom Next.js + Socket.IO server
├── Dockerfile
└── docker-compose.yml
```

---

## Game Rules

- Each user starts with **₹10,00,000** virtual capital
- Buy and sell any of 100 NSE-listed stocks
- Portfolio value = Cash + Market value of holdings
- Leaderboard ranks by total portfolio value
- Teams are ranked by average portfolio value per member

---

## License

MIT — Build, modify, and deploy freely.
