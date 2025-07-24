# CoinSpree API Documentation

*Complete REST API reference for CoinSpree cryptocurrency ATH notification service*

## 📋 Overview

The CoinSpree API provides programmatic access to cryptocurrency all-time high (ATH) data, user management, and notification services. Built on Next.js API routes with TypeScript and Zod validation.

### Base URL
```
Production: https://coinspree.cc/api
Staging: https://staging.coinspree.cc/api
```

### Authentication
Most endpoints require authentication via session cookies. Authentication state is managed through HTTP-only secure cookies set by the login endpoint.

### Response Format
All API responses follow this structure:
```json
{
  "success": true | false,
  "data": { ... } | null,
  "error": "Error message" | null,
  "timestamp": "2024-01-20T15:30:00Z"
}
```

### Rate Limiting
- **General API**: 60 requests per minute per IP
- **Authentication**: 10 requests per minute per IP
- **Admin endpoints**: 30 requests per minute per session

## 🔐 Authentication Endpoints

### POST /api/auth/register
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_1234567890",
      "email": "user@example.com",
      "role": "user",
      "createdAt": "2024-01-20T15:30:00Z"
    }
  }
}
```

**Error Responses:**
- `400`: Validation error (password requirements, email format)
- `409`: Email already registered
- `429`: Rate limit exceeded

---

### POST /api/auth/login
Authenticate user and create session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_1234567890",
      "email": "user@example.com",
      "role": "user",
      "lastLogin": "2024-01-20T15:30:00Z"
    }
  }
}
```

**Sets Cookie:**
```
session=encrypted_session_token; HttpOnly; Secure; SameSite=Strict; Max-Age=86400
```

**Error Responses:**
- `401`: Invalid credentials
- `423`: Account locked due to too many failed attempts
- `429`: Rate limit exceeded

---

### POST /api/auth/logout
End user session and clear authentication.

**Requires:** Valid session cookie

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

**Cookie Action:** Clears session cookie

---

### GET /api/auth/me
Get current user information and verify session.

**Requires:** Valid session cookie

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_1234567890",
      "email": "user@example.com",
      "role": "user",
      "isActive": true,
      "notificationsEnabled": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "lastLogin": "2024-01-20T15:30:00Z"
    }
  }
}
```

**Error Responses:**
- `401`: No valid session found
- `403`: Account deactivated

---

### POST /api/auth/reset-password
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Password reset email sent"
  }
}
```

**Note:** Always returns success for security (doesn't reveal if email exists)

## 💰 Cryptocurrency Data Endpoints

### GET /api/crypto/top100
Get top 100 cryptocurrencies with current prices and ATH data.

**Requires:** Authentication

**Query Parameters:**
- `search` (optional): Filter by coin name or symbol
- `sort` (optional): Sort by `price`, `marketCap`, `rank`, `change24h`
- `order` (optional): `asc` or `desc` (default: `asc`)
- `limit` (optional): Number of results (max 100, default: 100)

**Example Request:**
```
GET /api/crypto/top100?search=bitcoin&sort=marketCap&order=desc&limit=10
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "coins": [
      {
        "id": "bitcoin",
        "symbol": "btc",
        "name": "Bitcoin",
        "currentPrice": 45000.50,
        "marketCap": 880000000000,
        "marketCapRank": 1,
        "ath": 69000.00,
        "athDate": "2021-11-10T14:24:11.849Z",
        "priceChange24h": 2.5,
        "priceChangePercentage24h": 5.88,
        "lastUpdated": "2024-01-20T15:30:00Z"
      }
    ],
    "total": 1,
    "lastUpdate": "2024-01-20T15:30:00Z"
  }
}
```

**Error Responses:**
- `401`: Authentication required
- `403`: Subscription required
- `500`: External API error

---

### GET /api/crypto/ath-history
Get historical ATH data for all or specific cryptocurrencies.

**Requires:** Authentication

**Query Parameters:**
- `coinId` (optional): Specific coin ID (e.g., "bitcoin")
- `limit` (optional): Number of records (default: 50, max: 200)
- `since` (optional): ISO date string for records after date

**Example Request:**
```
GET /api/crypto/ath-history?coinId=bitcoin&limit=10&since=2024-01-01T00:00:00Z
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "athHistory": [
      {
        "id": "ath_1234567890",
        "coinId": "bitcoin",
        "coinName": "Bitcoin",
        "symbol": "btc",
        "newAth": 69000.00,
        "previousAth": 64895.22,
        "percentageIncrease": 6.33,
        "detectedAt": "2021-11-10T14:24:11.849Z",
        "marketCapRank": 1
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

---

### GET /api/crypto/search
Search cryptocurrencies by name or symbol.

**Requires:** Authentication

**Query Parameters:**
- `q` (required): Search query (minimum 2 characters)
- `limit` (optional): Number of results (default: 20, max: 50)

**Example Request:**
```
GET /api/crypto/search?q=eth&limit=5
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "ethereum",
        "symbol": "eth",
        "name": "Ethereum",
        "currentPrice": 2800.75,
        "marketCapRank": 2,
        "isTopHundred": true
      }
    ],
    "query": "eth",
    "total": 1
  }
}
```

---

### POST /api/crypto/update
Manually trigger cryptocurrency data update (Admin only).

**Requires:** Admin authentication

**Response (200):**
```json
{
  "success": true,
  "data": {
    "updated": 100,
    "athDetected": 2,
    "executionTime": "1250ms",
    "timestamp": "2024-01-20T15:30:00Z"
  }
}
```

## 🔔 Notification Endpoints

### GET /api/notifications/history
Get user's notification history.

**Requires:** Authentication

**Query Parameters:**
- `limit` (optional): Number of records (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)
- `type` (optional): Filter by notification type

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_1234567890",
        "type": "ath_alert",
        "coinId": "bitcoin",
        "coinName": "Bitcoin",
        "newAth": 69000.00,
        "sentAt": "2021-11-10T14:25:00Z",
        "deliveryStatus": "delivered",
        "opened": true,
        "openedAt": "2021-11-10T14:30:15Z"
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

---

### POST /api/notifications/test
Send a test notification to verify email delivery.

**Requires:** Active subscription

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Test notification sent successfully",
    "deliveryId": "delivery_1234567890",
    "sentAt": "2024-01-20T15:30:00Z"
  }
}
```

**Error Responses:**
- `403`: Active subscription required
- `429`: Rate limit exceeded (max 3 per hour)

---

### PUT /api/notifications/preferences
Update notification preferences.

**Requires:** Authentication

**Request Body:**
```json
{
  "enabled": true,
  "emailFrequency": "immediate",
  "types": ["ath_alert", "subscription_expiry"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "preferences": {
      "enabled": true,
      "emailFrequency": "immediate",
      "types": ["ath_alert", "subscription_expiry"],
      "updatedAt": "2024-01-20T15:30:00Z"
    }
  }
}
```

## 💳 Subscription Endpoints

### GET /api/subscription/status
Get current user's subscription status.

**Requires:** Authentication

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_1234567890",
      "status": "active",
      "plan": "monthly",
      "startDate": "2024-01-15T10:30:00Z",
      "endDate": "2024-02-15T10:30:00Z",
      "daysRemaining": 26,
      "autoRenew": false
    },
    "hasActiveSubscription": true
  }
}
```

**Subscription Status Values:**
- `active`: Valid subscription with future expiry
- `expired`: Past expiry date
- `pending`: Payment submitted, awaiting approval
- `blocked`: Admin-blocked subscription

---

### GET /api/subscription/config
Get subscription plans and payment information.

**Public endpoint** (no authentication required)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "monthly",
        "name": "Monthly Plan",
        "price": 3,
        "currency": "USDT",
        "duration": 30,
        "features": [
          "Unlimited ATH notifications",
          "Real-time dashboard access",
          "Email notifications",
          "Historical data access"
        ]
      },
      {
        "id": "yearly",
        "name": "Yearly Plan",
        "price": 30,
        "currency": "USDT",
        "duration": 365,
        "savings": "17%",
        "features": [
          "All monthly features",
          "17% cost savings",
          "Priority support",
          "Early access to new features"
        ]
      }
    ],
    "payment": {
      "method": "USDT-TRC20",
      "network": "Tron",
      "walletAddress": "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
      "confirmations": 1,
      "processingTime": "Within 24 hours"
    }
  }
}
```

---

### POST /api/subscription/create
Create new subscription with payment verification.

**Requires:** Authentication

**Request Body:**
```json
{
  "plan": "monthly",
  "paymentTxHash": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
  "amount": 3.0
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_1234567890",
      "status": "pending",
      "plan": "monthly",
      "amount": 3.0,
      "paymentTxHash": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
      "submittedAt": "2024-01-20T15:30:00Z",
      "estimatedApproval": "Within 24 hours"
    }
  }
}
```

**Error Responses:**
- `400`: Invalid transaction hash or amount
- `409`: Transaction hash already used
- `422`: Payment verification failed

---

### GET /api/subscription/history
Get user's subscription and payment history.

**Requires:** Authentication

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "sub_1234567890",
        "plan": "monthly",
        "status": "active",
        "amount": 3.0,
        "paymentTxHash": "a1b2c3d4...",
        "startDate": "2024-01-15T10:30:00Z",
        "endDate": "2024-02-15T10:30:00Z",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "totalSpent": 3.0,
    "totalSubscriptions": 1
  }
}
```

## 👤 User Management Endpoints

### GET /api/user/profile
Get current user's profile information.

**Requires:** Authentication

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_1234567890",
      "email": "user@example.com",
      "role": "user",
      "isActive": true,
      "notificationsEnabled": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "lastLogin": "2024-01-20T15:30:00Z",
      "preferences": {
        "emailFrequency": "immediate",
        "timezone": "UTC"
      }
    }
  }
}
```

---

### PUT /api/user/profile
Update user profile information.

**Requires:** Authentication

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "notificationsEnabled": true,
  "preferences": {
    "emailFrequency": "immediate",
    "timezone": "UTC"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_1234567890",
      "email": "newemail@example.com",
      "notificationsEnabled": true,
      "updatedAt": "2024-01-20T15:30:00Z"
    },
    "emailVerificationRequired": true
  }
}
```

---

### POST /api/user/change-password
Change user password.

**Requires:** Authentication

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!",
  "confirmPassword": "NewPass456!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully",
    "updatedAt": "2024-01-20T15:30:00Z"
  }
}
```

**Error Responses:**
- `400`: Password validation failed
- `401`: Current password incorrect
- `429`: Rate limit exceeded

---

### GET /api/user/export-data
Export user's data in JSON format.

**Requires:** Authentication

**Response (200):**
```json
{
  "success": true,
  "data": {
    "export": {
      "user": { ... },
      "subscriptions": [ ... ],
      "notifications": [ ... ],
      "preferences": { ... },
      "exportedAt": "2024-01-20T15:30:00Z",
      "version": "1.0"
    }
  }
}
```

---

### DELETE /api/user/delete-account
Delete user account and all associated data.

**Requires:** Authentication

**Request Body:**
```json
{
  "password": "CurrentPass123!",
  "confirmation": "DELETE"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Account deleted successfully",
    "deletedAt": "2024-01-20T15:30:00Z"
  }
}
```

**Data Deletion:**
- User profile and preferences
- Active sessions
- Personal notification history
- Account settings

**Data Retention:**
- Subscription payment records (for auditing)
- Aggregated analytics (anonymized)

## 👑 Admin Endpoints

All admin endpoints require authentication with admin role.

### GET /api/admin/users
Get paginated list of all users.

**Requires:** Admin authentication

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50, max: 100)
- `search` (optional): Search by email
- `role` (optional): Filter by role (`user`, `admin`)
- `status` (optional): Filter by status (`active`, `inactive`)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_1234567890",
        "email": "user@example.com",
        "role": "user",
        "isActive": true,
        "createdAt": "2024-01-15T10:30:00Z",
        "lastLogin": "2024-01-20T15:30:00Z",
        "subscriptionStatus": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1247,
      "totalPages": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### PUT /api/admin/users/[id]
Update user information (admin only).

**Requires:** Admin authentication

**Request Body:**
```json
{
  "email": "user@example.com",
  "role": "user",
  "isActive": true,
  "notificationsEnabled": true
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_1234567890",
      "email": "user@example.com",
      "role": "user",
      "isActive": true,
      "updatedAt": "2024-01-20T15:30:00Z"
    }
  }
}
```

---

### DELETE /api/admin/users/[id]
Delete user account (admin only).

**Requires:** Admin authentication

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "User deleted successfully",
    "deletedUserId": "user_1234567890",
    "deletedAt": "2024-01-20T15:30:00Z"
  }
}
```

---

### GET /api/admin/subscriptions
Get all subscriptions with filtering options.

**Requires:** Admin authentication

**Query Parameters:**
- `status` (optional): Filter by status (`active`, `expired`, `pending`, `blocked`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "sub_1234567890",
        "userId": "user_1234567890",
        "userEmail": "user@example.com",
        "status": "pending",
        "plan": "monthly",
        "amount": 3.0,
        "paymentTxHash": "a1b2c3d4...",
        "submittedAt": "2024-01-20T15:30:00Z"
      }
    ],
    "pagination": { ... },
    "statistics": {
      "total": 267,
      "active": 245,
      "pending": 12,
      "expired": 8,
      "blocked": 2
    }
  }
}
```

---

### POST /api/admin/subscriptions/[id]/approve
Approve pending subscription payment.

**Requires:** Admin authentication

**Request Body:**
```json
{
  "verified": true,
  "notes": "Payment verified on Tron blockchain"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_1234567890",
      "status": "active",
      "approvedAt": "2024-01-20T15:30:00Z",
      "approvedBy": "admin_987654321"
    }
  }
}
```

---

### POST /api/admin/subscriptions/[id]/block
Block subscription for policy violations.

**Requires:** Admin authentication

**Request Body:**
```json
{
  "reason": "fraud_detection",
  "notes": "Suspicious payment activity detected"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_1234567890",
      "status": "blocked",
      "blockedAt": "2024-01-20T15:30:00Z",
      "blockedBy": "admin_987654321",
      "reason": "fraud_detection"
    }
  }
}
```

---

### GET /api/admin/analytics
Get comprehensive system analytics.

**Requires:** Admin authentication

**Query Parameters:**
- `period` (optional): Time period (`7d`, `30d`, `90d`, `1y`)
- `metric` (optional): Specific metric group (`users`, `subscriptions`, `revenue`, `performance`)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1247,
      "active30d": 892,
      "new7d": 45,
      "growthRate": 12.5
    },
    "subscriptions": {
      "total": 267,
      "active": 245,
      "conversionRate": 21.4,
      "churnRate": 3.2
    },
    "revenue": {
      "monthly": 801,
      "yearly": 2100,
      "total": 8905,
      "arpu": 33.35
    },
    "performance": {
      "uptime": 99.8,
      "avgResponseTime": 245,
      "errorRate": 0.05,
      "athDetections24h": 7
    },
    "period": "30d",
    "generatedAt": "2024-01-20T15:30:00Z"
  }
}
```

## 🏥 System Health Endpoints

### GET /api/health
Get comprehensive system health status.

**Public endpoint** (no authentication required)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-20T15:30:00Z",
    "version": "1.0.0",
    "environment": "production",
    "responseTime": "85ms",
    "services": {
      "database": {
        "healthy": true,
        "responseTime": "23ms",
        "lastChecked": "2024-01-20T15:30:00Z"
      },
      "externalApis": {
        "coingecko": {
          "healthy": true,
          "responseTime": "156ms",
          "lastChecked": "2024-01-20T15:30:00Z"
        }
      },
      "email": {
        "healthy": true,
        "configured": true,
        "lastChecked": "2024-01-20T15:30:00Z"
      }
    },
    "system": {
      "uptime": 2592000,
      "memory": {
        "used": 45.2,
        "free": 54.8,
        "unit": "MB"
      },
      "nodeVersion": "v18.18.0"
    }
  }
}
```

**Status Values:**
- `healthy`: All services operational
- `degraded`: Some services experiencing issues
- `unhealthy`: Critical services down

**Error Response (503):**
```json
{
  "success": false,
  "data": {
    "status": "unhealthy",
    "error": "Database connection failed",
    "timestamp": "2024-01-20T15:30:00Z"
  }
}
```

## 🔧 Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "expected": "valid email address",
      "received": "invalid-email"
    }
  },
  "timestamp": "2024-01-20T15:30:00Z"
}
```

### Common Error Codes

#### Authentication Errors
- `AUTH_REQUIRED`: Authentication required but not provided
- `AUTH_INVALID`: Invalid or expired session
- `AUTH_FORBIDDEN`: Insufficient permissions for action
- `AUTH_RATE_LIMITED`: Too many authentication attempts

#### Validation Errors
- `VALIDATION_ERROR`: Request data validation failed
- `MISSING_FIELD`: Required field not provided
- `INVALID_FORMAT`: Data format doesn't match expected pattern
- `OUT_OF_RANGE`: Numeric value outside acceptable range

#### Business Logic Errors
- `SUBSCRIPTION_REQUIRED`: Active subscription needed for action
- `SUBSCRIPTION_EXPIRED`: Subscription has expired
- `PAYMENT_INVALID`: Payment verification failed
- `DUPLICATE_TRANSACTION`: Transaction hash already used

#### System Errors
- `EXTERNAL_API_ERROR`: External service (CoinGecko) unavailable
- `DATABASE_ERROR`: Database operation failed
- `EMAIL_SERVICE_ERROR`: Email delivery failed
- `RATE_LIMIT_EXCEEDED`: API rate limit exceeded

### HTTP Status Codes
- `200`: Success
- `201`: Created successfully
- `400`: Bad request (validation error)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `409`: Conflict (duplicate resource)
- `422`: Unprocessable entity (business logic error)
- `429`: Too many requests (rate limited)
- `500`: Internal server error
- `503`: Service unavailable

## 📊 Rate Limiting

### Rate Limit Headers
All responses include rate limiting information:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642681800
```

### Rate Limit Policies

#### General API Endpoints
- **Limit**: 60 requests per minute per IP
- **Window**: 60 seconds
- **Scope**: Per IP address

#### Authentication Endpoints
- **Limit**: 10 requests per minute per IP
- **Window**: 60 seconds
- **Scope**: Per IP address

#### Admin Endpoints
- **Limit**: 30 requests per minute per session
- **Window**: 60 seconds
- **Scope**: Per authenticated admin session

#### Notification Testing
- **Limit**: 3 requests per hour per user
- **Window**: 3600 seconds
- **Scope**: Per authenticated user

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 45
  },
  "timestamp": "2024-01-20T15:30:00Z"
}
```

## 🔒 Security

### HTTPS/TLS
- All API endpoints require HTTPS in production
- TLS 1.2+ encryption for all communications
- HTTP Strict Transport Security (HSTS) headers

### Authentication
- Session-based authentication with HTTP-only cookies
- Secure cookie flags: `HttpOnly`, `Secure`, `SameSite=Strict`
- Session timeout: 24 hours
- Automatic session extension on activity

### Input Validation
- All inputs validated with Zod schemas
- SQL injection prevention through parameterized queries
- XSS prevention with output encoding
- CSRF protection with token validation

### API Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: [comprehensive policy]
Referrer-Policy: strict-origin-when-cross-origin
```

## 📝 Examples

### Complete User Registration Flow
```javascript
// 1. Register new user
const registerResponse = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!'
  })
});

// 2. Login to get session
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important for cookies
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!'
  })
});

// 3. Access protected data
const cryptoData = await fetch('/api/crypto/top100', {
  credentials: 'include' // Include session cookie
});
```

### Subscription Creation
```javascript
// 1. Get subscription configuration
const config = await fetch('/api/subscription/config');
const { plans, payment } = await config.json();

// 2. Create subscription with payment
const subscription = await fetch('/api/subscription/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    plan: 'monthly',
    paymentTxHash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    amount: 3.0
  })
});
```

### Admin User Management
```javascript
// 1. Get all users (admin only)
const users = await fetch('/api/admin/users?page=1&limit=50', {
  credentials: 'include'
});

// 2. Update user role
const updateUser = await fetch('/api/admin/users/user_1234567890', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    role: 'admin',
    isActive: true
  })
});
```

---

**API Version**: 1.0  
**Last Updated**: December 2024  
**Base URL**: https://coinspree.cc/api  
**Support**: support@urgent.coinspree.cc