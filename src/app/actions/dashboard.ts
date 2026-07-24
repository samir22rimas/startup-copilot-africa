"use server"

import { createProject, getProjects } from "@/src/features/business/services/project.service"
import { createStartup, getMyStartup } from "@/src/features/business/services/startup.service"
import { supabaseAdmin } from "@/src/lib/supabase/admin"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface DashboardTask {
  id: string
  title: string
  tag: string
  done: boolean
}

export interface DashboardRecommendation {
  title: string
  detail: string
}

export interface DashboardDocument {
  id: string
  title: string
  summary: string
  status: string
}

export interface DashboardQuickAction {
  label: string
  href: string
  description: string
}

export interface MarketingMetric {
  title: string
  value: number
  unit: string
  change: string
  trend: "up" | "down"
  color: string
}

export interface MarketingEventItem {
  id: string
  day: number
  label: string
  color: string
}

export interface MarketingUpcomingItem {
  id: string
  title: string
  type: string
  time: string
  iconName: "file" | "video" | "mail" | "sparkles"
  iconBg: string
  iconColor: string
}

export interface MarketingOverview {
  kpis: MarketingMetric[]
  strategyItems: DashboardRecommendation[]
  generatedContent: string
  events: MarketingEventItem[]
  upcoming: MarketingUpcomingItem[]
}

export interface DashboardOverview {
  healthScore: number
  healthLabel: string
  recommendations: DashboardRecommendation[]
  documents: DashboardDocument[]
  quickActions: DashboardQuickAction[]
  marketing: MarketingOverview
}

function getHealthLabel(score: number) {
  if (score >= 80) return "Thriving"
  if (score >= 60) return "On track"
  if (score >= 40) return "Needs attention"
  return "Building foundation"
}

function calculateHealthScore(
  startup: any,
  project: any,
  tasks: DashboardTask[],
  documents: any[],
  insights: any[],
) {
  let score = 25

  if (startup?.onboarding_status === "completed") score += 20
  if (startup?.estimated_budget_cents && startup.estimated_budget_cents > 0) score += 10
  if (project?.description) score += 10
  if (project?.target_audience) score += 10
  if (tasks.length > 0) {
    const completedTasks = tasks.filter((task) => task.done).length
    score += Math.round((completedTasks / tasks.length) * 20)
  }
  if (documents.length > 0) score += 10
  if (insights.length > 0) score += 10

  return Math.min(100, Math.max(0, score))
}

function buildRecommendations(
  startup: any,
  project: any,
  tasks: DashboardTask[],
  documents: any[],
  insights: any[],
): DashboardRecommendation[] {
  if (insights.length > 0) {
    return insights.slice(0, 3).map((insight) => ({
      title: insight.title || insight.kind || "AI recommendation",
      detail: insight.result?.summary || insight.result?.next_step || insight.error_message || "Keep moving forward with this insight.",
    }))
  }

  const recommendations: DashboardRecommendation[] = []

  if (!project?.description) {
    recommendations.push({
      title: "Define your offer",
      detail: `Capture what ${startup?.name || "your startup"} solves and why it matters to the first customer.`,
    })
  }

  if (tasks.some((task) => !task.done)) {
    recommendations.push({
      title: "Complete the next milestone",
      detail: `You still have ${tasks.filter((task) => !task.done).length} open milestone${tasks.filter((task) => !task.done).length > 1 ? "s" : ""} to close this week.`,
    })
  }

  if (documents.length === 0) {
    recommendations.push({
      title: "Upload customer evidence",
      detail: `Add customer notes, interviews, or pricing feedback so the dashboard can reflect more of your real progress.`,
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Review your launch plan",
      detail: `Use the current project context to refine your offer, channels, and proof points.`,
    })
  }

  return recommendations
}

function buildDocuments(startup: any, project: any, documents: any[]): DashboardDocument[] {
  if (documents.length > 0) {
    return documents.slice(0, 4).map((document) => ({
      id: document.id,
      title: document.file_name || "Generated document",
      summary: document.metadata?.summary || `Stored for ${startup?.name || project?.title || "your startup"}`,
      status: document.status || "ready",
    }))
  }

  return [
    {
      id: "startup-brief",
      title: `${startup?.name || project?.title || "Your startup"} business brief`,
      summary: `A working brief based on ${project?.title || "your active project"}.`,
      status: "ready",
    },
  ]
}

function buildQuickActions(startup: any, project: any): DashboardQuickAction[] {
  return [
    {
      label: "Open marketing workspace",
      href: "/dashboard/marketing",
      description: `Create launch content for ${project?.title || startup?.name || "your startup"}`,
    },
    {
      label: "Review startup settings",
      href: "/dashboard/settings",
      description: "Update business details, budget, and founder profile",
    },
    {
      label: "Ask your copilot",
      href: "/dashboard#copilot",
      description: "Turn your latest progress into the next move",
    },
  ]
}

function buildMarketingOverview(startup: any, project: any, tasks: DashboardTask[], documents: any[], insights: any[]): MarketingOverview {
  const completedTasks = tasks.filter((task) => task.done).length
  const totalAssets = documents.length + insights.length
  const launchReadiness = Math.min(100, Math.round(35 + completedTasks * 8 + (documents.length > 0 ? 15 : 0) + (insights.length > 0 ? 10 : 0)))
  const coverage = Math.min(100, Math.round(20 + documents.length * 15 + insights.length * 10))

  const kpis: MarketingMetric[] = [
    {
      title: "ACTIVE ASSETS",
      value: totalAssets,
      unit: " items",
      change: `${documents.length} documents`,
      trend: "up",
      color: "bg-green-100 text-green-700",
    },
    {
      title: "LAUNCH READINESS",
      value: launchReadiness,
      unit: "%",
      change: `${completedTasks}/${tasks.length} tasks complete`,
      trend: "up",
      color: "bg-blue-100 text-blue-700",
    },
    {
      title: "MARKETING COVERAGE",
      value: coverage,
      unit: "%",
      change: `${insights.length} insights`,
      trend: insights.length > 0 ? "up" : "down",
      color: "bg-zinc-100 text-zinc-700",
    },
  ]

  const strategyItems: DashboardRecommendation[] = []
  if (insights.length > 0) {
    insights.slice(0, 3).forEach((insight) => {
      strategyItems.push({
        title: insight.title || insight.kind || "Marketing insight",
        detail: insight.result?.summary || insight.result?.next_step || insight.error_message || "Keep the launch momentum moving.",
      })
    })
  }

  if (strategyItems.length === 0) {
    strategyItems.push({
      title: "Shape the story around your first customer",
      detail: `Use the latest project context for ${project?.title || startup?.name || "your startup"} to sharpen the offer and message.`,
    })
  }

  const generatedContent = [
    project?.title || startup?.name || "Your startup",
    documents[0]?.file_name || null,
    insights[0]?.title || null,
  ]
    .filter(Boolean)
    .join(" • ")

  const baseDay = new Date().getDate()
  const events: MarketingEventItem[] = []
  documents.slice(0, 3).forEach((document, index) => {
    const day = (baseDay + index + 1) % 28 || 28
    events.push({
      id: `doc-${document.id}`,
      day,
      label: `Doc: ${document.file_name || "draft"}`,
      color: index % 2 === 0 ? "border-blue-500 text-blue-700 bg-blue-50" : "border-fuchsia-500 text-fuchsia-700 bg-fuchsia-50",
    })
  })
  insights.slice(0, 2).forEach((insight, index) => {
    const day = (baseDay + index + 4) % 28 || 28
    events.push({
      id: `insight-${insight.id}`,
      day,
      label: `Insight: ${insight.title || insight.kind || "launch"}`,
      color: index === 0 ? "bg-green-600 text-white border-green-600" : "border-orange-500 text-orange-700 bg-orange-50",
    })
  })

  const upcoming: MarketingUpcomingItem[] = []
  if (documents.length > 0) {
    documents.slice(0, 2).forEach((document, index) => {
      upcoming.push({
        id: `upcoming-doc-${document.id}`,
        title: document.file_name || "Launch document",
        type: index === 0 ? "Draft" : "Review",
        time: document.created_at ? "Ready now" : "Queued",
        iconName: index === 0 ? "file" : "video",
        iconBg: index === 0 ? "bg-blue-100 dark:bg-blue-900/30" : "bg-pink-100 dark:bg-pink-900/30",
        iconColor: index === 0 ? "text-blue-600 dark:text-blue-400" : "text-pink-600 dark:text-pink-400",
      })
    })
  }
  if (insights.length > 0) {
    insights.slice(0, 1).forEach((insight) => {
      upcoming.push({
        id: `upcoming-insight-${insight.id}`,
        title: insight.title || insight.kind || "AI recommendation",
        type: "Insight",
        time: "Ready to act",
        iconName: "sparkles",
        iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
        iconColor: "text-yellow-600 dark:text-yellow-400",
      })
    })
  }
  if (upcoming.length === 0) {
    upcoming.push({
      id: "upcoming-default",
      title: `${startup?.name || project?.title || "Your startup"} launch story`,
      type: "Draft",
      time: "Pending",
      iconName: "mail",
      iconBg: "bg-zinc-100 dark:bg-zinc-800",
      iconColor: "text-zinc-600 dark:text-zinc-400",
    })
  }

  return {
    kpis,
    strategyItems,
    generatedContent: generatedContent || `Your latest launch content will appear here once you store documents or insights for ${startup?.name || project?.title || "your startup"}.`,
    events,
    upcoming,
  }
}

/**
 * Gets all dashboard data for the active startup/project.
 */
export async function getDashboardData() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    return { error: "Not authenticated" }
  }

  // 1. Fetch startup
  const startup = await getMyStartup()
  if (!startup) {
    return { hasStartup: false }
  }

  // 2. Fetch projects
  const projects = await getProjects(startup.id)
  if (projects.length === 0) {
    return { hasStartup: true, hasProject: false, startup }
  }

  const project = projects[0] // Get the active/most recent project

  // 3. Extract tasks from project metadata
  const metadata = (project.metadata as any) || {}
  let tasks: DashboardTask[] = metadata.tasks || []

  // If no tasks exist, initialize defaults
  if (tasks.length === 0) {
    const systemPrompt = `You are a Startup Advisor for an African founder.
Based on the startup details, generate exactly 4 actionable, highly specific tasks for their initial launch dashboard.
Return ONLY valid JSON matching this exact structure:
[
  { "id": "task_1", "title": "...", "tag": "Research", "done": false },
  ... exactly 4 tasks
]
Tags should be one of: Research, Strategy, Planning, Infrastructure, Marketing.
Context:
Startup: ${startup.name}
Location: ${startup.city || "Unknown"}, ${startup.country_code || "Africa"}
Budget: ${(startup.estimated_budget_cents || 0) / 100} ${startup.budget_currency || "USD"}
Project: ${project.title}
Description: ${project.description || "N/A"}`

    try {
      const { generateTextWithFallback } = await import("@/src/lib/ai-providers")
      const response = await generateTextWithFallback(systemPrompt, [], { maxTokens: 800, temperature: 0.6 })
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        tasks = JSON.parse(jsonMatch[0])
      }
    } catch (error: any) {
      console.error("Failed to generate initial tasks with AI", error)
      tasks = [
        { id: "error", title: `Failed to generate personalized tasks. Check your AI provider configuration. Error: ${error.message || "Unknown"}`, tag: "Error", done: false }
      ]
    }

    if (tasks.length === 0) {
      tasks = [
        { id: "error", title: "The AI returned an empty task list. Please refresh or try again.", tag: "Error", done: false }
      ]
    }

    // Save defaults to metadata
    await supabase
      .from("projects")
      .update({
        metadata: { ...metadata, tasks }
      })
      .eq("id", project.id)
  }

  // 4. Fetch or auto-create the active Copilot conversation/messages
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("project_id", project.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false })

  let copilotMessages: any[] = []
  let conversationId = conversations?.[0]?.id || ""

  if (!conversationId) {
    // Auto-create a conversation for dashboard copilot
    const { data: newConv } = await supabase
      .from("conversations")
      .insert({
        startup_id: startup.id,
        project_id: project.id,
        created_by: user.id,
        title: `Dashboard Copilot: ${project.title}`,
      })
      .select("id")
      .single()

    if (newConv) {
      conversationId = newConv.id
    }
  }

  if (conversationId) {
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
    copilotMessages = messages || []
  }

  const { data: documents = [] } = await supabase
    .from("knowledge_documents")
    .select("id, file_name, status, metadata, created_at")
    .eq("startup_id", startup.id)
    .order("created_at", { ascending: false })
    .limit(4)

  const { data: insights = [] } = await supabase
    .from("insights")
    .select("id, title, kind, status, result, error_message, created_at")
    .eq("startup_id", startup.id)
    .order("created_at", { ascending: false })
    .limit(4)

  const overview: DashboardOverview = {
    healthScore: calculateHealthScore(startup, project, tasks, documents || [], insights || []),
    healthLabel: getHealthLabel(calculateHealthScore(startup, project, tasks, documents || [], insights || [])),
    recommendations: buildRecommendations(startup, project, tasks, documents || [], insights || []),
    documents: buildDocuments(startup, project, documents || []),
    quickActions: buildQuickActions(startup, project),
    marketing: buildMarketingOverview(startup, project, tasks, documents || [], insights || []),
  }

  return {
    hasStartup: true,
    hasProject: true,
    startup,
    project,
    tasks,
    conversationId,
    copilotMessages,
    overview,
  }
}

/**
 * Creates startup and associated project in a single transaction-like flow.
 */
export async function createStartupAndFirstProject(input: {
  name: string
  countryCode: string
  city: string
  industry: string
  estimatedBudgetCents: number
  budgetCurrency: string
  projectTitle: string
  projectDescription: string
}) {
  try {
    const { startup, error: startupError } = await createStartup({
      name: input.name,
      country_code: input.countryCode,
      city: input.city,
      industry: input.industry,
      estimated_budget_cents: input.estimatedBudgetCents,
      budget_currency: input.budgetCurrency,
    })

    if (startupError || !startup) {
      return { success: false as const, error: startupError ?? "Failed to create startup record." }
    }

    const project = await createProject({
      startup_id: startup.id,
      title: input.projectTitle,
      description: input.projectDescription,
    })

    if (!project) {
      return { success: false as const, error: "Startup created, but the project failed to save." }
    }

    revalidatePath("/dashboard")
    return { success: true as const, startup, project }
  } catch (err: any) {
    console.error("Error in createStartupAndFirstProject:", err)
    return { success: false as const, error: err.message || "An unexpected error occurred." }
  }
}

/**
 * Toggles a dashboard task status.
 */
export async function toggleDashboardTask(projectId: string, taskId: string, done: boolean) {
  const supabase = await createSupabaseServerClient()

  const { data: project } = await supabase
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .single()

  if (!project) return false

  const metadata = (project.metadata as any) || {}
  const tasks: DashboardTask[] = metadata.tasks || []

  const updatedTasks = tasks.map(task =>
    task.id === taskId ? { ...task, done } : task
  )

  const { error } = await supabase
    .from("projects")
    .update({
      metadata: { ...metadata, tasks: updatedTasks }
    })
    .eq("id", projectId)

  if (error) {
    console.error("Failed to toggle task:", error.message)
    return false
  }

  revalidatePath("/dashboard")
  return true
}

/**
 * Adds a new custom dashboard task.
 */
export async function addDashboardTask(projectId: string, title: string, tag: string) {
  const supabase = await createSupabaseServerClient()

  const { data: project } = await supabase
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .single()

  if (!project) return false

  const metadata = (project.metadata as any) || {}
  const tasks: DashboardTask[] = metadata.tasks || []

  const newTask: DashboardTask = {
    id: `task-${Date.now()}`,
    title,
    tag,
    done: false
  }

  const updatedTasks = [...tasks, newTask]

  const { error } = await supabase
    .from("projects")
    .update({
      metadata: { ...metadata, tasks: updatedTasks }
    })
    .eq("id", projectId)

  if (error) {
    console.error("Failed to add task:", error.message)
    return false
  }

  revalidatePath("/dashboard")
  return true
}

/**
 * Sends a chat message to the copilot and stores both user prompt and assistant response.
 */
export async function sendStatefulCopilotMessage(
  projectId: string,
  conversationId: string,
  messageText: string
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("You must be signed in.")
  }

  // 1. Insert user message
  const { error: userMsgErr } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      author_id: user.id,
      role: "user",
      content: messageText,
    })

  if (userMsgErr) {
    console.error("Error inserting user message:", userMsgErr.message)
    throw new Error("Failed to save message.")
  }

  // 2. Fetch project/startup context
  const { data: project } = await supabase
    .from("projects")
    .select("startup_id, title, description")
    .eq("id", projectId)
    .single()

  if (!project || !project.startup_id) {
    throw new Error("Associated project not found.")
  }

  const { data: startup } = await supabase
    .from("startups")
    .select("*")
    .eq("id", project.startup_id)
    .single()

  // 3. Fetch entire conversation messages
  const { data: messages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  const systemContext = `You are Startup Copilot, an expert AI advisor for early-stage African startup founders.
You provide actionable, context-aware advice on product development, fundraising, marketing, and operations.
Keep responses concise and practical.
Current startup context:
- Name: ${startup?.name}
- Industry: ${startup?.industry || "N/A"}
- Description: ${project?.description || startup?.description || "N/A"}
- Location: ${startup?.city || "N/A"}, ${startup?.country_code}
- Budget: ${(startup?.estimated_budget_cents || 0) / 100} ${startup?.budget_currency || "USD"}`

  const formattedMessages = (messages || []).map(m => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content
  }))

  // 4. Request response from the available AI provider
  const { generateTextWithFallback } = await import("@/src/lib/ai-providers")
  const reply = await generateTextWithFallback(systemContext, formattedMessages)

  // 5. Insert assistant response (must use service-role client — RLS only allows
  //    role='user' inserts for regular users; assistant messages are server-only)
  await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content: reply,
    })

  revalidatePath("/dashboard")
  return reply
}

