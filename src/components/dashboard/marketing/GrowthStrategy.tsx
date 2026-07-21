"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, ChevronUp } from "lucide-react"
import * as React from "react"
import { useMarketing } from "./MarketingContext"

export function GrowthStrategy() {
  const { loading } = useMarketing()
  const [isExpanded, setIsExpanded] = React.useState(false)

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden transition-all duration-300">
      
      {/* Lightbulb blur background */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-100 dark:bg-green-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-6">
        <svg className="w-5 h-5 text-green-600 dark:text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">Growth Strategy</h3>
      </div>

      <div className="space-y-6">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading recommendations from your latest startup records...</p>
        ) : (
          <>
            <div className="group cursor-pointer">
              <h4 className="text-sm font-bold text-green-700 dark:text-green-500 group-hover:text-green-800 transition-colors">
                Latest recommendation
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mt-2">
                Your current startup context is being used to shape the next release and content push.
              </p>
            </div>

            <div className="group cursor-pointer">
              <h4 className="text-sm font-bold text-green-700 dark:text-green-500 group-hover:text-green-800 transition-colors">
                Content direction
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mt-2">
                The dashboard pulls insights and documents from your database so this section reflects your live progress.
              </p>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-4 space-y-4">
                    <div className="group cursor-pointer">
                      <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 transition-colors">
                        Database-backed insight
                      </h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mt-2">
                        When you add documents or AI insights, this card updates automatically from the stored records.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-bold text-green-700 dark:text-green-500 hover:text-green-800 dark:hover:text-green-400 transition-colors"
        >
          {isExpanded ? (
            <>Close report <ChevronUp className="w-3 h-3" /></>
          ) : (
            <>View full report <ArrowRight className="w-3 h-3" /></>
          )}
        </button>
      </div>
    </div>
  )
}

