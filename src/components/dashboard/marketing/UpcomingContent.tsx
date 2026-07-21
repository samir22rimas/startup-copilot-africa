"use client"

import * as React from "react"
import { useMarketing } from "./MarketingContext"
import { MoreVertical, Check, Trash2 } from "lucide-react"

export function UpcomingContent() {
  const { upcoming, removeUpcoming } = useMarketing()
  const [activeMenu, setActiveMenu] = React.useState<string | null>(null)

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm flex-1 flex flex-col min-h-[250px]">
      <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-6 shrink-0">Upcoming Content</h3>
      
      <div className="space-y-6 flex-1 overflow-y-auto min-h-0 pr-2">
        {upcoming.length === 0 && (
          <div className="flex items-center justify-center h-full text-sm text-zinc-500">
            No upcoming content. You&apos;re all caught up!
          </div>
        )}
        
        {upcoming.map((item) => (
          <div key={item.id} className="flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}>
                <item.icon className={`w-5 h-5 ${item.iconColor}`} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{item.title}</h4>
                <div className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5 mt-0.5">
                  {item.type} <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" /> {item.time}
                </div>
              </div>
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {activeMenu === item.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                  <div className="absolute right-0 top-6 z-20 w-32 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg overflow-hidden py-1">
                    <button 
                      onClick={() => {
                        removeUpcoming(item.id)
                        setActiveMenu(null)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                    >
                      <Check className="w-3.5 h-3.5" /> Complete
                    </button>
                    <button 
                      onClick={() => {
                        removeUpcoming(item.id)
                        setActiveMenu(null)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
