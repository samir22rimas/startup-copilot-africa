import { AuthLayout } from "@/src/components/auth/AuthLayout"
import { PasswordRecoveryGate } from "@/src/components/auth/PasswordRecoveryGate"
import { UpdatePasswordForm } from "@/src/components/auth/PasswordResetForm"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"

export default async function UpdatePasswordPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <AuthLayout>
      <PasswordRecoveryGate hasServerSession={Boolean(user)}>
        <UpdatePasswordForm />
      </PasswordRecoveryGate>
    </AuthLayout>
  )
}
