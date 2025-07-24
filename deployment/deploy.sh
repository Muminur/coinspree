#!/bin/bash

# CoinSpree Production Deployment Script
# Usage: ./deploy.sh [staging|production]

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-staging}
PROJECT_NAME="coinspree"
VERCEL_PROJECT_ID="your-vercel-project-id"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    error "Environment must be 'staging' or 'production'"
fi

log "Starting deployment to $ENVIRONMENT environment"

# Check prerequisites
log "Checking prerequisites..."

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    error "package.json not found. Are you in the project root?"
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    error "Vercel CLI not found. Install with: npm i -g vercel"
fi

# Check if logged into Vercel
if ! vercel whoami &> /dev/null; then
    error "Not logged into Vercel. Run: vercel login"
fi

success "Prerequisites check passed"

# Pre-deployment checks
log "Running pre-deployment checks..."

# Check if environment variables are set
if [[ "$ENVIRONMENT" == "production" ]]; then
    log "Validating production environment variables..."
    
    # These will be set in Vercel dashboard, but we can check local .env.production.local
    if [[ -f ".env.production.local" ]]; then
        success "Production environment file found"
    else
        warning "No .env.production.local file found. Ensure variables are set in Vercel dashboard"
    fi
fi

# Run tests
log "Running test suite..."
npm run test:ci || error "Tests failed. Fix issues before deploying."
success "All tests passed"

# Type checking
log "Running TypeScript type check..."
npm run type-check || error "TypeScript errors found. Fix before deploying."
success "TypeScript check passed"

# Linting
log "Running ESLint..."
npm run lint || error "Linting errors found. Fix before deploying."
success "Linting passed"

# Build check (local)
log "Running local build check..."
npm run build || error "Local build failed. Fix issues before deploying."
success "Local build successful"

# Clean up build artifacts
rm -rf .next
log "Cleaned up local build artifacts"

# Deploy to Vercel
log "Deploying to Vercel ($ENVIRONMENT)..."

if [[ "$ENVIRONMENT" == "production" ]]; then
    # Production deployment
    log "🚀 Deploying to PRODUCTION..."
    
    # Confirm production deployment
    read -p "Are you sure you want to deploy to PRODUCTION? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        error "Production deployment cancelled"
    fi
    
    # Deploy to production
    vercel --prod --confirm || error "Production deployment failed"
    
    DEPLOYMENT_URL="https://coinspree.cc"
    
else
    # Staging deployment
    log "🚀 Deploying to STAGING..."
    vercel || error "Staging deployment failed"
    
    # Get the deployment URL
    DEPLOYMENT_URL=$(vercel ls | grep "$PROJECT_NAME" | head -n 1 | awk '{print $2}')
fi

success "Deployment completed successfully!"

# Post-deployment verification
log "Running post-deployment verification..."

# Wait for deployment to be ready
sleep 30

# Health check
log "Performing health check..."
HEALTH_URL="$DEPLOYMENT_URL/api/health"

if curl -f -s "$HEALTH_URL" > /dev/null; then
    success "Health check passed: $HEALTH_URL"
else
    error "Health check failed: $HEALTH_URL"
fi

# Test key endpoints
log "Testing key endpoints..."

ENDPOINTS=(
    "/api/auth/me"
    "/api/crypto/top100"
    "/api/health"
)

for endpoint in "${ENDPOINTS[@]}"; do
    URL="$DEPLOYMENT_URL$endpoint"
    if curl -f -s "$URL" > /dev/null; then
        success "✓ $endpoint"
    else
        warning "⚠ $endpoint returned error (may be expected for auth endpoints)"
    fi
done

# Performance check
log "Running basic performance check..."
PERF_RESULT=$(curl -o /dev/null -s -w '%{time_total}' "$DEPLOYMENT_URL")
if (( $(echo "$PERF_RESULT < 3.0" | bc -l) )); then
    success "Performance check passed: ${PERF_RESULT}s response time"
else
    warning "Performance check warning: ${PERF_RESULT}s response time (>3s)"
fi

# Database connectivity check
log "Checking database connectivity..."
if curl -f -s "$DEPLOYMENT_URL/api/health" | grep -q '"healthy":true'; then
    success "Database connectivity verified"
else
    warning "Database connectivity check failed or degraded"
fi

# Final summary
log "🎉 Deployment Summary:"
echo "Environment: $ENVIRONMENT"
echo "URL: $DEPLOYMENT_URL"
echo "Health Check: $HEALTH_URL"
echo "Time: $(date)"

if [[ "$ENVIRONMENT" == "production" ]]; then
    log "🚨 PRODUCTION DEPLOYMENT COMPLETE"
    log "Remember to:"
    log "1. Monitor error rates for the next 30 minutes"
    log "2. Check user registration and login flows"
    log "3. Verify email notifications are working"
    log "4. Monitor cryptocurrency data updates"
    log "5. Check admin panel functionality"
else
    log "✅ STAGING DEPLOYMENT COMPLETE"
    log "Test URL: $DEPLOYMENT_URL"
    log "Use this environment for final testing before production"
fi

success "Deployment script completed successfully!"

# Store deployment info
DEPLOY_INFO="{
  \"environment\": \"$ENVIRONMENT\",
  \"url\": \"$DEPLOYMENT_URL\",
  \"timestamp\": \"$(date -Iseconds)\",
  \"git_commit\": \"$(git rev-parse HEAD)\",
  \"git_branch\": \"$(git branch --show-current)\",
  \"deployed_by\": \"$(whoami)\"
}"

echo "$DEPLOY_INFO" > "deployment/last-deploy-$ENVIRONMENT.json"
log "Deployment info saved to deployment/last-deploy-$ENVIRONMENT.json"