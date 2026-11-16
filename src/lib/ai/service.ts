/**
 * The single entry point for AI features.
 *
 * Every call goes through the same pipeline:
 *   plan feature gate -> burst limit + monthly allowance -> provider fallback
 *   -> (structured only) JSON extraction + schema validation with one repair
 *   -> token usage recorded in `ai_usage`.
 *
 * Server only.
 */
import type { z } from "zod"

import { extractJson } from "@/src/lib/ai/json"
import {
  AiUnavailableError,
  callModel,
  type ChatMessage,
  type ModelResult,
  type ModelSource,
} from "@/src/lib/ai/providers"
import { minimumPlanFor, planHasFeature, type Feature, type UserPlanTier } from "@/src/lib/plans"
import { checkAiRateLimit } from "@/src/lib/rate-limiter"
import { getSupabaseAdmin } from "@/src/lib/supabase/admin"

export interface AiCaller {
  userId: string
  /** Workspace the call is made for; null for personal features (Idea Lab). */
  startupId: string | null
  /** Plan that governs feature access for this call. */
  tier: UserPlanTier
  /** Platform administrators bypass plan gates and monthly AI quotas. */
  unlimited?: boolean
}

export type AiErrorCode = "feature_locked" | "rate_limited" | "unavailable" | "invalid_output"

export type AiFailure = { ok: false; code: AiErrorCode; error: string }

export type AiTextSuccess = {
  ok: true
  text: string
  model: string
  provider: string
  grounded: boolean
  sources: ModelSource[]
}

export type AiStructuredSuccess<T> = Omit<AiTextSuccess, "text"> & { data: T }

interface BaseOptions {
  /** Short name of the feature, recorded with the usage (e.g. "plan.section"). */
  feature: string
  caller: AiCaller
  /** Plan feature required, if any. */
  gate?: Feature
  system: string
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
  webSearch?: boolean
}

export function featureLockedMessage(feature: Feature): string {
  return `This feature is part of the ${minimumPlanFor(feature)} plan.`
}

async function recordUsage(
  options: BaseOptions,
  outcome: { result?: ModelResult; error?: string; durationMs: number },
) {
  try {
    const { error } = await getSupabaseAdmin()
      .from("ai_usage")
      .insert({
        user_id: options.caller.userId,
        startup_id: options.caller.startupId,
        feature: options.feature.slice(0, 80),
        provider: outcome.result?.provider ?? "none",
        model: outcome.result?.model ?? "none",
        prompt_tokens: outcome.result?.promptTokens ?? 0,
        completion_tokens: outcome.result?.completionTokens ?? 0,
        tokens_reported: outcome.result?.tokensReported ?? false,
        success: !outcome.error,
        error: outcome.error?.slice(0, 500) ?? null,
        duration_ms: Math.round(outcome.durationMs),
      })
    // 42P01 / PGRST205: the 2.0 migration has not been applied yet.
    if (error && error.code !== "42P01" && error.code !== "PGRST205") {
      console.error("[ai] usage insert failed:", error.message)
    }
  } catch (error) {
    console.error("[ai] usage insert failed:", error instanceof Error ? error.message : error)
  }
}

async function preflight(options: BaseOptions): Promise<AiFailure | null> {
  if (options.gate && !options.caller.unlimited && !planHasFeature(options.caller.tier, options.gate)) {
    return { ok: false, code: "feature_locked", error: featureLockedMessage(options.gate) }
  }
  const limit = await checkAiRateLimit(options.caller.userId)
  if (!limit.allowed) return { ok: false, code: "rate_limited", error: limit.message }
  return null
}

async function invoke(
  options: BaseOptions,
  extra: { json?: boolean } = {},
): Promise<{ result: ModelResult } | AiFailure> {
  const started = Date.now()
  try {
    const result = await callModel({
      system: options.system,
      messages: options.messages,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      webSearch: options.webSearch,
      json: extra.json,
    })
    await recordUsage(options, { result, durationMs: Date.now() - started })
    return { result }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await recordUsage(options, { error: message, durationMs: Date.now() - started })
    if (!(error instanceof AiUnavailableError)) console.error("[ai] unexpected error:", message)
    return {
      ok: false,
      code: "unavailable",
      error: "The AI service is not available right now. Please try again in a moment.",
    }
  }
}

/** Free-text generation (chat replies, prose). */
export async function runAi(options: BaseOptions): Promise<AiTextSuccess | AiFailure> {
  const blocked = await preflight(options)
  if (blocked) return blocked

  const outcome = await invoke(options)
  if ("ok" in outcome) return outcome
  const { result } = outcome
  return {
    ok: true,
    text: result.text.trim(),
    model: result.model,
    provider: result.provider,
    grounded: result.grounded,
    sources: result.sources,
  }
}

function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 8)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ")
}

/**
 * Generation that must match a schema. The model's output is never trusted:
 * it is parsed, validated, and — if it does not fit — sent back once with the
 * validation errors for repair. Anything still invalid is rejected.
 */
export async function runAiStructured<Schema extends z.ZodType>(
  options: BaseOptions & { schema: Schema; shape: string },
): Promise<AiStructuredSuccess<z.infer<Schema>> | AiFailure> {
  const blocked = await preflight(options)
  if (blocked) return blocked

  const system = `${options.system}

Output format: reply with ONE JSON object and nothing else — no markdown fences, no commentary. It must match this shape exactly:
${options.shape}`

  const first = await invoke({ ...options, system }, { json: true })
  if ("ok" in first) return first

  const validate = (text: string) => {
    const parsed = extractJson(text)
    if (parsed === null) return { success: false as const, issues: "The reply was not valid JSON." }
    const checked = options.schema.safeParse(parsed)
    return checked.success
      ? { success: true as const, data: checked.data as z.infer<Schema> }
      : { success: false as const, issues: describeIssues(checked.error) }
  }

  const done = (result: ModelResult, data: z.infer<Schema>, source: ModelResult = result) => ({
    ok: true as const,
    data,
    model: result.model,
    provider: result.provider,
    grounded: source.grounded,
    sources: source.sources,
  })

  const firstCheck = validate(first.result.text)
  if (firstCheck.success) return done(first.result, firstCheck.data)

  // One repair pass: no web search, the content already exists — it only
  // needs to be reshaped. Sources from the first pass are kept.
  const repair = await invoke(
    {
      ...options,
      feature: `${options.feature}.repair`,
      webSearch: false,
      system,
      temperature: 0.1,
      messages: [
        ...options.messages,
        { role: "assistant", content: first.result.text.slice(0, 12_000) },
        {
          role: "user",
          content: `That reply did not match the required JSON shape (${firstCheck.issues}). Return the same content again as one valid JSON object in exactly the required shape. Do not add new facts.`,
        },
      ],
    },
    { json: true },
  )
  if ("ok" in repair) return repair

  const secondCheck = validate(repair.result.text)
  if (secondCheck.success) return done(repair.result, secondCheck.data, first.result)

  console.warn(`[ai] ${options.feature}: output failed validation twice: ${secondCheck.issues}`)
  return {
    ok: false,
    code: "invalid_output",
    error: "The AI answer could not be validated, so nothing was saved. Please try again.",
  }
}
