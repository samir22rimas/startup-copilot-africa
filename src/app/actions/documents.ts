"use server";

import { randomBytes } from "node:crypto";

import { STORAGE_BUCKETS } from "@/src/lib/constants";
import type { DocumentStatus } from "@/src/lib/database.types";
import {
  DOCUMENT_MAX_BYTES,
  detectDocumentKind,
  documentExtension,
  isSafeStoragePath,
  type DocumentKind,
} from "@/src/lib/document-files";
import { checkRateLimit } from "@/src/lib/rate-limiter";
import {
  getActiveStartupAccess,
  getProjectAccess,
  type StartupAccess,
} from "@/src/lib/workspace-access";
import { isUuid } from "@/src/lib/validation";
import { revalidatePath } from "next/cache";

const UPLOAD_RATE_LIMIT = { maxRequests: 30, windowSeconds: 3600 } as const;

const DOCUMENT_COLUMNS =
  "id, file_name, mime_type, size_bytes, status, extracted_text, created_at, project_id";

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n[\t ]+/g, "\n")
    .replace(/[\t ]{2,}/g, " ")
    .trim()
    .slice(0, 100_000);
}

export interface VaultDocument {
  id: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  status: DocumentStatus;
  hasExtractedText: boolean;
  excerpt: string | null;
  createdAt: string;
  projectId: string | null;
}

type DocumentRow = {
  id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  status: DocumentStatus;
  extracted_text: string | null;
  created_at: string;
  project_id: string | null;
};

type UploadResult =
  | { success: true; document: VaultDocument }
  | { success: false; error: string };

async function extractText(
  buffer: Buffer,
  kind: DocumentKind,
): Promise<{ text: string | null; status: DocumentStatus }> {
  try {
    if (kind.id === "text") {
      const text = normalizeExtractedText(buffer.toString("utf8"));
      return text ? { text, status: "ready" } : { text: null, status: "failed" };
    }

    if (kind.id === "pdf") {
      const pdfModule = await import("pdf-parse");
      const parser = new pdfModule.PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        const text = normalizeExtractedText(result?.text || "");
        return { text: text || null, status: "ready" };
      } finally {
        await parser.destroy();
      }
    }

    if (kind.id === "xlsx") {
      const text = normalizeExtractedText(await extractSpreadsheetText(buffer));
      return { text: text || null, status: "ready" };
    }

    const mammoth = await import("mammoth");
    const docxResult = await mammoth.extractRawText({ buffer });
    const text = normalizeExtractedText(docxResult?.value || "");
    return { text: text || null, status: "ready" };
  } catch (error) {
    // The file is still stored; Copilot just can't read its text.
    console.error("Document text extraction failed:", error);
    return { text: null, status: "ready" };
  }
}

/**
 * Text content of an .xlsx workbook: the shared strings (cell text) of every
 * sheet. Numbers stored as numeric cells are not included — enough for the AI
 * to understand what a spreadsheet is about, not a full data import.
 */
async function extractSpreadsheetText(buffer: Buffer): Promise<string> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buffer);
  const shared = zip.file("xl/sharedStrings.xml");
  if (!shared) return "";
  const xml = await shared.async("string");
  const cells = Array.from(xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g), (match) =>
    match[1]
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&")
      .trim(),
  ).filter(Boolean);
  return cells.join("\n");
}

function mapRow(row: DocumentRow): VaultDocument {
  const excerpt = row.extracted_text
    ? row.extracted_text.slice(0, 180).replace(/\s+/g, " ").trim() +
      (row.extracted_text.length > 180 ? "…" : "")
    : null;
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
  };
}

/**
 * Workspace for a document operation: the project's startup when a project is
 * given, otherwise the startup selected in the sidebar. Membership is checked
 * here and again by row-level security.
 */
async function resolveWorkspace(
  projectId?: string | null,
): Promise<(StartupAccess & { projectId: string | null }) | { error: string }> {
  if (projectId) {
    const access = await getProjectAccess(projectId);
    if ("error" in access) return access;
    return { ...access, projectId: access.project.id };
  }
  const access = await getActiveStartupAccess();
  if ("error" in access) return access;
  return { ...access, projectId: null };
}

function revalidateDocumentViews() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard/marketing");
}

function safeFileName(name: string) {
  return (
    name
      .normalize("NFKC")
      .replace(/[^\w.\-()+ ]/g, "_")
      .replace(/\.{2,}/g, ".")
      .replace(/^[.\s]+/, "")
      .slice(-120) || "document"
  );
}

/** Validates the bytes, extracts text and records the document. */
async function recordDocument(
  workspace: StartupAccess & { projectId: string | null },
  input: { buffer: Buffer; originalName: string; storagePath: string; kind: DocumentKind },
): Promise<UploadResult> {
  const { supabase, user, startup, projectId } = workspace;
  const { text, status } = await extractText(input.buffer, input.kind);

  const summary =
    text?.slice(0, 240).replace(/\s+/g, " ").trim() ||
    (input.kind.id === "pdf"
      ? "PDF on file — text not extracted yet; Copilot can still see the filename."
      : "Document on file.");

  const displayName = input.originalName.replace(/[\u0000-\u001f]/g, "").slice(0, 200) || "document";

  const { data: row, error: insertError } = await supabase
    .from("knowledge_documents")
    .insert({
      startup_id: startup.id,
      project_id: projectId,
      uploaded_by: user.id,
      file_name: displayName,
      storage_path: input.storagePath,
      // Derived from the verified file signature, never from the browser.
      mime_type: input.kind.mime,
      size_bytes: input.buffer.byteLength,
      status,
      extracted_text: text,
      metadata: {
        summary,
        original_name: displayName,
        text_extracted: Boolean(text),
      },
    })
    .select(DOCUMENT_COLUMNS)
    .single();

  if (insertError || !row) {
    console.error("Document record insert failed:", insertError?.message);
    await supabase.storage.from(STORAGE_BUCKETS.startupDocuments).remove([input.storagePath]);
    return { success: false, error: "Could not save the document. Please try again." };
  }

  revalidateDocumentViews();
  return { success: true, document: mapRow(row) };
}

export async function listKnowledgeDocuments(
  projectId?: string,
): Promise<
  | { success: true; documents: VaultDocument[] }
  | { success: false; error: string }
> {
  const workspace = await resolveWorkspace(projectId);
  if ("error" in workspace) return { success: false, error: workspace.error };

  const { supabase, startup } = workspace;
  const { data, error } = await supabase
    .from("knowledge_documents")
    .select(DOCUMENT_COLUMNS)
    .eq("startup_id", startup.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listKnowledgeDocuments", error.message);
    return { success: false, error: "Could not load your documents." };
  }
  return { success: true, documents: (data || []).map(mapRow) };
}

/**
 * Upload path for small files: the file travels through this server action.
 * (Hosting platforms cap request bodies at a few MB, so larger files use
 * `prepareDocumentUpload` + `registerUploadedDocument` instead.)
 */
export async function uploadKnowledgeDocument(formData: FormData): Promise<UploadResult> {
  const projectId = String(formData.get("projectId") || "");
  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "Choose a file to upload." };
  if (!file.size) return { success: false, error: "The file is empty." };
  if (file.size > DOCUMENT_MAX_BYTES) return { success: false, error: "File must be 25MB or smaller." };
  if (!documentExtension(file.name)) {
    return { success: false, error: "Allowed types: PDF, DOCX, XLSX, CSV, TXT, Markdown." };
  }

  const workspace = await resolveWorkspace(projectId || null);
  if ("error" in workspace) return { success: false, error: workspace.error };

  const limit = await checkRateLimit(workspace.user.id, "document_upload", UPLOAD_RATE_LIMIT);
  if (!limit.allowed) return { success: false, error: limit.message };

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = detectDocumentKind(file.name, buffer);
  if (!kind) {
    return {
      success: false,
      error: "That file's contents don't match its type. Allowed: PDF, DOCX, XLSX, CSV, TXT, Markdown.",
    };
  }

  const storagePath = `${workspace.startup.id}/${Date.now()}-${randomBytes(6).toString("hex")}-${safeFileName(file.name)}`;

  const { error: uploadError } = await workspace.supabase.storage
    .from(STORAGE_BUCKETS.startupDocuments)
    .upload(storagePath, buffer, { contentType: kind.mime, upsert: false });

  if (uploadError) {
    console.error("Storage upload failed", uploadError);
    return {
      success: false,
      error:
        uploadError.message.includes("Bucket") || uploadError.message.includes("not found")
          ? "Document storage is not configured. Create the startup-documents bucket in Supabase."
          : "The upload failed. Please try again.",
    };
  }

  return recordDocument(workspace, { buffer, originalName: file.name, storagePath, kind });
}

/**
 * Step 1 of the large-file path: hands the browser a storage path inside the
 * caller's own startup folder. The browser then uploads straight to Supabase
 * Storage (whose policies only accept members of that startup).
 */
export async function prepareDocumentUpload(
  projectId: string,
  fileName: string,
  sizeBytes: number,
): Promise<
  | { success: true; storagePath: string; contentType: string }
  | { success: false; error: string }
> {
  if (typeof fileName !== "string" || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { success: false, error: "Choose a file to upload." };
  }
  if (sizeBytes > DOCUMENT_MAX_BYTES) return { success: false, error: "File must be 25MB or smaller." };
  const ext = documentExtension(fileName);
  if (!ext) return { success: false, error: "Allowed types: PDF, DOCX, XLSX, CSV, TXT, Markdown." };

  const workspace = await resolveWorkspace(projectId || null);
  if ("error" in workspace) return { success: false, error: workspace.error };

  const limit = await checkRateLimit(workspace.user.id, "document_upload", UPLOAD_RATE_LIMIT);
  if (!limit.allowed) return { success: false, error: limit.message };

  return {
    success: true,
    storagePath: `${workspace.startup.id}/${Date.now()}-${randomBytes(6).toString("hex")}-${safeFileName(fileName)}`,
    contentType: ext.mime,
  };
}

/**
 * Step 2 of the large-file path: re-reads the stored object with the caller's
 * session, verifies size and file signature server-side, then records it.
 * Anything that fails verification is deleted from storage.
 */
export async function registerUploadedDocument(
  projectId: string,
  storagePath: string,
  originalName: string,
): Promise<UploadResult> {
  if (typeof originalName !== "string" || typeof storagePath !== "string") {
    return { success: false, error: "Upload could not be verified." };
  }

  const workspace = await resolveWorkspace(projectId || null);
  if ("error" in workspace) return { success: false, error: workspace.error };

  if (!isSafeStoragePath(storagePath, workspace.startup.id)) {
    return { success: false, error: "Upload could not be verified." };
  }

  // A path that is already registered must never be re-processed (or cleaned up).
  const { data: existing } = await workspace.supabase
    .from("knowledge_documents")
    .select("id")
    .eq("storage_path", storagePath)
    .maybeSingle();
  if (existing) return { success: false, error: "That document is already in your vault." };

  const bucket = workspace.supabase.storage.from(STORAGE_BUCKETS.startupDocuments);
  const { data: blob, error: downloadError } = await bucket.download(storagePath);
  if (downloadError || !blob) {
    return { success: false, error: "The uploaded file could not be found. Please try again." };
  }

  const reject = async (error: string): Promise<UploadResult> => {
    await bucket.remove([storagePath]);
    return { success: false, error };
  };

  if (!blob.size) return reject("The file is empty.");
  if (blob.size > DOCUMENT_MAX_BYTES) return reject("File must be 25MB or smaller.");

  const buffer = Buffer.from(await blob.arrayBuffer());
  const kind = detectDocumentKind(originalName, buffer);
  if (!kind) {
    return reject("That file's contents don't match its type. Allowed: PDF, DOCX, XLSX, CSV, TXT, Markdown.");
  }

  return recordDocument(workspace, { buffer, originalName, storagePath, kind });
}

export async function deleteKnowledgeDocument(
  documentId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  if (!isUuid(documentId)) return { success: false, error: "Document not found." };

  const workspace = await resolveWorkspace();
  if ("error" in workspace) return { success: false, error: workspace.error };

  const { supabase, startup } = workspace;

  // Delete the record first. RLS only lets the uploader or a startup admin do
  // this; if it removes nothing, the stored file must be left untouched.
  const { data: deleted, error } = await supabase
    .from("knowledge_documents")
    .delete()
    .eq("id", documentId)
    .eq("startup_id", startup.id)
    .select("storage_path");

  if (error) {
    console.error("deleteKnowledgeDocument", error.message);
    return { success: false, error: "Could not remove the document." };
  }
  if (!deleted?.length) {
    return {
      success: false,
      error: "Document not found, or only the uploader and startup admins can remove it.",
    };
  }

  await supabase.storage
    .from(STORAGE_BUCKETS.startupDocuments)
    .remove(deleted.map((doc) => doc.storage_path));

  revalidateDocumentViews();
  return { success: true };
}
