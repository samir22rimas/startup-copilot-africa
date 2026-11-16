import { describe, expect, it } from "vitest"

import { computeBusinessHealth, healthBand, recommendActions, type HealthInputs } from "@/src/lib/health/score"
import { IDEA_CRITERIA, computeIdeaScore, ideaSchema, ideaScoreBreakdown, ideaVerdict, type IdeaRatings } from "@/src/lib/ideas/score"

const emptyInputs = (): HealthInputs => ({
  stage: "idea",
  validation: { assumptions: 0, tested: 0, invalidated: 0, evidence: 0, analyses: 0 },
  planning: { canvasFilled: 0, canvasTotal: 9, planSections: 0, planTotal: 17 },
  finance: { hasModel: false, startupCostLines: 0, revenueStreams: 0, expenseLines: 0, breakEvenMonth: null, fundingRequired: null, horizonMonths: null },
  marketing: { analyses: 0, hasStrategy: false, scheduledContent: 0 },
  execution: { total: 0, done: 0, overdue: 0, blocked: 0, milestones: 0, overdueMilestones: 0 },
})

describe("business health", () => {
  it("shows no score at all for an empty workspace", () => {
    const health = computeBusinessHealth(emptyInputs())
    expect(health.overall).toBeNull()
    expect(health.measured).toBe(0)
    expect(health.dimensions.every((dimension) => dimension.score === null)).toBe(true)
  })

  it("needs two measured dimensions before giving an overall score", () => {
    const inputs = emptyInputs()
    inputs.execution = { total: 4, done: 2, overdue: 0, blocked: 0, milestones: 0, overdueMilestones: 0 }
    const one = computeBusinessHealth(inputs)
    expect(one.measured).toBe(1)
    expect(one.overall).toBeNull()

    inputs.planning.canvasFilled = 9
    const two = computeBusinessHealth(inputs)
    expect(two.measured).toBe(2)
    expect(two.overall).not.toBeNull()
  })

  it("every score is the sum of its signals", () => {
    const inputs = emptyInputs()
    inputs.validation = { assumptions: 5, tested: 5, invalidated: 1, evidence: 10, analyses: 3 }
    inputs.planning = { canvasFilled: 9, canvasTotal: 9, planSections: 17, planTotal: 17 }
    inputs.finance = { hasModel: true, startupCostLines: 2, revenueStreams: 1, expenseLines: 3, breakEvenMonth: 4, fundingRequired: 0, horizonMonths: 12 }
    inputs.marketing = { analyses: 3, hasStrategy: true, scheduledContent: 4 }
    inputs.execution = { total: 10, done: 10, overdue: 0, blocked: 0, milestones: 2, overdueMilestones: 0 }
    const health = computeBusinessHealth(inputs)

    for (const dimension of health.dimensions) {
      const earned = dimension.signals.reduce((sum, s) => sum + s.earned, 0)
      const max = dimension.signals.reduce((sum, s) => sum + s.max, 0)
      expect(max).toBe(100)
      expect(dimension.score).toBe(earned)
      expect(dimension.score).toBe(100)
    }
    expect(health.overall).toBe(100)
  })

  it("penalises overdue and blocked work", () => {
    const base = emptyInputs()
    base.execution = { total: 10, done: 5, overdue: 0, blocked: 0, milestones: 0, overdueMilestones: 0 }
    const late = emptyInputs()
    late.execution = { total: 10, done: 5, overdue: 5, blocked: 2, milestones: 0, overdueMilestones: 0 }
    const score = (i: HealthInputs) => computeBusinessHealth(i).dimensions.find((d) => d.key === "execution")!.score!
    expect(score(late)).toBeLessThan(score(base))
  })

  it("does not reward a financial model for break-even it does not reach", () => {
    const inputs = emptyInputs()
    inputs.finance = { hasModel: true, startupCostLines: 1, revenueStreams: 1, expenseLines: 1, breakEvenMonth: null, fundingRequired: 50_000, horizonMonths: 12 }
    const finance = computeBusinessHealth(inputs).dimensions.find((d) => d.key === "finance")!
    expect(finance.score).toBe(50)
    expect(finance.signals.find((s) => s.key === "breakEven")!.earned).toBe(0)
    expect(finance.signals.find((s) => s.key === "fundingCovered")!.earned).toBe(0)
  })

  it("maps scores to bands", () => {
    expect(healthBand(80)).toBe("strong")
    expect(healthBand(60)).toBe("steady")
    expect(healthBand(40)).toBe("attention")
    expect(healthBand(10)).toBe("early")
  })
})

describe("recommendations", () => {
  it("starts an idea-stage founder with validation", () => {
    const actions = recommendActions(emptyInputs())
    expect(actions[0].key).toBe("listAssumptions")
    expect(actions.length).toBeLessThanOrEqual(5)
  })

  it("puts overdue and blocked work first at any stage", () => {
    const inputs = emptyInputs()
    inputs.stage = "growth"
    inputs.execution = { total: 6, done: 1, overdue: 3, blocked: 1, milestones: 0, overdueMilestones: 0 }
    const keys = recommendActions(inputs).map((a) => a.key)
    expect(keys.slice(0, 2)).toEqual(["clearOverdue", "unblockTasks"])
  })

  it("orders by what matters at the stage", () => {
    const early = recommendActions({ ...emptyInputs(), stage: "validation" }).map((a) => a.key)
    const later = recommendActions({ ...emptyInputs(), stage: "growth" }).map((a) => a.key)
    expect(early.indexOf("listAssumptions")).toBeLessThan(early.indexOf("startFinance"))
    expect(later.indexOf("startFinance")).toBeLessThan(later.indexOf("startCanvas"))
  })

  it("flags a funding gap and missing break-even", () => {
    const inputs = emptyInputs()
    inputs.stage = "growth"
    inputs.finance = { hasModel: true, startupCostLines: 1, revenueStreams: 1, expenseLines: 1, breakEvenMonth: null, fundingRequired: 10, horizonMonths: 24 }
    const actions = recommendActions(inputs)
    expect(actions.map((a) => a.key)).toEqual(expect.arrayContaining(["closeFundingGap", "noBreakEven"]))
    expect(actions.find((a) => a.key === "noBreakEven")!.values.horizon).toBe(24)
  })
})

const ratings = (value: number): IdeaRatings => ({
  problemUrgency: { rating: value, reason: "" },
  marketPotential: { rating: value, reason: "" },
  capitalFit: { rating: value, reason: "" },
  feasibility: { rating: value, reason: "" },
  founderFit: { rating: value, reason: "" },
  riskLevel: { rating: value, reason: "" },
})

describe("idea evaluation score", () => {
  it("weights add up to 100", () => {
    expect(IDEA_CRITERIA.reduce((sum, c) => sum + c.weight, 0)).toBe(100)
  })

  it("is 0 for all ones, 100 for all fives, 50 for all threes", () => {
    expect(computeIdeaScore(ratings(1))).toBe(0)
    expect(computeIdeaScore(ratings(5))).toBe(100)
    expect(computeIdeaScore(ratings(3))).toBe(50)
  })

  it("breakdown points sum to the score", () => {
    const mixed = { ...ratings(3), problemUrgency: { rating: 5, reason: "" }, riskLevel: { rating: 1, reason: "" } }
    const total = ideaScoreBreakdown(mixed).reduce((sum, row) => sum + row.points, 0)
    expect(total).toBeCloseTo(computeIdeaScore(mixed), 5)
    expect(computeIdeaScore(mixed)).toBe(55)
  })

  it("gives a verdict band", () => {
    expect(ideaVerdict(80)).toBe("strong")
    expect(ideaVerdict(60)).toBe("promising")
    expect(ideaVerdict(40)).toBe("uncertain")
    expect(ideaVerdict(20)).toBe("weak")
  })

  it("clamps out-of-range ratings from the model and normalises fields", () => {
    const parsed = ideaSchema.parse({
      title: "Campus printing",
      summary: "Affordable printing next to campus.",
      problem: "Students queue for expensive printing.",
      customerSegments: ["Students"],
      revenueModel: "Per page",
      startupCapital: { low: "150000", high: 400000, currency: "xaf", assumptions: "One printer, paper, rent deposit" },
      complexity: "LOW",
      risks: ["Power cuts"],
      firstSteps: ["Count the queue at peak hours"],
      ratings: { ...ratings(3), problemUrgency: { rating: 9, reason: "x" }, riskLevel: { rating: 0, reason: "y" } },
    })
    expect(parsed.ratings.problemUrgency.rating).toBe(5)
    expect(parsed.ratings.riskLevel.rating).toBe(1)
    expect(parsed.complexity).toBe("low")
    expect(parsed.startupCapital).toMatchObject({ low: 150000, currency: "XAF" })
  })
})
