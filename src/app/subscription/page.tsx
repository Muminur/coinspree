'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAnalytics } from '@/hooks/useAnalytics'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus'
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans'
import { PaymentHistory } from '@/components/subscription/PaymentHistory'
import { PendingSubscription } from '@/components/subscription/PendingSubscription'
import Link from 'next/link'
import type { Subscription } from '@/types'

export default function SubscriptionPage() {
  const { user, loading } = useAuth()
  const { trackUserAction, trackFeatureUsage } = useAnalytics()
  const [pendingSubscription, setPendingSubscription] = useState<Subscription | null>(null)
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null)
  const [loadingPending, setLoadingPending] = useState(true)
  const [paymentHistoryRefresh, setPaymentHistoryRefresh] = useState(0)

  useEffect(() => {
    if (user) {
      // Track subscription page view with user context
      trackFeatureUsage('subscription_page_view', {
        userId: user.id,
        hasActiveSubscription: !!activeSubscription,
        hasPendingSubscription: !!pendingSubscription
      })
      
      fetchSubscriptionData()
    }
  }, [user, activeSubscription, pendingSubscription, trackFeatureUsage])

  const fetchSubscriptionData = async () => {
    try {
      const response = await fetch('/api/subscription/status', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Set active subscription if exists
        if (data.subscription && data.subscription.status === 'active') {
          setActiveSubscription(data.subscription)
        }
        
        // Also check for pending subscriptions
        const pendingResponse = await fetch('/api/subscription/history', {
          credentials: 'include'
        })
        
        if (pendingResponse.ok) {
          const historyData = await pendingResponse.json()
          const pending = historyData.payments?.find((p: Subscription) => p.status === 'pending')
          if (pending) {
            setPendingSubscription(pending)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error)
    } finally {
      setLoadingPending(false)
    }
  }

  const handlePaymentSubmitted = () => {
    // Track payment submission
    trackUserAction('subscription_payment_submitted', {
      userId: user?.id,
      hasActiveSubscription: !!activeSubscription,
      paymentMethod: 'USDT'
    })
    
    // Trigger payment history refresh by updating the refresh trigger
    setPaymentHistoryRefresh(prev => prev + 1)
    // Also refresh subscription data to show pending subscriptions
    fetchSubscriptionData()
  }

  if (loading) {
    return (
      <MainLayout showSidebar>
        <div className="space-y-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!user) {
    return (
      <MainLayout showSidebar>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to manage your subscription
          </p>
          <Link href="/login" className="btn-primary px-6 py-3">
            Sign In
          </Link>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout showSidebar>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center lg:text-left">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
            Subscription Management
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your subscription and get real-time ATH notifications
          </p>
        </div>

        {/* Pending Subscription Alert */}
        {!loadingPending && pendingSubscription && (
          <PendingSubscription 
            subscription={pendingSubscription} 
            hasActiveSubscription={activeSubscription !== null}
            currentEndDate={activeSubscription?.endDate}
          />
        )}

        {/* Current Subscription Status */}
        <Card>
          <CardHeader
            title="🎯 Current Subscription"
            description="Your active subscription details and status"
          />
          <SubscriptionStatus />
        </Card>

        {/* Subscription Plans */}
        <Card>
          <CardHeader
            title="💳 Subscription Plans"
            description="Choose the plan that best fits your crypto trading needs"
          />
          <SubscriptionPlans onPaymentSubmitted={handlePaymentSubmitted} />
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader
            title="📊 Payment History"
            description="View your past payments and transaction records"
          />
          <PaymentHistory refreshTrigger={paymentHistoryRefresh} />
        </Card>
      </div>
    </MainLayout>
  )
}