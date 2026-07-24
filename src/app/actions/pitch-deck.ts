"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { generateTextWithFallback } from "@/src/lib/ai-providers"
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

  const context = { startup: startup.name, title: project.title, description: project.description || "", audience: project.target_audience || "", location: [startup.city, startup.country_code].filter(Boolean).join(", ") || "your launch market", currency: startup.budget_currency || "USD" }
  let response: string
  try {
    response = await generateTextWithFallback(
      `Create an investor pitch deck for this startup. Use only these facts and never invent statistics, customers, revenue, partnerships, or market sizes. Label unknowns as Validation required.\nStartup: ${context.startup}\nIdea: ${context.title}\nDescription: ${context.description || "Not specified"}\nAudience: ${context.audience || "Not specified"}\nLocation: ${context.location}\n\nReturn exactly six concise slide bodies, 90-150 words each, in this format:\n=== problem ===\n...\n=== solution ===\n...\n=== market ===\n...\n=== business-model ===\n...\n=== traction ===\n...\n=== ask ===\n...`,
      [{ role: "user", content: "Generate the pitch deck now." }],
      { maxTokens: 1600, temperature: 0.35 },
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
