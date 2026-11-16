/**
 * Legacy entry point kept for existing callers. New code should use
 * `runAi` / `runAiStructured` from "@/src/lib/ai/service", which add
 * permission checks, quotas, validation and token accounting.
 */
import { callModel, type ChatMessage } from "@/src/lib/ai/providers"

export async function generateTextWithFallback(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const messages: ChatMessage[] = (history || []).map((message) => ({
    role: message.role === "assistant" ? "assistant" : message.role === "system" ? "system" : "user",
    content: message.content,
  }))

  const result = await callModel({
    system: systemPrompt,
    messages,
    maxTokens: options.maxTokens ?? 1000,
    temperature: options.temperature ?? 0.7,
  })
  return result.text
}
