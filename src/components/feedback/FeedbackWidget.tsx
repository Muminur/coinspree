'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'

interface FeedbackWidgetProps {
  page?: string
  className?: string
}

export function FeedbackWidget({ page, className = '' }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    type: 'feedback',
    category: 'general',
    title: '',
    message: '',
    rating: 0
  })
  const { user } = useAuth()

  const feedbackTypes = [
    { value: 'bug', label: '🐛 Bug Report', description: 'Something is broken or not working' },
    { value: 'feature', label: '💡 Feature Request', description: 'I have an idea for a new feature' },
    { value: 'improvement', label: '⚡ Improvement', description: 'Make something work better' },
    { value: 'complaint', label: '😞 Complaint', description: 'I have a concern or complaint' },
    { value: 'praise', label: '👏 Praise', description: 'Something works great!' },
    { value: 'question', label: '❓ Question', description: 'I need help or have a question' },
    { value: 'other', label: '📝 Other', description: 'Something else' }
  ]

  const categories = [
    { value: 'ui', label: '🎨 User Interface', description: 'Layout, design, colors, fonts' },
    { value: 'performance', label: '⚡ Performance', description: 'Speed, loading times' },
    { value: 'functionality', label: '⚙️ Functionality', description: 'How features work' },
    { value: 'navigation', label: '🧭 Navigation', description: 'Moving around the app' },
    { value: 'subscription', label: '💳 Subscription', description: 'Payments and subscriptions' },
    { value: 'notifications', label: '📧 Notifications', description: 'Email and alerts' },
    { value: 'content', label: '📝 Content', description: 'Text, information displayed' },
    { value: 'general', label: '📋 General', description: 'Everything else' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.message.trim()) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          page: page || window.location.pathname,
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`
        })
      })

      if (response.ok) {
        setIsSubmitted(true)
        setFormData({
          type: 'feedback',
          category: 'general',
          title: '',
          message: '',
          rating: 0
        })
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          setIsOpen(false)
          setIsSubmitted(false)
        }, 3000)
      } else {
        throw new Error('Failed to submit feedback')
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const StarRating = ({ rating, onRatingChange }: { rating: number; onRatingChange: (rating: number) => void }) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`text-2xl transition-colors ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
            } hover:text-yellow-400`}
          >
            ⭐
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          {rating === 0 ? 'No rating' : `${rating} star${rating !== 1 ? 's' : ''}`}
        </span>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-full px-6 py-3"
        >
          💬 Feedback
        </Button>
      </div>
    )
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <Card className="w-96 max-w-[calc(100vw-2rem)] shadow-xl border-0 bg-white dark:bg-gray-800">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              💬 Share Your Feedback
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
            >
              ✕
            </button>
          </div>

          {isSubmitted ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h4 className="text-lg font-semibold text-green-600 mb-2">
                Thank you for your feedback!
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                We appreciate your input and will review it soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Feedback Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What type of feedback is this? *
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                  {feedbackTypes.map((type) => (
                    <label
                      key={type.value}
                      className={`flex items-center p-2 rounded-lg border cursor-pointer transition-colors ${
                        formData.type === type.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={type.value}
                        checked={formData.type === type.value}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{type.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{type.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief summary of your feedback..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us more about your feedback..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  required
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Overall Rating (Optional)
                </label>
                <StarRating
                  rating={formData.rating}
                  onRatingChange={(rating) => setFormData({ ...formData, rating })}
                />
              </div>

              {/* User Info Display */}
              {user && (
                <div className="text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  📧 Submitted as: {user.email}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex space-x-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  disabled={!formData.title.trim() || !formData.message.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Sending...</span>
                    </>
                  ) : (
                    'Send Feedback'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>
    </div>
  )
}

// Quick feedback button for specific actions
export function QuickFeedbackButton({ 
  type = 'feedback', 
  category = 'general', 
  title, 
  className = '' 
}: {
  type?: string
  category?: string
  title?: string
  className?: string
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleQuickFeedback = async (feedbackType: 'positive' | 'negative') => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type,
          category,
          title: title || `Quick ${feedbackType} feedback`,
          message: `User gave ${feedbackType} feedback on ${window.location.pathname}`,
          rating: feedbackType === 'positive' ? 5 : 2,
          page: window.location.pathname,
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`
        })
      })

      if (response.ok) {
        setIsSubmitted(true)
        setTimeout(() => setIsSubmitted(false), 2000)
      }
    } catch (error) {
      console.error('Failed to submit quick feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className={`inline-flex items-center text-green-600 text-sm ${className}`}>
        ✅ Thanks for your feedback!
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <span className="text-sm text-gray-600 dark:text-gray-400">Was this helpful?</span>
      <Button
        onClick={() => handleQuickFeedback('positive')}
        variant="outline"
        size="sm"
        disabled={isSubmitting}
        className="text-green-600 hover:bg-green-50 hover:border-green-300 px-2 py-1"
      >
        👍
      </Button>
      <Button
        onClick={() => handleQuickFeedback('negative')}
        variant="outline"
        size="sm"
        disabled={isSubmitting}
        className="text-red-600 hover:bg-red-50 hover:border-red-300 px-2 py-1"
      >
        👎
      </Button>
    </div>
  )
}