import { NextResponse } from "next/server"

/**
 * Liveness check for uptime monitors: `GET /api/health`.
 *
 * It only reports that the app is running and whether required configuration
 * is present. It deliberately returns no secrets, versions or database
 * details, because it is reachable without signing in.
 */
export const dynamic = "force-dynamic"

export function GET() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  return NextResponse.json(
    { status: configured ? "ok" : "misconfigured", time: new Date().toISOString() },
    { status: configured ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  )
}
