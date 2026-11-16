"use server";

import { getProjectAccess } from "@/src/lib/workspace-access";
import { isStorableObject } from "@/src/lib/validation";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { checkAiRateLimit } from "@/src/lib/rate-limiter";
import { revalidatePath } from "next/cache";
import type { Json } from "@/src/lib/database.types"

export interface FundingOpportunity {
  name: string;
  type: string;
  amountRange: string;
  focus: string;
  link: string;
  deadline: string;
}

export interface PitchDeckItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
}

export interface FundingWorkspace {
  generatedAt: string;
  cashBalance: number;
  monthlyBurn: number;
  fundingGoal: number;
  valuation: number;
  dilutionPercent: number;
  pitchDeck: PitchDeckItem[];
  opportunities: FundingOpportunity[];
  recommendations: { title: string; detail: string }[];
}

const DEFAULT_PITCH_DECK: PitchDeckItem[] = [
  {
    id: "problem",
    label: "Problem Slide",
    description:
      "Quantify the pain point for the African market (e.g. access, cost, infrastructure).",
    checked: false,
  },
  {
    id: "solution",
    label: "Solution Slide",
    description: "Demonstrate your localized product/service value prop.",
    checked: false,
  },
  {
    id: "market",
    label: "Market Size (TAM/SAM/SOM)",
    description: "Estimate reachable local and regional market volume.",
    checked: false,
  },
  {
    id: "traction",
    label: "Traction & Cohorts",
    description: "Show pilot customer feedback, paying users, or signups.",
    checked: false,
  },
  {
    id: "business-model",
    label: "Business Model",
    description:
      "Explain unit economics, pricing strategy, and payment methods.",
    checked: false,
  },
  {
    id: "go-to-market",
    label: "Go-to-Market Strategy",
    description: "Acquisition channels, partnerships, and localized loops.",
    checked: false,
  },
  {
    id: "competition",
    label: "Competitive Landscape",
    description:
      "Compare with informal alternatives and foreign/local competitors.",
    checked: false,
  },
  {
    id: "team",
    label: "Founding Team",
    description:
      "Highlight operational experience and local market capability.",
    checked: false,
  },
  {
    id: "ask",
    label: "The Ask & Allocation",
    description: "Required funding and clear runway allocation roadmap.",
    checked: false,
  },
];


export async function generateFundingWorkspace(
  projectId: string,
): Promise<
  | { success: true; workspace: FundingWorkspace }
  | { success: false; error: string }
> {
  const access = await getProjectAccess(projectId, "edit");
  if ("error" in access) return { success: false, error: access.error };
  const { supabase, user, startup, project } = access;

  const budgetDollars = (startup.estimated_budget_cents || 0) / 100;
  const currency = startup.budget_currency || "USD";

  const rateLimit = await checkAiRateLimit(user.id);
  if (!rateLimit.allowed) {
    return { success: false, error: rateLimit.message };
  }

  const systemPrompt = `You are an expert Startup Advisor and VC for African startups.
Suggest planning figures for this startup's fundraising. These are illustrative starting points the founder will edit, not facts.
Do NOT name any investor, grant, accelerator or funding programme.
Return ONLY valid JSON matching this exact structure:
{
  "monthlyBurn": 1500,
  "fundingGoal": 50000,
  "valuation": 500000,
  "dilutionPercent": 10,
  "recommendations": [
    { "title": "...", "detail": "..." },
    ... exactly 2 actionable fundraising recommendations
  ]
}

Context:
Startup: ${startup.name}
Location: ${startup.city || "Unknown"}, ${startup.country_code || "Africa"}
Budget: ${budgetDollars} ${currency}
Project: ${project.title}
Description: ${project.description || "N/A"}
Audience: ${project.target_audience || "N/A"}`

  let aiData: Partial<FundingWorkspace> = {}
  try {
    const { generateTextWithFallback } = await import("@/src/lib/ai-providers")
    const response = await generateTextWithFallback(systemPrompt, [], { maxTokens: 3000, temperature: 0.6 })
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const cleaned = jsonMatch[0].replace(/,\s*([}\]])/g, "$1")
      aiData = JSON.parse(cleaned)
    }
  } catch (error: unknown) {
    console.warn("Failed to generate funding workspace with AI, falling back to sensible defaults", error)
  }

  const defaultBurn = Math.max(800, Math.round(budgetDollars * 0.15) || 1200)
  const workspace: FundingWorkspace = {
    generatedAt: new Date().toISOString(),
    cashBalance: budgetDollars,
    monthlyBurn: aiData.monthlyBurn !== undefined ? aiData.monthlyBurn : defaultBurn,
    fundingGoal: aiData.fundingGoal || 0,
    valuation: aiData.valuation || 0,
    dilutionPercent: aiData.dilutionPercent || 0,
    pitchDeck: DEFAULT_PITCH_DECK,
    // Programmes come only from the verified catalogue (Opportunities), never from AI.
    opportunities: [],
    recommendations: aiData.recommendations || [],
  };

  const metadata =
    project.metadata &&
    typeof project.metadata === "object" &&
    !Array.isArray(project.metadata)
      ? project.metadata
      : {};

  const { error } = await supabase
  .from("projects")
  .update({
    metadata: {
      ...metadata,
      funding_workspace: workspace as unknown as Json,
    },
  })
  .eq("id", project.id)

  if (error)
    return {
      success: false,
      error: "Could not save the generated workspace. Please try again.",
    };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/funding");
  return { success: true, workspace };
}

export async function saveFundingWorkspace(
  projectId: string,
  workspace: FundingWorkspace,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!isStorableObject(workspace)) return { success: false, error: "That is too much content to save. Shorten it and try again." };
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !projectId)
    return { success: false, error: "Please sign in to save changes." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, metadata")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return { success: false, error: "Project not found." };

  const metadata =
    project.metadata &&
    typeof project.metadata === "object" &&
    !Array.isArray(project.metadata)
      ? project.metadata
      : {};

  const { error } = await supabase
  .from("projects")
  .update({
    metadata: {
      ...metadata,
      funding_workspace: workspace as unknown as Json,
    },
  })
  .eq("id", projectId)

  if (error) return { success: false, error: "Could not save your changes. Please try again." };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/funding");
  return { success: true };
}
