"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"

import { ROUTES } from "@/src/lib/constants"
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client"

type GateState = "loading" | "ready" | "error"

function parseHashTokens(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""))
  const accessToken = params.get("access_token")
  const refreshToken = params.get("refresh_token")
  const type = params.get("type")

  if (!accessToken || !refreshToken) return null
  return { accessToken, refreshToken, type }
}

function PasswordRecoveryGateContent({
  children,
  hasServerSession,
}: {
  children: React.ReactNode
  hasServerSession: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [state, setState] = React.useState<GateState>(hasServerSession ? "ready" : "loading")

  React.useEffect(() => {
    if (hasServerSession) return

    let cancelled = false

    async function establishSession() {
      const supabase = createSupabaseBrowserClient()
      const code = searchParams.get("code")

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return

        if (error) {
          setState("error")
          return
        }

        router.replace(ROUTES.updatePassword)
        setState("ready")
        return
      }

      const hashTokens = parseHashTokens(window.location.hash)
      if (hashTokens) {
        const { error } = await supabase.auth.setSession({
          access_token: hashTokens.accessToken,
          refresh_token: hashTokens.refreshToken,
        })
        if (cancelled) return

        if (error || hashTokens.type !== "recovery") {
          setState("error")
          return
        }

        router.replace(ROUTES.updatePassword)
        setState("ready")
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return

      setState(user ? "ready" : "error")
    }

    void establishSession()

    return () => {
      cancelled = true
    }
  }, [hasServerSession, router, searchParams])

  if (state === "loading") {
    return (
      <div className="w-full max-w-sm mx-auto space-y-3 text-center">
        <p className="text-sm text-zinc-500">Verifying your reset link…</p>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="w-full max-w-sm mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Reset link expired</h1>
          <p className="text-sm text-zinc-500">
            This password reset link is invalid or has already been used. Request a new one to continue.
          </p>
        </div>
        <Link
          href={ROUTES.forgotPassword}
          className="inline-flex w-full items-center justify-center rounded-xl bg-green-800 px-4 py-3 text-sm font-semibold text-white hover:bg-green-900"
        >
          Request a new reset link
        </Link>
        <Link href={ROUTES.signIn} className="block text-center text-sm font-semibold text-green-700 hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return children
}

export function PasswordRecoveryGate({
  children,
  hasServerSession,
}: {
  children: React.ReactNode
  hasServerSession: boolean
}) {
  return (
    <React.Suspense
      fallback={
        <div className="w-full max-w-sm mx-auto space-y-3 text-center">
          <p className="text-sm text-zinc-500">Verifying your reset link…</p>
        </div>
      }
    >
      <PasswordRecoveryGateContent hasServerSession={hasServerSession}>{children}</PasswordRecoveryGateContent>
    </React.Suspense>
  )
}
