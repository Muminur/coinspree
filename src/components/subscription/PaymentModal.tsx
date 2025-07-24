'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface SubscriptionConfig {
  priceUSDT: number
  durationDays: number
  tronWalletAddress: string
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  config: SubscriptionConfig
  selectedPlan?: any
  onPaymentSubmitted?: () => void
}

export function PaymentModal({ isOpen, onClose, config, selectedPlan, onPaymentSubmitted }: PaymentModalProps) {
  const [step, setStep] = useState<'instructions' | 'verify'>('instructions')
  const [txHash, setTxHash] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVerifyPayment = async () => {
    if (!txHash || txHash.length !== 64) {
      setError('Please enter a valid transaction hash (64 characters)')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const requestData = { 
        paymentTxHash: txHash,
        amount: selectedPlan?.price || config.priceUSDT,
        duration: selectedPlan?.duration || config.durationDays
      }

      console.log('🔍 Sending payment verification request:', requestData)

      const response = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestData),
      })

      const data = await response.json()
      console.log('📝 Payment verification response:', { status: response.status, data })

      if (response.ok && data.success) {
        if (data.status === 'pending') {
          const extensionMessage = data.willExtend 
            ? `Your subscription will be extended until ${new Date(data.newEndDate).toLocaleDateString()}.`
            : `Your subscription will be valid until ${new Date(data.newEndDate).toLocaleDateString()}.`
          
          alert(`📋 Payment submitted successfully! Your ${selectedPlan?.name || 'subscription'} is pending admin approval. ${extensionMessage} Please contact support with your payment screenshot.`)
        } else {
          alert(`🎉 Payment verified! Your ${selectedPlan?.name || 'subscription'} is now active.`)
        }
        
        // Clear form and reset state
        setTxHash('')
        setStep('instructions')
        setError(null)
        
        // Trigger payment history refresh
        if (onPaymentSubmitted) {
          onPaymentSubmitted()
        }
        
        onClose()
        
        // Small delay to ensure the payment history has time to refresh
        setTimeout(() => {
          window.location.reload()
        }, 500)
      } else {
        const errorMessage = data.error || data.details || 'Payment verification failed'
        console.error('❌ Payment verification failed:', errorMessage)
        setError(Array.isArray(data.details) ? data.details.map(d => d.message).join(', ') : errorMessage)
      }
    } catch (err) {
      console.error('❌ Network error during payment verification:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={
        <div className="text-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            💎 Subscribe to {selectedPlan?.name || 'CoinSpree'}
          </div>
        </div>
      } 
      size="lg"
      className="bg-gradient-to-br from-slate-50 via-white to-blue-50"
    >
      {step === 'instructions' ? (
        <div className="space-y-6 p-2">
          {/* Selected Plan Summary */}
          {selectedPlan && (
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 rounded-xl border-2 border-gradient-to-r from-indigo-200 to-purple-200 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">
                    {selectedPlan.name}
                  </h4>
                  <p className="text-sm text-slate-600 font-medium mt-1">{selectedPlan.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    ${selectedPlan.price} <span className="text-base text-slate-600 font-medium">USDT</span>
                  </p>
                  <p className="text-sm text-slate-600 font-medium">per {selectedPlan.period}</p>
                  {selectedPlan.savings && (
                    <div className="mt-2">
                      <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                        💰 Save {selectedPlan.savings}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payment Instructions */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6 shadow-md">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💳</div>
              <div>
                <h3 className="text-lg font-bold text-blue-800 mb-2">Payment Instructions</h3>
                <p className="text-sm text-blue-700 font-medium leading-relaxed">
                  Send exactly <span className="font-bold text-blue-900">${config.priceUSDT} USDT (TRC20)</span> to the wallet address below, 
                  then provide the transaction hash for verification.
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 rounded-xl">
              <label className="block text-lg font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-xl">🔗</span>
                Send ${config.priceUSDT} USDT (TRC20) to:
              </label>
              <div className="space-y-3">
                <Input
                  value={config.tronWalletAddress}
                  readOnly
                  className="w-full font-mono text-sm bg-white text-gray-900 border-0 shadow-inner font-semibold px-4 py-3"
                />
                <div className="flex justify-center">
                  <Button
                    onClick={() => copyToClipboard(config.tronWalletAddress)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg transform hover:scale-105 transition-all duration-200 px-6"
                  >
                    📋 Copy Wallet Address
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between gap-4">
            <Button 
              variant="secondary" 
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold border border-gray-300"
            >
              ❌ Cancel
            </Button>
            <Button 
              onClick={() => setStep('verify')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              ✅ I've Sent the Payment →
            </Button>
          </div>

          {/* Important Notes */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-6 shadow-md">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div>
                <h4 className="text-lg font-bold text-amber-800 mb-3">Critical Requirements</h4>
                <ul className="text-sm text-amber-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span className="font-medium">Only send <span className="font-bold text-amber-900">USDT on the Tron network (TRC20)</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span className="font-medium">Send exactly <span className="font-bold text-amber-900">${config.priceUSDT} USDT</span> (not more, not less)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span className="font-medium">Do not send from an <span className="font-bold text-amber-900">exchange</span> (use a personal wallet)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">•</span>
                    <span className="font-medium">Transaction may take <span className="font-bold text-amber-900">2-10 minutes</span> to confirm</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 p-2">
          {/* Verification Step Header */}
          <div className="text-center bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3">
              Verify Your Payment
            </h3>
            <p className="text-slate-700 font-medium text-lg">
              Enter your transaction hash to activate your subscription
            </p>
          </div>

          {/* Transaction Hash Input */}
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-200">
              <label className="block text-lg font-bold text-indigo-800 mb-3 flex items-center gap-2">
                <span className="text-xl">🔐</span>
                Transaction Hash (TXID)
              </label>
              <Input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value.trim())}
                placeholder="Enter the 64-character transaction hash"
                className="font-mono text-sm bg-white border-2 border-indigo-200 focus:border-indigo-400 text-gray-900 font-medium"
              />
              <p className="text-sm text-indigo-700 font-medium mt-2">
                💡 Find this in your wallet's transaction history or on TronScan
              </p>
              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 font-medium">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* How to Find TX Hash */}
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl p-6 shadow-md">
            <div className="flex items-start gap-3">
              <div className="text-2xl">📖</div>
              <div>
                <h4 className="text-lg font-bold text-cyan-800 mb-3">How to find your transaction hash:</h4>
                <ol className="text-sm text-cyan-700 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-600">1.</span>
                    <span className="font-medium">Check your <span className="font-bold text-cyan-900">wallet's transaction history</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-600">2.</span>
                    <span className="font-medium">Look for the recent <span className="font-bold text-cyan-900">USDT transfer</span></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-cyan-600">3.</span>
                    <span className="font-medium">Copy the <span className="font-bold text-cyan-900">transaction ID/hash (64 characters)</span></span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 gap-4">
            <Button 
              variant="secondary" 
              onClick={() => setStep('instructions')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold border border-gray-300"
            >
              ← Back
            </Button>
            <Button
              onClick={handleVerifyPayment}
              loading={loading}
              disabled={!txHash}
              className={`${!txHash ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transform hover:scale-105'} text-white font-bold shadow-lg transition-all duration-200`}
            >
              {loading ? '⏳ Verifying...' : '✅ Verify Payment'}
            </Button>
          </div>

          {/* Support Section */}
          <div className="text-center pt-6 border-t-2 border-gradient-to-r from-gray-200 to-gray-300">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700">
                Need help? 
                <a href="/contact" className="text-purple-600 hover:text-purple-800 font-bold underline decoration-2 decoration-purple-300 hover:decoration-purple-500 transition-colors ml-1">
                  📞 Contact Support
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}