import { KV } from './kv'
import { Cache } from './cache'

/**
 * A/B Testing and User Onboarding Optimization Framework
 */

export interface ABTest {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  variants: ABVariant[]
  trafficAllocation: number // Percentage of users to include in test (0-100)
  startDate: string
  endDate?: string
  targetMetric: string
  hypothesis: string
  results?: ABTestResults
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface ABVariant {
  id: string
  name: string
  description: string
  weight: number // Percentage weight for traffic split (0-100)
  config: Record<string, any>
  isControl: boolean
}

export interface ABTestResults {
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

export interface UserAssignment {
  userId: string
  testId: string
  variantId: string
  assignedAt: string
  sessionId: string
  userAgent?: string
  metadata?: Record<string, any>
}

export interface OnboardingStep {
  id: string
  name: string
  description: string
  component: string
  order: number
  isRequired: boolean
  completionCriteria: string[]
  variants?: Record<string, any>
  analytics: {
    views: number
    completions: number
    dropoffRate: number
    averageTimeSpent: number
  }
}

export interface OnboardingFlow {
  id: string
  name: string
  description: string
  steps: OnboardingStep[]
  variants: Record<string, OnboardingStep[]>
  targetAudience: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * A/B Testing Service for managing experiments and user assignments
 */
export class ABTestingService {
  /**
   * Create a new A/B test
   */
  async createTest(test: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Validate variants weights sum to 100
      const totalWeight = test.variants.reduce((sum, variant) => sum + variant.weight, 0)
      if (Math.abs(totalWeight - 100) > 0.01) {
        throw new Error('Variant weights must sum to 100')
      }
      
      const newTest: ABTest = {
        ...test,
        id: testId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // Store test configuration
      await KV.hset(`ab_test:${testId}`, {
        ...newTest,
        variants: JSON.stringify(newTest.variants),
        results: newTest.results ? JSON.stringify(newTest.results) : undefined
      })
      
      // Add to active tests list if status is active
      if (test.status === 'active') {
        await KV.sadd('active_ab_tests', testId)
      }
      
      // Set expiration if end date is specified
      if (test.endDate) {
        const ttl = Math.floor((new Date(test.endDate).getTime() - Date.now()) / 1000)
        if (ttl > 0) {
          await KV.expire(`ab_test:${testId}`, ttl)
        }
      }
      
      return testId
    } catch (error) {
      console.error('Error creating A/B test:', error)
      throw error
    }
  }

  /**
   * Get A/B test by ID
   */
  async getTest(testId: string): Promise<ABTest | null> {
    try {
      const testData = await KV.hgetall(`ab_test:${testId}`)
      
      if (!testData || !testData.id) {
        return null
      }
      
      return {
        ...testData,
        variants: JSON.parse(testData.variants || '[]'),
        results: testData.results ? JSON.parse(testData.results) : undefined
      } as ABTest
    } catch (error) {
      console.error('Error getting A/B test:', error)
      return null
    }
  }

  /**
   * Assign user to A/B test variant
   */
  async assignUserToTest(userId: string, testId: string, sessionId: string, metadata?: Record<string, any>): Promise<string | null> {
    try {
      // Check if user is already assigned to this test
      const existingAssignment = await KV.hgetall(`user_assignment:${userId}:${testId}`)
      if (existingAssignment && existingAssignment.variantId) {
        return existingAssignment.variantId
      }
      
      // Get test configuration
      const test = await this.getTest(testId)
      if (!test || test.status !== 'active') {
        return null
      }
      
      // Determine if user should be included in test based on traffic allocation
      const userHash = this.hashUserId(userId)
      const shouldInclude = (userHash % 100) < test.trafficAllocation
      
      if (!shouldInclude) {
        return null
      }
      
      // Assign variant based on weights
      const variantId = this.selectVariant(test.variants, userHash)
      
      // Store user assignment
      const assignment: UserAssignment = {
        userId,
        testId,
        variantId,
        assignedAt: new Date().toISOString(),
        sessionId,
        metadata
      }
      
      await KV.hset(`user_assignment:${userId}:${testId}`, assignment)
      
      // Add to test participants
      await KV.sadd(`test_participants:${testId}`, userId)
      await KV.sadd(`variant_participants:${testId}:${variantId}`, userId)
      
      // Update test analytics
      await this.updateTestAnalytics(testId, variantId, 'assignment')
      
      return variantId
    } catch (error) {
      console.error('Error assigning user to test:', error)
      return null
    }
  }

  /**
   * Track A/B test conversion event
   */
  async trackConversion(userId: string, testId: string, eventType: string, value?: number, metadata?: Record<string, any>): Promise<void> {
    try {
      // Get user assignment
      const assignment = await KV.hgetall(`user_assignment:${userId}:${testId}`)
      if (!assignment || !assignment.variantId) {
        return // User not in test
      }
      
      // Record conversion event
      const conversionId = `conversion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await KV.hset(`conversion:${conversionId}`, {
        id: conversionId,
        userId,
        testId,
        variantId: assignment.variantId,
        eventType,
        value: value?.toString() || '0',
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        timestamp: new Date().toISOString()
      })
      
      // Update test analytics
      await this.updateTestAnalytics(testId, assignment.variantId, 'conversion', value)
      
      // Set TTL for conversion data (90 days)
      await KV.expire(`conversion:${conversionId}`, 86400 * 90)
    } catch (error) {
      console.error('Error tracking conversion:', error)
    }
  }

  /**
   * Get A/B test results and statistics
   */
  async getTestResults(testId: string): Promise<ABTestResults | null> {
    try {
      const test = await this.getTest(testId)
      if (!test) {
        return null
      }
      
      const results: ABTestResults = {
        totalParticipants: 0,
        variantResults: {},
        confidenceLevel: 95,
        statisticalSignificance: false
      }
      
      // Calculate results for each variant
      for (const variant of test.variants) {
        const participants = await KV.scard(`variant_participants:${testId}:${variant.id}`)
        const conversions = await this.getVariantConversions(testId, variant.id)
        const conversionRate = participants > 0 ? (conversions / participants) * 100 : 0
        
        results.variantResults[variant.id] = {
          participants,
          conversions,
          conversionRate,
          averageSessionTime: await this.getAverageSessionTime(testId, variant.id),
          bounceRate: await this.getBounceRate(testId, variant.id),
          customMetrics: await this.getCustomMetrics(testId, variant.id)
        }
        
        results.totalParticipants += participants
      }
      
      // Determine statistical significance and winning variant
      const { isSignificant, winningVariant, liftPercentage } = this.calculateStatisticalSignificance(results.variantResults, test.variants)
      
      results.statisticalSignificance = isSignificant
      results.winningVariant = winningVariant
      results.liftPercentage = liftPercentage
      
      // Cache results
      await Cache.set(`test_results:${testId}`, results, { ttl: 300 }) // 5 minutes cache
      
      return results
    } catch (error) {
      console.error('Error getting test results:', error)
      return null
    }
  }

  /**
   * Get all active A/B tests
   */
  async getActiveTests(): Promise<ABTest[]> {
    try {
      const activeTestIds = await KV.smembers('active_ab_tests')
      const tests = await Promise.all(
        activeTestIds.map(testId => this.getTest(testId))
      )
      
      return tests.filter(test => test !== null) as ABTest[]
    } catch (error) {
      console.error('Error getting active tests:', error)
      return []
    }
  }

  /**
   * Complete A/B test and finalize results
   */
  async completeTest(testId: string): Promise<ABTestResults | null> {
    try {
      const test = await this.getTest(testId)
      if (!test) {
        return null
      }
      
      // Get final results
      const results = await this.getTestResults(testId)
      if (!results) {
        return null
      }
      
      // Update test status and store final results
      await KV.hset(`ab_test:${testId}`, {
        status: 'completed',
        endDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        results: JSON.stringify(results)
      })
      
      // Remove from active tests
      await KV.srem('active_ab_tests', testId)
      
      return results
    } catch (error) {
      console.error('Error completing test:', error)
      return null
    }
  }

  // Private helper methods

  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private selectVariant(variants: ABVariant[], userHash: number): string {
    const random = userHash % 100
    let cumulativeWeight = 0
    
    for (const variant of variants) {
      cumulativeWeight += variant.weight
      if (random < cumulativeWeight) {
        return variant.id
      }
    }
    
    // Fallback to control variant
    const controlVariant = variants.find(v => v.isControl)
    return controlVariant?.id || variants[0].id
  }

  private async updateTestAnalytics(testId: string, variantId: string, eventType: string, value?: number): Promise<void> {
    try {
      const analyticsKey = `test_analytics:${testId}:${variantId}`
      const today = new Date().toISOString().split('T')[0]
      const dailyKey = `${analyticsKey}:${today}`
      
      // Update daily metrics
      await KV.hincrby(dailyKey, eventType, 1)
      if (value !== undefined) {
        await KV.hincrby(dailyKey, `${eventType}_value`, Math.round(value * 100)) // Store as cents/basis points
      }
      
      // Set TTL for daily analytics (90 days)
      await KV.expire(dailyKey, 86400 * 90)
      
      // Update overall test metrics
      await KV.hincrby(analyticsKey, eventType, 1)
      if (value !== undefined) {
        await KV.hincrby(analyticsKey, `${eventType}_value`, Math.round(value * 100))
      }
    } catch (error) {
      console.error('Error updating test analytics:', error)
    }
  }

  private async getVariantConversions(testId: string, variantId: string): Promise<number> {
    try {
      const analyticsKey = `test_analytics:${testId}:${variantId}`
      const conversions = await KV.hget(analyticsKey, 'conversion')
      return parseInt(conversions || '0')
    } catch (error) {
      return 0
    }
  }

  private async getAverageSessionTime(testId: string, variantId: string): Promise<number> {
    // Simulate session time calculation
    return Math.random() * 300 + 60 // 1-6 minutes average
  }

  private async getBounceRate(testId: string, variantId: string): Promise<number> {
    // Simulate bounce rate calculation
    return Math.random() * 50 + 10 // 10-60% bounce rate
  }

  private async getCustomMetrics(testId: string, variantId: string): Promise<Record<string, number>> {
    // Simulate custom metrics
    return {
      pageViews: Math.floor(Math.random() * 100) + 50,
      timeOnPage: Math.floor(Math.random() * 180) + 30,
      clickThroughRate: Math.random() * 20 + 5
    }
  }

  private calculateStatisticalSignificance(
    variantResults: Record<string, any>, 
    variants: ABVariant[]
  ): { isSignificant: boolean; winningVariant?: string; liftPercentage?: number } {
    try {
      const controlVariant = variants.find(v => v.isControl)
      if (!controlVariant) {
        return { isSignificant: false }
      }
      
      const controlResults = variantResults[controlVariant.id]
      if (!controlResults || controlResults.participants < 100) {
        return { isSignificant: false } // Need minimum sample size
      }
      
      let bestVariant = controlVariant.id
      let bestConversionRate = controlResults.conversionRate
      let maxLift = 0
      
      // Compare each variant to control
      for (const variant of variants) {
        if (variant.isControl) continue
        
        const variantResults_variant = variantResults[variant.id]
        if (!variantResults_variant || variantResults_variant.participants < 100) {
          continue
        }
        
        const lift = ((variantResults_variant.conversionRate - controlResults.conversionRate) / controlResults.conversionRate) * 100
        
        if (variantResults_variant.conversionRate > bestConversionRate && Math.abs(lift) > 5) {
          bestVariant = variant.id
          bestConversionRate = variantResults_variant.conversionRate
          maxLift = lift
        }
      }
      
      // Simple significance test (in production, use proper statistical tests)
      const isSignificant = Math.abs(maxLift) > 10 && controlResults.participants > 500
      
      return {
        isSignificant,
        winningVariant: isSignificant ? bestVariant : undefined,
        liftPercentage: isSignificant ? maxLift : 0
      }
    } catch (error) {
      console.error('Error calculating statistical significance:', error)
      return { isSignificant: false }
    }
  }
}

/**
 * Onboarding Optimization Service
 */
export class OnboardingService {
  /**
   * Create onboarding flow with A/B test variants
   */
  async createOnboardingFlow(flow: Omit<OnboardingFlow, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const flowId = `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const newFlow: OnboardingFlow = {
        ...flow,
        id: flowId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      await KV.hset(`onboarding_flow:${flowId}`, {
        ...newFlow,
        steps: JSON.stringify(newFlow.steps),
        variants: JSON.stringify(newFlow.variants),
        targetAudience: JSON.stringify(newFlow.targetAudience)
      })
      
      if (flow.isActive) {
        await KV.sadd('active_onboarding_flows', flowId)
      }
      
      return flowId
    } catch (error) {
      console.error('Error creating onboarding flow:', error)
      throw error
    }
  }

  /**
   * Get personalized onboarding flow for user
   */
  async getPersonalizedFlow(userId: string, userProfile?: Record<string, any>): Promise<OnboardingFlow | null> {
    try {
      // Get active flows
      const activeFlowIds = await KV.smembers('active_onboarding_flows')
      
      for (const flowId of activeFlowIds) {
        const flowData = await KV.hgetall(`onboarding_flow:${flowId}`)
        if (!flowData || !flowData.id) continue
        
        const flow: OnboardingFlow = {
          ...flowData,
          steps: JSON.parse(flowData.steps || '[]'),
          variants: JSON.parse(flowData.variants || '{}'),
          targetAudience: JSON.parse(flowData.targetAudience || '[]')
        }
        
        // Check if user matches target audience
        if (this.matchesTargetAudience(userProfile, flow.targetAudience)) {
          // Check if user is in A/B test for this flow
          const variant = await this.getFlowVariant(userId, flowId)
          if (variant && flow.variants[variant]) {
            // Return flow with variant steps
            return {
              ...flow,
              steps: flow.variants[variant]
            }
          }
          
          return flow
        }
      }
      
      return null
    } catch (error) {
      console.error('Error getting personalized flow:', error)
      return null
    }
  }

  /**
   * Track onboarding step completion
   */
  async trackStepCompletion(
    userId: string, 
    flowId: string, 
    stepId: string, 
    timeSpent: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Record completion
      await KV.hset(`user_onboarding:${userId}:${flowId}`, {
        [`step_${stepId}_completed`]: new Date().toISOString(),
        [`step_${stepId}_time`]: timeSpent.toString(),
        [`step_${stepId}_metadata`]: metadata ? JSON.stringify(metadata) : undefined
      })
      
      // Update flow analytics
      await this.updateFlowAnalytics(flowId, stepId, 'completion', timeSpent)
      
      // Check if flow is complete
      await this.checkFlowCompletion(userId, flowId)
    } catch (error) {
      console.error('Error tracking step completion:', error)
    }
  }

  /**
   * Get onboarding progress for user
   */
  async getUserProgress(userId: string, flowId: string): Promise<{
    flowId: string
    completedSteps: string[]
    currentStep?: string
    completionPercentage: number
    totalTimeSpent: number
  }> {
    try {
      const progressData = await KV.hgetall(`user_onboarding:${userId}:${flowId}`)
      const flow = await KV.hgetall(`onboarding_flow:${flowId}`)
      
      if (!flow || !flow.steps) {
        return {
          flowId,
          completedSteps: [],
          completionPercentage: 0,
          totalTimeSpent: 0
        }
      }
      
      const steps = JSON.parse(flow.steps)
      const completedSteps = Object.keys(progressData)
        .filter(key => key.endsWith('_completed'))
        .map(key => key.replace('step_', '').replace('_completed', ''))
      
      const totalTimeSpent = Object.keys(progressData)
        .filter(key => key.endsWith('_time'))
        .reduce((total, key) => total + parseInt(progressData[key] || '0'), 0)
      
      const completionPercentage = (completedSteps.length / steps.length) * 100
      
      // Find current step
      const currentStep = steps.find((step: OnboardingStep) => 
        !completedSteps.includes(step.id)
      )?.id
      
      return {
        flowId,
        completedSteps,
        currentStep,
        completionPercentage,
        totalTimeSpent
      }
    } catch (error) {
      console.error('Error getting user progress:', error)
      return {
        flowId,
        completedSteps: [],
        completionPercentage: 0,
        totalTimeSpent: 0
      }
    }
  }

  // Private helper methods

  private matchesTargetAudience(userProfile: Record<string, any> = {}, targetAudience: string[]): boolean {
    if (targetAudience.length === 0) return true
    
    // Simple audience matching logic
    for (const criteria of targetAudience) {
      if (criteria === 'new_user' && !userProfile.hasSubscription) return true
      if (criteria === 'existing_user' && userProfile.hasSubscription) return true
      if (criteria === 'mobile' && userProfile.isMobile) return true
      if (criteria === 'desktop' && !userProfile.isMobile) return true
    }
    
    return false
  }

  private async getFlowVariant(userId: string, flowId: string): Promise<string | null> {
    // Check if user is assigned to A/B test for this flow
    const testId = `onboarding_${flowId}`
    const assignment = await KV.hgetall(`user_assignment:${userId}:${testId}`)
    return assignment?.variantId || null
  }

  private async updateFlowAnalytics(flowId: string, stepId: string, eventType: string, value?: number): Promise<void> {
    try {
      const analyticsKey = `flow_analytics:${flowId}:${stepId}`
      await KV.hincrby(analyticsKey, eventType, 1)
      
      if (value !== undefined) {
        const currentTotal = parseInt(await KV.hget(analyticsKey, `${eventType}_total`) || '0')
        const currentCount = parseInt(await KV.hget(analyticsKey, eventType) || '1')
        const newAverage = (currentTotal + value) / currentCount
        
        await KV.hset(analyticsKey, `${eventType}_total`, (currentTotal + value).toString())
        await KV.hset(analyticsKey, `${eventType}_average`, newAverage.toString())
      }
    } catch (error) {
      console.error('Error updating flow analytics:', error)
    }
  }

  private async checkFlowCompletion(userId: string, flowId: string): Promise<void> {
    try {
      const progress = await this.getUserProgress(userId, flowId)
      
      if (progress.completionPercentage === 100) {
        // Flow completed - track conversion
        await KV.hset(`user_onboarding:${userId}:${flowId}`, {
          completed: new Date().toISOString(),
          completionTime: progress.totalTimeSpent.toString()
        })
        
        // Update flow completion analytics
        await this.updateFlowAnalytics(flowId, 'flow', 'completion', progress.totalTimeSpent)
      }
    } catch (error) {
      console.error('Error checking flow completion:', error)
    }
  }
}

// Export singleton instances
export const ABTesting = new ABTestingService()
export const Onboarding = new OnboardingService()

// Helper functions for common operations

/**
 * Get user's A/B test variant for a specific test
 */
export async function getUserVariant(userId: string, testId: string): Promise<string | null> {
  try {
    const assignment = await KV.hgetall(`user_assignment:${userId}:${testId}`)
    return assignment?.variantId || null
  } catch (error) {
    console.error('Error getting user variant:', error)
    return null
  }
}

/**
 * Check if feature is enabled for user (feature flags)
 */
export async function isFeatureEnabled(userId: string, featureName: string): Promise<boolean> {
  try {
    const testId = `feature_${featureName}`
    const variant = await getUserVariant(userId, testId)
    return variant === 'enabled'
  } catch (error) {
    console.error('Error checking feature flag:', error)
    return false
  }
}

/**
 * Track onboarding funnel conversion
 */
export async function trackOnboardingConversion(
  userId: string, 
  step: string, 
  value?: number
): Promise<void> {
  try {
    await ABTesting.trackConversion(userId, 'onboarding_funnel', step, value)
  } catch (error) {
    console.error('Error tracking onboarding conversion:', error)
  }
}