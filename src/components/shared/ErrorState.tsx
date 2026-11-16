"use client"

import Link from "next/link"
import * as React from "react"

/**
 * Fallback shown by the error boundaries (`error.tsx` files).
 *
 * In production Next.js hides the real message of server errors and gives a
 * `digest` instead; showing it lets a user quote a reference that can be
 * matched against the server logs.
 */
export function ErrorState({
  error,
  retry,
  homeHref = "/",
  homeLabel = "Back to home",
}: {
  error: Error & { digest?: string }
  retry: () => void
  homeHref?: string
  homeLabel?: string
}) {
  React.useEffect(() => {
    // Replace with an error-reporting service (e.g. Sentry) when one is added.
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Something went wrong</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            We could not load this page
          </h1>
          <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            This is a problem on our side, not something you did. Your saved work is not affected. Try again, and if it
            keeps happening, contact support.
          </p>
        </div>
        {error.digest && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-green-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-green-900"
          >
            Try again
          </button>
          <Link
            href={homeHref}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 px-5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {homeLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
