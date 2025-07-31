'use client'

import { useState, useEffect } from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell, LoadingTableState, EmptyTableState } from '@/components/ui/Table'
import { Badge, ATHBadge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { NumberUtils, DateUtils } from '@/lib/utils'

interface CryptoAsset {
  id: string
  symbol: string
  name: string
  currentPrice: number
  marketCap: number
  marketCapRank: number
  ath: number
  athDate: string
  priceChangePercentage24h?: number
  isNewATH?: boolean
}

interface CryptoTableTop101to200Props {
  limit?: number
  showSearch?: boolean
  showFilters?: boolean
}

// Helper function to get crypto-specific colors
function getCryptoColor(symbol: string): string {
  const colors = {
    'BTC': 'bg-gradient-to-r from-orange-400 to-orange-600',
    'ETH': 'bg-gradient-to-r from-blue-400 to-blue-600',
    'BNB': 'bg-gradient-to-r from-yellow-400 to-yellow-600',
    'XRP': 'bg-gradient-to-r from-blue-500 to-blue-700',
    'SOL': 'bg-gradient-to-r from-purple-400 to-purple-600',
    'ADA': 'bg-gradient-to-r from-blue-600 to-blue-800',
    'DOGE': 'bg-gradient-to-r from-yellow-300 to-yellow-500',
    'AVAX': 'bg-gradient-to-r from-red-400 to-red-600',
    'TRX': 'bg-gradient-to-r from-red-500 to-red-700',
    'DOT': 'bg-gradient-to-r from-pink-400 to-pink-600',
    'MATIC': 'bg-gradient-to-r from-purple-500 to-purple-700',
    'LTC': 'bg-gradient-to-r from-gray-400 to-gray-600',
    'SHIB': 'bg-gradient-to-r from-orange-300 to-orange-500',
    'UNI': 'bg-gradient-to-r from-pink-400 to-pink-600',
    'ATOM': 'bg-gradient-to-r from-blue-400 to-blue-600',
    'LINK': 'bg-gradient-to-r from-blue-500 to-blue-700',
  }
  return colors[symbol as keyof typeof colors] || 'bg-gradient-to-r from-indigo-400 to-indigo-600'
}

function getCryptoColorHex(symbol: string): string {
  const colors = {
    'BTC': '#f97316',
    'ETH': '#3b82f6',
    'BNB': '#eab308',
    'XRP': '#1d4ed8',
    'SOL': '#8b5cf6',
    'ADA': '#1e40af',
    'DOGE': '#facc15',
    'AVAX': '#ef4444',
    'TRX': '#dc2626',
    'DOT': '#ec4899',
    'MATIC': '#7c3aed',
    'LTC': '#6b7280',
    'SHIB': '#fb923c',
    'UNI': '#ec4899',
    'ATOM': '#3b82f6',
    'LINK': '#1d4ed8',
  }
  return colors[symbol as keyof typeof colors] || '#6366f1'
}

export function CryptoTableTop101to200({ limit = 100, showSearch = true, showFilters = true }: CryptoTableTop101to200Props) {
  const [cryptos, setCryptos] = useState<CryptoAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<keyof CryptoAsset>('marketCapRank')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    fetchCryptoData()
  }, [])

  const fetchCryptoData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/crypto/top101-200', {
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
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch crypto data`)
      }

      const data = await response.json()
      setCryptos(data.cryptos || data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: keyof CryptoAsset) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const filteredAndSortedCryptos = (cryptos || [])
    .filter(crypto => 
      !searchTerm || 
      crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField] as any
      const bValue = b[sortField] as any
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
    .slice(0, limit)

  if (error) {
    return (
      <div className="text-center py-12 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
        <div className="text-6xl mb-6">💥</div>
        <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6 max-w-md mx-auto">
          <p className="text-red-700 font-semibold text-lg">{error}</p>
        </div>
        <button
          onClick={fetchCryptoData}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-all duration-200 flex items-center gap-2 mx-auto"
        >
          <span className="text-lg">🔄</span>
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      {showSearch && (
        <div className="flex gap-4 items-center bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 text-lg">🔍</span>
            </div>
            <input
              type="text"
              placeholder="Search second-tier cryptocurrencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-amber-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <button
            onClick={fetchCryptoData}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold shadow-md transition-all duration-200"
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : '🔄'}
            Refresh
          </button>
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200">
            <TableHeaderCell 
              sortable 
              onSort={() => handleSort('marketCapRank')}
              className="text-center font-bold text-amber-700"
            >
              🥈 Rank
            </TableHeaderCell>
            <TableHeaderCell 
              sortable 
              onSort={() => handleSort('name')}
              className="font-bold text-amber-700"
            >
              🪙 Cryptocurrency
            </TableHeaderCell>
            <TableHeaderCell 
              sortable 
              onSort={() => handleSort('currentPrice')}
              className="font-bold text-amber-700"
            >
              💰 Price
            </TableHeaderCell>
            <TableHeaderCell 
              sortable 
              onSort={() => handleSort('ath')}
              className="font-bold text-amber-700"
            >
              👑 ATH
            </TableHeaderCell>
            <TableHeaderCell className="font-bold text-amber-700">
              📅 ATH Date
            </TableHeaderCell>
            <TableHeaderCell 
              sortable 
              onSort={() => handleSort('marketCap')}
              className="font-bold text-amber-700"
            >
              📊 Market Cap
            </TableHeaderCell>
            <TableHeaderCell className="font-bold text-amber-700">
              📈 24h Change
            </TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <LoadingTableState rows={limit > 10 ? 10 : limit} columns={7} />
          ) : filteredAndSortedCryptos.length === 0 ? (
            <EmptyTableState
              message="No second-tier cryptocurrencies found"
              description={searchTerm ? 'Try adjusting your search terms' : 'Data may be loading or unavailable'}
              action={
                <button
                  onClick={fetchCryptoData}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  Refresh Data
                </button>
              }
            />
          ) : (
            filteredAndSortedCryptos.map((crypto, index) => (
              <TableRow 
                key={crypto.id} 
                clickable 
                className={`transition-all duration-200 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:shadow-md ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                } border-b border-gray-100`}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      crypto.marketCapRank <= 110 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                      crypto.marketCapRank <= 125 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                      crypto.marketCapRank <= 150 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                      crypto.marketCapRank <= 175 ? 'bg-gradient-to-r from-purple-400 to-purple-600' :
                      'bg-gradient-to-r from-gray-400 to-gray-600'
                    }`}>
                      #{crypto.marketCapRank}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      getCryptoColor(crypto.symbol || '')
                    }`}>
                      {crypto.symbol ? crypto.symbol.slice(0, 2) : '??'}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{crypto.name}</p>
                      <p className="text-sm font-semibold uppercase" style={{ color: getCryptoColorHex(crypto.symbol || '') }}>
                        {crypto.symbol}
                      </p>
                    </div>
                    <ATHBadge isNewATH={crypto.isNewATH} />
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono font-semibold text-lg text-green-600 bg-green-50 px-2 py-1 rounded">
                    ${NumberUtils.formatPrice(crypto.currentPrice)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-yellow-700 bg-yellow-100 px-2 py-1 rounded border border-yellow-300">
                      ${NumberUtils.formatPrice(crypto.ath)}
                    </span>
                    <span className="text-lg">👑</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="bg-blue-50 px-2 py-1 rounded border border-blue-200">
                    <span className="text-sm font-medium text-blue-700">
                      {DateUtils.formatDate(crypto.athDate)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="text-lg">💰</span>
                    <span className="font-mono font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded">
                      {NumberUtils.formatMarketCap(crypto.marketCap)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {crypto.priceChangePercentage24h !== undefined ? (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded font-semibold ${
                      crypto.priceChangePercentage24h >= 0 
                        ? 'bg-green-100 text-green-700 border border-green-300' 
                        : 'bg-red-100 text-red-700 border border-red-300'
                    }`}>
                      <span className="text-lg">
                        {crypto.priceChangePercentage24h >= 0 ? '📈' : '📉'}
                      </span>
                      <span className="font-mono">
                        {NumberUtils.formatPercentage(crypto.priceChangePercentage24h)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground bg-gray-100 px-2 py-1 rounded">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Footer */}
      {!loading && filteredAndSortedCryptos.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <span className="font-semibold text-amber-700">
              Showing {filteredAndSortedCryptos.length} of {cryptos.length} second-tier cryptocurrencies
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🕐</span>
            <span className="font-medium text-orange-700">
              Last updated: {DateUtils.formatDateTime(new Date())}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}