import { Auth } from '@/lib/auth'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { CryptoTable } from '@/components/crypto/CryptoTable'

export default async function Top100Page() {
  const session = await Auth.requireAuth()

  return (
    <MainLayout showSidebar>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Top 100 Cryptocurrencies</h1>
          <p className="text-muted-foreground">
            Real-time data for the top 100 cryptocurrencies by market cap
          </p>
        </div>

        <Card>
          <CardHeader
            title="Live Market Data"
            description="Updated every 5 minutes from CoinGecko API"
          />
          <CryptoTable limit={100} showSearch={true} showFilters={true} />
        </Card>
      </div>
    </MainLayout>
  )
}