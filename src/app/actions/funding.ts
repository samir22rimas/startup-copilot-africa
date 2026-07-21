"use server";

import { createSupabaseServerClient } from "@/src/lib/supabase/server";
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

const DEFAULT_OPPORTUNITIES: FundingOpportunity[] = [
  {
    name: "Tony Elumelu Foundation (TEF) Entrepreneurship Programme",
    type: "Grant",
    amountRange: "$5,000 (Non-dilutive seed capital)",
    focus:
      "All sectors, early-stage African startups with commercial potential.",
    link: "https://www.tonyelumelufoundation.org",
    deadline: "Q1 annually",
  },
  {
    name: "Google for Startups Accelerator: Africa",
    type: "Equity-Free Accelerator",
    amountRange: "$100,000+ in Google Cloud Credits & Mentorship",
    focus: "Tech startups solving regional challenges in Africa.",
    link: "https://startup.google.com/accelerator/africa",
    deadline: "Rolling / Seasonal",
  },
  {
    name: "Savanna VC (Pre-seed Fund)",
    type: "Equity Investment",
    amountRange: "$50,000 - $150,000",
    focus: "Fintech, Logistics, Agtech, Healthtech builders across SSA.",
    link: "https://savanna.vc",
    deadline: "Open year-round",
  },
  {
    name: "Launch Africa Ventures",
    type: "Seed Fund",
    amountRange: "$100,000 - $250,000",
    focus: "B2B and B2B2C early-stage digital tech startups across Africa.",
    link: "https://launch.africa",
    deadline: "Open year-round",
  },
];

export async function generateFundingWorkspace(
  projectId: string,
): Promise<
  | { success: true; workspace: FundingWorkspace }
  | { success: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !projectId)
    return {
      success: false,
      error: "Please sign in to generate your workspace.",
    };

  const { data: startup } = await supabase
    .from("startups")
    .select("id, name, estimated_budget_cents, budget_currency")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!startup)
    return { success: false, error: "Your startup could not be found." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, metadata")
    .eq("id", projectId)
    .eq("startup_id", startup.id)
    .maybeSingle();
  if (!project)
    return { success: false, error: "This project is not available to you." };

  const budgetDollars = (startup.estimated_budget_cents || 0) / 100;

  const workspace: FundingWorkspace = {
    generatedAt: new Date().toISOString(),
    cashBalance: budgetDollars || 5000,
    monthlyBurn: Math.round((budgetDollars || 5000) / 6) || 800,
    fundingGoal: 50000,
    valuation: 350000,
    dilutionPercent: 12.5,
    pitchDeck: DEFAULT_PITCH_DECK,
    opportunities: DEFAULT_OPPORTUNITIES,
    recommendations: [
      {
        title: "Structure capital ask based on local milestones",
        detail: `Aim to raise 50,000 ${startup.budget_currency || "USD"} in Pre-Seed funding. This capital should fund 18 months of runway to validate your initial target audience, set up local merchant payment flows, and reach positive unit economics.`,
      },
      {
        title: "Tailor pitch story to operational realities",
        detail:
          "Focus on highlighting how your solution solves local infrastructure hurdles, payment frictions, or distribution challenges that international platforms fail to address.",
      },
      {
        title: "Leverage regional networks & local angel groups",
        detail:
          "Before pitching institutional funds, target local angel networks (e.g. Cairo Angels, Jozi Angels, Nairobi Angels) for early support and validation.",
      },
    ],
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

  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/funding");
  return { success: true };
}
