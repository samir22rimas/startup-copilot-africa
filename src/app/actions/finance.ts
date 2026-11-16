"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { buildBusinessContext } from "@/src/lib/ai/context"
import { baseSystemPrompt, fence } from "@/src/lib/ai/guard"
import { runAiStructured } from "@/src/lib/ai/service"
import { fetchExchangeRates, isSupportedCurrency, type ExchangeRates } from "@/src/lib/finance/currency"
import {
  financialModelSchema,
  modelHasData,
  parseFinancialModel,
  projectMonths,
  summarizeModel,
  yearlyTotals,
  type FinancialModel,
} from "@/src/lib/finance/model"
import { fail, requireWorkspace, type ActionResult, type Workspace } from "@/src/lib/workspace"
import { logActivity } from "@/src/lib/workspace/activity"
import { getLatestArtifact, saveArtifact } from "@/src/lib/workspace/artifacts"

const PATH = "/dashboard/finance"

export interface FinanceState {
  id: string | null
  model: FinancialModel
  updatedAt: string | null
}

const reviewSchema = z.object({
  verdict: z.string().trim().min(1).max(700),
  observations: z.array(z.string().trim().min(1).max(500)).max(8).default([]),
  risks: z.array(z.string().trim().min(1).max(500)).max(6).default([]),
  questionableAssumptions: z.array(z.string().trim().min(1).max(500)).max(6).default([]),
  nextActions: z.array(z.string().trim().min(1).max(400)).max(6).default([]),
})

export type FinanceReview = z.infer<typeof reviewSchema>

async function loadModel(ws: Workspace): Promise<FinanceState> {
  const artifact = await getLatestArtifact(ws, "finance", "financial_model")
  const fallback = isSupportedCurrency(ws.startup.budget_currency) ? ws.startup.budget_currency : "USD"
  const model = artifact ? parseFinancialModel(artifact.content, fallback) : parseFinancialModel({ currency: fallback }, fallback)
  if (!artifact && ws.startup.estimated_budget_cents) {
    model.startingCash = Math.round(ws.startup.estimated_budget_cents / 100)
  }
  return { id: artifact?.id ?? null, model, updatedAt: artifact?.updated_at ?? null }
}

export async function getFinancialModel(): Promise<FinanceState | null> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return null
  return loadModel(ws)
}

/** Autosave target. The summary is recomputed on the server so stored figures always match the inputs. */
export async function saveFinancialModel(input: unknown): Promise<ActionResult<{ id: string; updatedAt: string }>> {
  const parsed = financialModelSchema.safeParse(input)
  if (!parsed.success) return fail("Some figures are not valid. Check the amounts and try again.")
  if (!isSupportedCurrency(parsed.data.currency)) return fail("Choose a supported currency.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const model = parsed.data
  const existing = await getLatestArtifact(ws, "finance", "financial_model")
  const summary = modelHasData(model) ? summarizeModel(model) : null

  const saved = await saveArtifact(ws, {
    id: existing?.id,
    module: "finance",
    kind: "financial_model",
    title: "Financial model",
    content: model,
    meta: { summary, kind: "projection" },
  })
  if ("error" in saved) return fail(saved.error)

  if (!existing) {
    await logActivity(ws, { action: "finance.started", entityType: "artifact", entityId: saved.artifact.id, summary: "Started the financial model" })
  }
  revalidatePath(PATH)
  return { success: true, id: saved.artifact.id, updatedAt: saved.artifact.updated_at }
}

/** An AI read of the model: what the numbers say, and which assumptions deserve a second look. */
export async function reviewFinancialModel(): Promise<ActionResult<{ review: FinanceReview }>> {
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  const { model } = await loadModel(ws)
  if (!modelHasData(model)) return fail("Add your costs and at least one revenue stream first.")

  const months = projectMonths(model)
  const summary = summarizeModel(model, months)
  const context = await buildBusinessContext(ws, ["model", "validation"])

  const figures = JSON.stringify({
    inputs: {
      startingCash: model.startingCash,
      startupCosts: model.startupCosts.map((c) => ({ category: c.category, label: c.label, amount: c.amount })),
      revenueStreams: model.revenueStreams.map((s) => ({
        name: s.name,
        unitPrice: s.unitPrice,
        unitsMonth1: s.unitsMonth1,
        monthlyGrowthPct: s.monthlyGrowthPct,
        variableCostPerUnit: s.variableCostPerUnit,
      })),
      monthlyExpenses: model.monthlyExpenses.map((c) => ({ category: c.category, label: c.label, amount: c.amount })),
      customers: model.customers,
    },
    computed: summary,
    yearly: yearlyTotals(months),
  })

  const result = await runAiStructured({
    feature: "finance.review",
    caller: ws.caller,
    gate: "financial_planning",
    system: baseSystemPrompt({
      role: "a financial adviser for early-stage businesses in Africa",
      locale: ws.locale,
      extra: `Review the founder's financial model. All figures were entered or computed inside Anza and are PROJECTIONS, not actual results.
- Use ONLY the numbers provided; never introduce new figures, benchmarks or market data. You may do simple arithmetic on the numbers given.
- Explain in plain language what the key indicators mean for this business (break-even, margins, runway, funding required, CAC and LTV when present).
- Challenge assumptions that look optimistic or inconsistent (growth rates, prices versus unit costs, missing cost categories such as transport, mobile money fees, rent, salaries, taxes) — as questions for the founder to check, not as facts.
- Amounts are in ${model.currency}.`,
    }),
    messages: [{ role: "user", content: `${context}\n\nFinancial model:\n${fence("business_data", figures, 12_000)}` }],
    schema: reviewSchema,
    shape: `{
  "verdict": "3-4 sentence plain-language reading of the model",
  "observations": ["what a key number means for this business"],
  "risks": ["financial risk visible in the numbers"],
  "questionableAssumptions": ["assumption to double-check, and why"],
  "nextActions": ["concrete step to make the model more reliable"]
}`,
    maxTokens: 1600,
    temperature: 0.3,
  })
  if (!result.ok) return fail(result.error)
  return { success: true, review: result.data }
}

/** Live exchange rates, or null when the rate service cannot be reached. */
export async function getExchangeRates(base: string): Promise<ExchangeRates | null> {
  const ws = await requireWorkspace("view")
  if ("error" in ws || !isSupportedCurrency(base)) return null
  return fetchExchangeRates(base)
}
