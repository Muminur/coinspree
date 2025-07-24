import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { cryptoSearchSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await Auth.requireAuth()

    const { searchParams } = new URL(request.url)
    const rawQuery = {
      query: searchParams.get('query') || '',
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
    }

    const { query, page, limit } = cryptoSearchSchema.parse(rawQuery)

    const allCryptos = await KV.getAllCryptos()

    // Filter by search query
    const filtered = allCryptos.filter(
      (crypto) =>
        crypto.name.toLowerCase().includes(query.toLowerCase()) ||
        crypto.symbol.toLowerCase().includes(query.toLowerCase())
    )

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const results = filtered.slice(startIndex, endIndex)

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
      query,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    )
  }
}
