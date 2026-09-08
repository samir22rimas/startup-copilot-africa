"use server"

import { revalidatePath } from "next/cache"
import { checkAiRateLimit, AI_RATE_LIMIT_MESSAGE } from "@/src/lib/rate-limiter"
import { getAfricanCountryName } from "@/src/lib/african-countries"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"

export interface LegalLicense {
  name: string
  authority: string
  mandatory: boolean
  description: string
  estimatedCost: string
}

export interface LegalTaxObligation {
  name: string
  agency: string
  frequency: string
  details: string
}

export interface LegalCheckstep {
  step: number
  title: string
  authority: string
  timeline: string
  description: string
}

export interface LegalWorkspace {
  generatedAt: string
  countryCode: string
  countryName: string
  recommendedEntityType: string
  entityDescription: string
  requiredLicenses: LegalLicense[]
  taxObligations: LegalTaxObligation[]
  dataPrivacyRequirements: {
    actName: string
    commissioner: string
    keyObligations: string[]
  }
  setupChecklist: LegalCheckstep[]
  recommendations: Array<{ title: string; detail: string }>
}

/**
 * Gets or generates legal compliance & permissions analysis for the active startup/project.
 */
export async function generateLegalComplianceWorkspace(projectId: string): Promise<
  { success: true; workspace: LegalWorkspace } | { success: false; error: string }
> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !projectId) {
    return { success: false, error: "Please sign in to view legal permissions." }
  }

  const { data: startup } = await supabase
    .from("startups")
    .select("id, name, city, country_code, industry, description")
    .eq("owner_id", user.id)
    .maybeSingle()

  if (!startup) {
    return { success: false, error: "Your startup could not be found." }
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, description, target_audience, metadata")
    .eq("id", projectId)
    .eq("startup_id", startup.id)
    .maybeSingle()

  if (!project) {
    return { success: false, error: "This project is not available to you." }
  }

  // Check if legal workspace is already saved in project metadata
  const metadata = (project.metadata as any) || {}
  if (metadata.legal_workspace) {
    return { success: true, workspace: metadata.legal_workspace as LegalWorkspace }
  }

  const countryName = getAfricanCountryName(startup.country_code)

  const rateLimit = await checkAiRateLimit(user.id)
  if (!rateLimit.allowed) {
    return { success: false, error: AI_RATE_LIMIT_MESSAGE }
  }

  const systemPrompt = `You are a Senior Corporate Lawyer and Regulatory Compliance Specialist with deep expertise in African business law, startup incorporation, licensing, and tax compliance. Your advice must be practical, country-specific, and actionable for a first-time founder.

Analyze the legal, licensing, tax, and data privacy compliance requirements for this startup in ${countryName}. Be precise and specific to the country and industry. Never fabricate laws, agencies, or fees — use realistic estimates and label uncertain figures as "(Estimate — verify locally)".

Return ONLY valid JSON matching this exact structure with no extra text or markdown outside the JSON:
{
  "recommendedEntityType": "Full legal name e.g. Private Limited Company (Ltd) / Société à Responsabilité Limitée (SARL) / Close Corporation (CC)",
  "entityDescription": "3–4 sentence explanation of why this entity type is optimal for this specific industry, country context, and growth stage. Include liability protection, tax treatment, investor-readiness, and operational flexibility.",
  "requiredLicenses": [
    {
      "name": "Specific permit or license name",
      "authority": "Exact government body or regulator name",
      "mandatory": true,
      "description": "Why this is required for this specific business type and country. Include the legal basis (act or regulation name) if known.",
      "estimatedCost": "Specific fee range in local currency or USD, e.g. KES 10,000–50,000 / NGN 50,000–200,000 (Estimate)"
    }
  ],
  "taxObligations": [
    {
      "name": "Tax type and registration requirement",
      "agency": "Exact revenue authority name",
      "frequency": "Monthly / Quarterly / Annual",
      "details": "Key filing deadlines, applicable rates, thresholds, and penalties for non-compliance."
    }
  ],
  "dataPrivacyRequirements": {
    "actName": "Full name of applicable data protection law",
    "commissioner": "Name of the supervisory authority or data commissioner",
    "keyObligations": [
      "Register as Data Controller/Processor with [authority] before collecting customer data",
      "Draft and publish a compliant Privacy Policy accessible to all users",
      "Obtain explicit informed consent before processing personal data",
      "Implement data retention and deletion policies",
      "Report data breaches to [authority] within [X] hours/days"
    ]
  },
  "setupChecklist": [
    {
      "step": 1,
      "title": "Step title",
      "authority": "Responsible government body",
      "timeline": "Realistic timeline e.g. 1–3 business days",
      "description": "Specific, actionable instructions for this step including what documents to prepare, where to go or apply online, and what to expect."
    }
  ],
  "recommendations": [
    {
      "title": "Recommendation title",
      "detail": "2–3 sentence practical recommendation specific to this industry, country, and growth stage."
    }
  ]
}

Context:
Startup Name: ${startup.name}
Country: ${countryName} (${startup.country_code})
City: ${startup.city || "Major City"}
Industry: ${startup.industry || "General Business"}
Project Title: ${project.title}
Description: ${project.description || startup.description || "N/A"}

Produce a minimum of 4 required licenses (mandatory + recommended), 3 tax obligations, 5 data privacy obligations, 6 setup checklist steps, and 4 strategic recommendations.`

  let aiWorkspace: Partial<LegalWorkspace> = {}
  try {
    const { generateTextWithFallback } = await import("@/src/lib/ai-providers")
    const response = await generateTextWithFallback(systemPrompt, [], { maxTokens: 3500, temperature: 0.3 })
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      aiWorkspace = JSON.parse(jsonMatch[0])
    }
  } catch (error: any) {
    console.error("Failed to generate legal workspace with AI", error)
    return { success: false, error: "The AI could not generate legal advice. Details: " + (error.message || "Unknown error") }
  }

  if (!aiWorkspace.recommendedEntityType || !aiWorkspace.requiredLicenses) {
    return { success: false, error: "The AI response was incomplete. Please try again." }
  }

  const workspace: LegalWorkspace = {
    generatedAt: new Date().toISOString(),
    countryCode: startup.country_code,
    countryName,
    recommendedEntityType: aiWorkspace.recommendedEntityType,
    entityDescription: aiWorkspace.entityDescription || "",
    requiredLicenses: aiWorkspace.requiredLicenses || [],
    taxObligations: aiWorkspace.taxObligations || [],
    dataPrivacyRequirements: aiWorkspace.dataPrivacyRequirements || { actName: "Data Protection Law", commissioner: "Data Regulator", keyObligations: [] },
    setupChecklist: aiWorkspace.setupChecklist || [],
    recommendations: aiWorkspace.recommendations || [],
  }

  // Save to metadata
  const updatedMetadata = { ...metadata, legal_workspace: workspace }
  await supabase.from("projects").update({ metadata: updatedMetadata }).eq("id", project.id)

  revalidatePath("/dashboard/legal")
  return { success: true, workspace }
}

/**
 * Force regenerates legal compliance guidance with fresh AI analysis.
 */
export async function refreshLegalComplianceWorkspace(projectId: string): Promise<
  { success: true; workspace: LegalWorkspace } | { success: false; error: string }
> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !projectId) return { success: false, error: "Not authenticated" }

  const { data: project } = await supabase.from("projects").select("metadata").eq("id", projectId).single()
  if (project) {
    const metadata = (project.metadata as any) || {}
    delete metadata.legal_workspace
    await supabase.from("projects").update({ metadata }).eq("id", projectId)
  }

  return generateLegalComplianceWorkspace(projectId)
}
