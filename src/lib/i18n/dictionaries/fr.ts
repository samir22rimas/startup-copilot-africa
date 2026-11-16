import type { en } from "./en"
import { basis, common, nav, roles, stages } from "./fr/shell"
import { pages, validation } from "./fr/modules"
import { ideas, marketing, model } from "./fr/discover"
import { finance, plan } from "./fr/planning"
import { copilot, projects } from "./fr/run"
import { businesses, opportunities, overview } from "./fr/overview"
import { onboarding } from "./fr/onboarding"
import { reports } from "./fr/reports"

/** French strings. Typed against English, so a missing key is a build error. */
export const fr: typeof en = {
  common,
  basis,
  nav,
  stages,
  roles,
  reports,
  pages,
  validation,
  marketing,
  ideas,
  model,
  plan,
  finance,
  projects,
  copilot,
  overview,
  opportunities,
  businesses,
  onboarding,
}
