"use server"

import { revalidatePath } from "next/cache"

import { baseSystemPrompt, fence } from "@/src/lib/ai/guard"
import { runAi } from "@/src/lib/ai/service"
import { STORAGE_BUCKETS } from "@/src/lib/constants"
import type { Json } from "@/src/lib/database.types"
import { cleanText, isUuid } from "@/src/lib/validation"
import { fail, requireWorkspace, type ActionResult } from "@/src/lib/workspace"

const PATH = "/dashboard/documents"

export interface CenterDocument {
  id: string
  fileName: string
  mimeType: string | null
  sizeBytes: number | null
  folder: string | null
  projectId: string | null
  hasText: boolean
  excerpt: string | null
  aiSummary: string | null
  createdAt: string
}

const COLUMNS = "id, file_name, mime_type, size_bytes, folder, project_id, extracted_text, metadata, created_at"

type Row = {
  id: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
  folder: string | null
  project_id: string | null
  extracted_text: string | null
  metadata: Json
  created_at: string
}

function meta(row: Row): Record<string, Json | undefined> {
  return row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {}
}

function toDocument(row: Row): CenterDocument {
  const text = row.extracted_text?.trim() ?? ""
  const summary = meta(row).ai_summary
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    folder: row.folder,
    projectId: row.project_id,
    hasText: Boolean(text),
    excerpt: text ? text.slice(0, 220).replace(/\s+/g, " ") + (text.length > 220 ? "…" : "") : null,
    aiSummary: typeof summary === "string" ? summary : null,
    createdAt: row.created_at,
  }
}

/**
 * Documents of the active business. `query` searches file names and the
 * text extracted from the files.
 */
export async function listCenterDocuments(query?: string): Promise<CenterDocument[]> {
  const ws = await requireWorkspace("view")
  if ("error" in ws) return []

  let request = ws.supabase
    .from("knowledge_documents")
    .select(COLUMNS)
    .eq("startup_id", ws.startup.id)
    .order("created_at", { ascending: false })
    .limit(300)

  // Strip characters that have meaning in PostgREST filters and LIKE patterns.
  const term = cleanText(query, 80).replace(/[%_,()\\*"']/g, " ").trim()
  if (term.length >= 2) request = request.or(`file_name.ilike.%${term}%,extracted_text.ilike.%${term}%`)

  const { data } = await request
  return ((data ?? []) as Row[]).map(toDocument)
}

/** Moves a document into a folder (or out of one, with an empty name). */
export async function setDocumentFolder(documentId: string, folder: string): Promise<ActionResult<{ folder: string | null }>> {
  if (!isUuid(documentId)) return fail("That document is not available.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const name = cleanText(folder, 80).replace(/[\\/]+/g, " ").replace(/\s+/g, " ").trim() || null
  const { error, count } = await ws.supabase
    .from("knowledge_documents")
    .update({ folder: name }, { count: "exact" })
    .eq("id", documentId)
    .eq("startup_id", ws.startup.id)
  if (error || !count) return fail("Could not move the document. Only the uploader and administrators can change it.")
  revalidatePath(PATH)
  return { success: true, folder: name }
}

/** Links a document to one of the business's projects, or to none. */
export async function setDocumentProject(documentId: string, projectId: string | null): Promise<ActionResult> {
  if (!isUuid(documentId) || (projectId !== null && !isUuid(projectId))) return fail("That document is not available.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  if (projectId) {
    const { data: project } = await ws.supabase.from("projects").select("id").eq("id", projectId).eq("startup_id", ws.startup.id).maybeSingle()
    if (!project) return fail("That project is not available.")
  }
  const { error, count } = await ws.supabase
    .from("knowledge_documents")
    .update({ project_id: projectId }, { count: "exact" })
    .eq("id", documentId)
    .eq("startup_id", ws.startup.id)
  if (error || !count) return fail("Could not update the document.")
  revalidatePath(PATH)
  return { success: true }
}

/** A short-lived link to download or preview the stored file. */
export async function getDocumentUrl(documentId: string): Promise<ActionResult<{ url: string }>> {
  if (!isUuid(documentId)) return fail("That document is not available.")
  const ws = await requireWorkspace("view")
  if ("error" in ws) return fail(ws.error)

  const { data: row } = await ws.supabase
    .from("knowledge_documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("startup_id", ws.startup.id)
    .maybeSingle()
  if (!row) return fail("That document is not available.")

  // Signed with the caller's own session: storage policies check membership again.
  const { data, error } = await ws.supabase.storage.from(STORAGE_BUCKETS.startupDocuments).createSignedUrl(row.storage_path, 120)
  if (error || !data?.signedUrl) return fail("The file could not be opened. Please try again.")
  return { success: true, url: data.signedUrl }
}

/** The extracted text of a document, for the in-app preview. */
export async function getDocumentText(documentId: string): Promise<ActionResult<{ text: string; truncated: boolean }>> {
  if (!isUuid(documentId)) return fail("That document is not available.")
  const ws = await requireWorkspace("view")
  if ("error" in ws) return fail(ws.error)
  const { data } = await ws.supabase
    .from("knowledge_documents")
    .select("extracted_text")
    .eq("id", documentId)
    .eq("startup_id", ws.startup.id)
    .maybeSingle()
  const text = data?.extracted_text?.trim() ?? ""
  if (!text) return fail("No readable text was found in this file. Download it to view it.")
  return { success: true, text: text.slice(0, 30_000), truncated: text.length > 30_000 }
}

/** Summarises a document with AI and stores the summary with it. */
export async function summarizeDocument(documentId: string): Promise<ActionResult<{ summary: string }>> {
  if (!isUuid(documentId)) return fail("That document is not available.")
  const ws = await requireWorkspace("edit")
  if ("error" in ws) return fail(ws.error)

  const { data: row } = await ws.supabase
    .from("knowledge_documents")
    .select(COLUMNS)
    .eq("id", documentId)
    .eq("startup_id", ws.startup.id)
    .maybeSingle()
  if (!row) return fail("That document is not available.")
  const text = (row as Row).extracted_text?.trim() ?? ""
  if (text.length < 80) return fail("There is not enough readable text in this file to summarise.")

  const result = await runAi({
    feature: "documents.summary",
    caller: ws.caller,
    gate: "documents",
    system: baseSystemPrompt({
      role: "a business analyst",
      locale: ws.locale,
      extra: `Summarise the document for a busy founder, in Markdown:
- one sentence saying what the document is;
- **Key points** (3 to 6 bullets);
- **Numbers and dates** mentioned, exactly as written (omit this part if there are none);
- **What it means for the business** (1 to 3 bullets).
Use only what is in the document. Do not add outside facts. If the text is cut off or unclear, say so. Under 220 words.`,
    }),
    messages: [
      {
        role: "user",
        content: `Business: ${ws.startup.name}\nFile name: ${(row as Row).file_name.replace(/[<>]/g, "")}\n\n${fence("document", text, 14_000)}`,
      },
    ],
    maxTokens: 700,
    temperature: 0.2,
  })
  if (!result.ok) return fail(result.error)

  const metadata = { ...meta(row as Row), ai_summary: result.text, ai_summary_at: new Date().toISOString() }
  const { error, count } = await ws.supabase
    .from("knowledge_documents")
    .update({ metadata: metadata as Json }, { count: "exact" })
    .eq("id", documentId)
    .eq("startup_id", ws.startup.id)
  // The summary is still returned when it cannot be stored (the caller may not be the uploader).
  if (error || !count) console.warn("[documents] summary not stored:", error?.message ?? "not permitted")

  revalidatePath(PATH)
  return { success: true, summary: result.text }
}
