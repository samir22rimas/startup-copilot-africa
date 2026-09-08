import { GoogleGenAI } from "@google/genai"

function getEnv(name: string) {
  return process.env[name]
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = getEnv("GEMINI_API_KEY") || getEnv("GOOGLE_GENERATIVE_AI_API_KEY")
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY in .env.local")
  return new GoogleGenAI({ apiKey })
}

export async function generateTextWithFallback(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const maxTokens = options.maxTokens ?? 1000
  const temperature = options.temperature ?? 0.7

  const errors: string[] = []

  // 1. Primary: Gemini 3.8 Flash via @google/genai SDK
  if (getEnv("GEMINI_API_KEY") || getEnv("GOOGLE_GENERATIVE_AI_API_KEY")) {
    const geminiModels = getEnv("GEMINI_MODEL")
      ? [getEnv("GEMINI_MODEL")!, "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash"]
      : ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash"]

    for (const model of geminiModels) {
      try {
        const result = await generateWithGeminiSDK(systemPrompt, history, maxTokens, temperature, model)
        if (result && result.trim()) return result
        errors.push(`[Gemini (${model})]: Returned empty response.`)
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[AI Provider Warning] Gemini (${model}) failed:`, msg)
        errors.push(`[Gemini (${model})]: ${msg}`)
      }
    }
  }

  // 2. Fallback: Groq
  if (getEnv("GROQ_API_KEY")) {
    try {
      const result = await generateWithGroq(systemPrompt, history, maxTokens, temperature)
      if (result && result.trim()) return result
      errors.push(`[Groq]: Returned empty response.`)
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[AI Provider Warning] Groq failed:`, msg)
      errors.push(`[Groq]: ${msg}`)
    }
  }

  // 3. Fallback: DeepSeek
  if (getEnv("DEEPSEEK_API_KEY")) {
    try {
      const result = await generateWithDeepSeek(systemPrompt, history, maxTokens, temperature)
      if (result && result.trim()) return result
      errors.push(`[DeepSeek]: Returned empty response.`)
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[AI Provider Warning] DeepSeek failed:`, msg)
      errors.push(`[DeepSeek]: ${msg}`)
    }
  }

  // 4. Fallback: OpenAI
  if (getEnv("OPENAI_API_KEY")) {
    try {
      const result = await generateWithOpenAI(systemPrompt, history, maxTokens, temperature)
      if (result && result.trim()) return result
      errors.push(`[OpenAI]: Returned empty response.`)
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[AI Provider Warning] OpenAI failed:`, msg)
      errors.push(`[OpenAI]: ${msg}`)
    }
  }

  if (errors.length === 0) {
    throw new Error(
      "No AI provider API keys are configured. Please set GEMINI_API_KEY in your .env.local file."
    )
  }

  throw new Error(`All configured AI providers failed. Details: ${errors.join(" | ")}`)
}

/**
 * Gemini via @google/genai SDK.
 * Translates the chat history into Gemini Content format and sends with system instruction.
 */
async function generateWithGeminiSDK(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number,
  model: string
): Promise<string> {
  const ai = getGeminiClient()

  const contents = (history || []).map((h) => ({
    role: h.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: h.content }],
  }))

  // Gemini requires the last message to be from "user"
  if (contents.length === 0 || contents[contents.length - 1].role !== "user") {
    contents.push({
      role: "user" as const,
      parts: [{ text: "Please continue." }],
    })
  }

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: systemPrompt || undefined,
      temperature,
      maxOutputTokens: maxTokens,
    },
  })

  return response.text ?? ""
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 45000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

async function generateWithGroq(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const apiKey = getEnv("GROQ_API_KEY")
  if (!apiKey) throw new Error("Groq API key missing")

  const groqModels = getEnv("GROQ_MODEL")
    ? [getEnv("GROQ_MODEL")!, "openai/gpt-oss-20b", "openai/gpt-oss-120b"]
    : ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.6-27b", "groq/compound-mini"]

  let lastErr = ""
  for (const model of groqModels) {
    try {
      const response = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          messages: [{ role: "system", content: systemPrompt }, ...history],
        }),
      })
      if (!response.ok) {
        lastErr = await response.text()
        continue
      }
      const data = await response.json()
      const text = data.choices?.[0]?.message?.content || ""
      if (text.trim()) return text
    } catch (err: any) {
      lastErr = err.message || String(err)
    }
  }
  throw new Error(`Groq API failed: ${lastErr.slice(0, 300)}`)
}

async function generateWithDeepSeek(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const apiKey = getEnv("DEEPSEEK_API_KEY")
  if (!apiKey) throw new Error("DeepSeek API key missing")

  const baseUrl = (getEnv("AI_BASE_URL") || "https://api.deepseek.com/v1").replace(/\/$/, "")
  const model = getEnv("DEEPSEEK_MODEL") || "deepseek-chat"

  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: systemPrompt }, ...history],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`(${response.status}): ${errorText.slice(0, 300)}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ""
}

async function generateWithOpenAI(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number
): Promise<string> {
  const apiKey = getEnv("OPENAI_API_KEY")
  if (!apiKey) throw new Error("OpenAI API key missing")

  const baseUrl = (getEnv("OPENAI_BASE_URL") || "https://api.openai.com/v1").replace(/\/$/, "")
  const model = getEnv("OPENAI_MODEL") || "gpt-4o-mini"

  const response = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: systemPrompt }, ...history],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`(${response.status}): ${errorText.slice(0, 300)}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ""
}
