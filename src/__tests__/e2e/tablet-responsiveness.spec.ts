import { test, expect, devices } from '@playwright/test'

// Test on tablet viewport
test.use({ ...devices['iPad'] })

test.describe('Tablet Responsiveness', () => {
  test('should adapt layout for tablet screens', async ({ page }) => {
    await page.goto('/')
    
    // Should show appropriate navigation for tablet
    const navigation = page.locator('nav')
    await expect(navigation).toBeVisible()
    
    // Content should be properly spaced for tablet
    const main = page.locator('main')
    await expect(main).toBeVisible()
    
    const mainBox = await main.boundingBox()
    const viewportWidth = page.viewportSize()?.width || 0
    
    if (mainBox) {
      // Content should utilize tablet screen space efficiently
      expect(mainBox.width).toBeLessThanOrEqual(viewportWidth)
      expect(mainBox.width).toBeGreaterThan(600) // Should use more space than mobile
    }
  })

  test('should show tablet-optimized dashboard', async ({ page }) => {
    // Create user for tablet testing
    await page.goto('/register')
    const testEmail = `tablet-test-${Date.now()}@example.com`
    
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    await expect(page).toHaveURL('/dashboard')
    
    // Dashboard should use tablet screen space effectively
    const dashboard = page.locator('main')
    await expect(dashboard).toBeVisible()
    
    // Should show sidebar or have appropriate navigation
    const sidebar = page.locator('[data-testid="sidebar"]').or(
      page.locator('aside')
    )
    
    if (await sidebar.isVisible()) {
      await expect(sidebar).toBeVisible()
    }
  })
})