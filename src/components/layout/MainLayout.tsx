'use client'

import { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'
import { FeedbackWidgetProvider } from '@/components/feedback/FeedbackWidgetProvider'

interface MainLayoutProps {
  children: ReactNode
  showSidebar?: boolean
}

export function MainLayout({ children, showSidebar = false }: MainLayoutProps) {
  return (
    <FeedbackWidgetProvider>
      <div className="min-h-screen bg-background">
        <Navbar showSidebar={showSidebar} />
        
        <div className={`flex ${showSidebar ? 'pt-16' : ''}`}>
          {showSidebar && (
            <div className="hidden lg:block w-64 fixed left-0 top-16 h-[calc(100vh-4rem)] overflow-y-auto">
              <Sidebar />
            </div>
          )}
          
          <main className={`flex-1 ${showSidebar ? 'lg:ml-64' : ''}`}>
            <div className="container mx-auto px-4 py-8">
              {children}
            </div>
          </main>
        </div>
        
        <Footer />
      </div>
    </FeedbackWidgetProvider>
  )
}