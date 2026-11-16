import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Page not found — Anza",
}

/** Shown for unknown URLs and whenever a page calls `notFound()`. */
export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400">Error 404</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">Page not found</h1>
          <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            The page you are looking for does not exist, was moved, or the link is incomplete.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-green-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-green-900"
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 px-5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
