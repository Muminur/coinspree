# Test User Accounts for CoinSpree

Since the KV database isn't configured yet, here are the test account credentials for when you set up authentication:

## 🧪 Test Accounts

### Regular User (with Active Subscription)

- **Email:** `test@coinspree.cc`
- **Password:** `TestPassword123!`
- **Role:** User
- **Subscription Status:** Active (30 days)
- **Notifications:** Enabled

### Admin User

- **Email:** `admin@coinspree.cc`
- **Password:** `AdminPassword123!`
- **Role:** Admin
- **Access:** Full admin panel access

### Special User (with 10-Year Subscription)

- **Email:** `munna786bd@gmail.com`
- **Password:** `aDmin@7878`
- **Role:** User
- **Subscription Status:** Active (10 years - expires July 2034)
- **Notifications:** Enabled
- **Special Features:** Long-term subscription for extended testing

### Owner User (with 10-Year Subscription)

- **Email:** `muminurbsccl@gmail.com`
- **Password:** `Owner@2024`
- **Role:** User
- **Subscription Status:** Active (10 years - expires July 2034)
- **Notifications:** Enabled
- **Special Features:** Owner account with long-term subscription for email testing

## 🔧 Setup Instructions

To use these accounts, you need to:

1. **Configure Vercel KV Database:**

   ```bash
   # Get these from your Vercel project dashboard
   VERCEL_KV_REST_API_URL=your_kv_url
   VERCEL_KV_REST_API_TOKEN=your_kv_token
   ```

2. **Optional Services (for full functionality):**

   ```bash
   RESEND_API_KEY=your_resend_key         # Email notifications
   COINGECKO_API_KEY=your_coingecko_key   # Crypto data (optional)
   EDGE_CONFIG=your_edge_config_url       # Email templates
   ```

3. **Create test users:** Once KV is configured, make a POST request to:
   ```
   POST http://localhost:3000/api/dev/create-test-user
   ```

## 🎯 What You Can Test

### With Regular User Account:

- ✅ User registration/login flow
- ✅ Dashboard with crypto data
- ✅ Subscription status (active)
- ✅ Notification preferences
- ✅ ATH notifications (when subscription active)

### With Admin Account:

- ✅ Admin panel access
- ✅ User management
- ✅ Subscription management
- ✅ Bulk notifications
- ✅ System analytics

### With Special User Account:

- ✅ Long-term subscription testing (10 years)
- ✅ Extended notification testing
- ✅ Subscription extension edge cases
- ✅ Long-term user experience testing
- ✅ Date calculation validation

## 🚀 Quick Start (Without KV Setup)

For immediate testing of the UI:

1. Visit http://localhost:3000
2. Check the registration/login pages work
3. UI components render correctly
4. Responsive design on mobile

Note: Authentication and data persistence require KV database configuration.
