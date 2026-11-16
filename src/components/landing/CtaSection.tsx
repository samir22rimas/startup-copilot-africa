"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react"

export function CtaSection() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-3xl bg-[#07251d] px-6 py-16 sm:px-12 sm:py-20 lg:px-20 text-center shadow-2xl text-white">
          {/* Subtle Ambient Radial Lighting */}
          <div
            className="absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.35),transparent_60%)]"
            aria-hidden="true"
          />

          {/* Micro pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-sm">
            <Sparkles className="size-3.5 text-emerald-400" />
            <span>Ready to turn your ambition into action?</span>
          </div>

          {/* Big Bold Headline */}
          <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white leading-tight">
            Your idea is the beginning.{" "}
            <span className="text-emerald-400">Let&apos;s build what comes next.</span>
          </h2>

          {/* Supporting Text */}
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-emerald-100/80 leading-relaxed">
            Start turning your ambition into something real with an AI co-founder that helps you think, plan and execute.
          </p>

          {/* Primary CTA Button */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="group inline-flex h-13 items-center justify-center gap-2.5 rounded-xl bg-emerald-400 px-8 text-base font-bold text-[#062920] shadow-xl shadow-emerald-950/30 transition-all duration-300 hover:bg-emerald-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Start Building for Free</span>
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Secondary reassurance text */}
          <p className="mt-6 text-xs sm:text-sm text-emerald-200/70 font-medium">
            No experience required. Just bring your ambition.
          </p>

          {/* Quick trust highlights */}
          <div className="mt-8 pt-8 border-t border-emerald-400/15 flex flex-wrap items-center justify-center gap-6 text-xs text-emerald-200/60">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span>Instant free setup</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span>No credit card needed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span>Tailored to African markets</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

