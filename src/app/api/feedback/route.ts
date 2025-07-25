import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { StringUtils, DateUtils } from '@/lib/utils'

interface UserFeedback {
  id: string
  userId?: string
  userEmail?: string
  type: 'bug' | 'feature' | 'improvement' | 'complaint' | 'praise' | 'question' | 'other'
  category: 'ui' | 'performance' | 'functionality' | 'design' | 'content' | 'navigation' | 'subscription' | 'notifications' | 'general'
  title: string
  message: string
  rating?: number // 1-5 stars
  page?: string
  userAgent?: string
  screenResolution?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  sentiment: 'positive' | 'neutral' | 'negative'
  status: 'new' | 'in_review' | 'acknowledged' | 'resolved' | 'closed'
  adminNotes?: string
  assignedTo?: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
  attachments?: string[]
  upvotes: number
  tags: string[]
}

interface FeedbackAnalytics {
  timestamp: string
  summary: {
    totalFeedback: number
    newFeedback: number
    averageRating: number
    responseRate: number
    satisfactionScore: number
  }
  sentimentBreakdown: {
    positive: number
    neutral: number
    negative: number
  }
  typeBreakdown: Record<string, number>
  categoryBreakdown: Record<string, number>
  priorityBreakdown: Record<string, number>
  statusBreakdown: Record<string, number>
  recentFeedback: UserFeedback[]
  topIssues: Array<{
    title: string
    count: number
    category: string
    averageRating: number
    sentiment: string
  }>
  trends: {
    dailyFeedback: Array<{
      date: string
      count: number
      averageRating: number
      positiveCount: number
      negativeCount: number
    }>
    popularFeatureRequests: Array<{
      title: string
      upvotes: number
      category: string
      createdAt: string
    }>
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('💬 Feedback API: Getting feedback data')
    
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'all'
    const category = searchParams.get('category') || 'all'
    const status = searchParams.get('status') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Check if this is an admin request for analytics
    const isAdmin = searchParams.get('admin') === 'true'
    
    if (isAdmin) {
      // Verify admin authentication for analytics
      const session = await Auth.requireAuth()
      if (session.user.role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        )
      }
      
      const analytics = await generateFeedbackAnalytics()
      return NextResponse.json({
        success: true,
        data: analytics
      })
    }
    
    // Get public feedback (for feature requests, etc.)
    const feedback = await getFeedback({ type, category, status, limit })
    
    return NextResponse.json({
      success: true,
      data: feedback
    })

  } catch (error) {
    console.error('❌ Feedback API: Failed to get feedback:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get feedback'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('💬 Feedback API: Creating new feedback')
    
    const body = await request.json()
    const {
      type,
      category,
      title,
      message,
      rating,
      page,
      userAgent,
      screenResolution,
      attachments
    } = body

    // Validate required fields
    if (!type || !title || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, title, message' },
        { status: 400 }
      )
    }

    // Get user info if authenticated (optional)
    let userId: string | undefined
    let userEmail: string | undefined
    
    try {
      const session = await Auth.getSession()
      if (session?.user) {
        userId = session.user.id
        userEmail = session.user.email
      }
    } catch (error) {
      // Not authenticated - that's okay for feedback
      console.log('Feedback submitted anonymously')
    }

    // Create feedback record
    const feedback = await createFeedback({
      userId,
      userEmail,
      type,
      category: category || 'general',
      title,
      message,
      rating,
      page,
      userAgent,
      screenResolution,
      attachments: attachments || []
    })

    console.log(`✅ Feedback API: Created feedback ${feedback.id}`)
    
    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
      message: 'Feedback submitted successfully'
    })

  } catch (error) {
    console.error('❌ Feedback API: Failed to create feedback:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit feedback'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    console.log('💬 Feedback API: Updating feedback')
    
    // Verify admin authentication
    const session = await Auth.requireAuth()
    
    const body = await request.json()
    const { feedbackId, status, adminNotes, assignedTo, priority, tags } = body

    if (!feedbackId) {
      return NextResponse.json(
        { success: false, error: 'Missing feedbackId' },
        { status: 400 }
      )
    }

    // Update feedback
    await updateFeedback(feedbackId, {
      status,
      adminNotes,
      assignedTo,
      priority,
      tags,
      updatedBy: session.user.email
    })

    console.log(`✅ Feedback API: Updated feedback ${feedbackId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Feedback updated successfully'
    })

  } catch (error) {
    console.error('❌ Feedback API: Failed to update feedback:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update feedback'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('💬 Feedback API: Upvoting feedback')
    
    const body = await request.json()
    const { feedbackId } = body

    if (!feedbackId) {
      return NextResponse.json(
        { success: false, error: 'Missing feedbackId' },
        { status: 400 }
      )
    }

    // Increment upvote count
    await upvoteFeedback(feedbackId)

    console.log(`✅ Feedback API: Upvoted feedback ${feedbackId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Feedback upvoted successfully'
    })

  } catch (error) {
    console.error('❌ Feedback API: Failed to upvote feedback:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upvote feedback'
    }, { status: 500 })
  }
}

async function createFeedback(feedbackData: {
  userId?: string
  userEmail?: string
  type: string
  category: string
  title: string
  message: string
  rating?: number
  page?: string
  userAgent?: string
  screenResolution?: string
  attachments: string[]
}): Promise<UserFeedback> {
  try {
    const feedbackId = StringUtils.generateId(16)
    const now = DateUtils.getCurrentISOString()
    
    // Analyze sentiment (simple keyword-based analysis)
    const sentiment = analyzeSentiment(feedbackData.message)
    
    // Determine priority based on type and content
    const priority = determinePriority(feedbackData.type, feedbackData.message, sentiment)
    
    const feedback: UserFeedback = {
      id: feedbackId,
      userId: feedbackData.userId,
      userEmail: feedbackData.userEmail,
      type: feedbackData.type as any,
      category: feedbackData.category as any,
      title: feedbackData.title,
      message: feedbackData.message,
      rating: feedbackData.rating,
      page: feedbackData.page,
      userAgent: feedbackData.userAgent,
      screenResolution: feedbackData.screenResolution,
      priority,
      sentiment,
      status: 'new',
      createdAt: now,
      updatedAt: now,
      attachments: feedbackData.attachments,
      upvotes: 0,
      tags: generateTags(feedbackData.type, feedbackData.category, feedbackData.message)
    }
    
    // Store in KV database
    const feedbackKey = `feedback:${feedbackId}`
    const feedbackRecord: Record<string, string> = {
      id: feedbackId,
      type: feedback.type,
      category: feedback.category,
      title: feedback.title,
      message: feedback.message,
      priority: feedback.priority,
      sentiment: feedback.sentiment,
      status: feedback.status,
      created_at: feedback.createdAt,
      updated_at: feedback.updatedAt,
      upvotes: feedback.upvotes.toString(),
      tags: feedback.tags.join(',')
    }
    
    // Add optional fields
    if (feedback.userId) feedbackRecord.user_id = feedback.userId
    if (feedback.userEmail) feedbackRecord.user_email = feedback.userEmail
    if (feedback.rating) feedbackRecord.rating = feedback.rating.toString()
    if (feedback.page) feedbackRecord.page = feedback.page
    if (feedback.userAgent) feedbackRecord.user_agent = feedback.userAgent
    if (feedback.screenResolution) feedbackRecord.screen_resolution = feedback.screenResolution
    if (feedback.attachments && feedback.attachments.length > 0) {
      feedbackRecord.attachments = JSON.stringify(feedback.attachments)
    }
    
    await KV.hsetall(feedbackKey, feedbackRecord)
    
    // Set TTL for feedback (keep for 2 years)
    await KV.expire(feedbackKey, 2 * 365 * 24 * 60 * 60)
    
    // Add to category and type indices
    await KV.sadd(`feedback:category:${feedback.category}`, feedbackId)
    await KV.sadd(`feedback:type:${feedback.type}`, feedbackId)
    await KV.sadd(`feedback:status:${feedback.status}`, feedbackId)
    await KV.sadd(`feedback:priority:${feedback.priority}`, feedbackId)
    
    // Update daily statistics
    const date = new Date().toISOString().split('T')[0]
    const statsKey = `feedback:stats:${date}`
    await KV.hincrby(statsKey, 'total_feedback', 1)
    await KV.hincrby(statsKey, `type_${feedback.type}`, 1)
    await KV.hincrby(statsKey, `category_${feedback.category}`, 1)
    await KV.hincrby(statsKey, `sentiment_${feedback.sentiment}`, 1)
    
    if (feedback.rating) {
      const currentRatingSum = parseFloat(await KV.hget(statsKey, 'rating_sum') || '0')
      const currentRatingCount = parseInt(await KV.hget(statsKey, 'rating_count') || '0')
      await KV.hset(statsKey, 'rating_sum', (currentRatingSum + feedback.rating).toString())
      await KV.hset(statsKey, 'rating_count', (currentRatingCount + 1).toString())
    }
    
    // Set TTL for daily stats (keep for 1 year)
    await KV.expire(statsKey, 365 * 24 * 60 * 60)
    
    return feedback
    
  } catch (error) {
    console.error('Failed to create feedback:', error)
    throw error
  }
}

async function getFeedback(filters: {
  type: string
  category: string
  status: string
  limit: number
}): Promise<UserFeedback[]> {
  try {
    const feedbackKeys = await KV.keys('feedback:*')
    const feedback: UserFeedback[] = []
    
    for (const key of feedbackKeys.slice(0, filters.limit * 2)) { // Get more than needed for filtering
      if (key.includes(':category:') || key.includes(':type:') || key.includes(':stats:')) continue
      
      const feedbackData = await KV.hgetall(key)
      if (feedbackData && feedbackData.id) {
        const feedbackItem: UserFeedback = {
          id: feedbackData.id,
          userId: feedbackData.user_id,
          userEmail: feedbackData.user_email,
          type: feedbackData.type as any,
          category: feedbackData.category as any,
          title: feedbackData.title,
          message: feedbackData.message,
          rating: feedbackData.rating ? parseInt(feedbackData.rating) : undefined,
          page: feedbackData.page,
          userAgent: feedbackData.user_agent,
          screenResolution: feedbackData.screen_resolution,
          priority: feedbackData.priority as any,
          sentiment: feedbackData.sentiment as any,
          status: feedbackData.status as any,
          adminNotes: feedbackData.admin_notes,
          assignedTo: feedbackData.assigned_to,
          resolvedAt: feedbackData.resolved_at,
          createdAt: feedbackData.created_at,
          updatedAt: feedbackData.updated_at,
          attachments: feedbackData.attachments ? JSON.parse(feedbackData.attachments) : [],
          upvotes: parseInt(feedbackData.upvotes || '0'),
          tags: feedbackData.tags ? feedbackData.tags.split(',') : []
        }
        
        // Apply filters
        if (filters.type !== 'all' && feedbackItem.type !== filters.type) continue
        if (filters.category !== 'all' && feedbackItem.category !== filters.category) continue
        if (filters.status !== 'all' && feedbackItem.status !== filters.status) continue
        
        feedback.push(feedbackItem)
      }
    }
    
    // Sort by creation date (newest first) and limit
    return feedback
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, filters.limit)
    
  } catch (error) {
    console.error('Failed to get feedback:', error)
    return []
  }
}

async function updateFeedback(feedbackId: string, updates: {
  status?: string
  adminNotes?: string
  assignedTo?: string
  priority?: string
  tags?: string[]
  updatedBy: string
}): Promise<void> {
  try {
    const feedbackKey = `feedback:${feedbackId}`
    const updateData: Record<string, string> = {
      updated_at: DateUtils.getCurrentISOString(),
      updated_by: updates.updatedBy
    }
    
    if (updates.status) {
      updateData.status = updates.status
      // Update status index
      await KV.sadd(`feedback:status:${updates.status}`, feedbackId)
    }
    if (updates.adminNotes) updateData.admin_notes = updates.adminNotes
    if (updates.assignedTo) updateData.assigned_to = updates.assignedTo
    if (updates.priority) {
      updateData.priority = updates.priority
      await KV.sadd(`feedback:priority:${updates.priority}`, feedbackId)
    }
    if (updates.tags) updateData.tags = updates.tags.join(',')
    
    // Mark as resolved if status is resolved or closed
    if (updates.status === 'resolved' || updates.status === 'closed') {
      updateData.resolved_at = DateUtils.getCurrentISOString()
    }
    
    await KV.hsetall(feedbackKey, updateData)
    
  } catch (error) {
    console.error('Failed to update feedback:', error)
    throw error
  }
}

async function upvoteFeedback(feedbackId: string): Promise<void> {
  try {
    const feedbackKey = `feedback:${feedbackId}`
    await KV.hincrby(feedbackKey, 'upvotes', 1)
    await KV.hset(feedbackKey, 'updated_at', DateUtils.getCurrentISOString())
  } catch (error) {
    console.error('Failed to upvote feedback:', error)
    throw error
  }
}

async function generateFeedbackAnalytics(): Promise<FeedbackAnalytics> {
  try {
    // Get all feedback
    const allFeedback = await getFeedback({ type: 'all', category: 'all', status: 'all', limit: 1000 })
    
    // Calculate summary metrics
    const totalFeedback = allFeedback.length
    const newFeedback = allFeedback.filter(f => f.status === 'new').length
    const ratingsGiven = allFeedback.filter(f => f.rating).map(f => f.rating!)
    const averageRating = ratingsGiven.length > 0 
      ? ratingsGiven.reduce((a, b) => a + b, 0) / ratingsGiven.length 
      : 0
    
    const resolvedFeedback = allFeedback.filter(f => f.status === 'resolved' || f.status === 'closed').length
    const responseRate = totalFeedback > 0 ? (resolvedFeedback / totalFeedback) * 100 : 0
    
    // Satisfaction score based on ratings and sentiment
    const positiveCount = allFeedback.filter(f => f.sentiment === 'positive').length
    const satisfactionScore = totalFeedback > 0 ? (positiveCount / totalFeedback) * 100 : 0
    
    // Sentiment breakdown
    const sentimentBreakdown = {
      positive: allFeedback.filter(f => f.sentiment === 'positive').length,
      neutral: allFeedback.filter(f => f.sentiment === 'neutral').length,
      negative: allFeedback.filter(f => f.sentiment === 'negative').length
    }
    
    // Category and type breakdowns
    const typeBreakdown: Record<string, number> = {}
    const categoryBreakdown: Record<string, number> = {}
    const priorityBreakdown: Record<string, number> = {}
    const statusBreakdown: Record<string, number> = {}
    
    allFeedback.forEach(feedback => {
      typeBreakdown[feedback.type] = (typeBreakdown[feedback.type] || 0) + 1
      categoryBreakdown[feedback.category] = (categoryBreakdown[feedback.category] || 0) + 1
      priorityBreakdown[feedback.priority] = (priorityBreakdown[feedback.priority] || 0) + 1
      statusBreakdown[feedback.status] = (statusBreakdown[feedback.status] || 0) + 1
    })
    
    // Recent feedback (last 10)
    const recentFeedback = allFeedback.slice(0, 10)
    
    // Top issues (most upvoted or frequently reported)
    const issueGroups: Record<string, {
      title: string
      count: number
      category: string
      totalRating: number
      ratingCount: number
      sentiment: string
    }> = {}
    
    allFeedback.forEach(feedback => {
      const key = feedback.title.toLowerCase()
      if (!issueGroups[key]) {
        issueGroups[key] = {
          title: feedback.title,
          count: 0,
          category: feedback.category,
          totalRating: 0,
          ratingCount: 0,
          sentiment: feedback.sentiment
        }
      }
      issueGroups[key].count++
      if (feedback.rating) {
        issueGroups[key].totalRating += feedback.rating
        issueGroups[key].ratingCount++
      }
    })
    
    const topIssues = Object.values(issueGroups)
      .map(issue => ({
        title: issue.title,
        count: issue.count,
        category: issue.category,
        averageRating: issue.ratingCount > 0 ? issue.totalRating / issue.ratingCount : 0,
        sentiment: issue.sentiment
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    // Generate daily trends (last 7 days)
    const dailyFeedback = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayFeedback = allFeedback.filter(f => f.createdAt.startsWith(dateStr))
      const dayRatings = dayFeedback.filter(f => f.rating).map(f => f.rating!)
      
      dailyFeedback.push({
        date: dateStr,
        count: dayFeedback.length,
        averageRating: dayRatings.length > 0 ? dayRatings.reduce((a, b) => a + b, 0) / dayRatings.length : 0,
        positiveCount: dayFeedback.filter(f => f.sentiment === 'positive').length,
        negativeCount: dayFeedback.filter(f => f.sentiment === 'negative').length
      })
    }
    
    // Popular feature requests
    const featureRequests = allFeedback
      .filter(f => f.type === 'feature')
      .sort((a, b) => b.upvotes - a.upvotes)
      .slice(0, 5)
      .map(f => ({
        title: f.title,
        upvotes: f.upvotes,
        category: f.category,
        createdAt: f.createdAt
      }))
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalFeedback,
        newFeedback,
        averageRating: Math.round(averageRating * 100) / 100,
        responseRate: Math.round(responseRate * 100) / 100,
        satisfactionScore: Math.round(satisfactionScore * 100) / 100
      },
      sentimentBreakdown,
      typeBreakdown,
      categoryBreakdown,
      priorityBreakdown,
      statusBreakdown,
      recentFeedback,
      topIssues,
      trends: {
        dailyFeedback,
        popularFeatureRequests: featureRequests
      }
    }
    
  } catch (error) {
    console.error('Failed to generate feedback analytics:', error)
    throw error
  }
}

function analyzeSentiment(message: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['love', 'great', 'awesome', 'excellent', 'amazing', 'perfect', 'wonderful', 'fantastic', 'good', 'nice', 'helpful', 'useful', 'easy', 'fast', 'smooth', 'clean', 'beautiful', 'impressed', 'satisfied', 'happy', 'pleased', 'thank']
  const negativeWords = ['hate', 'terrible', 'awful', 'horrible', 'bad', 'worst', 'sucks', 'broken', 'slow', 'confusing', 'difficult', 'annoying', 'frustrating', 'disappointed', 'angry', 'problem', 'issue', 'bug', 'error', 'crash', 'fail', 'wrong', 'useless']
  
  const lowerMessage = message.toLowerCase()
  let positiveScore = 0
  let negativeScore = 0
  
  positiveWords.forEach(word => {
    if (lowerMessage.includes(word)) positiveScore++
  })
  
  negativeWords.forEach(word => {
    if (lowerMessage.includes(word)) negativeScore++
  })
  
  if (positiveScore > negativeScore) return 'positive'
  if (negativeScore > positiveScore) return 'negative'
  return 'neutral'
}

function determinePriority(type: string, message: string, sentiment: string): 'low' | 'medium' | 'high' | 'critical' {
  const urgentWords = ['urgent', 'critical', 'emergency', 'broken', 'crash', 'error', 'bug', 'not working', 'cant', 'unable', 'lost', 'data', 'payment', 'security']
  
  // Bug reports and complaints are higher priority
  if (type === 'bug' || type === 'complaint') {
    if (urgentWords.some(word => message.toLowerCase().includes(word))) {
      return 'critical'
    }
    return sentiment === 'negative' ? 'high' : 'medium'
  }
  
  // Feature requests are usually lower priority
  if (type === 'feature' || type === 'improvement') {
    return 'low'
  }
  
  // Questions and praise are medium priority
  if (type === 'question') return 'medium'
  if (type === 'praise') return 'low'
  
  return 'medium'
}

function generateTags(type: string, category: string, message: string): string[] {
  const tags = [type, category]
  
  // Add tags based on message content
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('mobile') || lowerMessage.includes('phone')) tags.push('mobile')
  if (lowerMessage.includes('desktop') || lowerMessage.includes('computer')) tags.push('desktop')
  if (lowerMessage.includes('slow') || lowerMessage.includes('performance')) tags.push('performance')
  if (lowerMessage.includes('design') || lowerMessage.includes('ui')) tags.push('design')
  if (lowerMessage.includes('payment') || lowerMessage.includes('subscription')) tags.push('payment')
  if (lowerMessage.includes('notification') || lowerMessage.includes('email')) tags.push('notifications')
  if (lowerMessage.includes('login') || lowerMessage.includes('auth')) tags.push('authentication')
  
  return [...new Set(tags)] // Remove duplicates
}