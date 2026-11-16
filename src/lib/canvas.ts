/**
 * Business Model Canvas and Lean Canvas definitions.
 * Content stored in an artifact (module "model"): { blocks: { [blockKey]: string[] } }.
 */
import { z } from "zod"

export const CANVAS_KINDS = ["bmc", "lean"] as const
export type CanvasKind = (typeof CANVAS_KINDS)[number]

export const BMC_BLOCKS = [
  "keyPartnerships",
  "keyActivities",
  "keyResources",
  "valuePropositions",
  "customerRelationships",
  "channels",
  "customerSegments",
  "costStructure",
  "revenueStreams",
] as const

export const LEAN_BLOCKS = [
  "problem",
  "solution",
  "keyMetrics",
  "uniqueValueProposition",
  "unfairAdvantage",
  "channels",
  "customerSegments",
  "costStructure",
  "revenueStreams",
] as const

export type BmcBlock = (typeof BMC_BLOCKS)[number]
export type LeanBlock = (typeof LEAN_BLOCKS)[number]
export type CanvasBlockKey = BmcBlock | LeanBlock

export const CANVAS_BLOCKS: Record<CanvasKind, readonly CanvasBlockKey[]> = {
  bmc: BMC_BLOCKS,
  lean: LEAN_BLOCKS,
}

/**
 * Classic canvas layout on a 10-column grid (large screens). Both canvases
 * share the same geometry; only the block in each position differs.
 */
export const CANVAS_LAYOUT: Record<CanvasKind, Array<{ key: CanvasBlockKey; className: string }>> = {
  bmc: [
    { key: "keyPartnerships", className: "lg:col-span-2 lg:row-span-2" },
    { key: "keyActivities", className: "lg:col-span-2" },
    { key: "valuePropositions", className: "lg:col-span-2 lg:row-span-2" },
    { key: "customerRelationships", className: "lg:col-span-2" },
    { key: "customerSegments", className: "lg:col-span-2 lg:row-span-2" },
    { key: "keyResources", className: "lg:col-span-2" },
    { key: "channels", className: "lg:col-span-2" },
    { key: "costStructure", className: "lg:col-span-5" },
    { key: "revenueStreams", className: "lg:col-span-5" },
  ],
  lean: [
    { key: "problem", className: "lg:col-span-2 lg:row-span-2" },
    { key: "solution", className: "lg:col-span-2" },
    { key: "uniqueValueProposition", className: "lg:col-span-2 lg:row-span-2" },
    { key: "unfairAdvantage", className: "lg:col-span-2" },
    { key: "customerSegments", className: "lg:col-span-2 lg:row-span-2" },
    { key: "keyMetrics", className: "lg:col-span-2" },
    { key: "channels", className: "lg:col-span-2" },
    { key: "costStructure", className: "lg:col-span-5" },
    { key: "revenueStreams", className: "lg:col-span-5" },
  ],
}

export const MAX_ITEMS_PER_BLOCK = 12
export const MAX_ITEM_LENGTH = 280

const itemsSchema = z
  .array(z.string().trim().min(1).max(MAX_ITEM_LENGTH))
  .max(MAX_ITEMS_PER_BLOCK)

export type CanvasBlocks = Record<string, string[]>

export function isCanvasKind(value: unknown): value is CanvasKind {
  return value === "bmc" || value === "lean"
}

export function emptyCanvas(kind: CanvasKind): CanvasBlocks {
  return Object.fromEntries(CANVAS_BLOCKS[kind].map((key) => [key, []]))
}

/** Keeps only this canvas's blocks, trims items, drops empties and overflow. */
export function normalizeCanvas(kind: CanvasKind, raw: unknown): CanvasBlocks {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const blocks = emptyCanvas(kind)
  for (const key of CANVAS_BLOCKS[kind]) {
    const value = source[key]
    const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : []
    const cleaned = list
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.replace(/\s+/g, " ").trim().slice(0, MAX_ITEM_LENGTH))
      .filter(Boolean)
      .slice(0, MAX_ITEMS_PER_BLOCK)
    const parsed = itemsSchema.safeParse(cleaned)
    blocks[key] = parsed.success ? parsed.data : []
  }
  return blocks
}

export function readCanvasContent(kind: CanvasKind, content: unknown): CanvasBlocks {
  const blocks = content && typeof content === "object" ? (content as { blocks?: unknown }).blocks : null
  return normalizeCanvas(kind, blocks)
}

export function canvasCompletion(kind: CanvasKind, blocks: CanvasBlocks): { filled: number; total: number } {
  const keys = CANVAS_BLOCKS[kind]
  return { filled: keys.filter((key) => (blocks[key]?.length ?? 0) > 0).length, total: keys.length }
}

/** Zod schema for a full AI draft: every block of the chosen canvas, as short items. */
export function canvasDraftSchema(kind: CanvasKind) {
  const shape = Object.fromEntries(
    CANVAS_BLOCKS[kind].map((key) => [
      key,
      z.array(z.coerce.string().trim().min(1).max(MAX_ITEM_LENGTH)).min(1).max(6),
    ]),
  )
  return z.object(shape)
}

export const suggestionsSchema = z.object({
  suggestions: z.array(z.string().trim().min(1).max(MAX_ITEM_LENGTH)).min(1).max(6),
})

export const canvasReviewSchema = z.object({
  verdict: z.string().trim().min(1).max(600),
  strengths: z.array(z.string().trim().min(1).max(400)).max(6).default([]),
  gaps: z.array(z.string().trim().min(1).max(400)).max(8).default([]),
  improvements: z
    .array(
      z.object({
        block: z.string().trim().max(60),
        suggestion: z.string().trim().min(1).max(500),
      }),
    )
    .max(10)
    .default([]),
})

export type CanvasReview = z.infer<typeof canvasReviewSchema>

/** Plain-English block names for prompts (the UI uses the dictionary). */
export const BLOCK_PROMPT_NAME: Record<CanvasBlockKey, string> = {
  keyPartnerships: "Key Partnerships",
  keyActivities: "Key Activities",
  keyResources: "Key Resources",
  valuePropositions: "Value Propositions",
  customerRelationships: "Customer Relationships",
  channels: "Channels",
  customerSegments: "Customer Segments",
  costStructure: "Cost Structure",
  revenueStreams: "Revenue Streams",
  problem: "Problem (top problems and existing alternatives)",
  solution: "Solution",
  keyMetrics: "Key Metrics",
  uniqueValueProposition: "Unique Value Proposition",
  unfairAdvantage: "Unfair Advantage",
}

export function describeCanvasForPrompt(kind: CanvasKind, blocks: CanvasBlocks): string {
  return CANVAS_BLOCKS[kind]
    .map((key) => `${BLOCK_PROMPT_NAME[key]}: ${blocks[key]?.length ? blocks[key].join("; ") : "(empty)"}`)
    .join("\n")
}
