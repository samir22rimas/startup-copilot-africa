"use server"

import { createProject, upsertAiConfig } from "@/src/features/business/services/project.service"
import { completeOnboarding, createStartup } from "@/src/features/business/services/startup.service"
import { revalidatePath } from "next/cache"

export type OnboardingInput = {
  businessName: string
  countryCode: string // any case — uppercased below
  city?: string
  industry?: string
  estimatedBudgetUsd?: number
  projectTitle: string
  projectDescription?: string
  targetAudience?: string
  primaryUseCase: string
  toneOfVoice: string
}

export type OnboardingResult =
  | { success: true; startupId: string; projectId: string }
  | { success: false; error: string }

/**
 * Server Action: persists the full onboarding wizard (all 3 steps) in
 * one call. Wire this to Step3AI's "Finish" button.
 */
export async function completeOnboardingWizard(
  input: OnboardingInput,
): Promise<OnboardingResult> {
  if (!input.businessName?.trim()) {
    return { success: false, error: "Business name is required." }
  }
  if (!input.countryCode?.trim()) {
    return { success: false, error: "Country is required." }
  }

  const { startup, error } = await createStartup({
    name: input.businessName.trim(),
    country_code: input.countryCode.toUpperCase(),
    city: input.city?.trim() || null,
    industry: input.industry?.trim() || null,
    estimated_budget_cents: input.estimatedBudgetUsd
      ? Math.round(input.estimatedBudgetUsd * 100)
      : null,
  })
  if (!startup) {
    return { success: false, error: error || "Couldn't create your startup. Please try again." }
  }

  const project = await createProject({
    startup_id: startup.id,
    title: input.projectTitle?.trim() || `${startup.name} — Launch Plan`,
    description: input.projectDescription?.trim() || null,
    target_audience: input.targetAudience?.trim() || null,
  })
  if (!project) {
    return { success: false, error: "Startup created, but the project failed to save." }
  }

  await upsertAiConfig({
    project_id: project.id,
    primary_use_case: input.primaryUseCase || "general_advisory",
    tone_of_voice: input.toneOfVoice || "professional",
    model: "gpt-5.6",
  })
  await completeOnboarding(startup.id)

  revalidatePath("/dashboard")
  return { success: true, startupId: startup.id, projectId: project.id }
}