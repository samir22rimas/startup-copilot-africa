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

function buildFallbackAnalyticsWorkspace(
  startup: {
    name: string;
    city?: string | null;
    country_code: string;
    industry?: string | null;
    estimated_budget_cents?: number | null;
    budget_currency?: string | null;
  },
  project: {
    title: string;
    description?: string | null;
  },
  currency: string,
  tracked: TrackedMetrics,
): AnalyticsWorkspace {
  const baseRevenue = tracked.monthlyRevenue > 0
    ? Math.round(tracked.monthlyRevenue * 1.35)
    : Math.max(1500, Math.round(((startup.estimated_budget_cents || 0) / 100) * 0.4) || 2400);

  const baseActive = tracked.activeCustomers > 0
    ? Math.round(tracked.activeCustomers * 1.4)
    : 320;

  const baseVisitors = tracked.visitorsThisMonth > 0
    ? Math.round(tracked.visitorsThisMonth * 1.5)
    : 6500;

  const baseBurn = tracked.monthlyBurn > 0
    ? tracked.monthlyBurn
    : Math.max(800, Math.round(baseRevenue * 0.65));

  const monthNames = ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6"];
  const multipliers = [0.7, 0.85, 1.0, 1.18, 1.4, 1.68];

  const history: ChartDataPoint[] = monthNames.map((month, idx) => {
    const m = multipliers[idx];
    return {
      month,
      visitors: Math.round(baseVisitors * m),
      signups: Math.round(baseVisitors * 0.18 * m),
      activeUsers: Math.round(baseActive * m),
      revenueUSD: Math.round(baseRevenue * m),
    };
  });

  const channels: PaymentChannel[] = [
    {
      name: "Mobile Money (M-Pesa / MTN / Orange)",
      percentage: 65,
      amountCents: Math.round(baseRevenue * 0.65 * 100),
    },
    {
      name: "Card Payments (Debit / Credit)",
      percentage: 20,
      amountCents: Math.round(baseRevenue * 0.20 * 100),
    },
    {
      name: "Direct Bank Transfer / Instant EFT",
      percentage: 10,
      amountCents: Math.round(baseRevenue * 0.10 * 100),
    },
    {
      name: "Cash / Agent Network",
      percentage: 5,
      amountCents: Math.round(baseRevenue * 0.05 * 100),
    },
  ];

  const funnel: FunnelStep[] = [
    { stage: "Discovery / Visitors", count: baseVisitors, conversionRate: 100 },
    { stage: "Product Consideration / Leads", count: Math.round(baseVisitors * 0.28), conversionRate: 28 },
    { stage: "Signups / Activated Users", count: Math.round(baseVisitors * 0.11), conversionRate: 11 },
    { stage: "Paying Customers", count: baseActive, conversionRate: Math.max(1, Math.round((baseActive / baseVisitors) * 1000) / 10) },
  ];

  const kpis: MetricCard[] = [
    {
      title: "Projected Monthly Revenue",
      value: `${baseRevenue.toLocaleString()} ${currency}`,
      change: "+24.5% vs baseline",
      trend: "up",
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      title: "Projected Active Customers",
      value: baseActive.toLocaleString(),
      change: "+18.2% MoM",
      trend: "up",
      color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Scenario Monthly Burn",
      value: `${baseBurn.toLocaleString()} ${currency}`,
      change: "-4.0% efficiency",
      trend: "neutral",
      color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
    },
    {
      title: "Projected Conversion Rate",
      value: `${funnel[3].conversionRate}%`,
      change: "+0.8% scenario lift",
      trend: "up",
      color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30",
    },
  ];

  const recommendations = [
    {
      title: "Deepen Mobile Money Integration",
      detail: `Prioritize native USSD and Mobile Money checkouts for ${startup.name} to minimize drop-off at payment stages across local markets.`,
    },
    {
      title: "Streamline User Activation Flow",
      detail: `Reduce time-to-first-value for ${project.title} by shortening onboarding steps and offering guided product tours during the first session.`,
    },
    {
      title: "Incentivize Peer Referrals",
      detail: "Deploy transaction discount credits for early customers who introduce fellow merchants or users to drive organic customer acquisition.",
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
Founder-reported (tracked) metrics — use as anchors for a realistic projection, do not ignore them:
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

  const fallback = buildFallbackAnalyticsWorkspace(
    startup,
    project,
    currency,
    tracked,
  );

  const workspace: AnalyticsWorkspace = {
    source: "projected",
    generatedAt: new Date().toISOString(),
    kpis: (aiData.kpis && aiData.kpis.length >= 4 ? aiData.kpis : fallback.kpis) as MetricCard[],
    funnel: (aiData.funnel && aiData.funnel.length >= 4 ? aiData.funnel : fallback.funnel) as FunnelStep[],
    channels: (aiData.channels && aiData.channels.length > 0 ? aiData.channels : fallback.channels) as PaymentChannel[],
    history: (aiData.history && aiData.history.length >= 6 ? aiData.history : fallback.history) as ChartDataPoint[],
    recommendations: (aiData.recommendations && aiData.recommendations.length > 0
      ? aiData.recommendations
      : fallback.recommendations) as {
      title: string;
      detail: string;
    }[],
  };

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
