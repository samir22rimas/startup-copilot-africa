"use server"

import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { generateTextWithFallback } from "@/src/lib/ai-providers"
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
  const prompt = `You are a senior startup strategist creating concise, explicit, decision-ready business documents. Create six high-information documents for this business. Use only the supplied facts. Never invent market statistics, revenue, customers, competitors, partnerships, or regulatory facts; clearly label sensible estimates as "Assumption" and unknowns as "Validation required".

Business facts:
- Startup: ${context.name}
- Business idea: ${context.title}
- Description: ${context.description || "Not yet specified"}
- Target audience: ${context.audience || "Not yet specified"}
- Location: ${context.city}, ${context.country}
- Industry: ${context.industry}
- Available starting budget: ${context.budget} ${context.currency}

Return exactly six sections in this exact format, with no introduction or text outside the sections:
=== Business Plan ===
...markdown...
=== SWOT ===
...markdown...
=== Budget ===
...markdown...
=== Marketing Strategy ===
...markdown...
=== Roadmap ===
...markdown...
=== Elevator Pitch ===
...markdown...

Each section must be 300–500 words, concise but complete and specific to this business. Use clear ## headings, short paragraphs, and bullets. The Business Plan must cover summary, customer problem, solution, market, business model, operations, risks, 12-month milestones, and measurable next actions. The Budget must show amounts and percentages based on the stated budget, including a 12-month cash-control approach. The Roadmap must have sequenced owners, outputs, success metrics, and decision gates. The Elevator Pitch must include 30-second, 60-second, and stakeholder ask versions.`

  try {
    const response = await generateTextWithFallback(prompt, [{ role: "user", content: "Create the six business documents now." }], { maxTokens: 5000, temperature: 0.45 })
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

function createDocuments(context: ProjectContext): ResultDocument[] {
  const market = `${context.city}, ${context.country}`
  const offer = context.description || `${context.title} solves a clear problem for its first customers.`
  const audience = context.audience || "early customers who experience this problem regularly"
  const budget = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(context.budget)

  return [
    { type: "Business Plan", content: `## Executive summary\n${context.name} is building ${context.title} for ${audience} in ${market}. ${offer}\n\nThis is a practical first-year plan to validate the business, deliver a focused offer, establish repeatable sales, and build sustainable unit economics. Every assumption must be tested with customers before significant capital is committed.\n\n## Customer problem\nTarget customers currently use fragmented, informal, or unreliable alternatives. The research goal is to identify the trigger event, current workaround, buyer, budget, and consequence of doing nothing. Conduct at least 15 structured interviews and record the language customers use, their current spend, and their willingness to try a new solution.\n\n## Solution and value proposition\nThe first offer should solve one high-value job exceptionally well. ${context.name} helps ${audience} move to a simpler and more dependable outcome through ${context.title}. Begin with a minimum viable service that may be delivered manually; this proves demand and delivery quality before investment in complex technology.\n\n## Market and competition\nThe beachhead market is ${market}. Map direct competitors, informal substitutes, and the option of doing nothing. Differentiate through local relevance, trust, speed, ease of use, pricing clarity, or service quality. Estimate the opportunity from reachable customers multiplied by realistic annual spend, then replace estimates with real evidence from sales.\n\n## Revenue model\nUse a simple local-currency price with a low-risk entry option. Test one model first: subscription, transaction fee, service package, or recurring contract. Track leads, trials, paid conversions, repeat purchases, average revenue, delivery cost, gross margin, and churn. Do not scale paid acquisition until an early cohort shows retention and a credible payback path.\n\n## Operations and team\nDocument the customer journey from discovery and sign-up through delivery, support, payment, and renewal. Assign an owner and service standard to each step. The founding team should initially prioritise customer discovery, delivery quality, and direct sales; add people only when a measured recurring bottleneck justifies the role.\n\n## Risks and controls\nThe main risks are weak willingness to pay, slow acquisition, delivery costs exceeding margin, regulation, supplier dependency, and economic volatility. Keep a contingency reserve, review risks monthly, and release the next spending tranche only when the previous validation target is met.\n\n## First-year milestones\nMonths 1–2: validate the problem, position the offer, and secure early commitments. Months 3–4: run a paid pilot and improve delivery. Months 5–8: document a repeatable acquisition and onboarding process. Months 9–12: expand only after retention, margin, and operating quality reach target.` },
    { type: "SWOT", content: `## Strengths\n- Local focus in ${market}\n- A defined business idea: ${context.title}\n\n## Weaknesses\n- Customer demand and willingness to pay still need evidence\n- Early operating processes are not yet proven\n\n## Opportunities\n- Serve ${audience} with a simpler, more relevant offer\n- Partner with trusted local distribution or payment channels\n\n## Threats\n- Informal alternatives and established competitors\n- Cost volatility, regulation, and inconsistent infrastructure` },
    { type: "Budget", content: `## Starting budget: ${budget} ${context.currency}\n\n- Customer research and validation — 15%\n- Prototype or minimum viable service — 35%\n- Sales and launch marketing — 20%\n- Operations, tools, and delivery — 20%\n- Contingency reserve — 10%\n\nReview actual spend weekly. Do not release the prototype budget until the customer research confirms the problem and price range.` },
    { type: "Marketing Strategy", content: `## Positioning\nFor ${audience} in ${market}, ${context.name} makes it easier to access the value promised by ${context.title}.\n\n## First channels\n1. Direct outreach to 30 potential customers\n2. Community groups, referrals, and relevant local partners\n3. Short educational content that demonstrates the problem and outcome\n\n## First 30-day target\nSecure 10 customer conversations, 5 trials, and 3 paying or committed early customers.` },
    { type: "Roadmap", content: `## Weeks 1–2: Validate\nInterview target customers, document their current workaround, and test your key assumption.\n\n## Weeks 3–6: Pilot\nLaunch the smallest possible version of ${context.title}, collect feedback, and refine pricing.\n\n## Weeks 7–12: Repeat\nBuild a repeatable customer-acquisition process, track unit economics, and decide what to automate next.` },
    { type: "Elevator Pitch", content: `${context.name} is building ${context.title} for ${audience} in ${market}. We help customers move from a frustrating, costly problem to a simpler and more dependable outcome. We are starting with direct customer validation, a focused pilot, and a model designed for local realities.` },
  ]
}

export async function generateResultsWorkspace(projectId: string): Promise<{ success: true; workspace: ResultsWorkspace } | { success: false; error: string }> {
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

  const workspace: ResultsWorkspace = {
    generatedAt: new Date().toISOString(),
    documents: await createAiDocuments({
      name: startup.name,
      city: startup.city || "your city",
      country: startup.country_code,
      industry: startup.industry || "your industry",
      budget: (startup.estimated_budget_cents || 0) / 100,
      currency: startup.budget_currency || "USD",
      title: project.title,
      description: project.description || "",
      audience: project.target_audience || "",
    }) || createDocuments({
      name: startup.name,
      city: startup.city || "your city",
      country: startup.country_code,
      industry: startup.industry || "your industry",
      budget: (startup.estimated_budget_cents || 0) / 100,
      currency: startup.budget_currency || "USD",
      title: project.title,
      description: project.description || "",
      audience: project.target_audience || "",
    }),
  }

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
