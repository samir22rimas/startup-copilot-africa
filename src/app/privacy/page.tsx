import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Lock, Database, Cpu, Eye, ShieldCheck, Mail, Key } from "lucide-react"
import { ThemeToggle } from "@/src/components/shared/ThemeToggle"

export const metadata = {
  title: "Privacy Policy | Anza",
  description: "Privacy Policy and Data Protection standards for Anza.",
}

export default function PrivacyPage() {
  const lastUpdated = "September 7, 2026"

  const sections = [
    {
      id: "collection",
      icon: Eye,
      title: "1. Information We Collect",
      content: `We collect minimal personal and technical information to deliver our AI business copilot and founder tools:
      • Account & Identity Data: When you sign up or sign in using email or Google OAuth, we collect your full name, email address, and profile picture avatar.
      • Startup & Workspace Inputs: Data you input into AI business interviews, pitch decks, market research briefs, financial budget estimations, and strategic prompt responses.
      • Technical Telemetry: IP address, browser metadata, session cookies, and interaction diagnostics to ensure platform security and optimal performance.`,
    },
    {
      id: "google-oauth",
      icon: Key,
      title: "2. Google User Data Policy & Usage",
      content: `When you authenticate using Google Sign-In:
      • Data Received: We access only your basic Google public profile information (name, email address, and profile avatar URL).
      • Purpose of Use: We use this data exclusively to authenticate your identity, establish your secure workspace session, and personalize your founder dashboard.
      • No Data Sales or Misuse: We do not sell, rent, or transfer your Google user data to third parties. We do not use your Google user data for advertising or marketing profiling.
      • LLM Privacy Guarantee: Data retrieved from your Google account is never used to train global AI/LLM models.`,
    },
    {
      id: "ai-processing",
      icon: Cpu,
      title: "3. AI Processing & Founder Confidentiality",
      content: `Your business ideas, financials, and strategies represent your competitive edge.
      • We do NOT sell your startup data or business plans to third parties.
      • Inputs submitted to our AI co-founder features are processed securely using enterprise API endpoints (OpenAI API) under strict non-training, zero-data-retention privacy policies.
      • Data generated in your workspace is isolated and accessible only by your authenticated account.`,
    },
    {
      id: "data-storage",
      icon: Database,
      title: "4. Data Storage & Security",
      content: `• Database Security: Account credentials, sessions, and database entries are stored securely in PostgreSQL (Supabase) enforced with strict Row Level Security (RLS) policies.
      • Encryption: All data in transit is encrypted using industry-standard TLS 1.3/SSL protocols, and stored data is protected with AES-256 encryption at rest.`,
    },
    {
      id: "cookies",
      icon: Lock,
      title: "5. Cookies & Session Management",
      content: `We use essential HTTP-only cookies managed by Supabase SSR to authenticate your user session and maintain your signed-in status across pages. We do not use intrusive cross-site tracking cookies.`,
    },
    {
      id: "rights",
      icon: ShieldCheck,
      title: "6. Your Rights & Account Deletion",
      content: `As a founder on Anza, you retain full control over your data:
      • Data Access & Export: You may access and export your generated business plans and strategy documents at any time.
      • Complete Deletion: You can request the total deletion of your user profile, Google authentication links, and all associated startup workspace data by emailing privacy@startupcopilot.africa.`,
    },
    {
      id: "contact",
      icon: Mail,
      title: "7. Contact Us",
      content: `If you have any questions regarding this Privacy Policy or Google User Data usage, please reach out to our privacy compliance team:
      
      Email: privacy@startupcopilot.africa
      Domain: https://startup-copilot-africa.vercel.app`,
    },
  ]

  return (
    <main className="min-h-screen bg-[#f8fbf8] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans">
      {/* Top Header */}
      <header className="border-b border-green-900/10 bg-[#082b22] text-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight transition-transform hover:scale-[1.01]" aria-label="Anza home">
            <Image src="/logo.png" alt="Anza" width={40} height={40} className="size-10 rounded-xl object-contain" />
            <span className="text-lg"><span className="text-green-300 font-bold">A</span>nza</span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-green-100 backdrop-blur-sm transition-all hover:bg-white/20">
              <ArrowLeft className="size-3.5" /><span className="max-sm:hidden">
                Back to Home
                </span> 
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-[#082b22] py-16 text-white border-b border-green-400/20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-green-300/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-green-300 backdrop-blur-sm">
            Data Protection & Privacy
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-3 text-base text-green-100/80">
            Learn how we protect your founder data, startup ideas, and Google OAuth account privacy.
          </p>
          <p className="mt-2 text-xs text-green-200/60 font-medium">
            Last Updated: {lastUpdated}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="space-y-8">
          {sections.map(({ id, icon: Icon, title, content }) => (
            <article key={id} id={id} className="rounded-3xl border border-green-100 bg-card p-8 shadow-sm transition-all duration-300 hover:border-green-200 hover:shadow-md dark:border-green-900/40 dark:hover:border-green-700">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300">
                  <Icon className="size-5" />
                </span>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{title}</h2>
              </div>
              <div className="mt-4 space-y-3 leading-7 text-zinc-600 dark:text-zinc-400 text-sm whitespace-pre-line">
                {content}
              </div>
            </article>
          ))}
        </div>

        {/* Footer Link */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-green-100 pt-8 text-xs text-zinc-500 dark:border-green-900/40 dark:text-zinc-400">
          <p>© {new Date().getFullYear()} Anza. All rights reserved.</p>
          <div className="flex items-center gap-4 font-semibold text-green-800 dark:text-green-400">
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <span>•</span>
            <Link href="/sign-in" className="hover:underline">Sign In</Link>
            <span>•</span>
            <Link href="/sign-up" className="hover:underline">Get Started</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
