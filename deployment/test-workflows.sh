#!/bin/bash

# CoinSpree Production Workflow Testing Script
# Tests complete user workflows on deployed environment

set -e

# Configuration
ENVIRONMENT=${1:-staging}
BASE_URL=${2:-"https://coinspree-git-main.vercel.app"}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# Test configuration
TEST_EMAIL="test-$(date +%s)@coinspree.cc"
TEST_PASSWORD="TestPass123!"
ADMIN_EMAIL="admin@coinspree.cc"
ADMIN_PASSWORD="Admin123!"

log "Starting workflow testing on $ENVIRONMENT environment"
log "Base URL: $BASE_URL"

# Test 1: Health Check
log "🏥 Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL/api/health")
HTTP_STATUS=$(echo $HEALTH_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
HEALTH_BODY=$(echo $HEALTH_RESPONSE | sed -e 's/HTTPSTATUS:.*//g')

if [ "$HTTP_STATUS" -eq 200 ]; then
    if echo "$HEALTH_BODY" | grep -q '"status":"healthy"'; then
        success "Health check passed - System is healthy"
    else
        warning "Health check returned 200 but status is not healthy: $HEALTH_BODY"
    fi
else
    error "Health check failed with HTTP $HTTP_STATUS"
fi

# Test 2: Basic page loads
log "🌐 Testing page loads..."

PAGES=(
    "/"
    "/login"
    "/register"
    "/dashboard"
    "/subscription"
    "/admin"
)

for page in "${PAGES[@]}"; do
    URL="$BASE_URL$page"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
    
    if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 302 ] || [ "$HTTP_STATUS" -eq 401 ]; then
        success "✓ $page (HTTP $HTTP_STATUS)"
    else
        warning "⚠ $page returned HTTP $HTTP_STATUS"
    fi
done

# Test 3: API endpoints accessibility
log "🔌 Testing API endpoint accessibility..."

API_ENDPOINTS=(
    "/api/health"
    "/api/auth/me"
    "/api/crypto/top100"
    "/api/subscription/config"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    URL="$BASE_URL$endpoint"
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
    
    # Some endpoints expect authentication, so 401 is acceptable
    if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 401 ] || [ "$HTTP_STATUS" -eq 403 ]; then
        success "✓ $endpoint (HTTP $HTTP_STATUS)"
    else
        warning "⚠ $endpoint returned HTTP $HTTP_STATUS"
    fi
done

# Test 4: User Registration Workflow
log "👤 Testing user registration workflow..."

REGISTER_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$TEST_EMAIL\",
        \"password\": \"$TEST_PASSWORD\",
        \"confirmPassword\": \"$TEST_PASSWORD\"
    }" \
    "$BASE_URL/api/auth/register")

REG_HTTP_STATUS=$(echo $REGISTER_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
REG_BODY=$(echo $REGISTER_RESPONSE | sed -e 's/HTTPSTATUS:.*//g')

if [ "$REG_HTTP_STATUS" -eq 201 ]; then
    success "User registration successful"
    REGISTRATION_SUCCESS=true
else
    warning "User registration failed with HTTP $REG_HTTP_STATUS: $REG_BODY"
    REGISTRATION_SUCCESS=false
fi

# Test 5: User Login Workflow
if [ "$REGISTRATION_SUCCESS" = true ]; then
    log "🔐 Testing user login workflow..."
    
    LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\"
        }" \
        "$BASE_URL/api/auth/login")
    
    LOGIN_HTTP_STATUS=$(echo $LOGIN_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    LOGIN_BODY=$(echo $LOGIN_RESPONSE | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$LOGIN_HTTP_STATUS" -eq 200 ]; then
        success "User login successful"
        
        # Extract session cookie for authenticated requests
        SESSION_COOKIE=$(echo "$LOGIN_RESPONSE" | grep -o 'session=[^;]*' || echo "")
        if [ -n "$SESSION_COOKIE" ]; then
            success "Session cookie obtained"
        fi
    else
        warning "User login failed with HTTP $LOGIN_HTTP_STATUS: $LOGIN_BODY"
    fi
fi

# Test 6: Authenticated API Access
if [ -n "$SESSION_COOKIE" ]; then
    log "🔑 Testing authenticated API access..."
    
    AUTH_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Cookie: $SESSION_COOKIE" \
        "$BASE_URL/api/auth/me")
    
    AUTH_HTTP_STATUS=$(echo $AUTH_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    AUTH_BODY=$(echo $AUTH_RESPONSE | sed -e 's/HTTPSTATUS:.*//g')
    
    if [ "$AUTH_HTTP_STATUS" -eq 200 ]; then
        success "Authenticated API access successful"
        if echo "$AUTH_BODY" | grep -q "$TEST_EMAIL"; then
            success "User data correctly returned"
        fi
    else
        warning "Authenticated API access failed with HTTP $AUTH_HTTP_STATUS"
    fi
fi

# Test 7: Crypto Data API
log "💰 Testing cryptocurrency data API..."

CRYPTO_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Cookie: $SESSION_COOKIE" \
    "$BASE_URL/api/crypto/top100")

CRYPTO_HTTP_STATUS=$(echo $CRYPTO_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
CRYPTO_BODY=$(echo $CRYPTO_RESPONSE | sed -e 's/HTTPSTATUS:.*//g')

if [ "$CRYPTO_HTTP_STATUS" -eq 200 ]; then
    success "Crypto data API accessible"
    if echo "$CRYPTO_BODY" | grep -q "bitcoin"; then
        success "Bitcoin data found in response"
    fi
elif [ "$CRYPTO_HTTP_STATUS" -eq 401 ]; then
    warning "Crypto data API requires authentication (expected)"
else
    warning "Crypto data API failed with HTTP $CRYPTO_HTTP_STATUS"
fi

# Test 8: Email Service Validation
log "📧 Testing email service configuration..."

# Test email service health through health endpoint
EMAIL_HEALTH=$(echo "$HEALTH_BODY" | grep -o '"email":{[^}]*}' || echo "")
if echo "$EMAIL_HEALTH" | grep -q '"healthy":true'; then
    success "Email service is configured and healthy"
else
    warning "Email service may not be properly configured"
fi

# Test 9: Database Connectivity
log "🗄️ Testing database connectivity..."

DB_HEALTH=$(echo "$HEALTH_BODY" | grep -o '"database":{[^}]*}' || echo "")
if echo "$DB_HEALTH" | grep -q '"healthy":true'; then
    success "Database connectivity verified"
else
    warning "Database connectivity issues detected"
fi

# Test 10: External API Integration
log "🌐 Testing external API integrations..."

EXT_API_HEALTH=$(echo "$HEALTH_BODY" | grep -o '"externalApis":{[^}]*}' || echo "")
if echo "$EXT_API_HEALTH" | grep -q '"healthy":true'; then
    success "External API integrations healthy"
else
    warning "External API integration issues detected"
fi

# Test 11: Admin Panel Access
log "👑 Testing admin panel access..."

ADMIN_LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$ADMIN_EMAIL\",
        \"password\": \"$ADMIN_PASSWORD\"
    }" \
    "$BASE_URL/api/auth/login")

ADMIN_HTTP_STATUS=$(echo $ADMIN_LOGIN_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ "$ADMIN_HTTP_STATUS" -eq 200 ]; then
    ADMIN_SESSION=$(echo "$ADMIN_LOGIN_RESPONSE" | grep -o 'session=[^;]*' || echo "")
    
    if [ -n "$ADMIN_SESSION" ]; then
        # Test admin API access
        ADMIN_API_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
            -H "Cookie: $ADMIN_SESSION" \
            "$BASE_URL/api/admin/analytics")
        
        ADMIN_API_STATUS=$(echo $ADMIN_API_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
        
        if [ "$ADMIN_API_STATUS" -eq 200 ]; then
            success "Admin panel access successful"
        else
            warning "Admin API access failed with HTTP $ADMIN_API_STATUS"
        fi
    fi
else
    warning "Admin login failed - this may be expected if admin account doesn't exist"
fi

# Test 12: Performance Check
log "⚡ Running performance checks..."

START_TIME=$(date +%s%N)
PERF_RESPONSE=$(curl -s "$BASE_URL/")
END_TIME=$(date +%s%N)

RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 )) # Convert to milliseconds

if [ "$RESPONSE_TIME" -lt 3000 ]; then
    success "Homepage response time: ${RESPONSE_TIME}ms (< 3 seconds)"
elif [ "$RESPONSE_TIME" -lt 5000 ]; then
    warning "Homepage response time: ${RESPONSE_TIME}ms (3-5 seconds - consider optimization)"
else
    warning "Homepage response time: ${RESPONSE_TIME}ms (> 5 seconds - needs optimization)"
fi

# Test 13: Security Headers Check
log "🔒 Checking security headers..."

SECURITY_RESPONSE=$(curl -s -I "$BASE_URL/")

SECURITY_HEADERS=(
    "Strict-Transport-Security"
    "X-Content-Type-Options"
    "X-Frame-Options"
    "Content-Security-Policy"
)

for header in "${SECURITY_HEADERS[@]}"; do
    if echo "$SECURITY_RESPONSE" | grep -qi "$header"; then
        success "✓ $header header present"
    else
        warning "⚠ $header header missing"
    fi
done

# Cleanup: Delete test user if created
if [ "$REGISTRATION_SUCCESS" = true ]; then
    log "🧹 Cleaning up test user..."
    
    DELETE_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X DELETE \
        -H "Cookie: $SESSION_COOKIE" \
        "$BASE_URL/api/user/delete-account")
    
    DELETE_HTTP_STATUS=$(echo $DELETE_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    
    if [ "$DELETE_HTTP_STATUS" -eq 200 ]; then
        success "Test user cleaned up successfully"
    else
        warning "Test user cleanup failed - manual cleanup may be needed"
    fi
fi

# Summary
log "📊 Workflow Testing Summary:"
echo "Environment: $ENVIRONMENT"
echo "Base URL: $BASE_URL"
echo "Test Email: $TEST_EMAIL"
echo "Timestamp: $(date)"

success "🎉 Workflow testing completed!"

# Save test results
TEST_RESULTS="{
    \"environment\": \"$ENVIRONMENT\",
    \"baseUrl\": \"$BASE_URL\",
    \"timestamp\": \"$(date -Iseconds)\",
    \"testEmail\": \"$TEST_EMAIL\",
    \"registrationSuccess\": $REGISTRATION_SUCCESS,
    \"responseTime\": ${RESPONSE_TIME:-0},
    \"healthStatus\": \"$(echo "$HEALTH_BODY" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)\"
}"

echo "$TEST_RESULTS" > "deployment/test-results-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).json"
log "Test results saved to deployment/test-results-$ENVIRONMENT-$(date +%Y%m%d-%H%M%S).json"