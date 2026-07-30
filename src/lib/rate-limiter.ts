import { supabaseAdmin } from "@/src/lib/supabase/admin";

interface RateLimitOptions {
  maxRequests: number;
  windowSeconds: number;
}

/**
 * Per-user rate limiting backed by usage_events. Uses the admin client
 * deliberately — usage_events only has a SELECT policy scoped to
 * startup members, and these rows aren't startup-scoped, so the
 * regular client can't read/write them. This is system bookkeeping,
 * not user data, so admin access here is justified (same pattern as
 * the assistant-message insert in interview.ts).
 *
 * Fails OPEN on a DB error — a broken rate-limit check should degrade
 * to "allow the request," not take down the whole feature.
 */
export async function checkRateLimit(
  userId: string,
  eventName: string,
  { maxRequests, windowSeconds }: RateLimitOptions,
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  const { count, error } = await supabaseAdmin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_name", eventName)
    .gte("created_at", windowStart);

  if (error) {
    console.log("[rate-limit] count failed:", error.message);
    return { allowed: true };
  }

  if ((count ?? 0) >= maxRequests) {
    return { allowed: false, retryAfterSeconds: windowSeconds };
  }

  const { error: insertError } = await supabaseAdmin
    .from("usage_events")
    .insert({ user_id: userId, startup_id: null, event_name: eventName, quantity: 1 });
  if (insertError) {
    console.error("[rate-limit] insert failed:", insertError.message);
  }
  return { allowed: true };
}
