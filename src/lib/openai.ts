import OpenAI from "openai"

/**
 * Shared AI client.
 *
 * The app is now configured to use DeepSeek through the OpenAI-compatible
 * API surface that the existing code already uses.
 */
const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY

if (!apiKey) {
  throw new Error(
    "Missing DEEPSEEK_API_KEY or OPENAI_API_KEY. Add it to .env.local before running the app.",
  )
}

export const openai = new OpenAI({
  apiKey,
  baseURL: process.env.AI_BASE_URL || "https://api.deepseek.com/v1",
})

/** Default chat model used across the app. Override per-call as needed. */
export const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat"
