"use server"

import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { generateTextWithFallback } from "@/src/lib/ai-providers"
import { checkAiRateLimit, AI_RATE_LIMIT_MESSAGE } from "@/src/lib/rate-limiter"
import { revalidatePath } from "next/cache"

export type ResultDocumentType = "Business Plan" | "SWOT" | "Budget" | "Marketing Strategy" | "Roadmap" | "Elevator Pitch"

export type ResultDocument = {
  type: ResultDocumentType
  content: string
}

export type ResultsWorkspace = {
  generatedAt: string
  documents: ResultDocument[]
}

type ProjectContext = {
  name: string
  city: string
  country: string
  industry: string
  budget: number
  currency: string
  title: string
  description: string
  audience: string
}

const documentTypes: ResultDocumentType[] = ["Business Plan", "SWOT", "Budget", "Marketing Strategy", "Roadmap", "Elevator Pitch"]

async function createAiDocuments(context: ProjectContext): Promise<ResultDocument[] | null> {
  const budgetNum = context.budget
  const budget = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(budgetNum)
  const market = `${context.city}, ${context.country}`
  const audience = context.audience || "target customers"
  const offer = context.description || context.title

  const prompt = `You are a world-class startup strategist and business writer producing investor-grade documents for an African startup founder. Your output must be professional, structured, specific, and immediately actionable. Do not produce generic advice — make every section specific to the business facts provided. Never invent statistics, revenue numbers, market sizes, competitor names, or regulatory facts. Label assumptions clearly as "(Assumption)" and unknowns as "(Validation required)".

Business facts:
- Startup name: ${context.name}
- Business idea / product: ${context.title}
- Description: ${offer}
- Target audience: ${audience}
- Location: ${market}
- Industry sector: ${context.industry}
- Starting budget: ${budget} ${context.currency}

Produce exactly six high-quality, professional business documents. Each document must:
- Use consistent markdown formatting (## headings, bold key terms, tables where appropriate, bullet lists)
- Be between 400–600 words of substantive content
- Be specific to this business — no generic filler
- Use professional business language suitable for investors, advisors, and lenders

Return exactly this format with no text outside the sections:
=== Business Plan ===
...
=== SWOT ===
...
=== Budget ===
...
=== Marketing Strategy ===
...
=== Roadmap ===
...
=== Elevator Pitch ===
...

Document requirements:
BUSINESS PLAN: Include executive summary, customer problem with trigger events, solution & value proposition, competitive landscape, revenue model with metrics table, operations & team, risk register table, and 12-month milestone timeline table.
SWOT: Four sections (Strengths, Weaknesses, Opportunities, Threats) each with 4–5 specific, evidence-grounded bullet points relevant to this business and ${context.country}.
BUDGET: Full allocation table with amounts in ${context.currency} and percentages, stage-gated release schedule with unlock conditions, and 4 cash control principles.
MARKETING STRATEGY: Positioning statement, target customer profile table, three phased approach (Direct Outreach → Content & Community → Partnerships), and key metrics table.
ROADMAP: Four phases with task tables showing Owner, Output, and Success Metric columns, plus a clear Decision Gate after each phase.
ELEVATOR PITCH: Three versions — 30-second (casual), 60-second (investor), and a formal stakeholder ask version with placeholders marked "(validate)" for unconfirmed facts.`

  try {
    const response = await generateTextWithFallback(prompt, [{ role: "user", content: "Generate all six professional business documents now. Be specific, thorough, and professional." }], { maxTokens: 7000, temperature: 0.35 })
    const documents = documentTypes.map((type) => {
      const marker = `=== ${type} ===`
      const start = response.indexOf(marker)
      if (start < 0) return null
      const contentStart = start + marker.length
      const next = response.indexOf("=== ", contentStart)
      const content = response.slice(contentStart, next < 0 ? undefined : next).trim()
      return content.length >= 250 ? { type, content } : null
    })
    return documents.every((document): document is ResultDocument => document !== null) ? documents : null
  } catch (error) {
    console.warn("Could not generate AI business documents; using the structured fallback.", error)
    return null
  }
}

function createDocuments(context: ProjectContext): ResultDocument[] {
  const market = `${context.city}, ${context.country}`
  const offer = context.description || `${context.title} solves a clear problem for its first customers.`
  const audience = context.audience || "early customers who experience this problem regularly"
  const budget = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(context.budget)
  const budgetNum = context.budget

  return [
    { type: "Business Plan", content: `## Executive Summary

**${context.name}** is developing **${context.title}** — serving ${audience} in ${market}.

${offer}

This is a disciplined first-year operating plan designed to validate demand, deliver a focused offer, establish repeatable customer acquisition, and build sustainable unit economics. No significant capital should be deployed before key assumptions are tested with paying customers.

---

## Customer Problem

${audience} currently depend on fragmented, informal, or unreliable alternatives. The core research objective is to identify:
- The **trigger event** that creates urgent demand
- The **current workaround** and its true cost (time, money, risk)
- The **buyer profile**, decision-maker, and budget authority
- The **consequence of inaction** for the customer

**Action required:** Conduct a minimum of 15 structured customer discovery interviews before committing the pilot budget.

---

## Solution & Value Proposition

${context.name} helps ${audience} achieve a simpler, faster, and more dependable outcome through **${context.title}**.

The initial offer must solve one high-value job exceptionally well. Begin with a manually-delivered minimum viable service. This approach proves demand and delivery quality before investing in automation or technology infrastructure.

**Key differentiators to validate:** local relevance, reliability, speed, pricing transparency, and trust.

---

## Market & Competitive Landscape

**Beachhead market:** ${market} | **Industry:** ${context.industry}

Competitive mapping should cover:
- Direct competitors offering similar solutions
- Informal substitutes (workarounds, manual processes)
- The "do nothing" option and its hidden costs

Size the opportunity by counting reachable customers × realistic annual spend per customer. Replace all estimates with evidence from actual sales activity.

---

## Revenue Model

Start with a single, simple pricing model — subscription, transaction fee, service package, or recurring retainer.

**Core metrics to track from Day 1:**
| Metric | Target (Month 3) |
|--------|-----------------|
| Lead-to-trial conversion | Validation required |
| Trial-to-paid conversion | Validation required |
| Monthly churn rate | < 10% (Assumption) |
| Average revenue per customer | Validation required |
| Gross margin | > 50% (Assumption) |

Do not increase acquisition spend until an early cohort demonstrates retention and a credible payback period.

---

## Operations & Team

Map the full customer journey: discovery → onboarding → delivery → support → payment → renewal. Assign a named owner and a measurable service standard to each stage.

Founding team priorities for Year 1:
1. Customer discovery and direct sales
2. Consistent delivery quality
3. Payment collection and cash management
4. Add team members only when a recurring bottleneck is measured and justified

---

## Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Weak willingness to pay | High | Validate price before building |
| Slow customer acquisition | Medium | Direct outreach first |
| Delivery costs exceed margin | Medium | Pilot manually; measure cost |
| Regulatory or compliance gap | Medium | Identify key licenses before launch |
| Supplier dependency | Low–Medium | Identify 2 backup suppliers |

Maintain a **10% contingency reserve** at all times. Release budget tranches only after each validation milestone is met.

---

## 12-Month Milestones

| Period | Objective | Success Metric |
|--------|-----------|---------------|
| Months 1–2 | Validate problem & price | 15 interviews, 3+ committed early customers |
| Months 3–4 | Run paid pilot | 10 paying customers, measurable delivery cost |
| Months 5–8 | Repeatable acquisition | Documented onboarding, positive unit economics |
| Months 9–12 | Controlled growth | Expand only after retention & margin targets met |` },
    { type: "SWOT", content: `## SWOT Analysis — ${context.name}

---

### ✅ Strengths

- **Focused market entry:** Operating in ${market} with a clearly defined audience (${audience}) allows for targeted customer discovery and efficient resource allocation.
- **Defined value proposition:** ${context.title} addresses a specific problem in the **${context.industry}** sector with a concrete offer.
- **Lean starting capital:** A budget of ${budget} ${context.currency} enables disciplined, evidence-based decision-making with minimal waste.
- **Founder proximity to market:** Local operators have information advantages that remote competitors and large incumbents cannot easily replicate.
- **Agility:** As an early-stage venture, ${context.name} can pivot quickly based on direct customer feedback without bureaucratic delays.

---

### ⚠️ Weaknesses

- **Unproven demand:** Customer willingness to pay at the intended price point has not yet been validated through actual transactions.
- **Early-stage processes:** Delivery, onboarding, and support workflows are not yet documented or stress-tested at scale.
- **Limited brand recognition:** As a new entrant, building trust with ${audience} requires consistent delivery and active relationship management over time.
- **Resource constraints:** The founding team must simultaneously cover customer discovery, product, sales, and operations in the early months.
- **Dependency on founder capability:** Key functions are currently concentrated in a small team, creating execution risk if bandwidth is exceeded.

---

### 🚀 Opportunities

- **Underserved segment:** ${audience} in ${market} may be poorly served by existing alternatives — creating a genuine entry opportunity.
- **Africa-context advantage:** Local knowledge of payment methods, regulatory environment, and distribution channels is a meaningful and defensible competitive edge.
- **Partnership potential:** Trusted local distributors, associations, or payment platforms may offer low-cost access to established customer networks.
- **Digital adoption growth:** Increasing smartphone penetration and mobile money usage in ${context.country} creates an expanding addressable market.
- **First-mover positioning:** Early customer relationships, trust, and data create compounding advantages that later entrants cannot easily replicate.

---

### ⛔ Threats

- **Established competitors & informal substitutes:** Existing solutions — even imperfect ones — represent real switching costs for potential customers.
- **Infrastructure constraints:** Unreliable connectivity, logistics gaps, or power instability may affect service delivery in ${market}.
- **Regulatory environment:** Licensing, taxation, and sector-specific compliance requirements could affect launch timelines and operating costs.
- **Economic volatility:** Currency fluctuation, inflation, and reduced consumer purchasing power in ${context.country} may affect pricing strategy and margins.
- **Talent acquisition:** Recruiting and retaining skilled team members in a competitive early-stage environment can delay execution timelines.` },
    { type: "Budget", content: `## Budget Plan — ${context.name}

**Total Starting Capital:** ${budget} ${context.currency}
**Budget Period:** First 12 Operating Months
**Approach:** Stage-gated spending — each tranche released only after the previous milestone is achieved and documented.

---

## Allocation Overview

| Category | Allocation | Amount (${context.currency}) | Purpose |
|----------|-----------|----------------------|---------|
| Customer Discovery & Research | 10% | ${(budgetNum * 0.10).toLocaleString("en-US", { maximumFractionDigits: 0 })} | Interviews, surveys, travel, tools |
| Prototype / Minimum Viable Service | 30% | ${(budgetNum * 0.30).toLocaleString("en-US", { maximumFractionDigits: 0 })} | Build or deliver first version |
| Sales & Launch Marketing | 20% | ${(budgetNum * 0.20).toLocaleString("en-US", { maximumFractionDigits: 0 })} | Direct outreach, digital presence |
| Operations, Tools & Delivery | 20% | ${(budgetNum * 0.20).toLocaleString("en-US", { maximumFractionDigits: 0 })} | Software, logistics, fulfilment |
| Legal, Compliance & Registration | 10% | ${(budgetNum * 0.10).toLocaleString("en-US", { maximumFractionDigits: 0 })} | Business registration, licenses |
| Contingency Reserve | 10% | ${(budgetNum * 0.10).toLocaleString("en-US", { maximumFractionDigits: 0 })} | Unexpected costs — do not pre-allocate |

---

## Stage-Gated Release Schedule

**Gate 1 — Validation (Months 1–2)**
Release: Customer Discovery budget (10%)
Unlock condition: 15 completed interviews with documented pain, budget, and willingness to pay.

**Gate 2 — Pilot (Months 3–4)**
Release: MVP / MV Service budget (30%) + partial Sales budget (10%)
Unlock condition: 3+ committed early customers or paid trials confirmed.

**Gate 3 — Repeatability (Months 5–8)**
Release: Remaining Sales & Operations budget
Unlock condition: Positive unit economics confirmed — delivery cost < revenue per customer.

**Gate 4 — Controlled Growth (Months 9–12)**
Release: Remaining reserves for deliberate expansion
Unlock condition: Monthly churn < 10%, gross margin > 50% (Assumption — validate against actuals).

---

## Cash Control Principles

- Review actual vs. budgeted spend **every week** — not monthly
- Delay MVP budget release until customer research confirms the price range
- Treat contingency as a reserve — never as a spending category
- Track **cash runway** monthly: remaining cash ÷ monthly burn rate
- Maintain a minimum of **3 months of runway** at all times` },
    { type: "Marketing Strategy", content: `## Marketing Strategy — ${context.name}

---

## Positioning Statement

For **${audience}** in **${market}**, **${context.name}** provides **${context.title}** — the most direct path from their current problem to a reliable, locally-relevant solution.

Unlike generic or informal alternatives, ${context.name} is designed around the specific realities of the **${context.industry}** market in ${context.country}.

---

## Target Customer Profile

| Attribute | Description |
|-----------|-------------|
| Who | ${audience} |
| Location | ${market} |
| Industry context | ${context.industry} |
| Current solution | Informal workarounds or fragmented alternatives |
| Primary motivation | Reliability, simplicity, speed, or cost reduction |
| Decision trigger | Validation required — identify through interviews |

---

## Phase 1: Direct Outreach (Months 1–2)
*Goal: Generate 15 conversations, 5 trials, 3 paying or committed customers*

- Identify 30 high-probability prospects from personal networks, trade associations, and community groups
- Send personalised direct messages — no mass marketing or paid ads at this stage
- Conduct structured conversations: identify pain, current spend, and decision-making process
- Collect at least 2 referrals from every conversation regardless of outcome

**Key opening message:** *"We're building a solution for [specific problem]. We're speaking with [audience] in [location] to make sure we get it right. Would you share 20 minutes?"*

---

## Phase 2: Content & Community (Months 3–6)
*Goal: Build authority and generate inbound interest*

- Publish 2–4 practical content pieces per month addressing problems faced by ${audience}
- Formats: LinkedIn posts, WhatsApp business updates, short guides, or video walkthroughs
- Engage in relevant online communities, trade groups, and industry events in ${market}
- Publish early customer testimonials and measurable results (with explicit permission)

---

## Phase 3: Partnerships & Referrals (Months 5–12)
*Goal: Unlock low-cost distribution through trusted local channels*

- Identify 3–5 referral partners (complementary businesses, associations, or platforms)
- Design a simple referral incentive: discount, commission, or reciprocal promotion
- Formalise at least one partnership agreement before Month 8

---

## Key Metrics (Track Monthly)

| Metric | Month 3 Target | Month 12 Target |
|--------|---------------|----------------|
| Customer conversations | 15 | 100+ |
| Trial sign-ups | 5 | 40+ |
| Paying customers | 3 | 25+ (Assumption) |
| Referral-sourced customers | — | > 20% of new customers |
| Customer acquisition cost | — | Validation required |` },
    { type: "Roadmap", content: `## Execution Roadmap — ${context.name}

**Approach:** Sequential validation gates. No phase begins until the previous milestone is documented with real evidence from customers — not assumptions.

---

## Phase 1: Customer Discovery (Weeks 1–4)

**Owner:** Founder(s)
**Objective:** Confirm the problem, audience, and price before building anything.

| Task | Output | Success Metric |
|------|--------|---------------|
| Identify 30 target contacts | Prospect list | List complete and segmented |
| Conduct 15 discovery interviews | Interview notes + summary | 15 interviews documented |
| Analyse pain, price, and alternatives | Customer insight report | Clear problem statement agreed |
| Define one core job-to-be-done | Focused value proposition | Written and validated |

**Decision Gate 1:** Proceed to pilot only if 8+ of 15 interviewees confirm the problem and indicate willingness to pay at the target price.

---

## Phase 2: Minimum Viable Service (Weeks 5–10)

**Owner:** Founder(s) + 1 support person (if hired)
**Objective:** Deliver the simplest version of ${context.title} to paying or committed customers.

| Task | Output | Success Metric |
|------|--------|---------------|
| Design delivery process (manual-first) | Process documentation | Step-by-step flow written and tested |
| Onboard 3–5 pilot customers | Signed agreements or paid invoices | Payment or commitment received |
| Deliver and measure quality | Customer feedback report | > 80% customer satisfaction |
| Calculate unit economics | Cost vs. revenue per customer | Gross margin > 0 confirmed |

**Decision Gate 2:** Proceed only if delivery cost is below revenue per customer and ≥ 2 customers confirm they would pay again.

---

## Phase 3: Repeatable Acquisition (Weeks 11–24)

**Owner:** Founder(s) + Sales Lead
**Objective:** Document and systematise the full path from prospect to paying customer.

| Task | Output | Success Metric |
|------|--------|---------------|
| Document acquisition playbook | Written sales process | Reproducible by a second person |
| Scale outreach volume by 2× | Expanded customer base | 15+ paying customers |
| Optimise onboarding experience | Shorter time-to-value | Customer outcome < 48 hrs (Assumption) |
| Launch referral or partnership programme | Signed partner agreements | ≥ 1 formal partnership active |

**Decision Gate 3:** Begin controlled growth only after monthly churn < 10% and gross margin target is consistently met.

---

## Phase 4: Controlled Growth (Months 7–12)

**Owner:** Full founding team + key hires
**Objective:** Expand deliberately using proven processes — never by burning cash on unvalidated channels.

| Task | Output | Success Metric |
|------|--------|---------------|
| First non-founder hire (if justified) | Role filled and onboarded | Documented bottleneck removed |
| Expand to adjacent segment or geography | New customer cohort | 10+ new customers from new segment |
| Establish financial reporting cadence | Monthly P&L + cash flow report | Board-ready financials produced |
| Prepare next funding narrative (if needed) | Pitch deck + data room | Investor meetings scheduled |` },
    { type: "Elevator Pitch", content: `## Elevator Pitch — ${context.name}

---

### ⏱ 30-Second Version
*(Use at events, introductions, or casual conversations)*

> "${context.name} helps **${audience}** in **${market}** solve **[specific problem — validate through interviews]** using **${context.title}**.
>
> Most people in this space currently rely on [workaround — validate], which costs them [time/money/risk — validate]. We give them a simpler, more reliable alternative — built specifically for the realities of **${context.country}**.
>
> We're currently in early customer validation and already speaking with potential customers."

---

### ⏱ 60-Second Version
*(Use with investors, advisors, or potential partners)*

> "${context.name} is a **${context.industry}** startup based in **${market}**.
>
> We're building **${context.title}** for **${audience}** — a group that currently struggles with [core problem — validate]. The consequence is [pain/cost — validate], and existing solutions are either too expensive, too generic, or simply don't work in the local context.
>
> Our approach: start narrow, validate with real customers, and build repeatable unit economics before scaling. We're funded with **${budget} ${context.currency}** in starting capital and operating with a stage-gated budget to ensure capital efficiency.
>
> In the next 90 days, we're targeting 15 customer discovery interviews, 5 pilots, and 3 paying customers. Our measure of success is not revenue yet — it's confirmed demand and a proven delivery model.
>
> We're open to conversations with [advisors / investors / partners] who understand the **${context.country}** market."

---

### 🤝 Formal Stakeholder / Investor Version
*(Use in formal meetings, pitch events, or written outreach)*

> **${context.name}** | **${context.industry}** | **${market}**
>
> **The Problem:** ${audience} in ${context.country} currently face [validated pain point — document from interviews]. Existing alternatives are [fragmented / unreliable / too expensive — validate], leaving a clear gap for a focused, locally-built solution.
>
> **Our Solution:** ${offer}
>
> **Business Model:** [Revenue model — validate with early customers] generating [price per customer — validate] per [period — validate].
>
> **Traction to Date:** We are in active customer discovery. *(Update with real numbers: interviews completed, trials, paying customers, and revenue.)*
>
> **Starting Capital:** ${budget} ${context.currency} — deployed in stage-gated tranches tied to validated milestones.
>
> **The Ask:** We are seeking [specific ask — e.g. advisory, introductions, seed investment, strategic partnership]. In return, we offer [what you can give — e.g. equity stake, revenue share, advisory relationship, co-marketing opportunity].
>
> **Why ${context.name}:** Direct access to ${audience}, deep understanding of the ${market} operating environment, and a capital-efficient, evidence-first approach to building.
>
> **Next Step:** A 30-minute conversation to explore alignment and fit.` },
  ]
}

export async function generateResultsWorkspace(projectId: string): Promise<{ success: true; workspace: ResultsWorkspace } | { success: false; error: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !projectId) return { success: false, error: "Please sign in to generate your workspace." }

  const { data: startup } = await supabase
    .from("startups")
    .select("id, name, city, country_code, industry, estimated_budget_cents, budget_currency")
    .eq("owner_id", user.id)
    .maybeSingle()
  if (!startup) return { success: false, error: "Your startup could not be found." }

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, description, target_audience, metadata")
    .eq("id", projectId)
    .eq("startup_id", startup.id)
    .maybeSingle()
  if (!project) return { success: false, error: "This project is not available to you." }

  const rateLimit = await checkAiRateLimit(user.id)
  if (!rateLimit.allowed) {
    return { success: false, error: AI_RATE_LIMIT_MESSAGE }
  }

  const generatedDocuments = await createAiDocuments({
      name: startup.name,
      city: startup.city || "your city",
      country: startup.country_code,
      industry: startup.industry || "your industry",
      budget: (startup.estimated_budget_cents || 0) / 100,
      currency: startup.budget_currency || "USD",
      title: project.title,
      description: project.description || "",
      audience: project.target_audience || "",
    })
  if (!generatedDocuments) return { success: false, error: "The AI could not generate complete documents. Check your provider configuration and try again." }
  const workspace: ResultsWorkspace = { generatedAt: new Date().toISOString(), documents: generatedDocuments }

  const metadata = project.metadata && typeof project.metadata === "object" && !Array.isArray(project.metadata)
    ? project.metadata
    : {}
  const { error } = await supabase
    .from("projects")
    .update({ metadata: { ...metadata, results_workspace: workspace } })
    .eq("id", project.id)
  if (error) return { success: false, error: "Could not save the generated workspace. Please try again." }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/results")
  return { success: true, workspace }
}
