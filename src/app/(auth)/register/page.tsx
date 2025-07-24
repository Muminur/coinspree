import { MainLayout } from '@/components/layout/MainLayout'
import { AuthForm } from '@/components/auth/AuthForm'

export default function RegisterPage() {
  return (
    <MainLayout>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="text-muted-foreground">
            Join CoinSpree and never miss another all-time high
          </p>
        </div>
        <AuthForm mode="register" />
      </div>
    </MainLayout>
  )
}
