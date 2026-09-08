"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { generateTextWithFallback } from "@/src/lib/ai-providers"
import { checkAiRateLimit, AI_RATE_LIMIT_MESSAGE } from "@/src/lib/rate-limiter"
import type { Json } from "@/src/lib/database.types"

export type PitchDeckSlide = {
  id: string
  title: string
  eyebrow: string
  body: string
  metric?: string
  metricLabel?: string
}

export type PitchDeck = { generatedAt: string; slides: PitchDeckSlide[] }

const slideBlueprints = [
  ["problem", "The problem", "PROBLEM"],
  ["solution", "Our solution", "SOLUTION"],
  ["market", "Market opportunity", "MARKET"],
  ["business-model", "Business model", "BUSINESS MODEL"],
  ["traction", "Early traction", "TRACTION"],
  ["ask", "The ask", "FUNDING ASK"],
] as const

function fallbackDeck(context: { startup: string; title: string; description: string; audience: string; location: string; currency: string }): PitchDeck {
  const audience = context.audience || "our first target customers"
  const description = context.description || `${context.title} addresses a high-priority customer problem.`
  return {
    generatedAt: new Date().toISOString(),
    slides: [
      { id: "problem", eyebrow: "PROBLEM", title: "A problem worth solving", body: `${audience} in ${context.location} still rely on fragmented or unreliable alternatives. The cost is lost time, poor visibility, and slower decisions.\n\nValidation required: document the current workflow, the cost of doing nothing, and the buyer's urgency before making market-size claims.`, metric: "01", metricLabel: "Focused customer problem" },
      { id: "solution", eyebrow: "SOLUTION", title: context.title, body: `${context.startup} helps ${audience} reach a simpler, more dependable outcome. ${description}\n\nStart with a narrow, measurable use case, then use customer evidence to decide what to automate next.`, metric: "02", metricLabel: "Clear value proposition" },
      { id: "market", eyebrow: "MARKET", title: "Start local. Earn the right to expand.", body: `Our beachhead is ${context.location}. Map reachable customers, their current spend, competing alternatives, and the local partners who already have their trust.\n\nValidation required: replace assumptions with interviews, pilots, and paid commitments.`, metric: "03", metricLabel: "Evidence before scale" },
      { id: "business-model", eyebrow: "BUSINESS MODEL", title: "A model built for repeatable value", body: `Test one straightforward pricing model first: subscription, transaction fee, service package, or recurring contract.\n\nTrack conversion, retention, delivery cost, gross margin, and payback. Price and unit economics should be shown in ${context.currency} once customer evidence exists.`, metric: "04", metricLabel: "Measurable unit economics" },
      { id: "traction", eyebrow: "TRACTION", title: "Prove demand with real customer signals", body: `The next milestones are customer interviews, a paid pilot, and repeat usage—not vanity metrics.\n\nShow the number of interviews, commitments, pilots, paid customers, and retention only when verified.`, metric: "05", metricLabel: "Validation milestones" },
      { id: "ask", eyebrow: "FUNDING ASK", title: "Capital tied to proof points", body: `Use funding to reach the next evidence-based milestones: validation, delivery, and a repeatable customer-acquisition process.\n\nState the amount, runway, allocation, and decision gates only after they are grounded in the current operating plan.`, metric: "06", metricLabel: "Milestone-led capital plan" },
    ],
  }
}

function parseDeck(response: string): PitchDeckSlide[] | null {
  const slides: Array<PitchDeckSlide | null> = slideBlueprints.map(([id, title, eyebrow]) => {
    const marker = `=== ${id} ===`
    const start = response.indexOf(marker)
    if (start < 0) return null
    const next = response.indexOf("=== ", start + marker.length)
    const body = response.slice(start + marker.length, next < 0 ? undefined : next).trim()
    return body.length > 80 ? { id, title, eyebrow, body } : null
  })
  return slides.every((slide): slide is PitchDeckSlide => slide !== null) ? slides : null
}

export async function generatePitchDeck(projectId: string): Promise<{ success: true; deck: PitchDeck } | { success: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !projectId) return { success: false, error: "Please sign in to generate a pitch deck." }

  const { data: startup } = await supabase.from("startups").select("id, name, city, country_code, budget_currency").eq("owner_id", user.id).maybeSingle()
  if (!startup) return { success: false, error: "Your startup could not be found." }
  const { data: project } = await supabase.from("projects").select("id, title, description, target_audience, metadata").eq("id", projectId).eq("startup_id", startup.id).maybeSingle()
  if (!project) return { success: false, error: "This project is not available to you." }

  const rateLimit = await checkAiRateLimit(user.id)
  if (!rateLimit.allowed) {
    return { success: false, error: AI_RATE_LIMIT_MESSAGE }
  }

  const context = { startup: startup.name, title: project.title, description: project.description || "", audience: project.target_audience || "", location: [startup.city, startup.country_code].filter(Boolean).join(", ") || "your launch market", currency: startup.budget_currency || "USD" }
  let response: string
  try {
    response = await generateTextWithFallback(
      `You are a world-class startup pitch coach and investor communications specialist. Write a compelling, investor-grade pitch deck for the startup below. Be specific, concrete, and professional. Every claim must be grounded in the provided facts. Never invent statistics, revenue figures, market sizes, or competitor names. Label unknowns explicitly as "(Validation required)" and assumptions as "(Assumption)".

Startup: ${context.startup}
Business idea: ${context.title}
Description: ${context.description || "Not yet specified"}
Target audience: ${context.audience || "Not yet specified"}
Market: ${context.location}
Currency: ${context.currency}

Return exactly six slide bodies in the format below — no text outside the sections, no markdown code blocks. Each slide must be 120–180 words of substantive, investor-ready content. Use short paragraphs and bullet points.

=== problem ===
Open with a sharp, specific statement of the customer problem. Describe who suffers it, how often, what they currently do instead, and the real cost (time, money, or risk) of the status quo. Make the reader feel the urgency. End with: "This is the problem ${context.startup} was built to solve."

=== solution ===
Describe the solution in one clear sentence, then explain how it works, why it is better than existing alternatives, and what makes it defensible in the ${context.location} context. Highlight local relevance, reliability, and simplicity. Avoid technical jargon. End with the core value promise: what the customer can now do that they could not before.

=== market ===
Define the beachhead market precisely (who, where, how many). Explain the expansion path from the initial segment. Use reachable customer count × realistic spend per year as the market sizing method — label the figures as "(Assumption — to be validated with sales data)". Describe the competitive landscape and how ${context.startup} differentiates.

=== business-model ===
State the pricing model clearly in ${context.currency}. Explain how revenue is generated per customer, the target gross margin, and the key unit economics metrics to track (CAC, LTV, payback period). Note which figures are validated vs. assumed. Explain why this model fits the ${context.location} market context.

=== traction ===
List real milestones achieved so far (interviews, pilots, letters of intent, paying customers, partnerships). If none yet, describe the validation plan: specific targets for customer interviews, trials, and first revenue within the next 90 days. Use a table or bullet format: Milestone | Status | Target Date.

=== ask ===
State the funding amount sought in ${context.currency}. Break down the use of funds in a simple allocation table (e.g. Customer Acquisition 30%, Product 40%, Operations 20%, Reserve 10%). State the runway this provides and the key milestones that will be reached before the next raise. Include the type of capital sought (equity, grant, convertible note) and what the ideal investor brings beyond money.`,
      [{ role: "user", content: "Generate the professional investor pitch deck now." }],
      { maxTokens: 2500, temperature: 0.3 },
    )
  } catch {
    return { success: false, error: "The AI could not generate a deck. Check your AI provider configuration and try again." }
  }
  const slides = parseDeck(response)
  if (!slides) return { success: false, error: "The AI response was incomplete. Please try again." }
  const deck: PitchDeck = { generatedAt: new Date().toISOString(), slides }

  const metadata = project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata) ? project.metadata : {}
  const { error } = await supabase.from("projects").update({ metadata: { ...metadata, pitch_deck: deck as unknown as Json } }).eq("id", project.id)
  if (error) return { success: false, error: "Could not save the pitch deck. Please try again." }
  revalidatePath("/dashboard/funding/pitch-deck")
  return { success: true, deck }
}

export async function savePitchDeck(projectId: string, deck: PitchDeck): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !projectId) return { success: false, error: "Please sign in to save changes." }
  const { data: startup } = await supabase.from("startups").select("id").eq("owner_id", user.id).maybeSingle()
  if (!startup) return { success: false, error: "Your startup could not be found." }
  const { data: project } = await supabase.from("projects").select("id, metadata").eq("id", projectId).eq("startup_id", startup.id).maybeSingle()
  if (!project) return { success: false, error: "This project is not available to you." }
  const metadata = project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata) ? project.metadata : {}
  const { error } = await supabase.from("projects").update({ metadata: { ...metadata, pitch_deck: deck as unknown as Json } }).eq("id", project.id)
  if (error) return { success: false, error: "Could not save the pitch deck. Please try again." }
  revalidatePath("/dashboard/funding/pitch-deck")
  return { success: true }
}
