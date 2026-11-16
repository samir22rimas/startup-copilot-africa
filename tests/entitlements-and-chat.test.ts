import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { TOP_TIER, getEntitlements, serializableLimit } from "@/src/lib/entitlements"
import { FEATURES, getPlanLimits, planHasFeature } from "@/src/lib/plans"
import { TEAM_REACTIONS, channelKeyOf, findMentionedMembers, isTeamReactionKey, mentionHandle } from "@/src/lib/team"

const confirmed = "2026-01-01T00:00:00Z"
const user = (email: string, plan?: string, extra: Record<string, unknown> = {}) => ({
  email,
  email_confirmed_at: confirmed,
  app_metadata: { ...(plan ? { plan_tier: plan } : {}), ...extra },
})

describe("entitlements", () => {
  const previous = process.env.ADMIN_EMAILS
  beforeEach(() => {
    process.env.ADMIN_EMAILS = "founder-admin@anza.test, Ops@Anza.test"
  })
  afterEach(() => {
    process.env.ADMIN_EMAILS = previous
  })

  it("gives a platform admin every feature and no limits", () => {
    const admin = getEntitlements(user("founder-admin@anza.test"))
    expect(admin.unlimited).toBe(true)
    expect(admin.tier).toBe(TOP_TIER)
    for (const feature of FEATURES) expect(planHasFeature(admin.tier, feature)).toBe(true)
    expect(admin.limits.monthlyAiGenerations).toBe(Number.POSITIVE_INFINITY)
    expect(admin.limits.startups).toBe(Number.POSITIVE_INFINITY)
    expect(admin.limits.teamSeats).toBe(Number.POSITIVE_INFINITY)
    expect(admin.limits.savedIdeas).toBe(Number.POSITIVE_INFINITY)
  })

  it("matches admin emails case-insensitively, and also honours app_metadata.role", () => {
    expect(getEntitlements(user("ops@anza.test")).unlimited).toBe(true)
    expect(getEntitlements(user("someone@else.test", "Free", { role: "admin" })).unlimited).toBe(true)
  })

  it("never treats an unverified email as an admin", () => {
    expect(getEntitlements({ email: "founder-admin@anza.test", email_confirmed_at: undefined, app_metadata: {} }).unlimited).toBe(false)
  })

  it("keeps co-founders and other users on the limits of their own plan", () => {
    for (const plan of ["Free", "Pro", "Team"] as const) {
      const cofounder = getEntitlements(user(`cofounder-${plan}@startup.test`, plan))
      expect(cofounder.unlimited).toBe(false)
      expect(cofounder.tier).toBe(plan)
      expect(cofounder.limits).toEqual(getPlanLimits(plan))
    }
    // Limits genuinely differ between plans.
    expect(getEntitlements(user("a@x.test", "Free")).limits.monthlyAiGenerations).toBeLessThan(
      getEntitlements(user("b@x.test", "Team")).limits.monthlyAiGenerations,
    )
  })

  it("ignores a plan a user wrote into their own editable metadata", () => {
    const forged = { email: "x@x.test", email_confirmed_at: confirmed, app_metadata: {}, user_metadata: { plan_tier: "Team", role: "admin" } }
    const result = getEntitlements(forged)
    expect(result.unlimited).toBe(false)
    expect(result.tier).toBe("Free")
  })

  it("sends unlimited limits to the browser as null, never as Infinity", () => {
    expect(serializableLimit(Number.POSITIVE_INFINITY)).toBeNull()
    expect(serializableLimit(150)).toBe(150)
    expect(JSON.stringify({ limit: serializableLimit(Number.POSITIVE_INFINITY) })).toBe('{"limit":null}')
  })
})

describe("team chat helpers", () => {
  const members = [
    { userId: "1", fullName: "Awa Ndiaye" },
    { userId: "2", fullName: "Jean-Paul Mbarga" },
    { userId: "3", fullName: "Awal Bello" },
  ]

  it("uses the first name as the mention handle", () => {
    expect(mentionHandle("Awa Ndiaye")).toBe("Awa")
    expect(mentionHandle("  Jean-Paul   Mbarga ")).toBe("Jean-Paul")
  })

  it("finds people mentioned by first or full name, on word boundaries", () => {
    expect(findMentionedMembers("Thanks @Awa, can you check?", members).map((m) => m.userId)).toEqual(["1"])
    expect(findMentionedMembers("@jean-paul mbarga please review", members).map((m) => m.userId)).toEqual(["2"])
    // "@Awal" must not count as a mention of "Awa".
    expect(findMentionedMembers("cc @Awal", members).map((m) => m.userId)).toEqual(["3"])
    expect(findMentionedMembers("email me at awa@example.com", members)).toEqual([])
    expect(findMentionedMembers("no mentions here", members)).toEqual([])
  })

  it("accepts only the known reactions", () => {
    expect(TEAM_REACTIONS).toHaveLength(8)
    expect(isTeamReactionKey("thumbs_up")).toBe(true)
    expect(isTeamReactionKey("skull")).toBe(false)
    expect(isTeamReactionKey(undefined)).toBe(false)
  })

  it("keys channels the same way as the database", () => {
    expect(channelKeyOf(null)).toBe("general")
    expect(channelKeyOf("10000000-0000-0000-0000-000000000001")).toBe("10000000-0000-0000-0000-000000000001")
  })
})
