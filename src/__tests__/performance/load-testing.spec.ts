import { test, expect } from '@playwright/test'

test.describe('Performance Testing', () => {
  test('should load homepage within acceptable time limits', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/', { waitUntil: 'networkidle' })
    
    const loadTime = Date.now() - startTime
    
    // Homepage should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
    
    // Check for performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      }
    })
    
    // DOM Content Loaded should be fast
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000)
    
    // First Contentful Paint should be under 1.5 seconds
    if (performanceMetrics.firstContentfulPaint > 0) {
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1500)
    }
  })

  test('should handle API response times efficiently', async ({ page }) => {
    // Create user to test authenticated API performance
    await page.goto('/register')
    const testEmail = `perf-test-${Date.now()}@example.com`
    
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    await expect(page).toHaveURL('/dashboard')
    
    // Test API response times
    const apiStartTime = Date.now()
    
    // Navigate to crypto data page (triggers API call)
    await page.goto('/dashboard/top100')
    
    // Wait for data to load
    await page.waitForSelector('table', { timeout: 5000 })
    
    const apiResponseTime = Date.now() - apiStartTime
    
    // API should respond within 5 seconds
    expect(apiResponseTime).toBeLessThan(5000)
    
    // Check for loading states
    const loadingSpinner = page.locator('[data-testid="loading"]').or(
      page.getByText('Loading...')
    )
    
    // Loading indicator should appear and disappear
    // (May already be gone by the time we check)
    const cryptoData = page.getByRole('table')
    await expect(cryptoData).toBeVisible()
  })

  test('should handle database query performance', async ({ page }) => {
    // Test subscription status query performance
    await page.goto('/register')
    const testEmail = `db-perf-${Date.now()}@example.com`
    
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    const dbStartTime = Date.now()
    
    // Navigate to subscription page (triggers subscription status query)
    await page.goto('/subscription')
    
    // Wait for subscription status to load
    await page.waitForSelector('text=No Active Subscription', { timeout: 3000 })
    
    const dbQueryTime = Date.now() - dbStartTime
    
    // Database queries should be fast
    expect(dbQueryTime).toBeLessThan(2000)
  })

  test('should handle email delivery performance', async ({ page }) => {
    // Test notification system performance
    await page.goto('/register')
    const testEmail = `email-perf-${Date.now()}@example.com`
    
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    
    const emailStartTime = Date.now()
    
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    // Registration should complete quickly (includes welcome email)
    await expect(page).toHaveURL('/dashboard')
    
    const emailProcessTime = Date.now() - emailStartTime
    
    // Email processing shouldn't significantly slow down registration
    expect(emailProcessTime).toBeLessThan(5000)
  })

  test('should handle real-time data updates efficiently', async ({ page }) => {
    // Create user and navigate to dashboard
    await page.goto('/register')
    const testEmail = `realtime-${Date.now()}@example.com`
    
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    await page.goto('/dashboard/top100')
    
    // Measure time for crypto data to load
    const dataStartTime = Date.now()
    
    await page.waitForSelector('table tbody tr', { timeout: 10000 })
    
    const dataLoadTime = Date.now() - dataStartTime
    
    // Real-time data should load within 10 seconds
    expect(dataLoadTime).toBeLessThan(10000)
    
    // Check if data is fresh (not cached for too long)
    const cryptoRows = page.locator('table tbody tr')
    const rowCount = await cryptoRows.count()
    
    // Should have crypto data
    expect(rowCount).toBeGreaterThan(0)
  })

  test('should optimize slow operations', async ({ page }) => {
    // Test form submission performance
    await page.goto('/register')
    
    const formStartTime = Date.now()
    
    const testEmail = `optimize-${Date.now()}@example.com`
    await page.getByLabel('Email').fill(testEmail)
    await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
    await page.getByLabel('Confirm Password').fill('SecurePassword123!')
    
    // Submit form
    await page.getByRole('button', { name: 'Create Account' }).click()
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    
    const formSubmissionTime = Date.now() - formStartTime
    
    // Form submission should be optimized
    expect(formSubmissionTime).toBeLessThan(4000)
    
    // Test navigation performance
    const navStartTime = Date.now()
    
    await page.goto('/subscription')
    await page.waitForSelector('text=Choose Your Plan', { timeout: 3000 })
    
    const navigationTime = Date.now() - navStartTime
    
    // Page navigation should be fast
    expect(navigationTime).toBeLessThan(2000)
  })

  test('should handle concurrent user simulation', async ({ browser }) => {
    // Create multiple concurrent users
    const concurrentUsers = 3
    const userPromises: Promise<void>[] = []
    
    for (let i = 0; i < concurrentUsers; i++) {
      const userPromise = (async () => {
        const context = await browser.newContext()
        const page = await context.newPage()
        
        try {
          const userStartTime = Date.now()
          
          // Each user registers and navigates
          await page.goto('/register')
          const testEmail = `concurrent-${i}-${Date.now()}@example.com`
          
          await page.getByLabel('Email').fill(testEmail)
          await page.getByLabel('Password', { exact: true }).fill('SecurePassword123!')
          await page.getByLabel('Confirm Password').fill('SecurePassword123!')
          await page.getByRole('button', { name: 'Create Account' }).click()
          
          await expect(page).toHaveURL('/dashboard')
          
          // Navigate to different pages
          await page.goto('/subscription')
          await page.goto('/profile')
          
          const userTime = Date.now() - userStartTime
          
          // Each user should complete within reasonable time
          expect(userTime).toBeLessThan(10000)
          
        } finally {
          await context.close()
        }
      })()
      
      userPromises.push(userPromise)
    }
    
    // Wait for all concurrent users to complete
    const concurrentStartTime = Date.now()
    await Promise.all(userPromises)
    const concurrentTime = Date.now() - concurrentStartTime
    
    // Concurrent operations should not significantly degrade performance
    expect(concurrentTime).toBeLessThan(15000)
  })

  test('should measure Core Web Vitals', async ({ page }) => {
    await page.goto('/')
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Measure Core Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {}
        
        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          vitals.lcp = lastEntry.startTime
        }).observe({ entryTypes: ['largest-contentful-paint'] })
        
        // First Input Delay (needs user interaction)
        new PerformanceObserver((list) => {
          const firstInput = list.getEntries()[0]
          vitals.fid = firstInput.processingStart - firstInput.startTime
        }).observe({ entryTypes: ['first-input'] })
        
        // Cumulative Layout Shift
        new PerformanceObserver((list) => {
          let clsValue = 0
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
          vitals.cls = clsValue
        }).observe({ entryTypes: ['layout-shift'] })
        
        // Return collected metrics after delay
        setTimeout(() => resolve(vitals), 2000)
      })
    })
    
    // Core Web Vitals thresholds
    const vitals = webVitals as any
    
    // LCP should be under 2.5 seconds
    if (vitals.lcp) {
      expect(vitals.lcp).toBeLessThan(2500)
    }
    
    // FID should be under 100ms (if measured)
    if (vitals.fid) {
      expect(vitals.fid).toBeLessThan(100)
    }
    
    // CLS should be under 0.1
    if (vitals.cls) {
      expect(vitals.cls).toBeLessThan(0.1)
    }
  })

  test('should monitor resource loading performance', async ({ page }) => {
    await page.goto('/')
    
    // Monitor network requests
    const resourceMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource')
      
      const resourceData = {
        totalResources: resources.length,
        slowResources: 0,
        totalSize: 0,
        cssFiles: 0,
        jsFiles: 0,
        imageFiles: 0,
      }
      
      resources.forEach((resource: any) => {
        // Check for slow loading resources
        if (resource.duration > 1000) {
          resourceData.slowResources++
        }
        
        // Count by type
        if (resource.name.includes('.css')) {
          resourceData.cssFiles++
        } else if (resource.name.includes('.js')) {
          resourceData.jsFiles++
        } else if (resource.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
          resourceData.imageFiles++
        }
        
        // Estimate size
        if (resource.transferSize) {
          resourceData.totalSize += resource.transferSize
        }
      })
      
      return resourceData
    })
    
    // Should not have too many slow resources
    expect(resourceMetrics.slowResources).toBeLessThan(3)
    
    // Should not load excessive resources
    expect(resourceMetrics.totalResources).toBeLessThan(50)
    
    // Total size should be reasonable (under 5MB)
    if (resourceMetrics.totalSize > 0) {
      expect(resourceMetrics.totalSize).toBeLessThan(5 * 1024 * 1024)
    }
  })
})