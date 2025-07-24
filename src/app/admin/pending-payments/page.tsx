'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface PendingPayment {
  id: string
  userId: string
  user: {
    id: string
    email: string
    name: string
    role: string
  }
  amount: number
  paymentTxHash: string | null
  startDate: string
  endDate: string
  status: string
  createdAt: string
  tronScanUrl: string | null
}

export default function PendingPaymentsPage() {
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  // Fetch pending payments
  const fetchPendingPayments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/pending-payments', {
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setPendingPayments(result.data)
        setError(null)
      } else {
        setError(result.error || 'Failed to fetch pending payments')
      }
    } catch (error) {
      console.error('Failed to fetch pending payments:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Handle payment action (approve/reject)
  const handlePaymentAction = async (
    subscriptionId: string,
    action: 'approve' | 'reject',
    reason?: string
  ) => {
    if (processingIds.has(subscriptionId)) return

    setProcessingIds(prev => new Set(prev).add(subscriptionId))

    try {
      const response = await fetch('/api/admin/pending-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subscriptionId,
          action,
          reason,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        // Remove the processed payment from the list
        setPendingPayments(prev => 
          prev.filter(payment => payment.id !== subscriptionId)
        )
        
        // Show success message
        alert(`Payment ${action}d successfully!`)
      } else {
        alert(`Failed to ${action} payment: ${result.error}`)
      }
    } catch (error) {
      console.error(`Failed to ${action} payment:`, error)
      alert(`Failed to ${action} payment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(subscriptionId)
        return newSet
      })
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // Format amount
  const formatAmount = (amount: number) => {
    return `$${amount} USDT`
  }

  useEffect(() => {
    fetchPendingPayments()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading pending payments...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            💳 Pending Payments Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Review and approve/reject pending subscription payments
          </p>
        </div>
        <Button
          onClick={fetchPendingPayments}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          🔄 Refresh
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <span className="text-red-500 text-xl">❌</span>
              <div>
                <p className="text-red-700 dark:text-red-300 font-medium">Error</p>
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {pendingPayments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Pending Payments
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  All payments have been processed. Great job!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                📋 {pendingPayments.length} Pending Payment{pendingPayments.length !== 1 ? 's' : ''}
              </h2>
            </div>

            {pendingPayments.map((payment) => (
              <Card key={payment.id} className="border-amber-200 dark:border-amber-800">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      💰 Payment from {payment.user.name}
                    </CardTitle>
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      {payment.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* User & Payment Details */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 border-b pb-2">
                        👤 User & Payment Details
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">User Name:</span>
                          <span className="font-medium">{payment.user.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Email:</span>
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {payment.user.email}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {formatAmount(payment.amount)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Submitted:</span>
                          <span className="font-medium">{formatDate(payment.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">User Role:</span>
                          <Badge className={
                            payment.user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }>
                            {payment.user.role}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Subscription Details */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 border-b pb-2">
                        📅 Subscription Details
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                          <span className="font-medium">{formatDate(payment.startDate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                          <span className="font-medium">{formatDate(payment.endDate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                          <span className="font-medium">
                            {Math.ceil(
                              (new Date(payment.endDate).getTime() - new Date(payment.startDate).getTime()) 
                              / (1000 * 60 * 60 * 24)
                            )} days
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Hash */}
                  {payment.paymentTxHash && (
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                        🔗 Transaction Details
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                          {payment.paymentTxHash}
                        </span>
                        {payment.tronScanUrl && (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="ml-4"
                          >
                            <a
                              href={payment.tronScanUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2"
                            >
                              <span>🔍</span>
                              <span>View on TronScan</span>
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex items-center justify-end space-x-4">
                    <Button
                      onClick={() => handlePaymentAction(payment.id, 'reject')}
                      disabled={processingIds.has(payment.id)}
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {processingIds.has(payment.id) ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <>❌ Reject Payment</>
                      )}
                    </Button>
                    <Button
                      onClick={() => handlePaymentAction(payment.id, 'approve')}
                      disabled={processingIds.has(payment.id)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {processingIds.has(payment.id) ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <>✅ Approve Payment</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}