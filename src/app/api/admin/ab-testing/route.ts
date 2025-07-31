import { NextRequest, NextResponse } from 'next/server'
import { validateServerSession } from '@/lib/auth'
import { ABTesting, Onboarding } from '@/lib/ab-testing'

export async function GET(request: NextRequest) {
  try {
    const session = await validateServerSession()
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'tests'
    const testId = searchParams.get('testId')
    const flowId = searchParams.get('flowId')

    switch (action) {
      case 'tests':
        return await getActiveTests()
      case 'test':
        if (!testId) {
          return NextResponse.json({ error: 'Test ID required' }, { status: 400 })
        }
        return await getTest(testId)
      case 'results':
        if (!testId) {
          return NextResponse.json({ error: 'Test ID required' }, { status: 400 })
        }
        return await getTestResults(testId)
      case 'flows':
        return await getOnboardingFlows()
      case 'flow':
        if (!flowId) {
          return NextResponse.json({ error: 'Flow ID required' }, { status: 400 })
        }
        return await getOnboardingFlow(flowId)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('A/B testing API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getActiveTests() {
  try {
    const tests = await ABTesting.getActiveTests()
    
    // Get results for each test
    const testsWithResults = await Promise.all(
      tests.map(async (test) => ({
        ...test,
        results: await ABTesting.getTestResults(test.id)
      }))
    )
    
    return NextResponse.json({
      success: true,
      data: {
        tests: testsWithResults,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    throw error
  }
}

async function getTest(testId: string) {
  try {
    const test = await ABTesting.getTest(testId)
    
    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: test
    })
  } catch (error) {
    throw error
  }
}

async function getTestResults(testId: string) {
  try {
    const results = await ABTesting.getTestResults(testId)
    
    if (!results) {
      return NextResponse.json({ error: 'Test results not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: results
    })
  } catch (error) {
    throw error
  }
}

async function getOnboardingFlows() {
  try {
    // This would get all onboarding flows - simplified for now
    const flows = [
      {
        id: 'flow_1',
        name: 'New User Onboarding',
        description: 'Standard onboarding flow for new users',
        isActive: true,
        steps: [
          {
            id: 'welcome',
            name: 'Welcome',
            description: 'Welcome message and app introduction',
            component: 'WelcomeStep',
            order: 1,
            isRequired: true,
            completionCriteria: ['viewed'],
            analytics: { views: 250, completions: 200, dropoffRate: 20, averageTimeSpent: 45 }
          },
          {
            id: 'profile_setup',
            name: 'Profile Setup',
            description: 'User profile and preferences setup',
            component: 'ProfileSetupStep',
            order: 2,
            isRequired: true,
            completionCriteria: ['profile_completed'],
            analytics: { views: 200, completions: 150, dropoffRate: 25, averageTimeSpent: 120 }
          },
          {
            id: 'subscription_intro',
            name: 'Subscription Introduction',
            description: 'Introduction to subscription benefits',
            component: 'SubscriptionIntroStep',
            order: 3,
            isRequired: false,
            completionCriteria: ['viewed', 'subscription_selected'],
            analytics: { views: 150, completions: 75, dropoffRate: 50, averageTimeSpent: 180 }
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
    
    return NextResponse.json({
      success: true,
      data: { flows }
    })
  } catch (error) {
    throw error
  }
}

async function getOnboardingFlow(flowId: string) {
  try {
    // Simplified - would get actual flow from database
    return NextResponse.json({
      success: true,
      data: {
        id: flowId,
        name: 'Sample Flow',
        steps: []
      }
    })
  } catch (error) {
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await validateServerSession()
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { action, ...data } = await request.json()

    switch (action) {
      case 'create_test':
        return await createTest(data, session.id)
      case 'complete_test':
        return await completeTest(data.testId)
      case 'create_flow':
        return await createOnboardingFlow(data)
      case 'track_conversion':
        return await trackConversion(data)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('A/B testing POST error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function createTest(testData: any, createdBy: string) {
  try {
    const testId = await ABTesting.createTest({
      ...testData,
      createdBy
    })
    
    return NextResponse.json({
      success: true,
      message: 'A/B test created successfully',
      data: { testId }
    })
  } catch (error) {
    throw error
  }
}

async function completeTest(testId: string) {
  try {
    const results = await ABTesting.completeTest(testId)
    
    if (!results) {
      return NextResponse.json({ error: 'Test not found or already completed' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'A/B test completed successfully',
      data: { results }
    })
  } catch (error) {
    throw error
  }
}

async function createOnboardingFlow(flowData: any) {
  try {
    const flowId = await Onboarding.createOnboardingFlow(flowData)
    
    return NextResponse.json({
      success: true,
      message: 'Onboarding flow created successfully',
      data: { flowId }
    })
  } catch (error) {
    throw error
  }
}

async function trackConversion(data: any) {
  try {
    await ABTesting.trackConversion(
      data.userId,
      data.testId,
      data.eventType,
      data.value,
      data.metadata
    )
    
    return NextResponse.json({
      success: true,
      message: 'Conversion tracked successfully'
    })
  } catch (error) {
    throw error
  }
}