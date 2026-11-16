"use client" // Error boundaries must be Client Components

import { ErrorState } from "@/src/components/shared/ErrorState"

/** Catches unexpected errors on any page that has no closer error boundary. */
export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return <ErrorState error={error} retry={unstable_retry} />
}
