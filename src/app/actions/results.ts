"use server"

import { getProjectAccess } from "@/src/lib/workspace-access"
import { generateTextWithFallback } from "@/src/lib/ai-providers"
import { checkAiRateLimit } from "@/src/lib/rate-limiter"
import { revalidatePath } from "next/cache"

export type ResultDocumentType = "Business Plan" | "SWOT" | "Budget" | "Marketing Strategy" | "Roadmap" | "Elevator Pitch"

export type ResultDocument = {
  type: ResultDocumentType
  content: string
}

export type ResultsWorkspace = {
  generatedAt: string
  documents: ResultDocument[]
}

type ProjectContext = {
  name: string
  city: string
  country: string
  industry: string
  budget: number
  currency: string
  title: string
  description: string
  audience: string
}

const documentTypes: ResultDocumentType[] = ["Business Plan", "SWOT", "Budget", "Marketing Strategy", "Roadmap", "Elevator Pitch"]

async function createAiDocuments(context: ProjectContext): Promise<ResultDocument[] | null> {
  const budgetNum = context.budget
  const budget = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(budgetNum)
  const market = `${context.city}, ${context.country}`
  const audience = context.audience || "target customers"
  const offer = context.description || context.title

  const prompt = `You are a world-class startup strategist and business writer producing investor-grade documents for an African startup founder. Your output must be professional, structured, specific, and immediately actionable. Do not produce generic advice — make every section specific to the business facts provided. Never invent statistics, revenue numbers, market sizes, competitor names, or regulatory facts. Label assumptions clearly as "(Assumption)" and unknowns as "(Validation required)".

Business facts:
- Startup name: ${context.name}
- Business idea / product: ${context.title}
- Description: ${offer}
- Target audience: ${audience}
- Location: ${market}
- Industry sector: ${context.industry}
- Starting budget: ${budget} ${context.currency}

Produce exactly six high-quality, professional business documents. Each document must:
- Use consistent markdown formatting (## headings, bold key terms, tables where appropriate, bullet lists)
- Be between 400–600 words of substantive content
- Be specific to this business — no generic filler
- Use professional business language suitable for investors, advisors, and lenders

Return exactly this format with no text outside the sections:
=== Business Plan ===
...
=== SWOT ===
...
=== Budget ===
...
=== Marketing Strategy ===
...
=== Roadmap ===
...
=== Elevator Pitch ===
...

Document requirements:
BUSINESS PLAN: Include executive summary, customer problem with trigger events, solution & value proposition, competitive landscape, revenue model with metrics table, operations & team, risk register table, and 12-month milestone timeline table.
SWOT: Four sections (Strengths, Weaknesses, Opportunities, Threats) each with 4–5 specific, evidence-grounded bullet points relevant to this business and ${context.country}.
BUDGET: Full allocation table with amounts in ${context.currency} and percentages, stage-gated release schedule with unlock conditions, and 4 cash control principles.
MARKETING STRATEGY: Positioning statement, target customer profile table, three phased approach (Direct Outreach → Content & Community → Partnerships), and key metrics table.
ROADMAP: Four phases with task tables showing Owner, Output, and Success Metric columns, plus a clear Decision Gate after each phase.
ELEVATOR PITCH: Three versions — 30-second (casual), 60-second (investor), and a formal stakeholder ask version with placeholders marked "(validate)" for unconfirmed facts.`

  try {
    const response = await generateTextWithFallback(prompt, [{ role: "user", content: "Generate all six professional business documents now. Be specific, thorough, and professional." }], { maxTokens: 7000, temperature: 0.35 })
    const documents = documentTypes.map((type) => {
      const marker = `=== ${type} ===`
      const start = response.indexOf(marker)
      if (start < 0) return null
      const contentStart = start + marker.length
      const next = response.indexOf("=== ", contentStart)
      const content = response.slice(contentStart, next < 0 ? undefined : next).trim()
      return content.length >= 250 ? { type, content } : null
    })
    return documents.every((document): document is ResultDocument => document !== null) ? documents : null
  } catch (error) {
    console.warn("Could not generate AI business documents; using the structured fallback.", error)
    return null
  }
}

export async function generateResultsWorkspace(projectId: string): Promise<{ success: true; workspace: ResultsWorkspace } | { success: false; error: string }> {
  const access = await getProjectAccess(projectId, "edit")
  if ("error" in access) return { success: false, error: access.error }
  const { supabase, user, startup, project } = access

  const rateLimit = await checkAiRateLimit(user.id)
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.message }
  }

  const generatedDocuments = await createAiDocuments({
      name: startup.name,
      city: startup.city || "your city",
      country: startup.country_code,
      industry: startup.industry || "your industry",
      budget: (startup.estimated_budget_cents || 0) / 100,
      currency: startup.budget_currency || "USD",
      title: project.title,
      description: project.description || "",
      audience: project.target_audience || "",
    })
  if (!generatedDocuments) return { success: false, error: "The AI could not generate complete documents. Check your provider configuration and try again." }
  const workspace: ResultsWorkspace = { generatedAt: new Date().toISOString(), documents: generatedDocuments }

  const metadata = project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata)
    ? project.metadata
    : {}
  const { error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, results_workspace: workspace } })
    .eq("id", project.id)
  if (error) return { success: false, error: "Could not save the generated workspace. Please try again." }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/results")
  return { success: true, workspace }
}
