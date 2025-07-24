@echo off
echo ================================
echo   CoinSpree Production Deployment
echo ================================
echo.

cd /d "%~dp0"

echo Checking build status...
call npm run build >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Build failed - check for errors
    pause
    exit /b 1
)
echo ✅ Build successful

echo.
echo Ready for deployment!
echo.
echo STEP 1: Login to Vercel
echo ------------------------
echo Run: vercel login
echo.
echo STEP 2: Deploy to Production  
echo ----------------------------
echo Run: vercel --prod --confirm
echo.
echo STEP 3: Configure Database
echo -------------------------
echo 1. Go to https://vercel.com/dashboard
echo 2. Create KV Database named "coinspree-production" 
echo 3. Copy connection strings to environment variables
echo.
echo Your production secrets:
echo ------------------------
type .env.production.secrets
echo.
echo See MILESTONE_10_COMPLETION.md for detailed instructions
echo.
pause