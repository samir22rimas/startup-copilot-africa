import { DEFAULT_MODEL } from "@/src/lib/openai";

function getEnv(name: string) {
  return process.env[name];
}

export async function generateTextWithFallback(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  options: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const maxTokens = options.maxTokens ?? 300;
  const temperature = options.temperature ?? 0.7;
  const attempts: Array<() => Promise<string>> = [];

  if (getEnv("OPENAI_API_KEY")) {
    attempts.push(async () =>
      generateWithOpenAI(systemPrompt, history, maxTokens, temperature),
    );
  }

  if (getEnv("GROQ_API_KEY")) {
    attempts.push(async () =>
      generateWithGroq(systemPrompt, history, maxTokens, temperature),
    );
  }

  if (!attempts.length) {
    throw new Error("No AI provider API keys are configured.");
  }

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result && result.trim()) {
        return result;
      }
    } catch (error) {
      lastError = error;
      console.warn("AI provider attempt failed, trying next provider.", error);
    }
  }

  throw new Error("All configured AI providers failed to return a response.", {
    cause: lastError,
  });

}

async function generateWithOpenAI(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number,
) {
  const apiKey = getEnv("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OpenAI API key missing");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: systemPrompt }, ...history],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}


async function generateWithGroq(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
  maxTokens: number,
  temperature: number,
) {
  const apiKey = getEnv("GROQ_API_KEY");
  if (!apiKey) throw new Error("Groq API key missing");

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getEnv("GROQ_MODEL") || "llama-3.3-70b-versatile",
        temperature,
        max_tokens: maxTokens,
        messages: [{ role: "system", content: systemPrompt }, ...history],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

