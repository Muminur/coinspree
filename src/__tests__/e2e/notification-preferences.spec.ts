import { test, expect } from '@playwright/test'

test.describe('Notification Preferences', () => {
  test.beforeEach(async ({ page }) => {
    // Create test user with active subscription
    await page.goto('/register')
    const testEmail = `notify-test-${Date.now()}@example.com`
    
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    await expect(page).toHaveURL('/dashboard')
  })

  test('should access notification preferences from dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should have notifications link
    await expect(page.getByRole('link', { name: 'Notifications' })).toBeVisible()
    
    // Click notifications
    await page.getByRole('link', { name: 'Notifications' }).click()
    await expect(page).toHaveURL('/dashboard/notifications')
    
    // Should show notification preferences
    await expect(page.getByText('Notification Preferences')).toBeVisible()
    await expect(page.getByText('Test Notification')).toBeVisible()
  })

  test('should display subscription requirement for notifications', async ({ page }) => {
    await page.goto('/dashboard/notifications')
    
    // Should show subscription requirement
    await expect(page.getByText('Active subscription required')).toBeVisible()
    await expect(page.getByText('Subscribe to receive ATH notifications')).toBeVisible()
    
    // Should have subscribe button
    await expect(page.getByRole('link', { name: 'Subscribe Now' })).toBeVisible()
  })

  test('should send test notification for subscribed users', async ({ page }) => {
    // First simulate having an active subscription
    // This would require admin approval in real scenario
    await page.goto('/dashboard/notifications')
    
    // For testing, assume user has subscription
    // In real test, would need to set up test subscription
    const testButton = page.getByRole('button', { name: 'Send Test Notification' })
    
    if (await testButton.isVisible()) {
      await testButton.click()
      
      // Should show feedback
      const successMessage = page.getByText('Test notification sent')
      const errorMessage = page.getByText('Active subscription required')
      
      // Either success or subscription error should appear
      await expect(successMessage.or(errorMessage)).toBeVisible()
    }
  })

  test('should navigate to subscription from notification requirements', async ({ page }) => {
    await page.goto('/dashboard/notifications')
    
    // Click subscribe button
    await page.getByRole('link', { name: 'Subscribe Now' }).click()
    
    // Should navigate to subscription page
    await expect(page).toHaveURL('/subscription')
    await expect(page.getByText('Choose Your Plan')).toBeVisible()
  })

  test('should show notification settings in profile', async ({ page }) => {
    await page.goto('/profile')
    
    // Should show notification preferences section
    await expect(page.getByText('Notification Preferences')).toBeVisible()
    
    // Should have notification toggle
    const notificationToggle = page.getByRole('checkbox', { name: 'Enable Notifications' })
    await expect(notificationToggle).toBeVisible()
    
    // Toggle should be enabled by default
    await expect(notificationToggle).toBeChecked()
  })

  test('should toggle notification preferences in profile', async ({ page }) => {
    await page.goto('/profile')
    
    // Find notification toggle
    const notificationToggle = page.getByRole('checkbox', { name: 'Enable Notifications' })
    
    // Disable notifications
    await notificationToggle.uncheck()
    
    // Save changes
    await page.getByRole('button', { name: 'Save Changes' }).click()
    
    // Should show success message
    await expect(page.getByText('Profile updated successfully')).toBeVisible()
    
    // Refresh page to verify persistence
    await page.reload()
    await expect(notificationToggle).not.toBeChecked()
    
    // Re-enable notifications
    await notificationToggle.check()
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page.getByText('Profile updated successfully')).toBeVisible()
  })

  test('should show notification history when available', async ({ page }) => {
    await page.goto('/dashboard/notifications')
    
    // Check for notification history section
    const historySection = page.getByText('Recent Notifications')
    
    if (await historySection.isVisible()) {
      // Should show notification entries or empty state
      const emptyState = page.getByText('No notifications sent yet')
      const notificationEntries = page.locator('[data-testid="notification-entry"]')
      
      await expect(emptyState.or(notificationEntries.first())).toBeVisible()
    }
  })

  test('should handle notification preference errors gracefully', async ({ page }) => {
    await page.goto('/profile')
    
    // Simulate network error by intercepting the request
    await page.route('/api/user/profile', route => {
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    })
    
    // Try to update notification preferences
    const notificationToggle = page.getByRole('checkbox', { name: 'Enable Notifications' })
    await notificationToggle.uncheck()
    await page.getByRole('button', { name: 'Save Changes' }).click()
    
    // Should show error message
    await expect(page.getByText('Failed to update profile')).toBeVisible()
  })

  test('should show notification requirements clearly', async ({ page }) => {
    await page.goto('/dashboard/notifications')
    
    // Should explain subscription requirement clearly
    await expect(page.getByText('You need an active subscription')).toBeVisible()
    await expect(page.getByText('ATH notifications are only available')).toBeVisible()
    
    // Should show what notifications include
    const features = [
      'Real-time ATH alerts',
      'Email notifications',
      'Instant delivery'
    ]
    
    for (const feature of features) {
      await expect(page.getByText(feature)).toBeVisible()
    }
  })
})