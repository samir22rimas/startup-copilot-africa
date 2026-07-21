"use client"

import { useActionState } from "react"
import Link from "next/link"

import { requestPasswordReset, updatePassword, type AuthState } from "@/src/app/actions/auth"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"

const initialState: AuthState = {}

function FormNotice({ state }: { state: AuthState }) {
  if (state.error) return <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
  if (state.message) return <p role="status" className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">{state.message}</p>
  return null
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState)

  return (
    <form action={action} className="w-full max-w-sm mx-auto space-y-6">
      <div className="space-y-2"><h1 className="text-3xl font-bold tracking-tight">Reset your password</h1><p className="text-sm text-zinc-500">We&apos;ll email you a secure reset link.</p></div>
      <Input name="email" type="email" autoComplete="email" required placeholder="name@company.com" className="h-12 bg-[#f3f6fc] border-transparent" />
      <FormNotice state={state} />
      <Button disabled={pending} className="w-full h-12 rounded-xl bg-green-800 hover:bg-green-900">{pending ? "Sending…" : "Send reset link"}</Button>
      <Link href="/sign-in" className="block text-center text-sm font-semibold text-green-700 hover:underline">Back to sign in</Link>
    </form>
  )
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState)

  return (
    <form action={action} className="w-full max-w-sm mx-auto space-y-6">
      <div className="space-y-2"><h1 className="text-3xl font-bold tracking-tight">Choose a new password</h1><p className="text-sm text-zinc-500">Use at least 8 characters to keep your account secure.</p></div>
      <Input name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="New password" className="h-12 bg-[#f3f6fc] border-transparent" />
      <Input name="confirmation" type="password" autoComplete="new-password" required minLength={8} placeholder="Confirm new password" className="h-12 bg-[#f3f6fc] border-transparent" />
      <FormNotice state={state} />
      <Button disabled={pending} className="w-full h-12 rounded-xl bg-green-800 hover:bg-green-900">{pending ? "Updating…" : "Update password"}</Button>
    </form>
  )
}
