"use server";

import { generateNextInterviewQuestion } from "@/src/features/interview/services/openai";
import { checkAiRateLimit } from "@/src/lib/rate-limiter";
import { getSupabaseAdmin } from "@/src/lib/supabase/admin";
import { MAX_CHAT_MESSAGE_LENGTH, cleanText, isUuid } from "@/src/lib/validation";
import { getAfricanCountryName } from "@/src/lib/african-countries";
import { getProjectAccess } from "@/src/lib/workspace-access";
import { getLocale } from "@/src/lib/i18n/server";
import { isPlatformSchemaReady } from "@/src/lib/workspace/schema-status";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

export type InterviewState = {
  feedback?: string;
  nextQuestion?: string;
  estimatedCompleteness: number;
  isCompleted: boolean;
  error?: string;
};

/**
 * Gets or creates the interview conversation for a project.
 */
export async function getOrCreateInterviewConversation(projectId: string) {
  // 1. Resolve the project through team membership
  const access = await getProjectAccess(projectId);
  if ("error" in access) {
    throw new Error(access.error);
  }
  const { supabase, user, project, startup } = access;

  // 2. Look for an existing conversation for this project
  const schemaReady = await isPlatformSchemaReady();
  let conversationQuery = supabase
    .from("conversations")
    .select("*")
    .eq("project_id", projectId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  // With the 2.0 schema the interview has its own kind and never mixes with Copilot chats.
  if (schemaReady) conversationQuery = conversationQuery.eq("kind", "interview");
  const { data: conversations } = await conversationQuery;

  let conversation = conversations?.[0];

  if (!conversation) {
    // Create new conversation
    const { data: newConv, error: createError } = await supabase
      .from("conversations")
      .insert({
        startup_id: project.startup_id,
        project_id: projectId,
        created_by: user.id,
        title: `AI Business Interview: ${project.title}`,
        ...(schemaReady ? { kind: "interview" as const } : {}),
      })
      .select()
      .single();

    if (createError || !newConv) {
      throw new Error("Failed to start a new interview conversation.");
    }
    conversation = newConv;
  }

  // 3. Fetch messages for the conversation
  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  if (msgError) {
    throw new Error("Failed to retrieve conversation history.");
  }

  // If no messages exist yet, generate the opening question
  if (messages.length === 0) {
    const locale = await getLocale();
    const place = `${startup?.city || ""}${startup?.city ? ", " : ""}${getAfricanCountryName(startup?.country_code)}`;
    const initialWelcome =
      locale === "fr"
        ? `Bienvenue sur Anza. Je suis votre cofondateur IA. Vous démarrez « ${project.title} » à ${place}. Pour adapter mes conseils à votre marché, présentez-vous en quelques mots : qui êtes-vous, et qu'est-ce qui vous a donné envie de lancer cette activité ?`
        : `Welcome to Anza. I'm your AI co-founder. You are starting "${project.title}" in ${place}. So I can adapt my advice to your market, tell me a little about yourself: who are you, and what made you want to start this business?`;

    // Store welcome message via admin client (bypasses RLS: only role='user' allowed for regular users)
    const { error: insertError } = await getSupabaseAdmin().from("messages").insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: initialWelcome,
    });

    if (insertError) {
      console.error("Failed to insert welcome message:", insertError);
    }

    return {
      conversationId: conversation.id,
      messages: [
        {
          id: "welcome",
          conversation_id: conversation.id,
          role: "assistant",
          content: initialWelcome,
          created_at: new Date().toISOString(),
        },
      ],
      estimatedCompleteness: 5,
      isCompleted: false,
    };
  }

  // Calculate completeness based on final message metadata or the conversation length.
  const lastMessage = messages[messages.length - 1];
  const lastMeta = (lastMessage.metadata ?? {}) as { estimatedCompleteness?: unknown; isCompleted?: unknown };
  const answerCount = messages.filter(
    (message) => message.role === "user",
  ).length;
  const stepBasedProgress = Math.min(100, Math.max(5, 20 + answerCount * 18));
  const parsedCompleteness =
    typeof lastMeta.estimatedCompleteness === "number" &&
    Number.isFinite(lastMeta.estimatedCompleteness)
      ? Math.min(100, Math.max(0, lastMeta.estimatedCompleteness))
      : stepBasedProgress;

  return {
    conversationId: conversation.id,
    messages,
    estimatedCompleteness: lastMeta.isCompleted
      ? 100
      : Math.max(stepBasedProgress, parsedCompleteness),
    isCompleted: !!lastMeta.isCompleted,
  };
}

/**
 * Submits the user's response, updates conversation history, and retrieves the next AI question.
 */
export async function submitInterviewAnswer(
  projectId: string,
  conversationId: string,
  answerText: string,
): Promise<InterviewState> {
  const fail = (error: string): InterviewState => ({
    error,
    estimatedCompleteness: 0,
    isCompleted: false,
  });

  const answer = cleanText(answerText, MAX_CHAT_MESSAGE_LENGTH + 1);
  if (!answer) return fail("Answer cannot be empty.");
  if (answer.length > MAX_CHAT_MESSAGE_LENGTH) {
    return fail(`Answers can be up to ${MAX_CHAT_MESSAGE_LENGTH} characters.`);
  }
  if (!isUuid(conversationId)) return fail("This interview is not available.");

  const access = await getProjectAccess(projectId);
  if ("error" in access) return fail(access.error);
  const { supabase, user, project, startup } = access;

  // The conversation must belong to this project before anything is written to it.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("project_id", project.id)
    .maybeSingle();
  if (!conversation) return fail("This interview is not available.");

  const rateLimit = await checkAiRateLimit(user.id);
  if (!rateLimit.allowed) {
    return {
      error: rateLimit.message,
      estimatedCompleteness: 0,
      isCompleted: false,
    };
  }

  // 1. Insert user message
  const { error: insertUserErr } = await supabase.from("messages").insert({
    conversation_id: conversation.id,
    author_id: user.id,
    role: "user",
    content: answer,
  });

  if (insertUserErr) {
    return {
      error: "Failed to save your answer.",
      estimatedCompleteness: 0,
      isCompleted: false,
    };
  }

  // 3. Fetch conversation history
  const { data: messages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  const history = (messages || []).map((msg) => ({
    role: msg.role as "user" | "assistant" | "system",
    content: msg.content,
  }));

  // 4. Generate next question via OpenAI
  const aiResult = await generateNextInterviewQuestion(
    {
      name: startup?.name || "My Startup",
      country_code: startup?.country_code || "KE",
      city: startup?.city,
      industry: startup?.industry,
      description: project?.description || startup?.description,
      estimated_budget_cents: startup?.estimated_budget_cents,
      budget_currency: startup?.budget_currency || "USD",
      stage: startup?.stage,
      language: (await getLocale()) === "fr" ? "French" : "English",
    },
    history,
  );

  // 5. Save assistant response via admin client (RLS blocks role='assistant' for regular users)
  const { error: insertAssistantErr } = await getSupabaseAdmin()
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      role: "assistant",
      content: aiResult.nextQuestion,
      metadata: {
        feedback: aiResult.feedback,
        estimatedCompleteness: aiResult.estimatedCompleteness,
        isCompleted: aiResult.isCompleted,
      },
    });

  if (insertAssistantErr) {
    console.error("Failed to insert assistant message:", insertAssistantErr);
  }

  // 6. If completed, update onboarding status on startup. This is a system
  //    state change (any team member may finish the interview), so it uses the
  //    service role after membership was verified above.
  if (aiResult.isCompleted && startup) {
    await getSupabaseAdmin()
      .from("startups")
      .update({
        onboarding_status: "completed",
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", startup.id);

    // Build the founder's profile from the finished interview, after the response is sent.
    if (await isPlatformSchemaReady()) {
      after(async () => {
        try {
          const { generateEntrepreneurProfile } = await import("@/src/app/actions/onboarding");
          await generateEntrepreneurProfile();
        } catch (error) {
          console.warn("Entrepreneur profile not generated:", error instanceof Error ? error.message : error);
        }
      });
    }
  }

  revalidatePath("/dashboard");

  return {
    feedback: aiResult.feedback,
    nextQuestion: aiResult.nextQuestion,
    estimatedCompleteness: aiResult.estimatedCompleteness,
    isCompleted: aiResult.isCompleted,
  };
}
