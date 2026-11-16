"use server"

import { revalidatePath } from "next/cache"

import { buildBusinessContext } from "@/src/lib/ai/context"
import { baseSystemPrompt, fence } from "@/src/lib/ai/guard"
import { runAiStructured } from "@/src/lib/ai/service"
import {
  BLOCK_PROMPT_NAME,
  CANVAS_BLOCKS,
  canvasDraftSchema,
  canvasReviewSchema,
  describeCanvasForPrompt,
  isCanvasKind,
  normalizeCanvas,
  readCanvasContent,
  suggestionsSchema,
  type CanvasBlockKey,
  type CanvasBlocks,
  type CanvasKind,
  type CanvasReview,
} from "@/src/lib/canvas"
import { cleanText } from "@/src/lib/validation"
import { fail, requireWorkspace, type ActionResult, type Workspace } from "@/src/lib/workspace"
import { logActivity } from "@/src/lib/workspace/activity"
import {
  getArtifactVersion,
  getLatestArtifact,
  listArtifactVersions,
  restoreArtifactVersion,
  saveArtifact,
  type ArtifactVersionSummary,
} from "@/src/lib/workspace/artifacts"

const PATH = "/dashboard/model"

export interface CanvasState {
  id: string | null
  kind: CanvasKind
  blocks: CanvasBlocks
  updatedAt: string | null
  version: number
}

const TITLE: Record<CanvasKind, string> = { bmc: "Business Model Canvas", lean: "Lean Canvas" }

async function loadCanvas(ws: Workspace, kind: CanvasKind): Promise<CanvasState> {
  const artifact = await getLatestArtifact(ws, "model", kind)
  return {
    id: artifact?.id ?? null,
    kind,
    blocks: readCanvasContent(kind, artifact?.content),
    updatedAt: artifact?.updated_at ?? null,
    version: artifact?.current_version ?? 0,
  }
}

export async function getCanvas(kind: string): Promise<CanvasState | null> {
  if (!isCanvasKind(kind)) return null
  const ws = await requireWorkspace("view")
  if ("error" in ws) return null
  return loadCanvas(ws, kind)
}

/** Autosave target. Pass `versionNote` to also record a named snapshot. */
export async function saveCanvas(input: {
  kind: string
  blocks: unknown
  versionNote?: string
}): Promise<ActionResult<{ canvas: CanvasState }>> {
  if (!isCanvasKind(input?.kind)) return fail("That canvas is not available.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const blocks = normalizeCanvas(input.kind, input.blocks)
  const existing = await getLatestArtifact(ws, "model", input.kind)
  const note = input.versionNote === undefined ? undefined : cleanText(input.versionNote, 300) || "Saved version"

  const saved = await saveArtifact(ws, {
    id: existing?.id,
    module: "model",
    kind: input.kind,
    title: TITLE[input.kind],
    content: { blocks },
    versionNote: note,
  })
  if ("error" in saved) return fail(saved.error)

  if (!existing || note) {
    await logActivity(ws, {
      action: note ? "canvas.version_saved" : "canvas.created",
      entityType: "artifact",
      entityId: saved.artifact.id,
      summary: note ? `Saved a version of the ${TITLE[input.kind]}` : `Started the ${TITLE[input.kind]}`,
    })
  }
  revalidatePath(PATH)
  return {
    success: true,
    canvas: {
      id: saved.artifact.id,
      kind: input.kind,
      blocks,
      updatedAt: saved.artifact.updated_at,
      version: saved.artifact.current_version,
    },
  }
}

function canvasSystem(ws: Workspace, kind: CanvasKind, task: string) {
  return baseSystemPrompt({
    role: "a business model coach",
    locale: ws.locale,
    extra: `You are helping fill in a ${TITLE[kind]}.
${task}
Each item is one short, concrete phrase (max 25 words) specific to this business and its country — not a generic textbook entry. Do not invent figures; where a number matters, describe what to measure instead.`,
  })
}

/** Fresh ideas for one block; nothing is saved until the founder adds them. */
export async function suggestForBlock(input: {
  kind: string
  block: string
  blocks: unknown
}): Promise<ActionResult<{ suggestions: string[] }>> {
  if (!isCanvasKind(input?.kind)) return fail("That canvas is not available.")
  const kind = input.kind
  if (!(CANVAS_BLOCKS[kind] as readonly string[]).includes(input.block)) return fail("That block is not available.")
  const block = input.block as CanvasBlockKey

  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const blocks = normalizeCanvas(kind, input.blocks)
  const context = await buildBusinessContext(ws, ["validation"])

  const result = await runAiStructured({
    feature: `canvas.suggest.${kind}`,
    caller: ws.caller,
    gate: "business_model",
    system: canvasSystem(
      ws,
      kind,
      `Suggest 4 new items for the "${BLOCK_PROMPT_NAME[block]}" block. They must be consistent with the other blocks and must not repeat items already in this block.`,
    ),
    messages: [
      {
        role: "user",
        content: `${context}\n\nCurrent canvas:\n${fence("business_data", describeCanvasForPrompt(kind, blocks), 6000)}`,
      },
    ],
    schema: suggestionsSchema,
    shape: `{ "suggestions": ["item", "item", "item", "item"] }`,
    maxTokens: 700,
    temperature: 0.7,
  })
  if (!result.ok) return fail(result.error)

  const existing = new Set(blocks[block].map((item) => item.toLowerCase()))
  return {
    success: true,
    suggestions: result.data.suggestions.filter((item) => !existing.has(item.toLowerCase())),
  }
}

/** A complete first draft, returned to the editor for the founder to accept or change. */
export async function draftCanvas(kind: string): Promise<ActionResult<{ blocks: CanvasBlocks }>> {
  if (!isCanvasKind(kind)) return fail("That canvas is not available.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const context = await buildBusinessContext(ws, ["validation", "plan"])
  const keys = CANVAS_BLOCKS[kind]

  const result = await runAiStructured({
    feature: `canvas.draft.${kind}`,
    caller: ws.caller,
    gate: "business_model",
    system: canvasSystem(ws, kind, "Draft the whole canvas: 3 to 5 items for every block."),
    messages: [{ role: "user", content: `${context}\n\nDraft the canvas now.` }],
    schema: canvasDraftSchema(kind),
    shape: `{\n${keys.map((key) => `  "${key}": ["item", "..."]  // ${BLOCK_PROMPT_NAME[key]}`).join(",\n")}\n}`,
    maxTokens: 2200,
    temperature: 0.6,
  })
  if (!result.ok) return fail(result.error)
  return { success: true, blocks: normalizeCanvas(kind, result.data) }
}

export async function reviewCanvas(input: { kind: string; blocks: unknown }): Promise<ActionResult<{ review: CanvasReview }>> {
  if (!isCanvasKind(input?.kind)) return fail("That canvas is not available.")
  const kind = input.kind
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const blocks = normalizeCanvas(kind, input.blocks)
  const context = await buildBusinessContext(ws, ["validation", "finance"])

  const result = await runAiStructured({
    feature: `canvas.review.${kind}`,
    caller: ws.caller,
    gate: "business_model",
    system: canvasSystem(
      ws,
      kind,
      `Review this canvas critically, like an experienced mentor. Check that the blocks fit together (segments ↔ value proposition ↔ channels ↔ revenue ↔ costs), point out empty or vague blocks, and flag claims that are untested assumptions. Be direct and specific.`,
    ),
    messages: [
      {
        role: "user",
        content: `${context}\n\nCanvas to review:\n${fence("business_data", describeCanvasForPrompt(kind, blocks), 6000)}`,
      },
    ],
    schema: canvasReviewSchema,
    shape: `{
  "verdict": "2-3 sentence overall assessment",
  "strengths": ["what is solid"],
  "gaps": ["inconsistency, missing piece or untested assumption"],
  "improvements": [{ "block": "name of the block", "suggestion": "specific change to make" }]
}`,
    maxTokens: 1500,
    temperature: 0.4,
  })
  if (!result.ok) return fail(result.error)
  return { success: true, review: result.data }
}

export async function listCanvasVersions(kind: string): Promise<ArtifactVersionSummary[]> {
  if (!isCanvasKind(kind)) return []
  const ws = await requireWorkspace("view")
  if ("error" in ws) return []
  const artifact = await getLatestArtifact(ws, "model", kind)
  return artifact ? listArtifactVersions(ws, artifact.id) : []
}

export async function restoreCanvasVersion(versionId: string): Promise<ActionResult<{ canvas: CanvasState }>> {
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)
  const version = await getArtifactVersion(ws, versionId)
  if (!version) return fail("That version is no longer available.")
  const restored = await restoreArtifactVersion(ws, versionId)
  if ("error" in restored) return fail(restored.error)
  const kind = restored.artifact.kind
  if (!isCanvasKind(kind)) return fail("That version is no longer available.")
  revalidatePath(PATH)
  return {
    success: true,
    canvas: {
      id: restored.artifact.id,
      kind,
      blocks: readCanvasContent(kind, restored.artifact.content),
      updatedAt: restored.artifact.updated_at,
      version: restored.artifact.current_version,
    },
  }
}
