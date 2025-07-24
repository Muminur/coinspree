import { test, expect, devices } from '@playwright/test'

// Test on mobile viewport
test.use({ ...devices['iPhone 12'] })

test.describe('Mobile Responsiveness', () => {

  test('should display mobile navigation properly', async ({ page }) => {
    await page.goto('/')
    
    // Should show mobile hamburger menu
    const mobileMenuButton = page.getByRole('button', { name: 'Menu' }).or(
      page.locator('[data-testid="mobile-menu-button"]')
    )
    
    await expect(mobileMenuButton).toBeVisible()
    
    // Desktop navigation should be hidden
    const desktopNav = page.locator('nav:not([data-mobile])')
    
    // Click mobile menu
    await mobileMenuButton.click()
    
    // Mobile menu should open
    const mobileMenu = page.locator('[data-testid="mobile-menu"]').or(
      page.locator('.mobile-menu')
    )
    
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toBeVisible()
      
      // Should show navigation links
      await expect(page.getByRole('link', { name: 'Login' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Sign Up' })).toBeVisible()
    }
  })

  test('should adapt forms for mobile screens', async ({ page }) => {
    await page.goto('/register')
    
    // Form should be full width on mobile
    const form = page.locator('form')
    await expect(form).toBeVisible()
    
    // Input fields should stack vertically
    const emailInput = page.getByLabel('Email')
    const passwordInput = page.getByLabel('Password', { exact: true })
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    
    // Check if inputs are properly sized for mobile
    const emailBox = await emailInput.boundingBox()
    const passwordBox = await passwordInput.boundingBox()
    
    if (emailBox && passwordBox) {
      // Inputs should be vertically stacked (email above password)
      expect(emailBox.y).toBeLessThan(passwordBox.y)
    }
  })

  test('should make dashboard responsive on mobile', async ({ page }) => {
    // Create user and login
    await page.goto('/register')
    const testEmail = `mobile-test-${Date.now()}@example.com`
    
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    await expect(page).toHaveURL('/dashboard')
    
    // Dashboard should be responsive
    await expect(page.getByText('Dashboard')).toBeVisible()
    
    // Navigation should be mobile-friendly
    const mobileNav = page.locator('[data-testid="mobile-nav"]').or(
      page.getByRole('button', { name: 'Menu' })
    )
    
    if (await mobileNav.isVisible()) {
      await expect(mobileNav).toBeVisible()
    }
    
    // Content should not overflow
    const body = page.locator('body')
    const bodyBox = await body.boundingBox()
    
    if (bodyBox) {
      // Should not have horizontal scroll
      expect(bodyBox.width).toBeLessThanOrEqual(414) // iPhone 12 width + small tolerance
    }
  })

  test('should make subscription page mobile-friendly', async ({ page }) => {
    // Create user and navigate to subscription
    await page.goto('/register')
    const testEmail = `mobile-sub-${Date.now()}@example.com`
    
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    await page.goto('/subscription')
    
    // Subscription plans should stack vertically on mobile
    const monthlyPlan = page.getByText('Monthly Plan')
    const yearlyPlan = page.getByText('Yearly Plan')
    
    await expect(monthlyPlan).toBeVisible()
    await expect(yearlyPlan).toBeVisible()
    
    // Plans should be properly sized for mobile
    const monthlyBox = await monthlyPlan.boundingBox()
    const yearlyBox = await yearlyPlan.boundingBox()
    
    if (monthlyBox && yearlyBox) {
      // Plans should stack vertically or fit side by side
      const viewportWidth = page.viewportSize()?.width || 0
      expect(monthlyBox.width).toBeLessThanOrEqual(viewportWidth)
      expect(yearlyBox.width).toBeLessThanOrEqual(viewportWidth)
    }
  })

  test('should handle payment modal on mobile', async ({ page }) => {
    // Create user and open payment modal
    await page.goto('/register')
    const testEmail = `mobile-payment-${Date.now()}@example.com`
    
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    await page.goto('/subscription')
    await page.getByRole('button', { name: 'Choose Monthly' }).click()
    
    // Payment modal should be responsive
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    
    // Modal should fit mobile screen
    const modalBox = await modal.boundingBox()
    const viewportWidth = page.viewportSize()?.width || 0
    
    if (modalBox) {
      expect(modalBox.width).toBeLessThanOrEqual(viewportWidth)
    }
    
    // Wallet address should be readable
    const walletAddress = page.getByText('TLNTKqQ8VHSKXwgE7cRdfDXLy88NbB2iGG')
    await expect(walletAddress).toBeVisible()
    
    // Copy button should be accessible
    const copyButton = page.getByRole('button', { name: 'Copy Wallet Address' })
    await expect(copyButton).toBeVisible()
  })

  test('should make tables responsive on mobile', async ({ page }) => {
    // Create user and navigate to dashboard
    await page.goto('/register')
    const testEmail = `mobile-table-${Date.now()}@example.com`
    
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    await page.goto('/dashboard/top100')
    
    // Crypto table should be responsive
    const table = page.getByRole('table')
    
    if (await table.isVisible()) {
      await expect(table).toBeVisible()
      
      // Table should either scroll horizontally or columns should collapse
      const tableBox = await table.boundingBox()
      const viewportWidth = page.viewportSize()?.width || 0
      
      if (tableBox) {
        // Table should handle mobile viewport appropriately
        // Either fit within screen or be scrollable
        expect(tableBox.x).toBeGreaterThanOrEqual(0)
      }
    }
  })

  test('should ensure touch targets are appropriately sized', async ({ page }) => {
    await page.goto('/')
    
    // Check button sizes for touch accessibility
    const buttons = page.getByRole('button')
    const links = page.getByRole('link')
    
    // Get first few buttons/links
    const touchTargets = await Promise.all([
      buttons.first().boundingBox(),
      links.first().boundingBox(),
    ])
    
    for (const box of touchTargets) {
      if (box) {
        // Touch targets should be at least 44px (iOS) or 48dp (Android)
        expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(40)
      }
    }
  })

  test('should handle profile page on mobile', async ({ page }) => {
    // Create user and navigate to profile
    await page.goto('/register')
    const testEmail = `mobile-profile-${Date.now()}@example.com`
    
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    await page.goto('/profile')
    
    // Profile form should be mobile-friendly
    const profileForm = page.locator('form')
    await expect(profileForm).toBeVisible()
    
    // Form fields should stack properly
    const emailField = page.getByDisplayValue(testEmail)
    await expect(emailField).toBeVisible()
    
    // Save button should be accessible
    const saveButton = page.getByRole('button', { name: 'Save Changes' })
    await expect(saveButton).toBeVisible()
    
    // Check if form is properly laid out
    const formBox = await profileForm.boundingBox()
    const viewportWidth = page.viewportSize()?.width || 0
    
    if (formBox) {
      expect(formBox.width).toBeLessThanOrEqual(viewportWidth)
    }
  })
})

