/**
 * Storage for workspace documents that have a body and a history: canvases,
 * business plans, research reports, analyses, financial models.
 *
 * All access goes through the caller's own session, so row-level security
 * decides what they can read or change.
 */
import type { Json } from "@/src/lib/database.types"
import type { ArtifactModule, ArtifactRow, ArtifactVersionRow } from "@/src/lib/database.v2.types"
import { isUuid } from "@/src/lib/validation"
import type { Workspace } from "@/src/lib/workspace"

type Ws = Pick<Workspace, "supabase" | "user" | "startup">

export const MAX_ARTIFACT_BYTES = 512 * 1024

export type ArtifactSummary = Pick<
  ArtifactRow,
  "id" | "module" | "kind" | "title" | "meta" | "current_version" | "created_at" | "updated_at"
>

const SUMMARY_COLUMNS = "id, module, kind, title, meta, current_version, created_at, updated_at"

export function fitsArtifactLimit(content: unknown): boolean {
  try {
    return JSON.stringify(content).length <= MAX_ARTIFACT_BYTES
  } catch {
    return false
  }
}

export async function listArtifacts(
  ws: Ws,
  module: ArtifactModule,
  options: { kind?: string; limit?: number } = {},
): Promise<ArtifactSummary[]> {
  let query = ws.supabase
    .from("artifacts")
    .select(SUMMARY_COLUMNS)
    .eq("startup_id", ws.startup.id)
    .eq("module", module)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(options.limit ?? 50)
  if (options.kind) query = query.eq("kind", options.kind)
  const { data } = await query
  return (data ?? []) as ArtifactSummary[]
}

export async function getArtifact(ws: Ws, id: string): Promise<ArtifactRow | null> {
  if (!isUuid(id)) return null
  const { data } = await ws.supabase
    .from("artifacts")
    .select("*")
    .eq("id", id)
    .eq("startup_id", ws.startup.id)
    .is("archived_at", null)
    .maybeSingle()
  return data
}

/** The most recently updated artifact of a kind — for one-per-business documents. */
export async function getLatestArtifact(ws: Ws, module: ArtifactModule, kind: string): Promise<ArtifactRow | null> {
  const { data } = await ws.supabase
    .from("artifacts")
    .select("*")
    .eq("startup_id", ws.startup.id)
    .eq("module", module)
    .eq("kind", kind)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

export type SaveArtifactInput = {
  id?: string | null
  module: ArtifactModule
  kind: string
  title: string
  content: unknown
  meta?: Record<string, unknown>
  /** When set, the saved state is also recorded as a new version with this note. */
  versionNote?: string | null
}

export type SaveArtifactResult = { artifact: ArtifactRow } | { error: string }

export async function saveArtifact(ws: Ws, input: SaveArtifactInput): Promise<SaveArtifactResult> {
  if (!fitsArtifactLimit(input.content)) {
    return { error: "That is too much content to save in one document. Shorten it and try again." }
  }
  const title = input.title.replace(/\s+/g, " ").trim().slice(0, 200) || "Untitled"
  const content = input.content as Json

  let artifact: ArtifactRow | null = null

  if (input.id) {
    const existing = await getArtifact(ws, input.id)
    if (!existing) return { error: "This document is no longer available." }
    const { data, error } = await ws.supabase
      .from("artifacts")
      .update({
        title,
        content,
        updated_by: ws.user.id,
        ...(input.meta ? { meta: { ...(existing.meta as Record<string, Json>), ...input.meta } as Json } : {}),
      })
      .eq("id", existing.id)
      .select("*")
      .maybeSingle()
    if (error || !data) return { error: "Could not save your changes. Please try again." }
    artifact = data
  } else {
    const { data, error } = await ws.supabase
      .from("artifacts")
      .insert({
        startup_id: ws.startup.id,
        module: input.module,
        kind: input.kind,
        title,
        content,
        meta: (input.meta ?? {}) as Json,
        created_by: ws.user.id,
        updated_by: ws.user.id,
      })
      .select("*")
      .maybeSingle()
    if (error || !data) return { error: "Could not save the document. Please try again." }
    artifact = data
  }

  if (input.versionNote !== undefined && input.versionNote !== null) {
    const versioned = await recordVersion(ws, artifact, input.versionNote)
    if (versioned) artifact = versioned
  }
  return { artifact }
}

/** Appends the artifact's current state to its history. */
async function recordVersion(ws: Ws, artifact: ArtifactRow, note: string): Promise<ArtifactRow | null> {
  const { data: last } = await ws.supabase
    .from("artifact_versions")
    .select("version")
    .eq("artifact_id", artifact.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle()
  const version = (last?.version ?? 0) + 1

  const { error } = await ws.supabase.from("artifact_versions").insert({
    artifact_id: artifact.id,
    startup_id: artifact.startup_id,
    version,
    title: artifact.title,
    content: artifact.content,
    note: note.trim().slice(0, 300) || null,
    created_by: ws.user.id,
  })
  if (error) {
    console.warn("[artifacts] version not recorded:", error.message)
    return null
  }

  const { data } = await ws.supabase
    .from("artifacts")
    .update({ current_version: version })
    .eq("id", artifact.id)
    .select("*")
    .maybeSingle()
  return data
}

export type ArtifactVersionSummary = Pick<
  ArtifactVersionRow,
  "id" | "version" | "title" | "note" | "created_at" | "created_by"
>

export async function listArtifactVersions(ws: Ws, artifactId: string, limit = 50): Promise<ArtifactVersionSummary[]> {
  if (!isUuid(artifactId)) return []
  const { data } = await ws.supabase
    .from("artifact_versions")
    .select("id, version, title, note, created_at, created_by")
    .eq("artifact_id", artifactId)
    .eq("startup_id", ws.startup.id)
    .order("version", { ascending: false })
    .limit(limit)
  return (data ?? []) as ArtifactVersionSummary[]
}

export async function getArtifactVersion(ws: Ws, versionId: string): Promise<ArtifactVersionRow | null> {
  if (!isUuid(versionId)) return null
  const { data } = await ws.supabase
    .from("artifact_versions")
    .select("*")
    .eq("id", versionId)
    .eq("startup_id", ws.startup.id)
    .maybeSingle()
  return data
}

/** Brings an old version back as the current content (and records that as a new version). */
export async function restoreArtifactVersion(ws: Ws, versionId: string): Promise<SaveArtifactResult> {
  const version = await getArtifactVersion(ws, versionId)
  if (!version) return { error: "That version is no longer available." }
  const artifact = await getArtifact(ws, version.artifact_id)
  if (!artifact) return { error: "This document is no longer available." }
  return saveArtifact(ws, {
    id: artifact.id,
    module: artifact.module,
    kind: artifact.kind,
    title: version.title,
    content: version.content,
    versionNote: `Restored version ${version.version}`,
  })
}

export async function deleteArtifact(ws: Ws, id: string): Promise<boolean> {
  if (!isUuid(id)) return false
  const { error, count } = await ws.supabase
    .from("artifacts")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("startup_id", ws.startup.id)
  return !error && (count ?? 0) > 0
}
