import { cookies } from "next/headers"

export const ACTIVE_STARTUP_COOKIE = "sca_active_startup"

export async function readActiveStartupCookie(): Promise<string | null> {
  const store = await cookies()
  const value = store.get(ACTIVE_STARTUP_COOKIE)?.value
  return value?.trim() || null
}

export async function writeActiveStartupCookie(startupId: string) {
  const store = await cookies()
  store.set(ACTIVE_STARTUP_COOKIE, startupId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
}

export function resolveActiveStartup<T extends { id: string }>(
  startups: T[],
  preferredId: string | null | undefined,
): T {
  if (!startups.length) {
    throw new Error("resolveActiveStartup requires at least one startup")
  }
  if (preferredId) {
    const match = startups.find((startup) => startup.id === preferredId)
    if (match) return match
  }
  return startups[0]
}
