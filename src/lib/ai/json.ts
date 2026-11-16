/**
 * Pulls a JSON value out of model output. Models wrap JSON in prose or code
 * fences, and occasionally leave a trailing comma — this handles those cases
 * and nothing more. The result is `unknown`: always validate it with a schema.
 */
export function extractJson(text: string): unknown | null {
  if (!text) return null

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidates = [fenced?.[1], text].filter((value): value is string => Boolean(value))

  for (const candidate of candidates) {
    const slice = sliceBalanced(candidate)
    if (!slice) continue
    for (const attempt of [slice, slice.replace(/,\s*([}\]])/g, "$1")]) {
      try {
        return JSON.parse(attempt)
      } catch {
        // try the next form
      }
    }
  }
  return null
}

/** The first complete top-level {...} or [...] in the text, respecting strings. */
function sliceBalanced(text: string): string | null {
  const start = text.search(/[{[]/)
  if (start < 0) return null

  const stack: string[] = []
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i++) {
    const char = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (char === "\\") escaped = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') inString = true
    else if (char === "{" || char === "[") stack.push(char)
    else if (char === "}" || char === "]") {
      const open = stack.pop()
      if ((char === "}" && open !== "{") || (char === "]" && open !== "[")) return null
      if (stack.length === 0) return text.slice(start, i + 1)
    }
  }
  return null
}
