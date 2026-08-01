"use server"

import {
  type TrackedMetrics,
  hasTrackedMetrics,
  readMetadata,
  readTrackedMetrics,
} from "@/src/lib/data-truth"
import { checkAiRateLimit, AI_RATE_LIMIT_MESSAGE } from "@/src/lib/rate-limiter"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface MetricCard {
  title: string
  value: string
  change: string
  trend: "up" | "down" | "neutral"
  color: string
}

export interface FunnelStep {
  stage: string
  count: number
  conversionRate: number
}

export interface PaymentChannel {
  name: string
  percentage: number
  amountCents: number
}

export interface ChartDataPoint {
  month: string
  visitors: number
  signups: number
  activeUsers: number
  revenueUSD: number
}

export interface AnalyticsWorkspace {
  /** Always projected — AI scenario, never live tracking */
  source: "projected"
  generatedAt: string
  kpis: MetricCard[]
  funnel: FunnelStep[]
  channels: PaymentChannel[]
  history: ChartDataPoint[]
  recommendations: { title: string; detail: string }[]
}

export async function generateAnalyticsWorkspace(
  projectId: string,
): Promise<{ success: true; workspace: AnalyticsWorkspace } | { success: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !projectId) return { success: false, error: "Please sign in to generate your workspace." }

  const { data: startup } = await supabase
    .from("startups")
    .select("id, name, city, country_code, industry, estimated_budget_cents, budget_currency")
    .eq("owner_id", user.id)
    .maybeSingle()
  if (!startup) return { success: false, error: "Your startup could not be found." }

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, description, target_audience, metadata")
    .eq("id", projectId)
    .eq("startup_id", startup.id)
    .maybeSingle()
  if (!project) return { success: false, error: "This project is not available to you." }

  const currency = startup.budget_currency || "USD"
  const metadata = readMetadata(project.metadata)
  const tracked = readTrackedMetrics(metadata, currency)
  const trackedContext = hasTrackedMetrics(tracked)
    ? `
Founder-reported (tracked) metrics — use as anchors for a realistic projection, do not ignore them:
- Monthly revenue: ${tracked.monthlyRevenue} ${tracked.currency}
- Active customers: ${tracked.activeCustomers}
- Monthly burn: ${tracked.monthlyBurn} ${tracked.currency}
- Visitors this month: ${tracked.visitorsThisMonth}
`
    : "No founder-tracked metrics yet — clearly invent a conservative early-stage scenario."

  const rateLimit = await checkAiRateLimit(user.id)
  if (!rateLimit.allowed) {
    return { success: false, error: AI_RATE_LIMIT_MESSAGE }
  }

  const systemPrompt = `You are an expert Data Scientist advising African startups.
Generate a realistic 6-month analytics PROJECTION (forecast / scenario) — NOT live tracked data.
Return ONLY valid JSON matching this exact structure:
{
  "kpis": [
    { "title": "Projected Monthly Revenue", "value": "1,250 ${currency}", "change": "+15.4% vs prior month in scenario", "trend": "up", "color": "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" },
    ... exactly 4 KPIs — titles must include "Projected" or "Scenario"
  ],
  "funnel": [
    { "stage": "Discovery / Visitors", "count": 8500, "conversionRate": 100 },
    ... exactly 4 stages
  ],
  "channels": [
    { "name": "Mobile Money", "percentage": 65, "amountCents": 81250 },
    ... exact percentages adding up to 100
  ],
  "history": [
    { "month": "Jan", "visitors": 4200, "signups": 800, "activeUsers": 350, "revenueUSD": 520 },
    ... exactly 6 months of projected trajectory
  ],
  "recommendations": [
    { "title": "...", "detail": "..." },
    ... exactly 3 highly actionable recommendations based on the industry and region
  ]
}

Context:
Startup: ${startup.name}
Industry: ${startup.industry || "Tech"}
Location: ${startup.city || "Unknown"}, ${startup.country_code}
Budget: ${(startup.estimated_budget_cents || 0) / 100} ${currency}
Project: ${project.title}
Description: ${project.description || "N/A"}
${trackedContext}`

  let aiData: Partial<AnalyticsWorkspace> = {}
  try {
    const { generateTextWithFallback } = await import("@/src/lib/ai-providers")
    const response = await generateTextWithFallback(systemPrompt, [], { maxTokens: 2000, temperature: 0.7 })
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      aiData = JSON.parse(jsonMatch[0])
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Failed to generate analytics with AI", error)
    return {
      success: false,
      error: "The AI could not generate analytics. Please check your AI provider configuration. Details: " + message,
    }
  }

  if (!aiData.kpis || !aiData.funnel || !aiData.channels || !aiData.history) {
    return { success: false, error: "The AI returned an incomplete analytics projection. Please try again." }
  }

  const workspace: AnalyticsWorkspace = {
    source: "projected",
    generatedAt: new Date().toISOString(),
    kpis: aiData.kpis as MetricCard[],
    funnel: aiData.funnel as FunnelStep[],
    channels: aiData.channels as PaymentChannel[],
    history: aiData.history as ChartDataPoint[],
    recommendations: (aiData.recommendations || []) as { title: string; detail: string }[],
  }

  const { error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, analytics_workspace: workspace } as any })
    .eq("id", project.id)

  if (error) return { success: false, error: "Could not save the generated workspace. Please try again." }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/analytics")
  return { success: true, workspace }
}

export async function saveTrackedMetrics(
  projectId: string,
  input: Omit<TrackedMetrics, "updatedAt">,
): Promise<{ success: true; metrics: TrackedMetrics } | { success: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !projectId) return { success: false, error: "Please sign in to save metrics." }

  const { data: startup } = await supabase
    .from("startups")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle()
  if (!startup) return { success: false, error: "Your startup could not be found." }

  const { data: project } = await supabase
    .from("projects")
    .select("id, metadata")
    .eq("id", projectId)
    .eq("startup_id", startup.id)
    .maybeSingle()
  if (!project) return { success: false, error: "Project not found." }

  const metadata = readMetadata(project.metadata)
  const metrics: TrackedMetrics = {
    updatedAt: new Date().toISOString(),
    monthlyRevenue: Math.max(0, Number(input.monthlyRevenue) || 0),
    currency: (input.currency || "USD").trim().toUpperCase().slice(0, 8),
    activeCustomers: Math.max(0, Math.round(Number(input.activeCustomers) || 0)),
    monthlyBurn: Math.max(0, Number(input.monthlyBurn) || 0),
    visitorsThisMonth: Math.max(0, Math.round(Number(input.visitorsThisMonth) || 0)),
    notes: input.notes?.trim() || undefined,
  }

  const { error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, tracked_metrics: metrics } as any })
    .eq("id", projectId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/analytics")
  return { success: true, metrics }
}

export async function saveAnalyticsWorkspace(
  projectId: string,
  workspace: AnalyticsWorkspace,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !projectId) return { success: false, error: "Please sign in to save changes." }

  const { data: project } = await supabase.from("projects").select("id, metadata").eq("id", projectId).maybeSingle()
  if (!project) return { success: false, error: "Project not found." }

  const metadata = readMetadata(project.metadata)
  const normalized: AnalyticsWorkspace = { ...workspace, source: "projected" }

  const { error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, analytics_workspace: normalized } as any })
    .eq("id", projectId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/analytics")
  return { success: true }
}
