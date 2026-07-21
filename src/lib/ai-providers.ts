function getEnv(name: string) {
  return process.env[name]
}

export async function generateTextWithFallback(
  systemPrompt: string,
  history: Array<{ role: string; content: string }>,
): Promise<string> {
  const attempts: Array<() => Promise<string>> = []

  if (getEnv("DEEPSEEK_API_KEY")) {
    attempts.push(async () => generateWithDeepSeek(systemPrompt, history))
  }

  if (getEnv("OPENAI_API_KEY")) {
    attempts.push(async () => generateWithOpenAI(systemPrompt, history))
  }

  if (getEnv("GROQ_API_KEY")) {
    attempts.push(async () => generateWithGroq(systemPrompt, history))
  }

  if (getEnv("GEMINI_API_KEY")) {
    attempts.push(async () => generateWithGemini(systemPrompt, history))
  }

  if (!attempts.length) {
    throw new Error("No AI provider API keys are configured.")
  }

  let lastError: unknown
  for (const attempt of attempts) {
    try {
      const result = await attempt()
      if (result && result.trim()) {
        return result
      }
    } catch (error) {
      lastError = error
      console.warn("AI provider attempt failed, trying next provider.", error)
    }
  }

  return `{
  "feedback": "Thanks for sharing that. I’m keeping the conversation moving while the AI provider is temporarily unavailable.",
  "nextQuestion": "What problem are you solving for your first customers, and why is it urgent for them right now?",
  "estimatedCompleteness": 20,
  "isCompleted": false
}`
}

async function generateWithDeepSeek(systemPrompt: string, history: Array<{ role: string; content: string }>) {
  const apiKey = getEnv("DEEPSEEK_API_KEY")
  if (!apiKey) throw new Error("DeepSeek API key missing")

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getEnv("DEEPSEEK_MODEL") || "deepseek-chat",
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ""
}

async function generateWithOpenAI(systemPrompt: string, history: Array<{ role: string; content: string }>) {
  const apiKey = getEnv("OPENAI_API_KEY")
  if (!apiKey) throw new Error("OpenAI API key missing")

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ""
}

async function generateWithGroq(systemPrompt: string, history: Array<{ role: string; content: string }>) {
  const apiKey = getEnv("GROQ_API_KEY")
  if (!apiKey) throw new Error("Groq API key missing")

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getEnv("GROQ_MODEL") || "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 300,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Groq failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ""
}

async function generateWithGemini(systemPrompt: string, history: Array<{ role: string; content: string }>) {
  const apiKey = getEnv("GEMINI_API_KEY")
  if (!apiKey) throw new Error("Gemini API key missing")

  const messages = history.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          ...messages,
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ""
}
