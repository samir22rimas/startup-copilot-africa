/**
 * Model abstraction: one request shape, several providers, automatic fallback.
 *
 * Order: Gemini -> Groq -> DeepSeek -> OpenAI, skipping any provider without
 * an API key. Callers never talk to a vendor SDK directly; they go through
 * `callModel` (or, better, the usage-tracked helpers in ./service).
 */
import { GoogleGenAI } from "@google/genai"

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string }

export interface ModelRequest {
  system: string
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
  /** Ask the provider for a JSON object (where it supports a JSON mode). */
  json?: boolean
  /**
   * Retrieve live web sources (Gemini + Google Search grounding only). When no
   * search-capable provider answers, the result has `grounded: false`.
   */
  webSearch?: boolean
}

export interface ModelSource {
  title: string
  url: string
}

export interface ModelResult {
  text: string
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  /** False when the provider did not report usage and the counts are estimates. */
  tokensReported: boolean
  /** True only when the answer was produced with retrieved web sources. */
  grounded: boolean
  sources: ModelSource[]
}

const DEFAULT_TIMEOUT_MS = 60_000

function env(name: string) {
  return process.env[name]
}

/** ~4 characters per token: a rough estimate used only when usage is not reported. */
function estimateTokens(text: string) {
  return Math.ceil(text.length / 4)
}

function estimatePrompt(request: ModelRequest) {
  return estimateTokens(request.system) + request.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0)
}

function geminiKey() {
  return env("GEMINI_API_KEY") || env("GOOGLE_GENERATIVE_AI_API_KEY")
}

export function hasAnyProvider(): boolean {
  return Boolean(geminiKey() || env("GROQ_API_KEY") || env("DEEPSEEK_API_KEY") || env("OPENAI_API_KEY"))
}

/** Whether a search-capable provider is configured (web research is possible at all). */
export function webSearchConfigured(): boolean {
  return Boolean(geminiKey())
}

async function callGemini(request: ModelRequest, model: string, useSearch: boolean): Promise<ModelResult> {
  const ai = new GoogleGenAI({ apiKey: geminiKey()! })

  const contents = request.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }))

  // Gemini requires the last message to come from the user.
  if (contents.length === 0 || contents[contents.length - 1].role !== "user") {
    contents.push({ role: "user" as const, parts: [{ text: "Please continue." }] })
  }

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: request.system || undefined,
      temperature: request.temperature ?? 0.7,
      maxOutputTokens: request.maxTokens ?? 1000,
      // JSON mode and search grounding cannot be combined.
      ...(request.json && !useSearch ? { responseMimeType: "application/json" } : {}),
      ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
      abortSignal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    },
  })

  const text = response.text ?? ""
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []
  const seen = new Set<string>()
  const sources: ModelSource[] = []
  for (const chunk of chunks) {
    const url = chunk.web?.uri
    if (!url || !/^https?:\/\//i.test(url) || seen.has(url)) continue
    seen.add(url)
    sources.push({ title: (chunk.web?.title || new URL(url).hostname).slice(0, 200), url })
  }

  const usage = response.usageMetadata
  const reported = typeof usage?.promptTokenCount === "number"
  return {
    text,
    provider: "gemini",
    model,
    promptTokens: usage?.promptTokenCount ?? estimatePrompt(request),
    completionTokens: usage?.candidatesTokenCount ?? estimateTokens(text),
    tokensReported: reported,
    grounded: useSearch && sources.length > 0,
    sources,
  }
}

async function callOpenAiCompatible(
  request: ModelRequest,
  options: { provider: string; baseUrl: string; apiKey: string; model: string },
): Promise<ModelResult> {
  const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? 1000,
      messages: [{ role: "system", content: request.system }, ...request.messages],
      ...(request.json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`(${response.status}) ${body.slice(0, 300)}`)
  }

  const data = await response.json()
  const message = data.choices?.[0]?.message
  const text = String(message?.content || message?.reasoning_content || message?.reasoning || "").trim()
  const reported = typeof data.usage?.prompt_tokens === "number"
  return {
    text,
    provider: options.provider,
    model: options.model,
    promptTokens: data.usage?.prompt_tokens ?? estimatePrompt(request),
    completionTokens: data.usage?.completion_tokens ?? estimateTokens(text),
    tokensReported: reported,
    grounded: false,
    sources: [],
  }
}

type Attempt = { label: string; run: () => Promise<ModelResult> }

function buildAttempts(request: ModelRequest): Attempt[] {
  const attempts: Attempt[] = []

  if (geminiKey()) {
    const models = Array.from(new Set([env("GEMINI_MODEL"), "gemini-3.8-flash"].filter(Boolean))) as string[]
    for (const model of models) {
      if (request.webSearch) {
        attempts.push({ label: `gemini:${model}+search`, run: () => callGemini(request, model, true) })
      }
      attempts.push({ label: `gemini:${model}`, run: () => callGemini(request, model, false) })
    }
  }

  const groqKey = env("GROQ_API_KEY")
  if (groqKey) {
    const models = Array.from(
      new Set([env("GROQ_MODEL"), "openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"].filter(Boolean)),
    ) as string[]
    for (const model of models) {
      attempts.push({
        label: `groq:${model}`,
        run: () =>
          callOpenAiCompatible(request, {
            provider: "groq",
            baseUrl: "https://api.groq.com/openai/v1",
            apiKey: groqKey,
            model,
          }),
      })
    }
  }

  const deepseekKey = env("DEEPSEEK_API_KEY")
  if (deepseekKey) {
    attempts.push({
      label: "deepseek",
      run: () =>
        callOpenAiCompatible(request, {
          provider: "deepseek",
          baseUrl: env("AI_BASE_URL") || "https://api.deepseek.com/v1",
          apiKey: deepseekKey,
          model: env("DEEPSEEK_MODEL") || "deepseek-chat",
        }),
    })
  }

  const openaiKey = env("OPENAI_API_KEY")
  if (openaiKey) {
    attempts.push({
      label: "openai",
      run: () =>
        callOpenAiCompatible(request, {
          provider: "openai",
          baseUrl: env("OPENAI_BASE_URL") || "https://api.openai.com/v1",
          apiKey: openaiKey,
          model: env("OPENAI_MODEL") || "gpt-4o-mini",
        }),
    })
  }

  return attempts
}

export class AiUnavailableError extends Error {
  constructor(
    message: string,
    readonly details: string[] = [],
  ) {
    super(message)
    this.name = "AiUnavailableError"
  }
}

/** Runs the request against the first provider that answers with non-empty text. */
export async function callModel(request: ModelRequest): Promise<ModelResult> {
  const attempts = buildAttempts(request)
  if (attempts.length === 0) {
    throw new AiUnavailableError("No AI provider is configured. Set GEMINI_API_KEY (or another provider key).")
  }

  const errors: string[] = []
  for (const attempt of attempts) {
    try {
      const result = await attempt.run()
      if (result.text.trim()) return result
      errors.push(`[${attempt.label}] empty response`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[ai] ${attempt.label} failed:`, message.slice(0, 300))
      errors.push(`[${attempt.label}] ${message.slice(0, 200)}`)
    }
  }

  throw new AiUnavailableError("All configured AI providers failed.", errors)
}
