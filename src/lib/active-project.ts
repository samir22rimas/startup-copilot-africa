import { cookies } from "next/headers"

export const ACTIVE_PROJECT_COOKIE = "sca_active_project"

export async function readActiveProjectCookie(): Promise<string | null> {
  const store = await cookies()
  const value = store.get(ACTIVE_PROJECT_COOKIE)?.value
  return value?.trim() || null
}

export async function writeActiveProjectCookie(projectId: string) {
  const store = await cookies()
  store.set(ACTIVE_PROJECT_COOKIE, projectId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
}

export function resolveActiveProject<T extends { id: string }>(
  projects: T[],
  preferredId: string | null | undefined,
): T {
  if (!projects.length) {
    throw new Error("resolveActiveProject requires at least one project")
  }
  if (preferredId) {
    const match = projects.find((project) => project.id === preferredId)
    if (match) return match
  }
  return projects[0]
}
