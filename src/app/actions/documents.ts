"use server"

import { STORAGE_BUCKETS } from "@/src/lib/constants"
import type { DocumentStatus } from "@/src/lib/database.types"
import { createSupabaseServerClient } from "@/src/lib/supabase/server"
import { revalidatePath } from "next/cache"

const MAX_BYTES = 25 * 1024 * 1024
const ALLOWED_MIME = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

const ALLOWED_EXT = new Set([".pdf", ".txt", ".md", ".markdown", ".docx"])

export interface VaultDocument {
  id: string
  fileName: string
  mimeType: string | null
  sizeBytes: number | null
  status: DocumentStatus
  hasExtractedText: boolean
  excerpt: string | null
  createdAt: string
  projectId: string | null
}

function extensionOf(name: string) {
  const i = name.lastIndexOf(".")
  return i >= 0 ? name.slice(i).toLowerCase() : ""
}

function isAllowedFile(file: File) {
  const ext = extensionOf(file.name)
  return ALLOWED_MIME.has(file.type) || ALLOWED_EXT.has(ext)
}

async function extractTextFromUpload(file: File): Promise<{ text: string | null; status: DocumentStatus }> {
  const ext = extensionOf(file.name)
  const isText =
    file.type === "text/plain" ||
    file.type === "text/markdown" ||
    ext === ".txt" ||
    ext === ".md" ||
    ext === ".markdown"

  if (!isText) {
    // PDF/DOCX stored for reference; binary extraction not available in-app yet
    return { text: null, status: "ready" }
  }

  try {
    const raw = await file.text()
    const text = raw.replace(/\0/g, "").trim().slice(0, 100_000)
    if (!text) return { text: null, status: "failed" }
    return { text, status: "ready" }
  } catch {
    return { text: null, status: "failed" }
  }
}

async function getOwnedStartupAndProject(projectId?: string | null) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Please sign in." as const }

  const { data: startup } = await supabase
    .from("startups")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle()
  if (!startup) return { error: "Startup not found." as const }

  let project: { id: string; title: string } | null = null
  if (projectId) {
    const { data } = await supabase
      .from("projects")
      .select("id, title")
      .eq("id", projectId)
      .eq("startup_id", startup.id)
      .maybeSingle()
    project = data
  } else {
    const { data } = await supabase
      .from("projects")
      .select("id, title")
      .eq("startup_id", startup.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    project = data
  }

  return { supabase, user, startup, project }
}

function mapRow(row: {
  id: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
  status: DocumentStatus
  extracted_text: string | null
  created_at: string
  project_id: string | null
}): VaultDocument {
  const excerpt = row.extracted_text
    ? row.extracted_text.slice(0, 180).replace(/\s+/g, " ").trim() + (row.extracted_text.length > 180 ? "…" : "")
    : null
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    status: row.status,
    hasExtractedText: Boolean(row.extracted_text?.trim()),
    excerpt,
    createdAt: row.created_at,
    projectId: row.project_id,
  }
}

export async function listKnowledgeDocuments(
  projectId?: string,
): Promise<{ success: true; documents: VaultDocument[] } | { success: false; error: string }> {
  const owned = await getOwnedStartupAndProject(projectId)
  if ("error" in owned) return { success: false, error: owned.error ?? "Unknown error" }

  const { supabase, startup } = owned
  const { data, error } = await supabase
    .from("knowledge_documents")
    .select("id, file_name, mime_type, size_bytes, status, extracted_text, created_at, project_id")
    .eq("startup_id", startup.id)
    .order("created_at", { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, documents: (data || []).map(mapRow) }
}

export async function uploadKnowledgeDocument(
  formData: FormData,
): Promise<{ success: true; document: VaultDocument } | { success: false; error: string }> {
  const projectId = String(formData.get("projectId") || "")
  const file = formData.get("file")
  if (!(file instanceof File)) return { success: false, error: "Choose a file to upload." }
  if (!file.size) return { success: false, error: "The file is empty." }
  if (file.size > MAX_BYTES) return { success: false, error: "File must be 25MB or smaller." }
  if (!isAllowedFile(file)) {
    return { success: false, error: "Allowed types: PDF, TXT, Markdown, DOCX." }
  }

  const owned = await getOwnedStartupAndProject(projectId || null)
  if ("error" in owned) return { success: false, error: owned.error ?? "Unknown error" }

  const { supabase, user, startup, project } = owned
  const { text, status } = await extractTextFromUpload(file)

  const safeName = file.name.replace(/[^\w.\-()+\s]/g, "_").slice(0, 120)
  const storagePath = `${startup.id}/${Date.now()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.startupDocuments)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })

  if (uploadError) {
    console.error("Storage upload failed", uploadError)
    return {
      success: false,
      error:
        uploadError.message.includes("Bucket") || uploadError.message.includes("not found")
          ? "Document storage is not configured. Create the startup-documents bucket in Supabase."
          : uploadError.message,
    }
  }

  const summary =
    text?.slice(0, 240).replace(/\s+/g, " ").trim() ||
    (file.type.includes("pdf") || extensionOf(file.name) === ".pdf"
      ? "PDF on file — text not extracted yet; Copilot can still see the filename."
      : "Document on file.")

  const { data: row, error: insertError } = await supabase
    .from("knowledge_documents")
    .insert({
      startup_id: startup.id,
      project_id: project?.id ?? null,
      uploaded_by: user.id,
      file_name: file.name.slice(0, 200),
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size,
      status,
      extracted_text: text,
      metadata: {
        summary,
        original_name: file.name,
        text_extracted: Boolean(text),
      },
    })
    .select("id, file_name, mime_type, size_bytes, status, extracted_text, created_at, project_id")
    .single()

  if (insertError || !row) {
    await supabase.storage.from(STORAGE_BUCKETS.startupDocuments).remove([storagePath])
    return { success: false, error: insertError?.message || "Could not save document record." }
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/documents")
  revalidatePath("/dashboard/marketing")
  return { success: true, document: mapRow(row) }
}

export async function deleteKnowledgeDocument(
  documentId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const owned = await getOwnedStartupAndProject()
  if ("error" in owned) return { success: false, error: owned.error ?? "Unknown error" }

  const { supabase, startup } = owned
  const { data: doc, error: fetchError } = await supabase
    .from("knowledge_documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("startup_id", startup.id)
    .maybeSingle()

  if (fetchError || !doc) return { success: false, error: "Document not found." }

  await supabase.storage.from(STORAGE_BUCKETS.startupDocuments).remove([doc.storage_path])

  const { error } = await supabase.from("knowledge_documents").delete().eq("id", doc.id)
  if (error) return { success: false, error: error.message }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/documents")
  revalidatePath("/dashboard/marketing")
  return { success: true }
}

/** Compact context block for AI prompts (copilot, generators). */
export async function getDocumentContextForStartup(
  startupId: string,
  limit = 6,
): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("knowledge_documents")
    .select("file_name, extracted_text, status, mime_type")
    .eq("startup_id", startupId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (!data?.length) return "No founder-uploaded documents on file yet."

  return data
    .map((doc, i) => {
      const body = doc.extracted_text?.trim()
        ? doc.extracted_text.trim().slice(0, 2500)
        : "(No extracted text — binary file stored by filename only.)"
      return `[Doc ${i + 1}] ${doc.file_name} (${doc.status})\n${body}`
    })
    .join("\n\n")
}
