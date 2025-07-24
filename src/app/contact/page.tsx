'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    email: '',
    subject: '',
    message: '',
    txHash: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // For now, just show success message
    setSubmitted(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-2xl mx-auto p-8 text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-3xl font-bold text-green-600 mb-4">Message Sent Successfully!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for contacting us. We've received your message and will review your payment within 24 hours.
            You'll receive an email confirmation once your subscription is approved.
          </p>
          <Button onClick={() => window.location.href = '/dashboard'} className="bg-blue-600 hover:bg-blue-700">
            Return to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            📞 Contact Support
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Need help with your payment or subscription? Send us your payment details and we'll approve it manually within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <Card className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Support Request</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Email Address
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Hash (TXID)
                </label>
                <Input
                  type="text"
                  name="txHash"
                  value={formData.txHash}
                  onChange={handleChange}
                  placeholder="Enter your 64-character transaction hash"
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  The transaction hash from your USDT payment on Tron network
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a subject</option>
                  <option value="Payment Approval">Payment Approval Request</option>
                  <option value="Payment Issue">Payment Processing Issue</option>
                  <option value="Subscription Help">Subscription Help</option>
                  <option value="Technical Support">Technical Support</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Please provide details about your payment:
                  
• Payment amount sent
• When you sent the payment
• From which wallet
• Any issues you encountered

We'll review your payment and approve your subscription within 24 hours."
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3"
              >
                📤 Send Support Request
              </Button>
            </form>
          </Card>

          {/* Contact Information */}
          <div className="space-y-8">
            {/* Payment Help */}
            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <div className="flex items-start gap-4">
                <div className="text-3xl">💰</div>
                <div>
                  <h3 className="text-lg font-bold text-green-800 mb-2">Payment Approval Process</h3>
                  <ul className="text-sm text-green-700 space-y-2">
                    <li>• Submit your transaction hash using the form</li>
                    <li>• Our admin will verify your payment on TronScan</li>
                    <li>• Approval typically takes 2-24 hours</li>
                    <li>• You'll receive email confirmation when approved</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Response Times */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <div className="flex items-start gap-4">
                <div className="text-3xl">⏰</div>
                <div>
                  <h3 className="text-lg font-bold text-blue-800 mb-2">Response Times</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Payment approvals: 2-24 hours</li>
                    <li>• Technical support: 24-48 hours</li>
                    <li>• General inquiries: 48-72 hours</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Payment Info */}
            <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🔍</div>
                <div>
                  <h3 className="text-lg font-bold text-amber-800 mb-2">What We Check</h3>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Transaction exists on Tron network</li>
                    <li>• Correct USDT amount sent</li>
                    <li>• Payment sent to our wallet address</li>
                    <li>• Transaction is recent (within 7 days)</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Alternative Contact */}
            <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <div className="flex items-start gap-4">
                <div className="text-3xl">📧</div>
                <div>
                  <h3 className="text-lg font-bold text-purple-800 mb-2">Alternative Contact</h3>
                  <p className="text-sm text-purple-700 mb-2">
                    You can also email us directly with your payment details:
                  </p>
                  <p className="text-sm font-mono text-purple-800 bg-white px-2 py-1 rounded">
                    support@coinspree.cc
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}