/**
 * Copilot modes and the actions Copilot may PROPOSE.
 *
 * Copilot never changes workspace data by itself. It can attach suggested
 * actions to a reply; each one runs only when a person with edit rights
 * clicks it, and is validated again on the server at that point.
 */
import { z } from "zod"

import type { ContextPart } from "@/src/lib/ai/context"

export const COPILOT_MODES = ["advisor", "research", "finance", "marketing", "product", "plan"] as const
export type CopilotMode = (typeof COPILOT_MODES)[number]

export function isCopilotMode(value: unknown): value is CopilotMode {
  return typeof value === "string" && (COPILOT_MODES as readonly string[]).includes(value)
}

interface ModeDefinition {
  role: string
  focus: string
  context: ContextPart[]
}

export const COPILOT_MODE_CONFIG: Record<CopilotMode, ModeDefinition> = {
  advisor: {
    role: "Anza Copilot, a startup advisor and co-founder",
    focus: "Help the founder decide what matters most now: priorities, risks, trade-offs and the next concrete step.",
    context: ["model", "plan", "finance", "validation", "execution", "memory", "documents"],
  },
  research: {
    role: "Anza Copilot, acting as a market research analyst",
    focus:
      "Help the founder understand customers, competitors and the market. Separate what their own evidence shows from what still needs research, and suggest how to find out.",
    context: ["model", "validation", "research", "memory", "documents"],
  },
  finance: {
    role: "Anza Copilot, acting as a financial adviser",
    focus:
      "Explain the founder's financial indicators in plain language, test their assumptions, and discuss pricing, costs, cash and funding needs. Use only figures present in the business data; say when a figure is missing.",
    context: ["finance", "model", "plan", "memory"],
  },
  marketing: {
    role: "Anza Copilot, acting as a marketing strategist",
    focus: "Help with positioning, messaging, channels, campaigns and customer acquisition suited to this market and budget.",
    context: ["model", "validation", "research", "plan", "memory"],
  },
  product: {
    role: "Anza Copilot, acting as a product manager",
    focus:
      "Help scope the product or service, prioritise what to build or deliver first, and keep execution on track. Point out delayed or blocked work.",
    context: ["model", "validation", "execution", "plan", "memory"],
  },
  plan: {
    role: "Anza Copilot, acting as a business plan consultant",
    focus: "Help improve the structure, clarity, evidence and internal consistency of the business plan.",
    context: ["plan", "model", "finance", "validation", "memory"],
  },
}

const text = (max: number) => z.string().trim().min(1).max(max)
const priority = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.enum(["low", "medium", "high", "urgent"]).catch("medium"),
)
const dueInDays = z.coerce.number().int().min(1).max(365).optional().nullable().catch(null)

export const copilotActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("task"), title: text(180), priority: priority.default("medium"), dueInDays }),
  z.object({ type: z.literal("milestone"), title: text(160), dueInDays }),
  z.object({ type: z.literal("decision"), content: text(600), rationale: z.string().trim().max(600).optional().nullable() }),
  z.object({
    type: z.literal("remember"),
    kind: z.enum(["fact", "goal", "preference", "risk"]).catch("fact"),
    content: text(600),
  }),
])

export type CopilotAction = z.infer<typeof copilotActionSchema>

/** A proposed action as stored with the message; `applied` flips when someone accepts it. */
export type StoredCopilotAction = CopilotAction & { applied?: boolean }

export const copilotReplySchema = z.object({
  reply: z.string().trim().min(1).max(8000),
  // Invalid or unknown action objects are dropped rather than failing the whole reply.
  actions: z
    .array(z.unknown())
    .max(8)
    .default([])
    .transform((items) =>
      items
        .map((item) => copilotActionSchema.safeParse(item))
        .filter((result) => result.success)
        .map((result) => result.data as CopilotAction)
        .slice(0, 4),
    ),
})

export const COPILOT_REPLY_SHAPE = `{
  "reply": "your answer in Markdown",
  "actions": [
    { "type": "task", "title": "concrete task starting with a verb", "priority": "low" | "medium" | "high" | "urgent", "dueInDays": 7 },
    { "type": "milestone", "title": "milestone name", "dueInDays": 30 },
    { "type": "decision", "content": "a decision the founder stated they have made", "rationale": "why" },
    { "type": "remember", "kind": "fact" | "goal" | "preference" | "risk", "content": "a durable fact about the business the founder told you" }
  ]
}
"actions" is optional — use an empty array for most replies. Propose an action only when it clearly follows from the conversation:
- "task"/"milestone": when you recommend specific work the founder agreed with or asked for.
- "decision": ONLY when the founder says they have decided something. Never invent a decision.
- "remember": ONLY for durable facts, goals or preferences the founder stated in this conversation that are not already in the business data.
At most 4 actions.`

export function readStoredActions(metadata: unknown): StoredCopilotAction[] {
  const raw = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? (metadata as { actions?: unknown }).actions : null
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    const parsed = copilotActionSchema.safeParse(item)
    if (!parsed.success) return []
    const applied = Boolean(item && typeof item === "object" && (item as { applied?: unknown }).applied)
    return [{ ...parsed.data, applied }]
  })
}
