#!/bin/bash

# CoinSpree ACTUAL Production Deployment Script
# This script will guide you through the real deployment process

set -e

echo "🚀 CoinSpree Production Deployment"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the CoinSpree project directory"
    exit 1
fi

echo "✅ Project directory verified"

# Check if build works
echo "🔨 Testing production build..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Production build successful"
else
    echo "❌ Build failed - check for errors"
    exit 1
fi

# Check Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo "✅ Vercel CLI ready"

# Check if logged in
echo "🔐 Checking Vercel authentication..."
if vercel whoami > /dev/null 2>&1; then
    VERCEL_USER=$(vercel whoami 2>/dev/null)
    echo "✅ Logged in as: $VERCEL_USER"
else
    echo "❌ Not logged into Vercel"
    echo ""
    echo "👉 MANUAL STEP REQUIRED:"
    echo "   Run: vercel login"
    echo "   Then re-run this script"
    exit 1
fi

# Show generated secrets
echo ""
echo "🔑 Generated Production Secrets:"
echo "================================"
cat .env.production.secrets
echo ""

# Initialize or deploy
echo "🚀 Ready to deploy!"
echo ""
echo "Choose deployment option:"
echo "1) Initialize new Vercel project"
echo "2) Deploy existing project to production"
echo "3) Just show deployment URLs"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "🆕 Initializing new Vercel project..."
        vercel
        ;;
    2)
        echo "🚀 Deploying to production..."
        vercel --prod
        ;;
    3)
        echo "📊 Checking deployment status..."
        vercel ls
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment process completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Set up Vercel KV database in dashboard"
echo "2. Configure environment variables in Vercel"  
echo "3. Test your live deployment"
echo ""
echo "📖 See ACTUAL_DEPLOYMENT.md for detailed instructions"