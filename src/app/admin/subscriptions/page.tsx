'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

interface Subscription {
  id: string
  userId: string
  userEmail?: string
  status: 'active' | 'pending' | 'expired' | 'blocked'
  startDate: string
  endDate: string
  amount: number
  paymentTxHash: string
  createdAt: string
}

interface User {
  id: string
  email: string
}

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'expired' | 'blocked'>('all')
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [blockModalOpen, setBlockModalOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch users first for email mapping
      const usersResponse = await fetch('/api/admin/users', {
        credentials: 'include'
      })
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsers(usersData.data || [])
      }

      // Fetch subscriptions
      const subscriptionsResponse = await fetch('/api/admin/subscriptions', {
        credentials: 'include'
      })
      
      if (subscriptionsResponse.ok) {
        const subscriptionsData = await subscriptionsResponse.json()
        setSubscriptions(subscriptionsData.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproveSubscription = async () => {
    if (!selectedSubscription) return

    try {
      const response = await fetch(`/api/admin/subscriptions/${selectedSubscription.id}/approve`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        await fetchData()
        setApproveModalOpen(false)
        setSelectedSubscription(null)
      }
    } catch (error) {
      console.error('Failed to approve subscription:', error)
    }
  }

  const handleBlockSubscription = async () => {
    if (!selectedSubscription) return

    try {
      const response = await fetch(`/api/admin/subscriptions/${selectedSubscription.id}/block`, {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        await fetchData()
        setBlockModalOpen(false)
        setSelectedSubscription(null)
      }
    } catch (error) {
      console.error('Failed to block subscription:', error)
    }
  }

  const getUserEmail = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user?.email || 'Unknown User'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'expired': return 'bg-gray-100 text-gray-800'
      case 'blocked': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredSubscriptions = subscriptions.filter(sub => 
    filter === 'all' || sub.status === filter
  )

  const statusCounts = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    pending: subscriptions.filter(s => s.status === 'pending').length,
    expired: subscriptions.filter(s => s.status === 'expired').length,
    blocked: subscriptions.filter(s => s.status === 'blocked').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage user subscriptions and payment approvals
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={fetchData}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{statusCounts.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{statusCounts.active}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{statusCounts.expired}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Expired</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{statusCounts.blocked}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Blocked</div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {['all', 'active', 'pending', 'expired', 'blocked'].map((status) => (
              <Button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-4 py-2 text-sm ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                {status !== 'all' && ` (${statusCounts[status as keyof typeof statusCounts]})`}
              </Button>
            ))}
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredSubscriptions.length} of {subscriptions.length} subscriptions
          </div>
        </div>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader
          title="Subscriptions"
          description="All subscription records with management actions"
        />
        
        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex space-x-4">
                  <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="w-20 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {getUserEmail(subscription.userId)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {subscription.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ${subscription.amount} USDT
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusColor(subscription.status)}>
                        {subscription.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div>
                        <div>From: {new Date(subscription.startDate).toLocaleDateString()}</div>
                        <div>To: {new Date(subscription.endDate).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={`https://tronscan.org/#/transaction/${subscription.paymentTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {subscription.paymentTxHash.slice(0, 8)}...
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {subscription.status === 'pending' && (
                        <Button
                          onClick={() => {
                            setSelectedSubscription(subscription)
                            setApproveModalOpen(true)
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs"
                        >
                          Approve
                        </Button>
                      )}
                      {subscription.status === 'active' && (
                        <Button
                          onClick={() => {
                            setSelectedSubscription(subscription)
                            setBlockModalOpen(true)
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs"
                        >
                          Block
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {!loading && filteredSubscriptions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <span className="text-4xl mb-4 block">💳</span>
            <p>No subscriptions found for the selected filter.</p>
          </div>
        )}
      </Card>

      {/* Approve Subscription Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Approve Subscription"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to approve this subscription for <strong>{selectedSubscription && getUserEmail(selectedSubscription.userId)}</strong>?
          </p>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="text-sm space-y-1">
              <div><strong>Amount:</strong> ${selectedSubscription?.amount} USDT</div>
              <div><strong>Duration:</strong> {selectedSubscription && new Date(selectedSubscription.startDate).toLocaleDateString()} - {selectedSubscription && new Date(selectedSubscription.endDate).toLocaleDateString()}</div>
              <div><strong>Transaction:</strong> {selectedSubscription?.paymentTxHash}</div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => setApproveModalOpen(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproveSubscription}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Approve Subscription
            </Button>
          </div>
        </div>
      </Modal>

      {/* Block Subscription Modal */}
      <Modal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title="Block Subscription"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to block this subscription for <strong>{selectedSubscription && getUserEmail(selectedSubscription.userId)}</strong>?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            This will immediately disable their access to ATH notifications.
          </p>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => setBlockModalOpen(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBlockSubscription}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Block Subscription
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}