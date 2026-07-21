import { AuthLayout } from "@/src/components/auth/AuthLayout"
import { LoginForm } from "@/src/components/auth/LoginForm"

export default function SignUpPage() {
  return (
    <AuthLayout>
      <LoginForm initialMode="sign-up" />
    </AuthLayout>
  )
}
