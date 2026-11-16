"use client"

import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import * as React from "react"

import { requestPasswordReset, updatePassword, type AuthState } from "@/src/app/actions/auth"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { ROUTES } from "@/src/lib/constants"

const initialState: AuthState = {}

const inputClass =
  "h-12 rounded-xl bg-[#f3f6fc] dark:bg-zinc-900 border-zinc-200/50 dark:border-zinc-800 text-sm transition-all duration-300 focus-visible:ring-2 focus-visible:ring-green-500/20 focus-visible:border-green-600"
const labelClass = "text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider"

/** Fixed messages for `?error=` codes set by the auth routes when a reset link fails. */
const RESET_LINK_ERRORS: Record<string, string> = {
  "link-expired": "That reset link has expired or was already used. Enter your email to get a new one.",
  "other-browser":
    "That reset link must be opened in the same browser you requested it from. Request a new link here and open it in this browser.",
  "missing-code": "That reset link is incomplete. Enter your email to get a new one.",
}

function FormNotice({ error, message }: { error?: string | null; message?: string | null }) {
  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200/50 px-4 py-2.5 text-sm font-semibold leading-snug text-red-700 dark:text-red-400">
        {error}
      </p>
    )
  }
  if (message) {
    return (
      <p role="status" className="rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200/50 px-4 py-2.5 text-sm font-semibold leading-snug text-green-800 dark:text-green-400">
        {message}
      </p>
    )
  }
  return null
}

function ForgotPasswordFormContent() {
  const [state, action, pending] = React.useActionState(requestPasswordReset, initialState)
  const [email, setEmail] = React.useState("")
  const searchParams = useSearchParams()
  const linkError = searchParams.get("error")
  const urlError =
    linkError && !state.error && !state.message
      ? (RESET_LINK_ERRORS[linkError] ?? "That reset link could not be used. Enter your email to get a new one.")
      : null

  return (
    <form action={action} className="w-full max-w-sm mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Reset your password</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Enter the email you signed up with and we&apos;ll send you a secure reset link.
        </p>
      </div>
      <div className="space-y-2">
        <label htmlFor="reset-email" className={labelClass}>Email address</label>
        <Input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          className={inputClass}
        />
      </div>
      <FormNotice error={state.error ?? urlError} message={state.message} />
      <Button disabled={pending} type="submit" className="w-full h-12 rounded-xl bg-green-800 hover:bg-green-900 text-white font-semibold">
        {pending ? "Sending…" : state.message ? "Send again" : "Send reset link"}
      </Button>
      {state.message && (
        <p className="text-xs text-center text-zinc-400 dark:text-zinc-500 leading-relaxed">
          Didn&apos;t get it? Check your spam folder, wait a minute, then send again.
        </p>
      )}
      <Link href={ROUTES.signIn} className="block text-center text-sm font-semibold text-green-700 dark:text-green-400 hover:underline">
        Back to sign in
      </Link>
    </form>
  )
}

export function ForgotPasswordForm() {
  return (
    <React.Suspense fallback={<div className="w-full max-w-sm mx-auto p-6 text-center text-zinc-400">Loading form…</div>}>
      <ForgotPasswordFormContent />
    </React.Suspense>
  )
}

export function UpdatePasswordForm() {
  const [state, action, pending] = React.useActionState(updatePassword, initialState)
  const [password, setPassword] = React.useState("")
  const [confirmation, setConfirmation] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const mismatch = confirmation.length > 0 && password !== confirmation

  return (
    <form action={action} className="w-full max-w-sm mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Choose a new password</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Use at least 8 characters to keep your account secure.</p>
      </div>
      <div className="space-y-2">
        <label htmlFor="new-password" className={labelClass}>New password</label>
        <div className="relative">
          <Input
            id="new-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className={`${inputClass} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="confirm-password" className={labelClass}>Confirm new password</label>
        <Input
          id="confirm-password"
          name="confirmation"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="Confirm new password"
          aria-invalid={mismatch || undefined}
          className={inputClass}
        />
        {mismatch && <p className="text-xs font-semibold text-red-600 dark:text-red-400">Passwords do not match.</p>}
      </div>
      <FormNotice error={state.error} message={state.message} />
      {state.error?.includes("request a new one") && (
        <Link href={ROUTES.forgotPassword} className="block text-center text-sm font-semibold text-green-700 dark:text-green-400 hover:underline">
          Request a new reset link
        </Link>
      )}
      <Button disabled={pending || mismatch} type="submit" className="w-full h-12 rounded-xl bg-green-800 hover:bg-green-900 text-white font-semibold">
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  )
}
