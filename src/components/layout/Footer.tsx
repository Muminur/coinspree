import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 mt-auto overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>
      
      <div className="container mx-auto px-4 py-12 relative">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-xl blur-lg opacity-40"></div>
                <div className="relative text-2xl bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 p-2 rounded-xl">
                  🚀
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  CoinSpree
                </span>
                <span className="text-xs text-blue-300/60 font-medium">
                  ATH Tracker Pro
                </span>
              </div>
            </div>
            <p className="text-sm text-blue-100/70 leading-relaxed">
              Real-time cryptocurrency All-Time High notifications for serious traders and investors worldwide.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-300">Live Tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-xs text-blue-300">Top 100 Coins</span>
              </div>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-6">
            <div className="relative">
              <h3 className="font-semibold text-white text-lg">📊 Product</h3>
              <div className="absolute -bottom-1 left-0 w-12 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
            </div>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/dashboard" className="text-blue-100/80 hover:text-white transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1 h-1 bg-blue-400 rounded-full group-hover:bg-white transition-colors"></span>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/subscription" className="text-blue-100/80 hover:text-white transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1 h-1 bg-blue-400 rounded-full group-hover:bg-white transition-colors"></span>
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/dashboard/ath-history" className="text-blue-100/80 hover:text-white transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1 h-1 bg-blue-400 rounded-full group-hover:bg-white transition-colors"></span>
                  ATH Analytics
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div className="space-y-6">
            <div className="relative">
              <h3 className="font-semibold text-white text-lg">👤 Account</h3>
              <div className="absolute -bottom-1 left-0 w-12 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"></div>
            </div>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/login" className="text-blue-100/80 hover:text-white transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1 h-1 bg-purple-400 rounded-full group-hover:bg-white transition-colors"></span>
                  Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-blue-100/80 hover:text-white transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1 h-1 bg-purple-400 rounded-full group-hover:bg-white transition-colors"></span>
                  Create Account
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-blue-100/80 hover:text-white transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1 h-1 bg-purple-400 rounded-full group-hover:bg-white transition-colors"></span>
                  User Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <div className="relative">
              <h3 className="font-semibold text-white text-lg">🛟 Support</h3>
              <div className="absolute -bottom-1 left-0 w-12 h-0.5 bg-gradient-to-r from-pink-400 to-orange-400 rounded-full"></div>
            </div>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/help" className="text-blue-100/80 hover:text-white transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1 h-1 bg-pink-400 rounded-full group-hover:bg-white transition-colors"></span>
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-blue-100/80 hover:text-white transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1 h-1 bg-pink-400 rounded-full group-hover:bg-white transition-colors"></span>
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-blue-100/80 hover:text-white transition-all duration-300 flex items-center gap-2 group">
                  <span className="w-1 h-1 bg-pink-400 rounded-full group-hover:bg-white transition-colors"></span>
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="border-t border-white/10 mt-12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <p className="text-sm text-blue-100/60">
                © {currentYear} CoinSpree. All rights reserved.
              </p>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-300">Live API</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                  <span className="text-blue-300">⚡ Vercel</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-xs text-blue-100/50">
                Powered by
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border border-white/10">
                <div className="text-sm">🦎</div>
                <span className="text-sm font-medium bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                  CoinGecko API
                </span>
              </div>
            </div>
          </div>
          
          {/* Decorative Elements */}
          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
              <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
              <div className="w-8 h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}