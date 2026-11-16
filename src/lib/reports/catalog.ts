/**
 * Every structured report Anza can produce, by module. One entry = one
 * analysis: what the model is asked to do, which business data it sees, and
 * whether it may use live web sources.
 *
 * Labels and descriptions shown to users live in the dictionaries
 * (`t.reports.kinds[kind]`).
 */
import type { ContextPart } from "@/src/lib/ai/context"
import type { Feature } from "@/src/lib/plans"

export type ReportModule = "validation" | "research" | "marketing"

export interface ReportDefinition {
  kind: string
  module: ReportModule
  /** The analyst persona used in the system prompt. */
  role: string
  /** What to produce. Written for the model. */
  instructions: string
  context: ContextPart[]
  /** Use live web sources when the plan and provider allow it. */
  web: boolean
}

const VALIDATION_ROLE = "a startup validation coach"
const RESEARCH_ROLE = "a market research analyst covering African markets"
const MARKETING_ROLE = "a marketing strategist for small businesses and startups in Africa"

function define(
  module: ReportModule,
  role: string,
  context: ContextPart[],
  web: boolean,
  entries: Record<string, string>,
): ReportDefinition[] {
  return Object.entries(entries).map(([kind, instructions]) => ({ kind, module, role, instructions, context, web }))
}

const VALIDATION = define("validation", VALIDATION_ROLE, ["model", "validation", "documents"], false, {
  problem:
    "Define the core problem this business solves: who has it, when it occurs, what it costs them today, and how they cope now. End with the riskiest unknowns about the problem.",
  persona:
    "Create 2 or 3 customer personas. For each: who they are, their goals, daily context, how they pay, what triggers a purchase and what would stop them. Use a table to compare the personas. Do not invent names of real people or quotes.",
  target_market:
    "Define the target market: the beachhead segment to win first, adjacent segments for later, geography, and how reachable each is. Give selection criteria and say which segment to start with and why.",
  pain_points:
    "Analyse customer pain points: rank them by severity and frequency, describe current workarounds and their cost, and say which pains are worth paying to remove.",
  value_proposition:
    "Evaluate the value proposition: the job to be done, gains and pains addressed, how it differs from alternatives, and where the promise is weak or unproven. Propose a sharper one-sentence value proposition.",
  competitors:
    "Map the competitive landscape: direct competitors, indirect competitors, informal substitutes and doing nothing. Use a comparison table (type of player, what they offer, strengths, weaknesses). Only name real companies you are confident exist; otherwise describe the type of player and tell the founder to add names from their own observation.",
  positioning:
    "Recommend competitive positioning: the dimension to compete on, the positioning statement, proof points needed, and what NOT to compete on.",
  swot:
    "Produce a SWOT analysis with four sections (Strengths, Weaknesses, Opportunities, Threats), each with specific points tied to this business and its country, followed by a section turning the SWOT into strategic moves.",
  pestel:
    "Produce a PESTEL analysis (Political, Economic, Social, Technological, Environmental, Legal) for this business in its country. For legal and regulatory points give orientation only and name who to consult.",
  market_opportunity:
    "Assess the market opportunity. Explain how to size it bottom-up (reachable customers x realistic spend) and show the calculation structure with clearly labelled estimates and assumptions. Never present a market size as fact without a source.",
  feasibility:
    "Assess business feasibility across market, operational, technical, financial and team dimensions. Rate each (strong / uncertain / weak) in a table with the reason, and conclude with the conditions under which this business is worth pursuing.",
  experiments:
    "Recommend 4 to 6 validation experiments the founder can run cheaply in the next 30 days. For each: the assumption tested, the method, what to measure, the success threshold, cost and duration. Present them in a table and order them by learning per unit of cost.",
})

const RESEARCH = define("research", RESEARCH_ROLE, ["model", "validation"], true, {
  industry_trends:
    "Research current trends shaping this industry in this country and region: demand shifts, technology, business models and investment. Separate established trends from early signals.",
  market_size:
    "Research the market size. Report any sourced figures with their source and year. Where no reliable figure exists, say so and show a bottom-up estimation method with clearly labelled assumptions instead of inventing a number.",
  target_customers:
    "Research the target customers: demographics, income and spending patterns, where they are, how they buy and pay. Distinguish sourced facts from estimates.",
  competitors:
    "Research competitors operating in this market. Provide a comparison table (name, type, offer, pricing if known, strengths, weaknesses). Include only companies you can confirm from sources or are confident exist; mark unknown cells as unknown.",
  pricing:
    "Research pricing in this market: price points and models used by existing players, what customers are used to paying, and price sensitivity. Recommend a pricing approach to test. State prices only when sourced; otherwise label them as estimates.",
  market_gaps:
    "Identify gaps in this market: underserved segments, unmet needs, weaknesses of existing offers and places incumbents ignore. Say what evidence would confirm each gap.",
  customer_behavior:
    "Research customer behaviour: how people discover, evaluate, buy and pay for this kind of product, the role of trust and recommendations, and mobile and mobile-money usage.",
  regulation:
    "Give an orientation on regulatory considerations for this business: registration, sector licences, tax registration, consumer and data rules. Name the relevant authorities. This is general orientation, not legal advice — say clearly what must be confirmed with the authority or a professional, and never state fees, rates or deadlines as fact unless they come from a cited source.",
  distribution:
    "Research distribution channels: how similar products reach customers in this country (physical, agents, online, partnerships), logistics constraints and the cost drivers of each channel.",
  local_opportunities:
    "Identify local business opportunities related to this business in its city and country: adjacent needs, partnerships, seasonal demand and public or private programmes worth investigating. Do not invent programme names.",
})

const MARKETING = define("marketing", MARKETING_ROLE, ["model", "plan", "validation"], false, {
  brand_positioning:
    "Define the brand positioning: target audience, category, key benefit, reason to believe, brand personality and a positioning statement.",
  brand_identity:
    "Recommend a brand identity direction: name considerations, tone of voice, messaging pillars, visual direction (colours, style) and how it should feel to local customers. Give examples of on-brand and off-brand phrases.",
  marketing_strategy:
    "Write a marketing strategy fitted to this budget and country: objectives, audience, core message, priority channels with reasons, a 90-day plan and how to measure results.",
  acquisition:
    "Design a customer acquisition strategy for the first 100 customers: channels ranked by cost and fit, the tactic for each, expected effort, and what to measure. Favour low-cost, local channels.",
  social_media:
    "Write a social media strategy: which platforms matter for this audience and why, content themes, posting rhythm, community tactics and how to turn attention into sales (including WhatsApp where relevant).",
  content_calendar:
    "Create a 4-week content calendar as a table (week, day, platform, format, topic, call to action). Keep it realistic for a small team.",
  campaign_ideas:
    "Propose 5 campaign ideas suited to this audience and budget. For each: the concept, channel, what is needed, rough cost level (low / medium / high) and how success is measured.",
  advertising_plan:
    "Write an advertising plan for the stated budget: channels (digital and offline), targeting, creative direction, how to split the budget in percentages, and how to test before spending more. Do not state advertising prices as facts.",
  sales_funnel:
    "Design the sales funnel from first contact to repeat purchase: stages, what happens at each, the main reason people drop off, and one improvement per stage. Present the stages in a table.",
  retention:
    "Write a customer retention strategy: onboarding, follow-up, loyalty and referral mechanics, service recovery, and the retention metrics to track.",
  partnerships:
    "Identify partnership opportunities: types of partners (distribution, community, complementary businesses, institutions), what each side gains, and how to approach them. Describe types of partners; only name organisations you are confident exist.",
})

export const REPORT_CATALOG: Record<ReportModule, ReportDefinition[]> = {
  validation: VALIDATION,
  research: RESEARCH,
  marketing: MARKETING,
}

/** Plan feature needed for each module (none = available on every plan). */
export const REPORT_MODULE_GATE: Record<ReportModule, Feature | undefined> = {
  validation: "validation",
  research: "market_research",
  marketing: "marketing_studio",
}

export function getReportDefinition(module: string, kind: string): ReportDefinition | null {
  if (module !== "validation" && module !== "research" && module !== "marketing") return null
  return REPORT_CATALOG[module].find((definition) => definition.kind === kind) ?? null
}
