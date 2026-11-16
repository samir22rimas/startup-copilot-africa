/**
 * Business plan structure: 17 sections, each stored as markdown inside one
 * artifact (module "plan", kind "business_plan"):
 *   { sections: { [key]: { markdown, source, updatedAt } } }
 */
import type { ContextPart } from "@/src/lib/ai/context"

export const PLAN_SECTIONS = [
  "executive_summary",
  "company_overview",
  "problem_statement",
  "proposed_solution",
  "market_analysis",
  "customer_segmentation",
  "competitor_analysis",
  "value_proposition",
  "business_model",
  "marketing_strategy",
  "sales_strategy",
  "operational_plan",
  "management_organization",
  "financial_projections",
  "risk_assessment",
  "implementation_roadmap",
  "growth_strategy",
] as const

export type PlanSectionKey = (typeof PLAN_SECTIONS)[number]

/** The summary is written last so it can draw on every other section. */
export const PLAN_GENERATION_ORDER: PlanSectionKey[] = [
  ...PLAN_SECTIONS.filter((key) => key !== "executive_summary"),
  "executive_summary",
]

export interface PlanSection {
  markdown: string
  /** "ai" until a person edits the text. */
  source: "ai" | "edited"
  updatedAt: string
}

export type PlanSections = Partial<Record<PlanSectionKey, PlanSection>>

export const MAX_SECTION_LENGTH = 12_000

export function isPlanSectionKey(value: unknown): value is PlanSectionKey {
  return typeof value === "string" && (PLAN_SECTIONS as readonly string[]).includes(value)
}

export function readPlanSections(content: unknown): PlanSections {
  const raw =
    content && typeof content === "object" && !Array.isArray(content)
      ? (content as { sections?: unknown }).sections
      : null
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const out: PlanSections = {}
  for (const key of PLAN_SECTIONS) {
    const value = (raw as Record<string, unknown>)[key]
    if (!value || typeof value !== "object") continue
    const section = value as Partial<PlanSection>
    if (typeof section.markdown !== "string" || !section.markdown.trim()) continue
    out[key] = {
      markdown: section.markdown.slice(0, MAX_SECTION_LENGTH),
      source: section.source === "edited" ? "edited" : "ai",
      updatedAt: typeof section.updatedAt === "string" ? section.updatedAt : "",
    }
  }
  return out
}

export function planCompletion(sections: PlanSections): { written: number; total: number } {
  return { written: PLAN_SECTIONS.filter((key) => sections[key]).length, total: PLAN_SECTIONS.length }
}

interface SectionGuide {
  /** English title, used in prompts. The UI uses the dictionary. */
  title: string
  brief: string
  context: ContextPart[]
}

export const PLAN_SECTION_GUIDE: Record<PlanSectionKey, SectionGuide> = {
  executive_summary: {
    title: "Executive Summary",
    brief:
      "Summarise the whole plan in under 350 words: the business, the problem and customer, the solution, the model, traction or validation so far, the financial headline and what is needed next. It must agree with the other sections provided.",
    context: ["model", "plan", "finance", "validation"],
  },
  company_overview: {
    title: "Company Overview",
    brief: "Describe the business: what it does, where it operates, its stage, legal status if known, mission and objectives.",
    context: ["model"],
  },
  problem_statement: {
    title: "Problem Statement",
    brief: "State the problem: who has it, how often, what it costs them, and how they cope today. Use recorded evidence where it exists.",
    context: ["model", "validation"],
  },
  proposed_solution: {
    title: "Proposed Solution",
    brief: "Describe the product or service, how it works for the customer, and why it solves the problem better than current options.",
    context: ["model", "validation"],
  },
  market_analysis: {
    title: "Market Analysis",
    brief:
      "Describe the market: segments, demand drivers and trends in this country. Use figures only from saved research with sources or the founder's evidence; otherwise explain how the market should be sized and mark numbers as estimates.",
    context: ["model", "research", "validation"],
  },
  customer_segmentation: {
    title: "Customer Segmentation",
    brief: "Define the customer segments, the first segment to serve, their needs, buying behaviour and how they pay. Include a table of segments.",
    context: ["model", "validation", "research"],
  },
  competitor_analysis: {
    title: "Competitor Analysis",
    brief:
      "Analyse direct competitors, substitutes and informal alternatives, with a comparison table. Name companies only if they appear in the business data or you are confident they exist; otherwise describe types of competitor.",
    context: ["model", "research", "validation"],
  },
  value_proposition: {
    title: "Value Proposition",
    brief: "State the value proposition clearly, the key benefits per customer segment, and the proof still needed.",
    context: ["model", "validation"],
  },
  business_model: {
    title: "Business Model",
    brief: "Explain how the business makes money: revenue streams, pricing logic, main costs, key resources, activities and partners. Stay consistent with the business model canvas.",
    context: ["model", "finance"],
  },
  marketing_strategy: {
    title: "Marketing Strategy",
    brief: "Set out positioning, core message, priority channels suited to this market and budget, and a 90-day marketing plan.",
    context: ["model", "validation"],
  },
  sales_strategy: {
    title: "Sales Strategy",
    brief: "Describe how sales happen: the sales process, channels, pricing and payment methods (including mobile money where relevant), targets to test, and how repeat purchases are encouraged.",
    context: ["model", "finance"],
  },
  operational_plan: {
    title: "Operational Plan",
    brief: "Describe day-to-day operations: location, suppliers, equipment, delivery or logistics, technology, quality control and the practical constraints of this country.",
    context: ["model", "execution"],
  },
  management_organization: {
    title: "Management and Organization",
    brief:
      "Describe the team and structure: roles needed, who covers them today, gaps to fill and advisers. Do not invent people, names or biographies — write from the roles and leave placeholders in [square brackets] for details the founder must add.",
    context: ["model"],
  },
  financial_projections: {
    title: "Financial Projections",
    brief:
      "Present the financial picture using ONLY the figures in the financial model summary provided: start-up costs, revenue and expense projections, break-even and funding need, with a summary table. State clearly that these are projections. If no financial model is provided, do not produce numbers: explain what must be completed in Financial Planning and which assumptions the founder needs.",
    context: ["finance", "model"],
  },
  risk_assessment: {
    title: "Risk Assessment",
    brief: "Identify the main market, operational, financial, regulatory and team risks. Present a table with likelihood, impact and mitigation for each.",
    context: ["model", "validation", "finance"],
  },
  implementation_roadmap: {
    title: "Implementation Roadmap",
    brief: "Lay out the next 12 months in phases with milestones, deliverables and decision points, as a table. Reflect the milestones and tasks already in the workspace.",
    context: ["model", "execution"],
  },
  growth_strategy: {
    title: "Growth Strategy",
    brief: "Explain how the business grows after launch: new segments, cities or countries, products, partnerships and the conditions that must be met before expanding.",
    context: ["model", "finance"],
  },
}
