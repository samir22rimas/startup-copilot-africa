import { generateTextWithFallback } from "@/src/lib/ai-providers";

export interface InterviewMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface NextQuestionResponse {
  feedback: string;
  nextQuestion: string;
  estimatedCompleteness: number;
  isCompleted: boolean;
}

function normalizeEstimatedCompleteness(
  history: InterviewMessage[],
  rawCompleteness: number | undefined,
  isCompleted: boolean,
): number {
  const userMessageCount = history.filter(
    (message) => message.role === "user",
  ).length;
  const stepBasedProgress = Math.min(
    100,
    Math.max(20, 20 + userMessageCount * 18),
  );

  const parsedCompleteness =
    typeof rawCompleteness === "number" && Number.isFinite(rawCompleteness)
      ? Math.min(100, Math.max(0, rawCompleteness))
      : stepBasedProgress;

  return isCompleted ? 100 : Math.max(stepBasedProgress, parsedCompleteness);
}

function buildFallbackResponse(
  startupContext: {
    name: string;
    country_code: string;
    city?: string | null;
    industry?: string | null;
    description?: string | null;
    estimated_budget_cents?: number | null;
    budget_currency?: string;
  },
  history: InterviewMessage[],
): NextQuestionResponse {
  const userMessages = history
    .filter((msg) => msg.role === "user")
    .map((msg) => msg.content.toLowerCase());
  const combined = userMessages.join(" ");
  const location = startupContext.city || "your market";

  let nextQuestion = `What problem are you solving for your first customers in ${location}, and why is it urgent today?`;

  if (combined.includes("customer") || combined.includes("target")) {
    nextQuestion =
      "Who is your very first paying customer, and what problem do they feel most urgently?";
  } else if (
    combined.includes("price") ||
    combined.includes("money") ||
    combined.includes("revenue")
  ) {
    nextQuestion =
      "How would you price this offer, and what would make a customer choose you over the alternatives?";
  } else if (
    combined.includes("competitor") ||
    combined.includes("competition")
  ) {
    nextQuestion =
      "How is your solution different from the current options customers already use?";
  } else if (
    combined.includes("channel") ||
    combined.includes("sell") ||
    combined.includes("distribution")
  ) {
    nextQuestion = `How will you reach your first customers in ${location} without spending heavily?`;
  }

  return {
    feedback:
      "Thanks for sharing that. I’m narrowing this down to the most important part of your business model.",
    nextQuestion,
    estimatedCompleteness: normalizeEstimatedCompleteness(
      history,
      undefined,
      false,
    ),
    isCompleted: false,
  };
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  if (!text) return null;

  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1] ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  const jsonCandidate =
    start >= 0 && end > start ? candidate.slice(start, end + 1) : candidate;

  try {
    const parsed = JSON.parse(jsonCandidate);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    const feedbackMatch = candidate.match(/"feedback"\s*:\s*"([^"]*)"/);
    const nextQuestionMatch = candidate.match(/"nextQuestion"\s*:\s*"([^"]*)"/);
    const completenessMatch = candidate.match(
      /"estimatedCompleteness"\s*:\s*(\d+)/,
    );
    const completedMatch = candidate.match(/"isCompleted"\s*:\s*(true|false)/i);

    if (
      feedbackMatch ||
      nextQuestionMatch ||
      completenessMatch ||
      completedMatch
    ) {
      return {
        feedback: feedbackMatch?.[1] ?? "",
        nextQuestion: nextQuestionMatch?.[1] ?? "",
        estimatedCompleteness: completenessMatch
          ? Number(completenessMatch[1])
          : 20,
        isCompleted: completedMatch
          ? completedMatch[1].toLowerCase() === "true"
          : false,
      };
    }
  }

  return null;
}

export async function generateNextInterviewQuestion(
  startupContext: {
    name: string;
    country_code: string;
    city?: string | null;
    industry?: string | null;
    description?: string | null;
    estimated_budget_cents?: number | null;
    budget_currency?: string;
  },
  history: InterviewMessage[],
): Promise<NextQuestionResponse> {
  const systemPrompt = `You are the AI Co-Founder for Startup Copilot Africa. Your goal is to guide the entrepreneur through a structured business interview to refine their startup concept, validate assumptions, and compile a clear business brief.
Adapt your analysis and questions specifically to the African market context:
- Consider local infrastructure (e.g., mobile money payments like M-Pesa, Orange Money, internet penetration, logistics/delivery realities).
- Adjust for regional demographics, purchasing power, and local informal economy dynamics.
- Reference their location: ${startupContext.city || "N/A"}, ${startupContext.country_code}.
- Reference their budget: ${(startupContext.estimated_budget_cents || 0) / 100} ${startupContext.budget_currency || "USD"}.
- Be practical, highly supportive, and focused on finding the quickest path to market validation with minimum waste.

Based on the conversation history, evaluate their answers:
1. Provide a brief, encouraging feedback on their previous answer.
2. Ask the next logical question to drill deeper into their business model, customer segments, distribution channel, or unit economics.
3. Keep the interview concise (usually 6-8 questions total). When you have enough key information to generate a solid business brief (SWOT, market validation, executive summary), set 'isCompleted' to true.
4. Estimate interview completeness from 0 to 100.

Return ONLY valid JSON with keys feedback, nextQuestion, estimatedCompleteness, and isCompleted. Do not wrap it in markdown or commentary.`;

  try {
    const messages = [
      ...history.map((msg) => ({ role: msg.role, content: msg.content })),
    ];

    const resultText = await generateTextWithFallback(systemPrompt, messages);
    const data = extractJsonObject(resultText);

    if (data) {
      return {
        feedback:
          typeof data.feedback === "string" && data.feedback.trim()
            ? data.feedback
            : "Thanks for sharing those details.",
        nextQuestion:
          typeof data.nextQuestion === "string" && data.nextQuestion.trim()
            ? data.nextQuestion
            : "Can you tell me more about your target customers?",
        estimatedCompleteness: normalizeEstimatedCompleteness(
          history,
          typeof data.estimatedCompleteness === "number"
            ? data.estimatedCompleteness
            : undefined,
          !!data.isCompleted,
        ),
        isCompleted: !!data.isCompleted,
      };
    }

    return buildFallbackResponse(startupContext, history);
  } catch (error) {
    console.error("Error in generateNextInterviewQuestion:", error);
    return buildFallbackResponse(startupContext, history);
  }
}
