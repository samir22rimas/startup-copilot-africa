/**
 * Business Health scoring — explainable by construction.
 *
 * Every dimension is a list of signals. Each signal says what was measured in
 * the workspace, how many points it earned and how many were available, so a
 * score can always be traced to real data. A dimension with no data returns
 * `score: null` ("not enough information") instead of an invented number, and
 * the overall score exists only when at least two dimensions have data.
 *
 * These scores measure how complete and on-track the founder's work in Anza
 * is. They are not a measure of market traction or commercial performance.
 */
import type { StartupStage } from "@/src/lib/database.types"

export interface HealthInputs {
  stage: StartupStage
  validation: {
    assumptions: number
    /** Assumptions marked validated or invalidated: either way, they were tested. */
    tested: number
    invalidated: number
    evidence: number
    analyses: number
  }
  planning: {
    canvasFilled: number
    canvasTotal: number
    planSections: number
    planTotal: number
  }
  finance: {
    hasModel: boolean
    startupCostLines: number
    revenueStreams: number
    expenseLines: number
    breakEvenMonth: number | null
    fundingRequired: number | null
    horizonMonths: number | null
  }
  marketing: {
    analyses: number
    hasStrategy: boolean
    scheduledContent: number
  }
  execution: {
    total: number
    done: number
    overdue: number
    blocked: number
    milestones: number
    overdueMilestones: number
  }
}

export type DimensionKey = "validation" | "planning" | "finance" | "marketing" | "execution"

export type SignalKey =
  | "assumptionsListed"
  | "assumptionsTested"
  | "evidenceRecorded"
  | "validationAnalyses"
  | "canvasBlocks"
  | "planSections"
  | "startupCosts"
  | "revenueStreams"
  | "operatingExpenses"
  | "breakEven"
  | "fundingCovered"
  | "marketingStrategy"
  | "marketingAnalyses"
  | "contentScheduled"
  | "tasksCompleted"
  | "tasksOnTime"
  | "tasksUnblocked"
  | "milestonesOnTime"

export interface HealthSignal {
  key: SignalKey
  earned: number
  max: number
  /** Numbers for the explanation text, e.g. { count: 3, total: 9 }. */
  values: Record<string, number>
}

export interface HealthDimension {
  key: DimensionKey
  /** 0-100, or null when there is nothing to measure yet. */
  score: number | null
  signals: HealthSignal[]
}

export interface BusinessHealth {
  overall: number | null
  dimensions: HealthDimension[]
  /** How many dimensions have data. */
  measured: number
}

const ratio = (part: number, whole: number) => (whole > 0 ? Math.min(1, Math.max(0, part / whole)) : 0)
const points = (max: number, fraction: number) => Math.round(max * Math.min(1, Math.max(0, fraction)))

function finish(key: DimensionKey, hasData: boolean, signals: HealthSignal[]): HealthDimension {
  if (!hasData) return { key, score: null, signals }
  const max = signals.reduce((sum, signal) => sum + signal.max, 0)
  const earned = signals.reduce((sum, signal) => sum + signal.earned, 0)
  return { key, score: max > 0 ? Math.round((earned / max) * 100) : null, signals }
}

function validation(input: HealthInputs["validation"]): HealthDimension {
  const hasData = input.assumptions + input.evidence + input.analyses > 0
  return finish("validation", hasData, [
    { key: "assumptionsListed", max: 20, earned: points(20, ratio(input.assumptions, 5)), values: { count: input.assumptions, target: 5 } },
    { key: "assumptionsTested", max: 30, earned: points(30, ratio(input.tested, input.assumptions)), values: { count: input.tested, total: input.assumptions } },
    { key: "evidenceRecorded", max: 35, earned: points(35, ratio(input.evidence, 10)), values: { count: input.evidence, target: 10 } },
    { key: "validationAnalyses", max: 15, earned: points(15, ratio(input.analyses, 3)), values: { count: input.analyses, target: 3 } },
  ])
}

function planning(input: HealthInputs["planning"]): HealthDimension {
  const hasData = input.canvasFilled + input.planSections > 0
  return finish("planning", hasData, [
    { key: "canvasBlocks", max: 40, earned: points(40, ratio(input.canvasFilled, input.canvasTotal)), values: { count: input.canvasFilled, total: input.canvasTotal } },
    { key: "planSections", max: 60, earned: points(60, ratio(input.planSections, input.planTotal)), values: { count: input.planSections, total: input.planTotal } },
  ])
}

function finance(input: HealthInputs["finance"]): HealthDimension {
  const complete = input.revenueStreams > 0 && input.expenseLines + input.startupCostLines > 0
  return finish("finance", input.hasModel, [
    { key: "startupCosts", max: 15, earned: input.startupCostLines > 0 ? 15 : 0, values: { count: input.startupCostLines } },
    { key: "revenueStreams", max: 20, earned: input.revenueStreams > 0 ? 20 : 0, values: { count: input.revenueStreams } },
    { key: "operatingExpenses", max: 15, earned: input.expenseLines > 0 ? 15 : 0, values: { count: input.expenseLines } },
    {
      key: "breakEven",
      max: 25,
      earned: complete && input.breakEvenMonth !== null ? 25 : 0,
      values: { month: input.breakEvenMonth ?? 0, horizon: input.horizonMonths ?? 0, reached: input.breakEvenMonth !== null ? 1 : 0 },
    },
    {
      key: "fundingCovered",
      max: 25,
      earned: complete && input.fundingRequired === 0 ? 25 : 0,
      values: { covered: input.fundingRequired === 0 ? 1 : 0 },
    },
  ])
}

function marketing(input: HealthInputs["marketing"]): HealthDimension {
  const hasData = input.analyses + input.scheduledContent > 0
  return finish("marketing", hasData, [
    { key: "marketingStrategy", max: 40, earned: input.hasStrategy ? 40 : 0, values: { done: input.hasStrategy ? 1 : 0 } },
    { key: "marketingAnalyses", max: 30, earned: points(30, ratio(input.analyses, 3)), values: { count: input.analyses, target: 3 } },
    { key: "contentScheduled", max: 30, earned: points(30, ratio(input.scheduledContent, 4)), values: { count: input.scheduledContent, target: 4 } },
  ])
}

function execution(input: HealthInputs["execution"]): HealthDimension {
  const open = input.total - input.done
  const signals: HealthSignal[] = [
    { key: "tasksCompleted", max: 50, earned: points(50, ratio(input.done, input.total)), values: { count: input.done, total: input.total } },
    { key: "tasksOnTime", max: 25, earned: open > 0 ? points(25, 1 - ratio(input.overdue, open)) : 25, values: { count: input.overdue } },
    { key: "tasksUnblocked", max: 10, earned: open > 0 ? points(10, 1 - ratio(input.blocked, open)) : 10, values: { count: input.blocked } },
  ]
  if (input.milestones > 0) {
    signals.push({
      key: "milestonesOnTime",
      max: 15,
      earned: points(15, 1 - ratio(input.overdueMilestones, input.milestones)),
      values: { count: input.overdueMilestones, total: input.milestones },
    })
  }
  return finish("execution", input.total > 0, signals)
}

export function computeBusinessHealth(input: HealthInputs): BusinessHealth {
  const dimensions = [
    validation(input.validation),
    planning(input.planning),
    finance(input.finance),
    marketing(input.marketing),
    execution(input.execution),
  ]
  const scored = dimensions.filter((dimension): dimension is HealthDimension & { score: number } => dimension.score !== null)
  return {
    dimensions,
    measured: scored.length,
    overall: scored.length >= 2 ? Math.round(scored.reduce((sum, d) => sum + d.score, 0) / scored.length) : null,
  }
}

export type HealthBand = "strong" | "steady" | "attention" | "early"

export function healthBand(score: number): HealthBand {
  if (score >= 75) return "strong"
  if (score >= 55) return "steady"
  if (score >= 35) return "attention"
  return "early"
}

// --- Recommendations ----------------------------------------------------------

export type RecommendationKey =
  | "listAssumptions"
  | "recordEvidence"
  | "testAssumptions"
  | "reviewInvalidated"
  | "startCanvas"
  | "finishCanvas"
  | "startPlan"
  | "finishPlan"
  | "startFinance"
  | "addRevenue"
  | "closeFundingGap"
  | "noBreakEven"
  | "marketingStrategy"
  | "scheduleContent"
  | "planObjective"
  | "clearOverdue"
  | "unblockTasks"
  | "exploreOpportunities"

export interface Recommendation {
  key: RecommendationKey
  href: string
  values: Record<string, number>
}

/** What each stage should care about first; later entries are lower priority. */
const STAGE_PRIORITIES: Record<StartupStage, DimensionKey[]> = {
  idea: ["validation", "planning", "execution", "finance", "marketing"],
  validation: ["validation", "planning", "finance", "execution", "marketing"],
  mvp: ["execution", "planning", "finance", "validation", "marketing"],
  early_revenue: ["execution", "finance", "marketing", "planning", "validation"],
  growth: ["finance", "marketing", "execution", "planning", "validation"],
  scale: ["finance", "execution", "marketing", "planning", "validation"],
}

/**
 * Next best actions, derived only from what is (or is not) in the workspace
 * and ordered by what matters at the business's stage.
 */
export function recommendActions(input: HealthInputs, limit = 5): Recommendation[] {
  const byDimension: Record<DimensionKey, Recommendation[]> = { validation: [], planning: [], finance: [], marketing: [], execution: [] }
  const { validation: v, planning: p, finance: f, marketing: m, execution: e } = input

  if (v.assumptions === 0) byDimension.validation.push({ key: "listAssumptions", href: "/dashboard/validation", values: {} })
  else if (v.evidence < 5) byDimension.validation.push({ key: "recordEvidence", href: "/dashboard/validation", values: { count: v.evidence } })
  if (v.assumptions > 0 && v.tested < v.assumptions) {
    byDimension.validation.push({ key: "testAssumptions", href: "/dashboard/validation", values: { count: v.assumptions - v.tested } })
  }
  if (v.invalidated > 0) byDimension.validation.push({ key: "reviewInvalidated", href: "/dashboard/validation", values: { count: v.invalidated } })

  if (p.canvasFilled === 0) byDimension.planning.push({ key: "startCanvas", href: "/dashboard/model", values: {} })
  else if (p.canvasFilled < p.canvasTotal) {
    byDimension.planning.push({ key: "finishCanvas", href: "/dashboard/model", values: { count: p.canvasTotal - p.canvasFilled } })
  }
  if (p.planSections === 0) byDimension.planning.push({ key: "startPlan", href: "/dashboard/plan", values: {} })
  else if (p.planSections < p.planTotal) {
    byDimension.planning.push({ key: "finishPlan", href: "/dashboard/plan", values: { count: p.planTotal - p.planSections } })
  }

  if (!f.hasModel) byDimension.finance.push({ key: "startFinance", href: "/dashboard/finance", values: {} })
  else if (f.revenueStreams === 0) byDimension.finance.push({ key: "addRevenue", href: "/dashboard/finance", values: {} })
  else {
    if (f.fundingRequired !== null && f.fundingRequired > 0) byDimension.finance.push({ key: "closeFundingGap", href: "/dashboard/finance", values: {} })
    if (f.breakEvenMonth === null) byDimension.finance.push({ key: "noBreakEven", href: "/dashboard/finance", values: { horizon: f.horizonMonths ?? 12 } })
  }

  if (!m.hasStrategy) byDimension.marketing.push({ key: "marketingStrategy", href: "/dashboard/marketing", values: {} })
  else if (m.scheduledContent === 0) byDimension.marketing.push({ key: "scheduleContent", href: "/dashboard/marketing", values: {} })

  if (e.overdue > 0) byDimension.execution.push({ key: "clearOverdue", href: "/dashboard/projects", values: { count: e.overdue } })
  if (e.blocked > 0) byDimension.execution.push({ key: "unblockTasks", href: "/dashboard/projects", values: { count: e.blocked } })
  if (e.total === 0 || e.total === e.done) byDimension.execution.push({ key: "planObjective", href: "/dashboard/projects", values: {} })

  // Overdue and blocked work is urgent at any stage.
  const urgent = byDimension.execution.filter((r) => r.key === "clearOverdue" || r.key === "unblockTasks")
  const rest = STAGE_PRIORITIES[input.stage].flatMap((dimension) => byDimension[dimension]).filter((r) => !urgent.includes(r))
  const ordered = [...urgent, ...rest]

  if (ordered.length < limit && (input.stage === "early_revenue" || input.stage === "growth" || input.stage === "scale" || input.stage === "mvp")) {
    ordered.push({ key: "exploreOpportunities", href: "/dashboard/opportunities", values: {} })
  }
  return ordered.slice(0, limit)
}
