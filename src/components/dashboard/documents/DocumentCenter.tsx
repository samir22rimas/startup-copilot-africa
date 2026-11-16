"use client"

import { Download, Eye, FileSpreadsheet, FileText, Folder, FolderInput, Loader2, Search, Sparkles, Trash2, Upload } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  getDocumentText,
  getDocumentUrl,
  listCenterDocuments,
  setDocumentFolder,
  setDocumentProject,
  summarizeDocument,
  type CenterDocument,
} from "@/src/app/actions/document-center"
import {
  deleteKnowledgeDocument,
  prepareDocumentUpload,
  registerUploadedDocument,
  uploadKnowledgeDocument,
} from "@/src/app/actions/documents"
import { Markdown } from "@/src/components/shared/Markdown"
import { Modal } from "@/src/components/ui/overlay"
import { Badge, EmptyState, Notice, Panel, inputClass, primaryButtonClass, secondaryButtonClass } from "@/src/components/ui/page"
import { STORAGE_BUCKETS } from "@/src/lib/constants"
import {
  DIRECT_UPLOAD_THRESHOLD_BYTES,
  DOCUMENT_ACCEPT,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_TYPES_LABEL,
  documentExtension,
} from "@/src/lib/document-files"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client"
import { cn } from "@/src/lib/utils"

function formatSize(bytes: number | null) {
  if (!bytes) return ""
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Small files go through the server action; larger ones upload straight to storage. */
async function uploadFile(file: File, projectId: string) {
  if (file.size <= DIRECT_UPLOAD_THRESHOLD_BYTES) {
    const formData = new FormData()
    formData.set("file", file)
    formData.set("projectId", projectId)
    return uploadKnowledgeDocument(formData)
  }
  const prepared = await prepareDocumentUpload(projectId, file.name, file.size)
  if (!prepared.success) return prepared
  const { error } = await createSupabaseBrowserClient()
    .storage.from(STORAGE_BUCKETS.startupDocuments)
    .upload(prepared.storagePath, file, { contentType: prepared.contentType, upsert: false })
  if (error) return { success: false as const, error: "The upload did not finish. Check your connection and try again." }
  return registerUploadedDocument(projectId, prepared.storagePath, file.name)
}

export function DocumentCenter({
  initial,
  projects,
  defaultProjectId,
  canEdit,
}: {
  initial: CenterDocument[]
  projects: Array<{ id: string; title: string }>
  defaultProjectId: string
  canEdit: boolean
}) {
  const { t, locale } = useI18n()
  const d = t.documents
  const [documents, setDocuments] = React.useState(initial)
  const [query, setQuery] = React.useState("")
  const [searching, setSearching] = React.useState(false)
  const [folder, setFolder] = React.useState<string>("")
  const [uploading, setUploading] = React.useState(false)
  const [busy, setBusy] = React.useState<string | null>(null)
  const [preview, setPreview] = React.useState<{ title: string; body: string; markdown: boolean; note?: string } | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const folders = React.useMemo(
    () => Array.from(new Set(documents.map((doc) => doc.folder).filter((name): name is string => Boolean(name)))).sort(),
    [documents],
  )
  const visible = folder === "" ? documents : folder === "__none" ? documents.filter((doc) => !doc.folder) : documents.filter((doc) => doc.folder === folder)

  async function runSearch(event: React.FormEvent) {
    event.preventDefault()
    setSearching(true)
    try {
      setDocuments(await listCenterDocuments(query))
    } finally {
      setSearching(false)
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length || uploading) return
    setUploading(true)
    let uploaded = 0
    for (const file of Array.from(files).slice(0, 10)) {
      if (!documentExtension(file.name)) {
        toast.error(`${file.name}: ${fmt(d.typesAllowed, { types: DOCUMENT_TYPES_LABEL })}`)
        continue
      }
      if (file.size > DOCUMENT_MAX_BYTES) {
        toast.error(`${file.name}: ${d.tooLarge}`)
        continue
      }
      try {
        const result = await uploadFile(file, defaultProjectId)
        if (result.success) uploaded += 1
        else toast.error(`${file.name}: ${result.error}`)
      } catch {
        toast.error(`${file.name}: ${t.common.errorGeneric}`)
      }
    }
    if (uploaded) {
      toast.success(fmt(d.uploaded, { count: uploaded }))
      setQuery("")
      setDocuments(await listCenterDocuments())
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function open(doc: CenterDocument) {
    setBusy(`open:${doc.id}`)
    const result = await getDocumentUrl(doc.id)
    setBusy(null)
    if (!result.success) return void toast.error(result.error)
    window.open(result.url, "_blank", "noopener,noreferrer")
  }

  async function showText(doc: CenterDocument) {
    setBusy(`text:${doc.id}`)
    const result = await getDocumentText(doc.id)
    setBusy(null)
    if (!result.success) return void toast.error(result.error)
    setPreview({ title: doc.fileName, body: result.text, markdown: false, note: result.truncated ? d.previewTruncated : undefined })
  }

  async function summarize(doc: CenterDocument) {
    if (doc.aiSummary) {
      setPreview({ title: doc.fileName, body: doc.aiSummary, markdown: true, note: t.common.aiNotice })
      return
    }
    setBusy(`sum:${doc.id}`)
    const result = await summarizeDocument(doc.id)
    setBusy(null)
    if (!result.success) return void toast.error(result.error)
    setDocuments((list) => list.map((item) => (item.id === doc.id ? { ...item, aiSummary: result.summary } : item)))
    setPreview({ title: doc.fileName, body: result.summary, markdown: true, note: t.common.aiNotice })
  }

  async function move(doc: CenterDocument) {
    const name = window.prompt(d.folderPrompt, doc.folder ?? "")
    if (name === null) return
    const result = await setDocumentFolder(doc.id, name)
    if (!result.success) return void toast.error(result.error)
    setDocuments((list) => list.map((item) => (item.id === doc.id ? { ...item, folder: result.folder } : item)))
  }

  async function link(doc: CenterDocument, projectId: string) {
    const result = await setDocumentProject(doc.id, projectId || null)
    if (!result.success) return void toast.error(result.error)
    setDocuments((list) => list.map((item) => (item.id === doc.id ? { ...item, projectId: projectId || null } : item)))
  }

  async function remove(doc: CenterDocument) {
    if (!window.confirm(t.common.confirmDelete)) return
    setBusy(`del:${doc.id}`)
    const result = await deleteKnowledgeDocument(doc.id)
    setBusy(null)
    if (!result.success) return void toast.error(result.error)
    setDocuments((list) => list.filter((item) => item.id !== doc.id))
  }

  const iconButton = "flex size-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"

  return (
    <div className="space-y-5">
      <Notice tone="info">{d.usedByAi}</Notice>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form onSubmit={runSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              aria-label={d.searchPlaceholder}
              value={query}
              maxLength={80}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={d.searchPlaceholder}
              className={cn(inputClass, "pl-9")}
            />
          </div>
          <button type="submit" disabled={searching} className={secondaryButtonClass}>
            {searching ? <Loader2 className="size-4 animate-spin" /> : t.common.search}
          </button>
        </form>
        <select aria-label={d.folder} value={folder} onChange={(event) => setFolder(event.target.value)} className={cn(inputClass, "lg:w-52")}>
          <option value="">{d.allFolders}</option>
          <option value="__none">{d.noFolder}</option>
          {folders.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {canEdit && (
          <>
            <input ref={fileRef} type="file" multiple accept={DOCUMENT_ACCEPT} className="sr-only" tabIndex={-1} onChange={(event) => handleFiles(event.target.files)} />
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className={primaryButtonClass}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {uploading ? d.uploading : d.upload}
            </button>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{fmt(d.typesAllowed, { types: DOCUMENT_TYPES_LABEL })}</p>

      <Panel>
        {visible.length === 0 ? (
          <EmptyState icon={FileText} title={query ? d.noResults : d.emptyTitle} description={query ? undefined : d.emptyBody} />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((doc) => {
              const Icon = doc.mimeType?.includes("spreadsheet") || doc.mimeType === "text/csv" ? FileSpreadsheet : FileText
              return (
                <li key={doc.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{doc.fileName}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{new Date(doc.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}</span>
                        {doc.sizeBytes ? <span>{formatSize(doc.sizeBytes)}</span> : null}
                        {doc.folder && (
                          <Badge>
                            <Folder className="size-3" /> {doc.folder}
                          </Badge>
                        )}
                        {!doc.hasText && <Badge tone="amber">{d.noText}</Badge>}
                        {doc.aiSummary && <Badge tone="brand">{d.summarised}</Badge>}
                      </p>
                      {doc.excerpt && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{doc.excerpt}</p>}
                      {canEdit && projects.length > 1 && (
                        <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          {d.project}
                          <select value={doc.projectId ?? ""} onChange={(event) => link(doc, event.target.value)} className={cn(inputClass, "h-7 w-auto max-w-[14rem] text-xs")}>
                            <option value="">{d.noProject}</option>
                            {projects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.title}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {doc.hasText && (
                      <button type="button" title={d.preview} aria-label={`${d.preview}: ${doc.fileName}`} disabled={busy !== null} onClick={() => showText(doc)} className={iconButton}>
                        {busy === `text:${doc.id}` ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
                      </button>
                    )}
                    {doc.hasText && (canEdit || doc.aiSummary) && (
                      <button type="button" title={d.summarise} aria-label={`${d.summarise}: ${doc.fileName}`} disabled={busy !== null} onClick={() => summarize(doc)} className={cn(iconButton, "text-primary")}>
                        {busy === `sum:${doc.id}` ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      </button>
                    )}
                    <button type="button" title={t.common.download} aria-label={`${t.common.download}: ${doc.fileName}`} disabled={busy !== null} onClick={() => open(doc)} className={iconButton}>
                      {busy === `open:${doc.id}` ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    </button>
                    {canEdit && (
                      <>
                        <button type="button" title={d.move} aria-label={`${d.move}: ${doc.fileName}`} disabled={busy !== null} onClick={() => move(doc)} className={iconButton}>
                          <FolderInput className="size-4" />
                        </button>
                        <button type="button" title={t.common.delete} aria-label={`${t.common.delete}: ${doc.fileName}`} disabled={busy !== null} onClick={() => remove(doc)} className={cn(iconButton, "hover:text-red-600")}>
                          {busy === `del:${doc.id}` ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Modal open={preview !== null} onClose={() => setPreview(null)} title={preview?.title ?? ""} closeLabel={t.common.close} size="lg">
        {preview &&
          (preview.markdown ? (
            <Markdown content={preview.body} />
          ) : (
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-foreground">{preview.body}</pre>
          ))}
        {preview?.note && <p className="mt-4 text-xs text-muted-foreground">{preview.note}</p>}
      </Modal>
    </div>
  )
}
