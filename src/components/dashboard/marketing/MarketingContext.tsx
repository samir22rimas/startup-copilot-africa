"use client"

import { addMarketingEvent, removeMarketingEvent } from "@/src/app/actions/marketing"
import type { MarketingEventItem, MarketingMetric, MarketingUpcomingItem } from "@/src/app/actions/dashboard"
import { FileText, Mail, Sparkles, Video, type LucideIcon } from "lucide-react"
import React, { createContext, useContext, useState, useTransition } from "react"
import { toast } from "sonner"

export type SocialEvent = {
  id: string
  day: number
  label: string
  color: string
  content?: string
}

export type UpcomingItem = {
  id: string
  title: string
  type: string
  time: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  source?: "tracked" | "derived"
}

interface MarketingContextType {
  projectId: string
  events: SocialEvent[]
  addEvent: (event: Omit<SocialEvent, "id"> & { content?: string }) => void
  removeEvent: (id: string) => void
  upcoming: UpcomingItem[]
  removeUpcoming: (id: string) => void
  kpis: MarketingMetric[]
  strategyItems: { title: string; detail: string }[]
  loading: boolean
}

const MarketingContext = createContext<MarketingContextType | undefined>(undefined)

const iconMap: Record<string, LucideIcon> = {
  file: FileText,
  video: Video,
  mail: Mail,
  sparkles: Sparkles,
}

function toUpcoming(items: MarketingUpcomingItem[]): UpcomingItem[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    time: item.time,
    icon: iconMap[item.iconName] || FileText,
    iconBg: item.iconBg,
    iconColor: item.iconColor,
    source: item.source,
  }))
}

export function MarketingProvider({
  children,
  projectId,
  initialEvents,
  initialUpcoming,
  initialKpis,
  initialStrategy,
}: {
  children: React.ReactNode
  projectId: string
  initialEvents: MarketingEventItem[]
  initialUpcoming: MarketingUpcomingItem[]
  initialKpis: MarketingMetric[]
  initialStrategy: { title: string; detail: string }[]
}) {
  const [events, setEvents] = useState<SocialEvent[]>(initialEvents)
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>(() => toUpcoming(initialUpcoming))
  const [kpis] = useState(initialKpis)
  const [strategyItems] = useState(initialStrategy)
  const [, startTransition] = useTransition()

  const addEvent = (event: Omit<SocialEvent, "id"> & { content?: string }) => {
    const optimisticId = `temp-${Date.now()}`
    const optimistic: SocialEvent = { ...event, id: optimisticId }
    setEvents((prev) => [...prev, optimistic])
    setUpcoming((prev) => [
      {
        id: optimisticId,
        title: event.label,
        type: "Scheduled",
        time: `Day ${event.day}`,
        icon: Mail,
        iconBg: "bg-green-100 dark:bg-green-900/30",
        iconColor: "text-green-700 dark:text-green-400",
        source: "tracked",
      },
      ...prev.filter((u) => u.source === "tracked" || !u.id.startsWith("upcoming-doc")),
    ])

    startTransition(async () => {
      const res = await addMarketingEvent(projectId, event)
      if (!res.success) {
        setEvents((prev) => prev.filter((e) => e.id !== optimisticId))
        setUpcoming((prev) => prev.filter((u) => u.id !== optimisticId))
        toast.error(res.error)
        return
      }
      setEvents((prev) => prev.map((e) => (e.id === optimisticId ? res.event : e)))
      setUpcoming((prev) =>
        prev.map((u) =>
          u.id === optimisticId
            ? { ...u, id: res.event.id, title: res.event.label, time: `Day ${res.event.day}` }
            : u,
        ),
      )
      toast.success("Post saved to your planner")
    })
  }

  const removeEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id))
    setUpcoming((prev) => prev.filter((u) => u.id !== id))
    startTransition(async () => {
      const res = await removeMarketingEvent(projectId, id)
      if (!res.success) toast.error(res.error)
    })
  }

  const removeUpcoming = (id: string) => {
    removeEvent(id)
    setUpcoming((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <MarketingContext.Provider
      value={{
        projectId,
        events,
        addEvent,
        removeEvent,
        upcoming,
        removeUpcoming,
        kpis,
        strategyItems,
        loading: false,
      }}
    >
      {children}
    </MarketingContext.Provider>
  )
}

export function useMarketing() {
  const context = useContext(MarketingContext)
  if (!context) {
    throw new Error("useMarketing must be used within a MarketingProvider")
  }
  return context
}
