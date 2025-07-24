'use client'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DateUtils } from '@/lib/utils'

interface PendingSubscription {
  id: string
  amount: number
  paymentTxHash: string
  startDate: string
  endDate: string
  status: 'pending'
}

interface PendingSubscriptionProps {
  subscription: PendingSubscription
  hasActiveSubscription?: boolean
  currentEndDate?: string
}

export function PendingSubscription({ subscription, hasActiveSubscription, currentEndDate }: PendingSubscriptionProps) {
  const openTronScan = () => {
    window.open(`https://tronscan.org/#/transaction/${subscription.paymentTxHash}`, '_blank')
  }

  const contactSupport = () => {
    window.open('/contact', '_blank')
  }

  const shortenTxHash = (hash: string) => {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`
  }

  const getSubscriptionDuration = () => {
    const startDate = new Date(subscription.startDate)
    const endDate = new Date(subscription.endDate)
    const durationMs = endDate.getTime() - startDate.getTime()
    const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24))
    
    if (durationDays >= 365) {
      return `${Math.round(durationDays / 365)} year(s)`
    } else if (durationDays >= 30) {
      return `${Math.round(durationDays / 30)} month(s)`
    } else {
      return `${durationDays} day(s)`
    }
  }

  return (
    <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-300 shadow-lg">
      <div className="p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 animate-bounce">⏳</div>
          <h2 className="text-2xl font-bold text-amber-800 mb-2">
            {hasActiveSubscription ? 'Subscription Extension Pending' : 'Subscription Pending Approval'}
          </h2>
          <Badge className="bg-amber-500 text-white px-4 py-1 text-sm font-bold">
            PENDING ADMIN REVIEW
          </Badge>
          {hasActiveSubscription && (
            <p className="text-amber-700 mt-2 font-medium">
              🔄 Will extend your current subscription by {getSubscriptionDuration()}
            </p>
          )}
        </div>

        {/* Pending Info */}
        <div className="bg-white rounded-xl p-6 mb-6 border border-amber-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">💰 Payment Amount</h3>
              <p className="text-2xl font-bold text-green-600">${subscription.amount} USDT</p>
              <p className="text-sm text-gray-500">Duration: {getSubscriptionDuration()}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">📅 Submitted</h3>
              <p className="text-gray-700">
                {DateUtils.formatDateTime(subscription.startDate)}
              </p>
              <p className="text-sm text-gray-500">
                {DateUtils.getRelativeTime(subscription.startDate)}
              </p>
            </div>
          </div>

          {hasActiveSubscription && currentEndDate && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">🔄 Extension Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-700">Current subscription ends:</p>
                  <p className="font-medium text-blue-900">
                    {DateUtils.formatDateTime(currentEndDate)}
                  </p>
                </div>
                <div>
                  <p className="text-blue-700">Will extend until:</p>
                  <p className="font-medium text-blue-900">
                    {DateUtils.formatDateTime(subscription.endDate)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="font-semibold text-gray-800 mb-2">🔗 Transaction Hash</h3>
            <div className="flex items-center gap-3">
              <code className="bg-gray-100 px-3 py-2 rounded text-sm font-mono text-gray-800 flex-1">
                {subscription.paymentTxHash}
              </code>
              <Button
                onClick={openTronScan}
                variant="secondary"
                size="sm"
                className="hover:bg-blue-100"
              >
                🔍 View on TronScan
              </Button>
            </div>
          </div>
        </div>

        {/* Action Required */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-200">
          <div className="flex items-start gap-4">
            <div className="text-3xl">📞</div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-800 mb-2">
                Next Steps Required
              </h3>
              <p className="text-blue-700 mb-4">
                Your payment has been submitted for manual review. To speed up the approval process, 
                please contact our support team with your payment screenshot.
              </p>
              
              <div className="space-y-2 text-sm text-blue-600">
                <p>✓ Payment received and recorded</p>
                <p>✓ Transaction hash validated</p>
                <p className="text-amber-600">⏳ Waiting for admin approval</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Support CTA */}
        <div className="text-center">
          <Button
            onClick={contactSupport}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold px-8 py-4 text-lg shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            📞 Contact Support for Approval
          </Button>
          <p className="text-sm text-gray-600 mt-3">
            Approval typically takes 2-24 hours • Include your payment screenshot
          </p>
        </div>

        {/* Help Info */}
        <div className="mt-8 pt-6 border-t border-amber-200">
          <h4 className="font-semibold text-amber-800 mb-3">💡 Helpful Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-amber-700">
            <div>
              <p className="font-medium mb-1">What we verify:</p>
              <ul className="space-y-1">
                <li>• Transaction exists on Tron network</li>
                <li>• Correct amount was sent</li>
                <li>• Payment went to our wallet</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">When contacting support:</p>
              <ul className="space-y-1">
                <li>• Include transaction hash: {shortenTxHash(subscription.paymentTxHash)}</li>
                <li>• Attach payment screenshot</li>
                <li>• Mention subscription amount: ${subscription.amount}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}