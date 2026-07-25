"use client"

import { X } from "lucide-react"
import * as React from "react"
import { useMarketing, type SocialEvent } from "./MarketingContext"

const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
function getWeekDates() {
  const today = new Date()
  const mondayOffset = (today.getDay() + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - mondayOffset)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return date.getDate()
  })
}

export function SocialPlanner() {
  const { events, removeEvent } = useMarketing()
  const [view, setView] = React.useState<"Week" | "Month">("Week")
  const [selectedEvent, setSelectedEvent] = React.useState<SocialEvent | null>(null)
  const dates = getWeekDates()

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm h-[400px] flex flex-col">
      
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">Social Media Planner</h3>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 mt-0.5">Tracked schedules only</p>
        </div>
        <div className="flex bg-[#f3f6fc] dark:bg-zinc-800 rounded-lg p-1">
          <button 
            onClick={() => setView("Week")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${view === "Week" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"}`}
          >
            Week
          </button>
          <button 
            onClick={() => setView("Month")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${view === "Month" ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"}`}
          >
            Month
          </button>
        </div>
      </div>

      {view === "Month" ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 px-6 text-center">
          Month view is not available yet — week view shows posts you have actually scheduled.
        </div>
      ) : (
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-[#fafafa] dark:bg-zinc-950/50 shrink-0">
          {days.map((day) => (
            <div key={day} className="py-2 text-center text-[10px] font-bold text-zinc-500 border-r border-zinc-200 dark:border-zinc-800 last:border-r-0">
              {day}
            </div>
          ))}
        </div>
        
        {/* Grid */}
        <div className="grid grid-cols-7 flex-1 min-h-0 overflow-y-auto">
          {dates.map((date) => {
            const dayEvents = events.filter((e) => e.day === date)
            return (
              <div key={date} className={`p-2 border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 relative min-h-[120px] ${date === new Date().getDate() ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                <div className={`text-xs font-medium mb-2 ${date === new Date().getDate() ? 'text-green-700 dark:text-green-500 font-bold' : 'text-zinc-700 dark:text-zinc-300'}`}>
                  {date}
                </div>
                
                <div className="space-y-1">
                  {dayEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      className={`w-full text-left text-[9px] font-bold px-1.5 py-1 rounded-md border-l-2 ${event.color} truncate`}
                      title={event.label}
                    >
                      {event.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-green-600">Tracked schedule</p>
                <h4 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{selectedEvent.label}</h4>
              </div>
              <button type="button" onClick={() => setSelectedEvent(null)} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3 rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600 dark:bg-zinc-800/70 dark:text-zinc-300">
              <p><span className="font-semibold text-zinc-900 dark:text-zinc-50">Day:</span> {selectedEvent.day}</p>
              <p><span className="font-semibold text-zinc-900 dark:text-zinc-50">Status:</span> Saved in workspace (not auto-published)</p>
              {selectedEvent.content && (
                <p className="whitespace-pre-wrap text-xs leading-relaxed">{selectedEvent.content}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                removeEvent(selectedEvent.id)
                setSelectedEvent(null)
              }}
              className="mt-4 w-full rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
            >
              Remove from planner
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

