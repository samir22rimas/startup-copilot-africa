"use client";

import { cn } from "@/src/lib/utils";
import {
  BarChart3,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileText,
  HelpCircle,
  Home,
  Megaphone,
  Settings,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

const navItems = [
  { icon: Home, label: "Overview", href: "/dashboard" },
  { icon: FileText, label: "Results", href: "/dashboard/results" },
  { icon: Megaphone, label: "Marketing", href: "/dashboard/marketing" },
  { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
  { icon: CircleDollarSign, label: "Funding", href: "/dashboard/funding" },
  { icon: HelpCircle, label: "User Guide", href: "/dashboard/guide" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

export function Sidebar({ projects }: { projects: Array<{ id: string; title: string }> }) {
  const pathname = usePathname();
  const [activeProject, setActiveProject] = React.useState(projects[0]?.title ?? "No project selected");
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] =
    React.useState(false);

  return (
    <aside
      className={cn(
        // Mobile: sticky top bar, no vertical growth, no border-r
        "sticky top-0 z-30 w-full shrink-0 bg-white dark:bg-zinc-950",
        "border-b border-zinc-200 dark:border-zinc-800",
        // Desktop: static full-height left column
        "md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r",
        "flex flex-col",
      )}
    >
      {/* Top row on mobile (project selector + dropdown), stacked normally on desktop */}
      <div className="p-3 md:p-4 md:space-y-6">
        <div className="flex items-center gap-2 md:block">
          {/* Project Selector */}
          <div className="relative flex-1 min-w-0 md:flex-none">
            <button
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="w-full flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2.5 md:p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 shrink-0 rounded-md bg-green-600 flex items-center justify-center text-white font-bold text-xs">
                  {activeProject.charAt(0)}
                </div>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">
                  {activeProject}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 shrink-0 text-zinc-500" />
            </button>

            {isProjectDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProjectDropdownOpen(false)}
                />
                <div className="absolute left-0 right-0 top-12 md:top-14 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden py-1">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setActiveProject(project.title);
                        setIsProjectDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    >
                      {project.title}
                      {activeProject === project.title && (
                        <Check className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Compact help button, mobile only */}
          <Link href="/dashboard/guide" className="md:hidden shrink-0 p-2.5 rounded-xl text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors">
            <HelpCircle className="w-5 h-5" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="mt-3 md:mt-0 space-y-1">
          <div className="hidden md:block text-xs font-bold text-zinc-400 dark:text-zinc-500 mb-3 px-3 uppercase tracking-wider">
            Menu
          </div>

          {/* Mobile: horizontal scroll strip of icon+label pills */}
          <div className="flex md:hidden gap-1 overflow-x-auto pb-1 -mx-3 px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                      : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-50",
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-4 h-4",
                      isActive
                        ? "text-green-600 dark:text-green-400"
                        : "text-zinc-400",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop: full vertical nav */}
          <div className="hidden md:block space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group",
                    isActive
                      ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 shadow-sm shadow-green-700/5"
                      : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-50 hover:translate-x-1",
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                      isActive
                        ? "text-green-600 dark:text-green-400"
                        : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Upgrade to Pro — desktop only; keeps the mobile bar compact */}
      <div className="hidden md:block p-4 mt-auto">
        <div className="bg-linear-to-br from-green-600 to-green-800 rounded-2xl p-2 text-white shadow-lg shadow-green-900/20 relative overflow-hidden group transition-all duration-300 hover:shadow-xl hover:shadow-green-900/25 hover:scale-[1.02]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:opacity-20 transition-opacity duration-300" />

          <div className="flex items-center gap-2 mb-2 relative z-10">
            <Zap className="w-4 h-4 text-green-200 fill-current animate-pulse" />
            <h4 className="font-bold text-sm">Upgrade to Pro</h4>
          </div>
          <p className="text-xs text-green-100/80 mb-4 relative z-10 leading-relaxed">
            Get unlimited AI content and advanced analytics.
          </p>
          <button className="w-full bg-white text-green-800 text-xs font-bold py-2.5 rounded-lg hover:bg-green-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative z-10 shadow-sm">
            Upgrade Now
          </button>
        </div>

        <Link href="/dashboard/guide" className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 mt-4 px-2 transition-colors duration-300">
          <HelpCircle className="w-4 h-4" /> Help & Support
        </Link>
      </div>
    </aside>
  );
}
