import { test, expect } from '@playwright/test'

test.describe('User Registration Flow', () => {
  test('should complete full user registration and onboarding', async ({ page }) => {
    // Navigate to home page
    await page.goto('/')
    
    // Should show landing page
    await expect(page.locator('h1')).toContainText('Real-Time Crypto ATH Notifications')
    
    // Click register button
    await page.getByRole('link', { name: 'Sign Up' }).click()
    
    // Should navigate to registration page
    await expect(page).toHaveURL('/register')
    await expect(page.locator('h1')).toContainText('Create Account')
    
    // Fill registration form
    const testEmail = `test-${Date.now()}@example.com`
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    
    // Submit registration
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
    
    // Verify user is logged in
    const userButton = page.locator('[data-testid="user-dropdown"]')
    await expect(userButton).toBeVisible()
    await expect(userButton).toContainText(testEmail)
    
    // Check subscription status (should be none for new user)
    await page.getByRole('link', { name: 'Subscription' }).click()
    await expect(page).toHaveURL('/subscription')
    await expect(page.getByText('No Active Subscription')).toBeVisible()
    
    // Check profile page
    await page.getByRole('link', { name: 'Profile' }).click()
    await expect(page).toHaveURL('/profile')
    await expect(page.getByDisplayValue(testEmail)).toBeVisible()
    
    // Logout
    await page.locator('[data-testid="user-dropdown"]').click()
    await page.getByRole('button', { name: 'Logout' }).click()
    
    // Handle logout confirmation dialog
    page.on('dialog', dialog => dialog.accept())
    
    // Should redirect to home page
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible()
  })

  test('should show validation errors for invalid registration data', async ({ page }) => {
    await page.goto('/register')
    
    // Try to submit empty form
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    // Should show validation errors
    await expect(page.getByText('Email is required')).toBeVisible()
    await expect(page.getByText('Password is required')).toBeVisible()
    
    // Try invalid email
    await page.getByLabel('Email').fill('invalid-email')
    await page.getByLabel('Password', { exact: true }).fill('weak')
    await page.getByLabel('Confirm Password').fill('different')
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    // Should show specific validation errors
    await expect(page.getByText('Invalid email format')).toBeVisible()
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible()
    await expect(page.getByText('Passwords do not match')).toBeVisible()
  })

  test('should prevent registration with existing email', async ({ page }) => {
    // First registration
    await page.goto('/register')
    const testEmail = 'existing@example.com'
    
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    // Wait for success (dashboard)
    await expect(page).toHaveURL('/dashboard')
    
    // Logout
    await page.locator('[data-testid="user-dropdown"]').click()
    await page.getByRole('button', { name: 'Logout' }).click()
    page.on('dialog', dialog => dialog.accept())
    
    // Try to register again with same email
    await page.goto('/register')
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    // Should show error
    await expect(page.getByText('User already exists')).toBeVisible()
  })
})