# CoinSpree Admin Manual

*Complete system administration guide for CoinSpree operators*

## 🎯 Overview

This manual provides comprehensive guidance for CoinSpree system administrators, covering user management, subscription oversight, system monitoring, and maintenance procedures.

## 🔐 Admin Access

### Getting Admin Access
1. **Admin account creation** requires manual database insertion
2. **Role assignment** must be set to `'admin'` in user record
3. **Access verification** through `/admin` route protection
4. **Session management** with elevated privileges

### Admin Login Process
1. Use standard login form at `/login`
2. System automatically detects admin role
3. Admin-specific navigation appears in header
4. Access to `/admin` routes is granted

### Security Considerations
- **Admin sessions** have same timeout as regular users
- **Activity logging** tracks all admin actions
- **Role verification** on every admin API call
- **IP monitoring** recommended for admin accounts

## 👥 User Management

### User Overview Dashboard
**Location**: `/admin/users`

#### Key Features
- **Complete user list** with search and filtering
- **User statistics** including registration trends
- **Quick actions** for common operations
- **Bulk operations** for multiple users

#### User Information Display
```
User ID: user_1234567890
Email: user@example.com
Role: user | admin
Status: active | inactive
Created: 2024-01-15 10:30:00 UTC
Last Login: 2024-01-20 14:25:15 UTC
Notifications: enabled | disabled
Subscription: active | expired | none
```

### User Operations

#### Creating Users
**Method**: Use existing registration API
**Process**:
1. Navigate to main registration page
2. Fill standard registration form
3. Manually update role in database if admin needed
4. Send welcome email notification

#### Editing User Information
**Location**: User edit modal from `/admin/users`

**Editable Fields**:
- Email address (requires verification)
- User role (user/admin)
- Account status (active/inactive)
- Notification preferences
- Password reset (generate new temporary password)

**Security Notes**:
- Email changes require re-verification
- Role changes are logged and tracked
- Admin role changes require confirmation
- Self-role modification is prevented

#### Deleting Users
**Process**:
1. Click delete button in user list
2. Confirm deletion with security prompt
3. System removes user data and sessions
4. Subscription data is preserved for audit

**Data Removal**:
- User account and profile data
- Active sessions and cookies
- Notification preferences
- Personal settings and history

**Data Retention**:
- Subscription payment history
- System logs and audit trails
- Email delivery logs (anonymized)
- Analytics data (aggregated only)

### User Search and Filtering

#### Search Options
- **Email search**: Partial email matching
- **User ID search**: Exact ID lookup
- **Date range**: Registration or last login
- **Status filter**: Active, inactive, or all

#### Bulk Operations
- **Status updates**: Activate/deactivate multiple users
- **Email notifications**: Send bulk announcements
- **Data export**: User list with selected fields
- **Role management**: Batch role updates

## 💳 Subscription Management

### Subscription Overview
**Location**: `/admin/subscriptions`

#### Dashboard Features
- **Subscription statistics** with status breakdown
- **Revenue tracking** by time period
- **Payment queue** for manual approval
- **Renewal monitoring** and alerts

#### Subscription Status Types
- **Active**: Valid subscription with future expiry
- **Expired**: Past expiry date, grace period applicable
- **Pending**: Payment submitted, awaiting approval
- **Blocked**: Admin-blocked subscription

### Payment Approval Workflow

#### Pending Payments Queue
**Location**: `/admin/subscriptions` (Pending tab)

**Information Display**:
```
User: user@example.com
Plan: Monthly ($3) | Yearly ($30)
Payment Hash: TXN123456789...
Amount: 3.00 USDT
Submitted: 2024-01-20 15:30:00 UTC
Status: Pending Approval
```

#### Approval Process
1. **Verify transaction** on Tron blockchain
   - Check transaction exists and is confirmed
   - Verify exact USDT amount matches plan
   - Confirm payment sent to correct wallet address
   - Validate transaction timestamp

2. **Approve payment**
   - Click "Approve" button in admin panel
   - System automatically activates subscription
   - User receives confirmation email
   - Dashboard updates with new status

3. **Rejection handling**
   - Document reason for rejection
   - Contact user with explanation
   - Provide guidance for correction
   - Allow resubmission if appropriate

#### Manual Verification Steps
```bash
# Check transaction on TronScan
https://tronscan.org/#/transaction/[TX_HASH]

# Verify details:
- From address (user's wallet)
- To address (our payment wallet)
- Amount (exact plan price)
- Token (USDT-TRC20)
- Status (confirmed)
- Timestamp (recent)
```

### Subscription Administration

#### Extending Subscriptions
**Use case**: Customer service, promotional extensions

**Process**:
1. Navigate to user's subscription details
2. Click "Extend Subscription" button
3. Select extension period (days)
4. Add administrative note
5. Confirm extension

**Billing Notes**:
- Extensions are additive to current expiry
- No payment required for admin extensions
- Changes are logged for audit purposes
- User receives notification of extension

#### Blocking Subscriptions
**Use case**: Fraud prevention, policy violations

**Process**:
1. Locate subscription in admin panel
2. Click "Block Subscription" action
3. Select reason from dropdown
4. Add detailed explanation note
5. Confirm blocking action

**Effects of Blocking**:
- Immediate termination of ATH notifications
- Dashboard access remains (limited)
- User sees "Subscription Blocked" status
- Customer service can contact for resolution

#### Revenue Analytics
**Location**: `/admin/analytics` (Revenue tab)

**Key Metrics**:
- **Monthly Recurring Revenue (MRR)**
- **Annual Recurring Revenue (ARR)**
- **Subscription conversion rates**
- **Average revenue per user (ARPU)**
- **Churn rate and retention analysis**

## 📊 System Analytics

### Analytics Dashboard
**Location**: `/admin/analytics`

#### Key Performance Indicators

##### User Metrics
```
Total Users: 1,247
Active Users (30 days): 892
New Registrations (7 days): 45
User Growth Rate: +12% month-over-month
```

##### Subscription Metrics
```
Active Subscriptions: 267
Subscription Rate: 21.4%
Monthly Revenue: $801 USDT
Yearly Revenue: $2,100 USDT
```

##### System Health
```
Uptime (30 days): 99.8%
Average Response Time: 245ms
ATH Detections (24h): 7
Email Delivery Rate: 99.2%
```

##### Engagement Metrics
```
Daily Active Users: 156
Dashboard Sessions: 3.2 avg/user
Notification Open Rate: 78%
Support Tickets: 3 (this week)
```

### Performance Monitoring

#### Real-time Metrics
**Location**: `/admin` (main dashboard)

**System Status Cards**:
- **API Health**: Response times and error rates
- **Database Performance**: Query speed and connectivity
- **External Services**: CoinGecko API, email service status
- **Background Jobs**: Cron job execution and success rates

#### Historical Analysis
**Location**: `/admin/analytics` (Performance tab)

**Charts and Trends**:
- Response time trends over time
- Error rate patterns and spikes
- User activity correlation with performance
- Resource utilization metrics

### ATH Detection Analytics

#### Detection Performance
```
ATH Detections Today: 3
Detection Accuracy: 100%
Average Detection Time: 47 seconds
False Positives: 0
```

#### Notification Delivery
```
Notifications Sent (24h): 156
Delivery Success Rate: 99.2%
Average Delivery Time: 23 seconds
Bounce Rate: 0.3%
Open Rate: 78%
```

## 🔧 System Configuration

### Application Settings
**Location**: `/admin/config`

#### Email Configuration
- **SMTP settings** and authentication
- **Email templates** management
- **Delivery preferences** and retry logic
- **Bounce handling** and blacklist management

#### ATH Detection Settings
- **Detection frequency** (currently 1 minute)
- **Price source** configuration (CoinGecko)
- **Threshold settings** for sensitivity
- **Coin list** management (top 100)

#### Payment Configuration
- **USDT wallet address** for payments
- **Price settings** for subscription plans
- **Payment tolerance** for amount verification
- **Manual approval** workflow settings

### Feature Flags
**Location**: Environment variables and Edge Config

#### Available Flags
```
FEATURE_ADMIN_PANEL=true
FEATURE_ATH_NOTIFICATIONS=true
FEATURE_SUBSCRIPTION_SYSTEM=true
FEATURE_EMAIL_NOTIFICATIONS=true
ENABLE_DEV_ENDPOINTS=false
```

#### Rate Limiting
```
COINGECKO_RATE_LIMIT_PER_MINUTE=50
EMAIL_RATE_LIMIT_PER_HOUR=100
USER_REGISTRATION_RATE_LIMIT=10
```

### Security Configuration

#### Authentication Settings
- **Session timeout**: 24 hours default
- **Password requirements**: Minimum 8 characters
- **Rate limiting**: Login attempts and API calls
- **CSRF protection**: Enabled by default

#### Content Security Policy
```
default-src 'self'
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com
style-src 'self' 'unsafe-inline'
img-src 'self' data: https://assets.coingecko.com https://tronscan.org
connect-src 'self' https://api.coingecko.com https://apilist.tronscanapi.com
```

## 🚨 System Maintenance

### Regular Maintenance Tasks

#### Daily Tasks (Automated)
- **Health checks** every 5 minutes
- **Session cleanup** for expired sessions
- **Log rotation** and cleanup
- **Rate limit reset** for API quotas

#### Weekly Tasks (Manual)
- **Performance review** of system metrics
- **User feedback** analysis and response
- **Security log** review for anomalies
- **Backup verification** and testing

#### Monthly Tasks (Scheduled)
- **Database optimization** and cleanup
- **Security updates** and patches
- **Performance tuning** based on metrics
- **Disaster recovery** testing

### Backup and Recovery

#### Data Backup Strategy
**Frequency**: Daily automated backups
**Retention**: 30 days for daily, 12 months for monthly
**Storage**: Vercel KV automatic backups + manual exports

**Data Categories**:
- User accounts and profiles
- Subscription and payment data
- ATH detection history
- System configuration settings

#### Recovery Procedures
**Scenario**: Database corruption or data loss

**Steps**:
1. Assess scope of data loss
2. Identify most recent clean backup
3. Restore data from backup source
4. Verify data integrity and completeness
5. Resume normal operations
6. Communicate with affected users

### System Updates

#### Deployment Process
1. **Staging deployment** with full testing
2. **User workflow validation** on staging
3. **Performance benchmarking** comparison
4. **Production deployment** during low-traffic hours
5. **Post-deployment monitoring** for 2 hours

#### Rollback Procedures
**Trigger conditions**:
- Critical errors affecting core functionality
- Performance degradation >50%
- Data corruption or integrity issues
- Security vulnerabilities discovered

**Rollback steps**:
1. Identify issue and confirm rollback needed
2. Execute Vercel deployment rollback
3. Verify previous version functionality
4. Monitor system stability for 1 hour
5. Communicate status to stakeholders

### Monitoring and Alerts

#### Alert Configuration

##### Critical Alerts (Immediate)
- System downtime or 5xx errors
- Database connectivity failure
- ATH detection system failure
- Email service outage

##### Warning Alerts (Within 1 hour)
- Performance degradation >2 seconds
- Error rate >1%
- External API failure (CoinGecko)
- Low disk space or memory issues

##### Information Alerts (Daily review)
- User growth metrics
- Revenue trends
- System performance summary
- Security event summary

#### Alert Channels
- **Email notifications**: admin@coinspree.cc
- **Slack integration**: #coinspree-alerts channel
- **SMS alerts**: For critical issues only
- **Dashboard notifications**: In-app alert center

## 🔒 Security Management

### Access Control

#### Admin Account Security
- **Strong password requirements** (minimum 12 characters)
- **Two-factor authentication** recommended
- **Session monitoring** for suspicious activity
- **Regular password rotation** (every 90 days)

#### API Security
- **Rate limiting** on all endpoints
- **Input validation** with Zod schemas
- **SQL injection** prevention (parameterized queries)
- **XSS protection** with CSP headers

### Security Monitoring

#### Activity Logging
**Events tracked**:
- Admin login/logout events
- User management actions
- Subscription modifications
- System configuration changes
- Data export operations

**Log format**:
```json
{
  "timestamp": "2024-01-20T15:30:00Z",
  "event": "user_modification",
  "admin_id": "admin_123",
  "target_user": "user_456",
  "action": "role_change",
  "old_value": "user",
  "new_value": "admin",
  "ip_address": "203.0.113.1"
}
```

#### Security Incident Response

##### Incident Classification
- **P0 Critical**: Data breach, system compromise
- **P1 High**: Unauthorized access, service disruption
- **P2 Medium**: Suspicious activity, policy violations
- **P3 Low**: Minor security concerns, false positives

##### Response Procedures
1. **Detection and Assessment** (0-15 minutes)
   - Identify nature and scope of incident
   - Classify severity level
   - Begin incident documentation

2. **Containment** (15-30 minutes)
   - Isolate affected systems
   - Prevent further damage
   - Preserve evidence for investigation

3. **Investigation** (30 minutes - 4 hours)
   - Analyze logs and system activity
   - Identify attack vectors and impact
   - Document findings and timeline

4. **Recovery** (1-24 hours)
   - Restore normal operations
   - Apply security patches
   - Monitor for continued threats

5. **Post-Incident** (1-7 days)
   - Complete incident report
   - Implement preventive measures
   - Update security procedures

## 📞 Support and Troubleshooting

### Common Issues

#### User Cannot Login
**Symptoms**: Login failures, password errors
**Diagnosis**:
1. Check user account status (active/inactive)
2. Verify email address spelling
3. Check for rate limiting on IP address
4. Review recent password reset requests

**Resolution**:
1. Reset user password if needed
2. Clear rate limits for IP address
3. Verify email address if changed
4. Check for database connectivity issues

#### ATH Notifications Not Sending
**Symptoms**: Users report missing ATH alerts
**Diagnosis**:
1. Check cron job execution logs
2. Verify CoinGecko API connectivity
3. Review email service status
4. Check user subscription status

**Resolution**:
1. Restart background job if needed
2. Verify API credentials and limits
3. Check email service configuration
4. Send manual test notifications

#### Payment Verification Issues
**Symptoms**: Valid payments not being approved
**Diagnosis**:
1. Verify transaction on Tron blockchain
2. Check USDT amount and recipient address
3. Review transaction confirmation status
4. Validate payment processing logic

**Resolution**:
1. Manually approve valid transactions
2. Update payment wallet address if needed
3. Adjust amount tolerance if necessary
4. Contact user for clarification

### System Diagnostics

#### Health Check Commands
```bash
# Check overall system health
curl https://coinspree.cc/api/health

# Verify database connectivity
curl https://coinspree.cc/api/health | jq '.services.database'

# Check external API status
curl https://coinspree.cc/api/health | jq '.services.externalApis'
```

#### Performance Analysis
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://coinspree.cc/

# Monitor API performance
curl -w "Response time: %{time_total}s" https://coinspree.cc/api/crypto/top100
```

#### Database Queries
```javascript
// Check user counts
await KV.scard('users:all')

// Review subscription status
await KV.smembers('subscriptions:active')

// Monitor email queue
await KV.llen('email:queue')
```

### Emergency Procedures

#### Service Outage
1. **Immediate response** (0-5 minutes)
   - Confirm outage scope and impact
   - Check Vercel dashboard for deployment issues
   - Verify external service status

2. **Communication** (5-15 minutes)
   - Update status page or social media
   - Send notification to stakeholders
   - Prepare user communication if needed

3. **Resolution** (15 minutes - 2 hours)
   - Implement fix or rollback deployment
   - Monitor system recovery
   - Verify full functionality restoration

#### Data Integrity Issues
1. **Assessment** (0-30 minutes)
   - Identify affected data scope
   - Stop write operations if necessary
   - Preserve current state for analysis

2. **Recovery** (30 minutes - 4 hours)
   - Restore from most recent clean backup
   - Verify data consistency and completeness
   - Resume normal operations gradually

3. **Prevention** (4-24 hours)
   - Identify root cause of corruption
   - Implement additional safeguards
   - Update backup and validation procedures

## 📈 Growth and Scaling

### Performance Optimization

#### Database Optimization
- **Query optimization** for common operations
- **Caching strategy** for frequently accessed data
- **Index optimization** for search operations
- **Connection pooling** for high concurrency

#### API Performance
- **Response caching** with appropriate TTL
- **Rate limiting** to prevent abuse
- **Query batching** for efficiency
- **Async processing** for heavy operations

### Scaling Considerations

#### User Growth Planning
**Current capacity**: ~5,000 users
**Scaling triggers**:
- User count >3,000 (monitor closely)
- API response time >1 second
- Email delivery delays >5 minutes
- Database query time >500ms

#### Infrastructure Scaling
**Vercel advantages**:
- Automatic scaling for traffic spikes
- Global CDN for fast page loads
- Serverless functions scale to zero
- Built-in monitoring and analytics

**Potential bottlenecks**:
- Vercel KV rate limits
- CoinGecko API rate limits
- Email service quotas
- Background job execution time

### Future Enhancements

#### Planned Features
- API access for developers
- Mobile app for iOS/Android
- Portfolio tracking integration
- Advanced analytics dashboard

#### Technical Improvements
- GraphQL API for efficient queries
- WebSocket connections for real-time updates
- Machine learning for price predictions
- Multi-language support

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Next Review**: March 2025  
**Contact**: admin@coinspree.cc