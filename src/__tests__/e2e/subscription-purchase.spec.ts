import { test, expect } from '@playwright/test'

test.describe('Subscription Purchase Process', () => {
  test.beforeEach(async ({ page }) => {
    // Create test user and login
    await page.goto('/register')
    const testEmail = `sub-test-${Date.now()}@example.com`
    
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    await expect(page).toHaveURL('/dashboard')
  })

  test('should display subscription plans and pricing', async ({ page }) => {
    await page.goto('/subscription')
    
    // Should show subscription plans
    await expect(page.getByText('Monthly Plan')).toBeVisible()
    await expect(page.getByText('Yearly Plan')).toBeVisible()
    await expect(page.getByText('$3 USDT')).toBeVisible()
    await expect(page.getByText('$30 USDT')).toBeVisible()
    
    // Should show plan features
    await expect(page.getByText('Real-time ATH notifications')).toBeVisible()
    await expect(page.getByText('Email notifications')).toBeVisible()
    await expect(page.getByText('Priority support')).toBeVisible()
    
    // Should show savings badge for yearly plan
    await expect(page.getByText('17% savings')).toBeVisible()
  })

  test('should open payment modal when selecting plan', async ({ page }) => {
    await page.goto('/subscription')
    
    // Click on monthly plan
    await page.getByRole('button', { name: 'Choose Monthly' }).click()
    
    // Payment modal should open
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Complete Your Payment')).toBeVisible()
    
    // Should show selected plan details
    await expect(page.getByText('Monthly Plan - $3 USDT')).toBeVisible()
    
    // Should show payment instructions
    await expect(page.getByText('Send Payment to Wallet')).toBeVisible()
    await expect(page.getByText('TLNTKqQ8VHSKXwgE7cRdfDXLy88NbB2iGG')).toBeVisible()
    
    // Should show payment amount
    await expect(page.getByText('3 USDT')).toBeVisible()
    
    // Should have copy wallet address button
    await expect(page.getByRole('button', { name: 'Copy Wallet Address' })).toBeVisible()
  })

  test('should copy wallet address to clipboard', async ({ page }) => {
    await page.goto('/subscription')
    await page.getByRole('button', { name: 'Choose Monthly' }).click()
    
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    
    // Click copy button
    await page.getByRole('button', { name: 'Copy Wallet Address' }).click()
    
    // Check if clipboard contains the wallet address
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toBe('TLNTKqQ8VHSKXwgE7cRdfDXLy88NbB2iGG')
    
    // Should show success feedback
    await expect(page.getByText('Address copied!')).toBeVisible()
  })

  test('should require transaction hash for payment submission', async ({ page }) => {
    await page.goto('/subscription')
    await page.getByRole('button', { name: 'Choose Monthly' }).click()
    
    // Try to submit without transaction hash
    await page.getByRole('button', { name: "I've Sent the Payment" }).click()
    
    // Should show validation error
    await expect(page.getByText('Transaction hash is required')).toBeVisible()
  })

  test('should submit payment with valid transaction hash', async ({ page }) => {
    await page.goto('/subscription')
    await page.getByRole('button', { name: 'Choose Monthly' }).click()
    
    // Fill transaction hash
    const testTxHash = '0x1234567890abcdef1234567890abcdef12345678'
    await page.getByLabel('Transaction Hash').fill(testTxHash)
    
    // Submit payment
    await page.getByRole('button', { name: "I've Sent the Payment" }).click()
    
    // Should show success message
    await expect(page.getByText('Payment submitted successfully')).toBeVisible()
    
    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible()
    
    // Should show pending subscription status
    await expect(page.getByText('Pending Approval')).toBeVisible()
    await expect(page.getByText('Your payment is being verified')).toBeVisible()
  })

  test('should show payment history after submission', async ({ page }) => {
    await page.goto('/subscription')
    await page.getByRole('button', { name: 'Choose Monthly' }).click()
    
    // Submit payment
    const testTxHash = '0x1234567890abcdef1234567890abcdef12345678'
    await page.getByLabel('Transaction Hash').fill(testTxHash)
    await page.getByRole('button', { name: "I've Sent the Payment" }).click()
    
    // Wait for success
    await expect(page.getByText('Payment submitted successfully')).toBeVisible()
    
    // Check payment history section
    await expect(page.getByText('Payment History')).toBeVisible()
    await expect(page.getByText('$3')).toBeVisible()
    await expect(page.getByText('Pending')).toBeVisible()
    
    // Should have TronScan link
    const tronScanLink = page.getByRole('link', { name: 'View on TronScan' })
    await expect(tronScanLink).toBeVisible()
    await expect(tronScanLink).toHaveAttribute('href', `https://tronscan.org/#/transaction/${testTxHash}`)
  })

  test('should show contact support for pending payments', async ({ page }) => {
    await page.goto('/subscription')
    await page.getByRole('button', { name: 'Choose Monthly' }).click()
    
    // Submit payment
    const testTxHash = '0x1234567890abcdef1234567890abcdef12345678'
    await page.getByLabel('Transaction Hash').fill(testTxHash)
    await page.getByRole('button', { name: "I've Sent the Payment" }).click()
    
    // Should show contact support button
    await expect(page.getByRole('link', { name: 'Contact Support' })).toBeVisible()
    
    // Click contact support
    await page.getByRole('link', { name: 'Contact Support' }).click()
    
    // Should navigate to contact page with pre-filled info
    await expect(page).toHaveURL('/contact')
    await expect(page.getByDisplayValue('Payment Issue')).toBeVisible()
    await expect(page.getByDisplayValue(testTxHash)).toBeVisible()
  })

  test('should handle yearly plan selection with correct pricing', async ({ page }) => {
    await page.goto('/subscription')
    
    // Click yearly plan
    await page.getByRole('button', { name: 'Choose Yearly' }).click()
    
    // Should show yearly plan details
    await expect(page.getByText('Yearly Plan - $30 USDT')).toBeVisible()
    await expect(page.getByText('30 USDT')).toBeVisible()
    await expect(page.getByText('365 days of notifications')).toBeVisible()
  })

  test('should close payment modal with cancel button', async ({ page }) => {
    await page.goto('/subscription')
    await page.getByRole('button', { name: 'Choose Monthly' }).click()
    
    // Modal should be open
    await expect(page.getByRole('dialog')).toBeVisible()
    
    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click()
    
    // Modal should close
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})