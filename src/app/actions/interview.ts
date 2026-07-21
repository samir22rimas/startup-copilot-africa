"use server";

import { generateNextInterviewQuestion } from "@/src/features/interview/services/openai";
import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type InterviewState = {
  feedback?: string;
  nextQuestion?: string;
  estimatedCompleteness: number;
  isCompleted: boolean;
  error?: string;
};

/**
 * Helper to retrieve the current active user's session and details.
 */
async function getAuthenticatedUser(supabase: any) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("You must be signed in to perform this action.");
  }
  return user;
}

/**
 * Gets or creates the interview conversation for a project.
 */
export async function getOrCreateInterviewConversation(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const user = await getAuthenticatedUser(supabase);

  // 1. Fetch startup_id linked to project
  const { data: project, error: projError } = await supabase
    .from("projects")
    .select("startup_id, title, description")
    .eq("id", projectId)
    .single();

  if (projError || !project) {
    throw new Error("Project not found.");
  }

  // 2. Look for an existing conversation for this project
  const { data: conversations, error: convError } = await supabase
    .from("conversations")
    .select("*")
    .eq("project_id", projectId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

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
    const { data: startup } = await supabase
      .from("startups")
      .select("*")
      .eq("id", project.startup_id)
      .single();

    const initialWelcome = `Habari! Welcome to Startup Copilot Africa. I'm your AI co-founder. Let's build something great. I see you are starting a project called "${project.title}" (${project.description || "No description provided yet"}). To help tailor this business plan for the local market in ${startup?.city || "your city"}, ${startup?.country_code}, could you introduce yourself and tell me what inspired you to start this business?`;

    // Store welcome message via admin client (bypasses RLS: only role='user' allowed for regular users)
    const { error: insertError } = await supabaseAdmin.from("messages").insert({
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
  const lastMeta = (lastMessage.metadata as any) || {};
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
  if (!answerText.trim()) {
    return {
      error: "Answer cannot be empty.",
      estimatedCompleteness: 0,
      isCompleted: false,
    };
  }

  const supabase = await createSupabaseServerClient();
  const user = await getAuthenticatedUser(supabase);

  // 1. Insert user message
  const { error: insertUserErr } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    author_id: user.id,
    role: "user",
    content: answerText,
  });

  if (insertUserErr) {
    return {
      error: "Failed to save your answer.",
      estimatedCompleteness: 0,
      isCompleted: false,
    };
  }

  // 2. Retrieve project & startup context
  const { data: project } = await supabase
    .from("projects")
    .select("startup_id, title, description")
    .eq("id", projectId)
    .single();

  if (!project || !project.startup_id) {
    return {
      error: "Associated project or startup not found.",
      estimatedCompleteness: 0,
      isCompleted: false,
    };
  }

  const { data: startup } = await supabase
    .from("startups")
    .select("*")
    .eq("id", project.startup_id)
    .single();

  // 3. Fetch conversation history
  const { data: messages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
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
    },
    history,
  );

  // 5. Save assistant response via admin client (RLS blocks role='assistant' for regular users)
  const { error: insertAssistantErr } = await supabaseAdmin
    .from("messages")
    .insert({
      conversation_id: conversationId,
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

  // 6. If completed, update onboarding status on startup
  if (aiResult.isCompleted && startup) {
    await supabase
      .from("startups")
      .update({
        onboarding_status: "completed",
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", startup.id);
  }

  revalidatePath("/dashboard");

  return {
    feedback: aiResult.feedback,
    nextQuestion: aiResult.nextQuestion,
    estimatedCompleteness: aiResult.estimatedCompleteness,
    isCompleted: aiResult.isCompleted,
  };
}
