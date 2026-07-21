import { AuthLayout } from "@/src/components/auth/AuthLayout"
import { LoginForm } from "@/src/components/auth/LoginForm"

export default function SignInPage() {
  return (
    <AuthLayout>
      <LoginForm initialMode="sign-in" />
    </AuthLayout>
  )
}
