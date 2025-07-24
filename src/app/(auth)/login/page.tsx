import { MainLayout } from '@/components/layout/MainLayout'
import { AuthForm } from '@/components/auth/AuthForm'

export default function LoginPage() {
  return (
    <MainLayout>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">
            Sign in to your CoinSpree account
          </p>
        </div>
        <AuthForm mode="login" />
      </div>
    </MainLayout>
  )
}
