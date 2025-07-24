import { NextResponse } from 'next/server'
import { TronPayment } from '@/lib/tron'

// API route to get subscription configuration
export async function GET() {
  try {
    // Get subscription configuration
    const priceUSDT = parseFloat(process.env.SUBSCRIPTION_PRICE_USDT || '10')
    const durationDays = parseInt(
      process.env.SUBSCRIPTION_DURATION_DAYS || '30'
    )
    const walletAddress = process.env.TRON_WALLET_ADDRESS

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet configuration not available' },
        { status: 500 }
      )
    }

    // Get current USDT price for reference
    let usdtPrice = 1.0
    try {
      usdtPrice = await TronPayment.getUSDTPrice()
    } catch (error) {
      console.warn('Could not fetch USDT price:', error)
    }

    // Calculate USD equivalent
    const priceUSD = priceUSDT * usdtPrice

    return NextResponse.json({
      success: true,
      data: {
        pricing: {
          usdt: priceUSDT,
          usd: Math.round(priceUSD * 100) / 100,
          usdtPrice,
        },
        duration: {
          days: durationDays,
          displayText: `${durationDays} days`,
        },
        payment: {
          walletAddress,
          currency: 'USDT',
          network: 'Tron (TRC20)',
          instructions: [
            `Send exactly ${priceUSDT} USDT to the wallet address`,
            'Use Tron (TRC20) network only',
            'Copy the transaction hash after payment',
            'Submit the transaction hash to complete subscription',
          ],
        },
      },
    })
  } catch (error) {
    console.error('❌ Subscription config fetch failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
