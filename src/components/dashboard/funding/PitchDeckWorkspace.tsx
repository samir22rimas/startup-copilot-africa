"use client"

import { generatePitchDeck, savePitchDeck, type PitchDeck } from "@/src/app/actions/pitch-deck"
import { ArrowLeft, Download, FileText, Loader2, Pencil, Save, Sparkles } from "lucide-react"
import Link from "next/link"
import * as React from "react"

export function PitchDeckWorkspace({ projectId, startupName, initialDeck }: { projectId: string; startupName: string; initialDeck: PitchDeck | null }) {
  const [deck, setDeck] = React.useState(initialDeck)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [editing, setEditing] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const [notice, setNotice] = React.useState("")
  const activeSlide = deck?.slides[activeIndex]

  const generate = () => startTransition(async () => {
    setNotice("")
    const result = await generatePitchDeck(projectId)
    if (result.success) { setDeck(result.deck); setActiveIndex(0); setEditing(false); setNotice("Pitch deck generated and saved.") }
    else setNotice(result.error)
  })

  const save = () => deck && startTransition(async () => {
    setNotice("")
    const result = await savePitchDeck(projectId, deck)
    setNotice(result.success ? "Changes saved." : result.error)
    if (result.success) setEditing(false)
  })

  const updateSlide = (field: "title" | "body", value: string) => {
    if (!deck) return
    setDeck({ ...deck, slides: deck.slides.map((slide, index) => index === activeIndex ? { ...slide, [field]: value } : slide) })
  }

  const download = () => {
    if (!deck) return
    const content = deck.slides.map((slide, index) => `${index + 1}. ${slide.title}\n${slide.body}`).join("\n\n")
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob([`${startupName} pitch deck\n\n${content}`], { type: "text/plain" }))
    link.download = `${startupName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "startup"}-pitch-deck.txt`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return <div className="mx-auto max-w-7xl space-y-6 pb-10">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link href="/dashboard/funding" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="size-3.5" /> Funding workspace</Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">AI Pitch Deck Generator</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create, refine, and save an evidence-led investor story for {startupName}.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {deck && <button onClick={download} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted"><Download className="size-4" /> Export</button>}
        {deck && <button onClick={save} disabled={isPending} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60"><Save className="size-4" /> Save</button>}
        <button onClick={generate} disabled={isPending} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"><Sparkles className="size-4" /> {isPending ? <Loader2 className="size-4 animate-spin" /> : null}{deck ? "Regenerate" : "Generate deck"}</button>
      </div>
    </div>

    {notice && <p role="status" className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground">{notice}</p>}

    {!deck ? <section className="grid min-h-[430px] place-items-center rounded-3xl border border-dashed border-border bg-card p-8 text-center"><div><span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileText className="size-7" /></span><h2 className="mt-5 text-xl font-bold">Turn your project into an investor story</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Generate six editable slides from your project and startup profile. The deck safely identifies facts that still need validation.</p><button onClick={generate} disabled={isPending} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"><Sparkles className="size-4" /> Generate pitch deck</button></div></section> : <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
      <aside className="flex gap-2 overflow-x-auto xl:flex-col xl:overflow-visible">
        {deck.slides.map((slide, index) => <button key={slide.id} onClick={() => { setActiveIndex(index); setEditing(false) }} className={`min-w-40 rounded-2xl border p-3 text-left transition xl:min-w-0 ${activeIndex === index ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}><span className="text-[10px] font-bold tracking-widest">{String(index + 1).padStart(2, "0")}</span><span className="mt-1 block text-sm font-semibold">{slide.title}</span></button>)}
      </aside>
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,var(--primary)_0%,transparent_30%)] opacity-[0.08]" />
        <div className="relative flex min-h-[480px] flex-col justify-between p-7 sm:p-12">
          <div className="flex items-start justify-between gap-4"><span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold tracking-wider text-primary">{activeSlide?.eyebrow}</span><button onClick={() => setEditing(!editing)} className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-primary" aria-label="Edit slide"><Pencil className="size-4" /></button></div>
          <div className="max-w-2xl py-10">{editing ? <><input value={activeSlide?.title || ""} onChange={(event) => updateSlide("title", event.target.value)} className="w-full border-b border-border bg-transparent pb-2 text-3xl font-bold tracking-tight outline-none focus:border-primary" /><textarea value={activeSlide?.body || ""} onChange={(event) => updateSlide("body", event.target.value)} className="mt-6 min-h-48 w-full resize-y rounded-xl border border-border bg-background p-4 text-base leading-7 text-muted-foreground outline-none focus:border-primary" /></> : <><h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{activeSlide?.title}</h2><p className="mt-7 whitespace-pre-line text-base leading-8 text-muted-foreground">{activeSlide?.body}</p></>}</div>
          <div className="flex items-end justify-between border-t border-border pt-5"><div><p className="text-3xl font-bold text-primary">{activeSlide?.metric || String(activeIndex + 1).padStart(2, "0")}</p><p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{activeSlide?.metricLabel || "Deck narrative"}</p></div><p className="text-xs text-muted-foreground">Slide {activeIndex + 1} of {deck.slides.length}</p></div>
        </div>
      </section>
      <aside className="rounded-3xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /><h2 className="font-bold">AI refinement</h2></div><p className="mt-2 text-sm leading-6 text-muted-foreground">Each slide is editable. Keep claims specific, evidence-led, and clear about what still needs validation.</p><div className="mt-6 space-y-3"><div className="rounded-xl bg-primary/10 p-3 text-xs leading-5 text-primary">Tip: lead with the customer problem, then show proof—not assumptions.</div><div className="rounded-xl border border-border p-3 text-xs leading-5 text-muted-foreground">Save writes the current deck to this project so it remains available after refresh.</div></div></aside>
    </div>}
  </div>
}
