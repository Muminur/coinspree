'use client'

import { useState, useEffect } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell, LoadingTableState, EmptyTableState } from '@/components/ui/Table'
import { StatusBadge, Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DateUtils } from '@/lib/utils'

interface Payment {
  id: string
  amount: number
  paymentTxHash: string
  status: 'pending' | 'active' | 'expired' | 'blocked'
  startDate: string
  endDate: string
  createdAt?: string
}

interface PaymentHistoryProps {
  refreshTrigger?: number
}

export function PaymentHistory({ refreshTrigger }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPaymentHistory()
  }, [])

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('🔄 Refreshing payment history due to new payment submission')
      fetchPaymentHistory()
    }
  }, [refreshTrigger])

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/subscription/history', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments || data.data || [])
      } else if (response.status === 404) {
        setPayments([])
      } else {
        throw new Error('Failed to fetch payment history')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment history')
    } finally {
      setLoading(false)
    }
  }

  const openTronScan = (txHash: string) => {
    window.open(`https://tronscan.org/#/transaction/${txHash}`, '_blank')
  }

  const shortenTxHash = (hash: string) => {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`
  }

  const isRecentPayment = (payment: Payment) => {
    const paymentDate = new Date(payment.createdAt || payment.startDate)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    return paymentDate > fiveMinutesAgo
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">❌</div>
        <p className="text-red-600 font-medium">{error}</p>
        <Button onClick={fetchPaymentHistory} className="mt-4" size="sm">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Your subscription payment history and transaction records
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchPaymentHistory}
          disabled={loading}
        >
          🔄 Refresh
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Date</TableHeaderCell>
            <TableHeaderCell>Amount</TableHeaderCell>
            <TableHeaderCell>Transaction</TableHeaderCell>
            <TableHeaderCell>Period</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <LoadingTableState rows={3} columns={5} />
          ) : payments.length === 0 ? (
            <EmptyTableState
              message="No payment history"
              description="You haven't made any subscription payments yet"
            />
          ) : (
            payments.map((payment) => {
              const isNew = isRecentPayment(payment)
              return (
                <TableRow 
                  key={payment.id}
                  className={isNew ? 'bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-400' : ''}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium">
                          {DateUtils.formatDate(payment.createdAt || payment.startDate)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {DateUtils.formatDateTime(payment.createdAt || payment.startDate)}
                        </p>
                      </div>
                      {isNew && (
                        <Badge variant="success" size="sm">
                          🆕 New
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      ${payment.amount} USDT
                    </span>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="space-y-1">
                    <button
                      onClick={() => openTronScan(payment.paymentTxHash)}
                      className="font-mono text-sm text-primary hover:underline"
                      title={payment.paymentTxHash}
                    >
                      {shortenTxHash(payment.paymentTxHash)}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      Click to view on TronScan
                    </p>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="text-sm">
                    <p>
                      {DateUtils.formatDate(payment.startDate)} -{' '}
                      {DateUtils.formatDate(payment.endDate)}
                    </p>
                  </div>
                </TableCell>
                
                <TableCell>
                  <StatusBadge status={payment.status} />
                </TableCell>
              </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      {!loading && payments.length > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground pt-4">
          <span>
            Total payments: {payments.length}
          </span>
          <span>
            Total spent: ${payments.reduce((sum, p) => sum + p.amount, 0)} USDT
          </span>
        </div>
      )}
    </div>
  )
}