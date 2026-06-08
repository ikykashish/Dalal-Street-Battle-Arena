import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Dalal Street Battle Arena',
  description: 'Virtual stock market trading competition. Build your portfolio, beat the market, dominate the leaderboard.',
  keywords: ['stock market', 'trading', 'NSE', 'virtual trading', 'portfolio', 'India'],
  themeColor: '#0d0d0d',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background-primary text-text-primary min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
