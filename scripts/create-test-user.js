const { kv } = require('@vercel/kv')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

function generateId(length = 16) {
  return crypto.randomBytes(length).toString('hex').substring(0, length)
}

async function createTestUser() {
  try {
    console.log('Creating test user with active subscription...')

    const testEmail = 'test@coinspree.cc'
    const testPassword = 'TestPassword123!'

    // Check if user already exists
    const existingUserId = await kv.get(`user:email:${testEmail}`)
    if (existingUserId) {
      console.log('Test user already exists, deleting first...')
      const existingUser = await kv.hgetall(`user:${existingUserId}`)
      if (existingUser) {
        // Delete existing subscription
        const existingSubId = await kv.get(
          `user:subscription:${existingUserId}`
        )
        if (existingSubId) {
          await kv.del(`subscription:${existingSubId}`)
          await kv.del(`user:subscription:${existingUserId}`)
        }

        // Delete existing user
        await kv.del(`user:${existingUserId}`)
        await kv.del(`user:email:${testEmail}`)
        await kv.srem('users:all', existingUserId)
      }
    }

    // Create new test user
    const userId = generateId(16)
    const passwordHash = await bcrypt.hash(testPassword, 12)

    const user = {
      id: userId,
      email: testEmail,
      passwordHash: passwordHash,
      role: 'user',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      notificationsEnabled: true,
    }

    // Save user to database
    await Promise.all([
      kv.hset(`user:${userId}`, user),
      kv.set(`user:email:${testEmail}`, userId),
      kv.sadd('users:all', userId),
    ])

    console.log('✅ Test user created:', testEmail)

    // Create active subscription (30 days from now)
    const subscriptionId = generateId(16)
    const startDate = new Date()
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const subscription = {
      id: subscriptionId,
      userId: userId,
      status: 'active',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      paymentTxHash: 'test_transaction_hash_' + generateId(32),
      amount: 10, // 10 USDT
    }

    // Save subscription to database
    await Promise.all([
      kv.hset(`subscription:${subscriptionId}`, subscription),
      kv.set(`user:subscription:${userId}`, subscriptionId),
    ])

    console.log('✅ Active subscription created (expires in 30 days)')

    // Create admin test user as well
    const adminEmail = 'admin@coinspree.cc'
    const adminPassword = 'AdminPassword123!'
    const adminUserId = generateId(16)
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12)

    const adminUser = {
      id: adminUserId,
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      notificationsEnabled: true,
    }

    // Save admin user
    await Promise.all([
      kv.hset(`user:${adminUserId}`, adminUser),
      kv.set(`user:email:${adminEmail}`, adminUserId),
      kv.sadd('users:all', adminUserId),
    ])

    console.log('✅ Admin user created:', adminEmail)

    console.log('\n🎉 Test accounts created successfully!')
    console.log('\n📋 Login Credentials:')
    console.log('─'.repeat(50))
    console.log(`👤 Regular User (with active subscription):`)
    console.log(`   Email: ${testEmail}`)
    console.log(`   Password: ${testPassword}`)
    console.log(
      `   Subscription: Active (expires ${endDate.toLocaleDateString()})`
    )
    console.log()
    console.log(`👑 Admin User:`)
    console.log(`   Email: ${adminEmail}`)
    console.log(`   Password: ${adminPassword}`)
    console.log(`   Role: Admin`)
    console.log('─'.repeat(50))
    console.log('\n🌐 You can now login at: http://localhost:3000/login')
  } catch (error) {
    console.error('❌ Error creating test user:', error)
    process.exit(1)
  }
}

// Run the script
createTestUser()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
