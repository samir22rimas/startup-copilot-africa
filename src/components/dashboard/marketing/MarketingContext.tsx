"use client"

import { getDashboardData } from "@/src/app/actions/dashboard"
import { FileText, Mail, Sparkles, Video, type LucideIcon } from "lucide-react"
import React, { createContext, useContext, useEffect, useState } from "react"

export type SocialEvent = {
  id: string
  day: number
  label: string
  color: string
}

export type UpcomingItem = {
  id: string
  title: string
  type: string
  time: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
}

interface MarketingContextType {
  events: SocialEvent[]
  addEvent: (event: Omit<SocialEvent, "id">) => void
  upcoming: UpcomingItem[]
  removeUpcoming: (id: string) => void
  loading: boolean
}

const MarketingContext = createContext<MarketingContextType | undefined>(undefined)

const iconMap: Record<string, LucideIcon> = {
  file: FileText,
  video: Video,
  mail: Mail,
  sparkles: Sparkles,
}

export function MarketingProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<SocialEvent[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadMarketingData = async () => {
      try {
        const response = await getDashboardData()
        if (!isMounted) return

        const marketing = response.overview?.marketing
        if (marketing) {
          setEvents(
            marketing.events.map((event) => ({
              id: event.id,
              day: event.day,
              label: event.label,
              color: event.color,
            }))
          )
          setUpcoming(
            marketing.upcoming.map((item) => ({
              id: item.id,
              title: item.title,
              type: item.type,
              time: item.time,
              icon: iconMap[item.iconName] || FileText,
              iconBg: item.iconBg,
              iconColor: item.iconColor,
            }))
          )
        }
      } catch (error) {
        console.error("Failed to load marketing data", error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadMarketingData()

    return () => {
      isMounted = false
    }
  }, [])

  const addEvent = (event: Omit<SocialEvent, "id">) => {
    setEvents((prev) => [...prev, { ...event, id: Math.random().toString() }])
  }

  const removeUpcoming = (id: string) => {
    setUpcoming((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <MarketingContext.Provider value={{ events, addEvent, upcoming, removeUpcoming, loading }}>
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
