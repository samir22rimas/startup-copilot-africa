"use server";

import {
  createProject,
  getProjects,
} from "@/src/features/business/services/project.service";
import {
  createStartup,
  getMyStartup,
} from "@/src/features/business/services/startup.service";
import type { Database, Json } from "@/src/lib/database.types";
import { getDocumentContextForStartup } from "@/src/lib/document-context";
import { getPlanLimits, getPlanTier } from "@/src/lib/plans";
import { checkAiRateLimit } from "@/src/lib/rate-limiter";
import { getSupabaseAdmin } from "@/src/lib/supabase/admin";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { MAX_CHAT_MESSAGE_LENGTH, cleanText, isUuid } from "@/src/lib/validation";
import { getProjectAccess, readProjectMetadata } from "@/src/lib/workspace-access";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

type StartupRow = Database["public"]["Tables"]["startups"]["Row"];
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
type DocumentSummary = Pick<
  Database["public"]["Tables"]["knowledge_documents"]["Row"],
  "id" | "file_name" | "status" | "metadata" | "created_at"
>;
type InsightSummary = Pick<
  Database["public"]["Tables"]["insights"]["Row"],
  "id" | "title" | "kind" | "status" | "result" | "error_message" | "created_at"
>;

/** A non-empty string field of a JSON object, or null. */
function jsonText(value: Json | null | undefined, key: string): string | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const field = value[key];
    return typeof field === "string" && field ? field : null;
  }
  return null;
}

const MAX_TASKS = 200;
const COPILOT_HISTORY_LIMIT = 30;

const newStartupSchema = z.object({
  name: z.string().trim().min(2, "Startup name must be at least 2 characters.").max(120),
  countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/, "Choose a country."),
  city: z.string().trim().max(120).default(""),
  industry: z.string().trim().max(120).default(""),
  estimatedBudgetCents: z.number().min(0).max(1e15).default(0),
  budgetCurrency: z.string().trim().regex(/^[A-Za-z]{3}$/).default("USD"),
  projectTitle: z.string().trim().min(2, "Project title must be at least 2 characters.").max(160),
  projectDescription: z.string().trim().max(4000).default(""),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})?$/)
    .optional()
    .or(z.literal("")),
});

export interface DashboardTask {
  id: string;
  title: string;
  tag: string;
  done: boolean;
  /** Team member responsible for this milestone, if any. */
  assigneeId?: string | null;
  /** Due date as YYYY-MM-DD, if any. */
  dueDate?: string | null;
}

/** A teammate a milestone can be assigned to. */
export interface TaskAssignee {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface DashboardRecommendation {
  title: string;
  detail: string;
}

export interface DashboardDocument {
  id: string;
  title: string;
  summary: string;
  status: string;
}

export interface DashboardQuickAction {
  label: string;
  href: string;
  description: string;
}

export interface MarketingMetric {
  title: string;
  value: number;
  unit: string;
  change: string;
  trend: "up" | "down";
  color: string;
  /** Always derived from app records — never live campaign analytics */
  source: "derived";
  footnote: string;
}

export interface MarketingEventItem {
  id: string;
  day: number;
  label: string;
  color: string;
  content?: string;
}

export interface MarketingUpcomingItem {
  id: string;
  title: string;
  type: string;
  time: string;
  iconName: "file" | "video" | "mail" | "sparkles";
  iconBg: string;
  iconColor: string;
  source: "tracked" | "derived";
}

export interface FocusIndicator {
  label: string;
  value: number;
  footnote: string;
  source: "derived" | "tracked";
}

export interface MarketingOverview {
  kpis: MarketingMetric[];
  strategyItems: DashboardRecommendation[];
  generatedContent: string;
  events: MarketingEventItem[];
  upcoming: MarketingUpcomingItem[];
}

export interface DashboardOverview {
  healthScore: number;
  healthLabel: string;
  healthFootnote: string;
  focusIndicators: FocusIndicator[];
  weeklyFocus: import("@/src/lib/focus-plan").WeeklyFocusPlan | null;
  recommendations: DashboardRecommendation[];
  documents: DashboardDocument[];
  quickActions: DashboardQuickAction[];
  marketing: MarketingOverview;
  trackedMetrics: import("@/src/lib/data-truth").TrackedMetrics | null;
}

function getHealthLabel(score: number) {
  if (score >= 80) return "Thriving";
  if (score >= 60) return "On track";
  if (score >= 40) return "Needs attention";
  return "Building foundation";
}

function calculateHealthScore(
  startup: StartupRow,
  project: ProjectRow,
  tasks: DashboardTask[],
  documents: DocumentSummary[],
  insights: InsightSummary[],
  tracked?: import("@/src/lib/data-truth").TrackedMetrics | null,
  weeklyFocus?: import("@/src/lib/focus-plan").WeeklyFocusPlan | null,
) {
  let score = 20;

  if (startup?.onboarding_status === "completed") score += 15;
  if (startup?.estimated_budget_cents && startup.estimated_budget_cents > 0)
    score += 8;
  if (project?.description) score += 8;
  if (project?.target_audience) score += 8;
  if (tasks.length > 0) {
    const completedTasks = tasks.filter((task) => task.done).length;
    score += Math.round((completedTasks / tasks.length) * 20);
  }
  if (documents.length > 0) score += 8;
  if (insights.length > 0) score += 5;

  // Bonus only when founder has logged real operating numbers
  if (tracked?.updatedAt) {
    if (tracked.monthlyRevenue > 0 || tracked.activeCustomers > 0) score += 8;
    if (tracked.monthlyBurn > 0) score += 4;
    if (tracked.visitorsThisMonth > 0) score += 4;
  }

  if (weeklyFocus?.priorities?.length) {
    const done = weeklyFocus.priorities.filter((p) => p.done).length;
    score += Math.round((done / weeklyFocus.priorities.length) * 10);
    if (weeklyFocus.checkIn?.completedAt) score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

function buildFocusIndicators(
  startup: StartupRow,
  project: ProjectRow,
  tasks: DashboardTask[],
  tracked?: import("@/src/lib/data-truth").TrackedMetrics | null,
): FocusIndicator[] {
  const valueProp =
    (project?.description ? 40 : 0) +
    (project?.target_audience ? 40 : 0) +
    (startup?.industry ? 20 : 0);

  const completed = tasks.filter((t) => t.done).length;
  const taskProgress =
    tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  const hasBudget = (startup?.estimated_budget_cents ?? 0) > 0;
  let runwayScore = hasBudget ? 40 : 10;
  let runwayFootnote =
    hasBudget
      ? "Based on budget set in your startup profile"
      : "No budget set yet — update Settings";
  let runwaySource: "derived" | "tracked" = "derived";

  if (tracked?.updatedAt && tracked.monthlyBurn > 0) {
    runwaySource = "tracked";
    const net = Math.max(0, tracked.monthlyBurn - tracked.monthlyRevenue);
    if (net === 0 && tracked.monthlyRevenue > 0) {
      runwayScore = 90;
      runwayFootnote = "Tracked: revenue covers burn this month";
    } else if (tracked.monthlyRevenue > 0) {
      runwayScore = 55;
      runwayFootnote = `Tracked: net burn ${net} ${tracked.currency}/mo`;
    } else {
      runwayScore = 30;
      runwayFootnote = `Tracked burn ${tracked.monthlyBurn} ${tracked.currency}/mo — no revenue logged`;
    }
  }

  return [
    {
      label: "Value proposition setup",
      value: Math.min(100, valueProp),
      footnote: "Derived from description, audience, and industry on file",
      source: "derived",
    },
    {
      label: "Milestone execution",
      value: taskProgress,
      footnote: `${completed}/${tasks.length || 0} milestones complete`,
      source: "derived",
    },
    {
      label: "Financial runway signal",
      value: runwayScore,
      footnote: runwayFootnote,
      source: runwaySource,
    },
  ];
}

function buildRecommendations(
  startup: StartupRow,
  project: ProjectRow,
  tasks: DashboardTask[],
  documents: DocumentSummary[],
  insights: InsightSummary[],
): DashboardRecommendation[] {
  if (insights.length > 0) {
    return insights.slice(0, 3).map((insight) => ({
      title: insight.title || insight.kind || "AI recommendation",
      detail:
        jsonText(insight.result, "summary") ||
        jsonText(insight.result, "next_step") ||
        insight.error_message ||
        "Keep moving forward with this insight.",
    }));
  }

  const recommendations: DashboardRecommendation[] = [];

  if (!project?.description) {
    recommendations.push({
      title: "Define your offer",
      detail: `Capture what ${startup?.name || "your startup"} solves and why it matters to the first customer.`,
    });
  }

  if (tasks.some((task) => !task.done)) {
    recommendations.push({
      title: "Complete the next milestone",
      detail: `You still have ${tasks.filter((task) => !task.done).length} open milestone${tasks.filter((task) => !task.done).length > 1 ? "s" : ""} to close this week.`,
    });
  }

  if (documents.length === 0) {
    recommendations.push({
      title: "Upload customer evidence",
      detail: `Add customer notes, interviews, or pricing feedback so the dashboard can reflect more of your real progress.`,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Review your launch plan",
      detail: `Use the current project context to refine your offer, channels, and proof points.`,
    });
  }

  return recommendations;
}

function buildDocuments(
  startup: StartupRow,
  project: ProjectRow,
  documents: DocumentSummary[],
): DashboardDocument[] {
  if (documents.length === 0) return [];

  return documents.slice(0, 4).map((document) => ({
    id: document.id,
    title: document.file_name || "Uploaded document",
    summary:
      jsonText(document.metadata, "summary") ||
      `Tracked upload for ${startup?.name || project?.title || "your startup"}`,
    status: document.status || "ready",
  }));
}

function buildQuickActions(startup: StartupRow, project: ProjectRow): DashboardQuickAction[] {
  return [
    {
      label: "Upload knowledge documents",
      href: "/dashboard/documents",
      description: "Add briefs and research so Copilot uses your real files",
    },
    {
      label: "Open marketing workspace",
      href: "/dashboard/marketing",
      description: `Create launch content for ${project?.title || startup?.name || "your startup"}`,
    },
    {
      label: "Ask your copilot",
      href: "/dashboard#copilot",
      description: "Turn your latest progress into the next move",
    },
  ];
}

function buildMarketingOverview(
  startup: StartupRow,
  project: ProjectRow,
  tasks: DashboardTask[],
  documents: DocumentSummary[],
  insights: InsightSummary[],
  scheduledEvents: MarketingEventItem[] = [],
): MarketingOverview {
  const completedTasks = tasks.filter((task) => task.done).length;
  const totalAssets = documents.length + insights.length;
  const launchReadiness = Math.min(
    100,
    Math.round(
      35 +
        completedTasks * 8 +
        (documents.length > 0 ? 15 : 0) +
        (insights.length > 0 ? 10 : 0),
    ),
  );
  const coverage = Math.min(
    100,
    Math.round(20 + documents.length * 15 + insights.length * 10),
  );

  const kpis: MarketingMetric[] = [
    {
      title: "SAVED ASSETS",
      value: totalAssets,
      unit: " items",
      change: `${documents.length} docs · ${insights.length} insights`,
      trend: "up",
      color: "bg-green-100 text-green-700",
      source: "derived",
      footnote:
        "Count of documents and insights stored in this app — not live ad metrics",
    },
    {
      title: "LAUNCH READINESS",
      value: launchReadiness,
      unit: "%",
      change: `${completedTasks}/${tasks.length} tasks complete`,
      trend: "up",
      color: "bg-blue-100 text-blue-700",
      source: "derived",
      footnote:
        "Heuristic from milestone completion and saved assets — not market traction",
    },
    {
      title: "CONTEXT COVERAGE",
      value: coverage,
      unit: "%",
      change: `${insights.length} insights on file`,
      trend: insights.length > 0 ? "up" : "down",
      color: "bg-zinc-100 text-zinc-700",
      source: "derived",
      footnote: "How much launch context the AI can use — not campaign reach",
    },
  ];

  const strategyItems: DashboardRecommendation[] = [];
  if (insights.length > 0) {
    insights.slice(0, 3).forEach((insight) => {
      strategyItems.push({
        title: insight.title || insight.kind || "Marketing insight",
        detail:
          jsonText(insight.result, "summary") ||
          jsonText(insight.result, "next_step") ||
          insight.error_message ||
          "Keep the launch momentum moving.",
      });
    });
  }

  if (strategyItems.length === 0) {
    strategyItems.push({
      title: "Shape the story around your first customer",
      detail: `Use the latest project context for ${project?.title || startup?.name || "your startup"} to sharpen the offer and message.`,
    });
  }

  const generatedContent = [
    project?.title || startup?.name || "Your startup",
    documents[0]?.file_name || null,
    insights[0]?.title || null,
  ]
    .filter(Boolean)
    .join(" • ");

  // Calendar only shows founder-scheduled posts — never invents events from documents
  const events: MarketingEventItem[] = scheduledEvents;

  const upcoming: MarketingUpcomingItem[] = scheduledEvents
    .slice()
    .sort((a, b) => a.day - b.day)
    .slice(0, 5)
    .map((event) => ({
      id: event.id,
      title: event.label,
      type: "Scheduled",
      time: `Day ${event.day}`,
      iconName: "mail" as const,
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-700 dark:text-green-400",
      source: "tracked" as const,
    }));

  if (upcoming.length === 0 && documents.length > 0) {
    documents.slice(0, 2).forEach((document, index) => {
      upcoming.push({
        id: `upcoming-doc-${document.id}`,
        title: document.file_name || "Launch document",
        type: "On file",
        time: "Not scheduled",
        iconName: index === 0 ? "file" : "video",
        iconBg:
          index === 0
            ? "bg-blue-100 dark:bg-blue-900/30"
            : "bg-pink-100 dark:bg-pink-900/30",
        iconColor:
          index === 0
            ? "text-blue-600 dark:text-blue-400"
            : "text-pink-600 dark:text-pink-400",
        source: "derived",
      });
    });
  }

  return {
    kpis,
    strategyItems,
    generatedContent:
      generatedContent ||
      `Your latest launch content will appear here once you store documents or insights for ${startup?.name || project?.title || "your startup"}.`,
    events,
    upcoming,
  };
}

// Task generation
async function generateInitialTasks(
  userId: string,
  projectId: string,
  startup: {
    name: string;
    city: string | null;
    country_code: string | null;
    estimated_budget_cents: number | null;
    budget_currency: string | null;
  },
  project: { title: string; description: string | null },
) {
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
Description: ${project.description || "N/A"}`;

  let tasks: DashboardTask[];

  const rateLimit = await checkAiRateLimit(userId);
  if (!rateLimit.allowed) {
    tasks = [
      {
        id: "rate_limited",
        title: rateLimit.message,
        tag: "Setup",
        done: false,
      },
    ];
  } else {
    try {
      const { generateTextWithFallback } = await import("@/src/lib/ai-providers");
      const response = await generateTextWithFallback(systemPrompt, [], {
        maxTokens: 800,
        temperature: 0.6,
      });
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      const parsed: unknown = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      // Never trust model output as-is: keep only well-formed tasks.
      tasks = (Array.isArray(parsed) ? parsed : [])
        .filter((t): t is Record<string, unknown> => Boolean(t) && typeof t === "object")
        .map((t, i) => ({
          id: `task_${i + 1}`,
          title: cleanText(t.title, 200),
          tag: cleanText(t.tag, 30) || "Strategy",
          done: false,
        }))
        .filter((t) => t.title)
        .slice(0, 4);
    } catch (error: unknown) {
      // Fall through to the built-in starter tasks below.
      console.error("Failed to generate initial tasks with AI", error);
      tasks = [];
    }
  }

  if (tasks.length === 0) {
    tasks = [
      {
        id: "task_1",
        title: "Define your value proposition and target audience",
        tag: "Strategy",
        done: false,
      },
      {
        id: "task_2",
        title: "Set up your initial marketing channels",
        tag: "Marketing",
        done: false,
      },
      {
        id: "task_3",
        title: "Identify your first 10 potential customers",
        tag: "Research",
        done: false,
      },
      {
        id: "task_4",
        title: "Create a basic financial budget",
        tag: "Planning",
        done: false,
      },
    ];
  }

  // Save to metadata — re-read first so a slow AI call never overwrites
  // tasks (or anything else) written in the meantime.
  const supabase = await createSupabaseServerClient();
  const { data: fresh } = await supabase
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .maybeSingle();
  if (!fresh) return;

  const freshMetadata = readProjectMetadata(fresh.metadata);
  if (readTasks(freshMetadata).length > 0) return;

  await supabase
    .from("projects")
    .update({ metadata: { ...freshMetadata, tasks } as unknown as Json })
    .eq("id", projectId);
}

/**
 * Gets all dashboard data for the active startup/project.
 */
export async function getDashboardData() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { error: "Not authenticated" };
  }

  // 1. Fetch startup
  const startup = await getMyStartup();
  if (!startup) {
    return { hasStartup: false };
  }

  // 2. Fetch projects
  const projects = await getProjects(startup.id);
  if (projects.length === 0) {
    return { hasStartup: true, hasProject: false, startup };
  }

  const {
    readActiveProjectCookie,
    resolveActiveProject,
    writeActiveProjectCookie,
  } = await import("@/src/lib/active-project");
  const preferredId = await readActiveProjectCookie();
  const project = resolveActiveProject(projects, preferredId);

  // Keep cookie aligned when falling back to newest project
  if (preferredId !== project.id) {
    try {
      await writeActiveProjectCookie(project.id);
    } catch {
      // Cookie writes can fail in some RSC contexts; selection still works for this request
    }
  }

  // 3. Extract tasks from project metadata
  const metadata = readProjectMetadata(project.metadata);
  let tasks: DashboardTask[] = readTasks(metadata);

  // If no tasks exist, initialize defaults
  if (tasks.length === 0) {
    tasks = [
      {
        id: "placeholder_1",
        title: "Generating your first tasks...",
        tag: "Setup",
        done: false,
      },
    ];
    // Runs after the response is sent and is kept alive by the platform —
    // a bare un-awaited promise can be frozen on serverless hosts.
    after(() =>
      generateInitialTasks(user.id, project.id, startup, project).catch((err) =>
        console.error("Background task generation failed: ", err),
      ),
    );
  }

  // 4. Fetch or auto-create the active Copilot conversation/messages
  const { data: conversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("project_id", project.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  let copilotMessages: MessageRow[] = [];
  let conversationId = conversations?.[0]?.id || "";

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
      .single();

    if (newConv) {
      conversationId = newConv.id;
    }
  }

  if (conversationId) {
    const { data: messages } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    copilotMessages = messages || [];
  }

  const { data: documents = [] } = await supabase
    .from("knowledge_documents")
    .select("id, file_name, status, metadata, created_at")
    .eq("startup_id", startup.id)
    .order("created_at", { ascending: false })
    .limit(4);

  const { data: insights = [] } = await supabase
    .from("insights")
    .select("id, title, kind, status, result, error_message, created_at")
    .eq("startup_id", startup.id)
    .order("created_at", { ascending: false })
    .limit(4);

  const metadataBag =
    project.metadata &&
    typeof project.metadata === "object" &&
    !Array.isArray(project.metadata)
      ? (project.metadata as Record<string, unknown>)
      : {};

  const { readTrackedMetrics, readMarketingWorkspace, hasTrackedMetrics } =
    await import("@/src/lib/data-truth");
  const { ensureWeeklyFocusPlan } = await import(
    "@/src/app/actions/focus-plan"
  );

  const trackedMetricsRaw = readTrackedMetrics(
    metadataBag,
    startup.budget_currency || "USD",
  );
  const trackedMetrics = hasTrackedMetrics(trackedMetricsRaw)
    ? trackedMetricsRaw
    : null;
  const marketingWorkspace = readMarketingWorkspace(metadataBag);
  const weeklyFocus = await ensureWeeklyFocusPlan(project.id);

  const healthScore = calculateHealthScore(
    startup,
    project,
    tasks,
    documents || [],
    insights || [],
    trackedMetrics,
    weeklyFocus,
  );

  const overview: DashboardOverview = {
    healthScore,
    healthLabel: getHealthLabel(healthScore),
    healthFootnote: trackedMetrics
      ? "Score blends onboarding progress, milestones, and your tracked operating metrics"
      : "Score is derived from onboarding, milestones, and saved assets — log tracked metrics in Analytics to improve accuracy",
    focusIndicators: buildFocusIndicators(
      startup,
      project,
      tasks,
      trackedMetrics,
    ),
    weeklyFocus,
    recommendations: buildRecommendations(
      startup,
      project,
      tasks,
      documents || [],
      insights || [],
    ),
    documents: buildDocuments(startup, project, documents || []),
    quickActions: buildQuickActions(startup, project),
    marketing: buildMarketingOverview(
      startup,
      project,
      tasks,
      documents || [],
      insights || [],
      marketingWorkspace.events,
    ),
    trackedMetrics,
  };

  // People milestones can be assigned to. Falls back to just the current
  // user when the team roster is unavailable (migration not applied yet).
  let teamMembers: TaskAssignee[] = [];
  const { data: roster } = await supabase.rpc("get_startup_team", {
    target_startup_id: startup.id,
  });
  if (roster?.length) {
    teamMembers = roster.map((member) => ({
      userId: member.user_id,
      fullName: member.full_name?.trim() || member.email.split("@")[0] || "Team member",
      avatarUrl: member.avatar_url,
    }));
  }
  if (!teamMembers.some((member) => member.userId === user.id)) {
    const metaName = user.user_metadata?.full_name;
    teamMembers.unshift({
      userId: user.id,
      fullName: (typeof metaName === "string" && metaName.trim()) || user.email?.split("@")[0] || "You",
      avatarUrl: null,
    });
  }

  return {
    hasStartup: true,
    hasProject: true,
    startup,
    project,
    projects,
    tasks,
    teamMembers,
    currentUserId: user.id,
    conversationId,
    copilotMessages,
    overview,
  };
}

/**
 * Creates startup and associated project in a single transaction-like flow.
 */
export async function createStartupAndFirstProject(input: {
  name: string;
  countryCode: string;
  city: string;
  industry: string;
  estimatedBudgetCents: number;
  budgetCurrency: string;
  projectTitle: string;
  projectDescription: string;
  primaryColor?: string;
}) {
  try {
    const parsed = newStartupSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0]?.message ?? "Check the details and try again.",
      };
    }
    input = parsed.data;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false as const, error: "Please sign in to continue." };

    const tier = getPlanTier(user);
    const { startups: startupLimit } = getPlanLimits(tier);
    const { count: ownedCount } = await supabase
      .from("startups")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);
    if ((ownedCount ?? 0) >= startupLimit) {
      return {
        success: false as const,
        error: `The ${tier} plan includes up to ${startupLimit} businesses. Remove one or upgrade to add more.`,
      };
    }

    const { startup, error: startupError } = await createStartup({
      name: input.name,
      country_code: input.countryCode,
      city: input.city || null,
      industry: input.industry || null,
      estimated_budget_cents: Math.round(input.estimatedBudgetCents),
      budget_currency: input.budgetCurrency,
      primary_color: input.primaryColor || null,
    });

    if (startupError || !startup) {
      return {
        success: false as const,
        error: startupError ?? "Failed to create startup record.",
      };
    }

    const project = await createProject({
      startup_id: startup.id,
      title: input.projectTitle,
      description: input.projectDescription,
    });

    if (!project) {
      return {
        success: false as const,
        error: "Startup created, but the project failed to save.",
      };
    }

    const { writeActiveProjectCookie } = await import(
      "@/src/lib/active-project"
    );
    const { writeActiveStartupCookie } = await import(
      "@/src/lib/active-startup"
    );
    try {
      await writeActiveProjectCookie(project.id);
      await writeActiveStartupCookie(startup.id);
    } catch {
      // non-blocking
    }

    revalidatePath("/dashboard", "layout");
    return { success: true as const, startup, project };
  } catch (err: unknown) {
    console.error("Error in createStartupAndFirstProject:", err);
    return {
      success: false as const,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

function readTasks(metadata: Record<string, unknown>): DashboardTask[] {
  return Array.isArray(metadata.tasks) ? (metadata.tasks as DashboardTask[]) : [];
}

/**
 * Toggles a dashboard task status.
 */
export async function toggleDashboardTask(
  projectId: string,
  taskId: string,
  done: boolean,
) {
  const access = await getProjectAccess(projectId);
  if ("error" in access || typeof taskId !== "string") return false;

  const { supabase, metadata } = access;
  const updatedTasks = readTasks(metadata).map((task) =>
    task.id === taskId ? { ...task, done: Boolean(done) } : task,
  );

  const { error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, tasks: updatedTasks } as unknown as Json })
    .eq("id", access.project.id);

  if (error) {
    console.error("Failed to toggle task:", error.message);
    return false;
  }

  revalidatePath("/dashboard");
  return true;
}

const DUE_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in YYYY-MM-DD form, or null. Throws nothing. */
function cleanDueDate(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !DUE_DATE.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? value
    : undefined;
}

/** True when `userId` belongs to the startup (only teammates can be assigned work). */
async function isTeamMember(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  startupId: string,
  userId: string,
) {
  if (!isUuid(userId)) return false;
  const { data } = await supabase
    .from("startup_members")
    .select("user_id")
    .eq("startup_id", startupId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Adds a new custom dashboard task and returns it (with its real id), or null.
 */
export async function addDashboardTask(
  projectId: string,
  title: string,
  tag: string,
  options: { assigneeId?: string | null; dueDate?: string | null } = {},
): Promise<DashboardTask | null> {
  const access = await getProjectAccess(projectId);
  if ("error" in access) return null;

  const cleanTitle = cleanText(title, 200);
  if (!cleanTitle) return null;

  const { supabase, metadata, startup } = access;
  const tasks = readTasks(metadata);
  if (tasks.length >= MAX_TASKS) return null;

  const dueDate = cleanDueDate(options?.dueDate ?? null);
  if (dueDate === undefined) return null;
  const assigneeId = options?.assigneeId || null;
  if (assigneeId && !(await isTeamMember(supabase, startup.id, assigneeId))) return null;

  const newTask: DashboardTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: cleanTitle,
    tag: cleanText(tag, 30) || "Custom",
    done: false,
    assigneeId,
    dueDate,
  };

  const { error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, tasks: [...tasks, newTask] } as unknown as Json })
    .eq("id", access.project.id);

  if (error) {
    console.error("Failed to add task:", error.message);
    return null;
  }

  revalidatePath("/dashboard");
  return newTask;
}

/**
 * Assigns a milestone to a teammate and/or sets its due date.
 * Pass null to clear a field; omit a field to leave it unchanged.
 */
export async function updateDashboardTask(
  projectId: string,
  taskId: string,
  patch: { assigneeId?: string | null; dueDate?: string | null },
): Promise<{ success: true; task: DashboardTask } | { success: false; error: string }> {
  const access = await getProjectAccess(projectId);
  if ("error" in access) return { success: false, error: access.error };
  if (typeof taskId !== "string" || !patch || typeof patch !== "object") {
    return { success: false, error: "Milestone not found." };
  }

  const { supabase, metadata, startup } = access;
  const tasks = readTasks(metadata);
  const current = tasks.find((task) => task.id === taskId);
  if (!current) return { success: false, error: "Milestone not found." };

  const next: DashboardTask = { ...current };

  if ("dueDate" in patch) {
    const dueDate = cleanDueDate(patch.dueDate);
    if (dueDate === undefined) return { success: false, error: "Choose a valid due date." };
    next.dueDate = dueDate;
  }

  if ("assigneeId" in patch) {
    const assigneeId = patch.assigneeId || null;
    if (assigneeId && !(await isTeamMember(supabase, startup.id, assigneeId))) {
      return { success: false, error: "You can only assign milestones to people on this team." };
    }
    next.assigneeId = assigneeId;
  }

  const { error } = await supabase
    .from("projects")
    .update({
      metadata: {
        ...metadata,
        tasks: tasks.map((task) => (task.id === taskId ? next : task)),
      } as unknown as Json,
    })
    .eq("id", access.project.id);

  if (error) {
    console.error("Failed to update task:", error.message);
    return { success: false, error: "Could not save the milestone. Please try again." };
  }

  revalidatePath("/dashboard");
  return { success: true, task: next };
}

/**
 * Removes a milestone.
 */
export async function deleteDashboardTask(projectId: string, taskId: string) {
  const access = await getProjectAccess(projectId);
  if ("error" in access || typeof taskId !== "string") return false;

  const { supabase, metadata } = access;
  const tasks = readTasks(metadata);
  const remaining = tasks.filter((task) => task.id !== taskId);
  if (remaining.length === tasks.length) return false;

  const { error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, tasks: remaining } as unknown as Json })
    .eq("id", access.project.id);

  if (error) {
    console.error("Failed to delete task:", error.message);
    return false;
  }

  revalidatePath("/dashboard");
  return true;
}

export type CopilotReply =
  | { success: true; reply: string }
  | { success: false; error: string };

/**
 * Sends a chat message to the copilot and stores both user prompt and assistant response.
 */
export async function sendStatefulCopilotMessage(
  projectId: string,
  conversationId: string,
  messageText: string,
): Promise<CopilotReply> {
  const text = cleanText(messageText, MAX_CHAT_MESSAGE_LENGTH + 1);
  if (!text) return { success: false, error: "Type a message first." };
  if (text.length > MAX_CHAT_MESSAGE_LENGTH) {
    return {
      success: false,
      error: `Messages can be up to ${MAX_CHAT_MESSAGE_LENGTH} characters.`,
    };
  }
  if (!isUuid(conversationId)) {
    return { success: false, error: "This conversation is not available." };
  }

  const access = await getProjectAccess(projectId);
  if ("error" in access) return { success: false, error: access.error };
  const { supabase, user, startup, project } = access;

  // The conversation must belong to this very project (RLS already limits it
  // to the user's startups) — otherwise replies could be written elsewhere.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("project_id", project.id)
    .maybeSingle();
  if (!conversation) {
    return { success: false, error: "This conversation is not available." };
  }

  const rateLimit = await checkAiRateLimit(user.id);
  if (!rateLimit.allowed) return { success: false, error: rateLimit.message };

  // 1. Insert user message
  const { error: userMsgErr } = await supabase.from("messages").insert({
    conversation_id: conversation.id,
    author_id: user.id,
    role: "user",
    content: text,
  });

  if (userMsgErr) {
    console.error("Error inserting user message:", userMsgErr.message);
    return { success: false, error: "Failed to save your message. Please try again." };
  }

  // 2. Recent conversation history (bounded so prompts stay small and cheap)
  const { data: recent } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(COPILOT_HISTORY_LIMIT);
  const messages = (recent || []).slice().reverse();

  const documentContext = await getDocumentContextForStartup(startup.id);

  const metadata =
    project.metadata &&
    typeof project.metadata === "object" &&
    !Array.isArray(project.metadata)
      ? (project.metadata as Record<string, unknown>)
      : {};

  const { readWeeklyFocusPlan, formatWeekLabel } = await import(
    "@/src/lib/focus-plan"
  );
  const weeklyFocus = readWeeklyFocusPlan(metadata);
  const focusBlock = weeklyFocus
    ? `This week's focus (${formatWeekLabel(weeklyFocus.weekStart)}):\n${weeklyFocus.priorities
        .map((p, i) => `${i + 1}. [${p.done ? "done" : "open"}] ${p.title}`)
        .join(
          "\n",
        )}${weeklyFocus.checkIn?.note ? `\nCheck-in note: ${weeklyFocus.checkIn.note}` : ""}`
    : "No weekly focus plan set yet.";

  const systemContext = `You are Startup Copilot, an expert AI advisor for early-stage African startup founders.

RESPONSE FORMAT (always use Markdown):
1) Start with a one-sentence **Answer** (direct).
2) Then a ### Key points section with a numbered or bulleted list (3–6 short points). Each point should be scannable — bold the lead phrase.
3) Then a ### Next step section with exactly ONE concrete action the founder should do in the next 48 hours (specific, local-context when possible: Mobile Money, city, currency).
4) Optionally end with a ### Watch out line (one risk to avoid).

Rules:
- Prefer short paragraphs and lists over long walls of text.
- Prefer facts from founder-uploaded documents when they conflict with assumptions.
- Tie advice to their weekly focus when relevant.
- Do not invent live analytics numbers.
- Keep the whole reply under ~250 words unless the user asks for depth.

Current startup context:
- Name: ${startup?.name}
- Industry: ${startup?.industry || "N/A"}
- Stage: ${startup?.stage || "N/A"}
- Description: ${project?.description || startup?.description || "N/A"}
- Location: ${startup?.city || "N/A"}, ${startup?.country_code}
- Budget: ${(startup?.estimated_budget_cents || 0) / 100} ${startup?.budget_currency || "USD"}

${focusBlock}

Founder-uploaded documents (tracked knowledge):
${documentContext}`;

  const formattedMessages = (messages || []).map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  // 4. Request response from the available AI provider
  let reply: string;
  try {
    const { generateTextWithFallback } = await import("@/src/lib/ai-providers");
    reply = (
      await generateTextWithFallback(systemContext, formattedMessages, {
        maxTokens: 900,
        temperature: 0.55,
      })
    ).trim();
  } catch (err) {
    console.error("Copilot provider error:", err instanceof Error ? err.message : err);
    return {
      success: false,
      error: "Copilot could not answer right now. Please try again in a moment.",
    };
  }
  if (!reply) {
    return { success: false, error: "Copilot returned an empty answer. Please try again." };
  }

  // 5. Insert assistant response (must use service-role client — RLS only allows
  //    user-role inserts for regular users; assistant messages are server-only).
  //    The conversation id was verified above against this project.
  const { error: assistantErr } = await getSupabaseAdmin().from("messages").insert({
    conversation_id: conversation.id,
    role: "assistant",
    content: reply,
  });
  if (assistantErr) {
    console.error("Error inserting assistant message:", assistantErr.message);
  }

  revalidatePath("/dashboard");
  return { success: true, reply };
}
