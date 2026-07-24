"use client"

import { getDashboardData } from "@/src/app/actions/dashboard"
import { generateMarketingContent } from "@/src/features/ai/actions"
import { RefreshCw, Sparkles } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { useMarketing } from "./MarketingContext"

export function AiGenerator() {
  const { addEvent } = useMarketing()
  
  const [prompt, setPrompt] = React.useState("")
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [content, setContent] = React.useState("")

  React.useEffect(() => {
    const loadPreview = async () => {
      try {
        const response = await getDashboardData()
        const marketing = response.overview?.marketing
        if (marketing?.generatedContent) {
          setContent(marketing.generatedContent)
        }
      } catch (error) {
        console.error("Failed to load marketing preview", error)
      }
    }

    loadPreview()
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    
    const result = await generateMarketingContent({ prompt, platform: "linkedin" })

    if (result.success) {
      setContent(result.content)
      toast.success("AI Content generated successfully")
    } else {
      toast.error(result.error)
    }
    setIsGenerating(false)
  }

  const handleSchedule = () => {
    const nextDay = new Date().getDate() + 2
    addEvent({
      day: nextDay,
      label: "LinkedIn draft",
      color: "border-blue-500 text-blue-700 bg-blue-50"
    })
    toast.success("Post scheduled for your planner")
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col h-[400px]">
      
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-green-600 dark:text-green-500" />
        <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">AI Content Generator</h3>
      </div>

      <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
        
        <div className="space-y-1.5 shrink-0">
          <label className="text-xs font-medium text-zinc-500">Topic or Prompt</label>
          <div className="w-full h-10 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center bg-[#fafafa] dark:bg-zinc-950/50 focus-within:ring-2 focus-within:ring-green-500 transition-all">
            <input 
              className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-900 dark:text-zinc-50"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            {isGenerating && <RefreshCw className="w-4 h-4 text-zinc-400 animate-spin" />}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-900 shadow-sm relative">
          {isGenerating ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-[2px]">
              <Sparkles className="w-6 h-6 text-green-500 animate-pulse" />
            </div>
          ) : null}
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span className="text-xs font-bold text-green-700 dark:text-green-500">Preview (LinkedIn)</span>
          </div>
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {content || "Enter a topic to generate content from your saved startup context."}
          </p>
        </div>

        <div className="flex gap-2 shrink-0 pt-2">
          <button 
            onClick={handleSchedule}
            disabled={isGenerating}
            className="flex-1 flex items-center justify-center gap-2 h-11 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-xl shadow-md shadow-green-900/10 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Schedule Post
          </button>
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-11 h-11 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

    </div>
  )
}

