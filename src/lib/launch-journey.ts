export interface JourneyStep {
  id: string
  day: number
  title: string
  description: string
  href: string
  /** Auto-detected from project/startup state */
  done: boolean
}

export interface LaunchJourney {
  steps: JourneyStep[]
  completedCount: number
  totalCount: number
  percent: number
}

export function buildLaunchJourney(input: {
  onboardingCompleted: boolean
  documentCount: number
  hasResults: boolean
  hasTrackedMetrics: boolean
  hasMarketingEvent: boolean
  hasWeeklyCheckIn: boolean
  hasPitchDeck: boolean
  hasFundingWorkspace: boolean
  hasLegalWorkspace: boolean
  milestoneProgress: number
  tasksCount: number
}): LaunchJourney {
  const steps: JourneyStep[] = [
    {
      id: "interview",
      day: 1,
      title: "Complete founder interview",
      description: "Finish onboarding so Copilot knows your venture.",
      href: "/dashboard",
      done: input.onboardingCompleted,
    },
    {
      id: "settings",
      day: 2,
      title: "Confirm startup profile",
      description: "Industry, city, budget, and stage in Settings.",
      href: "/dashboard/settings",
      done: input.onboardingCompleted,
    },
    {
      id: "document",
      day: 3,
      title: "Upload one knowledge document",
      description: "Brief, research, or notes Copilot can read.",
      href: "/dashboard/documents",
      done: input.documentCount > 0,
    },
    {
      id: "results",
      day: 5,
      title: "Generate your Results pack",
      description: "Business plan, SWOT, budget, and roadmap.",
      href: "/dashboard/results",
      done: input.hasResults,
    },
    {
      id: "metrics",
      day: 7,
      title: "Log tracked metrics",
      description: "Revenue, customers, or burn in Analytics.",
      href: "/dashboard/analytics",
      done: input.hasTrackedMetrics,
    },
    {
      id: "focus",
      day: 8,
      title: "Save weekly focus check-in",
      description: "Pick 3 priorities and note what moved.",
      href: "/dashboard",
      done: input.hasWeeklyCheckIn,
    },
    {
      id: "marketing",
      day: 10,
      title: "Schedule one marketing post",
      description: "Turn AI copy into a tracked calendar item.",
      href: "/dashboard/marketing",
      done: input.hasMarketingEvent,
    },
    {
      id: "milestones",
      day: 12,
      title: "Complete half your milestones",
      description: "Finish at least 50% of launch tasks.",
      href: "/dashboard",
      done: input.tasksCount > 0 && input.milestoneProgress >= 50,
    },
    {
      id: "pitch",
      day: 13,
      title: "Generate pitch deck",
      description: "Six-slide investor story you can export.",
      href: "/dashboard/funding/pitch-deck",
      done: input.hasPitchDeck,
    },
    {
      id: "funding",
      day: 14,
      title: "Build funding workspace",
      description: "Runway, opportunities, and investor checklist.",
      href: "/dashboard/funding",
      done: input.hasFundingWorkspace,
    },
  ]

  const completedCount = steps.filter((s) => s.done).length
  const totalCount = steps.length
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return { steps, completedCount, totalCount, percent }
}

export function nextJourneyStep(journey: LaunchJourney): JourneyStep | null {
  return journey.steps.find((s) => !s.done) ?? null
}
