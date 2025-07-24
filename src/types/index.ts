// Core Application Types

// User Management
export interface User {
  id: string
  email: string
  passwordHash: string
  role: 'user' | 'admin'
  isActive: boolean
  createdAt: string
  lastLogin: string
  notificationsEnabled: boolean
}

// User without sensitive information for client-side use
export interface SafeUser {
  id: string
  userId?: string // for backward compatibility
  email: string
  role: 'user' | 'admin'
  isActive: boolean
  createdAt: string
  lastLogin: string
  notificationsEnabled: boolean
}

// Subscription System
export interface Subscription {
  id: string
  userId: string
  status: 'pending' | 'active' | 'expired' | 'blocked'
  startDate: string
  endDate: string
  paymentTxHash: string
  amount: number
  createdAt?: string
}

// Cryptocurrency Data
export interface CryptoAsset {
  id: string // CoinGecko ID
  symbol: string
  name: string
  currentPrice: number
  marketCap: number
  marketCapRank: number
  totalVolume: number
  ath: number
  athDate: string
  lastUpdated: string
  priceChangePercentage24h?: number
  isNewATH?: boolean
}

// ATH Detection and Notifications
export interface NotificationLog {
  id: string
  cryptoId: string
  newATH: number
  previousATH: number
  sentAt: string
  recipientCount: number
}

// Authentication
export interface AuthSession {
  id: string
  userId: string
  email: string
  role: 'user' | 'admin'
  isActive: boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  confirmPassword: string
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form Types
export interface UserProfileForm {
  email: string
  notificationsEnabled: boolean
}

export interface PasswordResetForm {
  email: string
}

export interface ChangePasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// External API Types
export interface CoinGeckoResponse {
  id: string
  symbol: string
  name: string
  current_price: number
  market_cap: number
  market_cap_rank: number
  ath: number
  ath_date: string
  last_updated: string
}

// Application Configuration
export interface AppConfig {
  subscriptionPriceUSDT: number
  subscriptionDurationDays: number
  tronWalletAddress: string
  coinGeckoApiKey?: string
  resendApiKey: string
}

// Database Operations
export interface DatabaseError extends Error {
  code?: string
  details?: string
}

// Email Types
export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface ATHNotificationData {
  cryptoName: string
  symbol: string
  newATH: number
  previousATH: number
  percentageIncrease: number
  athDate: string
}

export interface EmailDeliveryLog {
  id: string
  userId: string
  emailType:
    | 'ath-notification'
    | 'welcome'
    | 'subscription-expiry'
    | 'password-reset'
  recipientEmail: string
  subject: string
  status: 'sent' | 'delivered' | 'bounced' | 'failed'
  resendId?: string
  sentAt: string
  deliveredAt?: string
  errorMessage?: string
}

export interface UnsubscribeToken {
  id: string
  userId: string
  token: string
  createdAt: string
  expiresAt: string
}

// Utility Types
export type UserRole = 'user' | 'admin'
export type SubscriptionStatus = 'pending' | 'active' | 'expired' | 'blocked'
export type NotificationPreference = boolean

// Error Types
export interface ValidationError {
  field: string
  message: string
}

export interface FormErrors {
  [key: string]: string
}

// Password Reset
export interface PasswordReset {
  id: string
  userId: string
  token: string
  expiresAt: string
  createdAt: string
}
