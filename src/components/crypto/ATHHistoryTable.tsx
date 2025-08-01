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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalRecords, setTotalRecords] = useState(0)
  
  // Sorting state
  const [sortField, setSortField] = useState<'marketCapRank' | 'athDate'>('marketCapRank')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    fetchATHHistory()
  }, [currentPage, pageSize, sortField, sortDirection])

  const fetchATHHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Add pagination and sorting parameters to the API call
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy: sortField,
        sortOrder: sortDirection,
      })
      
      const response = await fetch(`/api/crypto/ath-history?${params}`, {
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
      setTotalRecords(data.totalRecords || transformedRecords.length)
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

  // Calculate pagination info
  const totalPages = Math.ceil(totalRecords / pageSize)
  const startRecord = (currentPage - 1) * pageSize + 1
  const endRecord = Math.min(currentPage * pageSize, totalRecords)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page when changing page size
  }

  const handleSortChange = (field: 'marketCapRank' | 'athDate') => {
    if (sortField === field) {
      // Same field clicked - toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Different field clicked - set new field with appropriate default direction
      setSortField(field)
      setSortDirection(field === 'athDate' ? 'desc' : 'asc') // ATH Date defaults to newest first
    }
    setCurrentPage(1) // Reset to first page when sorting changes
  }

  // Sortable header component
  const SortableHeader = ({ field, children, className = "" }: { 
    field: 'marketCapRank' | 'athDate'
    children: React.ReactNode
    className?: string 
  }) => {
    const isActive = sortField === field
    const direction = isActive ? sortDirection : null
    
    return (
      <TableHeaderCell 
        className={`cursor-pointer hover:bg-gray-50 select-none ${className} ${isActive ? 'bg-blue-50' : ''}`}
        onClick={() => handleSortChange(field)}
      >
        <div className="flex items-center gap-2">
          {children}
          <div className="flex flex-col">
            <span className={`text-xs leading-none ${direction === 'asc' && isActive ? 'text-blue-600' : 'text-gray-300'}`}>
              ▲
            </span>
            <span className={`text-xs leading-none ${direction === 'desc' && isActive ? 'text-blue-600' : 'text-gray-300'}`}>
              ▼
            </span>
          </div>
        </div>
      </TableHeaderCell>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div>
        </div>
        
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
            <SortableHeader field="athDate">
              ATH Date
            </SortableHeader>
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

      {/* Pagination Controls */}
      {!loading && totalRecords > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {startRecord}-{endRecord} of {totalRecords} ATH records
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              ← Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      {!loading && athRecords.length > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground pt-4">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <span>
            Last updated: {DateUtils.formatDateTime(new Date())}
          </span>
        </div>
      )}
    </div>
  )
}