import { currentQuotaWindowStart, getPlanLimits, type UserPlanTier } from "@/src/lib/plans";
import { getEntitlements } from "@/src/lib/entitlements";
import { getSupabaseAdmin } from "@/src/lib/supabase/admin";

interface RateLimitOptions {
  maxRequests: number;
  windowSeconds: number;
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; message: string };

export const AI_RATE_LIMIT_EVENT = "ai_generation";

export const AI_RATE_LIMIT = {
  maxRequests: 20,
  windowSeconds: 60,
} as const;

export const AI_RATE_LIMIT_MESSAGE =
  "You're sending AI requests a bit fast — please wait a moment and try again.";

export const RATE_LIMIT_MESSAGE =
  "You're doing that a bit fast — please wait a moment and try again.";

function quotaExceededMessage(tier: UserPlanTier, limit: number) {
  return `You've used all ${limit} AI generations included in the ${tier} plan this month. Your allowance resets on the 1st.`;
}

async function countEvents(userId: string, eventName: string, since: Date) {
  return getSupabaseAdmin()
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_name", eventName)
    .gte("occurred_at", since.toISOString());
}

/** How many AI generations a user has consumed in the current monthly window. */
export async function getMonthlyAiUsage(userId: string): Promise<number> {
  try {
    const { count, error } = await countEvents(userId, AI_RATE_LIMIT_EVENT, currentQuotaWindowStart());
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Gate for every AI call: a short burst limit (20 requests / 60 s) plus the
 * monthly allowance of the user's plan. Records one usage event when allowed.
 */
export async function checkAiRateLimit(userId: string): Promise<RateLimitResult> {
  try {
    const { data } = await getSupabaseAdmin().auth.admin.getUserById(userId);
    const entitlements = getEntitlements(data?.user);
    if (entitlements.unlimited) {
      // No quota and no burst limit for platform admins, but the generation is
      // still counted so their usage shows up like everyone else's.
      const { error } = await getSupabaseAdmin()
        .from("usage_events")
        .insert({ user_id: userId, startup_id: null, event_name: AI_RATE_LIMIT_EVENT, quantity: 1 });
      if (error) console.error("[rate-limit] insert failed:", error.message);
      return { allowed: true };
    }
    const { monthlyAiGenerations } = getPlanLimits(entitlements.tier);
    const used = await getMonthlyAiUsage(userId);
    if (used >= monthlyAiGenerations) {
      return {
        allowed: false,
        retryAfterSeconds: 3600,
        message: quotaExceededMessage(entitlements.tier, monthlyAiGenerations),
      };
    }
  } catch (err) {
    // Fail open on bookkeeping errors (see checkRateLimit); the burst limit below still applies.
    console.error("[rate-limit] quota check failed:", err instanceof Error ? err.message : err);
  }

  return checkRateLimit(userId, AI_RATE_LIMIT_EVENT, AI_RATE_LIMIT, AI_RATE_LIMIT_MESSAGE);
}

/**
 * Per-user rate limiting backed by usage_events. Uses the admin client
 * deliberately — usage_events has no INSERT policy, so users can neither
 * forge nor erase their own usage. This is system bookkeeping, not user data.
 *
 * Fails OPEN on a DB error — a broken rate-limit check should degrade
 * to "allow the request," not take down the whole feature.
 */
export async function checkRateLimit(
  userId: string,
  eventName: string,
  { maxRequests, windowSeconds }: RateLimitOptions,
  message: string = RATE_LIMIT_MESSAGE,
): Promise<RateLimitResult> {
  try {
    const windowStart = new Date(Date.now() - windowSeconds * 1000);
    const { count, error } = await countEvents(userId, eventName, windowStart);

    if (error) {
      console.error("[rate-limit] count failed:", error.message);
      return { allowed: true };
    }

    if ((count ?? 0) >= maxRequests) {
      return { allowed: false, retryAfterSeconds: windowSeconds, message };
    }

    const { error: insertError } = await getSupabaseAdmin().from("usage_events").insert({
      user_id: userId,
      startup_id: null,
      event_name: eventName,
      quantity: 1,
    });
    if (insertError) {
      console.error("[rate-limit] insert failed:", insertError.message);
    }
    return { allowed: true };
  } catch (err) {
    console.error("[rate-limit] unavailable:", err instanceof Error ? err.message : err);
    return { allowed: true };
  }
}
