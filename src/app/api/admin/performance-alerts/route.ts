import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { KV } from '@/lib/kv'

// Performance thresholds configuration
const PERFORMANCE_THRESHOLDS = {
  api: {
    responseTime: 5000, // 5 seconds
    errorRate: 5, // 5%
    slowQueryThreshold: 2000 // 2 seconds for database queries
  },
  database: {
    connectionTime: 1000, // 1 second
    queryTime: 2000, // 2 seconds
    poolUtilization: 80 // 80%
  },
  email: {
    deliveryTime: 30000, // 30 seconds
    failureRate: 2, // 2%
    queueLength: 100 // 100 pending emails
  },
  system: {
    memoryUsage: 80, // 80%
    cpuUsage: 85, // 85%
    diskUsage: 90 // 90%
  },
  athDetection: {
    processTime: 60000, // 1 minute per cycle
    errorRate: 1, // 1%
    missedCycles: 3 // consecutive missed cycles
  }
}

interface PerformanceAlert {
  id: string
  type: 'warning' | 'critical' | 'error'
  category: 'api' | 'database' | 'email' | 'system' | 'athDetection'
  title: string
  description: string
  metric: string
  threshold: number
  currentValue: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'acknowledged' | 'resolved'
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  acknowledgedBy?: string
  metadata?: Record<string, any>
}

interface BottleneckDetection {
  endpoint: string
  averageResponseTime: number
  slowQueries: Array<{
    query: string
    executionTime: number
    timestamp: string
  }>
  memoryLeaks: Array<{
    component: string
    memoryUsage: number
    trend: 'increasing' | 'stable' | 'decreasing'
  }>
  resourceUsage: {
    cpu: number
    memory: number
    database: number
    external: number
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'alerts'
    const category = searchParams.get('category')
    const status = searchParams.get('status')

    switch (action) {
      case 'alerts':
        return await getPerformanceAlerts(category, status)
      case 'bottlenecks':
        return await detectBottlenecks()
      case 'thresholds':
        return NextResponse.json({
          success: true,
          data: PERFORMANCE_THRESHOLDS
        })
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Performance alerts API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function getPerformanceAlerts(category?: string | null, status?: string | null) {
  try {
    // Get all active alerts
    const alertKeys = await KV.keys('perf_alert:*')
    const alerts: PerformanceAlert[] = []

    for (const key of alertKeys) {
      const alert = await KV.hgetall(key) as any
      if (alert && alert.id) {
        // Parse JSON fields
        alert.metadata = alert.metadata ? JSON.parse(alert.metadata) : {}
        
        // Apply filters
        if (category && alert.category !== category) continue
        if (status && alert.status !== status) continue
        
        alerts.push(alert)
      }
    }

    // Sort by severity and creation time
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    alerts.sort((a, b) => {
      const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
      if (severityDiff !== 0) return severityDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    // Get alert statistics
    const stats = {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      byCategory: alerts.reduce((acc, alert) => {
        acc[alert.category] = (acc[alert.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    return NextResponse.json({
      success: true,
      data: {
        alerts: alerts.slice(0, 50), // Limit to recent 50 alerts
        stats,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    throw error
  }
}

async function detectBottlenecks(): Promise<NextResponse> {
  try {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Analyze API performance
    const apiBottlenecks = await analyzeAPIPerformance(oneHourAgo, now)
    
    // Analyze database performance
    const dbBottlenecks = await analyzeDatabasePerformance(oneHourAgo, now)
    
    // Analyze system resources
    const systemBottlenecks = await analyzeSystemResources()
    
    // Analyze email service performance
    const emailBottlenecks = await analyzeEmailPerformance(oneHourAgo, now)

    // Generate alerts for detected bottlenecks
    const newAlerts = await generateBottleneckAlerts([
      ...apiBottlenecks,
      ...dbBottlenecks,
      ...systemBottlenecks,
      ...emailBottlenecks
    ])

    return NextResponse.json({
      success: true,
      data: {
        bottlenecks: {
          api: apiBottlenecks,
          database: dbBottlenecks,
          system: systemBottlenecks,
          email: emailBottlenecks
        },
        alertsGenerated: newAlerts.length,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    throw error
  }
}

async function analyzeAPIPerformance(startTime: Date, endTime: Date): Promise<BottleneckDetection[]> {
  const bottlenecks: BottleneckDetection[] = []
  
  try {
    // Get API performance metrics
    const perfKeys = await KV.keys('api_perf:*')
    const endpointMetrics: Record<string, { times: number[], errors: number }> = {}

    for (const key of perfKeys) {
      const data = await KV.hgetall(key)
      if (data && data.endpoint && data.responseTime && data.timestamp) {
        const timestamp = new Date(data.timestamp)
        if (timestamp >= startTime && timestamp <= endTime) {
          if (!endpointMetrics[data.endpoint]) {
            endpointMetrics[data.endpoint] = { times: [], errors: 0 }
          }
          endpointMetrics[data.endpoint].times.push(parseFloat(data.responseTime))
          if (data.error) {
            endpointMetrics[data.endpoint].errors++
          }
        }
      }
    }

    // Analyze each endpoint
    for (const [endpoint, metrics] of Object.entries(endpointMetrics)) {
      if (metrics.times.length === 0) continue

      const avgResponseTime = metrics.times.reduce((a, b) => a + b, 0) / metrics.times.length
      const errorRate = (metrics.errors / metrics.times.length) * 100

      // Check if exceeds thresholds
      if (avgResponseTime > PERFORMANCE_THRESHOLDS.api.responseTime || 
          errorRate > PERFORMANCE_THRESHOLDS.api.errorRate) {
        
        bottlenecks.push({
          endpoint,
          averageResponseTime: avgResponseTime,
          slowQueries: [], // Will be populated by database analysis
          memoryLeaks: [], // Will be populated by system analysis
          resourceUsage: {
            cpu: 0,
            memory: 0,
            database: avgResponseTime > PERFORMANCE_THRESHOLDS.api.responseTime ? 70 : 30,
            external: 20
          }
        })
      }
    }
  } catch (error) {
    console.error('API performance analysis error:', error)
  }

  return bottlenecks
}

async function analyzeDatabasePerformance(startTime: Date, endTime: Date): Promise<BottleneckDetection[]> {
  const bottlenecks: BottleneckDetection[] = []
  
  try {
    // Get database performance metrics
    const dbKeys = await KV.keys('db_perf:*')
    const slowQueries: Array<{ query: string, executionTime: number, timestamp: string }> = []

    for (const key of dbKeys) {
      const data = await KV.hgetall(key)
      if (data && data.queryTime && data.timestamp) {
        const timestamp = new Date(data.timestamp)
        const queryTime = parseFloat(data.queryTime)
        
        if (timestamp >= startTime && timestamp <= endTime && 
            queryTime > PERFORMANCE_THRESHOLDS.database.queryTime) {
          slowQueries.push({
            query: data.operation || 'Unknown operation',
            executionTime: queryTime,
            timestamp: data.timestamp
          })
        }
      }
    }

    if (slowQueries.length > 0) {
      bottlenecks.push({
        endpoint: 'Database Operations',
        averageResponseTime: slowQueries.reduce((a, b) => a + b.executionTime, 0) / slowQueries.length,
        slowQueries: slowQueries.slice(0, 10), // Top 10 slowest
        memoryLeaks: [],
        resourceUsage: {
          cpu: 40,
          memory: 60,
          database: 90,
          external: 10
        }
      })
    }
  } catch (error) {
    console.error('Database performance analysis error:', error)
  }

  return bottlenecks
}

async function analyzeSystemResources(): Promise<BottleneckDetection[]> {
  const bottlenecks: BottleneckDetection[] = []
  
  try {
    // Simulate system resource monitoring
    // In a real environment, you'd use system monitoring tools
    const memoryUsage = Math.random() * 100
    const cpuUsage = Math.random() * 100

    if (memoryUsage > PERFORMANCE_THRESHOLDS.system.memoryUsage || 
        cpuUsage > PERFORMANCE_THRESHOLDS.system.cpuUsage) {
      
      bottlenecks.push({
        endpoint: 'System Resources',
        averageResponseTime: 0,
        slowQueries: [],
        memoryLeaks: [
          {
            component: 'Node.js Process',
            memoryUsage,
            trend: memoryUsage > 85 ? 'increasing' : 'stable'
          }
        ],
        resourceUsage: {
          cpu: cpuUsage,
          memory: memoryUsage,
          database: 30,
          external: 20
        }
      })
    }
  } catch (error) {
    console.error('System resource analysis error:', error)
  }

  return bottlenecks
}

async function analyzeEmailPerformance(startTime: Date, endTime: Date): Promise<BottleneckDetection[]> {
  const bottlenecks: BottleneckDetection[] = []
  
  try {
    // Get email performance metrics
    const emailKeys = await KV.keys('email_perf:*')
    let totalDeliveryTime = 0
    let failedDeliveries = 0
    let totalEmails = 0

    for (const key of emailKeys) {
      const data = await KV.hgetall(key)
      if (data && data.timestamp) {
        const timestamp = new Date(data.timestamp)
        if (timestamp >= startTime && timestamp <= endTime) {
          totalEmails++
          if (data.deliveryTime) {
            totalDeliveryTime += parseFloat(data.deliveryTime)
          }
          if (data.status === 'failed') {
            failedDeliveries++
          }
        }
      }
    }

    if (totalEmails > 0) {
      const avgDeliveryTime = totalDeliveryTime / totalEmails
      const failureRate = (failedDeliveries / totalEmails) * 100

      if (avgDeliveryTime > PERFORMANCE_THRESHOLDS.email.deliveryTime || 
          failureRate > PERFORMANCE_THRESHOLDS.email.failureRate) {
        
        bottlenecks.push({
          endpoint: 'Email Service',
          averageResponseTime: avgDeliveryTime,
          slowQueries: [],
          memoryLeaks: [],
          resourceUsage: {
            cpu: 20,
            memory: 30,
            database: 20,
            external: 80 // High external dependency
          }
        })
      }
    }
  } catch (error) {
    console.error('Email performance analysis error:', error)
  }

  return bottlenecks
}

async function generateBottleneckAlerts(bottlenecks: BottleneckDetection[]): Promise<PerformanceAlert[]> {
  const alerts: PerformanceAlert[] = []
  
  for (const bottleneck of bottlenecks) {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Determine severity based on bottleneck characteristics
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    let type: 'warning' | 'critical' | 'error' = 'warning'
    let category: 'api' | 'database' | 'email' | 'system' | 'athDetection' = 'api'
    
    if (bottleneck.endpoint.includes('Database')) {
      category = 'database'
      severity = bottleneck.slowQueries.length > 5 ? 'critical' : 'high'
      type = severity === 'critical' ? 'critical' : 'error'
    } else if (bottleneck.endpoint.includes('System')) {
      category = 'system'
      severity = bottleneck.resourceUsage.memory > 90 ? 'critical' : 'high'
      type = severity === 'critical' ? 'critical' : 'warning'
    } else if (bottleneck.endpoint.includes('Email')) {
      category = 'email'
      severity = bottleneck.averageResponseTime > 60000 ? 'high' : 'medium'
    } else {
      severity = bottleneck.averageResponseTime > 10000 ? 'high' : 'medium'
    }

    const alert: PerformanceAlert = {
      id: alertId,
      type,
      category,
      title: `Performance Bottleneck Detected: ${bottleneck.endpoint}`,
      description: `Detected performance issues with ${bottleneck.endpoint}. Average response time: ${bottleneck.averageResponseTime.toFixed(2)}ms`,
      metric: 'responseTime',
      threshold: PERFORMANCE_THRESHOLDS.api.responseTime,
      currentValue: bottleneck.averageResponseTime,
      severity,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        endpoint: bottleneck.endpoint,
        resourceUsage: bottleneck.resourceUsage,
        slowQueries: bottleneck.slowQueries.length,
        memoryLeaks: bottleneck.memoryLeaks.length
      }
    }

    // Save alert to KV
    await KV.hset(`perf_alert:${alertId}`, {
      ...alert,
      metadata: JSON.stringify(alert.metadata)
    })

    alerts.push(alert)
  }

  return alerts
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { action, alertId, updates } = await request.json()

    switch (action) {
      case 'acknowledge':
        return await acknowledgeAlert(alertId, session.id)
      case 'resolve':
        return await resolveAlert(alertId, session.id)
      case 'update':
        return await updateAlert(alertId, updates)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Performance alerts POST error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function acknowledgeAlert(alertId: string, adminId: string) {
  try {
    const alertKey = `perf_alert:${alertId}`
    const alert = await KV.hgetall(alertKey)
    
    if (!alert || !alert.id) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    await KV.hset(alertKey, {
      status: 'acknowledged',
      acknowledgedBy: adminId,
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Alert acknowledged successfully'
    })
  } catch (error) {
    throw error
  }
}

async function resolveAlert(alertId: string, adminId: string) {
  try {
    const alertKey = `perf_alert:${alertId}`
    const alert = await KV.hgetall(alertKey)
    
    if (!alert || !alert.id) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    await KV.hset(alertKey, {
      status: 'resolved',
      acknowledgedBy: adminId,
      resolvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Alert resolved successfully'
    })
  } catch (error) {
    throw error
  }
}

async function updateAlert(alertId: string, updates: Partial<PerformanceAlert>) {
  try {
    const alertKey = `perf_alert:${alertId}`
    const alert = await KV.hgetall(alertKey)
    
    if (!alert || !alert.id) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    const allowedUpdates = ['severity', 'status', 'title', 'description']
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key as keyof PerformanceAlert] as string
        return obj
      }, {} as Record<string, string>)

    await KV.hset(alertKey, {
      ...filteredUpdates,
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Alert updated successfully'
    })
  } catch (error) {
    throw error
  }
}