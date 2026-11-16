/**
 * Stand-alone financial calculators. Pure functions: a `null` result means
 * the inputs do not allow an answer (for example, a price below unit cost).
 */

const round = (value: number, digits = 2) => {
  const factor = Math.pow(10, digits)
  return Math.round(value * factor) / factor
}

const valid = (...values: number[]) => values.every((value) => Number.isFinite(value) && value >= 0)

/** Units and revenue needed per period to cover fixed costs. */
export function breakEven(input: { fixedCosts: number; pricePerUnit: number; variableCostPerUnit: number }) {
  const { fixedCosts, pricePerUnit, variableCostPerUnit } = input
  if (!valid(fixedCosts, pricePerUnit, variableCostPerUnit)) return null
  const contribution = pricePerUnit - variableCostPerUnit
  if (contribution <= 0) return null
  const units = fixedCosts / contribution
  return {
    units: Math.ceil(units),
    revenue: round(units * pricePerUnit),
    contributionPerUnit: round(contribution),
    contributionMarginPct: round((contribution / pricePerUnit) * 100),
  }
}

export function profitMargin(input: { revenue: number; costOfSales: number; operatingExpenses: number }) {
  const { revenue, costOfSales, operatingExpenses } = input
  if (!valid(revenue, costOfSales, operatingExpenses) || revenue <= 0) return null
  const grossProfit = revenue - costOfSales
  const netProfit = grossProfit - operatingExpenses
  return {
    grossProfit: round(grossProfit),
    netProfit: round(netProfit),
    grossMarginPct: round((grossProfit / revenue) * 100),
    netMarginPct: round((netProfit / revenue) * 100),
    /** Markup on cost, when there is a cost of sales. */
    markupPct: costOfSales > 0 ? round((grossProfit / costOfSales) * 100) : null,
  }
}

/** Compounds a monthly growth rate; returns each month's revenue and the total. */
export function revenueGrowth(input: { startingMonthlyRevenue: number; monthlyGrowthPct: number; months: number }) {
  const { startingMonthlyRevenue, monthlyGrowthPct } = input
  const months = Math.floor(input.months)
  if (!valid(startingMonthlyRevenue) || !Number.isFinite(monthlyGrowthPct) || monthlyGrowthPct <= -100) return null
  if (months < 1 || months > 120) return null
  const series: number[] = []
  for (let month = 0; month < months; month++) {
    series.push(round(startingMonthlyRevenue * Math.pow(1 + monthlyGrowthPct / 100, month)))
  }
  const final = series[series.length - 1]
  return {
    series,
    finalMonthlyRevenue: final,
    totalRevenue: round(series.reduce((sum, value) => sum + value, 0)),
    multiple: startingMonthlyRevenue > 0 ? round(final / startingMonthlyRevenue) : null,
  }
}

/** One-off costs plus a cash buffer for the months before the business pays for itself. */
export function startupCapital(input: {
  oneOffCosts: number
  monthlyOperatingCosts: number
  monthsOfBuffer: number
  contingencyPct: number
}) {
  const { oneOffCosts, monthlyOperatingCosts, monthsOfBuffer, contingencyPct } = input
  if (!valid(oneOffCosts, monthlyOperatingCosts, monthsOfBuffer, contingencyPct)) return null
  const workingCapital = monthlyOperatingCosts * monthsOfBuffer
  const subtotal = oneOffCosts + workingCapital
  const contingency = subtotal * (contingencyPct / 100)
  return {
    workingCapital: round(workingCapital),
    contingency: round(contingency),
    total: round(subtotal + contingency),
  }
}

export function monthlyOperatingExpenses(items: number[]) {
  if (!items.every((value) => Number.isFinite(value) && value >= 0)) return null
  const total = items.reduce((sum, value) => sum + value, 0)
  return { total: round(total), yearly: round(total * 12), daily: round(total / 30) }
}

/**
 * Price from cost. `targetMarginPct` is margin on the selling price
 * (30 means cost is 70% of the price), which is how profitability is usually
 * discussed; the equivalent markup on cost is returned too.
 */
export function pricing(input: { unitCost: number; targetMarginPct: number; taxPct?: number }) {
  const { unitCost, targetMarginPct } = input
  const taxPct = input.taxPct ?? 0
  if (!valid(unitCost, targetMarginPct, taxPct) || targetMarginPct >= 100) return null
  const price = unitCost / (1 - targetMarginPct / 100)
  return {
    price: round(price),
    profitPerUnit: round(price - unitCost),
    markupPct: unitCost > 0 ? round(((price - unitCost) / unitCost) * 100) : null,
    priceWithTax: round(price * (1 + taxPct / 100)),
  }
}

/** Simple cash-flow check: how the balance moves and how long it lasts. */
export function cashFlow(input: { openingBalance: number; monthlyInflow: number; monthlyOutflow: number; months: number }) {
  const { openingBalance, monthlyInflow, monthlyOutflow } = input
  const months = Math.floor(input.months)
  if (!Number.isFinite(openingBalance) || !valid(monthlyInflow, monthlyOutflow) || months < 1 || months > 120) return null
  const net = monthlyInflow - monthlyOutflow
  const balances: number[] = []
  let balance = openingBalance
  let firstNegativeMonth: number | null = null
  for (let month = 1; month <= months; month++) {
    balance += net
    balances.push(round(balance))
    if (firstNegativeMonth === null && balance < 0) firstNegativeMonth = month
  }
  return {
    netMonthly: round(net),
    balances,
    closingBalance: round(balance),
    firstNegativeMonth,
    /** Whole months the opening balance lasts when more goes out than comes in. */
    runwayMonths: net < 0 && openingBalance > 0 ? Math.floor(openingBalance / -net) : null,
  }
}
