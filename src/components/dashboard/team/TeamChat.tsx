"use client"

import {
  askCopilotInTeamChat,
  deleteTeamMessage,
  editTeamMessage,
  listTeamMessages,
  sendTeamMessage,
} from "@/src/app/actions/team"
import { CopilotMarkdown } from "@/src/components/dashboard/CopilotMarkdown"
import { TeamAvatar } from "@/src/components/dashboard/team/TeamAvatar"
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client"
import {
  COPILOT_MENTION,
  TEAM_MESSAGE_MAX_LENGTH,
  type TeamChannel,
  type TeamMember,
  type TeamMessage,
} from "@/src/lib/team"
import { cn } from "@/src/lib/utils"
import { format, isToday, isYesterday } from "date-fns"
import { Hash, Loader2, Pencil, Send, Sparkles, Trash2, X } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

const POLL_INTERVAL_MS = 20_000

type RealtimeRow = {
  id: string
  startup_id: string
  project_id: string | null
  author_id: string | null
  content: string
  is_copilot: boolean
  edited_at: string | null
  created_at: string
}

function fromRealtime(row: RealtimeRow): TeamMessage {
  return {
    id: row.id,
    startupId: row.startup_id,
    projectId: row.project_id,
    authorId: row.author_id,
    content: row.content,
    isCopilot: row.is_copilot,
    editedAt: row.edited_at,
    createdAt: row.created_at,
  }
}

/** Insert or replace by id, keeping the list in chronological order. */
function upsertMessages(current: TeamMessage[], incoming: TeamMessage[]): TeamMessage[] {
  if (incoming.length === 0) return current
  const byId = new Map(current.map((m) => [m.id, m]))
  for (const message of incoming) byId.set(message.id, message)
  return Array.from(byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

function dayLabel(iso: string) {
  const date = new Date(iso)
  if (isToday(date)) return "Today"
  if (isYesterday(date)) return "Yesterday"
  return format(date, "EEE d MMM yyyy")
}

export function TeamChat({
  startupId,
  channels,
  members,
  currentUserId,
  canModerate,
}: {
  startupId: string
  channels: TeamChannel[]
  members: TeamMember[]
  currentUserId: string
  canModerate: boolean
}) {
  const [channelId, setChannelId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<TeamMessage[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState("")
  const [hasMore, setHasMore] = React.useState(false)
  const [loadingOlder, setLoadingOlder] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [copilotThinking, setCopilotThinking] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editDraft, setEditDraft] = React.useState("")
  const [live, setLive] = React.useState(false)

  const listRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const stickToBottom = React.useRef(true)
  // Latest channel for async callbacks (realtime, polling, in-flight sends).
  const channelRef = React.useRef<string | null>(channelId)
  React.useLayoutEffect(() => {
    channelRef.current = channelId
  }, [channelId])

  const memberById = React.useMemo(() => new Map(members.map((m) => [m.userId, m])), [members])
  const activeChannel = channels.find((c) => c.id === channelId) ?? channels[0]

  function selectChannel(next: string | null) {
    if (next === channelId) return
    setChannelId(next)
    setLoading(true)
    setLoadError("")
    setMessages([])
    setHasMore(false)
    setEditingId(null)
    stickToBottom.current = true
  }

  // Load the selected channel (state is reset in selectChannel).
  React.useEffect(() => {
    let cancelled = false

    listTeamMessages(startupId, channelId).then((res) => {
      if (cancelled) return
      if (res.success) {
        setMessages(res.messages)
        setHasMore(res.hasMore)
      } else {
        setLoadError(res.error)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [startupId, channelId])

  // Live updates. Row-level security decides what this user receives; the
  // startup filter just avoids waking up for other teams' traffic.
  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const inThisChannel = (row: RealtimeRow) =>
      row.startup_id === startupId && (row.project_id ?? null) === channelRef.current

    const subscription = supabase
      .channel(`team-messages:${startupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages", filter: `startup_id=eq.${startupId}` },
        (payload) => {
          const row = payload.new as RealtimeRow
          if (inThisChannel(row)) setMessages((prev) => upsertMessages(prev, [fromRealtime(row)]))
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "team_messages", filter: `startup_id=eq.${startupId}` },
        (payload) => {
          const row = payload.new as RealtimeRow
          if (inThisChannel(row)) setMessages((prev) => upsertMessages(prev, [fromRealtime(row)]))
        },
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "team_messages" }, (payload) => {
        const id = (payload.old as { id?: string }).id
        if (id) setMessages((prev) => prev.filter((m) => m.id !== id))
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"))

    return () => {
      void supabase.removeChannel(subscription)
    }
  }, [startupId])

  // Safety net: if the live connection is unavailable (network, realtime not
  // enabled), refresh the newest page periodically while the tab is visible.
  React.useEffect(() => {
    if (live) return
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return
      const requested = channelRef.current
      listTeamMessages(startupId, requested).then((res) => {
        if (!res.success || channelRef.current !== requested) return
        setMessages((prev) => {
          // Drop messages deleted elsewhere (anything newer than the oldest fetched row that vanished).
          const fetchedIds = new Set(res.messages.map((m) => m.id))
          const oldestFetched = res.messages[0]?.createdAt
          const kept = oldestFetched
            ? prev.filter((m) => m.createdAt < oldestFetched || fetchedIds.has(m.id))
            : []
          return upsertMessages(kept, res.messages)
        })
      })
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [live, startupId])

  // Keep the newest message in view unless the reader scrolled up.
  React.useEffect(() => {
    const list = listRef.current
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight
  }, [messages, copilotThinking, loading])

  function handleScroll() {
    const list = listRef.current
    if (!list) return
    stickToBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80
  }

  async function loadOlder() {
    const oldest = messages[0]
    if (!oldest || loadingOlder) return
    setLoadingOlder(true)
    stickToBottom.current = false
    const res = await listTeamMessages(startupId, channelId, { before: oldest.createdAt })
    if (res.success) {
      setMessages((prev) => upsertMessages(prev, res.messages))
      setHasMore(res.hasMore)
    } else {
      toast.error(res.error)
    }
    setLoadingOlder(false)
  }

  function resizeInput(el: HTMLTextAreaElement) {
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending) return

    const wantsCopilot = text.toLowerCase().startsWith(COPILOT_MENTION)
    const question = wantsCopilot ? text.slice(COPILOT_MENTION.length).trim() : ""
    if (wantsCopilot && !question) {
      toast.error(`Add a question after ${COPILOT_MENTION}.`)
      return
    }

    const targetChannel = channelId
    setSending(true)
    stickToBottom.current = true

    const sent = await sendTeamMessage(startupId, targetChannel, text)
    setSending(false)
    if (!sent.success) {
      toast.error(sent.error)
      return
    }

    setDraft("")
    if (inputRef.current) inputRef.current.style.height = "auto"
    if (channelRef.current === targetChannel) {
      setMessages((prev) => upsertMessages(prev, [sent.message]))
    }

    if (wantsCopilot) {
      setCopilotThinking(true)
      const answer = await askCopilotInTeamChat(startupId, targetChannel, question)
      setCopilotThinking(false)
      if (!answer.success) {
        toast.error(answer.error)
      } else if (channelRef.current === targetChannel) {
        setMessages((prev) => upsertMessages(prev, [answer.message]))
      }
    }
  }

  async function saveEdit(messageId: string) {
    const text = editDraft.trim()
    if (!text) return
    const res = await editTeamMessage(messageId, text)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    setMessages((prev) => upsertMessages(prev, [res.message]))
    setEditingId(null)
  }

  async function handleDelete(messageId: string) {
    if (!window.confirm("Delete this message for everyone?")) return
    const res = await deleteTeamMessage(messageId)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
  }

  function insertCopilotMention() {
    if (!draft.toLowerCase().startsWith(COPILOT_MENTION)) setDraft(`${COPILOT_MENTION} ${draft}`)
    inputRef.current?.focus()
  }

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-3xl">
      {/* Channels */}
      <div className="border-b border-zinc-100 p-3 dark:border-zinc-800 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Team chat</h2>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              live
                ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
            )}
            title={live ? "New messages appear instantly" : "Refreshing every 20 seconds"}
          >
            <span className={cn("size-1.5 rounded-full", live ? "bg-green-500" : "bg-zinc-400")} />
            {live ? "Live" : "Syncing"}
          </span>
        </div>
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {channels.map((channel) => {
            const active = channel.id === channelId
            return (
              <button
                key={channel.id ?? "general"}
                type="button"
                onClick={() => selectChannel(channel.id)}
                aria-pressed={active}
                className={cn(
                  "flex max-w-[14rem] shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-green-700 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                )}
              >
                <Hash className="size-3.5 shrink-0" />
                <span className="truncate">{channel.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        aria-live="polite"
        className="h-[min(560px,58vh)] space-y-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:thin] sm:px-5"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-xs text-zinc-500">
            <Loader2 className="mr-2 size-4 animate-spin text-green-600" /> Loading messages…
          </div>
        ) : loadError ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-700 dark:text-red-400">
            {loadError}
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={loadOlder}
                  disabled={loadingOlder}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {loadingOlder ? "Loading…" : "Load earlier messages"}
                </button>
              </div>
            )}

            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  No messages in #{activeChannel?.name ?? "General"} yet
                </p>
                <p className="mt-1 max-w-sm text-xs text-zinc-500">
                  Share an update, ask your co-founders a question, or start with{" "}
                  <span className="font-semibold text-green-700 dark:text-green-400">{COPILOT_MENTION}</span> to get
                  the AI Copilot&apos;s take in front of the whole team.
                </p>
              </div>
            )}

            {messages.map((message, index) => {
              const author = message.authorId ? memberById.get(message.authorId) : undefined
              const mine = message.authorId === currentUserId
              const name = message.isCopilot ? "Copilot" : author ? author.fullName : "Former member"
              const day = dayLabel(message.createdAt)
              const showDay = index === 0 || dayLabel(messages[index - 1].createdAt) !== day
              const isEditing = editingId === message.id

              return (
                <React.Fragment key={message.id}>
                  {showDay && (
                    <div className="flex items-center gap-3 py-3">
                      <span className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{day}</span>
                      <span className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                    </div>
                  )}
                  <div className="group flex gap-3 rounded-xl px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-950/40">
                    {message.isCopilot ? (
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300">
                        <Sparkles className="size-4" />
                      </div>
                    ) : (
                      <TeamAvatar name={name} avatarUrl={author?.avatarUrl ?? null} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                          {name}
                          {mine && <span className="ml-1 font-medium text-zinc-400">(you)</span>}
                        </span>
                        {message.isCopilot && (
                          <span className="rounded bg-green-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-green-700 dark:bg-green-950/40 dark:text-green-300">
                            AI
                          </span>
                        )}
                        <time dateTime={message.createdAt} className="text-[10px] text-zinc-400">
                          {format(new Date(message.createdAt), "HH:mm")}
                        </time>
                        {message.editedAt && <span className="text-[10px] text-zinc-400">(edited)</span>}
                      </div>

                      {isEditing ? (
                        <div className="mt-1.5 space-y-2">
                          <textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            maxLength={TEAM_MESSAGE_MAX_LENGTH}
                            rows={3}
                            autoFocus
                            className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveEdit(message.id)}
                              className="rounded-lg bg-green-700 px-3 py-1 text-xs font-semibold text-white hover:bg-green-800"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="rounded-lg px-3 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : message.isCopilot ? (
                        <div className="mt-1">
                          <CopilotMarkdown content={message.content} variant="assistant" />
                        </div>
                      ) : (
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                          {message.content}
                        </p>
                      )}
                    </div>

                    {!isEditing && (mine || canModerate) && (
                      <div className="flex shrink-0 items-start gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        {mine && (
                          <button
                            type="button"
                            aria-label="Edit message"
                            onClick={() => {
                              setEditingId(message.id)
                              setEditDraft(message.content)
                            }}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label="Delete message"
                          onClick={() => handleDelete(message.id)}
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              )
            })}

            {copilotThinking && (
              <div className="flex items-center gap-2 px-2 py-2 text-xs text-zinc-500">
                <Loader2 className="size-4 animate-spin text-green-600" /> Copilot is thinking…
              </div>
            )}
          </>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="border-t border-zinc-100 p-3 dark:border-zinc-800 sm:p-4">
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={insertCopilotMention}
            title="Ask the AI Copilot in this channel"
            aria-label="Ask the AI Copilot in this channel"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-green-200 bg-green-50 text-green-700 transition hover:bg-green-100 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300"
          >
            <Sparkles className="size-4" />
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={TEAM_MESSAGE_MAX_LENGTH}
            onChange={(e) => {
              setDraft(e.target.value)
              resizeInput(e.currentTarget)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                e.currentTarget.form?.requestSubmit()
              }
            }}
            placeholder={`Message #${activeChannel?.name ?? "General"}`}
            aria-label="Message"
            className="max-h-40 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
          />
          {draft && (
            <button
              type="button"
              aria-label="Clear message"
              onClick={() => {
                setDraft("")
                if (inputRef.current) inputRef.current.style.height = "auto"
              }}
              className="hidden size-11 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 sm:flex"
            >
              <X className="size-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={sending || copilotThinking || !draft.trim()}
            aria-label="Send message"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-green-700 text-white transition hover:bg-green-800 disabled:opacity-50"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-zinc-400">
          Enter to send · Shift+Enter for a new line · start with{" "}
          <span className="font-semibold text-green-700 dark:text-green-400">{COPILOT_MENTION}</span> to ask the AI
        </p>
      </form>
    </section>
  )
}
