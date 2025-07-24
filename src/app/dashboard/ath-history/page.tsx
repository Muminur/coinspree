import { Auth } from '@/lib/auth'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { ATHHistoryTable } from '@/components/crypto/ATHHistoryTable'

export default async function ATHHistoryPage() {
  const session = await Auth.requireAuth()

  return (
    <MainLayout showSidebar>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">ATH History</h1>
          <p className="text-muted-foreground">
            Historical all-time high records for tracked cryptocurrencies
          </p>
        </div>

        <Card>
          <CardHeader
            title="Recent ATH Records"
            description="All-time highs detected by our monitoring system"
          />
          <ATHHistoryTable />
        </Card>
      </div>
    </MainLayout>
  )
}