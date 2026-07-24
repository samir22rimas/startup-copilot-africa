"use server"

import { revalidatePath } from "next/cache"
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

  const countryNames: Record<string, string> = {
    KE: "Kenya",
    NG: "Nigeria",
    GH: "Ghana",
    ZA: "South Africa",
    EG: "Egypt",
    MA: "Morocco",
    RW: "Rwanda",
    TZ: "Tanzania",
    UG: "Uganda",
    CM: "Cameroon",
  }

  const countryName = countryNames[startup.country_code] || startup.country_code

  const systemPrompt = `You are a Senior Corporate Lawyer and Regulatory Compliance Specialist specializing in African business incorporation and licensing.
Analyze the legal, licensing, tax, and regulatory compliance requirements for this startup in ${countryName}.
Return ONLY valid JSON matching this exact structure:
{
  "recommendedEntityType": "e.g. Private Limited Company (Ltd / PLC / SARL / LTD)",
  "entityDescription": "Detailed explanation of why this entity type is ideal for this sector and country.",
  "requiredLicenses": [
    {
      "name": "e.g. BRS Business Registration / CAC License / CBK Payment Service Provider",
      "authority": "e.g. Business Registration Service / Corporate Affairs Commission",
      "mandatory": true,
      "description": "Why this permit is required.",
      "estimatedCost": "Estimated fee or KES/NGN/USD range"
    }
  ],
  "taxObligations": [
    {
      "name": "e.g. KRA PIN & VAT Registration / FIRS Tax ID",
      "agency": "e.g. Kenya Revenue Authority / FIRS / SARS",
      "frequency": "Monthly / Annual",
      "details": "Filing deadlines and key tax obligations."
    }
  ],
  "dataPrivacyRequirements": {
    "actName": "e.g. Kenya Data Protection Act 2019 / Nigeria Data Protection Regulation (NDPR) / POPIA",
    "commissioner": "e.g. ODPC / NDPC / Information Regulator",
    "keyObligations": [
      "Register as Data Controller/Processor",
      "Draft explicit Privacy Policy & Consent notices"
    ]
  },
  "setupChecklist": [
    {
      "step": 1,
      "title": "Name Search & Reservation",
      "authority": "Relevant Registrar",
      "timeline": "1-3 days",
      "description": "Detailed step instructions."
    }
  ],
  "recommendations": [
    {
      "title": "...",
      "detail": "..."
    }
  ]
}

Context:
Startup Name: ${startup.name}
Country: ${countryName} (${startup.country_code})
City: ${startup.city || "Major City"}
Industry: ${startup.industry || "General Business"}
Project Title: ${project.title}
Description: ${project.description || startup.description || "N/A"}`

  let aiWorkspace: Partial<LegalWorkspace> = {}
  try {
    const { generateTextWithFallback } = await import("@/src/lib/ai-providers")
    const response = await generateTextWithFallback(systemPrompt, [], { maxTokens: 2000, temperature: 0.5 })
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
