'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'

interface User {
  id: string
  email: string
  role: 'user' | 'admin'
  isActive: boolean
  createdAt: string
  lastLogin: string
  notificationsEnabled: boolean
  // Enhanced subscription information
  hasSubscription: boolean
  isSubscribed: boolean
  subscriptionStatus: string
  subscriptionEndDate: string | null
  daysRemaining: number
  subscriptionAmount: number | null
}

interface UserEditData {
  email: string
  role: 'user' | 'admin'
  isActive: boolean
  notificationsEnabled: boolean
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [editData, setEditData] = useState<UserEditData>({
    email: '',
    role: 'user',
    isActive: true,
    notificationsEnabled: true
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setEditData({
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      notificationsEnabled: user.notificationsEnabled
    })
    setEditModalOpen(true)
  }

  const handleSaveUser = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editData)
      })

      if (response.ok) {
        await fetchUsers()
        setEditModalOpen(false)
        setSelectedUser(null)
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        await fetchUsers()
        setDeleteModalOpen(false)
        setSelectedUser(null)
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleColor = (role: string) => {
    return role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const getSubscriptionStatusDisplay = (user: User) => {
    if (user.role === 'admin') {
      return { text: 'N/A', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' }
    }
    
    if (!user.hasSubscription) {
      return { text: 'No', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
    }
    
    switch (user.subscriptionStatus) {
      case 'active':
        return { text: `Yes (${user.daysRemaining}d)`, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' }
      case 'pending':
        return { text: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' }
      case 'expired':
        return { text: 'Expired', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
      case 'blocked':
        return { text: 'Blocked', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
      default:
        return { text: 'No', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={fetchUsers}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search users by email or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filteredUsers.length} of {users.length} users
            </div>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader
          title="All Users"
          description="Complete list of registered users"
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
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Subscribed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Notifications
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.email}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {user.id.slice(0, 8)}...
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getRoleColor(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusColor(user.isActive)}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.lastLogin).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const subscriptionDisplay = getSubscriptionStatusDisplay(user)
                        return (
                          <Badge className={subscriptionDisplay.color}>
                            {subscriptionDisplay.text}
                          </Badge>
                        )
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {user.notificationsEnabled ? '✅ Enabled' : '❌ Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Button
                        onClick={() => handleEditUser(user)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedUser(user)
                          setDeleteModalOpen(true)
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-xs"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {!loading && filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <span className="text-4xl mb-4 block">👥</span>
            <p>No users found matching your search.</p>
          </div>
        )}
      </Card>

      {/* Edit User Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit User"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <Input
              value={editData.email}
              onChange={(e) => setEditData({ ...editData, email: e.target.value })}
              placeholder="user@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role
            </label>
            <select
              value={editData.role}
              onChange={(e) => setEditData({ ...editData, role: e.target.value as 'user' | 'admin' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-center space-x-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={editData.isActive}
                onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={editData.notificationsEnabled}
                onChange={(e) => setEditData({ ...editData, notificationsEnabled: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Notifications</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => setEditModalOpen(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveUser}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete User"
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete user <strong>{selectedUser?.email}</strong>?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            This action cannot be undone and will permanently delete all user data including subscriptions.
          </p>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={() => setDeleteModalOpen(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}