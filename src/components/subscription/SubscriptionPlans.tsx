'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PaymentModal } from './PaymentModal'

interface SubscriptionConfig {
  priceUSDT: number
  durationDays: number
  tronWalletAddress: string
}

interface SubscriptionPlansProps {
  onPaymentSubmitted?: () => void
}

export function SubscriptionPlans({ onPaymentSubmitted }: SubscriptionPlansProps) {
  const [config, setConfig] = useState<SubscriptionConfig | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscriptionConfig()
  }, [])

  const fetchSubscriptionConfig = async () => {
    try {
      const response = await fetch('/api/subscription/config', {
        credentials: 'include'
      })
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          // Map API response to expected SubscriptionConfig format
          const mappedConfig: SubscriptionConfig = {
            priceUSDT: result.data.pricing.usdt,
            durationDays: result.data.duration.days,
            tronWalletAddress: result.data.payment.walletAddress
          }
          setConfig(mappedConfig)
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscription config:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const monthlyFeatures = [
    '🚀 Real-time ATH notifications',
    '📧 Instant email alerts',
    '🏆 Top 100 cryptocurrency coverage',
    '📊 Historical ATH data access',
    '⚡ 99.9% uptime guarantee',
    '🎯 100% detection accuracy',
    '📱 Mobile-optimized emails',
    '🔒 Secure payment processing'
  ]

  const yearlyFeatures = [
    ...monthlyFeatures,
    '💬 Priority customer support',
    '🔄 Cancel anytime',
    '📈 Advanced analytics dashboard',
    '⚡ Faster notification delivery'
  ]

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Plan',
      price: 3,
      originalPrice: null,
      duration: 30,
      period: 'month',
      savings: null,
      popular: false,
      features: monthlyFeatures,
      description: 'Perfect for trying out our service',
      badge: null,
      gradient: 'from-blue-500 to-blue-600',
      hoverGradient: 'from-blue-600 to-blue-700'
    },
    {
      id: 'yearly',
      name: 'Yearly Plan',
      price: 30,
      originalPrice: 36, // 3 * 12 = 36
      duration: 365,
      period: 'year',
      savings: 17, // ((36-30)/36)*100 = 16.67% rounded to 17%
      popular: true,
      features: yearlyFeatures,
      description: 'Best value with premium features',
      badge: '17% OFF',
      gradient: 'from-green-500 to-emerald-600',
      hoverGradient: 'from-green-600 to-emerald-700'
    }
  ]

  return (
    <div id="plans" className="space-y-8">
      {/* Header Section */}
      <div className="text-center">
        <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
          Choose Your Perfect Plan
        </h3>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Get real-time ATH notifications for the top 100 cryptocurrencies. 
          Never miss another all-time high with our reliable notification system.
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 border-2 ${
              plan.popular ? 'border-green-500 shadow-lg' : 'border-gray-200 hover:border-primary'
            }`}
          >
            {/* Popular Badge */}
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  🔥 MOST POPULAR
                </div>
              </div>
            )}

            {/* Savings Badge */}
            {plan.badge && (
              <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                {plan.badge}
              </div>
            )}

            <div className="p-8">
              {/* Plan Header */}
              <div className="text-center mb-6">
                <h4 className="text-2xl font-bold mb-2">{plan.name}</h4>
                <p className="text-muted-foreground">{plan.description}</p>
              </div>

              {/* Pricing */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                  {plan.originalPrice && (
                    <span className="text-lg text-muted-foreground line-through">
                      ${plan.originalPrice} USDT
                    </span>
                  )}
                </div>
                <div className="text-5xl font-bold mb-2 text-gray-900">
                  ${plan.price} <span className="text-lg text-muted-foreground font-normal">USDT</span>
                </div>
                <p className="text-muted-foreground">
                  per {plan.period}
                </p>
                {plan.savings && (
                  <div className="mt-3">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      Save {plan.savings}% compared to monthly
                    </span>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3 mb-8">
                <h5 className="font-semibold text-gray-900 mb-4">Everything included:</h5>
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => {
                  setSelectedPlan(plan)
                  setShowPaymentModal(true)
                }}
                className={`w-full text-white font-semibold py-4 rounded-lg transition-all duration-300 bg-gradient-to-r ${plan.gradient} hover:${plan.hoverGradient} shadow-lg hover:shadow-xl transform hover:-translate-y-1`}
                size="lg"
              >
                {plan.popular ? '🚀 Get Started - Most Popular' : '📈 Get Started'}
              </Button>

              {/* Additional Info */}
              <div className="text-center mt-4">
                <p className="text-xs text-muted-foreground">
                  Pay with USDT (TRC20) • Instant activation • Cancel anytime
                </p>
                {plan.popular && (
                  <p className="text-xs text-green-600 font-semibold mt-2">
                    ⭐ Recommended for serious crypto traders
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Payment Information */}
      <div className="max-w-2xl mx-auto">
        <Card className="bg-blue-50 border-blue-200">
          <div className="p-6">
            <h4 className="font-medium text-blue-900 mb-3">
              💳 Payment Information
            </h4>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• Payment is processed via USDT (TRC20) on the Tron network</p>
              <p>• Your subscription activates automatically after payment confirmation</p>
              <p>• Transactions typically confirm within 2-5 minutes</p>
              <p>• Keep your transaction hash for records</p>
            </div>
          </div>
        </Card>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h4 className="font-medium mb-4 text-center">Frequently Asked Questions</h4>
        <div className="space-y-4">
          <div className="border border-border rounded-lg p-4">
            <h5 className="font-medium mb-2">How quickly will I receive notifications?</h5>
            <p className="text-sm text-muted-foreground">
              Our system checks for new ATHs every 5 minutes. You'll receive email notifications within 30 seconds of detection.
            </p>
          </div>
          
          <div className="border border-border rounded-lg p-4">
            <h5 className="font-medium mb-2">Can I cancel my subscription?</h5>
            <p className="text-sm text-muted-foreground">
              Yes, you can cancel anytime. Your subscription will remain active until the end of the billing period.
            </p>
          </div>
          
          <div className="border border-border rounded-lg p-4">
            <h5 className="font-medium mb-2">What cryptocurrencies are covered?</h5>
            <p className="text-sm text-muted-foreground">
              We track the top 100 cryptocurrencies by market cap, updated from CoinGecko API in real-time.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && config && selectedPlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedPlan(null)
          }}
          config={{
            priceUSDT: selectedPlan.price,
            durationDays: selectedPlan.duration,
            tronWalletAddress: config.tronWalletAddress
          }}
          selectedPlan={selectedPlan}
          onPaymentSubmitted={onPaymentSubmitted}
        />
      )}
    </div>
  )
}