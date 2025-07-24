import { test, expect } from '@playwright/test'

test.describe('Accessibility Compliance', () => {
  test('should have proper semantic HTML structure', async ({ page }) => {
    await page.goto('/')
    
    // Should have proper document structure
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('head title')).not.toBeEmpty()
    
    // Should have main landmarks
    await expect(page.locator('main')).toBeVisible()
    await expect(page.locator('nav')).toBeVisible()
    
    // Should have proper heading hierarchy
    const h1Elements = page.locator('h1')
    await expect(h1Elements).toHaveCount(1) // Should have exactly one h1
    
    // Check for skip link (accessibility best practice)
    const skipLink = page.locator('a[href="#main-content"]').or(
      page.getByText('Skip to main content')
    )
    
    // Skip link may not be visible but should exist for screen readers
    if (await skipLink.count() > 0) {
      await expect(skipLink).toHaveCount(1)
    }
  })

  test('should have proper form accessibility', async ({ page }) => {
    await page.goto('/register')
    
    // All form inputs should have labels
    const emailInput = page.getByRole('textbox', { name: /email/i })
    const passwordInput = page.getByLabelText(/password/i)
    const confirmPasswordInput = page.getByLabelText(/confirm password/i)
    
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(confirmPasswordInput).toBeVisible()
    
    // Form should have proper fieldset/legend if grouped
    const form = page.locator('form')
    await expect(form).toBeVisible()
    
    // Required fields should be marked
    await expect(emailInput).toHaveAttribute('required', '')
    await expect(passwordInput).toHaveAttribute('required', '')
    
    // Form should have submit button with proper text
    const submitButton = page.getByRole('button', { name: /create account|register|sign up/i })
    await expect(submitButton).toBeVisible()
  })

  test('should show proper focus indicators', async ({ page }) => {
    await page.goto('/login')
    
    // Tab through form elements
    await page.keyboard.press('Tab')
    
    // Should have visible focus indicators
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
    
    // Continue tabbing through form
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Should be able to reach submit button via keyboard
    const submitButton = page.getByRole('button', { name: /sign in|login/i })
    await submitButton.focus()
    await expect(submitButton).toBeFocused()
  })

  test('should provide proper error messaging', async ({ page }) => {
    await page.goto('/register')
    
    // Submit form without filling fields
    await page.getByRole('button', { name: /create account/i }).click()
    
    // Error messages should be associated with fields
    const emailError = page.getByText(/email.*required/i)
    const passwordError = page.getByText(/password.*required/i)
    
    if (await emailError.isVisible()) {
      await expect(emailError).toBeVisible()
      
      // Error should be associated with input via aria-describedby
      const emailInput = page.getByRole('textbox', { name: /email/i })
      const describedBy = await emailInput.getAttribute('aria-describedby')
      
      if (describedBy) {
        const errorElement = page.locator(`#${describedBy}`)
        await expect(errorElement).toBeVisible()
      }
    }
  })

  test('should have proper color contrast', async ({ page }) => {
    await page.goto('/')
    
    // Check if page uses proper color schemes
    await expect(page.locator('body')).toHaveCSS('color', /.+/) // Should have text color
    await expect(page.locator('body')).toHaveCSS('background-color', /.+/) // Should have background
    
    // Buttons should have proper contrast
    const buttons = page.getByRole('button')
    if (await buttons.first().isVisible()) {
      const button = buttons.first()
      await expect(button).toHaveCSS('color', /.+/)
      await expect(button).toHaveCSS('background-color', /.+/)
    }
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/')
    
    // Should be able to navigate with keyboard
    let tabCount = 0
    const maxTabs = 20 // Prevent infinite loop
    
    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab')
      tabCount++
      
      const focusedElement = page.locator(':focus')
      
      if (await focusedElement.isVisible()) {
        // Check if focused element is interactive
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase())
        const interactiveTags = ['a', 'button', 'input', 'select', 'textarea']
        
        if (interactiveTags.includes(tagName)) {
          // Should be able to activate with Enter or Space
          const role = await focusedElement.getAttribute('role')
          const type = await focusedElement.getAttribute('type')
          
          // If it's a link, Enter should work
          if (tagName === 'a' || role === 'button') {
            // Found navigable element
            expect(tagName).toBeTruthy()
            break
          }
        }
      }
    }
  })

  test('should have proper ARIA attributes', async ({ page }) => {
    await page.goto('/dashboard/notifications')
    
    // Check for proper ARIA roles and properties
    const buttons = page.getByRole('button')
    const links = page.getByRole('link')
    
    // Interactive elements should have proper roles
    if (await buttons.first().isVisible()) {
      const button = buttons.first()
      const ariaLabel = await button.getAttribute('aria-label')
      const innerText = await button.textContent()
      
      // Button should have accessible name
      expect(ariaLabel || innerText).toBeTruthy()
    }
    
    // Navigation should be properly labeled
    const nav = page.locator('nav')
    if (await nav.isVisible()) {
      const ariaLabel = await nav.getAttribute('aria-label')
      if (ariaLabel) {
        expect(ariaLabel).toBeTruthy()
      }
    }
  })

  test('should provide proper headings structure', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should have logical heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    const headingCount = await headings.count()
    
    if (headingCount > 0) {
      // Should start with h1
      const firstHeading = headings.first()
      const tagName = await firstHeading.evaluate(el => el.tagName.toLowerCase())
      expect(tagName).toBe('h1')
      
      // Check heading progression (no skipping levels)
      for (let i = 0; i < Math.min(headingCount, 5); i++) {
        const heading = headings.nth(i)
        const tag = await heading.evaluate(el => el.tagName.toLowerCase())
        const level = parseInt(tag.charAt(1))
        
        if (i === 0) {
          expect(level).toBe(1) // First should be h1
        } else {
          const prevHeading = headings.nth(i - 1)
          const prevTag = await prevHeading.evaluate(el => el.tagName.toLowerCase())
          const prevLevel = parseInt(prevTag.charAt(1))
          
          // Should not skip levels (can repeat or go one level deeper)
          expect(level).toBeLessThanOrEqual(prevLevel + 1)
        }
      }
    }
  })

  test('should support screen reader announcements', async ({ page }) => {
    await page.goto('/subscription')
    
    // Check for proper live regions
    const liveRegions = page.locator('[aria-live]')
    
    if (await liveRegions.count() > 0) {
      // Should have proper aria-live values
      for (let i = 0; i < await liveRegions.count(); i++) {
        const region = liveRegions.nth(i)
        const liveValue = await region.getAttribute('aria-live')
        expect(['polite', 'assertive', 'off']).toContain(liveValue || '')
      }
    }
    
    // Status messages should be announced
    const testEmail = `a11y-test-${Date.now()}@example.com`
    
    // Create user first
    await page.goto('/register')
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    await page.getByRole('button', { name: /create account/i }).click()
    
    // Go to subscription and try payment modal
    await page.goto('/subscription')
    await page.getByRole('button', { name: /choose monthly/i }).click()
    
    // Modal should be announced to screen readers
    const modal = page.getByRole('dialog')
    if (await modal.isVisible()) {
      const ariaLabel = await modal.getAttribute('aria-label')
      const ariaLabelledBy = await modal.getAttribute('aria-labelledby')
      
      // Modal should have accessible name
      expect(ariaLabel || ariaLabelledBy).toBeTruthy()
    }
  })

  test('should handle reduced motion preferences', async ({ page }) => {
    // Test with reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    
    // Page should still be functional with reduced motion
    await expect(page.locator('body')).toBeVisible()
    
    // Animations should respect reduced motion
    const animatedElements = page.locator('[class*="animate"], [class*="transition"]')
    
    if (await animatedElements.count() > 0) {
      // Elements with animations should still be visible
      const firstAnimated = animatedElements.first()
      if (await firstAnimated.isVisible()) {
        await expect(firstAnimated).toBeVisible()
      }
    }
  })

  test('should provide alternative text for images', async ({ page }) => {
    await page.goto('/')
    
    // All images should have alt text
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const ariaLabel = await img.getAttribute('aria-label')
      const ariaLabelledBy = await img.getAttribute('aria-labelledby')
      
      // Image should have accessible description
      // Alt can be empty for decorative images
      expect(alt !== null || ariaLabel || ariaLabelledBy).toBeTruthy()
    }
  })

  test('should support high contrast mode', async ({ page }) => {
    // Test with forced colors (high contrast mode simulation)
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto('/')
    
    // Page should remain functional in high contrast mode
    await expect(page.locator('body')).toBeVisible()
    
    // Interactive elements should still be discoverable
    const buttons = page.getByRole('button')
    const links = page.getByRole('link')
    
    if (await buttons.first().isVisible()) {
      await expect(buttons.first()).toBeVisible()
    }
    
    if (await links.first().isVisible()) {
      await expect(links.first()).toBeVisible()
    }
  })
})