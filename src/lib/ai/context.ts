/**
 * Builds the business context given to AI features.
 *
 * Everything is read through the caller's own session for ONE workspace, so
 * row-level security guarantees no other business's data can leak into a
 * prompt. Each block is size-capped and fenced as data.
 */
import { fence } from "@/src/lib/ai/guard"
import { getAfricanCountryName } from "@/src/lib/african-countries"
import { describeCountryForPrompt } from "@/src/lib/country-profiles"
import { getIndustryLabel } from "@/src/lib/industries"
import type { Workspace } from "@/src/lib/workspace"

export type ContextPart =
  | "model"
  | "plan"
  | "finance"
  | "validation"
  | "research"
  | "execution"
  | "memory"
  | "documents"

type Ws = Pick<Workspace, "supabase" | "startup" | "locale">

function clip(value: unknown, max: number): string {
  const text = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value)
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

/** Facts about the business itself — always included. */
export function describeStartup(ws: Ws): string {
  const { startup } = ws
  const objectives = Array.isArray(startup.objectives)
    ? startup.objectives.filter((o): o is string => typeof o === "string").slice(0, 6)
    : []
  const profile = asRecord(startup.business_profile)
  const budget =
    startup.estimated_budget_cents && startup.estimated_budget_cents > 0
      ? `${Math.round(startup.estimated_budget_cents / 100).toLocaleString("en-US")} ${startup.budget_currency}`
      : "not stated"

  return [
    `Business name: ${startup.name}`,
    `Location: ${startup.city ? `${startup.city}, ` : ""}${getAfricanCountryName(startup.country_code)}`,
    `Industry: ${startup.industry ? getIndustryLabel(startup.industry) : "not stated"}`,
    `Stage: ${startup.stage}`,
    `Starting budget: ${budget}`,
    startup.description ? `Description: ${clip(startup.description, 900)}` : null,
    objectives.length ? `Objectives: ${objectives.map((o) => clip(o, 160)).join(" | ")}` : null,
    typeof profile.legalStatus === "string" ? `Legal status: ${clip(profile.legalStatus, 80)}` : null,
    typeof profile.teamSize === "string" ? `Team size: ${clip(profile.teamSize, 40)}` : null,
  ]
    .filter(Boolean)
    .join("\n")
}

async function modelBlock(ws: Ws): Promise<string | null> {
  const { data } = await ws.supabase
    .from("artifacts")
    .select("kind, content")
    .eq("startup_id", ws.startup.id)
    .eq("module", "model")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const blocks = asRecord(asRecord(data.content).blocks)
  const lines = Object.entries(blocks)
    .map(([key, value]) => {
      const items = Array.isArray(value) ? value.filter((v) => typeof v === "string") : []
      return items.length ? `${key}: ${items.map((i) => clip(i, 140)).join("; ")}` : null
    })
    .filter(Boolean)
  return lines.length ? `Business model (${data.kind}):\n${lines.join("\n")}` : null
}

async function planBlock(ws: Ws): Promise<string | null> {
  const { data } = await ws.supabase
    .from("artifacts")
    .select("content")
    .eq("startup_id", ws.startup.id)
    .eq("module", "plan")
    .eq("kind", "business_plan")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const sections = asRecord(asRecord(data.content).sections)
  const lines = Object.entries(sections)
    .map(([key, value]) => {
      const body = asRecord(value).markdown
      return typeof body === "string" && body.trim() ? `[${key}] ${clip(body, key === "executive_summary" ? 900 : 260)}` : null
    })
    .filter(Boolean)
  return lines.length ? `Business plan (excerpts):\n${lines.join("\n")}` : null
}

async function financeBlock(ws: Ws): Promise<string | null> {
  const { data } = await ws.supabase
    .from("artifacts")
    .select("content, meta")
    .eq("startup_id", ws.startup.id)
    .eq("module", "finance")
    .eq("kind", "financial_model")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const summary = asRecord(asRecord(data.meta).summary)
  if (!Object.keys(summary).length) return null
  return `Financial model summary (founder's own projections, not actual results):\n${clip(summary, 1200)}`
}

async function validationBlock(ws: Ws): Promise<string | null> {
  const [{ data: assumptions }, { data: evidence }] = await Promise.all([
    ws.supabase
      .from("validation_assumptions")
      .select("statement, category, status")
      .eq("startup_id", ws.startup.id)
      .order("importance", { ascending: false })
      .limit(12),
    ws.supabase
      .from("validation_evidence")
      .select("kind, title, notes, stance, occurred_on")
      .eq("startup_id", ws.startup.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ])
  if (!assumptions?.length && !evidence?.length) return null
  const parts: string[] = []
  if (assumptions?.length) {
    parts.push(
      "Assumptions being tested:\n" +
        assumptions.map((a) => `- [${a.status}] (${a.category}) ${clip(a.statement, 200)}`).join("\n"),
    )
  }
  if (evidence?.length) {
    parts.push(
      "Evidence the founder has recorded (this IS verified first-hand information):\n" +
        evidence
          .map((e) => `- ${e.kind} "${clip(e.title, 100)}" [${e.stance}]${e.occurred_on ? ` on ${e.occurred_on}` : ""}: ${clip(e.notes, 320)}`)
          .join("\n"),
    )
  }
  return parts.join("\n\n")
}

async function researchBlock(ws: Ws): Promise<string | null> {
  const { data } = await ws.supabase
    .from("artifacts")
    .select("title, content, meta")
    .eq("startup_id", ws.startup.id)
    .eq("module", "research")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(3)
  if (!data?.length) return null
  return (
    "Saved market research (AI-assisted; treat as unverified unless it lists sources):\n" +
    data
      .map((r) => `- ${clip(r.title, 100)}${asRecord(r.meta).grounded === true ? " (with web sources)" : ""}: ${clip(asRecord(r.content).summary, 400)}`)
      .join("\n")
  )
}

async function executionBlock(ws: Ws): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10)
  const [{ data: tasks }, { data: milestones }] = await Promise.all([
    ws.supabase
      .from("tasks")
      .select("title, status, priority, due_date, blocked_reason")
      .eq("startup_id", ws.startup.id)
      .neq("status", "done")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(20),
    ws.supabase
      .from("milestones")
      .select("title, status, due_date")
      .eq("startup_id", ws.startup.id)
      .in("status", ["planned", "in_progress"])
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(8),
  ])
  if (!tasks?.length && !milestones?.length) return null
  const parts: string[] = [`Today is ${today}.`]
  if (milestones?.length) {
    parts.push(
      "Open milestones:\n" +
        milestones.map((m) => `- ${clip(m.title, 120)} [${m.status}]${m.due_date ? ` due ${m.due_date}${m.due_date < today ? " (OVERDUE)" : ""}` : ""}`).join("\n"),
    )
  }
  if (tasks?.length) {
    parts.push(
      "Open tasks:\n" +
        tasks
          .map(
            (t) =>
              `- ${clip(t.title, 120)} [${t.status}, ${t.priority}]${t.due_date ? ` due ${t.due_date}${t.due_date < today ? " (OVERDUE)" : ""}` : ""}${t.blocked_reason ? ` — blocked: ${clip(t.blocked_reason, 120)}` : ""}`,
          )
          .join("\n"),
    )
  }
  return parts.join("\n")
}

async function memoryBlock(ws: Ws): Promise<string | null> {
  const { data } = await ws.supabase
    .from("business_memory")
    .select("kind, content, rationale, created_at")
    .eq("startup_id", ws.startup.id)
    .is("archived_at", null)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(25)
  if (!data?.length) return null
  return (
    "Things to remember about this business (saved by the team):\n" +
    data
      .map((m) => `- [${m.kind}, ${m.created_at.slice(0, 10)}] ${clip(m.content, 300)}${m.rationale ? ` (why: ${clip(m.rationale, 200)})` : ""}`)
      .join("\n")
  )
}

async function documentsBlock(ws: Ws): Promise<string | null> {
  const { data } = await ws.supabase
    .from("knowledge_documents")
    .select("file_name, extracted_text")
    .eq("startup_id", ws.startup.id)
    .order("created_at", { ascending: false })
    .limit(5)
  if (!data?.length) return null
  return (
    "Uploaded documents (excerpts):\n" +
    data
      .map((d) => `- ${clip(d.file_name, 80)}: ${d.extracted_text ? clip(d.extracted_text, 1200) : "(no readable text)"}`)
      .join("\n")
  )
}

const BUILDERS: Record<ContextPart, (ws: Ws) => Promise<string | null>> = {
  model: modelBlock,
  plan: planBlock,
  finance: financeBlock,
  validation: validationBlock,
  research: researchBlock,
  execution: executionBlock,
  memory: memoryBlock,
  documents: documentsBlock,
}

/**
 * Context for a prompt: the country profile (trusted, written by Anza) plus
 * the business's own data (fenced as untrusted reference data).
 */
export async function buildBusinessContext(ws: Ws, parts: ContextPart[] = []): Promise<string> {
  const blocks = await Promise.all(
    parts.map(async (part) => {
      try {
        return await BUILDERS[part](ws)
      } catch (error) {
        console.warn(`[ai-context] ${part} unavailable:`, error instanceof Error ? error.message : error)
        return null
      }
    }),
  )

  const businessData = [describeStartup(ws), ...blocks.filter(Boolean)].join("\n\n")

  return [
    "Country context (maintained by Anza):",
    describeCountryForPrompt(ws.startup.country_code, ws.locale),
    "",
    "Business data (entered by the founder and their team):",
    fence("business_data", businessData, 14_000),
  ].join("\n")
}
