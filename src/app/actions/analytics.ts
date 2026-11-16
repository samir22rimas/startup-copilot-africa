"use server";

import type { Json } from "@/src/lib/database.types";
import { getProjectAccess } from "@/src/lib/workspace-access";
import { isStorableObject } from "@/src/lib/validation";
import {
  type TrackedMetrics,
  hasTrackedMetrics,
  readMetadata,
  readTrackedMetrics,
} from "@/src/lib/data-truth";
import { checkAiRateLimit } from "@/src/lib/rate-limiter";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface MetricCard {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  color: string;
}

export interface FunnelStep {
  stage: string;
  count: number;
  conversionRate: number;
}

export interface PaymentChannel {
  name: string;
  percentage: number;
  amountCents: number;
}

export interface ChartDataPoint {
  month: string;
  visitors: number;
  signups: number;
  activeUsers: number;
  revenueUSD: number;
}

export interface AnalyticsWorkspace {
  /** Always projected — AI scenario, never live tracking */
  source: "projected";
  generatedAt: string;
  kpis: MetricCard[];
  funnel: FunnelStep[];
  channels: PaymentChannel[];
  history: ChartDataPoint[];
  recommendations: { title: string; detail: string }[];
}

function tryRepairTruncatedJson(jsonStr: string): string | null {
  try {
    let inString = false;
    let escaped = false;
    const stack: ("{" | "[")[] = [];

    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }
      if (char === '"') {
        inString = true;
      } else if (char === "{" || char === "[") {
        stack.push(char);
      } else if (char === "}") {
        if (stack.length && stack[stack.length - 1] === "{") stack.pop();
      } else if (char === "]") {
        if (stack.length && stack[stack.length - 1] === "[") stack.pop();
      }
    }

    let repaired = jsonStr;
    if (inString) {
      const lastQuote = repaired.lastIndexOf('"');
      if (lastQuote !== -1) {
        repaired = repaired.slice(0, lastQuote);
      }
    }

    repaired = repaired.trim().replace(/,\s*$/, "").replace(/:\s*$/, "");
    repaired = repaired.replace(/,\s*"[^"]*"\s*$/, "");

    while (stack.length > 0) {
      const open = stack.pop();
      if (open === "{") repaired += "}";
      else if (open === "[") repaired += "]";
    }

    repaired = repaired.replace(/,\s*([}\]])/g, "$1");
    JSON.parse(repaired);
    return repaired;
  } catch {
    return null;
  }
}

function parseAnalyticsJson(response: string): Partial<AnalyticsWorkspace> {
  const cleaned = response
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```$/m, "")
    .trim();

  try {
    return JSON.parse(cleaned) as Partial<AnalyticsWorkspace>;
  } catch {
    // Continue with brace scanning
  }

  const start = cleaned.indexOf("{");
  if (start < 0) {
    throw new Error("The AI response did not contain a JSON object.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let objectEnd = -1;

  for (let i = start; i < cleaned.length; i += 1) {
    const char = cleaned[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        objectEnd = i;
        break;
      }
    }
  }

  if (objectEnd !== -1) {
    const candidate = cleaned
      .slice(start, objectEnd + 1)
      .replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(candidate) as Partial<AnalyticsWorkspace>;
  }

  const partial = cleaned.slice(start);
  const repaired = tryRepairTruncatedJson(partial);
  if (repaired) {
    return JSON.parse(repaired) as Partial<AnalyticsWorkspace>;
  }

  throw new Error("The AI response did not contain a complete JSON object.");
}

/** Month-over-month growth assumed by the fallback projection — stated in the UI text. */
const FALLBACK_MONTHLY_GROWTH = 0.05;

/**
 * Deterministic projection used only when the AI response is unusable.
 *
 * It never invents a starting point: month 1 is exactly the founder's tracked
 * numbers, grown by a modest, disclosed rate. With no tracked numbers there is
 * nothing honest to project from, so it returns null and the caller asks the
 * founder for data instead.
 */
function buildFallbackAnalyticsWorkspace(
  startup: { name: string },
  project: { title: string },
  currency: string,
  tracked: TrackedMetrics,
): AnalyticsWorkspace | null {
  if (!hasTrackedMetrics(tracked)) return null;

  const revenue = tracked.monthlyRevenue;
  const active = tracked.activeCustomers;
  const visitors = tracked.visitorsThisMonth;
  const burn = tracked.monthlyBurn;
  const growthPct = Math.round(FALLBACK_MONTHLY_GROWTH * 100);

  const history: ChartDataPoint[] = Array.from({ length: 6 }, (_, idx) => {
    const m = Math.pow(1 + FALLBACK_MONTHLY_GROWTH, idx);
    return {
      month: idx === 0 ? "Now (tracked)" : `Month +${idx}`,
      visitors: Math.round(visitors * m),
      // Sign-ups are not tracked yet, so they are not projected.
      signups: 0,
      activeUsers: Math.round(active * m),
      revenueUSD: Math.round(revenue * m),
    };
  });

  const conversion = visitors > 0 && active > 0 ? Math.round((active / visitors) * 1000) / 10 : 0;
  const funnel: FunnelStep[] = [
    { stage: "Visitors this month (tracked)", count: visitors, conversionRate: visitors > 0 ? 100 : 0 },
    { stage: "Leads (not tracked yet)", count: 0, conversionRate: 0 },
    { stage: "Sign-ups (not tracked yet)", count: 0, conversionRate: 0 },
    { stage: "Active customers (tracked)", count: active, conversionRate: conversion },
  ];

  // Payment mix is not tracked; show a single honest bucket rather than an invented split.
  const channels: PaymentChannel[] = [
    { name: "All channels (split not tracked yet)", percentage: 100, amountCents: Math.round(revenue * 100) },
  ];

  const in6 = (value: number) => Math.round(value * Math.pow(1 + FALLBACK_MONTHLY_GROWTH, 5));
  const kpis: MetricCard[] = [
    {
      title: "Projected Monthly Revenue (month 6)",
      value: `${in6(revenue).toLocaleString()} ${currency}`,
      change: `From ${revenue.toLocaleString()} ${currency} today at +${growthPct}%/month`,
      trend: revenue > 0 ? "up" : "neutral",
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      title: "Projected Active Customers (month 6)",
      value: in6(active).toLocaleString(),
      change: `From ${active.toLocaleString()} today at +${growthPct}%/month`,
      trend: active > 0 ? "up" : "neutral",
      color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Scenario Monthly Burn",
      value: `${burn.toLocaleString()} ${currency}`,
      change: "Held flat at your tracked burn",
      trend: "neutral",
      color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
    },
    {
      title: "Visitor → Customer Conversion",
      value: conversion > 0 ? `${conversion}%` : "—",
      change: conversion > 0 ? "Computed from your tracked numbers" : "Track visitors and customers to compute",
      trend: "neutral",
      color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30",
    },
  ];

  const recommendations = [
    {
      title: "This is a simple projection",
      detail: `The AI projection was unavailable, so these figures grow your tracked numbers by ${growthPct}% a month. Generate again later for an AI scenario.`,
    },
    {
      title: "Track the missing funnel steps",
      detail: `Record leads, sign-ups and payment channels for ${project.title} so ${startup.name} can see where users drop off.`,
    },
    {
      title: "Update your numbers monthly",
      detail: "Projections are only as good as the tracked numbers they start from — refresh them at the start of each month.",
    },
  ];

  return {
    source: "projected",
    generatedAt: new Date().toISOString(),
    kpis,
    funnel,
    channels,
    history,
    recommendations,
  };
}

export async function generateAnalyticsWorkspace(
  projectId: string,
): Promise<
  | { success: true; workspace: AnalyticsWorkspace }
  | { success: false; error: string }
> {
  const access = await getProjectAccess(projectId, "edit");
  if ("error" in access) return { success: false, error: access.error };
  const { supabase, user, startup, project } = access;

  const currency = startup.budget_currency || "USD";
  const metadata = readMetadata(project.metadata);
  const tracked = readTrackedMetrics(metadata, currency);
  const trackedContext = hasTrackedMetrics(tracked)
    ? `
Founder-reported (tracked) metrics. The FIRST "history" month must equal these numbers exactly, later months grow from them at a realistic rate, and KPI "change" text must describe growth relative to them (never invent a past baseline):
- Monthly revenue: ${tracked.monthlyRevenue} ${tracked.currency}
- Active customers: ${tracked.activeCustomers}
- Monthly burn: ${tracked.monthlyBurn} ${tracked.currency}
- Visitors this month: ${tracked.visitorsThisMonth}
`
    : "No founder-tracked metrics yet — clearly invent a conservative early-stage scenario.";

  const rateLimit = await checkAiRateLimit(user.id);
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.message };
  }

  const systemPrompt = `You are an expert Data Scientist advising African startups.
Generate a realistic 6-month analytics PROJECTION (forecast / scenario) — NOT live tracked data.
Return ONLY valid JSON. Do not include any comments, ellipses, or markdown formatting in your response.
Keep recommendation details concise (1-2 sentences) to guarantee full, complete JSON without truncation.
The JSON must strictly follow this exact structure:

{
  "kpis": [
    { "title": "Projected Monthly Revenue", "value": "1,250 ${currency}", "change": "+15.4% vs prior month", "trend": "up", "color": "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" }
  ],
  "funnel": [
    { "stage": "Discovery / Visitors", "count": 8500, "conversionRate": 100 }
  ],
  "channels": [
    { "name": "Mobile Money", "percentage": 65, "amountCents": 81250 }
  ],
  "history": [
    { "month": "Jan", "visitors": 4200, "signups": 800, "activeUsers": 350, "revenueUSD": 520 }
  ],
  "recommendations": [
    { "title": "Actionable Title", "detail": "Detailed actionable recommendation..." }
  ]
}

CRITICAL REQUIREMENTS FOR THE JSON:
1. "kpis" array MUST contain exactly 4 KPIs. Titles must include "Projected" or "Scenario".
2. "funnel" array MUST contain exactly 4 stages.
3. "channels" array MUST contain items whose percentages add up to exactly 100.
4. "history" array MUST contain exactly 6 months of projected trajectory.
5. "recommendations" array MUST contain exactly 3 concise, highly actionable recommendations based on the industry and region.

Context:
Startup: ${startup.name}
Industry: ${startup.industry || "Tech"}
Location: ${startup.city || "Unknown"}, ${startup.country_code}
Budget: ${(startup.estimated_budget_cents || 0) / 100} ${currency}
Project: ${project.title}
Description: ${project.description || "N/A"}
${trackedContext}`;

  let aiData: Partial<AnalyticsWorkspace> = {};
  try {
    const { generateTextWithFallback } = await import("@/src/lib/ai-providers");
    const response = await generateTextWithFallback(systemPrompt, [], {
      maxTokens: 3500,
      temperature: 0.6,
    });
    try {
      aiData = parseAnalyticsJson(response);
    } catch {
      const repairedResponse = await generateTextWithFallback(
        `${systemPrompt}\n\nYour previous response was incomplete or invalid JSON. Return the complete analytics object again as strict JSON only. Keep values concise. Do not use markdown fences or commentary.\n\nPrevious response:\n${response.slice(0, 1500)}`,
        [],
        { maxTokens: 4000, temperature: 0.2 },
      );
      aiData = parseAnalyticsJson(repairedResponse);
    }
  } catch (error: unknown) {
    console.warn("AI generation failed or had formatting errors, using fallback workspace:", error);
  }

  const aiComplete =
    (aiData.kpis?.length ?? 0) >= 4 &&
    (aiData.funnel?.length ?? 0) >= 4 &&
    (aiData.channels?.length ?? 0) > 0 &&
    (aiData.history?.length ?? 0) >= 6 &&
    (aiData.recommendations?.length ?? 0) > 0;

  let workspace: AnalyticsWorkspace;
  if (aiComplete) {
    workspace = {
      source: "projected",
      generatedAt: new Date().toISOString(),
      kpis: aiData.kpis as MetricCard[],
      funnel: aiData.funnel as FunnelStep[],
      channels: aiData.channels as PaymentChannel[],
      history: aiData.history as ChartDataPoint[],
      recommendations: aiData.recommendations as { title: string; detail: string }[],
    };
  } else {
    // Never splice template numbers into a partial AI answer.
    const fallback = buildFallbackAnalyticsWorkspace(startup, project, currency, tracked);
    if (!fallback) {
      return {
        success: false,
        error:
          "The AI projection is unavailable right now. Save your tracked numbers above, or try again in a moment.",
      };
    }
    workspace = fallback;
  }

  const { error } = await supabase
    .from("projects")
    .update({
      metadata: { ...metadata, analytics_workspace: workspace } as unknown as Json,
    })
    .eq("id", project.id);

  if (error)
    return {
      success: false,
      error: "Could not save the generated workspace. Please try again.",
    };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/analytics");
  return { success: true, workspace };
}

export async function saveTrackedMetrics(
  projectId: string,
  input: Omit<TrackedMetrics, "updatedAt">,
): Promise<
  { success: true; metrics: TrackedMetrics } | { success: false; error: string }
> {
  const access = await getProjectAccess(projectId, "edit");
  if ("error" in access) return { success: false, error: access.error };
  const { supabase, project } = access;

  const metadata = readMetadata(project.metadata);
  const metrics: TrackedMetrics = {
    updatedAt: new Date().toISOString(),
    monthlyRevenue: Math.max(0, Number(input.monthlyRevenue) || 0),
    currency: (input.currency || "USD").trim().toUpperCase().slice(0, 8),
    activeCustomers: Math.max(
      0,
      Math.round(Number(input.activeCustomers) || 0),
    ),
    monthlyBurn: Math.max(0, Number(input.monthlyBurn) || 0),
    visitorsThisMonth: Math.max(
      0,
      Math.round(Number(input.visitorsThisMonth) || 0),
    ),
    notes: input.notes?.trim() || undefined,
  };

  const { error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, tracked_metrics: metrics } as unknown as Json })
    .eq("id", projectId);

  if (error) return { success: false, error: "Could not save your changes. Please try again." };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/analytics");
  return { success: true, metrics };
}

export async function saveAnalyticsWorkspace(
  projectId: string,
  workspace: AnalyticsWorkspace,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!isStorableObject(workspace)) return { success: false, error: "That is too much content to save. Shorten it and try again." };
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !projectId)
    return { success: false, error: "Please sign in to save changes." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, metadata")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { success: false, error: "Project not found." };

  const metadata = readMetadata(project.metadata);
  const normalized: AnalyticsWorkspace = { ...workspace, source: "projected" };

  const { error } = await supabase
    .from("projects")
    .update({
      metadata: { ...metadata, analytics_workspace: normalized } as unknown as Json,
    })
    .eq("id", projectId);

  if (error) return { success: false, error: "Could not save your changes. Please try again." };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/analytics");
  return { success: true };
}
