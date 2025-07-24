import { NextRequest, NextResponse } from 'next/server'
import { Auth } from '@/lib/auth'
import { KV } from '@/lib/kv'
import { StringUtils, DateUtils } from '@/lib/utils'
import type { Subscription } from '@/types'

export async function POST(_request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, error: 'Only available in development' },
        { status: 403 }
      )
    }

    console.log('Creating test users...')

    // Test user credentials
    const testEmail = 'test@coinspree.cc'
    const testPassword = 'TestPassword123!'
    const adminEmail = 'admin@coinspree.cc'
    const adminPassword = 'AdminPassword123!'
    const specialEmail = 'munna786bd@gmail.com'
    const specialPassword = 'aDmin@7878'
    const ownerEmail = 'muminurbsccl@gmail.com'
    const ownerPassword = 'Owner@2024'

    // Check if test user already exists
    const testUser = await KV.getUserByEmail(testEmail)
    if (testUser) {
      console.log('Test user already exists, deleting first...')
      // Delete existing subscription if any
      const existingSub = await KV.getUserSubscription(testUser.id)
      if (existingSub) {
        await KV.updateSubscription(existingSub.id, { status: 'expired' })
      }
      await KV.deleteUser(testUser.id)
    }

    // Check if admin user already exists
    const adminUser = await KV.getUserByEmail(adminEmail)
    if (adminUser) {
      console.log('Admin user already exists, deleting first...')
      await KV.deleteUser(adminUser.id)
    }

    // Create test user
    const testUserData = await Auth.createUser(testEmail, testPassword, 'user')
    console.log('✅ Test user created:', testEmail)

    // Create admin user
    await Auth.createUser(adminEmail, adminPassword, 'admin')
    console.log('✅ Admin user created:', adminEmail)

    // Check if special user already exists
    const specialUser = await KV.getUserByEmail(specialEmail)
    if (specialUser) {
      console.log('Special user already exists, deleting first...')
      // Delete existing subscription if any
      const existingSub = await KV.getUserSubscription(specialUser.id)
      if (existingSub) {
        await KV.updateSubscription(existingSub.id, { status: 'expired' })
      }
      await KV.deleteUser(specialUser.id)
    }

    // Create special user with 10-year subscription
    const specialUserData = await Auth.createUser(specialEmail, specialPassword, 'user')
    console.log('✅ Special user created:', specialEmail)

    // Check if owner user already exists
    const ownerUser = await KV.getUserByEmail(ownerEmail)
    if (ownerUser) {
      console.log('Owner user already exists, deleting first...')
      // Delete existing subscription if any
      const existingSub = await KV.getUserSubscription(ownerUser.id)
      if (existingSub) {
        await KV.updateSubscription(existingSub.id, { status: 'expired' })
      }
      await KV.deleteUser(ownerUser.id)
    }

    // Create owner user with 10-year subscription
    const ownerUserData = await Auth.createUser(ownerEmail, ownerPassword, 'user')
    console.log('✅ Owner user created:', ownerEmail)

    // Create active subscription for test user
    const subscriptionId = StringUtils.generateId(16)
    const startDate = new Date()
    const endDate = DateUtils.addDays(startDate, 30) // 30 days from now

    const subscription: Subscription = {
      id: subscriptionId,
      userId: testUserData.id,
      status: 'active',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      paymentTxHash: 'test_transaction_hash_' + StringUtils.generateId(32),
      amount: 10, // 10 USDT
    }

    await KV.createSubscription(subscription)
    console.log('✅ Active subscription created (expires in 30 days)')

    // Create 10-year subscription for special user
    const specialSubscriptionId = StringUtils.generateId(16)
    const specialStartDate = new Date()
    const specialEndDate = DateUtils.addDays(specialStartDate, 3650) // 10 years = 3650 days

    const specialSubscription: Subscription = {
      id: specialSubscriptionId,
      userId: specialUserData.id,
      status: 'active',
      startDate: specialStartDate.toISOString(),
      endDate: specialEndDate.toISOString(),
      paymentTxHash: 'special_10year_subscription_' + StringUtils.generateId(32),
      amount: 300, // 10 years worth (30 USDT per year * 10)
    }

    await KV.createSubscription(specialSubscription)
    console.log('✅ Special 10-year subscription created (expires in 10 years):', specialEndDate.toLocaleDateString())

    // Create 10-year subscription for owner user
    const ownerSubscriptionId = StringUtils.generateId(16)
    const ownerStartDate = new Date()
    const ownerEndDate = DateUtils.addDays(ownerStartDate, 3650) // 10 years = 3650 days

    const ownerSubscription: Subscription = {
      id: ownerSubscriptionId,
      userId: ownerUserData.id,
      status: 'active',
      startDate: ownerStartDate.toISOString(),
      endDate: ownerEndDate.toISOString(),
      paymentTxHash: 'owner_10year_subscription_' + StringUtils.generateId(32),
      amount: 300, // 10 years worth (30 USDT per year * 10)
    }

    await KV.createSubscription(ownerSubscription)
    console.log('✅ Owner 10-year subscription created (expires in 10 years):', ownerEndDate.toLocaleDateString())

    return NextResponse.json({
      success: true,
      message: 'Test users created successfully',
      accounts: {
        testUser: {
          email: testEmail,
          password: testPassword,
          role: 'user',
          subscription: 'active',
          expiresAt: endDate.toLocaleDateString(),
        },
        adminUser: {
          email: adminEmail,
          password: adminPassword,
          role: 'admin',
        },
        specialUser: {
          email: specialEmail,
          password: specialPassword,
          role: 'user',
          subscription: 'active',
          duration: '10 years',
          expiresAt: specialEndDate.toLocaleDateString(),
        },
        ownerUser: {
          email: ownerEmail,
          password: ownerPassword,
          role: 'user',
          subscription: 'active',
          duration: '10 years',
          expiresAt: ownerEndDate.toLocaleDateString(),
        },
      },
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`,
    })
  } catch (error) {
    console.error('Error creating test users:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET method to show instructions
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Only available in development' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    instructions: 'Send a POST request to this endpoint to create test users',
    availableUsers: [
      {
        type: 'Regular User with Active Subscription',
        email: 'test@coinspree.cc',
        password: 'TestPassword123!',
      },
      {
        type: 'Admin User',
        email: 'admin@coinspree.cc',
        password: 'AdminPassword123!',
      },
      {
        type: 'Special User with 10-Year Subscription',
        email: 'munna786bd@gmail.com',
        password: 'aDmin@7878',
      },
      {
        type: 'Owner User with 10-Year Subscription',
        email: 'muminurbsccl@gmail.com',
        password: 'Owner@2024',
      },
    ],
  })
}
