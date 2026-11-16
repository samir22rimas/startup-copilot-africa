"use client" // Error boundaries must be Client Components

/**
 * Last-resort boundary for errors thrown by the root layout itself. It
 * replaces the root layout, so it must render its own <html> and <body> and
 * cannot rely on the app's stylesheet or providers.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          background: "#ffffff",
          color: "#18181b",
          padding: 16,
        }}
      >
        <title>Something went wrong — Anza</title>
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Anza could not load</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#71717a", margin: "0 0 20px" }}>
            This is a problem on our side. Your saved work is not affected. Please try again.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, color: "#a1a1aa", margin: "0 0 20px" }}>
              Reference: <code>{error.digest}</code>
            </p>
          )}
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              height: 44,
              padding: "0 20px",
              borderRadius: 12,
              border: "none",
              background: "#166534",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
