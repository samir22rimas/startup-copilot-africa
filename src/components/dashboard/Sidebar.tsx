"use client"

import { cn } from "@/src/lib/utils"
import { Check, ChevronDown, HelpCircle, Home, Megaphone, Settings, Zap } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as React from "react"

const projects = ["Project Alpha", "Project Beta", "Startup Copilot"]

const navItems = [
  { icon: Home, label: "Overview", href: "/dashboard" },
  { icon: Megaphone, label: "Marketing", href: "/dashboard/marketing" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const [activeProject, setActiveProject] = React.useState(projects[0])
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = React.useState(false)

  return (
    <aside className="w-64 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between hidden md:flex">
      
      <div className="p-4 space-y-6">
        
        {/* Project Selector */}
        <div className="relative">
          <button 
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            className="w-full flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-green-600 flex items-center justify-center text-white font-bold text-xs">
                {activeProject.charAt(0)}
              </div>
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 truncate">{activeProject}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          </button>

          {isProjectDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsProjectDropdownOpen(false)} />
              <div className="absolute left-0 right-0 top-14 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden py-1">
                {projects.map(project => (
                  <button 
                    key={project}
                    onClick={() => {
                      setActiveProject(project)
                      setIsProjectDropdownOpen(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  >
                    {project}
                    {activeProject === project && <Check className="w-4 h-4 text-green-600" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          <div className="text-xs font-bold text-zinc-400 dark:text-zinc-500 mb-4 px-3 uppercase tracking-wider">
            Menu
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group",
                  isActive 
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 shadow-sm shadow-green-700/5" 
                    : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-50 hover:translate-x-1"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-green-600 dark:text-green-400" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300")} />
                {item.label}
              </Link>
            )
          })}
        </nav>

      </div>

      {/* Upgrade to Pro */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-4 text-white shadow-lg shadow-green-900/20 relative overflow-hidden group transition-all duration-300 hover:shadow-xl hover:shadow-green-900/25 hover:scale-[1.02]">
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

        <button className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 mt-4 px-2 transition-colors duration-300">
          <HelpCircle className="w-4 h-4" /> Help & Support
        </button>
      </div>
      
    </aside>
  )
}
