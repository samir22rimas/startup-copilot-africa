/** Small, dependency-free input guards shared by server actions and routes. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

/** Longest chat / interview message we will store or send to an AI provider. */
export const MAX_CHAT_MESSAGE_LENGTH = 4000

/** Trimmed text capped at `max` characters; non-strings become "". */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return ""
  return value.replace(/\u0000/g, "").trim().slice(0, max)
}

const INVITE_PATH_RE = /^\/invite\/[0-9a-f-]{36}$/i

const SAFE_POST_AUTH_PATHS = new Set(["/dashboard", "/dashboard/team", "/update-password"])

/**
 * Where a user may be sent after signing in. Only same-site paths we know
 * about are accepted, so `?next=` can never become an open redirect.
 */
export function safePostAuthPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback
  if (SAFE_POST_AUTH_PATHS.has(value)) return value
  if (INVITE_PATH_RE.test(value) && isUuid(value.slice("/invite/".length))) return value
  return fallback
}

/** Normalises an email for comparison and storage; returns null when invalid. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null
  return email
}

/** Accepts only http(s) URLs; returns null for anything else (e.g. javascript:). */
export function safeHttpUrl(value: unknown, max = 500): string | null {
  const raw = cleanText(value, max)
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null
  } catch {
    return null
  }
}

/** Largest client-supplied workspace (deck, analytics, funding plan) we will store. */
export const MAX_WORKSPACE_BYTES = 256 * 1024

/**
 * True when a client-supplied value is a plain JSON object small enough to
 * store. Stops oversized or malformed payloads from being written to the
 * project record through "save" actions.
 */
export function isStorableObject(value: unknown, maxBytes = MAX_WORKSPACE_BYTES): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  try {
    return JSON.stringify(value).length <= maxBytes
  } catch {
    return false
  }
}
