"use server";

import { getAfricanCountryName } from "@/src/lib/african-countries";
import { Json } from "@/src/lib/database.types";
import {
  AI_RATE_LIMIT_MESSAGE,
  checkAiRateLimit,
} from "@/src/lib/rate-limiter";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface LegalLicense {
  name: string;
  authority: string;
  mandatory: boolean;
  description: string;
  estimatedCost: string;
}

export interface LegalTaxObligation {
  name: string;
  agency: string;
  frequency: string;
  details: string;
}

export interface LegalCheckstep {
  step: number;
  title: string;
  authority: string;
  timeline: string;
  description: string;
}

export interface LegalWorkspace {
  generatedAt: string;
  countryCode: string;
  countryName: string;
  recommendedEntityType: string;
  entityDescription: string;
  requiredLicenses: LegalLicense[];
  taxObligations: LegalTaxObligation[];
  dataPrivacyRequirements: {
    actName: string;
    commissioner: string;
    keyObligations: string[];
  };
  setupChecklist: LegalCheckstep[];
  recommendations: Array<{ title: string; detail: string }>;
}

function parseLegalWorkspaceResponse(
  response: string,
): Partial<LegalWorkspace> {
  const content = response
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as Partial<LegalWorkspace>;
  } catch {
    // fall through to object scanning below
  }

  const start = trimmed.indexOf("{");
  if (start < 0) {
    throw new Error("The AI did not return a JSON object.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let objectEnd = -1;

  for (let i = start; i < trimmed.length; i += 1) {
    const char = trimmed[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        objectEnd = i;
        break;
      }
    }
  }

  if (objectEnd < 0) {
    throw new Error("The AI did not return a balanced JSON object.");
  }

  return JSON.parse(
    trimmed.slice(start, objectEnd + 1),
  ) as Partial<LegalWorkspace>;
}

function buildFallbackLegalWorkspace(
  startup: {
    name: string;
    country_code: string;
    city?: string | null;
    industry?: string | null;
    description?: string | null;
  },
  project: { title: string; description?: string | null },
  countryName: string,
): LegalWorkspace {
  const cleanCountry = startup.country_code || "NG";

  return {
    generatedAt: new Date().toISOString(),
    countryCode: cleanCountry,
    countryName,
    recommendedEntityType: "Private Limited Company (Ltd)",
    entityDescription: `For ${startup.name || project.title}, a Private Limited Company (Ltd) is the most practical structure in ${countryName}. It balances legal liability protection, credible investor readiness, and operational flexibility while keeping the company distinct from the founder's personal assets.`,
    requiredLicenses: [
      {
        name: "Business Registration / Incorporation",
        authority: "Corporate Affairs Commission or equivalent",
        mandatory: true,
        description:
          "Register the legal entity and obtain the company certificate before operations.",
        estimatedCost: "(Estimate — verify locally)",
      },
      {
        name: "Sector Operating License",
        authority: "Industry regulator",
        mandatory: false,
        description:
          "Confirm whether the operating sector requires a regulator-specific permit.",
        estimatedCost: "(Estimate — verify locally)",
      },
      {
        name: "Tax Registration",
        authority: "Revenue authority",
        mandatory: true,
        description:
          "Register the entity for tax obligations and obtain a tax identification number.",
        estimatedCost: "(Estimate — verify locally)",
      },
    ],
    taxObligations: [
      {
        name: "Company income tax / turnover tax",
        agency: "Revenue Authority",
        frequency: "Annual",
        details:
          "Register the entity and file annual returns with the correct tax authority.",
      },
      {
        name: "VAT / local consumption tax",
        agency: "Revenue Authority",
        frequency: "Monthly / Quarterly",
        details:
          "Confirm if your sector and sales volume make VAT registration mandatory.",
      },
      {
        name: "PAYE / withholding obligations",
        agency: "Revenue Authority",
        frequency: "Monthly",
        details:
          "Register employee payroll tax and withholding obligations where employment begins.",
      },
    ],
    dataPrivacyRequirements: {
      actName: "Applicable data protection framework",
      commissioner: "Country data regulator",
      keyObligations: [
        "Register as Data Controller/Processor where required by local authorities",
        "Draft and publish a compliant Privacy Policy",
        "Obtain explicit informed consent before collecting personal data",
        "Implement retention and deletion controls",
        "Report material data breaches promptly",
      ],
    },
    setupChecklist: [
      {
        step: 1,
        title: "Confirm legal entity and corporate structure",
        authority: "Corporate Affairs Authority",
        timeline: "1–3 business days",
        description:
          "Prepare founder identification, registered business address, and incorporation documents.",
      },
      {
        step: 2,
        title: "Secure tax registration",
        authority: "Revenue Authority",
        timeline: "3–7 business days",
        description:
          "Collect tax registration details and verify if the business needs a tax ID.",
      },
      {
        step: 3,
        title: "Draft privacy and customer consent documents",
        authority: "Data Protection Authority",
        timeline: "1–2 weeks",
        description:
          "Place privacy policy terms in the signup flow and define deletion and retention practices.",
      },
      {
        step: 4,
        title: "Verify sector-specific licenses",
        authority: "Industry regulator",
        timeline: "1–4 weeks",
        description:
          "Confirm the local licensing authority and documentation needed for the product or service.",
      },
    ],
    recommendations: [
      {
        title: "Confirm registration before launch",
        detail:
          "Make sure the business is registered and has a verifiable compliance trail before customer acquisition.",
      },
      {
        title: "Map tax and payroll obligations",
        detail:
          "Set the correct tax registration path and payroll handling before hiring or processing payments.",
      },
      {
        title: "Publish privacy controls early",
        detail:
          "Create a customer-facing privacy policy and consent flow before collecting data from users.",
      },
    ],
  };
}

/**
 * Gets or generates legal compliance & permissions analysis for the active startup/project.
 */
export async function generateLegalComplianceWorkspace(
  projectId: string,
): Promise<
  | { success: true; workspace: LegalWorkspace }
  | { success: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !projectId) {
    return {
      success: false,
      error: "Please sign in to view legal permissions.",
    };
  }

  const { data: startup } = await supabase
    .from("startups")
    .select("id, name, city, country_code, industry, description")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!startup) {
    return { success: false, error: "Your startup could not be found." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, description, target_audience, metadata")
    .eq("id", projectId)
    .eq("startup_id", startup.id)
    .maybeSingle();

  if (!project) {
    return { success: false, error: "This project is not available to you." };
  }

  // Check if legal workspace is already saved in project metadata
  const metadata = (project.metadata as Record<string, Json> | null) || {};
  const existingWorkspace = metadata["legal_workspace"] as unknown as
    | LegalWorkspace
    | undefined;
  if (existingWorkspace) {
    return {
      success: true,
      workspace: existingWorkspace,
    };
  }

  const countryName = getAfricanCountryName(startup.country_code);

  const rateLimit = await checkAiRateLimit(user.id);
  if (!rateLimit.allowed) {
    return { success: false, error: AI_RATE_LIMIT_MESSAGE };
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

Produce a minimum of 4 required licenses (mandatory + recommended), 3 tax obligations, 5 data privacy obligations, 6 setup checklist steps, and 4 strategic recommendations.`;

  let aiWorkspace: Partial<LegalWorkspace> = {};
  try {
    const { generateTextWithFallback } = await import("@/src/lib/ai-providers");
    const response = await generateTextWithFallback(systemPrompt, [], {
      maxTokens: 3500,
      temperature: 0.3,
    });
    aiWorkspace = parseLegalWorkspaceResponse(response);
  } catch (error: unknown) {
    console.error("Failed to generate legal workspace with AI", error);
  }

  const fallbackWorkspace = buildFallbackLegalWorkspace(
    startup,
    project,
    countryName,
  );

  if (!aiWorkspace.recommendedEntityType || !aiWorkspace.requiredLicenses) {
    aiWorkspace = fallbackWorkspace;
  }

  const workspace: LegalWorkspace = {
    generatedAt: new Date().toISOString(),
    countryCode: startup.country_code,
    countryName,
    recommendedEntityType:
      aiWorkspace.recommendedEntityType ||
      fallbackWorkspace.recommendedEntityType,
    entityDescription:
      aiWorkspace.entityDescription || fallbackWorkspace.entityDescription,
    requiredLicenses: aiWorkspace.requiredLicenses?.length
      ? aiWorkspace.requiredLicenses
      : fallbackWorkspace.requiredLicenses,
    taxObligations: aiWorkspace.taxObligations?.length
      ? aiWorkspace.taxObligations
      : fallbackWorkspace.taxObligations,
    dataPrivacyRequirements:
      aiWorkspace.dataPrivacyRequirements ||
      fallbackWorkspace.dataPrivacyRequirements,
    setupChecklist: aiWorkspace.setupChecklist?.length
      ? aiWorkspace.setupChecklist
      : fallbackWorkspace.setupChecklist,
    recommendations: aiWorkspace.recommendations?.length
      ? aiWorkspace.recommendations
      : fallbackWorkspace.recommendations,
  };

  // Save to metadata
  const updatedMetadata = {
    ...(metadata as Record<string, Json>),
    legal_workspace: workspace as unknown as Json,
  };
  await supabase
    .from("projects")
    .update({ metadata: updatedMetadata as Json })
    .eq("id", project.id);

  revalidatePath("/dashboard/legal");
  return { success: true, workspace };
}

/**
 * Force regenerates legal compliance guidance with fresh AI analysis.
 */
export async function refreshLegalComplianceWorkspace(
  projectId: string,
): Promise<
  | { success: true; workspace: LegalWorkspace }
  | { success: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !projectId)
    return { success: false, error: "Not authenticated" };

  const { data: project } = await supabase
    .from("projects")
    .select("metadata")
    .eq("id", projectId)
    .single();
  if (project) {
    const metadata = (project.metadata as Record<string, Json> | null) || {};
    const metadataWithoutWorkspace = { ...metadata };
    delete metadataWithoutWorkspace["legal_workspace"];
    await supabase
      .from("projects")
      .update({ metadata: metadataWithoutWorkspace as Json })
      .eq("id", projectId);
  }

  return generateLegalComplianceWorkspace(projectId);
}
