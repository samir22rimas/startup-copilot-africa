"use client"

import {
  BarChart3,
  Bot,
  Briefcase,
  Check,
  ChevronDown,
  ChevronsUpDown,
  CircleDollarSign,
  ClipboardCheck,
  Compass,
  FileText,
  FolderOpen,
  HelpCircle,
  KanbanSquare,
  LayoutDashboard,
  LayoutGrid,
  Lightbulb,
  Megaphone,
  Plus,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"

import type { StartupStage } from "@/src/lib/database.types"
import { useI18n } from "@/src/lib/i18n/client"
import {
  NAV_GROUPS,
  PRIMARY_NAV,
  isActivePath,
  suggestedGroupForStage,
  type NavGroupKey,
  type NavItem,
  type NavKey,
} from "@/src/lib/navigation"
import { cn } from "@/src/lib/utils"

const ICONS: Record<NavKey, LucideIcon> = {
  overview: LayoutDashboard,
  copilot: Bot,
  ideas: Lightbulb,
  research: Search,
  validation: ClipboardCheck,
  model: LayoutGrid,
  plan: FileText,
  finance: Wallet,
  marketing: Megaphone,
  projects: KanbanSquare,
  documents: FolderOpen,
  opportunities: Compass,
  funding: CircleDollarSign,
  analytics: BarChart3,
  legal: Scale,
  businesses: Briefcase,
  team: Users,
  settings: Settings,
  guide: HelpCircle,
}

const OPEN_GROUPS_KEY = "anza.nav.groups"

export interface SidebarProps {
  startups: Array<{ id: string; name: string; primaryColor?: string | null }>
  activeStartupId?: string | null
  stage?: StartupStage | null
  isAdmin?: boolean
}

function NavLink({ item, pathname, onNavigate }: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const { t } = useI18n()
  const Icon = ICONS[item.key]
  const active = isActivePath(pathname, item.href)
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "opacity-80")} aria-hidden="true" />
      <span className="truncate">{t.nav[item.key]}</span>
    </Link>
  )
}

function BusinessSwitcher({ startups, activeStartupId, onNavigate }: SidebarProps & { onNavigate?: () => void }) {
  const { t } = useI18n()
  const router = useRouter()
  const active = startups.find((s) => s.id === activeStartupId) ?? startups[0] ?? null
  const [open, setOpen] = React.useState(false)
  const [switchingTo, setSwitchingTo] = React.useState<string | null>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  async function select(startup: { id: string; name: string }) {
    setOpen(false)
    if (startup.id === active?.id) return
    setSwitchingTo(startup.name)
    try {
      const { setActiveStartup } = await import("@/src/app/actions/startup-context")
      const result = await setActiveStartup(startup.id)
      if (result.success) {
        onNavigate?.()
        router.refresh()
      }
    } finally {
      setSwitchingTo(null)
    }
  }

  const label = switchingTo ? t.nav.switching : (active?.name ?? t.nav.noBusiness)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.nav.switchBusiness}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-full items-center gap-2.5 rounded-lg border border-border bg-background px-2.5 text-left transition hover:bg-muted"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold uppercase text-primary-foreground">
          {(active?.name ?? "A").charAt(0)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{label}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t.nav.businessesHeading}
          className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg"
        >
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t.nav.businessesHeading}
          </p>
          <div className="max-h-56 overflow-y-auto">
            {startups.map((startup) => (
              <button
                key={startup.id}
                type="button"
                role="option"
                aria-selected={startup.id === active?.id}
                onClick={() => select(startup)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-foreground transition hover:bg-muted"
              >
                <span className="flex items-center gap-2 truncate">
                  {startup.primaryColor ? (
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: startup.primaryColor }}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="truncate">{startup.name}</span>
                </span>
                {startup.id === active?.id && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
              </button>
            ))}
          </div>
          <div className="mt-1 border-t border-border pt-1">
            <Link
              href="/dashboard/new"
              onClick={() => {
                setOpen(false)
                onNavigate?.()
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary transition hover:bg-muted"
            >
              <Plus className="size-4" aria-hidden="true" /> {t.nav.newBusiness}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

/** Navigation body, shared by the desktop sidebar and the mobile drawer. */
export function SidebarContent({ onNavigate, ...props }: SidebarProps & { onNavigate?: () => void }) {
  const { t } = useI18n()
  const pathname = usePathname()
  const suggested = suggestedGroupForStage(props.stage)
  const activeGroup = NAV_GROUPS.find((group) => group.items.some((item) => isActivePath(pathname, item.href)))?.key

  // Which groups the person has opened or closed by hand; everything else
  // follows the defaults (suggested group + the group of the current page).
  const [overrides, setOverrides] = React.useState<Partial<Record<NavGroupKey, boolean>>>({})

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(OPEN_GROUPS_KEY)
      if (saved) setOverrides(JSON.parse(saved))
    } catch {
      // Preferences are optional.
    }
  }, [])

  function isOpen(key: NavGroupKey) {
    if (key === activeGroup) return true
    return overrides[key] ?? (key === suggested || key === "groupWorkspace")
  }

  function toggle(key: NavGroupKey) {
    setOverrides((current) => {
      const next = { ...current, [key]: !isOpen(key) }
      try {
        window.localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next))
      } catch {
        // Preferences are optional.
      }
      return next
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 p-3">
        <BusinessSwitcher {...props} onNavigate={onNavigate} />
        <nav aria-label={t.nav.overview} className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.key} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </nav>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {NAV_GROUPS.map((group) => {
          const open = isOpen(group.key)
          const panelId = `nav-${group.key}`
          return (
            <div key={group.key}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(group.key)}
                className="flex h-7 w-full items-center justify-between rounded-md px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition hover:text-foreground"
              >
                <span className="flex items-center gap-1.5">
                  {t.nav[group.key]}
                  {group.key === suggested && (
                    <span className="size-1.5 rounded-full bg-amber-500" title={t.nav.suggestedForStage} />
                  )}
                </span>
                <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} aria-hidden="true" />
              </button>
              {open && (
                <div id={panelId} className="mb-2 mt-0.5 space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink key={item.key} item={item} pathname={pathname} onNavigate={onNavigate} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {props.isAdmin && (
        <div className="border-t border-border p-3">
          <Link
            href="/admin"
            onClick={onNavigate}
            className="flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" /> {t.nav.admin}
          </Link>
        </div>
      )}
    </div>
  )
}

/** Desktop sidebar. On small screens the same content lives in <MobileSidebar />. */
export function Sidebar(props: SidebarProps) {
  return (
    <aside className="hidden h-full w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
      <SidebarContent {...props} />
    </aside>
  )
}

export function MobileSidebar({ open, onClose, ...props }: SidebarProps & { open: boolean; onClose: () => void }) {
  const { t } = useI18n()

  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.nav.openMenu}
        className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col border-r border-sidebar-border bg-sidebar shadow-2xl"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <span className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <Image src="/logo.png" alt="" width={28} height={28} className="size-7 rounded-md object-contain" />
            Anza
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.nav.closeMenu}
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <SidebarContent {...props} onNavigate={onClose} />
        </div>
      </div>
    </div>
  )
}
