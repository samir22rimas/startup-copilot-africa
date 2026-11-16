"use client"

import { CalendarPlus, Check, Copy, Loader2, Sparkles } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { generateMarketingContent, type ContentType } from "@/src/features/ai/actions"
import {
  Field,
  Panel,
  PanelHeader,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  textareaClass,
} from "@/src/components/ui/page"
import { useI18n } from "@/src/lib/i18n/client"
import { useMarketing } from "./MarketingContext"

const TYPES: ContentType[] = [
  "social_caption",
  "linkedin_post",
  "marketing_email",
  "product_description",
  "ad_copy",
  "campaign_brief",
]

/** Writes marketing copy from the business context; the result can be edited, copied or scheduled. */
export function AiGenerator({ canEdit = true }: { canEdit?: boolean }) {
  const { t } = useI18n()
  const m = t.marketing
  const { addEvent } = useMarketing()

  const [type, setType] = React.useState<ContentType>("social_caption")
  const [prompt, setPrompt] = React.useState("")
  const [content, setContent] = React.useState("")
  const [generating, setGenerating] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault()
    if (!prompt.trim() || generating) return
    setGenerating(true)
    try {
      const result = await generateMarketingContent({ prompt, type })
      if (result.success) setContent(result.content)
      else toast.error(result.error)
    } catch {
      toast.error(t.common.errorGeneric)
    } finally {
      setGenerating(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error(t.common.errorGeneric)
    }
  }

  function handleSchedule() {
    const text = content.trim()
    if (!text) return
    addEvent({
      day: Math.min(28, new Date().getDate() + 2),
      label: text.slice(0, 48) + (text.length > 48 ? "…" : ""),
      color: "border-blue-500 text-blue-700 bg-blue-50",
      content: text,
    })
  }

  return (
    <Panel>
      <PanelHeader title={m.generatorTitle} description={m.generatorBody} />
      <form onSubmit={handleGenerate} className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
          <Field label={m.contentType} htmlFor="content-type">
            <select
              id="content-type"
              value={type}
              onChange={(event) => setType(event.target.value as ContentType)}
              className={inputClass}
            >
              {TYPES.map((key) => (
                <option key={key} value={key}>
                  {m.types[key]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={m.topic} htmlFor="content-topic">
            <input
              id="content-topic"
              value={prompt}
              maxLength={1000}
              disabled={!canEdit}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={m.topicPlaceholder}
              className={inputClass}
            />
          </Field>
        </div>

        <button type="submit" disabled={!canEdit || generating || prompt.trim().length < 3} className={primaryButtonClass}>
          {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {generating ? t.common.generating : t.common.generate}
        </button>

        {content && (
          <div className="space-y-3">
            <textarea
              aria-label={m.result}
              rows={10}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className={textareaClass}
            />
            <p className="text-xs text-muted-foreground">{m.placeholderHint}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleCopy} className={secondaryButtonClass}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? t.common.copied : t.common.copy}
              </button>
              {canEdit && (
                <button type="button" onClick={handleSchedule} className={secondaryButtonClass}>
                  <CalendarPlus className="size-4" /> {m.addToPlanner}
                </button>
              )}
            </div>
          </div>
        )}
      </form>
    </Panel>
  )
}
