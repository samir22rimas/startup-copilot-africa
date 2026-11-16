"use client" // Error boundaries must be Client Components

import { ErrorState } from "@/src/components/shared/ErrorState"

/**
 * Errors inside a dashboard page render here, inside the dashboard layout, so
 * the sidebar and navigation stay usable.
 */
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return <ErrorState error={error} retry={unstable_retry} homeHref="/dashboard" homeLabel="Back to overview" />
}
