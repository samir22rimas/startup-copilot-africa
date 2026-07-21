/** App-wide route constants — single source of truth for all hrefs. */
export const ROUTES = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  forgotPassword: "/forgot-password",
  updatePassword: "/update-password",
  authCallback: "/auth/callback",
  dashboard: "/dashboard",
  onboarding: "/onboarding",
} as const

/** Supabase storage bucket names. */
export const STORAGE_BUCKETS = {
  startupDocuments: "startup-documents",
} as const

/** AI defaults. */
export const AI = {
  defaultModel: "gpt-4o-mini",
  maxTokens: 600,
  contentMaxTokens: 400,
} as const
