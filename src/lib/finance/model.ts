/**
 * Startup financial model: inputs the founder enters, and the projections
 * derived from them. Pure functions, no I/O — everything here is unit tested.
 *
 * All amounts are in the model's own currency. Everything computed here is a
 * PROJECTION from the founder's assumptions, never actual results.
 */
import { z } from "zod"

export const COST_CATEGORIES = [
  "equipment",
  "registration",
  "infrastructure",
  "marketing",
  "personnel",
  "technology",
  "inventory",
  "other",
] as const
export type CostCategory = (typeof COST_CATEGORIES)[number]

export const HORIZONS = [12, 24, 36] as const

const amount = z.coerce.number().finite().min(0).max(1e13)
const pct = (min: number, max: number) => z.coerce.number().finite().min(min).max(max)
const id = z.string().trim().min(1).max(40)
const label = z.string().trim().max(120).default("")

export const financialModelSchema = z.object({
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
  horizonMonths: z.coerce.number().refine((n) => (HORIZONS as readonly number[]).includes(n)).default(12),
  /** Cash available on day one, before start-up costs are paid. */
  startingCash: amount.default(0),
  /** One-off costs paid before or at launch. */
  startupCosts: z
    .array(z.object({ id, category: z.enum(COST_CATEGORIES), label, amount }))
    .max(60)
    .default([]),
  revenueStreams: z
    .array(
      z.object({
        id,
        name: label,
        unitPrice: amount,
        /** Units (or customers, orders...) sold in the first month. */
        unitsMonth1: amount,
        /** Month-over-month growth in units, in percent. */
        monthlyGrowthPct: pct(-50, 200).default(0),
        /** Direct cost of delivering one unit. */
        variableCostPerUnit: amount.default(0),
      }),
    )
    .max(20)
    .default([]),
  /** Recurring monthly operating expenses (fixed costs). */
  monthlyExpenses: z
    .array(z.object({ id, category: z.enum(COST_CATEGORIES), label, amount }))
    .max(60)
    .default([]),
  /** Expected yearly increase of fixed costs, in percent. */
  expenseGrowthPctYearly: pct(0, 200).default(0),
  customers: z
    .object({
      /** New paying customers expected per month. */
      newPerMonth: amount.default(0),
      /** Average revenue from one customer per month. */
      revenuePerCustomerMonthly: amount.default(0),
      /** How many months a customer keeps buying, on average. */
      lifetimeMonths: amount.default(0),
    })
    .default({ newPerMonth: 0, revenuePerCustomerMonthly: 0, lifetimeMonths: 0 }),
})

export type FinancialModel = z.infer<typeof financialModelSchema>

export function emptyFinancialModel(currency: string): FinancialModel {
  return financialModelSchema.parse({ currency })
}

export function parseFinancialModel(content: unknown, fallbackCurrency: string): FinancialModel {
  const parsed = financialModelSchema.safeParse(content)
  return parsed.success ? parsed.data : emptyFinancialModel(fallbackCurrency)
}

export interface MonthProjection {
  month: number
  units: number
  revenue: number
  variableCosts: number
  grossProfit: number
  fixedCosts: number
  netProfit: number
  /** Cash at the end of the month. */
  cash: number
}

export interface FinancialSummary {
  currency: string
  horizonMonths: number
  totalStartupCosts: number
  startupCostsByCategory: Record<CostCategory, number>
  monthlyFixedCosts: number
  fixedCostsByCategory: Record<CostCategory, number>
  totalRevenue: number
  totalVariableCosts: number
  totalFixedCosts: number
  netProfit: number
  /** null when there is no revenue to divide by. */
  grossMarginPct: number | null
  netMarginPct: number | null
  /** Units per month needed to cover fixed costs; null when a unit earns no margin. */
  breakEvenUnitsPerMonth: number | null
  breakEvenRevenuePerMonth: number | null
  /** First month with a non-negative net result; null if not reached in the horizon. */
  breakEvenMonth: number | null
  /** First month in which all cash spent so far has been earned back; null if not reached. */
  paybackMonth: number | null
  lowestCash: number
  lowestCashMonth: number
  /** Extra money needed so cash never goes below zero. */
  fundingRequired: number
  /** Months until cash runs out; null when it never does in the horizon. */
  runwayMonths: number | null
  endingCash: number
  customerAcquisitionCost: number | null
  customerLifetimeValue: number | null
  ltvToCacRatio: number | null
}

const zeroByCategory = (): Record<CostCategory, number> => ({
  equipment: 0,
  registration: 0,
  infrastructure: 0,
  marketing: 0,
  personnel: 0,
  technology: 0,
  inventory: 0,
  other: 0,
})

const round = (value: number) => Math.round(value * 100) / 100

function sumByCategory(items: Array<{ category: CostCategory; amount: number }>) {
  const totals = zeroByCategory()
  for (const item of items) totals[item.category] += item.amount
  return totals
}

/** Month-by-month projection. Month 1 is the first month of trading. */
export function projectMonths(model: FinancialModel): MonthProjection[] {
  const startupCosts = model.startupCosts.reduce((sum, item) => sum + item.amount, 0)
  const baseFixed = model.monthlyExpenses.reduce((sum, item) => sum + item.amount, 0)
  let cash = model.startingCash - startupCosts
  const months: MonthProjection[] = []

  for (let month = 1; month <= model.horizonMonths; month++) {
    let units = 0
    let revenue = 0
    let variableCosts = 0
    for (const stream of model.revenueStreams) {
      const streamUnits = stream.unitsMonth1 * Math.pow(1 + stream.monthlyGrowthPct / 100, month - 1)
      units += streamUnits
      revenue += streamUnits * stream.unitPrice
      variableCosts += streamUnits * stream.variableCostPerUnit
    }
    // Fixed costs step up once a year.
    const fixedCosts = baseFixed * Math.pow(1 + model.expenseGrowthPctYearly / 100, Math.floor((month - 1) / 12))
    const grossProfit = revenue - variableCosts
    const netProfit = grossProfit - fixedCosts
    cash += netProfit
    months.push({
      month,
      units: round(units),
      revenue: round(revenue),
      variableCosts: round(variableCosts),
      grossProfit: round(grossProfit),
      fixedCosts: round(fixedCosts),
      netProfit: round(netProfit),
      cash: round(cash),
    })
  }
  return months
}

export function summarizeModel(model: FinancialModel, months = projectMonths(model)): FinancialSummary {
  const startupCostsByCategory = sumByCategory(model.startupCosts)
  const fixedCostsByCategory = sumByCategory(model.monthlyExpenses)
  const totalStartupCosts = Object.values(startupCostsByCategory).reduce((a, b) => a + b, 0)
  const monthlyFixedCosts = Object.values(fixedCostsByCategory).reduce((a, b) => a + b, 0)

  const totalRevenue = months.reduce((sum, m) => sum + m.revenue, 0)
  const totalVariableCosts = months.reduce((sum, m) => sum + m.variableCosts, 0)
  const totalFixedCosts = months.reduce((sum, m) => sum + m.fixedCosts, 0)
  const netProfit = totalRevenue - totalVariableCosts - totalFixedCosts

  // Break-even uses the month-1 sales mix: weighted price and unit cost.
  const unitsMonth1 = model.revenueStreams.reduce((sum, s) => sum + s.unitsMonth1, 0)
  const revenueMonth1 = model.revenueStreams.reduce((sum, s) => sum + s.unitsMonth1 * s.unitPrice, 0)
  const variableMonth1 = model.revenueStreams.reduce((sum, s) => sum + s.unitsMonth1 * s.variableCostPerUnit, 0)
  const avgPrice = unitsMonth1 > 0 ? revenueMonth1 / unitsMonth1 : 0
  const contribution = unitsMonth1 > 0 ? (revenueMonth1 - variableMonth1) / unitsMonth1 : 0
  const breakEvenUnitsPerMonth = contribution > 0 ? monthlyFixedCosts / contribution : null

  const startCash = model.startingCash - totalStartupCosts
  let lowestCash = startCash
  let lowestCashMonth = 0
  let runwayMonths: number | null = startCash < 0 ? 0 : null
  for (const m of months) {
    if (m.cash < lowestCash) {
      lowestCash = m.cash
      lowestCashMonth = m.month
    }
    if (runwayMonths === null && m.cash < 0) runwayMonths = m.month - 1
  }

  const marketingMonthly = fixedCostsByCategory.marketing
  const { newPerMonth, revenuePerCustomerMonthly, lifetimeMonths } = model.customers
  const grossMargin = totalRevenue > 0 ? (totalRevenue - totalVariableCosts) / totalRevenue : null
  const cac = newPerMonth > 0 && marketingMonthly > 0 ? marketingMonthly / newPerMonth : null
  const ltv =
    revenuePerCustomerMonthly > 0 && lifetimeMonths > 0 && grossMargin !== null
      ? revenuePerCustomerMonthly * lifetimeMonths * grossMargin
      : null

  const paybackMonth = months.find((m) => m.cash >= model.startingCash)?.month ?? null

  return {
    currency: model.currency,
    horizonMonths: model.horizonMonths,
    totalStartupCosts: round(totalStartupCosts),
    startupCostsByCategory,
    monthlyFixedCosts: round(monthlyFixedCosts),
    fixedCostsByCategory,
    totalRevenue: round(totalRevenue),
    totalVariableCosts: round(totalVariableCosts),
    totalFixedCosts: round(totalFixedCosts),
    netProfit: round(netProfit),
    grossMarginPct: grossMargin === null ? null : round(grossMargin * 100),
    netMarginPct: totalRevenue > 0 ? round((netProfit / totalRevenue) * 100) : null,
    breakEvenUnitsPerMonth: breakEvenUnitsPerMonth === null ? null : Math.ceil(breakEvenUnitsPerMonth),
    breakEvenRevenuePerMonth: breakEvenUnitsPerMonth === null ? null : round(breakEvenUnitsPerMonth * avgPrice),
    breakEvenMonth: months.find((m) => m.revenue > 0 && m.netProfit >= 0)?.month ?? null,
    paybackMonth: totalStartupCosts > 0 ? paybackMonth : null,
    lowestCash: round(lowestCash),
    lowestCashMonth,
    fundingRequired: round(Math.max(0, -lowestCash)),
    runwayMonths,
    endingCash: months.length ? months[months.length - 1].cash : round(startCash),
    customerAcquisitionCost: cac === null ? null : round(cac),
    customerLifetimeValue: ltv === null ? null : round(ltv),
    ltvToCacRatio: cac && ltv !== null ? round(ltv / cac) : null,
  }
}

/** True once the founder has entered enough to project anything meaningful. */
export function modelHasData(model: FinancialModel): boolean {
  return (
    model.startupCosts.some((c) => c.amount > 0) ||
    model.monthlyExpenses.some((c) => c.amount > 0) ||
    model.revenueStreams.some((s) => s.unitPrice > 0 && s.unitsMonth1 > 0)
  )
}

/** Yearly roll-up for the profit-and-loss view. */
export function yearlyTotals(months: MonthProjection[]) {
  const years: Array<{ year: number; revenue: number; variableCosts: number; grossProfit: number; fixedCosts: number; netProfit: number; endingCash: number }> = []
  for (let start = 0; start < months.length; start += 12) {
    const slice = months.slice(start, start + 12)
    const sum = (key: "revenue" | "variableCosts" | "grossProfit" | "fixedCosts" | "netProfit") =>
      round(slice.reduce((total, m) => total + m[key], 0))
    years.push({
      year: start / 12 + 1,
      revenue: sum("revenue"),
      variableCosts: sum("variableCosts"),
      grossProfit: sum("grossProfit"),
      fixedCosts: sum("fixedCosts"),
      netProfit: sum("netProfit"),
      endingCash: slice[slice.length - 1].cash,
    })
  }
  return years
}
