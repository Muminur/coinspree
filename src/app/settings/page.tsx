import { Auth } from '@/lib/auth'
import { MainLayout } from '@/components/layout/MainLayout'
import { Card, CardHeader } from '@/components/ui/Card'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export default async function SettingsPage() {
  const session = await Auth.requireAuth()

  return (
    <MainLayout showSidebar>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center lg:text-left">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
            ⚙️ Settings
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your account preferences and application settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Appearance Settings */}
          <Card>
            <CardHeader
              title="🎨 Appearance"
              description="Customize how CoinSpree looks and feels"
            />
            <div className="p-6 pt-0">
              <div className="space-y-6">
                {/* Theme Selection */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-sm">🎨</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Color Theme</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose your preferred appearance
                      </p>
                    </div>
                  </div>
                  
                  <ThemeToggle variant="dropdown" showLabels={false} />
                </div>

                {/* Theme Preview */}
                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3">Preview</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Light Preview */}
                    <div className="p-4 rounded-lg bg-white border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <div className="space-y-1">
                          <div className="h-2 bg-gray-800 rounded w-20"></div>
                          <div className="h-1.5 bg-gray-400 rounded w-16"></div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">Light Theme</div>
                    </div>

                    {/* Dark Preview */}
                    <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                        <div className="space-y-1">
                          <div className="h-2 bg-white rounded w-20"></div>
                          <div className="h-1.5 bg-gray-400 rounded w-16"></div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">Dark Theme</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Accessibility Settings */}
          <Card>
            <CardHeader
              title="♿ Accessibility"
              description="Settings to improve your experience"
            />
            <div className="p-6 pt-0">
              <div className="space-y-6">
                {/* Accessibility Options */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                        <span className="text-white text-sm">👁️</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">High Contrast</h3>
                        <p className="text-sm text-muted-foreground">
                          Increase color contrast for better visibility
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <span className="text-white text-sm">📏</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Large Text</h3>
                        <p className="text-sm text-muted-foreground">
                          Increase font size for better readability
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                        <span className="text-white text-sm">🔊</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Sound Effects</h3>
                        <p className="text-sm text-muted-foreground">
                          Play sounds for notifications and interactions
                        </p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Preferences Settings */}
        <Card>
          <CardHeader
            title="🔧 Preferences"
            description="Configure your CoinSpree experience"
          />
          <div className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Language & Region */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-sm">🌐</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Language & Region</h3>
                    <p className="text-sm text-muted-foreground">
                      Your language and regional preferences
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Language
                    </label>
                    <select className="w-full p-2 border border-border rounded-lg bg-background text-foreground">
                      <option>English (US)</option>
                      <option>English (UK)</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                      <option>Japanese</option>
                      <option>Korean</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Currency Display
                    </label>
                    <select className="w-full p-2 border border-border rounded-lg bg-background text-foreground">
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                      <option>GBP (£)</option>
                      <option>JPY (¥)</option>
                      <option>KRW (₩)</option>
                      <option>USDT</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Data & Performance */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <span className="text-white text-sm">⚡</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Data & Performance</h3>
                    <p className="text-sm text-muted-foreground">
                      Control data usage and performance settings
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Auto-refresh Data</p>
                      <p className="text-xs text-muted-foreground">Update crypto prices automatically</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Reduce Motion</p>
                      <p className="text-xs text-muted-foreground">Minimize animations and transitions</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader
            title="🔐 Account Management"
            description="Manage your account data and privacy"
          />
          <div className="p-6 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="p-4 border border-border rounded-lg hover:bg-muted transition-colors text-left">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <span className="text-white text-sm">📥</span>
                  </div>
                  <h3 className="font-semibold text-foreground">Export Data</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Download your account data and preferences
                </p>
              </button>

              <button className="p-4 border border-border rounded-lg hover:bg-muted transition-colors text-left">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <span className="text-white text-sm">🔄</span>
                  </div>
                  <h3 className="font-semibold text-foreground">Reset Settings</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Restore all settings to default values
                </p>
              </button>

              <button className="p-4 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                    <span className="text-white text-sm">🗑️</span>
                  </div>
                  <h3 className="font-semibold text-red-600 dark:text-red-400">Delete Account</h3>
                </div>
                <p className="text-sm text-red-500 dark:text-red-400">
                  Permanently delete your account and all data
                </p>
              </button>
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  )
}