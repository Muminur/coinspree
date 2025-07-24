'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface TestNotificationProps {
  className?: string
}

export function TestNotification({ className }: TestNotificationProps) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const sendTestNotification = async () => {
    try {
      setSending(true)
      setError(null)
      setSuccess(null)

      console.log('🚀 Starting test notification request...')

      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include' // Include cookies for authentication
      })

      console.log('📡 Response status:', response.status, response.statusText)
      
      let result: any
      try {
        result = await response.json()
        console.log('📄 Response body:', result)
      } catch (jsonError) {
        console.error('❌ Failed to parse JSON response:', jsonError)
        throw new Error(`Server returned invalid response (${response.status})`)
      }

      if (!response.ok || !result.success) {
        // Handle different error formats with detailed logging
        console.log('🔍 Error details:', {
          responseOk: response.ok,
          resultSuccess: result.success,
          resultError: result.error,
          resultErrorType: typeof result.error,
          resultMessage: result.message
        })
        
        let errorMessage = 'Failed to send test notification'
        
        if (typeof result.error === 'string' && result.error.trim()) {
          errorMessage = result.error
        } else if (typeof result.message === 'string' && result.message.trim()) {
          errorMessage = result.message
        } else if (result.error && typeof result.error === 'object') {
          if (result.error.message && typeof result.error.message === 'string') {
            errorMessage = result.error.message
          } else {
            errorMessage = `Error object: ${JSON.stringify(result.error)}`
          }
        }
        
        // Add HTTP status context
        const statusText = response.status === 403 ? 'Access denied' :
                          response.status === 401 ? 'Authentication required' :
                          response.status >= 500 ? 'Server error' : 'Request failed'
        
        const finalErrorMessage = `${statusText}: ${errorMessage}`
        console.log('🎯 Final error message:', finalErrorMessage)
        
        throw new Error(finalErrorMessage)
      }

      const successMessage = `Test notification sent successfully to ${result.data?.email || 'your email'}`
      console.log('✅ Success:', successMessage)
      setSuccess(successMessage)

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      console.error('💥 Caught error in sendTestNotification:', err)
      console.log('🔍 Error type:', typeof err)
      console.log('🔍 Error constructor:', err?.constructor?.name)
      console.log('🔍 Error properties:', Object.keys(err || {}))
      
      let errorMessage = 'Failed to send test notification'
      
      if (err instanceof Error) {
        errorMessage = err.message || 'Unknown error occurred'
        console.log('📝 Using Error.message:', errorMessage)
      } else if (typeof err === 'string') {
        errorMessage = err
        console.log('📝 Using string error:', errorMessage)
      } else if (err && typeof err === 'object') {
        // Try multiple ways to extract a meaningful message
        const candidates = [
          (err as any).message,
          (err as any).error,
          (err as any).toString(),
          JSON.stringify(err)
        ].filter(candidate => 
          candidate && 
          typeof candidate === 'string' && 
          candidate.trim() && 
          candidate !== '[object Object]'
        )
        
        errorMessage = candidates[0] || 'Unknown error object'
        console.log('📝 Extracted from object:', errorMessage)
        console.log('📝 Available candidates:', candidates)
      }
      
      console.log('🎯 Setting error message:', errorMessage)
      setError(errorMessage)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`p-6 ${className}`}>
      {/* Header Section with Beautiful Gradient */}
      <div className="text-center mb-6">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
          <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-2xl shadow-xl">
            <div className="text-3xl mb-2">🚀</div>
            <h3 className="text-xl font-bold">Test Notifications</h3>
            <p className="text-blue-100 text-sm font-medium">Verify your email setup</p>
          </div>
        </div>
      </div>

      {/* Error Message with Enhanced Styling */}
      {error && (
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 border-2 border-red-200 shadow-lg transform animate-pulse">
          <div className="flex items-start gap-4">
            <div className="bg-red-500 text-white p-2 rounded-full shadow-md">
              <span className="text-lg">❌</span>
            </div>
            <div>
              <div className="text-red-800 font-semibold mb-1">Test Failed</div>
              <div className="text-red-700 text-sm leading-relaxed">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message with Enhanced Styling */}
      {success && (
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-2 border-green-200 shadow-lg transform animate-bounce">
          <div className="flex items-start gap-4">
            <div className="bg-green-500 text-white p-2 rounded-full shadow-md">
              <span className="text-lg">✅</span>
            </div>
            <div>
              <div className="text-green-800 font-semibold mb-1">Test Successful!</div>
              <div className="text-green-700 text-sm leading-relaxed">{success}</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Feature Description with Modern Card Design */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2 rounded-lg">
              <span className="text-xl">📧</span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-800">Email Verification Test</h4>
              <p className="text-blue-600 text-sm font-medium">Complete pipeline validation</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-500 font-bold">•</span>
              <span className="text-gray-700">Sample Bitcoin ATH notification</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span className="text-gray-700">Tests complete email delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-500 font-bold">•</span>
              <span className="text-gray-700">Validates subscription status</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-pink-500 font-bold">•</span>
              <span className="text-gray-700">Checks email preferences</span>
            </div>
          </div>
        </div>
        
        {/* Subscription Warning with Enhanced Design */}
        <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 shadow-md">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white p-2 rounded-full shadow-md flex-shrink-0">
              <span className="text-lg">⚠️</span>
            </div>
            <div>
              <div className="text-amber-800 font-bold text-lg mb-2">Active Subscription Required</div>
              <div className="text-amber-700 text-sm leading-relaxed">
                You need an approved (active) subscription to send test notifications. If you have pending payments, please wait for admin approval.
              </div>
            </div>
          </div>
        </div>

        {/* Email Preview with Modern Design */}
        <div className="bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 border-2 border-gray-200 rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-r from-gray-600 to-slate-600 text-white p-2 rounded-lg">
              <span className="text-xl">📬</span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-800">Email Preview</h4>
              <p className="text-gray-600 text-sm">Test notification content</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">Subject:</span>
              <span className="text-sm text-gray-800">🚀 Bitcoin (BTC) Hit New All-Time High!</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-green-600">New ATH:</span>
                <span className="text-gray-800">$50,000.00</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-600">Previous:</span>
                <span className="text-gray-800">$48,000.00</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-purple-600">Increase:</span>
                <span className="text-gray-800">+4.17%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Send Button */}
        <div className="flex justify-center pt-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-30"></div>
            <Button
              onClick={sendTestNotification}
              loading={sending}
              disabled={sending}
              className={`relative bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl transform transition-all duration-300 ${
                !sending ? 'hover:scale-105 hover:shadow-2xl' : ''
              } ${sending ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">
                  {sending ? '⏳' : '🚀'}
                </span>
                <span className="text-lg">
                  {sending ? 'Sending Test...' : 'Send Test Notification'}
                </span>
                <span className="text-xl">
                  {sending ? '📧' : '💌'}
                </span>
              </div>
            </Button>
          </div>
        </div>

        {/* Enhanced Note */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-gray-100 to-slate-100 px-4 py-2 rounded-full border border-gray-200">
            <span className="text-sm">💡</span>
            <span className="text-xs text-gray-600 font-medium">
              Test notifications verify your setup without affecting notification history
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
