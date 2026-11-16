/**
 * Idea Evaluation Score.
 *
 * Transparent by design: six criteria, each rated 1-5 with a written reason,
 * combined with fixed weights that are shown to the user. The AI proposes the
 * ratings; the arithmetic happens here, so the same ratings always give the
 * same score and the founder can change a rating and see the effect.
 */
import { z } from "zod"

export const IDEA_CRITERIA = [
  { key: "problemUrgency", weight: 20 },
  { key: "marketPotential", weight: 20 },
  { key: "capitalFit", weight: 20 },
  { key: "feasibility", weight: 15 },
  { key: "founderFit", weight: 15 },
  { key: "riskLevel", weight: 10 },
] as const

export type IdeaCriterionKey = (typeof IDEA_CRITERIA)[number]["key"]

const ratingSchema = z.object({
  rating: z.coerce.number().transform((n) => Math.min(5, Math.max(1, Math.round(n)))),
  reason: z.string().trim().max(400).default(""),
})

export const ideaRatingsSchema = z.object({
  problemUrgency: ratingSchema,
  marketPotential: ratingSchema,
  capitalFit: ratingSchema,
  feasibility: ratingSchema,
  founderFit: ratingSchema,
  riskLevel: ratingSchema,
})

export type IdeaRatings = z.infer<typeof ideaRatingsSchema>

/** 0-100, one decimal. A rating of 1 contributes nothing, 5 contributes the full weight. */
export function computeIdeaScore(ratings: IdeaRatings): number {
  const total = IDEA_CRITERIA.reduce((sum, { key, weight }) => sum + weight * ((ratings[key].rating - 1) / 4), 0)
  return Math.round(total * 10) / 10
}

/** Points each criterion contributes, for the score breakdown. */
export function ideaScoreBreakdown(ratings: IdeaRatings) {
  return IDEA_CRITERIA.map(({ key, weight }) => ({
    key,
    weight,
    rating: ratings[key].rating,
    reason: ratings[key].reason,
    points: Math.round(weight * ((ratings[key].rating - 1) / 4) * 10) / 10,
  }))
}

export type IdeaVerdict = "strong" | "promising" | "uncertain" | "weak"

export function ideaVerdict(score: number): IdeaVerdict {
  if (score >= 75) return "strong"
  if (score >= 55) return "promising"
  if (score >= 35) return "uncertain"
  return "weak"
}

const text = (max: number) => z.string().trim().min(1).max(max)

export const ideaSchema = z.object({
  title: text(120),
  summary: text(600),
  problem: text(500),
  customerSegments: z.array(text(200)).min(1).max(5),
  revenueModel: text(400),
  startupCapital: z.object({
    low: z.coerce.number().nonnegative(),
    high: z.coerce.number().nonnegative(),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
    assumptions: text(500),
  }),
  complexity: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.enum(["low", "medium", "high"]),
  ),
  risks: z.array(text(300)).min(1).max(5),
  firstSteps: z.array(text(300)).min(1).max(5),
  ratings: ideaRatingsSchema,
})

export type GeneratedIdea = z.infer<typeof ideaSchema>

export const ideasResponseSchema = z.object({ ideas: z.array(ideaSchema).min(1).max(6) })

export const IDEAS_SHAPE = `{
  "ideas": [
    {
      "title": "short name of the business idea",
      "summary": "what the business does, in 2-3 sentences",
      "problem": "the local problem it solves and for whom",
      "customerSegments": ["specific customer group", "..."],
      "revenueModel": "how it earns money",
      "startupCapital": { "low": 0, "high": 0, "currency": "ISO code of the local currency", "assumptions": "what this estimate covers and assumes" },
      "complexity": "low" | "medium" | "high",
      "risks": ["main risk", "..."],
      "firstSteps": ["first concrete step to test the idea", "..."],
      "ratings": {
        "problemUrgency":  { "rating": 1-5, "reason": "why" },
        "marketPotential": { "rating": 1-5, "reason": "why" },
        "capitalFit":      { "rating": 1-5, "reason": "why" },
        "feasibility":     { "rating": 1-5, "reason": "why" },
        "founderFit":      { "rating": 1-5, "reason": "why" },
        "riskLevel":       { "rating": 1-5, "reason": "why" }
      }
    }
  ]
}
Rating guide (5 is always best):
- problemUrgency: 5 = frequent, painful problem people already spend money to solve; 1 = mild inconvenience.
- marketPotential: 5 = many reachable customers able to pay; 1 = tiny or hard-to-reach market.
- capitalFit: 5 = can start well within the founder's stated budget; 1 = needs far more capital than available.
- feasibility: 5 = simple to launch with common skills and tools; 1 = complex operations, technology or licences.
- founderFit: 5 = matches the founder's stated skills, studies and interests closely; 1 = no connection.
- riskLevel: 5 = low risk; 1 = high regulatory, competitive or operational risk.
The capital range is an ESTIMATE in local currency: say what it includes. Be honest — do not rate everything 4 or 5.`
