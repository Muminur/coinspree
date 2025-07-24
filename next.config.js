/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  swcMinify: true,
  
  // Image optimization
  images: {
    domains: ['assets.coingecko.com', 'tronscan.org'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 3600, // 1 hour
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Compression and optimization
  compress: true,
  poweredByHeader: false,
  
  // Performance optimizations
  experimental: {
    scrollRestoration: true,
  },
  
  // Security headers (additional to vercel.json)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
          }
        ],
      },
    ]
  },
  
  // Environment configuration
  env: {
    CUSTOM_KEY: process.env.NODE_ENV,
  },
  
  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Production-specific optimizations
    if (!dev && !isServer) {
      // Optimize bundle size
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      }
      
      // Minimize bundle size
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
    }
    
    // Ignore unnecessary files
    config.watchOptions = {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        '**/coverage/**',
        '**/docs/**',
        '**/*.test.{js,ts,tsx}',
        '**/*.spec.{js,ts,tsx}',
      ],
    }
    
    return config
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: true,
    dirs: ['src', 'app', 'lib', 'components'],
  },
  
  // Output configuration for deployment
  output: 'standalone',
  
  // Redirects for SEO and user experience
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/dashboard/home',
        destination: '/dashboard',
        permanent: true,
      },
      {
        source: '/api/docs',
        destination: '/docs/api',
        permanent: true,
      },
    ]
  },
  
  // Rewrites for clean URLs
  async rewrites() {
    return [
      {
        source: '/docs/:path*',
        destination: '/docs/:path*',
      },
      {
        source: '/sitemap.xml',
        destination: '/api/sitemap',
      },
      {
        source: '/robots.txt',
        destination: '/api/robots',
      },
    ]
  },
}

module.exports = nextConfig
