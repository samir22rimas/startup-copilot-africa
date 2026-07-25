"use client"

import { deleteKnowledgeDocument, uploadKnowledgeDocument, type VaultDocument } from "@/src/app/actions/documents"
import { PROVENANCE_HINT } from "@/src/lib/data-truth"
import { FileText, Loader2, Trash2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentVault({
  projectId,
  initialDocuments,
}: {
  projectId: string
  initialDocuments: VaultDocument[]
}) {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = React.useState(initialDocuments)
  const [uploading, setUploading] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    setDocuments(initialDocuments)
  }, [initialDocuments])

  async function handleUpload(fileList: FileList | null) {
    const file = fileList?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      formData.set("projectId", projectId)
      const res = await uploadKnowledgeDocument(formData)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setDocuments((prev) => [res.document, ...prev])
      toast.success(
        res.document.hasExtractedText
          ? "Document uploaded — text is available to Copilot"
          : "Document uploaded — stored by filename (text extraction limited for this type)",
      )
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error("Upload failed")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await deleteKnowledgeDocument(id)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      setDocuments((prev) => prev.filter((d) => d.id !== id))
      toast.success("Document removed")
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-8 pb-12 font-sans">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-green-700">Knowledge vault</p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
            Your startup documents
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Upload pitch notes, research, or plans. Extracted text becomes tracked context for Copilot — not invented
            content.
          </p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt,.md,.markdown,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-700 px-5 text-sm font-semibold text-white shadow-sm hover:bg-green-800 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {uploading ? "Uploading…" : "Upload document"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/40 px-4 py-3 text-xs text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
        <span className="font-bold uppercase tracking-wider">Tracked</span>
        <span className="mx-2 text-emerald-700/50">·</span>
        {PROVENANCE_HINT.tracked} TXT/Markdown are fully readable by Copilot; PDF/DOCX are stored and referenced by
        name until extraction improves.
      </div>

      {!documents.length ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/80 px-6 py-20 text-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <FileText className="size-8 text-green-700" />
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">No documents yet</h2>
          <p className="max-w-md text-sm text-zinc-500">
            Add a business brief, market research, or pitch draft so advice is grounded in your real materials.
          </p>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="mt-2 inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold dark:border-zinc-800 dark:bg-zinc-900"
          >
            <Upload className="size-4" /> Upload first file
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="size-4 shrink-0 text-green-700" />
                  <h3 className="truncate font-semibold text-zinc-900 dark:text-white">{doc.fileName}</h3>
                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                    Tracked
                  </span>
                  <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {doc.hasExtractedText ? "Text ready" : "File only"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatBytes(doc.sizeBytes)} · {doc.mimeType || "unknown type"} ·{" "}
                  {new Date(doc.createdAt).toLocaleString()}
                </p>
                {doc.excerpt ? (
                  <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{doc.excerpt}</p>
                ) : (
                  <p className="mt-2 text-xs text-zinc-400">
                    No extracted text — Copilot will still see this filename in context.
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={deletingId === doc.id}
                onClick={() => handleDelete(doc.id)}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-xl border border-red-200 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
              >
                {deletingId === doc.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
