'use client'

import { useState, useEffect } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell, LoadingTableState, EmptyTableState } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DateUtils, NumberUtils } from '@/lib/utils'

interface ATHRecord {
  id: string
  cryptoId: string
  symbol: string
  name: string
  currentPrice: number
  ath: number
  athDate: string
  totalVolume: number
  marketCapRank: number
  lastUpdated: string
}

export function ATHHistoryTable() {
  const [athRecords, setATHRecords] = useState<ATHRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemoData, setIsDemoData] = useState(false)

  useEffect(() => {
    fetchATHHistory()
  }, [])

  const fetchATHHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/crypto/ath-history', {
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        if (response.status === 401) {
          // Authentication required - redirect to login
          window.location.href = '/login'
          return
        }
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch ATH history`)
      }

      const data = await response.json()
      
      // Transform API response to ATHRecord format
      const transformedRecords = (data.athRecords || data.data || []).map((record: any) => ({
        id: record.id,
        cryptoId: record.cryptoId || record.id,
        symbol: record.symbol || 'N/A',
        name: record.name || record.cryptoId || record.id,
        currentPrice: record.currentPrice || 0,
        ath: record.ath || 0,
        athDate: record.athDate || new Date().toISOString(),
        totalVolume: record.totalVolume || 0,
        marketCapRank: record.marketCapRank || 0,
        lastUpdated: record.lastUpdated || new Date().toISOString(),
      }))
      
      setATHRecords(transformedRecords)
      setIsDemoData(data.demo || false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ATH history')
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">❌</div>
        <p className="text-red-600 font-medium">{error}</p>
        <Button onClick={fetchATHHistory} className="mt-4" size="sm">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchATHHistory}
          disabled={loading}
        >
          🔄 Refresh
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Rank</TableHeaderCell>
            <TableHeaderCell>Cryptocurrency</TableHeaderCell>
            <TableHeaderCell>Current Price</TableHeaderCell>
            <TableHeaderCell>All-Time High</TableHeaderCell>
            <TableHeaderCell>ATH Date</TableHeaderCell>
            <TableHeaderCell>24h Trading Volume</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <LoadingTableState rows={10} columns={6} />
          ) : athRecords.length === 0 ? (
            <EmptyTableState
              message="No ATH records found"
              description="New all-time highs will appear here when detected"
              action={
                <Button
                  onClick={fetchATHHistory}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  Refresh Data
                </Button>
              }
            />
          ) : (
            athRecords.map((record) => {
              const isAtATH = record.currentPrice >= record.ath * 0.99 // Within 1% of ATH
              return (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      <span className="font-bold text-lg text-muted-foreground">
                        #{record.marketCapRank}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {record.symbol.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{record.name}</p>
                        <p className="text-sm text-muted-foreground uppercase">
                          {record.symbol}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">
                        ${NumberUtils.formatPrice(record.currentPrice)}
                      </span>
                      {isAtATH && (
                        <Badge variant="ath" size="sm">
                          AT ATH!
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className="font-mono font-medium text-green-600">
                      ${NumberUtils.formatPrice(record.ath)}
                    </span>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">
                        {DateUtils.formatDateTime(record.athDate)}
                      </p>
                      <p className="text-muted-foreground">
                        {DateUtils.getRelativeTime(record.athDate)}
                      </p>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <span className="font-mono text-muted-foreground">
                      {NumberUtils.formatMarketCap(record.totalVolume)}
                    </span>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      {!loading && athRecords.length > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground pt-4">
          <span>
            Total ATH records: {athRecords.length}
          </span>
          <span>
            Last updated: {DateUtils.formatDateTime(new Date())}
          </span>
        </div>
      )}
    </div>
  )
}