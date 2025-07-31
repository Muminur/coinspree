import { Auth } from '@/lib/auth'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { CryptoTableTop101to200 } from '@/components/crypto/CryptoTableTop101to200'

export default async function Top101to200Page() {
  const session = await Auth.requireAuth()

  return (
    <MainLayout showSidebar>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Top 101-200 Cryptocurrencies</h1>
          <p className="text-muted-foreground">
            Real-time data for cryptocurrencies ranked 101-200 by market cap
          </p>
        </div>

        <Card>
          <CardHeader
            title="Live Market Data - Second Tier"
            description="Updated every 5 minutes from CoinGecko API"
          />
          <CryptoTableTop101to200 limit={100} showSearch={true} showFilters={true} />
        </Card>
      </div>
    </MainLayout>
  )
}