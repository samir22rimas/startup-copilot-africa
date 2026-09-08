/**
 * Canonical list of industry/business types available in Anza.
 * Single source of truth — import from here in onboarding, settings, admin, and AI prompts.
 */

export interface Industry {
  value: string
  label: string
  group: string
}

export const INDUSTRIES: Industry[] = [
  // ── Technology & Software ──────────────────────────────────────────────────
  { value: "fintech",        label: "Fintech (Financial Technology)",           group: "Technology & Software" },
  { value: "healthtech",     label: "Healthtech (Digital Health)",               group: "Technology & Software" },
  { value: "agritech",       label: "Agritech (Agriculture Technology)",         group: "Technology & Software" },
  { value: "edtech",         label: "Edtech (Education Technology)",             group: "Technology & Software" },
  { value: "ecommerce",      label: "E-commerce & Marketplace",                  group: "Technology & Software" },
  { value: "saas",           label: "SaaS (Software as a Service)",              group: "Technology & Software" },
  { value: "logistics-tech", label: "Logistics & Mobility Tech",                 group: "Technology & Software" },
  { value: "ai-ml",          label: "AI & Machine Learning",                     group: "Technology & Software" },
  { value: "cleantech",      label: "Cleantech & Climate Technology",            group: "Technology & Software" },
  { value: "proptech",       label: "Proptech (Real Estate Technology)",         group: "Technology & Software" },
  { value: "insurtech",      label: "Insurtech (Insurance Technology)",          group: "Technology & Software" },
  { value: "legaltech",      label: "Legaltech (Legal Technology)",              group: "Technology & Software" },
  { value: "govtech",        label: "GovTech (Government & Civic Technology)",   group: "Technology & Software" },
  { value: "hrtech",         label: "HRtech (Human Resources Technology)",       group: "Technology & Software" },
  { value: "cybersecurity",  label: "Cybersecurity & Data Privacy",              group: "Technology & Software" },

  // ── Healthcare & Wellness ──────────────────────────────────────────────────
  { value: "healthcare",        label: "Healthcare Services (Clinics, Hospitals)",    group: "Healthcare & Wellness" },
  { value: "pharmacy",          label: "Pharmacy & Pharmaceutical",                   group: "Healthcare & Wellness" },
  { value: "mental-health",     label: "Mental Health & Wellness",                    group: "Healthcare & Wellness" },
  { value: "medical-devices",   label: "Medical Devices & Diagnostics",              group: "Healthcare & Wellness" },
  { value: "fitness",           label: "Fitness, Nutrition & Sports",                group: "Healthcare & Wellness" },

  // ── Agriculture & Food ────────────────────────────────────────────────────
  { value: "agriculture",   label: "Agriculture & Farming",              group: "Agriculture & Food" },
  { value: "food-beverage", label: "Food & Beverage (Production, Processing)", group: "Agriculture & Food" },
  { value: "restaurants",   label: "Restaurants & Food Service",         group: "Agriculture & Food" },
  { value: "fisheries",     label: "Fisheries & Aquaculture",            group: "Agriculture & Food" },
  { value: "livestock",     label: "Livestock & Animal Husbandry",       group: "Agriculture & Food" },

  // ── Education & Human Development ─────────────────────────────────────────
  { value: "education",      label: "Education (Schools, Training, Tutoring)", group: "Education & Human Development" },
  { value: "vocational",     label: "Vocational Training & Skills",            group: "Education & Human Development" },
  { value: "early-learning", label: "Early Childhood & Daycare",              group: "Education & Human Development" },

  // ── Finance & Professional Services ───────────────────────────────────────
  { value: "finance",        label: "Financial Services (Non-tech)",           group: "Finance & Professional Services" },
  { value: "accounting",     label: "Accounting & Tax Advisory",               group: "Finance & Professional Services" },
  { value: "consulting",     label: "Consulting & Management Advisory",        group: "Finance & Professional Services" },
  { value: "legal",          label: "Legal Services & Law Firm",               group: "Finance & Professional Services" },
  { value: "insurance",      label: "Insurance & Risk Management",             group: "Finance & Professional Services" },
  { value: "investment",     label: "Investment & Asset Management",           group: "Finance & Professional Services" },

  // ── Retail & Consumer Goods ───────────────────────────────────────────────
  { value: "retail",         label: "Retail & FMCG",                          group: "Retail & Consumer Goods" },
  { value: "beauty-fashion", label: "Beauty, Apparel & Fashion",              group: "Retail & Consumer Goods" },
  { value: "electronics",    label: "Electronics & Gadgets Retail",           group: "Retail & Consumer Goods" },
  { value: "home-goods",     label: "Home Goods & Furniture",                 group: "Retail & Consumer Goods" },
  { value: "auto-parts",     label: "Auto Parts & Accessories",               group: "Retail & Consumer Goods" },

  // ── Manufacturing & Industry ──────────────────────────────────────────────
  { value: "manufacturing",  label: "Manufacturing & Production",              group: "Manufacturing & Industry" },
  { value: "textiles",       label: "Textiles & Garment Production",           group: "Manufacturing & Industry" },
  { value: "chemicals",      label: "Chemicals & Industrial Materials",        group: "Manufacturing & Industry" },
  { value: "mining",         label: "Mining & Natural Resources",              group: "Manufacturing & Industry" },

  // ── Infrastructure & Energy ───────────────────────────────────────────────
  { value: "energy",         label: "Energy & Utilities",                      group: "Infrastructure & Energy" },
  { value: "solar",          label: "Solar & Renewable Energy",                group: "Infrastructure & Energy" },
  { value: "construction",   label: "Construction & Engineering",              group: "Infrastructure & Energy" },
  { value: "water",          label: "Water & Sanitation",                      group: "Infrastructure & Energy" },
  { value: "waste",          label: "Waste Management & Recycling",            group: "Infrastructure & Energy" },

  // ── Real Estate & Housing ──────────────────────────────────────────────────
  { value: "real-estate",    label: "Real Estate (Sales, Rentals, Property Mgt)", group: "Real Estate & Housing" },
  { value: "affordable-housing", label: "Affordable Housing & Urban Development", group: "Real Estate & Housing" },

  // ── Transport & Logistics ─────────────────────────────────────────────────
  { value: "logistics",      label: "Logistics & Supply Chain",                group: "Transport & Logistics" },
  { value: "transport",      label: "Transport & Ride-hailing",                group: "Transport & Logistics" },
  { value: "last-mile",      label: "Last-Mile Delivery",                      group: "Transport & Logistics" },

  // ── Media, Creative & Culture ─────────────────────────────────────────────
  { value: "media",          label: "Media, Entertainment & Publishing",       group: "Media, Creative & Culture" },
  { value: "music",          label: "Music, Film & Arts",                      group: "Media, Creative & Culture" },
  { value: "gaming",         label: "Gaming & Interactive Media",              group: "Media, Creative & Culture" },
  { value: "advertising",    label: "Advertising, PR & Marketing Agency",      group: "Media, Creative & Culture" },
  { value: "design",         label: "Design, Branding & Creative Studio",      group: "Media, Creative & Culture" },

  // ── Tourism & Hospitality ─────────────────────────────────────────────────
  { value: "hospitality",    label: "Hotels, Hospitality & Accommodation",     group: "Tourism & Hospitality" },
  { value: "tourism",        label: "Tourism & Travel",                        group: "Tourism & Hospitality" },
  { value: "events",         label: "Events, Conferences & Exhibitions",       group: "Tourism & Hospitality" },

  // ── Social Impact & Non-Profit ────────────────────────────────────────────
  { value: "non-profit",     label: "Non-Profit & NGO",                        group: "Social Impact & Non-Profit" },
  { value: "social-enterprise", label: "Social Enterprise & Impact Business",  group: "Social Impact & Non-Profit" },
  { value: "community",      label: "Community Services & Co-operatives",      group: "Social Impact & Non-Profit" },

  // ── Other ──────────────────────────────────────────────────────────────────
  { value: "other", label: "Other / General", group: "Other" },
]

/** All unique group names in order */
export const INDUSTRY_GROUPS = Array.from(new Set(INDUSTRIES.map((i) => i.group)))

/** Get label for a stored value */
export function getIndustryLabel(value: string | null | undefined): string {
  if (!value) return "Not specified"
  return INDUSTRIES.find((i) => i.value === value)?.label ?? value
}
