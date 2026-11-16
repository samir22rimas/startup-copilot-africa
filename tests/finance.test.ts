import { describe, expect, it } from "vitest"

import { breakEven, cashFlow, monthlyOperatingExpenses, pricing, profitMargin, revenueGrowth, startupCapital } from "@/src/lib/finance/calculators"
import { convertAmount, formatMoney, isSupportedCurrency } from "@/src/lib/finance/currency"
import { financialModelSchema, modelHasData, projectMonths, summarizeModel, yearlyTotals, type FinancialModel } from "@/src/lib/finance/model"

function model(overrides: Partial<FinancialModel> = {}): FinancialModel {
  return financialModelSchema.parse({
    currency: "XAF",
    horizonMonths: 12,
    startingCash: 1_000_000,
    startupCosts: [{ id: "a", category: "equipment", label: "Oven", amount: 400_000 }],
    revenueStreams: [{ id: "r", name: "Bread", unitPrice: 500, unitsMonth1: 1000, monthlyGrowthPct: 0, variableCostPerUnit: 200 }],
    monthlyExpenses: [
      { id: "e1", category: "infrastructure", label: "Rent", amount: 150_000 },
      { id: "e2", category: "marketing", label: "Flyers", amount: 50_000 },
    ],
    customers: { newPerMonth: 25, revenuePerCustomerMonthly: 10_000, lifetimeMonths: 6 },
    ...overrides,
  })
}

describe("financial model projections", () => {
  it("projects revenue, costs and cash month by month", () => {
    const months = projectMonths(model())
    expect(months).toHaveLength(12)
    // 1000 units x 500 = 500k revenue; 200k direct costs; 200k fixed; net +100k.
    expect(months[0]).toMatchObject({ revenue: 500_000, variableCosts: 200_000, fixedCosts: 200_000, netProfit: 100_000 })
    // Starting cash 1,000,000 - 400,000 start-up costs + 100,000.
    expect(months[0].cash).toBe(700_000)
    expect(months[11].cash).toBe(600_000 + 12 * 100_000)
  })

  it("compounds monthly growth", () => {
    const months = projectMonths(model({ revenueStreams: [{ id: "r", name: "", unitPrice: 100, unitsMonth1: 100, monthlyGrowthPct: 10, variableCostPerUnit: 0 }] }))
    expect(months[1].units).toBeCloseTo(110, 5)
    expect(months[2].revenue).toBeCloseTo(12_100, 2)
  })

  it("steps fixed costs up once a year", () => {
    const months = projectMonths(model({ horizonMonths: 24, expenseGrowthPctYearly: 10 }))
    expect(months[11].fixedCosts).toBe(200_000)
    expect(months[12].fixedCosts).toBe(220_000)
  })

  it("computes break-even, margins and unit economics", () => {
    const summary = summarizeModel(model())
    expect(summary.totalStartupCosts).toBe(400_000)
    expect(summary.monthlyFixedCosts).toBe(200_000)
    // Contribution per unit is 300, so 200,000 / 300 = 666.67 -> 667 units.
    expect(summary.breakEvenUnitsPerMonth).toBe(667)
    expect(summary.grossMarginPct).toBe(60)
    expect(summary.breakEvenMonth).toBe(1)
    expect(summary.fundingRequired).toBe(0)
    expect(summary.runwayMonths).toBeNull()
    // CAC = 50,000 marketing / 25 customers; LTV = 10,000 x 6 months x 60% margin.
    expect(summary.customerAcquisitionCost).toBe(2000)
    expect(summary.customerLifetimeValue).toBe(36_000)
    expect(summary.ltvToCacRatio).toBe(18)
  })

  it("reports the funding gap and runway when cash runs out", () => {
    const summary = summarizeModel(
      model({
        startingCash: 500_000,
        revenueStreams: [{ id: "r", name: "", unitPrice: 500, unitsMonth1: 100, monthlyGrowthPct: 0, variableCostPerUnit: 200 }],
      }),
    )
    // Net is 30,000 - 200,000 = -170,000 a month from an opening 100,000.
    expect(summary.breakEvenMonth).toBeNull()
    expect(summary.runwayMonths).toBe(0)
    expect(summary.fundingRequired).toBe(-(100_000 - 12 * 170_000))
    expect(summary.lowestCashMonth).toBe(12)
  })

  it("has no break-even volume when a unit earns no margin", () => {
    const summary = summarizeModel(model({ revenueStreams: [{ id: "r", name: "", unitPrice: 100, unitsMonth1: 50, monthlyGrowthPct: 0, variableCostPerUnit: 100 }] }))
    expect(summary.breakEvenUnitsPerMonth).toBeNull()
    expect(summary.breakEvenRevenuePerMonth).toBeNull()
  })

  it("returns nulls instead of invented ratios when inputs are missing", () => {
    const empty = financialModelSchema.parse({ currency: "USD" })
    expect(modelHasData(empty)).toBe(false)
    const summary = summarizeModel(empty)
    expect(summary.grossMarginPct).toBeNull()
    expect(summary.netMarginPct).toBeNull()
    expect(summary.customerAcquisitionCost).toBeNull()
    expect(summary.customerLifetimeValue).toBeNull()
    expect(summary.ltvToCacRatio).toBeNull()
  })

  it("rolls months up into years", () => {
    const years = yearlyTotals(projectMonths(model({ horizonMonths: 24 })))
    expect(years).toHaveLength(2)
    expect(years[0].revenue).toBe(6_000_000)
    expect(years[0].netProfit).toBe(1_200_000)
  })

  it("rejects negative amounts and unknown horizons", () => {
    expect(financialModelSchema.safeParse({ currency: "XAF", startingCash: -5 }).success).toBe(false)
    expect(financialModelSchema.safeParse({ currency: "XAF", horizonMonths: 7 }).success).toBe(false)
    expect(financialModelSchema.safeParse({ currency: "francs" }).success).toBe(false)
  })
})

describe("calculators", () => {
  it("break-even", () => {
    expect(breakEven({ fixedCosts: 200_000, pricePerUnit: 500, variableCostPerUnit: 200 })).toEqual({
      units: 667,
      revenue: 333_333.33,
      contributionPerUnit: 300,
      contributionMarginPct: 60,
    })
    expect(breakEven({ fixedCosts: 1000, pricePerUnit: 10, variableCostPerUnit: 10 })).toBeNull()
    expect(breakEven({ fixedCosts: NaN, pricePerUnit: 10, variableCostPerUnit: 1 })).toBeNull()
  })

  it("profit margin", () => {
    expect(profitMargin({ revenue: 1000, costOfSales: 600, operatingExpenses: 250 })).toEqual({
      grossProfit: 400,
      netProfit: 150,
      grossMarginPct: 40,
      netMarginPct: 15,
      markupPct: 66.67,
    })
    expect(profitMargin({ revenue: 0, costOfSales: 0, operatingExpenses: 0 })).toBeNull()
  })

  it("revenue growth", () => {
    const result = revenueGrowth({ startingMonthlyRevenue: 1000, monthlyGrowthPct: 10, months: 3 })
    expect(result?.series).toEqual([1000, 1100, 1210])
    expect(result?.totalRevenue).toBe(3310)
    expect(revenueGrowth({ startingMonthlyRevenue: 1000, monthlyGrowthPct: 10, months: 0 })).toBeNull()
  })

  it("start-up capital", () => {
    expect(startupCapital({ oneOffCosts: 500, monthlyOperatingCosts: 100, monthsOfBuffer: 3, contingencyPct: 10 })).toEqual({
      workingCapital: 300,
      contingency: 80,
      total: 880,
    })
  })

  it("monthly expenses", () => {
    expect(monthlyOperatingExpenses([100, 200, 300])).toEqual({ total: 600, yearly: 7200, daily: 20 })
    expect(monthlyOperatingExpenses([100, -1])).toBeNull()
  })

  it("pricing from a target margin", () => {
    expect(pricing({ unitCost: 70, targetMarginPct: 30 })).toMatchObject({ price: 100, profitPerUnit: 30, markupPct: 42.86 })
    expect(pricing({ unitCost: 70, targetMarginPct: 100 })).toBeNull()
  })

  it("cash flow", () => {
    const result = cashFlow({ openingBalance: 1000, monthlyInflow: 200, monthlyOutflow: 500, months: 6 })
    expect(result).toMatchObject({ netMonthly: -300, closingBalance: -800, firstNegativeMonth: 4, runwayMonths: 3 })
    expect(cashFlow({ openingBalance: 1000, monthlyInflow: 500, monthlyOutflow: 200, months: 3 })?.firstNegativeMonth).toBeNull()
  })
})

describe("currency helpers", () => {
  it("supports the launch currencies", () => {
    for (const code of ["XAF", "NGN", "GHS", "KES", "ZAR", "USD"]) expect(isSupportedCurrency(code)).toBe(true)
    expect(isSupportedCurrency("XXX")).toBe(false)
  })

  it("formats zero-decimal currencies without decimals", () => {
    expect(formatMoney(1234.56, "XAF", "en")).toBe("1,235 XAF")
    expect(formatMoney(12.5, "USD", "en")).toBe("12.50 USD")
    expect(formatMoney(NaN, "USD", "en")).toBe("—")
  })

  it("converts only with a real rate", () => {
    const rates = { base: "USD", rates: { XAF: 600 }, updatedAt: "", provider: "", providerUrl: "" }
    expect(convertAmount(10, "XAF", rates)).toBe(6000)
    expect(convertAmount(10, "NGN", rates)).toBeNull()
  })
})
