import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  CheckCircle2,
  FileText,
  Lightbulb,
  Menu,
  Target,
} from "lucide-react"
import { ThemeToggle } from "@/src/components/shared/ThemeToggle"

const features = [
  {
    icon: Bot,
    title: "AI business interview",
    description: "Turn a rough idea into a focused brief with questions shaped around your market, resources, and goals.",
  },
  {
    icon: FileText,
    title: "Business plans that move",
    description: "Generate a practical plan with market context, positioning, financial assumptions, and next steps.",
  },
  {
    icon: BarChart3,
    title: "A clearer growth path",
    description: "Keep priorities visible with tailored recommendations, milestones, and a simple business-health view.",
  },
]

const steps = [
  ["01", "Share your ambition", "Tell us what you are building, where you operate, and what success looks like."],
  ["02", "Build with your copilot", "Answer focused questions and get decisions, documents, and strategy in context."],
  ["03", "Take the next step", "Turn your plan into clear actions you can prioritise, track, and improve."],
]

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8fbf8] dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 font-sans">
      <section className="relative isolate overflow-hidden bg-[#082b22] text-white">
        <div className="absolute inset-0 -z-10 opacity-70 [background-image:radial-gradient(circle_at_20%_0%,rgba(74,222,128,.24),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(59,130,246,.2),transparent_25%)]" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <header className="flex h-20 items-center justify-between">
            <Link href="/" className="flex items-center gap-1 font-semibold tracking-tight transition-transform hover:scale-[1.02]" aria-label="Startup Copilot Africa home">
              <Image src="/logo.png" alt="Startup Copilot Africa" width={40} height={40} className="size-16 rounded-xl object-contain" />
              <span>Startup Copilot <span className="text-green-300 font-bold">Africa</span></span>
            </Link>
            <nav className="hidden items-center gap-7 text-sm text-green-50/80 md:flex" aria-label="Main navigation">
              <a href="#how-it-works" className="relative py-1 transition-colors hover:text-white after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-green-300 after:transition-all hover:after:w-full">How it works</a>
              <a href="#features" className="relative py-1 transition-colors hover:text-white after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-green-300 after:transition-all hover:after:w-full">Features</a>
              <Link href="/sign-in" className="relative py-1 transition-colors hover:text-white after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-green-300 after:transition-all hover:after:w-full">Sign in</Link>
              <Link href="/sign-up" className="rounded-full bg-white px-5 py-2 font-semibold text-[#0b3b2f] shadow-md transition-all duration-300 hover:bg-green-100 hover:shadow-lg hover:shadow-white/10 hover:scale-[1.04]">Get started</Link>
              <ThemeToggle />
            </nav>
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <Link href="/sign-up" className="flex size-10 items-center justify-center rounded-lg border border-white/20 transition-all hover:bg-white/10" aria-label="Get started"><Menu className="size-5" /></Link>
            </div>
          </header>

          <div className="grid items-center gap-14 pb-24 pt-16 lg:grid-cols-[1.05fr_.95fr] lg:pb-28 lg:pt-20">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-300/20 bg-white/10 px-3.5 py-1.5 text-sm text-green-100 backdrop-blur-sm">
                <BadgeCheck className="size-4 text-green-300" /> Built for the realities of African founders
              </div>
              <h1 className="text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">Your AI co-founder for building businesses in Africa.</h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-green-50/75">From the first spark to a focused plan, Startup Copilot helps you make sharper decisions, understand your market, and keep moving with confidence.</p>
              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <Link href="/sign-up" className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-green-400 px-6 font-semibold text-[#063126] shadow-md transition-all duration-300 hover:bg-green-300 hover:shadow-lg hover:shadow-green-400/20 hover:scale-[1.02]">
                  Start building for free 
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <a href="#how-it-works" className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 px-6 font-semibold text-white transition-all duration-300 hover:bg-white/10 hover:border-white/40">See how it works</a>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm text-green-100/65"><CheckCircle2 className="size-4 text-green-300" /> Start with your idea. No business plan required.</p>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <div className="absolute -inset-5 rounded-[2rem] bg-green-400/20 blur-3xl" />
              <div className="relative rounded-[1.75rem] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/25 backdrop-blur-sm transition-transform duration-500 hover:scale-[1.01]">
                <Image src="/hero-dashboard.jpg" alt="Startup Copilot dashboard preview" width={1376} height={768} priority className="h-auto w-full rounded-2xl" />
              </div>
              <div className="absolute -bottom-6 -left-4 rounded-2xl border border-green-100/20 bg-[#103c30] p-4 shadow-2xl shadow-black/30 transition-transform duration-300 hover:scale-105 sm:-left-8">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-green-400/15 text-green-300">
                    <Lightbulb className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs text-green-100/60 font-medium">Your next priority</p>
                    <p className="text-sm font-semibold text-white">Validate your market</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700 dark:text-green-400">Built for momentum</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">Everything you need to turn an idea into informed action.</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article key={title} className="group rounded-3xl border border-green-100 bg-card p-7 shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(8,43,34,0.05)] hover:border-green-200 dark:border-green-900/40 dark:hover:border-green-700">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-green-100 text-green-800 transition-all duration-300 group-hover:bg-[#082b22] group-hover:text-green-300 dark:bg-green-950/50 dark:text-green-300">
                <Icon className="size-5 transition-transform duration-500 group-hover:scale-110" />
              </span>
              <h3 className="mt-6 text-lg font-semibold text-zinc-900 dark:text-zinc-50 group-hover:text-green-950 dark:group-hover:text-green-300 transition-colors duration-300">{title}</h3>
              <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-400">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-green-100 bg-[#eaf5ee] dark:border-green-900/40 dark:bg-green-950/20">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-green-700 dark:text-green-400">A practical process</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">Less guessing. More progress.</h2>
            </div>
            <p className="max-w-sm leading-7 text-zinc-600 dark:text-zinc-400">A guided workspace that meets you where you are and helps you identify the next best move.</p>
          </div>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map(([number, title, description]) => (
              <article key={number} className="group border-t-2 border-green-700/30 pt-5 transition-all duration-500 hover:border-green-700">
                <span className="text-sm font-bold text-green-700/70 transition-colors duration-300 group-hover:text-green-700">{number}</span>
                <h3 className="mt-5 text-xl font-semibold text-zinc-900 dark:text-zinc-50 transition-colors duration-300 group-hover:text-green-900 dark:group-hover:text-green-300">{title}</h3>
                <p className="mt-3 leading-7 text-zinc-600 dark:text-zinc-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="relative overflow-hidden grid gap-10 rounded-[2.5rem] bg-[#103c30] px-8 py-14 text-white sm:px-12 lg:grid-cols-[1fr_auto] lg:items-center lg:px-16 shadow-xl">
          <div className="absolute inset-0 -z-10 opacity-30 [background-image:radial-gradient(circle_at_80%_90%,rgba(74,222,128,.15),transparent_40%)]" />
          <div>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-green-400 text-[#103c30] shadow-md shadow-green-950/20">
              <Target className="size-5" />
            </div>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">Build the business only you can build.</h2>
            <p className="mt-4 max-w-xl text-lg leading-8 text-green-50/75">Bring your ambition. We&apos;ll bring a clearer way forward.</p>
          </div>
          <Link href="/sign-up" className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-green-400 px-6 font-semibold text-[#063126] shadow-lg shadow-[#063126]/10 transition-all duration-300 hover:bg-green-300 hover:shadow-[#063126]/20 hover:scale-[1.02]">
            Create your workspace 
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-green-100 bg-[#fbfdfb] px-6 py-10 text-sm text-zinc-500 dark:border-green-900/40 dark:bg-zinc-950 dark:text-zinc-400">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row items-center">
          <p>© {new Date().getFullYear()} Startup Copilot Africa. All rights reserved.</p>
          <div className="flex flex-wrap gap-6 items-center">
            <Link href="/terms" className="hover:text-green-800 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-green-800 transition-colors">Privacy Policy</Link>
            <Link href="/sign-in" className="hover:text-green-800 transition-colors">Sign in</Link>
            <Link href="/sign-up" className="hover:text-green-800 transition-colors font-medium">Get started</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
