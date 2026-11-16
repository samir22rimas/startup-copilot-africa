"use client"

import { Bot, Check, Flag, ListPlus, Loader2, Pin, PinOff, Plus, Save, Send, Trash2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  addMemory,
  applyCopilotAction,
  deleteCopilotConversation,
  deleteMemory,
  getCopilotMessages,
  sendCopilotMessage,
  updateMemoryPin,
  type CopilotConversation,
  type CopilotMessage,
  type MemoryItem,
} from "@/src/app/actions/copilot"
import { Markdown } from "@/src/components/shared/Markdown"
import { Tabs } from "@/src/components/ui/overlay"
import {
  Badge,
  EmptyState,
  Field,
  Notice,
  Panel,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  textareaClass,
} from "@/src/components/ui/page"
import { COPILOT_MODES, type CopilotMode, type StoredCopilotAction } from "@/src/lib/copilot"
import type { MemoryKind } from "@/src/lib/database.v2.types"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"
import { cn } from "@/src/lib/utils"

type Tab = "chat" | "memory"
const MEMORY_KINDS: MemoryKind[] = ["fact", "decision", "goal", "preference", "risk"]

export function CopilotWorkspace({
  initialConversations,
  initialMemory,
  canEdit,
  specialistsEnabled,
  memoryEnabled,
  upgradePlan,
}: {
  initialConversations: CopilotConversation[]
  initialMemory: MemoryItem[]
  canEdit: boolean
  specialistsEnabled: boolean
  memoryEnabled: boolean
  upgradePlan: string
}) {
  const { t, locale } = useI18n()
  const c = t.copilot
  const [tab, setTab] = React.useState<Tab>("chat")
  const [conversations, setConversations] = React.useState(initialConversations)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<CopilotMessage[]>([])
  const [loadingThread, setLoadingThread] = React.useState(false)
  const [mode, setMode] = React.useState<CopilotMode>("advisor")
  const [text, setText] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [applying, setApplying] = React.useState<string | null>(null)
  const [memory, setMemory] = React.useState(initialMemory)
  const [memoryKind, setMemoryKind] = React.useState<MemoryKind>("fact")
  const [memoryText, setMemoryText] = React.useState("")
  const [memoryWhy, setMemoryWhy] = React.useState("")
  const [savingMemory, setSavingMemory] = React.useState(false)
  const listRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [messages, sending])

  async function openConversation(id: string | null) {
    setActiveId(id)
    setMessages([])
    if (!id) {
      inputRef.current?.focus()
      return
    }
    const conversation = conversations.find((item) => item.id === id)
    if (conversation && (specialistsEnabled || conversation.mode === "advisor")) setMode(conversation.mode)
    setLoadingThread(true)
    try {
      setMessages(await getCopilotMessages(id))
    } finally {
      setLoadingThread(false)
    }
  }

  async function send(content: string) {
    const value = content.trim()
    if (!value || sending) return
    setSending(true)
    setText("")
    const optimistic: CopilotMessage = { id: `pending-${Date.now()}`, role: "user", content: value, actions: [], createdAt: new Date().toISOString() }
    setMessages((list) => [...list, optimistic])
    try {
      const result = await sendCopilotMessage({ conversationId: activeId, mode, text: value })
      if (!result.success) {
        setMessages((list) => [
          ...list,
          { id: `error-${Date.now()}`, role: "assistant", content: `**${c.couldNotReply}** ${result.error}`, actions: [], createdAt: new Date().toISOString() },
        ])
        return
      }
      setMessages((list) => [...list.filter((m) => m.id !== optimistic.id), result.userMessage, result.reply])
      setActiveId(result.conversation.id)
      setConversations((list) => [result.conversation, ...list.filter((item) => item.id !== result.conversation.id)])
    } catch {
      toast.error(t.common.errorGeneric)
    } finally {
      setSending(false)
    }
  }

  async function apply(message: CopilotMessage, index: number) {
    if (!activeId) return
    const key = `${message.id}:${index}`
    setApplying(key)
    const result = await applyCopilotAction({ conversationId: activeId, messageId: message.id, index })
    setApplying(null)
    if (!result.success) return void toast.error(result.error)
    setMessages((list) =>
      list.map((m) => (m.id === message.id ? { ...m, actions: m.actions.map((a, i) => (i === index ? { ...a, applied: true } : a)) } : m)),
    )
    toast.success(c.actionAdded)
  }

  async function removeConversation(id: string) {
    if (!window.confirm(c.deleteConversationConfirm)) return
    const result = await deleteCopilotConversation(id)
    if (!result.success) return void toast.error(result.error)
    setConversations((list) => list.filter((item) => item.id !== id))
    if (activeId === id) void openConversation(null)
  }

  async function submitMemory(event: React.FormEvent) {
    event.preventDefault()
    if (savingMemory) return
    setSavingMemory(true)
    const result = await addMemory({ kind: memoryKind, content: memoryText, rationale: memoryWhy })
    setSavingMemory(false)
    if (!result.success) return void toast.error(result.error)
    setMemory((list) => [result.item, ...list])
    setMemoryText("")
    setMemoryWhy("")
  }

  async function togglePin(item: MemoryItem) {
    setMemory((list) => list.map((m) => (m.id === item.id ? { ...m, pinned: !m.pinned } : m)))
    const result = await updateMemoryPin(item.id, !item.pinned)
    if (!result.success) {
      setMemory((list) => list.map((m) => (m.id === item.id ? item : m)))
      toast.error(result.error)
    }
  }

  async function removeMemory(id: string) {
    if (!window.confirm(t.common.confirmDelete)) return
    const result = await deleteMemory(id)
    if (!result.success) return void toast.error(result.error)
    setMemory((list) => list.filter((m) => m.id !== id))
  }

  function actionLabel(action: StoredCopilotAction) {
    if (action.type === "task") return { verb: c.actionTask, text: action.title, Icon: ListPlus }
    if (action.type === "milestone") return { verb: c.actionMilestone, text: action.title, Icon: Flag }
    if (action.type === "decision") return { verb: c.actionDecision, text: action.content, Icon: Save }
    return { verb: c.actionRemember, text: action.content, Icon: Save }
  }

  return (
    <div className="space-y-4">
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        label={t.pages.copilot.title}
        items={[
          { id: "chat", label: c.tabChat },
          { id: "memory", label: c.tabMemory, count: memory.length },
        ]}
      />

      {tab === "chat" && (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <Panel as="aside" className="flex max-h-[16rem] flex-col lg:max-h-[calc(100dvh-17rem)]">
            <div className="border-b border-border p-2">
              <button type="button" onClick={() => openConversation(null)} className={cn(secondaryButtonClass, "w-full")}>
                <Plus className="size-4" /> {c.newChat}
              </button>
            </div>
            <nav aria-label={c.conversations} className="min-h-0 flex-1 overflow-y-auto p-2">
              {conversations.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">{c.noConversations}</p>
              ) : (
                <ul className="space-y-0.5">
                  {conversations.map((conversation) => (
                    <li key={conversation.id} className="group flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openConversation(conversation.id)}
                        aria-current={conversation.id === activeId ? "true" : undefined}
                        className={cn(
                          "min-w-0 flex-1 rounded-md px-2 py-1.5 text-left transition",
                          conversation.id === activeId ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <span className="block truncate text-[13px] font-medium">{conversation.title || c.untitled}</span>
                        <span className="block truncate text-[11px] opacity-80">
                          {c.modes[conversation.mode].label} ·{" "}
                          {new Date(conversation.updatedAt).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={c.deleteConversation}
                        onClick={() => removeConversation(conversation.id)}
                        className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground opacity-60 hover:text-red-600 group-hover:opacity-100"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </nav>
          </Panel>

          <Panel className="flex h-[calc(100dvh-17rem)] min-h-[26rem] flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                {c.mode}
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as CopilotMode)}
                  className={cn(inputClass, "h-8 w-auto text-xs font-medium")}
                >
                  {COPILOT_MODES.map((key) => (
                    <option key={key} value={key} disabled={!specialistsEnabled && key !== "advisor"}>
                      {c.modes[key].label}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-[11px] text-muted-foreground">
                {specialistsEnabled ? c.modes[mode].description : fmt(c.modeLocked, { plan: upgradePlan })}
              </p>
            </div>

            <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
              {loadingThread ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <EmptyState
                  icon={Bot}
                  title={c.emptyTitle}
                  description={c.emptyBody}
                  action={
                    <div className="flex max-w-xl flex-wrap justify-center gap-2">
                      {c.starters.map((starter) => (
                        <button key={starter} type="button" onClick={() => send(starter)} className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground transition hover:bg-muted">
                          {starter}
                        </button>
                      ))}
                    </div>
                  }
                />
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[min(42rem,92%)] space-y-3", message.role === "user" && "rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground")}>
                      {message.role === "user" ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                      ) : (
                        <>
                          <div className="rounded-2xl rounded-bl-md border border-border bg-background px-4 py-3">
                            <Markdown content={message.content} />
                          </div>
                          {message.actions.length > 0 && (
                            <div className="rounded-xl border border-dashed border-primary/40 p-3">
                              <p className="text-xs font-semibold text-foreground">{c.suggested}</p>
                              <p className="text-[11px] text-muted-foreground">{c.suggestedHint}</p>
                              <ul className="mt-2 space-y-1.5">
                                {message.actions.map((action, index) => {
                                  const { verb, text: label, Icon } = actionLabel(action)
                                  const key = `${message.id}:${index}`
                                  return (
                                    <li key={index} className="flex items-center gap-2">
                                      <p className="min-w-0 flex-1 truncate text-sm text-foreground" title={label}>
                                        {label}
                                      </p>
                                      <button
                                        type="button"
                                        disabled={!canEdit || action.applied || applying !== null || message.id.startsWith("local-")}
                                        onClick={() => apply(message, index)}
                                        className={cn(secondaryButtonClass, "h-8 shrink-0 text-xs")}
                                      >
                                        {applying === key ? <Loader2 className="size-3.5 animate-spin" /> : action.applied ? <Check className="size-3.5 text-primary" /> : <Icon className="size-3.5" />}
                                        {action.applied ? c.actionDone : verb}
                                      </button>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
              {sending && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> {c.thinking}
                </p>
              )}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                void send(text)
              }}
              className="border-t border-border p-3"
            >
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  aria-label={c.placeholder}
                  rows={1}
                  maxLength={4000}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault()
                      void send(text)
                    }
                  }}
                  placeholder={c.placeholder}
                  className={cn(textareaClass, "max-h-40 min-h-9 resize-none [field-sizing:content]")}
                />
                <button type="submit" disabled={sending || !text.trim()} aria-label={c.send} className={cn(primaryButtonClass, "shrink-0 px-3")}>
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">{c.disclaimer}</p>
            </form>
          </Panel>
        </div>
      )}

      {tab === "memory" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {c.memoryBody} {c.contextBody}
          </p>
          {!memoryEnabled ? (
            <Notice tone="locked">{fmt(c.memoryLocked, { plan: upgradePlan })}</Notice>
          ) : (
            canEdit && (
              <Panel className="p-4">
                <form onSubmit={submitMemory} className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                  <Field label={c.memoryAdd} htmlFor="memory-kind">
                    <select id="memory-kind" value={memoryKind} onChange={(e) => setMemoryKind(e.target.value as MemoryKind)} className={inputClass}>
                      {MEMORY_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {c.memoryKinds[kind]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="space-y-2">
                    <textarea aria-label={c.memoryAdd} required minLength={3} maxLength={1000} rows={2} value={memoryText} onChange={(e) => setMemoryText(e.target.value)} placeholder={c.memoryPlaceholder} className={cn(textareaClass, "sm:mt-[1.4rem]")} />
                    {memoryKind === "decision" && (
                      <input aria-label={c.memoryRationale} maxLength={1000} value={memoryWhy} onChange={(e) => setMemoryWhy(e.target.value)} placeholder={c.memoryRationale} className={inputClass} />
                    )}
                    <button type="submit" disabled={savingMemory} className={primaryButtonClass}>
                      {savingMemory && <Loader2 className="size-4 animate-spin" />} {t.common.save}
                    </button>
                  </div>
                </form>
              </Panel>
            )
          )}

          <Panel>
            {memory.length === 0 ? (
              <EmptyState icon={Save} title={c.memoryTitle} description={c.memoryEmpty} />
            ) : (
              <ul className="divide-y divide-border">
                {memory.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={item.kind === "decision" ? "brand" : item.kind === "risk" ? "amber" : "neutral"}>{c.memoryKinds[item.kind]}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-foreground">{item.content}</p>
                      {item.rationale && <p className="mt-0.5 text-xs text-muted-foreground">{item.rationale}</p>}
                    </div>
                    {canEdit && (
                      <div className="flex shrink-0 gap-1">
                        <button type="button" aria-label={item.pinned ? c.unpin : c.pin} aria-pressed={item.pinned} onClick={() => togglePin(item)} className={cn("flex size-8 items-center justify-center rounded-md hover:bg-muted", item.pinned ? "text-primary" : "text-muted-foreground")}>
                          {item.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                        </button>
                        <button type="button" aria-label={t.common.delete} onClick={() => removeMemory(item.id)} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  )
}
