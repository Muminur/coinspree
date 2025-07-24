import Link from 'next/link'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, StatsCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function HomePage() {
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="text-center py-20 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <Badge variant="info" size="lg">
              🚀 Real-time Crypto ATH Notifications
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
              Never Miss Another
              <br />
              All-Time High
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Get instant notifications when your favorite cryptocurrencies hit new all-time highs. 
              Stay ahead in the bull market with professional-grade alerts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register" className="btn-primary px-6 py-3 text-lg">
              🚀 Start Free Trial
            </Link>
            <Link href="/login" className="btn-secondary px-6 py-3 text-lg">
              📊 View Dashboard
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            ✅ 7-day free trial • ✅ No credit card required • ✅ Cancel anytime
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatsCard
              title="Cryptocurrencies Tracked"
              value="100+"
              icon="🏆"
            />
            <StatsCard
              title="ATH Detection Accuracy"
              value="100%"
              icon="🎯"
            />
            <StatsCard
              title="Average Response Time"
              value="< 30s"
              icon="⚡"
            />
            <StatsCard
              title="Active Users"
              value="1,000+"
              icon="👥"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose CoinSpree?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Professional crypto traders trust our platform for accurate, real-time ATH notifications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <div className="text-center space-y-4">
                <div className="text-4xl">🔔</div>
                <h3 className="text-xl font-bold">Instant Notifications</h3>
                <p className="text-muted-foreground">
                  Get email alerts the moment any of the top 100 cryptocurrencies hits a new all-time high.
                </p>
              </div>
            </Card>

            <Card>
              <div className="text-center space-y-4">
                <div className="text-4xl">📊</div>
                <h3 className="text-xl font-bold">Real-time Data</h3>
                <p className="text-muted-foreground">
                  Powered by CoinGecko API with 5-minute updates and 99.9% uptime guarantee.
                </p>
              </div>
            </Card>

            <Card>
              <div className="text-center space-y-4">
                <div className="text-4xl">💳</div>
                <h3 className="text-xl font-bold">Simple Pricing</h3>
                <p className="text-muted-foreground">
                  Pay with USDT on Tron network. $50/month for unlimited notifications.
                </p>
              </div>
            </Card>

            <Card>
              <div className="text-center space-y-4">
                <div className="text-4xl">🎯</div>
                <h3 className="text-xl font-bold">100% Accuracy</h3>
                <p className="text-muted-foreground">
                  Zero false positives. Our algorithm ensures you only get notified for genuine ATHs.
                </p>
              </div>
            </Card>

            <Card>
              <div className="text-center space-y-4">
                <div className="text-4xl">📈</div>
                <h3 className="text-xl font-bold">ATH History</h3>
                <p className="text-muted-foreground">
                  Access complete historical data of all ATHs with timestamps and percentage gains.
                </p>
              </div>
            </Card>

            <Card>
              <div className="text-center space-y-4">
                <div className="text-4xl">👑</div>
                <h3 className="text-xl font-bold">Admin Dashboard</h3>
                <p className="text-muted-foreground">
                  Advanced admin controls for user management and system monitoring.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Never Miss an ATH Again?
          </h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of crypto traders who trust CoinSpree for their market timing.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="btn-primary px-6 py-3 text-lg">
              🚀 Start Your Free Trial
            </Link>
            <Link href="/subscription" className="btn-secondary px-6 py-3 text-lg">
              💰 View Pricing
            </Link>
          </div>

          <div className="pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Have questions? <Link href="/contact" className="text-primary hover:underline">Contact our support team</Link>
            </p>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}
