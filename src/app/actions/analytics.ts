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

  // Base mock logic mirroring regional setup (e.g. higher Mobile Money usage in East/West Africa)
  const isEastOrWestAfrica = ["KE", "UG", "TZ", "GH", "NG", "CI", "SN"].includes(startup.country_code)
  
  const mMoneyShare = isEastOrWestAfrica ? 65 : 35
  const cardShare = isEastOrWestAfrica ? 15 : 40
  const transferShare = 100 - mMoneyShare - cardShare

  const workspace: AnalyticsWorkspace = {
    generatedAt: new Date().toISOString(),
    kpis: [
      {
        title: "Monthly Recurring Revenue",
        value: `1,250 ${currency}`,
        change: "+15.4% from last month",
        trend: "up",
        color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
      },
      {
        title: "Active Customers",
        value: "420",
        change: "+8.2% from last week",
        trend: "up",
        color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
      },
      {
        title: "Customer Acquisition Cost (CAC)",
        value: `8.50 ${currency}`,
        change: "-4.2% lower spend efficiency",
        trend: "down", // in CAC, down is good!
        color: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30",
      },
      {
        title: "Customer Lifetime Value (LTV)",
        value: `180.00 ${currency}`,
        change: "LTV/CAC ratio: 21.1x",
        trend: "neutral",
        color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30",
      },
    ],
    funnel: [
      { stage: "Discovery / Visitors", count: 8500, conversionRate: 100 },
      { stage: "Free Signups", count: 1800, conversionRate: 21.1 },
      { stage: "Active Users (Weekly)", count: 750, conversionRate: 41.6 },
      { stage: "Paying Customers", count: 120, conversionRate: 16.0 },
    ],
    channels: [
      { name: "Mobile Money (M-Pesa, MTN, Wave)", percentage: mMoneyShare, amountCents: 81250 },
      { name: "Card Payments (Visa/Mastercard)", percentage: cardShare, amountCents: 18750 },
      { name: "Bank Transfer & Cash", percentage: transferShare, amountCents: 25000 },
    ],
    history: [
      { month: "Jan", visitors: 4200, signups: 800, activeUsers: 350, revenueUSD: 520 },
      { month: "Feb", visitors: 5100, signups: 1100, activeUsers: 450, revenueUSD: 680 },
      { month: "Mar", visitors: 5800, signups: 1250, activeUsers: 510, revenueUSD: 850 },
      { month: "Apr", visitors: 6900, signups: 1480, activeUsers: 600, revenueUSD: 1010 },
      { month: "May", visitors: 7800, signups: 1650, activeUsers: 690, revenueUSD: 1120 },
      { month: "Jun", visitors: 8500, signups: 1800, activeUsers: 750, revenueUSD: 1250 },
    ],
    recommendations: [
      {
        title: "Optimize Mobile Money payment prompts",
        detail: "65% of your customers transact via mobile wallet. Minimize transactional failure by triggering USSD push prompts instantly at checkout.",
      },
      {
        title: "Tackle signup-to-active dropoff",
        detail: "There is a 58.4% dropoff between account creation and active usage. Offer local SMS welcome onboarding or interactive WhatsApp support.",
      },
      {
        title: "Leverage referral incentives",
        detail: "African digital acquisition heavily benefits from word-of-mouth. Introduce a referral program offering small mobile airtime credits.",
      },
    ],
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
