"use client"

import * as React from "react"
import { ThemeToggle } from "@/src/components/shared/ThemeToggle"

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-zinc-950 font-sans">
      {/* Left Pane - Dark Section */}
      <div className="hidden lg:flex w-1/2 bg-[#101c2e] flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(circle_at_20%_0%,rgba(74,222,128,.12),transparent_40%),radial-gradient(circle_at_85%_18%,rgba(59,130,246,.12),transparent_35%)]" />
        
        {/* Header */}
        <div className="relative z-10 flex-1 flex flex-col justify-between">
          <div>
            <div className="font-bold text-green-400 text-lg tracking-tight mb-20 transition-transform hover:scale-[1.01]">
              Startup Copilot Africa
            </div>
            
            <h1 className="text-5xl font-extrabold leading-[1.15] mb-12 max-w-lg tracking-tight">
              Empowering the next generation of African founders.
            </h1>
          </div>

          {/* Testimonial Card */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-lg backdrop-blur-sm shadow-xl transition-all duration-500 hover:border-white/20 hover:bg-white/10 hover:scale-[1.01]">
            <p className="text-zinc-300 italic mb-6 leading-relaxed text-[15px]">
              &ldquo;The platform didn&apos;t just provide tools; it provided a roadmap. Within six months, we successfully closed our pre-seed round with a level of confidence we never thought possible.&rdquo;
            </p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500 overflow-hidden ring-2 ring-green-500/30 shrink-0 shadow-md">
                {/* Placeholder Avatar */}
                <svg className="w-full h-full text-white/50" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-sm">Kwame Osei</div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mt-1">FOUNDER, AGRISTREAM NIGERIA</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Logos */}
        <div className="relative z-10 flex items-center gap-10 mt-12 opacity-60 grayscale transition-opacity hover:opacity-80 duration-300">
          <span className="font-extrabold tracking-widest text-sm uppercase">Techstars</span>
          <span className="font-extrabold tracking-widest text-sm uppercase">Y-Combinator</span>
          <span className="font-extrabold tracking-widest text-sm uppercase">Africa VC</span>
        </div>
      </div>

      {/* Right Pane - Form Section */}
      <div className="flex-1 relative flex flex-col justify-center px-6 sm:px-12 lg:px-24">
        <ThemeToggle className="absolute right-6 top-6 sm:right-12 lg:right-16" />
        {children}
      </div>
    </div>
  )
}
