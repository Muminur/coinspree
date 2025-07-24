import { z } from 'zod'

// User Authentication Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

// Create custom password validation with better error messages
const passwordValidation = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .refine((password) => /[a-z]/.test(password), {
    message: 'Password must include at least one lowercase letter (a-z)',
  })
  .refine((password) => /[A-Z]/.test(password), {
    message: 'Password must include at least one uppercase letter (A-Z)',
  })
  .refine((password) => /\d/.test(password), {
    message: 'Password must include at least one number (0-9)',
  })

export const registerSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: passwordValidation,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Please enter your current password'),
    newPassword: passwordValidation,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// User Profile Schemas
export const userProfileSchema = z.object({
  email: z.string().email('Invalid email address'),
  notificationsEnabled: z.boolean(),
})

// Database Entity Schemas
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  role: z.enum(['user', 'admin']),
  isActive: z.boolean(),
  createdAt: z.string(),
  lastLogin: z.string(),
  notificationsEnabled: z.boolean(),
})

export const subscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: z.enum(['active', 'expired', 'blocked']),
  startDate: z.string(),
  endDate: z.string(),
  paymentTxHash: z.string(),
  amount: z.number().positive(),
})

export const cryptoAssetSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  currentPrice: z.number().positive(),
  marketCap: z.number().positive(),
  marketCapRank: z.number().positive(),
  ath: z.number().positive(),
  athDate: z.string(),
  lastUpdated: z.string(),
})

// Subscription Management Schemas
export const subscriptionCreateSchema = z.object({
  paymentTxHash: z
    .string()
    .min(1, 'Transaction hash is required')
    .regex(/^[a-fA-F0-9]{64}$/, 'Invalid transaction hash format'),
  amount: z.number().positive('Amount must be positive'),
  duration: z.number().int().positive('Duration must be a positive integer').optional(),
})

export const subscriptionVerifySchema = z.object({
  subscriptionId: z.string(),
  paymentTxHash: z.string(),
})

// Admin Schemas
export const adminUserUpdateSchema = z.object({
  email: z.string().email().optional(),
  role: z.enum(['user', 'admin']).optional(),
  isActive: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
})

export const adminSubscriptionUpdateSchema = z.object({
  status: z.enum(['active', 'expired', 'blocked']).optional(),
  endDate: z.string().optional(),
})

// API Query Schemas
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().min(1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().min(1).max(100)),
})

export const cryptoSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  ...paginationSchema.shape,
})

// Environment Variables Schema
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  VERCEL_KV_URL: z.string().optional(),
  VERCEL_KV_REST_API_URL: z.string().optional(),
  VERCEL_KV_REST_API_TOKEN: z.string().optional(),
  EDGE_CONFIG: z.string().optional(),
  NEXTAUTH_SECRET: z.string().min(32, 'Secret must be at least 32 characters'),
  PASSWORD_SALT_ROUNDS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(10).max(15)),
  COINGECKO_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SUBSCRIPTION_PRICE_USDT: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().positive()),
  SUBSCRIPTION_DURATION_DAYS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  TRON_WALLET_ADDRESS: z.string().optional(),
})

// Email Notification Schemas
export const athNotificationSchema = z.object({
  cryptoId: z.string(),
  cryptoName: z.string(),
  symbol: z.string(),
  newATH: z.number().positive(),
  previousATH: z.number().positive(),
  percentageIncrease: z.number().positive(),
  athDate: z.string(),
})

// Type exports for use throughout the application
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
export type UserProfileFormData = z.infer<typeof userProfileSchema>
export type SubscriptionCreateData = z.infer<typeof subscriptionCreateSchema>
export type PaginationQuery = z.infer<typeof paginationSchema>
export type CryptoSearchQuery = z.infer<typeof cryptoSearchSchema>
export type EnvConfig = z.infer<typeof envSchema>
