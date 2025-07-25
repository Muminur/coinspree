'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface ABTest {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  variants: ABVariant[]
  trafficAllocation: number
  startDate: string
  endDate?: string
  targetMetric: string
  hypothesis: string
  results?: ABTestResults
  createdAt: string
  updatedAt: string
  createdBy: string
}

interface ABVariant {
  id: string
  name: string
  description: string
  weight: number
  config: Record<string, any>
  isControl: boolean
}

interface ABTestResults {
  totalParticipants: number
  variantResults: Record<string, {
    participants: number
    conversions: number
    conversionRate: number
    averageSessionTime: number
    bounceRate: number
    customMetrics: Record<string, number>
  }>
  confidenceLevel: number
  statisticalSignificance: boolean
  winningVariant?: string
  liftPercentage?: number
}

interface OnboardingStep {
  id: string
  name: string
  description: string
  component: string
  order: number
  isRequired: boolean
  completionCriteria: string[]
  analytics: {
    views: number
    completions: number
    dropoffRate: number
    averageTimeSpent: number
  }
}

interface OnboardingFlow {
  id: string
  name: string
  description: string
  steps: OnboardingStep[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function ABTestingDashboard() {
  const [tests, setTests] = useState<ABTest[]>([])
  const [flows, setFlows] = useState<OnboardingFlow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'tests' | 'flows' | 'create'>('tests')
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Fetch A/B tests and onboarding flows
      const [testsResponse, flowsResponse] = await Promise.all([
        fetch('/api/admin/ab-testing?action=tests', { credentials: 'include' }),
        fetch('/api/admin/ab-testing?action=flows', { credentials: 'include' })
      ])
      
      if (!testsResponse.ok || !flowsResponse.ok) {
        throw new Error('Failed to fetch data')
      }
      
      const [testsData, flowsData] = await Promise.all([
        testsResponse.json(),
        flowsResponse.json()
      ])
      
      if (testsData.success) {
        setTests(testsData.data.tests)
      }
      
      if (flowsData.success) {
        setFlows(flowsData.data.flows)
      }
    } catch (err) {
      console.error('Data fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const completeTest = async (testId: string) => {
    try {
      setActionLoading(testId)
      
      const response = await fetch('/api/admin/ab-testing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'complete_test',
          testId
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log('Test completed successfully')
        await fetchData() // Refresh data
      } else {
        console.error('Failed to complete test:', data.error)
      }
    } catch (err) {
      console.error('Error completing test:', err)
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">🟢 Active</Badge>
      case 'completed':
        return <Badge variant="info">✅ Completed</Badge>
      case 'paused':
        return <Badge variant="warning">⏸️ Paused</Badge>
      case 'draft':
        return <Badge variant="secondary">📝 Draft</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  if (loading && tests.length === 0 && flows.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading A/B testing data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <div className="p-4">
            <div className="flex items-center">
              <span className="text-2xl mr-3">❌</span>
              <div>
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-400">Error Loading Data</h3>
                <p className="text-red-600 dark:text-red-300">{error}</p>
              </div>
            </div>
            <Button onClick={fetchData} className="mt-4" variant="outline">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🧪 A/B Testing & Onboarding Optimization
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage experiments and optimize user onboarding flows
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : '🔄 Refresh'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'tests', label: '🧪 A/B Tests', count: tests.length },
          { key: 'flows', label: '🎯 Onboarding Flows', count: flows.length },
          { key: 'create', label: '➕ Create New' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.key
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab.label} {tab.count !== undefined && `(${tab.count})`}
          </button>
        ))}
      </div>

      {/* A/B Tests Tab */}
      {activeTab === 'tests' && (
        <>
          {/* Tests Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-400">Active Tests</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-300">
                      {tests.filter(t => t.status === 'active').length}
                    </p>
                  </div>
                  <div className="text-4xl">🟢</div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-400">Completed Tests</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">
                      {tests.filter(t => t.status === 'completed').length}
                    </p>
                  </div>
                  <div className="text-4xl">✅</div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-800 dark:text-purple-400">Total Participants</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-300">
                      {tests.reduce((sum, test) => sum + (test.results?.totalParticipants || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-4xl">👥</div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-400">Significant Results</p>
                    <p className="text-3xl font-bold text-orange-900 dark:text-orange-300">
                      {tests.filter(t => t.results?.statisticalSignificance).length}
                    </p>
                  </div>
                  <div className="text-4xl">📊</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Tests List */}
          <Card>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">🧪</span>
                A/B Tests ({tests.length})
              </h3>
              <div className="space-y-4">
                {tests.map((test, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-purple-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusBadge(test.status)}
                          <Badge variant="info">{test.variants.length} variants</Badge>
                          <Badge variant="secondary">{test.trafficAllocation}% traffic</Badge>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {test.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {test.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Target: {test.targetMetric}</span>
                          <span>Started: {new Date(test.startDate).toLocaleDateString()}</span>
                          {test.results && (
                            <span>Participants: {test.results.totalParticipants.toLocaleString()}</span>
                          )}
                        </div>
                        
                        {/* Test Results Preview */}
                        {test.results && (
                          <div className="mt-3 p-3 bg-white dark:bg-gray-700 rounded border">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              {Object.entries(test.results.variantResults).map(([variantId, results]) => {
                                const variant = test.variants.find(v => v.id === variantId)
                                return (
                                  <div key={variantId} className="text-center">
                                    <p className="font-medium mb-1">
                                      {variant?.name || variantId} {variant?.isControl && '(Control)'}
                                    </p>
                                    <p className="text-lg font-bold text-blue-600">
                                      {formatPercentage(results.conversionRate)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {results.participants} participants
                                    </p>
                                  </div>
                                )
                              })}
                            </div>
                            
                            {test.results.statisticalSignificance && test.results.winningVariant && (
                              <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/20 rounded text-center">
                                <p className="text-sm font-medium text-green-800 dark:text-green-400">
                                  🏆 {test.variants.find(v => v.id === test.results?.winningVariant)?.name} wins 
                                  with {formatPercentage(test.results.liftPercentage || 0)} lift
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => setSelectedTest(test)}
                          variant="outline"
                          size="sm"
                        >
                          View Details
                        </Button>
                        {test.status === 'active' && (
                          <Button
                            onClick={() => completeTest(test.id)}
                            variant="success"
                            size="sm"
                            disabled={actionLoading === test.id}
                          >
                            {actionLoading === test.id ? <LoadingSpinner size="sm" /> : 'Complete Test'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Onboarding Flows Tab */}
      {activeTab === 'flows' && (
        <>
          {/* Flows Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-800 dark:text-indigo-400">Active Flows</p>
                    <p className="text-3xl font-bold text-indigo-900 dark:text-indigo-300">
                      {flows.filter(f => f.isActive).length}
                    </p>
                  </div>
                  <div className="text-4xl">🎯</div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 border-cyan-200 dark:border-cyan-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-cyan-800 dark:text-cyan-400">Total Steps</p>
                    <p className="text-3xl font-bold text-cyan-900 dark:text-cyan-300">
                      {flows.reduce((sum, flow) => sum + flow.steps.length, 0)}
                    </p>
                  </div>
                  <div className="text-4xl">📋</div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 border-teal-200 dark:border-teal-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-teal-800 dark:text-teal-400">Avg Completion</p>
                    <p className="text-3xl font-bold text-teal-900 dark:text-teal-300">
                      {flows.length > 0 ? formatPercentage(
                        flows.reduce((sum, flow) => {
                          const avgCompletion = flow.steps.reduce((stepSum, step) => 
                            stepSum + (step.analytics.views > 0 ? (step.analytics.completions / step.analytics.views) * 100 : 0), 0
                          ) / flow.steps.length
                          return sum + avgCompletion
                        }, 0) / flows.length
                      ) : '0%'}
                    </p>
                  </div>
                  <div className="text-4xl">✅</div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 border-pink-200 dark:border-pink-700">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-pink-800 dark:text-pink-400">Avg Time</p>
                    <p className="text-3xl font-bold text-pink-900 dark:text-pink-300">
                      {flows.length > 0 ? formatTime(Math.round(
                        flows.reduce((sum, flow) => 
                          sum + flow.steps.reduce((stepSum, step) => stepSum + step.analytics.averageTimeSpent, 0), 0
                        ) / flows.length
                      )) : '0s'}
                    </p>
                  </div>
                  <div className="text-4xl">⏱️</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Flows List */}
          <Card>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <span className="text-2xl mr-2">🎯</span>
                Onboarding Flows ({flows.length})
              </h3>
              <div className="space-y-4">
                {flows.map((flow, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-indigo-500">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant={flow.isActive ? "success" : "secondary"}>
                            {flow.isActive ? '🟢 Active' : '⭕ Inactive'}
                          </Badge>
                          <Badge variant="info">{flow.steps.length} steps</Badge>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {flow.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {flow.description}
                        </p>
                        
                        {/* Flow Steps Analytics */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {flow.steps.map((step, stepIndex) => (
                            <div key={stepIndex} className="p-3 bg-white dark:bg-gray-700 rounded border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">{step.name}</span>
                                {step.isRequired && <Badge variant="warning" size="sm">Required</Badge>}
                              </div>
                              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                                <div className="flex justify-between">
                                  <span>Views:</span>
                                  <span>{step.analytics.views}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Completions:</span>
                                  <span>{step.analytics.completions}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Completion Rate:</span>
                                  <span className={
                                    step.analytics.views > 0 
                                      ? (step.analytics.completions / step.analytics.views) >= 0.8 
                                        ? 'text-green-600' 
                                        : (step.analytics.completions / step.analytics.views) >= 0.5 
                                          ? 'text-yellow-600' 
                                          : 'text-red-600'
                                      : 'text-gray-500'
                                  }>
                                    {step.analytics.views > 0 
                                      ? formatPercentage((step.analytics.completions / step.analytics.views) * 100)
                                      : 'N/A'
                                    }
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Avg Time:</span>
                                  <span>{formatTime(step.analytics.averageTimeSpent)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Create New Tab */}
      {activeTab === 'create' && (
        <Card>
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">➕</span>
              Create New Experiment or Flow
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
                <div className="text-6xl mb-4">🧪</div>
                <h4 className="text-lg font-medium mb-2">Create A/B Test</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Set up a new experiment to test different variants and measure conversions
                </p>
                <Button variant="primary" disabled>
                  Coming Soon
                </Button>
              </div>
              
              <div className="p-6 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h4 className="text-lg font-medium mb-2">Create Onboarding Flow</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Design a new user onboarding experience with multiple steps and analytics
                </p>
                <Button variant="primary" disabled>
                  Coming Soon
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Test Detail Modal */}
      {selectedTest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Test Details: {selectedTest.name}</h3>
                <Button onClick={() => setSelectedTest(null)} variant="outline" size="sm">
                  ✕ Close
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Test Configuration</h4>
                  <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Status:</strong> {getStatusBadge(selectedTest.status)}</p>
                        <p><strong>Traffic Allocation:</strong> {selectedTest.trafficAllocation}%</p>
                        <p><strong>Target Metric:</strong> {selectedTest.targetMetric}</p>
                      </div>
                      <div>
                        <p><strong>Started:</strong> {new Date(selectedTest.startDate).toLocaleString()}</p>
                        {selectedTest.endDate && (
                          <p><strong>Ended:</strong> {new Date(selectedTest.endDate).toLocaleString()}</p>
                        )}
                        <p><strong>Created By:</strong> {selectedTest.createdBy}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Hypothesis</h4>
                  <p className="text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                    {selectedTest.hypothesis}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Variants ({selectedTest.variants.length})</h4>
                  <div className="space-y-2">
                    {selectedTest.variants.map((variant, index) => (
                      <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded border-l-4 border-purple-500">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{variant.name}</span>
                          <div className="flex space-x-2">
                            <Badge variant="info">{variant.weight}% traffic</Badge>
                            {variant.isControl && <Badge variant="success">Control</Badge>}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {variant.description}
                        </p>
                        {Object.keys(variant.config).length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-500">Show Config</summary>
                            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
                              {JSON.stringify(variant.config, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedTest.results && (
                  <div>
                    <h4 className="font-medium mb-2">Results Summary</h4>
                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded">
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <p><strong>Total Participants:</strong> {selectedTest.results.totalParticipants.toLocaleString()}</p>
                          <p><strong>Confidence Level:</strong> {selectedTest.results.confidenceLevel}%</p>
                        </div>
                        <div>
                          <p><strong>Statistical Significance:</strong> {
                            selectedTest.results.statisticalSignificance 
                              ? <Badge variant="success">✅ Yes</Badge>
                              : <Badge variant="warning">⚠️ No</Badge>
                          }</p>
                          {selectedTest.results.winningVariant && (
                            <p><strong>Winning Variant:</strong> {
                              selectedTest.variants.find(v => v.id === selectedTest.results?.winningVariant)?.name
                            }</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}