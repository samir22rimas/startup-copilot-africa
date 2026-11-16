/**
 * What counts as an acceptable knowledge document. A file must have an allowed
 * extension AND its bytes must match that type — the browser-reported MIME
 * type and the file name alone are never trusted.
 */

export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024

/** Files up to this size are sent through the server action; larger ones go straight to storage. */
export const DIRECT_UPLOAD_THRESHOLD_BYTES = 3 * 1024 * 1024

export type DocumentKind = {
  id: "pdf" | "docx" | "xlsx" | "text"
  mime: string
}

const KINDS = {
  pdf: { id: "pdf", mime: "application/pdf" },
  docx: {
    id: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  xlsx: {
    id: "xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  csv: { id: "text", mime: "text/csv" },
  txt: { id: "text", mime: "text/plain" },
  md: { id: "text", mime: "text/markdown" },
} as const satisfies Record<string, DocumentKind>

const EXTENSIONS: Record<string, DocumentKind> = {
  ".pdf": KINDS.pdf,
  ".docx": KINDS.docx,
  ".xlsx": KINDS.xlsx,
  ".csv": KINDS.csv,
  ".txt": KINDS.txt,
  ".md": KINDS.md,
  ".markdown": KINDS.md,
}

/** Shown in upload hints and error messages. */
export const DOCUMENT_TYPES_LABEL = "PDF, DOCX, XLSX, CSV, TXT, Markdown"

export const DOCUMENT_ACCEPT =
  ".pdf,.txt,.md,.markdown,.csv,.docx,.xlsx,application/pdf,text/plain,text/markdown,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/** The document kind implied by a file name's extension, or null if not allowed. */
export function documentExtension(fileName: string): DocumentKind | null {
  const dot = fileName.lastIndexOf(".")
  if (dot < 0) return null
  return EXTENSIONS[fileName.slice(dot).toLowerCase()] ?? null
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  if (bytes.length < offset + signature.length) return false
  return signature.every((byte, i) => bytes[offset + i] === byte)
}

function looksLikeText(bytes: Uint8Array) {
  const sample = bytes.subarray(0, 8192)
  // Binary formats contain NUL bytes; plain text and Markdown do not.
  if (sample.includes(0)) return false
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(
      // Avoid failing on a multi-byte character cut in half at the sample edge.
      sample.length === bytes.length ? sample : sample.subarray(0, Math.max(0, sample.length - 4)),
    )
    return true
  } catch {
    return false
  }
}

/**
 * Returns the verified kind of a file, or null when the extension is not
 * allowed or the content does not match it (e.g. an executable renamed .pdf).
 */
export function detectDocumentKind(fileName: string, bytes: Uint8Array): DocumentKind | null {
  const kind = documentExtension(fileName)
  if (!kind || bytes.length === 0) return null

  if (kind.id === "pdf") {
    // "%PDF-" — allowed to appear after a short preamble per the PDF spec.
    const head = bytes.subarray(0, 1024)
    for (let i = 0; i + 5 <= head.length; i++) {
      if (startsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2d], i)) return kind
    }
    return null
  }

  if (kind.id === "docx" || kind.id === "xlsx") {
    // DOCX and XLSX are ZIP containers: "PK\x03\x04".
    return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) ? kind : null
  }

  return looksLikeText(bytes) ? kind : null
}

/**
 * A storage path we generated for this startup: `<startupId>/<timestamp>-<hex>-<name>`
 * with no traversal or nested folders.
 */
export function isSafeStoragePath(path: string, startupId: string): boolean {
  if (typeof path !== "string" || path.length > 300) return false
  const prefix = `${startupId}/`
  if (!path.startsWith(prefix)) return false
  const name = path.slice(prefix.length)
  return /^\d{10,}-[0-9a-f]{12}-[\w.\-()+ ]{1,120}$/.test(name) && !name.includes("..")
}
