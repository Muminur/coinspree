/**
 * Next.js Instrumentation
 * 
 * This file runs once when the Next.js server starts up.
 * We use it to start background jobs that run continuously
 * instead of relying on multiple Vercel cron jobs.
 * 
 * This approach allows us to:
 * - Use only 1 cron job (Vercel free tier limit)
 * - Run jobs more frequently than daily
 * - Have better control over job scheduling
 */

export async function register() {
  // Run background jobs in production and development
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
    console.log('🚀 Instrumentation: Starting in production mode')
    
    // Set start time for monitoring
    process.env.BACKGROUND_JOBS_START_TIME = new Date().toISOString()
    
    // Dynamic import to avoid loading during build
    const { BackgroundJobs } = await import('./lib/background-jobs')
    
    // Start the background job scheduler
    BackgroundJobs.start()
    
    // Log startup completion
    console.log('✅ Instrumentation: Background jobs initialized')
    
    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('⏹️ Instrumentation: Received SIGTERM, stopping background jobs')
      BackgroundJobs.stop()
    })
    
    process.on('SIGINT', () => {
      console.log('⏹️ Instrumentation: Received SIGINT, stopping background jobs')
      BackgroundJobs.stop()
    })
    
  } else {
    console.log('🔧 Instrumentation: Skipping background jobs in development mode')
  }
}