"use server"

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
  source: "tracked"
  generatedAt: string
  kpis: MetricCard[]
  funnel: FunnelStep[]
  channels: PaymentChannel[]
  history: ChartDataPoint[]
  recommendations: { title: string; detail: string }[]
}

export async function generateAnalyticsWorkspace(projectId: string): Promise<{ success: true; workspace: AnalyticsWorkspace } | { success: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
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

  const systemPrompt = `You are an expert Data Scientist and AI Engineer for African startups.
Generate a realistic 6-month analytics projection for this startup.
Return ONLY valid JSON matching this exact structure:
{
  "kpis": [
    { "title": "Monthly Recurring Revenue", "value": "1,250 ${currency}", "change": "+15.4% from last month", "trend": "up", "color": "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30" },
    ... exactly 4 KPIs
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
    ... exactly 6 months
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
Description: ${project.description || "N/A"}`

  let aiData: Partial<AnalyticsWorkspace> = {}
  try {
    const { generateTextWithFallback } = await import("@/src/lib/ai-providers")
    const response = await generateTextWithFallback(systemPrompt, [], { maxTokens: 2000, temperature: 0.7 })
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      aiData = JSON.parse(jsonMatch[0])
    }
  } catch (error: any) {
    console.error("Failed to generate analytics with AI", error)
    return { success: false, error: "The AI could not generate analytics. Please check your AI provider configuration. Details: " + (error.message || "Unknown error") }
  }

  if (!aiData.kpis || !aiData.funnel || !aiData.channels || !aiData.history) {
    return { success: false, error: "The AI returned an incomplete analytics projection. Please try again." }
  }

  const workspace: AnalyticsWorkspace = {
    source: "tracked",
    generatedAt: new Date().toISOString(),
    kpis: aiData.kpis as any,
    funnel: aiData.funnel as any,
    channels: aiData.channels as any,
    history: aiData.history as any,
    recommendations: aiData.recommendations as any,
  }

  const metadata = project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata)
    ? project.metadata
    : {}

  const { error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, analytics_workspace: workspace as any } })
    .eq("id", project.id)

  if (error) return { success: false, error: "Could not save the generated workspace. Please try again." }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/analytics")
  return { success: true, workspace }
}

export async function saveAnalyticsWorkspace(projectId: string, workspace: AnalyticsWorkspace): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !projectId) return { success: false, error: "Please sign in to save changes." }

  const { data: project } = await supabase
    .from("projects")
    .select("id, metadata")
    .eq("id", projectId)
    .maybeSingle()
  if (!project) return { success: false, error: "Project not found." }

  const metadata = project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata)
    ? project.metadata
    : {}

  const { error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, analytics_workspace: workspace as any } })
    .eq("id", projectId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/analytics")
  return { success: true }
}
