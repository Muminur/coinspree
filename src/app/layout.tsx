import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/contexts/ThemeContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CoinSpree - Cryptocurrency All-Time High Notifications',
  description: 'Real-time ATH notifications for the top 100 cryptocurrencies',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.className} h-full bg-background text-foreground`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
