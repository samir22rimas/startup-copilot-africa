"use client"

import {
  ArrowDown,
  Copy,
  CornerUpLeft,
  Eye,
  Hash,
  ListPlus,
  Loader2,
  Pencil,
  RotateCw,
  Search,
  Send,
  SmilePlus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import {
  askCopilotInTeamChat,
  createTaskFromTeamMessage,
  deleteTeamMessage,
  editTeamMessage,
  getTeamMessage,
  getTeamUnreadCounts,
  listTeamMessages,
  markTeamChannelRead,
  searchTeamMessages,
  sendTeamMessage,
  toggleTeamReaction,
} from "@/src/app/actions/team-chat"
import { CopilotMarkdown } from "@/src/components/dashboard/CopilotMarkdown"
import { TeamAvatar } from "@/src/components/dashboard/team/TeamAvatar"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client"
import {
  COPILOT_MENTION,
  TEAM_MESSAGE_MAX_LENGTH,
  TEAM_REACTIONS,
  channelKeyOf,
  findMentionedMembers,
  isTeamReactionKey,
  mentionHandle,
  type TeamChannel,
  type TeamMember,
  type TeamMessage,
  type TeamReaction,
  type TeamReactionKey,
} from "@/src/lib/team"
import { cn } from "@/src/lib/utils"

const POLL_INTERVAL_MS = 20_000
const TYPING_SEND_EVERY_MS = 2_500
const TYPING_VISIBLE_MS = 5_000
const GROUP_WINDOW_MS = 5 * 60_000

type RealtimeRow = {
  id: string
  startup_id: string
  project_id: string | null
  author_id: string | null
  content: string
  is_copilot: boolean
  edited_at: string | null
  created_at: string
  reply_to_id?: string | null
}

type ReactionRow = { message_id: string; startup_id?: string; user_id: string; reaction: string }

type RoomChannel = ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]>

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
    replyToId: row.reply_to_id ?? null,
    reactions: [],
  }
}

/** Insert or replace by id, in chronological order. Live rows carry no reactions, so known ones are kept. */
function upsertMessages(current: TeamMessage[], incoming: TeamMessage[]): TeamMessage[] {
  if (incoming.length === 0) return current
  const byId = new Map(current.map((m) => [m.id, m]))
  for (const message of incoming) {
    const existing = byId.get(message.id)
    byId.set(message.id, {
      ...message,
      reactions: message.reactions.length || !existing ? message.reactions : existing.reactions,
    })
  }
  return Array.from(byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

function applyReaction(reactions: TeamReaction[], key: TeamReactionKey, userId: string, on: boolean): TeamReaction[] {
  const next = reactions.map((r) => ({ ...r, userIds: [...r.userIds] }))
  const entry = next.find((r) => r.key === key)
  if (on) {
    if (!entry) next.push({ key, userIds: [userId] })
    else if (!entry.userIds.includes(userId)) entry.userIds.push(userId)
  } else if (entry) {
    entry.userIds = entry.userIds.filter((id) => id !== userId)
  }
  return next.filter((r) => r.userIds.length > 0)
}

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const EMOJI = Object.fromEntries(TEAM_REACTIONS.map((r) => [r.key, r.emoji])) as Record<TeamReactionKey, string>

type MentionState = { query: string; start: number; index: number }

export function TeamChat({
  startupId,
  channels,
  members,
  currentUserId,
  canModerate,
  canPost = true,
  canCreateTasks = false,
}: {
  startupId: string
  channels: TeamChannel[]
  members: TeamMember[]
  currentUserId: string
  canModerate: boolean
  /** False for viewers: they read the chat but cannot post or react. */
  canPost?: boolean
  /** Editors and above can turn a message into a task. */
  canCreateTasks?: boolean
}) {
  const { t, locale } = useI18n()
  const c = t.teamChat

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
  const [atBottom, setAtBottom] = React.useState(true)
  const [reloadKey, setReloadKey] = React.useState(0)
  const [replyTo, setReplyTo] = React.useState<TeamMessage | null>(null)
  const [originals, setOriginals] = React.useState<Record<string, TeamMessage | null>>({})
  const [unread, setUnread] = React.useState<Record<string, number>>({})
  const [online, setOnline] = React.useState<string[]>([])
  const [typing, setTyping] = React.useState<Record<string, { channelKey: string; expires: number }>>({})
  const [pickerFor, setPickerFor] = React.useState<string | null>(null)
  const [mention, setMention] = React.useState<MentionState | null>(null)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<TeamMessage[] | null>(null)
  const [searching, setSearching] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [flashId, setFlashId] = React.useState<string | null>(null)

  const listRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const stickToBottom = React.useRef(true)
  const roomRef = React.useRef<RoomChannel | null>(null)
  const lastTypingSent = React.useRef(0)
  const markReadTimer = React.useRef<number | null>(null)
  // Latest channel for async callbacks (realtime, polling, in-flight sends).
  const channelRef = React.useRef<string | null>(channelId)
  React.useLayoutEffect(() => {
    channelRef.current = channelId
  }, [channelId])

  const memberById = React.useMemo(() => new Map(members.map((m) => [m.userId, m])), [members])
  const me = memberById.get(currentUserId)
  const activeChannel = channels.find((ch) => ch.id === channelId) ?? channels[0]
  const channelLabel = (channel: TeamChannel | undefined) => (!channel || channel.id === null ? c.general : channel.name)
  const nameOf = (message: Pick<TeamMessage, "authorId" | "isCopilot">) =>
    message.isCopilot ? "Copilot" : (message.authorId && memberById.get(message.authorId)?.fullName) || c.formerMember

  // Links and @mentions inside human messages.
  const mentionPattern = React.useMemo(() => {
    const handles = Array.from(
      new Set(members.flatMap((m) => [m.fullName.trim(), mentionHandle(m.fullName)]).filter((h) => h.length > 1)),
    ).sort((a, b) => b.length - a.length)
    const names = [...handles.map(escapeRegExp), "copilot"].join("|")
    return new RegExp(`(https?:\\/\\/[^\\s<>()]+[^\\s<>().,;:!?'"])|@(${names})(?![\\p{L}\\p{N}_])`, "giu")
  }, [members])

  const myHandles = React.useMemo(
    () => (me ? [me.fullName.trim().toLowerCase(), mentionHandle(me.fullName).toLowerCase()] : []),
    [me],
  )

  function renderText(content: string) {
    const parts: React.ReactNode[] = []
    let last = 0
    for (const match of content.matchAll(mentionPattern)) {
      const index = match.index ?? 0
      if (index > last) parts.push(content.slice(last, index))
      if (match[1]) {
        parts.push(
          <a key={index} href={match[1]} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-primary underline underline-offset-2">
            {match[1]}
          </a>,
        )
      } else {
        const isMe = myHandles.includes((match[2] ?? "").toLowerCase())
        parts.push(
          <span
            key={index}
            className={cn("rounded px-0.5 font-semibold", isMe ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200" : "text-primary")}
          >
            {match[0]}
          </span>,
        )
      }
      last = index + match[0].length
    }
    if (last < content.length) parts.push(content.slice(last))
    return parts
  }

  // ---------------------------------------------------------------------------
  // Loading, live updates, read state
  // ---------------------------------------------------------------------------

  const scheduleMarkRead = React.useCallback(() => {
    if (markReadTimer.current) window.clearTimeout(markReadTimer.current)
    markReadTimer.current = window.setTimeout(() => {
      if (document.visibilityState !== "visible") return
      const current = channelRef.current
      setUnread((prev) => ({ ...prev, [channelKeyOf(current)]: 0 }))
      void markTeamChannelRead(startupId, current)
    }, 1200)
  }, [startupId])

  function selectChannel(next: string | null) {
    setChannelId(next)
    setLoading(true)
    setLoadError("")
    setMessages([])
    setHasMore(false)
    setEditingId(null)
    setReplyTo(null)
    setPickerFor(null)
    stickToBottom.current = true
    setAtBottom(true)
    setUnread((prev) => ({ ...prev, [channelKeyOf(next)]: 0 }))
    setReloadKey((value) => value + 1)
  }

  // Load the selected channel (state is reset in selectChannel).
  React.useEffect(() => {
    let cancelled = false
    listTeamMessages(startupId, channelId).then((res) => {
      if (cancelled) return
      if (res.success) {
        setMessages(res.messages)
        setHasMore(res.hasMore)
        scheduleMarkRead()
      } else {
        setLoadError(res.error)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [startupId, channelId, reloadKey, scheduleMarkRead])

  // Unread badges for the other channels.
  React.useEffect(() => {
    let cancelled = false
    getTeamUnreadCounts(startupId).then((counts) => {
      if (cancelled) return
      const current = channelKeyOf(channelRef.current)
      setUnread({ ...counts, [current]: 0 })
    })
    const onVisible = () => {
      if (document.visibilityState === "visible") scheduleMarkRead()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisible)
      if (markReadTimer.current) window.clearTimeout(markReadTimer.current)
    }
  }, [startupId, scheduleMarkRead])

  // Live messages and reactions. Row-level security decides what this user
  // receives; the startup filter avoids waking up for other teams' traffic.
  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const inThisChannel = (row: RealtimeRow) => row.startup_id === startupId && (row.project_id ?? null) === channelRef.current

    const subscription = supabase
      .channel(`team-messages:${startupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages", filter: `startup_id=eq.${startupId}` },
        (payload) => {
          const row = payload.new as RealtimeRow
          const author = row.author_id
          if (author) {
            setTyping((prev) => {
              if (!prev[author]) return prev
              const next = { ...prev }
              delete next[author]
              return next
            })
          }
          if (inThisChannel(row)) {
            setMessages((prev) => upsertMessages(prev, [fromRealtime(row)]))
            if (author !== currentUserId) scheduleMarkRead()
          } else if (author !== currentUserId) {
            const key = channelKeyOf(row.project_id)
            setUnread((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }))
          }
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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_message_reactions", filter: `startup_id=eq.${startupId}` },
        (payload) => {
          const row = payload.new as ReactionRow
          if (!isTeamReactionKey(row.reaction)) return
          const key = row.reaction
          setMessages((prev) =>
            prev.map((m) => (m.id === row.message_id ? { ...m, reactions: applyReaction(m.reactions, key, row.user_id, true) } : m)),
          )
        },
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "team_message_reactions" }, (payload) => {
        const row = payload.old as Partial<ReactionRow>
        const key = row.reaction
        const userId = row.user_id
        if (!row.message_id || !userId || !isTeamReactionKey(key)) return
        setMessages((prev) =>
          prev.map((m) => (m.id === row.message_id ? { ...m, reactions: applyReaction(m.reactions, key, userId, false) } : m)),
        )
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"))

    return () => {
      void supabase.removeChannel(subscription)
    }
  }, [startupId, currentUserId, scheduleMarkRead])

  // Who is online, and who is typing. Payloads carry only user ids and the
  // channel key — never message content.
  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    const room = supabase.channel(`team-room:${startupId}`, { config: { presence: { key: currentUserId } } })
    room
      .on("presence", { event: "sync" }, () => {
        setOnline(Object.keys(room.presenceState()))
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const data = payload as { userId?: unknown; channelKey?: unknown }
        if (typeof data.userId !== "string" || data.userId === currentUserId || typeof data.channelKey !== "string") return
        const userId = data.userId
        const channelKey = data.channelKey
        setTyping((prev) => ({ ...prev, [userId]: { channelKey, expires: Date.now() + TYPING_VISIBLE_MS } }))
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void room.track({ userId: currentUserId })
      })
    roomRef.current = room
    return () => {
      roomRef.current = null
      void supabase.removeChannel(room)
    }
  }, [startupId, currentUserId])

  // Typing indicators fade out on their own.
  const hasTyping = Object.keys(typing).length > 0
  React.useEffect(() => {
    if (!hasTyping) return
    const timer = window.setInterval(() => {
      setTyping((prev) => {
        const now = Date.now()
        const next = Object.fromEntries(Object.entries(prev).filter(([, entry]) => entry.expires > now))
        return Object.keys(next).length === Object.keys(prev).length ? prev : next
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [hasTyping])

  // Safety net: if the live connection is unavailable, refresh the newest page
  // periodically while the tab is visible.
  React.useEffect(() => {
    if (live) return
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return
      const requested = channelRef.current
      listTeamMessages(startupId, requested).then((res) => {
        if (!res.success || channelRef.current !== requested) return
        setMessages((prev) => {
          const fetchedIds = new Set(res.messages.map((m) => m.id))
          const oldestFetched = res.messages[0]?.createdAt
          const kept = oldestFetched ? prev.filter((m) => m.createdAt < oldestFetched || fetchedIds.has(m.id)) : []
          return upsertMessages(kept, res.messages)
        })
      })
    }, POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [live, startupId])

  // Replies whose original is outside the loaded page are fetched once.
  const missingOriginals = React.useMemo(() => {
    const loaded = new Set(messages.map((m) => m.id))
    return Array.from(new Set(messages.map((m) => m.replyToId).filter((id): id is string => Boolean(id)))).filter(
      (id) => !loaded.has(id) && !(id in originals),
    )
  }, [messages, originals])

  React.useEffect(() => {
    if (!missingOriginals.length) return
    let cancelled = false
    Promise.all(missingOriginals.slice(0, 10).map(async (id) => [id, await getTeamMessage(startupId, id)] as const)).then((rows) => {
      if (!cancelled) setOriginals((prev) => ({ ...prev, ...Object.fromEntries(rows) }))
    })
    return () => {
      cancelled = true
    }
  }, [missingOriginals, startupId])

  // Keep the newest message in view unless the reader scrolled up.
  React.useEffect(() => {
    const list = listRef.current
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight
  }, [messages, copilotThinking, loading])

  function handleScroll() {
    const list = listRef.current
    if (!list) return
    const isAtBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80
    stickToBottom.current = isAtBottom
    setAtBottom(isAtBottom)
  }

  function jumpToLatest() {
    const list = listRef.current
    if (!list) return
    stickToBottom.current = true
    setAtBottom(true)
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" })
  }

  function jumpToMessage(id: string) {
    const element = document.getElementById(`team-msg-${id}`)
    if (!element) return
    stickToBottom.current = false
    element.scrollIntoView({ behavior: "smooth", block: "center" })
    setFlashId(id)
    window.setTimeout(() => setFlashId((current) => (current === id ? null : current)), 1600)
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

  // ---------------------------------------------------------------------------
  // Composer
  // ---------------------------------------------------------------------------

  const mentionOptions = React.useMemo(() => {
    if (!mention) return []
    const query = mention.query.toLowerCase()
    const people = members
      .filter((m) => m.userId !== currentUserId)
      .filter((m) => !query || m.fullName.toLowerCase().includes(query))
      .slice(0, 6)
      .map((m) => ({ id: m.userId, label: m.fullName, insert: `@${mentionHandle(m.fullName)} `, member: m as TeamMember | null }))
    const copilot =
      mention.start === 0 && "copilot".startsWith(query)
        ? [{ id: "copilot", label: "Copilot", insert: `${COPILOT_MENTION} `, member: null as TeamMember | null }]
        : []
    return [...copilot, ...people]
  }, [mention, members, currentUserId])

  function resizeInput(el: HTMLTextAreaElement) {
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  function updateMention(value: string, caret: number) {
    const match = value.slice(0, caret).match(/(^|\s)@([\p{L}\p{N}_-]{0,30})$/u)
    if (!match) {
      setMention(null)
      return
    }
    const start = caret - match[2].length - 1
    setMention((prev) => ({ query: match[2], start, index: prev && prev.start === start ? prev.index : 0 }))
  }

  function chooseMention(option: { insert: string }) {
    if (!mention) return
    const caret = inputRef.current?.selectionStart ?? draft.length
    const position = mention.start + option.insert.length
    setDraft(draft.slice(0, mention.start) + option.insert + draft.slice(caret))
    setMention(null)
    requestAnimationFrame(() => {
      const input = inputRef.current
      if (!input) return
      input.focus()
      input.setSelectionRange(position, position)
      resizeInput(input)
    })
  }

  function broadcastTyping() {
    const now = Date.now()
    if (!roomRef.current || now - lastTypingSent.current < TYPING_SEND_EVERY_MS) return
    lastTypingSent.current = now
    void roomRef.current.send({ type: "broadcast", event: "typing", payload: { userId: currentUserId, channelKey: channelKeyOf(channelId) } })
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending || !canPost) return

    const wantsCopilot = text.toLowerCase().startsWith(COPILOT_MENTION)
    const question = wantsCopilot ? text.slice(COPILOT_MENTION.length).trim() : ""
    if (wantsCopilot && !question) {
      toast.error(fmt(c.copilotNeedsQuestion, { mention: COPILOT_MENTION }))
      return
    }

    const targetChannel = channelId
    setSending(true)
    stickToBottom.current = true

    const sent = await sendTeamMessage(startupId, targetChannel, text, replyTo?.id ?? null)
    setSending(false)
    if (!sent.success) {
      toast.error(sent.error)
      return
    }

    setDraft("")
    setReplyTo(null)
    setMention(null)
    lastTypingSent.current = 0
    if (inputRef.current) inputRef.current.style.height = "auto"
    if (channelRef.current === targetChannel) setMessages((prev) => upsertMessages(prev, [sent.message]))

    if (wantsCopilot) {
      setCopilotThinking(true)
      const answer = await askCopilotInTeamChat(startupId, targetChannel, question, sent.message.id)
      setCopilotThinking(false)
      if (!answer.success) toast.error(answer.error)
      else if (channelRef.current === targetChannel) setMessages((prev) => upsertMessages(prev, [answer.message]))
    }
  }

  function insertCopilotMention() {
    if (!draft.toLowerCase().startsWith(COPILOT_MENTION)) setDraft(`${COPILOT_MENTION} ${draft}`)
    inputRef.current?.focus()
  }

  // ---------------------------------------------------------------------------
  // Message actions
  // ---------------------------------------------------------------------------

  async function saveEdit(messageId: string) {
    const text = editDraft.trim()
    if (!text) return
    const res = await editTeamMessage(messageId, text)
    if (!res.success) return void toast.error(res.error)
    setMessages((prev) => upsertMessages(prev, [res.message]))
    setEditingId(null)
  }

  async function handleDelete(messageId: string) {
    if (!window.confirm(c.deleteConfirm)) return
    const res = await deleteTeamMessage(messageId)
    if (!res.success) return void toast.error(res.error)
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
  }

  async function toggleReaction(message: TeamMessage, key: TeamReactionKey) {
    setPickerFor(null)
    if (!canPost) return
    const mine = message.reactions.some((r) => r.key === key && r.userIds.includes(currentUserId))
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? { ...m, reactions: applyReaction(m.reactions, key, currentUserId, !mine) } : m)),
    )
    const res = await toggleTeamReaction(startupId, message.id, key)
    if (!res.success) {
      toast.error(res.error)
      setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, reactions: message.reactions } : m)))
      return
    }
    setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, reactions: res.reactions } : m)))
  }

  async function makeTask(message: TeamMessage) {
    setBusyId(message.id)
    const res = await createTaskFromTeamMessage(message.id)
    setBusyId(null)
    if (!res.success) return void toast.error(res.error)
    toast.success(fmt(c.taskCreated, { task: res.taskTitle, project: res.projectTitle }))
  }

  async function copyText(message: TeamMessage) {
    try {
      await navigator.clipboard.writeText(message.content)
      toast.success(c.copied)
    } catch {
      toast.error(t.common.errorGeneric)
    }
  }

  async function runSearch(event: React.FormEvent) {
    event.preventDefault()
    if (searchQuery.trim().length < 2) return
    setSearching(true)
    const res = await searchTeamMessages(startupId, searchQuery)
    setSearching(false)
    if (!res.success) return void toast.error(res.error)
    setSearchResults(res.messages)
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function dayLabel(iso: string) {
    const date = new Date(iso)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return c.today
    if (date.toDateString() === yesterday.toDateString()) return c.yesterday
    return date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" })
  }

  const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })

  const currentKey = channelKeyOf(channelId)
  const typingNames = Object.entries(typing)
    .filter(([userId, entry]) => entry.channelKey === currentKey && userId !== currentUserId)
    .map(([userId]) => memberById.get(userId)?.fullName ?? c.formerMember)
  const typingLabel =
    typingNames.length === 0
      ? ""
      : typingNames.length === 1
        ? fmt(c.typingOne, { name: typingNames[0] })
        : typingNames.length === 2
          ? fmt(c.typingTwo, { a: typingNames[0], b: typingNames[1] })
          : c.typingMany

  const onlineMembers = members.filter((m) => online.includes(m.userId))
  const messageById = new Map(messages.map((m) => [m.id, m]))

  const iconButton =
    "flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"

  return (
    <section className="relative flex min-h-0 flex-col rounded-xl border border-border bg-card">
      {/* Header: title, presence, search, channels */}
      <div className="border-b border-border p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{c.title}</h2>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                live ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-muted text-muted-foreground",
              )}
              title={live ? c.liveHint : c.syncingHint}
            >
              <span className={cn("size-1.5 rounded-full", live ? "bg-emerald-500" : "bg-muted-foreground")} />
              {live ? c.live : c.syncing}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onlineMembers.length > 0 && (
              <div
                className="hidden items-center gap-1.5 sm:flex"
                title={fmt(c.onlineNames, { names: onlineMembers.map((m) => m.fullName).join(", ") })}
              >
                <div className="flex -space-x-2">
                  {onlineMembers.slice(0, 4).map((member) => (
                    <span key={member.userId} className="relative rounded-full ring-2 ring-card">
                      <TeamAvatar name={member.fullName} avatarUrl={member.avatarUrl} className="size-6" />
                      <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-card" />
                    </span>
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground">{fmt(c.online, { count: onlineMembers.length })}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchOpen((open) => !open)
                setSearchResults(null)
              }}
              aria-label={searchOpen ? c.closeSearch : c.search}
              aria-pressed={searchOpen}
              className={cn(iconButton, "size-8", searchOpen && "bg-muted text-foreground")}
            >
              {searchOpen ? <X className="size-4" /> : <Search className="size-4" />}
            </button>
          </div>
        </div>

        {searchOpen && (
          <form onSubmit={runSearch} className="mt-3 flex gap-2">
            <input
              type="search"
              autoFocus
              value={searchQuery}
              maxLength={80}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={c.searchPlaceholder}
              aria-label={c.search}
              className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
            />
            <button
              type="submit"
              aria-label={c.search}
              disabled={searching || searchQuery.trim().length < 2}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            </button>
          </form>
        )}

        <div role="tablist" aria-label={c.channels} className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {channels.map((channel) => {
            const active = channel.id === channelId
            const count = active ? 0 : (unread[channelKeyOf(channel.id)] ?? 0)
            return (
              <button
                key={channel.id ?? "general"}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectChannel(channel.id)}
                className={cn(
                  "flex max-w-[14rem] shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
                  count > 0 && !active && "font-semibold text-foreground",
                )}
              >
                <Hash className="size-3.5 shrink-0" />
                <span className="truncate">{channelLabel(channel)}</span>
                {count > 0 && (
                  <span
                    className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 text-primary-foreground"
                    aria-label={fmt(c.unread, { count })}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search results replace the message list while shown */}
      {searchOpen && searchResults !== null ? (
        <div className="h-[min(560px,58vh)] overflow-y-auto px-3 py-3 sm:px-5">
          <p className="px-2 pb-2 text-xs text-muted-foreground">
            {searchResults.length === 0
              ? fmt(c.searchNoResults, { query: searchQuery })
              : fmt(c.searchResults, { count: searchResults.length })}
          </p>
          <ul className="space-y-1">
            {searchResults.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false)
                    setSearchResults(null)
                    if (result.projectId !== channelId) selectChannel(result.projectId)
                  }}
                  className="w-full rounded-lg px-2 py-2 text-left transition hover:bg-muted"
                >
                  <span className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{nameOf(result)}</span>
                    <span>#{channelLabel(channels.find((ch) => ch.id === result.projectId))}</span>
                    <span>
                      {dayLabel(result.createdAt)} · {timeLabel(result.createdAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-sm text-foreground">{result.content}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div ref={listRef} onScroll={handleScroll} aria-live="polite" className="h-[min(560px,58vh)] overflow-y-auto overscroll-contain px-2 py-3 sm:px-4">
          {loading ? (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin text-primary" /> {c.loading}
            </div>
          ) : loadError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-red-700 dark:text-red-400">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => selectChannel(channelId)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-current px-3 py-1.5 text-xs font-semibold"
              >
                <RotateCw className="size-3.5" /> {c.retry}
              </button>
            </div>
          ) : (
            <>
              {hasMore && (
                <div className="flex justify-center pb-2">
                  <button
                    type="button"
                    onClick={loadOlder}
                    disabled={loadingOlder}
                    className="rounded-full border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                  >
                    {loadingOlder ? c.loadingEarlier : c.loadEarlier}
                  </button>
                </div>
              )}

              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <p className="text-sm font-semibold text-foreground">{fmt(c.emptyTitle, { channel: channelLabel(activeChannel) })}</p>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">{fmt(c.emptyBody, { mention: COPILOT_MENTION })}</p>
                  {canPost && (
                    <button
                      type="button"
                      onClick={insertCopilotMention}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      <Sparkles className="size-3.5" /> {c.askCopilot}
                    </button>
                  )}
                </div>
              )}

              {messages.map((message, index) => {
                const previous = messages[index - 1]
                const showDay = !previous || !sameDay(previous.createdAt, message.createdAt)
                const compact =
                  !showDay &&
                  !message.replyToId &&
                  previous.authorId === message.authorId &&
                  previous.isCopilot === message.isCopilot &&
                  new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < GROUP_WINDOW_MS
                const author = message.authorId ? memberById.get(message.authorId) : undefined
                const mine = message.authorId === currentUserId
                const name = nameOf(message)
                const isEditing = editingId === message.id
                const mentionsMe = !mine && !message.isCopilot && me ? findMentionedMembers(message.content, [me]).length > 0 : false
                const original = message.replyToId ? (messageById.get(message.replyToId) ?? originals[message.replyToId] ?? null) : null
                const canEditThis = mine && !message.isCopilot

                return (
                  <React.Fragment key={message.id}>
                    {showDay && (
                      <div className="flex items-center gap-3 py-3">
                        <span className="h-px flex-1 bg-border" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {dayLabel(message.createdAt)}
                        </span>
                        <span className="h-px flex-1 bg-border" />
                      </div>
                    )}
                    <div
                      id={`team-msg-${message.id}`}
                      className={cn(
                        "group relative flex gap-3 rounded-lg px-2 transition-colors hover:bg-muted/50",
                        compact ? "py-0.5" : "mt-1 py-1.5",
                        mentionsMe && "border-l-2 border-amber-400 bg-amber-50/60 dark:bg-amber-500/5",
                        flashId === message.id && "bg-accent",
                      )}
                    >
                      <div className="w-8 shrink-0">
                        {compact ? (
                          <time dateTime={message.createdAt} className="hidden pt-1 text-[10px] tabular-nums text-muted-foreground group-hover:block">
                            {timeLabel(message.createdAt)}
                          </time>
                        ) : message.isCopilot ? (
                          <div className="flex size-8 items-center justify-center rounded-full bg-accent text-primary">
                            <Sparkles className="size-4" />
                          </div>
                        ) : (
                          <span className="relative block">
                            <TeamAvatar name={name} avatarUrl={author?.avatarUrl ?? null} />
                            {message.authorId && online.includes(message.authorId) && (
                              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                            )}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        {!compact && (
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-[13px] font-semibold text-foreground">
                              {name}
                              {mine && <span className="ml-1 font-normal text-muted-foreground">({c.you})</span>}
                            </span>
                            {message.isCopilot && (
                              <span className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent-foreground">
                                {c.ai}
                              </span>
                            )}
                            <time dateTime={message.createdAt} className="text-[10px] text-muted-foreground">
                              {timeLabel(message.createdAt)}
                            </time>
                            {message.editedAt && <span className="text-[10px] text-muted-foreground">({c.edited})</span>}
                            {mentionsMe && <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">{c.mentionsYou}</span>}
                          </div>
                        )}

                        {message.replyToId && (
                          <button
                            type="button"
                            onClick={() => original && jumpToMessage(original.id)}
                            disabled={!original || !messageById.has(original.id)}
                            title={c.showOriginal}
                            className="mt-1 flex max-w-full items-start gap-1.5 rounded-md border-l-2 border-primary/40 bg-muted/60 px-2 py-1 text-left text-xs text-muted-foreground disabled:cursor-default"
                          >
                            <CornerUpLeft className="mt-0.5 size-3 shrink-0" />
                            {original ? (
                              <span className="min-w-0 truncate">
                                <span className="font-semibold text-foreground">{nameOf(original)}</span> {original.content}
                              </span>
                            ) : (
                              <span className="italic">{c.originalDeleted}</span>
                            )}
                          </button>
                        )}

                        {isEditing ? (
                          <div className="mt-1.5 space-y-2">
                            <textarea
                              value={editDraft}
                              onChange={(e) => setEditDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") setEditingId(null)
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault()
                                  void saveEdit(message.id)
                                }
                              }}
                              maxLength={TEAM_MESSAGE_MAX_LENGTH}
                              rows={3}
                              autoFocus
                              aria-label={c.edit}
                              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => saveEdit(message.id)}
                                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                              >
                                {c.save}
                              </button>
                              <button type="button" onClick={() => setEditingId(null)} className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">
                                {c.cancel}
                              </button>
                            </div>
                          </div>
                        ) : message.isCopilot ? (
                          <div className="mt-1">
                            <CopilotMarkdown content={message.content} variant="assistant" />
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{renderText(message.content)}</p>
                        )}

                        {message.reactions.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {message.reactions.map((reaction) => {
                              const reacted = reaction.userIds.includes(currentUserId)
                              const names = reaction.userIds.map((id) =>
                                id === currentUserId ? c.you : (memberById.get(id)?.fullName ?? c.formerMember),
                              )
                              return (
                                <button
                                  key={reaction.key}
                                  type="button"
                                  disabled={!canPost}
                                  aria-pressed={reacted}
                                  title={fmt(c.reactedBy, { names: names.join(", "), emoji: EMOJI[reaction.key] })}
                                  onClick={() => toggleReaction(message, reaction.key)}
                                  className={cn(
                                    "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs tabular-nums transition disabled:cursor-default",
                                    reacted ? "border-primary/50 bg-accent text-accent-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted",
                                  )}
                                >
                                  <span aria-hidden="true">{EMOJI[reaction.key]}</span>
                                  {reaction.userIds.length}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {!isEditing && (
                        <div
                          className={cn(
                            "absolute -top-3 right-2 z-10 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-0.5 shadow-sm transition-opacity",
                            pickerFor === message.id
                              ? "opacity-100"
                              : "opacity-100 sm:pointer-events-none sm:opacity-0 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100",
                          )}
                        >
                          {canPost && (
                            <>
                              <button
                                type="button"
                                aria-label={c.react}
                                title={c.react}
                                aria-expanded={pickerFor === message.id}
                                onClick={() => setPickerFor((current) => (current === message.id ? null : message.id))}
                                className={iconButton}
                              >
                                <SmilePlus className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label={c.reply}
                                title={c.reply}
                                onClick={() => {
                                  setReplyTo(message)
                                  inputRef.current?.focus()
                                }}
                                className={iconButton}
                              >
                                <CornerUpLeft className="size-3.5" />
                              </button>
                            </>
                          )}
                          {canCreateTasks && (
                            <button
                              type="button"
                              aria-label={c.makeTask}
                              title={c.makeTask}
                              disabled={busyId === message.id}
                              onClick={() => makeTask(message)}
                              className={iconButton}
                            >
                              {busyId === message.id ? <Loader2 className="size-3.5 animate-spin" /> : <ListPlus className="size-3.5" />}
                            </button>
                          )}
                          <button type="button" aria-label={c.copy} title={c.copy} onClick={() => copyText(message)} className={iconButton}>
                            <Copy className="size-3.5" />
                          </button>
                          {canEditThis && (
                            <button
                              type="button"
                              aria-label={c.edit}
                              title={c.edit}
                              onClick={() => {
                                setEditingId(message.id)
                                setEditDraft(message.content)
                              }}
                              className={iconButton}
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          )}
                          {(mine || canModerate) && (
                            <button
                              type="button"
                              aria-label={c.delete}
                              title={c.delete}
                              onClick={() => handleDelete(message.id)}
                              className={cn(iconButton, "hover:text-red-600")}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      )}

                      {pickerFor === message.id && (
                        <div role="menu" aria-label={c.react} className="absolute right-2 top-5 z-20 flex gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg">
                          {TEAM_REACTIONS.map((reaction) => (
                            <button
                              key={reaction.key}
                              type="button"
                              role="menuitem"
                              onClick={() => toggleReaction(message, reaction.key)}
                              className="flex size-8 items-center justify-center rounded-md text-base transition hover:bg-muted"
                            >
                              {reaction.emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                )
              })}

              {copilotThinking && (
                <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" /> {c.copilotThinking}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!searchOpen && !loading && !loadError && !atBottom && messages.length > 0 && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-28 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background shadow-lg"
        >
          <ArrowDown className="size-3.5" /> {c.latest}
        </button>
      )}

      {/* Typing indicator */}
      <div className="h-5 px-4 text-[11px] text-muted-foreground" aria-live="polite">
        {typingLabel}
      </div>

      {/* Composer */}
      {canPost ? (
        <form onSubmit={handleSend} className="border-t border-border p-3 sm:p-4">
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs">
              <CornerUpLeft className="size-3.5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                <span className="font-semibold text-foreground">{fmt(c.replyingTo, { name: nameOf(replyTo) })}</span> · {replyTo.content}
              </span>
              <button type="button" aria-label={c.cancelReply} onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <div className="relative flex items-end gap-2">
            {mention && mentionOptions.length > 0 && (
              <ul role="listbox" className="absolute bottom-full left-12 z-30 mb-2 w-64 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg">
                {mentionOptions.map((option, index) => (
                  <li key={option.id} role="option" aria-selected={index === mention.index}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseMention(option)}
                      className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm", index === mention.index ? "bg-muted" : "hover:bg-muted")}
                    >
                      {option.member ? (
                        <TeamAvatar name={option.member.fullName} avatarUrl={option.member.avatarUrl} className="size-5" />
                      ) : (
                        <Sparkles className="size-4 text-primary" />
                      )}
                      <span className="truncate text-foreground">{option.label}</span>
                      {option.member && online.includes(option.member.userId) && <span className="ml-auto size-2 rounded-full bg-emerald-500" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={insertCopilotMention}
              title={c.askCopilotHint}
              aria-label={c.askCopilotHint}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-accent text-primary transition hover:bg-accent/70"
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
                updateMention(e.target.value, e.target.selectionStart ?? e.target.value.length)
                if (e.target.value.trim()) broadcastTyping()
              }}
              onKeyDown={(e) => {
                if (mention && mentionOptions.length > 0) {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault()
                    const step = e.key === "ArrowDown" ? 1 : -1
                    setMention({ ...mention, index: (mention.index + step + mentionOptions.length) % mentionOptions.length })
                    return
                  }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault()
                    chooseMention(mentionOptions[mention.index] ?? mentionOptions[0])
                    return
                  }
                  if (e.key === "Escape") {
                    e.preventDefault()
                    setMention(null)
                    return
                  }
                }
                if (e.key === "Escape" && replyTo) setReplyTo(null)
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  e.currentTarget.form?.requestSubmit()
                }
              }}
              onBlur={() => window.setTimeout(() => setMention(null), 150)}
              placeholder={fmt(c.placeholder, { channel: channelLabel(activeChannel) })}
              aria-label={c.messageLabel}
              className="max-h-40 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25"
            />
            {draft && (
              <button
                type="button"
                aria-label={c.clear}
                onClick={() => {
                  setDraft("")
                  setMention(null)
                  if (inputRef.current) inputRef.current.style.height = "auto"
                }}
                className="hidden size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted sm:flex"
              >
                <X className="size-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={sending || copilotThinking || !draft.trim()}
              aria-label={c.send}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{fmt(c.composerHint, { mention: COPILOT_MENTION })}</p>
        </form>
      ) : (
        <p className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <Eye className="size-3.5 shrink-0" /> {c.readOnly}
        </p>
      )}
    </section>
  )
}
