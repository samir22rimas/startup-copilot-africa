"use client"

import { getOrCreateInterviewConversation, submitInterviewAnswer } from "@/src/app/actions/interview"
import { ArrowRight, CheckCircle2, Loader2, LoaderPinwheel, Send, Sparkles } from "lucide-react"
import * as React from "react"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
}

export function InterviewWorkspace({ projectId }: { projectId: string }) {
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [conversationId, setConversationId] = React.useState("")
  const [messages, setMessages] = React.useState<Message[]>([])
  const [estimatedCompleteness, setEstimatedCompleteness] = React.useState(5)
  const [isCompleted, setIsCompleted] = React.useState(false)
  const [currentAnswer, setCurrentAnswer] = React.useState("")
  const [feedback, setFeedback] = React.useState("")
  const [statusNotice, setStatusNotice] = React.useState("")

  const chatEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    async function init() {
      try {
        const data = await getOrCreateInterviewConversation(projectId)
        setConversationId(data.conversationId)
        setMessages(data.messages as Message[])
        setEstimatedCompleteness(data.estimatedCompleteness)
        setIsCompleted(data.isCompleted)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [projectId])

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!currentAnswer.trim() || submitting || isCompleted) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: currentAnswer.trim(),
    }

    setMessages((prev) => [...prev, userMsg])
    setCurrentAnswer("")
    setSubmitting(true)

    try {
      const res = await submitInterviewAnswer(projectId, conversationId, userMsg.content)
      if (res.error) {
        setStatusNotice(res.error)
        console.error(res.error)
      } else {
        if (res.feedback) {
          setFeedback(res.feedback)
        }
        setStatusNotice("")
        if (res.nextQuestion) {
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: res.nextQuestion!,
            },
          ])
        }
        setEstimatedCompleteness(res.estimatedCompleteness)
        setIsCompleted(res.isCompleted)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-green-700" />
        <p className="text-sm font-medium text-zinc-500">Preparing your business copilot...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_320px] font-sans">
      <div className="flex flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-500 hover:shadow-md hover:border-zinc-300/40 dark:hover:border-zinc-700/60">
        <div className="border-b border-zinc-100 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/50">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-white">AI Onboarding Interview</h2>
              <p className="text-xs text-zinc-500">Let&apos;s map out your venture together.</p>
            </div>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto py-6 space-y-4 max-h-[450px] min-h-[350px] pr-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm transition-all duration-300 ${
                  msg.role === "user"
                    ? "bg-green-700 text-white rounded-tr-none hover:shadow-green-700/10"
                    : "bg-zinc-50 text-zinc-800 border border-zinc-100/80 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700/55 rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {submitting && (
            <div className="flex justify-start animate-pulse">
              <div className="flex items-center gap-2 max-w-[80%] rounded-2xl bg-zinc-50 dark:bg-zinc-800 px-5 py-3.5 text-xs text-zinc-400 font-medium">
                <span className="size-4 animate-pulse text-green-700" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        {!isCompleted ? (
          <form onSubmit={handleSend} className="border-t border-zinc-100 pt-4 dark:border-zinc-800 flex gap-3">
            <input
              type="text"
              value={currentAnswer}
              disabled={submitting}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your response here..."
              className="h-11 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button
              type="submit"
              disabled={submitting || !currentAnswer.trim()}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-green-700 text-white transition-all duration-300 hover:bg-green-800 hover:scale-105 active:scale-95 disabled:opacity-50 shadow-md shadow-green-900/10"
              aria-label="Send answer"
            >
              <Send className="size-4" />
            </button>
          </form>
        ) : (
          <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800 text-center">
            <div className="inline-flex size-12 items-center justify-center rounded-full bg-green-100 text-green-700 mb-3 shadow-md">
              <CheckCircle2 className="size-6 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Interview Complete!</h3>
            <p className="mt-1 text-sm text-zinc-500">Your custom dashboard and business briefs are ready.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-green-700 px-6 text-sm font-semibold text-white hover:bg-green-800 transition-all duration-300 hover:scale-105 active:scale-95 shadow-md shadow-green-900/10"
            >
              Go to Dashboard <ArrowRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* Side Insights Panel */}
      <aside className="space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-all duration-500 hover:shadow-md">
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">Onboarding Progress</h3>
          <p className="mt-1 text-xs text-zinc-500 leading-relaxed">We need a bit of details to start generating recommendations.</p>
          <div className="mt-5">
            <div className="flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <span>Completeness</span>
              <span>{estimatedCompleteness}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 shadow-inner">
              <div
                className="h-full rounded-full bg-green-600 transition-all duration-500"
                style={{ width: `${estimatedCompleteness}%` }}
              />
            </div>
          </div>
        </div>

        {feedback && (
          <div className="rounded-3xl border border-green-200/50 bg-[#eaf5ee] dark:bg-green-950/20 dark:border-green-900/30 p-6 text-green-950 dark:text-green-300 shadow-sm transition-all duration-300">
            <h4 className="font-bold text-sm">Copilot Feedback</h4>
            <p className="mt-2 text-xs leading-relaxed opacity-90">{feedback}</p>
          </div>
        )}

        {statusNotice && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/30 p-6 text-amber-900 dark:text-amber-300">
            <h4 className="font-semibold text-sm">AI status</h4>
            <p className="mt-2 text-xs leading-relaxed opacity-90">{statusNotice}</p>
          </div>
        )}
      </aside>
    </div>
  )
}
