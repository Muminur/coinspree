import { z } from 'zod'
import { 
  RegisterSchema, 
  LoginSchema, 
  PasswordResetSchema,
  SubscriptionCreateSchema,
  UserUpdateSchema,
  ContactFormSchema 
} from '@/lib/validations'

describe('Validation Schemas', () => {
  describe('RegisterSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      }
      
      const result = RegisterSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test..email@example.com',
        'test@example',
      ]
      
      invalidEmails.forEach(email => {
        const result = RegisterSchema.safeParse({
          email,
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
        })
        expect(result.success).toBe(false)
      })
    })

    it('should reject weak passwords', () => {
      const weakPasswords = [
        '123',           // Too short
        'password',      // No uppercase, no numbers, no special chars
        'PASSWORD',      // No lowercase, no numbers, no special chars
        '12345678',      // No letters
        'Password',      // No numbers, no special chars
        'Password123',   // No special chars
      ]
      
      weakPasswords.forEach(password => {
        const result = RegisterSchema.safeParse({
          email: 'test@example.com',
          password,
          confirmPassword: password,
        })
        expect(result.success).toBe(false)
      })
    })

    it('should require password confirmation match', () => {
      const result = RegisterSchema.safeParse({
        email: 'test@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'DifferentPassword123!',
      })
      
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toContain('Passwords do not match')
    })

    it('should trim and lowercase emails', () => {
      const result = RegisterSchema.safeParse({
        email: '  TEST@EXAMPLE.COM  ',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      })
      
      expect(result.success).toBe(true)
      expect(result.data?.email).toBe('test@example.com')
    })
  })

  describe('LoginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      }
      
      const result = LoginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty fields', () => {
      const invalidData = [
        { email: '', password: 'password123' },
        { email: 'test@example.com', password: '' },
        { email: '', password: '' },
      ]
      
      invalidData.forEach(data => {
        const result = LoginSchema.safeParse(data)
        expect(result.success).toBe(false)
      })
    })

    it('should normalize email format', () => {
      const result = LoginSchema.safeParse({
        email: '  USER@EXAMPLE.COM  ',
        password: 'password123',
      })
      
      expect(result.success).toBe(true)
      expect(result.data?.email).toBe('user@example.com')
    })
  })

  describe('PasswordResetSchema', () => {
    it('should validate password reset with token', () => {
      const validData = {
        token: 'valid-reset-token',
        password: 'NewSecurePassword123!',
        confirmPassword: 'NewSecurePassword123!',
      }
      
      const result = PasswordResetSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid tokens', () => {
      const result = PasswordResetSchema.safeParse({
        token: '',
        password: 'NewSecurePassword123!',
        confirmPassword: 'NewSecurePassword123!',
      })
      
      expect(result.success).toBe(false)
    })

    it('should apply password strength requirements', () => {
      const result = PasswordResetSchema.safeParse({
        token: 'valid-token',
        password: 'weak',
        confirmPassword: 'weak',
      })
      
      expect(result.success).toBe(false)
    })
  })

  describe('SubscriptionCreateSchema', () => {
    it('should validate correct subscription data', () => {
      const validData = {
        paymentTxHash: '0x1234567890abcdef1234567890abcdef12345678',
        amount: 30,
        plan: 'yearly',
      }
      
      const result = SubscriptionCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid transaction hashes', () => {
      const invalidHashes = [
        '',
        '0x123', // Too short
        'invalid-hash',
        '1234567890abcdef', // No 0x prefix
      ]
      
      invalidHashes.forEach(paymentTxHash => {
        const result = SubscriptionCreateSchema.safeParse({
          paymentTxHash,
          amount: 30,
          plan: 'yearly',
        })
        expect(result.success).toBe(false)
      })
    })

    it('should validate subscription amounts', () => {
      const validAmounts = [3, 30] // Monthly and yearly
      const invalidAmounts = [0, -1, 5, 100]
      
      validAmounts.forEach(amount => {
        const result = SubscriptionCreateSchema.safeParse({
          paymentTxHash: '0x1234567890abcdef1234567890abcdef12345678',
          amount,
          plan: amount === 3 ? 'monthly' : 'yearly',
        })
        expect(result.success).toBe(true)
      })
      
      invalidAmounts.forEach(amount => {
        const result = SubscriptionCreateSchema.safeParse({
          paymentTxHash: '0x1234567890abcdef1234567890abcdef12345678',
          amount,
          plan: 'monthly',
        })
        expect(result.success).toBe(false)
      })
    })

    it('should validate plan types', () => {
      const validPlans = ['monthly', 'yearly']
      const invalidPlans = ['weekly', 'lifetime', '', 'invalid']
      
      validPlans.forEach(plan => {
        const result = SubscriptionCreateSchema.safeParse({
          paymentTxHash: '0x1234567890abcdef1234567890abcdef12345678',
          amount: plan === 'monthly' ? 3 : 30,
          plan,
        })
        expect(result.success).toBe(true)
      })
      
      invalidPlans.forEach(plan => {
        const result = SubscriptionCreateSchema.safeParse({
          paymentTxHash: '0x1234567890abcdef1234567890abcdef12345678',
          amount: 30,
          plan,
        })
        expect(result.success).toBe(false)
      })
    })
  })

  describe('UserUpdateSchema', () => {
    it('should validate user profile updates', () => {
      const validData = {
        email: 'newemail@example.com',
        notificationsEnabled: true,
      }
      
      const result = UserUpdateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should allow partial updates', () => {
      const partialUpdates = [
        { email: 'newemail@example.com' },
        { notificationsEnabled: false },
        {},
      ]
      
      partialUpdates.forEach(data => {
        const result = UserUpdateSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should validate email format in updates', () => {
      const result = UserUpdateSchema.safeParse({
        email: 'invalid-email-format',
      })
      
      expect(result.success).toBe(false)
    })

    it('should validate notification preferences type', () => {
      const result = UserUpdateSchema.safeParse({
        notificationsEnabled: 'true', // String instead of boolean
      })
      
      expect(result.success).toBe(false)
    })
  })

  describe('ContactFormSchema', () => {
    it('should validate contact form submission', () => {
      const validData = {
        email: 'user@example.com',
        subject: 'Payment Issue',
        message: 'I have a problem with my payment processing.',
        transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
      }
      
      const result = ContactFormSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should require minimum message length', () => {
      const result = ContactFormSchema.safeParse({
        email: 'user@example.com',
        subject: 'Payment Issue',
        message: 'Hi', // Too short
      })
      
      expect(result.success).toBe(false)
    })

    it('should enforce maximum message length', () => {
      const longMessage = 'A'.repeat(2001) // Exceeds 2000 character limit
      
      const result = ContactFormSchema.safeParse({
        email: 'user@example.com',
        subject: 'Payment Issue',
        message: longMessage,
      })
      
      expect(result.success).toBe(false)
    })

    it('should allow optional transaction hash', () => {
      const dataWithoutTxHash = {
        email: 'user@example.com',
        subject: 'General Question',
        message: 'I have a general question about the service.',
      }
      
      const result = ContactFormSchema.safeParse(dataWithoutTxHash)
      expect(result.success).toBe(true)
    })

    it('should validate transaction hash format when provided', () => {
      const result = ContactFormSchema.safeParse({
        email: 'user@example.com',
        subject: 'Payment Issue',
        message: 'I have a payment problem.',
        transactionHash: 'invalid-hash-format',
      })
      
      expect(result.success).toBe(false)
    })
  })

  describe('Edge Cases and Security', () => {
    it('should reject SQL injection attempts in email', () => {
      const maliciousEmails = [
        "test@example.com'; DROP TABLE users; --",
        "test@example.com' OR '1'='1",
        "test@example.com<script>alert('xss')</script>",
      ]
      
      maliciousEmails.forEach(email => {
        const result = LoginSchema.safeParse({
          email,
          password: 'password123',
        })
        expect(result.success).toBe(false)
      })
    })

    it('should handle very long input strings', () => {
      const longString = 'A'.repeat(10000)
      
      const result = RegisterSchema.safeParse({
        email: longString + '@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      })
      
      expect(result.success).toBe(false)
    })

    it('should reject null and undefined values', () => {
      const invalidData = [
        { email: null, password: 'password123' },
        { email: undefined, password: 'password123' },
        { email: 'test@example.com', password: null },
        { email: 'test@example.com', password: undefined },
      ]
      
      invalidData.forEach(data => {
        const result = LoginSchema.safeParse(data)
        expect(result.success).toBe(false)
      })
    })

    it('should strip HTML tags from text inputs', () => {
      const result = ContactFormSchema.safeParse({
        email: 'user@example.com',
        subject: '<script>alert("xss")</script>Payment Issue',
        message: 'I have a <b>payment</b> problem with <script>evil code</script>.',
      })
      
      expect(result.success).toBe(true)
      // The schema should sanitize HTML tags
      expect(result.data?.subject).not.toContain('<script>')
      expect(result.data?.message).not.toContain('<script>')
    })
  })

  describe('Custom Validation Rules', () => {
    it('should enforce password complexity requirements', () => {
      const passwordTests = [
        { password: 'Password123!', valid: true },
        { password: 'password123!', valid: false }, // No uppercase
        { password: 'PASSWORD123!', valid: false }, // No lowercase
        { password: 'Password!', valid: false },     // No numbers
        { password: 'Password123', valid: false },   // No special chars
        { password: 'Pass123!', valid: false },      // Too short
      ]
      
      passwordTests.forEach(({ password, valid }) => {
        const result = RegisterSchema.safeParse({
          email: 'test@example.com',
          password,
          confirmPassword: password,
        })
        expect(result.success).toBe(valid)
      })
    })

    it('should validate cryptocurrency transaction hash format', () => {
      const txHashTests = [
        { hash: '0x1234567890abcdef1234567890abcdef12345678', valid: true },
        { hash: '0x1234567890ABCDEF1234567890ABCDEF12345678', valid: true }, // Uppercase
        { hash: '1234567890abcdef1234567890abcdef12345678', valid: false },  // No 0x prefix
        { hash: '0x123', valid: false },                                      // Too short
        { hash: '0xZZZZ567890abcdef1234567890abcdef12345678', valid: false }, // Invalid chars
      ]
      
      txHashTests.forEach(({ hash, valid }) => {
        const result = SubscriptionCreateSchema.safeParse({
          paymentTxHash: hash,
          amount: 30,
          plan: 'yearly',
        })
        expect(result.success).toBe(valid)
      })
    })
  })
})