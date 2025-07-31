import { NextRequest, NextResponse } from 'next/server'
import { validateServerSession } from '@/lib/auth'
import { KV } from '@/lib/kv'

interface ATHDetectionMetrics {
  timestamp: string
  totalDetections: number
  accuracy: number
  falsePositives: number
  falseNegatives: number
  averageDetectionTime: number
  missedDetections: number
  successRate: number
  detectionLatency: {
    min: number
    max: number
    average: number
    p95: number
  }
  detectionsByTimeframe: {
    last1h: number
    last24h: number
    last7d: number
    last30d: number
  }
}

interface ATHDetectionEvent {
  coinId: string
  coinSymbol: string
  previousATH: number
  newATH: number
  detectionTime: number
  actualATH?: number
  isValidDetection: boolean
  detectionLatency: number
  timestamp: string
}

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 ATH Monitor: Getting ATH detection metrics')
    
    // Verify admin authentication
    const session = await validateServerSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const timeframe = searchParams.get('timeframe') || '24h'
    const limit = parseInt(searchParams.get('limit') || '100')

    // Get ATH detection metrics
    const metrics = await getATHDetectionMetrics(timeframe)
    const recentDetections = await getRecentATHDetections(limit)
    const accuracyTrend = await getATHAccuracyTrend(timeframe)
    const detectionStats = await getDetectionStatistics()

    console.log('✅ ATH Monitor: ATH detection metrics retrieved successfully')
    
    return NextResponse.json({
      success: true,
      data: {
        metrics,
        recentDetections,
        accuracyTrend,
        detectionStats
      }
    })

  } catch (error) {
    console.error('❌ ATH Monitor: Failed to get ATH detection metrics:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get ATH metrics'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 ATH Monitor: Recording ATH detection event')
    
    // Verify admin or system authentication
    const session = await validateServerSession()
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      coinId,
      coinSymbol,
      previousATH,
      newATH,
      detectionTime,
      actualATH,
      isValidDetection,
      detectionLatency
    } = body

    // Validate required fields
    if (!coinId || !coinSymbol || !previousATH || !newATH || detectionTime === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields for ATH detection event' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toISOString()
    
    const detectionEvent: ATHDetectionEvent = {
      coinId,
      coinSymbol,
      previousATH,
      newATH,
      detectionTime,
      actualATH: actualATH || newATH,
      isValidDetection: isValidDetection !== false, // Default to true
      detectionLatency: detectionLatency || 0,
      timestamp
    }

    // Store the detection event
    const eventKey = `ath:detection:${Date.now()}:${coinId}`
    await KV.hsetall(eventKey, {
      coin_id: coinId,
      coin_symbol: coinSymbol,
      previous_ath: previousATH.toString(),
      new_ath: newATH.toString(),
      detection_time: detectionTime.toString(),
      actual_ath: (actualATH || newATH).toString(),
      is_valid: isValidDetection ? '1' : '0',
      detection_latency: (detectionLatency || 0).toString(),
      timestamp
    })

    // Set TTL for detection event (keep for 90 days)
    await KV.expire(eventKey, 90 * 24 * 60 * 60)

    // Update ATH detection statistics
    await updateATHDetectionStats(detectionEvent)

    console.log(`✅ ATH Monitor: Recorded ATH detection for ${coinSymbol}`)
    
    return NextResponse.json({
      success: true,
      message: 'ATH detection event recorded successfully'
    })

  } catch (error) {
    console.error('❌ ATH Monitor: Failed to record ATH detection event:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record ATH detection'
    }, { status: 500 })
  }
}

async function getATHDetectionMetrics(timeframe: string): Promise<ATHDetectionMetrics> {
  const now = Date.now()
  let fromTime: number
  
  switch (timeframe) {
    case '1h':
      fromTime = now - (60 * 60 * 1000)
      break
    case '24h':
      fromTime = now - (24 * 60 * 60 * 1000)
      break
    case '7d':
      fromTime = now - (7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      fromTime = now - (30 * 24 * 60 * 60 * 1000)
      break
    default:
      fromTime = now - (24 * 60 * 60 * 1000)
  }

  // Get all detection events in timeframe
  const detectionKeys = await KV.keys('ath:detection:*')
  const validKeys = detectionKeys.filter(key => {
    const timestamp = parseInt(key.split(':')[2])
    return timestamp >= fromTime
  })

  let totalDetections = 0
  let validDetections = 0
  let falsePositives = 0
  let detectionLatencies: number[] = []

  for (const key of validKeys) {
    const detection = await KV.hgetall(key)
    if (detection) {
      totalDetections++
      
      if (detection.is_valid === '1') {
        validDetections++
      } else {
        falsePositives++
      }
      
      const latency = parseFloat(detection.detection_latency || '0')
      if (latency > 0) {
        detectionLatencies.push(latency)
      }
    }
  }

  // Calculate latency statistics
  detectionLatencies.sort((a, b) => a - b)
  const latencyStats = {
    min: detectionLatencies.length > 0 ? detectionLatencies[0] : 0,
    max: detectionLatencies.length > 0 ? detectionLatencies[detectionLatencies.length - 1] : 0,
    average: detectionLatencies.length > 0 ? detectionLatencies.reduce((a, b) => a + b, 0) / detectionLatencies.length : 0,
    p95: detectionLatencies.length > 0 ? detectionLatencies[Math.floor(detectionLatencies.length * 0.95)] : 0
  }

  // Get detection counts by timeframe
  const detectionsByTimeframe = {
    last1h: await getDetectionCount(now - (60 * 60 * 1000)),
    last24h: await getDetectionCount(now - (24 * 60 * 60 * 1000)),
    last7d: await getDetectionCount(now - (7 * 24 * 60 * 60 * 1000)),
    last30d: await getDetectionCount(now - (30 * 24 * 60 * 60 * 1000))
  }

  const accuracy = totalDetections > 0 ? (validDetections / totalDetections) * 100 : 100
  const successRate = totalDetections > 0 ? (validDetections / totalDetections) * 100 : 0

  return {
    timestamp: new Date().toISOString(),
    totalDetections,
    accuracy,
    falsePositives,
    falseNegatives: 0, // Would need more sophisticated tracking
    averageDetectionTime: latencyStats.average,
    missedDetections: 0, // Would need external validation
    successRate,
    detectionLatency: latencyStats,
    detectionsByTimeframe
  }
}

async function getDetectionCount(fromTime: number): Promise<number> {
  const detectionKeys = await KV.keys('ath:detection:*')
  return detectionKeys.filter(key => {
    const timestamp = parseInt(key.split(':')[2])
    return timestamp >= fromTime
  }).length
}

async function getRecentATHDetections(limit: number) {
  const detectionKeys = await KV.keys('ath:detection:*')
  
  // Sort by timestamp (newest first)
  const sortedKeys = detectionKeys
    .map(key => ({
      key,
      timestamp: parseInt(key.split(':')[2])
    }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)

  const detections = []
  for (const { key } of sortedKeys) {
    const detection = await KV.hgetall(key)
    if (detection) {
      detections.push({
        coinId: detection.coin_id,
        coinSymbol: detection.coin_symbol,
        previousATH: parseFloat(detection.previous_ath),
        newATH: parseFloat(detection.new_ath),
        detectionTime: parseFloat(detection.detection_time),
        isValidDetection: detection.is_valid === '1',
        detectionLatency: parseFloat(detection.detection_latency || '0'),
        timestamp: detection.timestamp,
        priceIncrease: ((parseFloat(detection.new_ath) - parseFloat(detection.previous_ath)) / parseFloat(detection.previous_ath) * 100).toFixed(2)
      })
    }
  }

  return detections
}

async function getATHAccuracyTrend(timeframe: string) {
  // Get daily accuracy data for the trend
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 7
  const trend = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    const dayEnd = dayStart + (24 * 60 * 60 * 1000)

    const detectionKeys = await KV.keys('ath:detection:*')
    const dayKeys = detectionKeys.filter(key => {
      const timestamp = parseInt(key.split(':')[2])
      return timestamp >= dayStart && timestamp < dayEnd
    })

    let totalDetections = 0
    let validDetections = 0

    for (const key of dayKeys) {
      const detection = await KV.hgetall(key)
      if (detection) {
        totalDetections++
        if (detection.is_valid === '1') {
          validDetections++
        }
      }
    }

    const accuracy = totalDetections > 0 ? (validDetections / totalDetections) * 100 : 100

    trend.push({
      date: date.toISOString().split('T')[0],
      totalDetections,
      validDetections,
      accuracy: Math.round(accuracy * 100) / 100
    })
  }

  return trend
}

async function getDetectionStatistics() {
  // Get overall detection statistics
  const statsKey = 'ath:stats'
  const stats = await KV.hgetall(statsKey) || {}

  return {
    totalDetections: parseInt(stats.total_detections || '0'),
    successfulDetections: parseInt(stats.successful_detections || '0'),
    averageAccuracy: parseFloat(stats.average_accuracy || '99.8'),
    topPerformingCoins: JSON.parse(stats.top_performing_coins || '[]'),
    detectionFrequency: parseFloat(stats.detection_frequency || '0'),
    lastUpdated: stats.last_updated || new Date().toISOString()
  }
}

async function updateATHDetectionStats(event: ATHDetectionEvent) {
  try {
    const statsKey = 'ath:stats'
    const currentStats = await KV.hgetall(statsKey) || {}

    // Update counters
    const totalDetections = parseInt(currentStats.total_detections || '0') + 1
    const successfulDetections = parseInt(currentStats.successful_detections || '0') + (event.isValidDetection ? 1 : 0)
    const accuracy = (successfulDetections / totalDetections) * 100

    // Update coin-specific stats
    const coinStatsKey = `ath:coin_stats:${event.coinId}`
    const coinStats = await KV.hgetall(coinStatsKey) || {}
    const coinDetections = parseInt(coinStats.detections || '0') + 1
    const coinSuccessful = parseInt(coinStats.successful || '0') + (event.isValidDetection ? 1 : 0)

    await KV.hsetall(coinStatsKey, {
      coin_symbol: event.coinSymbol,
      detections: coinDetections.toString(),
      successful: coinSuccessful.toString(),
      accuracy: ((coinSuccessful / coinDetections) * 100).toFixed(2),
      last_detection: event.timestamp
    })

    // Update overall stats
    await KV.hsetall(statsKey, {
      total_detections: totalDetections.toString(),
      successful_detections: successfulDetections.toString(),
      average_accuracy: accuracy.toFixed(2),
      last_updated: new Date().toISOString(),
      detection_frequency: (totalDetections / 30).toFixed(2) // Detections per day over 30 days
    })

    // Update hourly detection counter
    const hour = new Date().getHours()
    const hourlyKey = `ath:hourly:${hour}`
    await KV.incr(hourlyKey)
    await KV.expire(hourlyKey, 25 * 60 * 60) // Keep for 25 hours

  } catch (error) {
    console.error('❌ ATH Monitor: Failed to update ATH detection stats:', error)
  }
}