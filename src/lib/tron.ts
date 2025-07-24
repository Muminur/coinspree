import { z } from 'zod'

// Tron payment verification system
export class TronPayment {
  private static readonly TRON_API_URL = 'https://api.trongrid.io'

  // USDT TRC20 contract address on Tron
  private static readonly USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'

  // Transaction verification response schema
  private static readonly transactionSchema = z.object({
    ret: z.array(
      z.object({
        contractRet: z.string(),
      })
    ),
    signature: z.array(z.string()),
    txID: z.string(),
    raw_data: z.object({
      contract: z.array(
        z.object({
          parameter: z.object({
            value: z.object({
              data: z.string().optional(),
              owner_address: z.string().optional(),
              contract_address: z.string().optional(),
              call_value: z.number().optional(),
            }),
          }),
          type: z.string(),
        })
      ),
      timestamp: z.number(),
    }),
  })

  /**
   * Verify USDT payment on Tron network
   */
  static async verifyUSDTPayment(
    txHash: string,
    expectedAmount: number,
    recipientAddress: string,
    maxAgeHours: number = 24
  ): Promise<{
    isValid: boolean
    amount?: number
    timestamp?: number
    error?: string
  }> {
    try {
      // Validate transaction hash format
      if (!/^[a-fA-F0-9]{64}$/.test(txHash)) {
        return { isValid: false, error: 'Invalid transaction hash format' }
      }

      // Fetch transaction from Tron API
      const response = await fetch(
        `${this.TRON_API_URL}/v1/transactions/${txHash}`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      )

      if (!response.ok) {
        return {
          isValid: false,
          error: 'Transaction not found on Tron network',
        }
      }

      const data = await response.json()

      // Validate response structure
      const transaction = this.transactionSchema.safeParse(data)
      if (!transaction.success) {
        return { isValid: false, error: 'Invalid transaction data format' }
      }

      const tx = transaction.data

      // Check if transaction was successful
      if (tx.ret[0]?.contractRet !== 'SUCCESS') {
        return { isValid: false, error: 'Transaction failed on Tron network' }
      }

      // Check transaction age
      const txTimestamp = tx.raw_data.timestamp
      const now = Date.now()
      const maxAge = maxAgeHours * 60 * 60 * 1000

      if (now - txTimestamp > maxAge) {
        return { isValid: false, error: 'Transaction too old' }
      }

      // Get contract details for USDT transfer
      const contract = tx.raw_data.contract[0]

      if (contract.type !== 'TriggerSmartContract') {
        return { isValid: false, error: 'Not a smart contract transaction' }
      }

      // Decode USDT transfer data
      if (
        !contract.parameter.value.contract_address ||
        !contract.parameter.value.data
      ) {
        return { isValid: false, error: 'Missing contract data' }
      }

      const verification = await this.verifyUSDTTransfer(
        contract as {
          parameter: {
            value: {
              contract_address: string
              data: string
            }
          }
        },
        expectedAmount,
        recipientAddress
      )

      return {
        isValid: verification.isValid,
        amount: verification.amount,
        timestamp: txTimestamp,
        error: verification.error,
      }
    } catch (error) {
      console.error('Tron payment verification failed:', error)
      return {
        isValid: false,
        error: `Verification failed: ${(error as Error).message}`,
      }
    }
  }

  /**
   * Verify USDT contract transfer details
   */
  private static async verifyUSDTTransfer(
    contract: {
      parameter: {
        value: {
          contract_address: string
          data: string
        }
      }
    },
    expectedAmount: number,
    recipientAddress: string
  ): Promise<{
    isValid: boolean
    amount?: number
    error?: string
  }> {
    try {
      const contractAddress = this.hexToBase58(
        contract.parameter.value.contract_address
      )

      // Verify it's USDT contract
      if (contractAddress !== this.USDT_CONTRACT) {
        return { isValid: false, error: 'Not a USDT transaction' }
      }

      // Decode transfer data
      const data = contract.parameter.value.data
      if (!data || data.length < 136) {
        return { isValid: false, error: 'Invalid transfer data' }
      }

      // Parse transfer method call (first 8 chars should be transfer method signature)
      const methodSig = data.substring(0, 8)
      if (methodSig !== 'a9059cbb') {
        // transfer(address,uint256) signature
        return { isValid: false, error: 'Not a transfer transaction' }
      }

      // Extract recipient address (next 64 chars, take last 40)
      const recipientHex = data.substring(32, 72)
      const recipient = this.hexToBase58(recipientHex)

      if (recipient !== recipientAddress) {
        return { isValid: false, error: 'Recipient address mismatch' }
      }

      // Extract amount (next 64 chars, convert from hex)
      const amountHex = data.substring(72, 136)
      const amountWei = parseInt(amountHex, 16)
      const amount = amountWei / 1000000 // USDT has 6 decimals

      // Verify amount matches expected (allow 1% tolerance for fees)
      const tolerance = expectedAmount * 0.01
      if (Math.abs(amount - expectedAmount) > tolerance) {
        return {
          isValid: false,
          error: `Amount mismatch: expected ${expectedAmount}, got ${amount}`,
        }
      }

      return { isValid: true, amount }
    } catch (error) {
      return {
        isValid: false,
        error: `Transfer verification failed: ${(error as Error).message}`,
      }
    }
  }

  /**
   * Convert hex address to Base58 format
   */
  private static hexToBase58(hex: string): string {
    // This is a simplified implementation
    // In production, use a proper Tron library like tronweb

    // Remove '0x' prefix if present
    hex = hex.replace(/^0x/, '')

    // Pad with zeros if needed
    while (hex.length < 40) {
      hex = '0' + hex
    }

    // For now, return the hex format
    // TODO: Implement proper Base58 conversion
    return 'T' + hex.substring(2)
  }

  /**
   * Get current USDT price in USD (for validation)
   */
  static async getUSDTPrice(): Promise<number> {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd'
      )

      if (!response.ok) {
        throw new Error('Failed to fetch USDT price')
      }

      const data = await response.json()
      return data.tether?.usd || 1.0
    } catch (error) {
      console.warn('Failed to fetch USDT price, using 1.0:', error)
      return 1.0
    }
  }

  /**
   * Calculate subscription fee in USDT
   */
  static calculateSubscriptionFee(
    priceUSD: number,
    usdtPrice: number = 1.0
  ): number {
    return Math.round((priceUSD / usdtPrice) * 100) / 100
  }

  /**
   * Validate Tron address format
   */
  static isValidTronAddress(address: string): boolean {
    // Tron addresses start with 'T' and are 34 characters long
    return /^T[0-9A-Za-z]{33}$/.test(address)
  }
}

// Export validation helpers
export const tronValidation = {
  transactionHash: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  address: z.string().regex(/^T[0-9A-Za-z]{33}$/, 'Invalid Tron address'),
  amount: z.number().positive('Amount must be positive'),
}
