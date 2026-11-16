/**
 * The workspace navigation, in one place. Labels come from the dictionary
 * (`t.nav[key]`); icons are resolved in the Sidebar.
 */
import type { StartupStage } from "@/src/lib/database.types"

export type NavKey =
  | "overview"
  | "copilot"
  | "ideas"
  | "research"
  | "validation"
  | "model"
  | "plan"
  | "finance"
  | "marketing"
  | "projects"
  | "documents"
  | "opportunities"
  | "funding"
  | "analytics"
  | "legal"
  | "businesses"
  | "team"
  | "settings"
  | "guide"

export type NavGroupKey = "groupDiscover" | "groupPlan" | "groupRun" | "groupGrow" | "groupWorkspace"

export interface NavItem {
  key: NavKey
  href: string
}

export interface NavGroup {
  key: NavGroupKey
  items: NavItem[]
}

/** Always visible, above the groups. */
export const PRIMARY_NAV: NavItem[] = [
  { key: "overview", href: "/dashboard" },
  { key: "copilot", href: "/dashboard/copilot" },
]

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "groupDiscover",
    items: [
      { key: "ideas", href: "/dashboard/ideas" },
      { key: "research", href: "/dashboard/research" },
      { key: "validation", href: "/dashboard/validation" },
    ],
  },
  {
    key: "groupPlan",
    items: [
      { key: "model", href: "/dashboard/model" },
      { key: "plan", href: "/dashboard/plan" },
      { key: "finance", href: "/dashboard/finance" },
    ],
  },
  {
    key: "groupRun",
    items: [
      { key: "projects", href: "/dashboard/projects" },
      { key: "marketing", href: "/dashboard/marketing" },
      { key: "documents", href: "/dashboard/documents" },
    ],
  },
  {
    key: "groupGrow",
    items: [
      { key: "opportunities", href: "/dashboard/opportunities" },
      { key: "funding", href: "/dashboard/funding" },
      { key: "analytics", href: "/dashboard/analytics" },
      { key: "legal", href: "/dashboard/legal" },
    ],
  },
  {
    key: "groupWorkspace",
    items: [
      { key: "businesses", href: "/dashboard/businesses" },
      { key: "team", href: "/dashboard/team" },
      { key: "settings", href: "/dashboard/settings" },
      { key: "guide", href: "/dashboard/guide" },
    ],
  },
]

/**
 * The group a business most needs at its stage. It is opened by default and
 * marked as suggested, so a new founder is not faced with every tool at once.
 */
export function suggestedGroupForStage(stage: StartupStage | null | undefined): NavGroupKey {
  switch (stage) {
    case "idea":
    case "validation":
      return "groupDiscover"
    case "mvp":
      return "groupPlan"
    case "early_revenue":
      return "groupRun"
    case "growth":
    case "scale":
      return "groupGrow"
    default:
      return "groupDiscover"
  }
}

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard"
  return pathname === href || pathname.startsWith(`${href}/`)
}
