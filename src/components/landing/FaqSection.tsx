"use client"

import * as React from "react"
import { ChevronDown, HelpCircle } from "lucide-react"

interface FaqItem {
  question: string
  answer: string
}

const faqs: FaqItem[] = [
  {
    question: "What is Anza?",
    answer:
      "Anza is an AI-powered entrepreneurial platform and operating system designed specifically for African founders. More than just a chatbot, Anza serves as your 24/7 co-founder, guiding you through discovering business ideas, validating market demand, calculating financial runways, writing investor-ready business plans, and executing weekly milestones.",
  },
  {
    question: "Who can use Anza?",
    answer:
      "Anza is built for anyone building or growing a business on the African continent. This includes university students with innovative project concepts, first-time founders navigating startup uncertainty, growing early-stage startups preparing for investment, small business owners looking to optimize finances, and startup accelerator cohorts.",
  },
  {
    question: "Is Anza suitable for first-time entrepreneurs?",
    answer:
      "Yes, absolutely. Anza was built from the ground up to eliminate business jargon and remove decision paralysis. You don't need prior business school training or financial background. The AI co-founder conducts friendly, structured discovery sessions to help you think through customer needs, pricing, and next steps in plain language.",
  },
  {
    question: "Can I manage multiple businesses?",
    answer:
      "Yes. Anza allows you to switch between multiple business workspaces from your dashboard. Each business keeps its own independent market research, business model canvas, financial projections, team tasks, and health scores.",
  },
  {
    question: "Does Anza support African markets and local currencies?",
    answer:
      "Yes. Unlike generic global software, Anza is calibrated for 54 African economies. It natively supports African currencies (KES, NGN, ZAR, GHS, RWF, EGP, and USD) and understands local commerce mechanisms like Mobile Money (M-Pesa, MTN MoMo, Airtel Money), Paystack, Flutterwave, and informal retail dynamics.",
  },
  {
    question: "Can Anza generate a complete business plan?",
    answer:
      "Yes. Anza transforms your validated inputs and financial assumptions into an institutional-grade, multi-section business plan. It covers executive summaries, market sizing (TAM/SAM/SOM), competitive analysis, go-to-market strategies, unit economics, and operational milestones ready for bank loans, grants, and angel investors.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. During our early access launch, Anza is completely free to use. You can sign up without a credit card and immediately access the AI Copilot, Idea Discovery, Business Model Canvas builder, financial calculators, and milestone management tools.",
  },
  {
    question: "Can I collaborate with my team?",
    answer:
      "Yes. You can invite co-founders, team members, and mentors to your venture workspace. Assigned teammates can view shared milestones, update sprint tasks, and review strategic documents together in real time.",
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0)

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="py-20 sm:py-28 bg-background relative">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-950/40 dark:text-emerald-300">
            <HelpCircle className="size-3.5" />
            Frequently Asked Questions
          </div>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Everything you need to know about Anza.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
            Have questions about how Anza works, market compatibility, or getting started?
            Here are clear answers for founders.
          </p>
        </div>

        {/* Accordion List */}
        <div className="mt-14 divide-y divide-border rounded-2xl border border-border bg-card shadow-xs">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div key={faq.question} className="transition-colors">
                <button
                  type="button"
                  onClick={() => toggleAccordion(index)}
                  className="flex w-full items-center justify-between gap-4 p-5 sm:p-6 text-left transition-colors hover:bg-muted/40"
                  aria-expanded={isOpen}
                >
                  <span className="text-base sm:text-lg font-semibold text-foreground">
                    {faq.question}
                  </span>
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                    }`}
                  >
                    <ChevronDown className="size-4" />
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 pt-1 text-sm sm:text-base text-muted-foreground leading-relaxed animate-in fade-in-50 duration-200">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Help Note */}
        <div className="mt-10 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Still have questions?{" "}
            <a
              href="/sign-up"
              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Sign up free
            </a>{" "}
            and ask the Anza Copilot directly, or check our startup guides.
          </p>
        </div>
      </div>
    </section>
  )
}

