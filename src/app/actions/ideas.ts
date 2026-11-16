"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createStartupAndFirstProject } from "@/src/app/actions/dashboard"
import { baseSystemPrompt, fence } from "@/src/lib/ai/guard"
import { runAiStructured } from "@/src/lib/ai/service"
import { getAfricanCountry, getAfricanCountryCurrency } from "@/src/lib/african-countries"
import { describeCountryForPrompt } from "@/src/lib/country-profiles"
import type { Json } from "@/src/lib/database.types"
import type { BusinessIdeaRow } from "@/src/lib/database.v2.types"
import { getLocale } from "@/src/lib/i18n/server"
import {
  IDEAS_SHAPE,
  computeIdeaScore,
  ideaRatingsSchema,
  ideaSchema,
  ideasResponseSchema,
  type GeneratedIdea,
  type IdeaRatings,
} from "@/src/lib/ideas/score"
import { getIndustryLabel } from "@/src/lib/industries"
import { getEntitlements } from "@/src/lib/entitlements"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { isUuid } from "@/src/lib/validation"
import { fail, type ActionResult } from "@/src/lib/workspace"

const PATH = "/dashboard/ideas"

const inputSchema = z.object({
  mode: z.enum(["skills", "academic", "problem", "market"]),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Choose a country."),
  city: z.string().trim().max(120).default(""),
  industry: z.string().trim().max(120).default(""),
  skills: z.string().trim().max(600).default(""),
  academicField: z.string().trim().max(200).default(""),
  localProblem: z.string().trim().max(800).default(""),
  budget: z.number().min(0).max(1e12).default(0),
})

export type IdeaGenerationInput = z.input<typeof inputSchema>

export interface SavedIdea {
  id: string
  title: string
  summary: string
  countryCode: string | null
  industry: string | null
  idea: GeneratedIdea
  score: number
  status: BusinessIdeaRow["status"]
  startupId: string | null
  createdAt: string
}

async function currentUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

function toSavedIdea(row: BusinessIdeaRow): SavedIdea | null {
  const analysis = (row.analysis && typeof row.analysis === "object" ? row.analysis : {}) as Record<string, unknown>
  const parsed = ideaSchema.safeParse({ ...analysis, title: row.title, summary: row.summary, ratings: row.criteria })
  if (!parsed.success) return null
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    countryCode: row.country_code,
    industry: row.industry,
    idea: parsed.data,
    score: computeIdeaScore(parsed.data.ratings),
    status: row.status,
    startupId: row.startup_id,
    createdAt: row.created_at,
  }
}

/** Ideas are generated for the person, not a workspace — nothing is saved until they choose to. */
export async function generateIdeas(
  input: IdeaGenerationInput,
): Promise<ActionResult<{ ideas: Array<{ idea: GeneratedIdea; score: number }> }>> {
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the details and try again.")
  const data = parsed.data
  if (!getAfricanCountry(data.countryCode)) return fail("Choose a country.")

  const { user } = await currentUser()
  if (!user) return fail("Please sign in to continue.")

  const locale = await getLocale()
  const currency = getAfricanCountryCurrency(data.countryCode)

  const angle: Record<typeof data.mode, string> = {
    skills: "Start from the founder's skills and interests: propose businesses they are well placed to run.",
    academic: "Start from the founder's field of study: propose businesses that turn that knowledge into a service or product.",
    problem: "Start from the local problem the founder describes: propose different businesses that solve it.",
    market: "Start from the chosen country and industry: propose businesses that address real, common needs in that market.",
  }

  const founder = [
    data.skills && `Skills and interests: ${data.skills}`,
    data.academicField && `Field of study: ${data.academicField}`,
    data.localProblem && `Local problem observed: ${data.localProblem}`,
    data.industry && `Industry of interest: ${getIndustryLabel(data.industry)}`,
    data.city && `City: ${data.city}`,
    `Available starting budget: ${data.budget > 0 ? `${Math.round(data.budget).toLocaleString("en-US")} ${currency}` : "not stated (assume very limited capital)"}`,
  ]
    .filter(Boolean)
    .join("\n")

  const result = await runAiStructured({
    feature: `ideas.generate.${data.mode}`,
    caller: { userId: user.id, startupId: null, ...getEntitlements(user) },
    gate: "idea_lab",
    system: baseSystemPrompt({
      role: "a business idea coach for first-time entrepreneurs in Africa",
      locale,
      extra: `Task: propose exactly 4 distinct, realistic business ideas. ${angle[data.mode]}
Favour ideas that can start small with limited capital, use mobile money and existing channels, and can be tested within weeks. Avoid generic app ideas with no clear customer.
Give the start-up capital as an estimated range in ${currency}, and be explicit about what it covers.`,
    }),
    messages: [
      {
        role: "user",
        content: `${describeCountryForPrompt(data.countryCode, locale)}\n\nAbout the founder:\n${fence("founder_input", founder, 2500)}\n\nPropose the ideas now.`,
      },
    ],
    schema: ideasResponseSchema,
    shape: IDEAS_SHAPE,
    maxTokens: 4200,
    temperature: 0.8,
  })
  if (!result.ok) return fail(result.error)

  const ideas = result.data.ideas
    .map((idea) => ({
      // The estimate must be expressed in the local currency and be a real range.
      idea: {
        ...idea,
        startupCapital: {
          ...idea.startupCapital,
          currency,
          low: Math.min(idea.startupCapital.low, idea.startupCapital.high),
          high: Math.max(idea.startupCapital.low, idea.startupCapital.high),
        },
      },
      score: computeIdeaScore(idea.ratings),
    }))
    .sort((a, b) => b.score - a.score)

  return { success: true, ideas }
}

export async function listIdeas(): Promise<SavedIdea[]> {
  const { supabase, user } = await currentUser()
  if (!user) return []
  const { data } = await supabase
    .from("business_ideas")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("score", { ascending: false, nullsFirst: false })
    .limit(200)
  return (data ?? []).map(toSavedIdea).filter((idea): idea is SavedIdea => idea !== null)
}

export async function saveIdea(input: {
  idea: GeneratedIdea
  countryCode: string
  industry?: string
}): Promise<ActionResult<{ idea: SavedIdea }>> {
  const parsed = ideaSchema.safeParse(input?.idea)
  const countryCode = String(input?.countryCode ?? "").toUpperCase()
  if (!parsed.success || !getAfricanCountry(countryCode)) return fail("This idea could not be saved.")

  const { supabase, user } = await currentUser()
  if (!user) return fail("Please sign in to continue.")

  const entitlements = getEntitlements(user)
  const { count } = await supabase
    .from("business_ideas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .neq("status", "archived")
  if (!entitlements.unlimited && (count ?? 0) >= entitlements.limits.savedIdeas) {
    return fail(`The ${entitlements.tier} plan keeps up to ${entitlements.limits.savedIdeas} ideas. Remove one to save another.`)
  }

  const { title, summary, ratings, ...analysis } = parsed.data
  const { data, error } = await supabase
    .from("business_ideas")
    .insert({
      user_id: user.id,
      title,
      summary,
      country_code: countryCode,
      industry: input.industry?.slice(0, 120) || null,
      analysis: analysis as unknown as Json,
      criteria: ratings as unknown as Json,
      score: computeIdeaScore(ratings),
    })
    .select("*")
    .maybeSingle()
  if (error || !data) return fail("Could not save the idea. Please try again.")

  const saved = toSavedIdea(data)
  revalidatePath(PATH)
  return saved ? { success: true, idea: saved } : fail("Could not save the idea. Please try again.")
}

/** The founder can disagree with the AI: changing a rating recomputes the score. */
export async function updateIdeaRatings(id: string, ratings: IdeaRatings): Promise<ActionResult<{ score: number }>> {
  const parsed = ideaRatingsSchema.safeParse(ratings)
  if (!isUuid(id) || !parsed.success) return fail("That idea is not available.")
  const { supabase, user } = await currentUser()
  if (!user) return fail("Please sign in to continue.")

  const score = computeIdeaScore(parsed.data)
  const { error, count } = await supabase
    .from("business_ideas")
    .update({ criteria: parsed.data as unknown as Json, score }, { count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id)
  if (error || !count) return fail("Could not update the rating.")
  revalidatePath(PATH)
  return { success: true, score }
}

export async function deleteIdea(id: string): Promise<ActionResult> {
  if (!isUuid(id)) return fail("That idea is not available.")
  const { supabase, user } = await currentUser()
  if (!user) return fail("Please sign in to continue.")
  const { error, count } = await supabase
    .from("business_ideas")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id)
  if (error || !count) return fail("Could not delete the idea.")
  revalidatePath(PATH)
  return { success: true }
}

/** Turns a saved idea into a business workspace, carrying its description and budget across. */
export async function convertIdeaToBusiness(input: {
  ideaId: string
  name: string
  city: string
}): Promise<ActionResult<{ startupId: string }>> {
  if (!isUuid(input?.ideaId)) return fail("That idea is not available.")
  const { supabase, user } = await currentUser()
  if (!user) return fail("Please sign in to continue.")

  const { data: row } = await supabase
    .from("business_ideas")
    .select("*")
    .eq("id", input.ideaId)
    .eq("user_id", user.id)
    .maybeSingle()
  const saved = row ? toSavedIdea(row) : null
  if (!row || !saved) return fail("That idea is not available.")
  if (saved.status === "converted" && saved.startupId) return fail("This idea has already become a business.")

  const countryCode = saved.countryCode ?? "CM"
  const created = await createStartupAndFirstProject({
    name: input.name,
    countryCode,
    city: input.city,
    industry: saved.industry ?? "",
    estimatedBudgetCents: Math.round(saved.idea.startupCapital.low * 100),
    budgetCurrency: getAfricanCountryCurrency(countryCode),
    projectTitle: saved.title,
    projectDescription: `${saved.summary}\n\nProblem: ${saved.idea.problem}\nCustomers: ${saved.idea.customerSegments.join("; ")}\nRevenue model: ${saved.idea.revenueModel}`.slice(0, 4000),
  })
  if (!created.success) return fail(created.error)

  await supabase
    .from("business_ideas")
    .update({ status: "converted", startup_id: created.startup.id })
    .eq("id", row.id)
    .eq("user_id", user.id)

  revalidatePath(PATH)
  revalidatePath("/dashboard", "layout")
  return { success: true, startupId: created.startup.id }
}
