"use client"

import * as React from "react"
import { User, Building2, Save, Loader2, Check, Gauge } from "lucide-react"
import { updateStartupSettings, updateUserSettings, type PlanUsage } from "@/src/app/actions/settings"
import type { StartupStage } from "@/src/lib/database.types"
import {
  AFRICAN_COUNTRIES,
  formatAfricanCountryOption,
  getAfricanCountryCurrency,
} from "@/src/lib/african-countries"
import { INDUSTRIES, INDUSTRY_GROUPS } from "@/src/lib/industries"
import { useRouter } from "next/navigation"

const STAGES: { value: StartupStage; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "validation", label: "Validation" },
  { value: "mvp", label: "MVP" },
  { value: "early_revenue", label: "Early revenue" },
  { value: "growth", label: "Growth" },
  { value: "scale", label: "Scale" },
]

interface SettingsFormProps {
  user: {
    email: string
    fullName: string
    phone: string
    city: string
    countryCode: string
    timezone: string
    avatarUrl: string
  }
  startup: {
    name: string
    industry: string
    city: string
    countryCode: string
    stage: StartupStage
    budgetCurrency: string
    estimatedBudgetCents: number
    description: string
    websiteUrl: string
  } | null
  /** False for team members who are not the owner or a co-founder admin. */
  canEditStartup?: boolean
  planUsage?: PlanUsage | null
}

export function SettingsForm({ user, startup, canEditStartup = true, planUsage = null }: SettingsFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = React.useState(user.fullName)
  const [phone, setPhone] = React.useState(user.phone)
  const [city, setCity] = React.useState(user.city)
  const [countryCode, setCountryCode] = React.useState(user.countryCode)
  const [timezone, setTimezone] = React.useState(user.timezone)
  const [avatarUrl, setAvatarUrl] = React.useState(user.avatarUrl)

  const [startupName, setStartupName] = React.useState(startup?.name ?? "")
  const [industry, setIndustry] = React.useState(startup?.industry ?? "")
  const [startupCity, setStartupCity] = React.useState(startup?.city ?? "")
  const [startupCountry, setStartupCountry] = React.useState(startup?.countryCode ?? "")
  const [stage, setStage] = React.useState<StartupStage>(startup?.stage ?? "idea")
  const [budgetCurrency, setBudgetCurrency] = React.useState(startup?.budgetCurrency ?? "USD")
  const [estimatedBudget, setEstimatedBudget] = React.useState(
    String((startup?.estimatedBudgetCents ?? 0) / 100),
  )
  const [description, setDescription] = React.useState(startup?.description ?? "")
  const [websiteUrl, setWebsiteUrl] = React.useState(startup?.websiteUrl ?? "")

  const [savingProfile, setSavingProfile] = React.useState(false)
  const [savingStartup, setSavingStartup] = React.useState(false)
  const [savedProfile, setSavedProfile] = React.useState(false)
  const [savedStartup, setSavedStartup] = React.useState(false)
  const [error, setError] = React.useState("")
  const [startupError, setStartupError] = React.useState("")

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      setError("Choose a JPG, PNG, WebP or GIF image.")
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Image must be smaller than 8MB")
      return
    }

    // Shrink to a 256px square JPEG in the browser: the stored avatar stays a
    // few kilobytes instead of megabytes loaded on every page.
    const objectUrl = URL.createObjectURL(file)
    const image = new window.Image()
    image.onload = () => {
      const size = 256
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext("2d")
      if (ctx) {
        const side = Math.min(image.naturalWidth, image.naturalHeight)
        const sx = (image.naturalWidth - side) / 2
        const sy = (image.naturalHeight - side) / 2
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, size, size)
        ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size)
        setAvatarUrl(canvas.toDataURL("image/jpeg", 0.85))
        setError("")
      } else {
        setError("That image could not be processed. Try another one.")
      }
      URL.revokeObjectURL(objectUrl)
    }
    image.onerror = () => {
      setError("That image could not be read. Try another one.")
      URL.revokeObjectURL(objectUrl)
    }
    image.src = objectUrl
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    setError("")
    setSavedProfile(false)

    try {
      await updateUserSettings({ fullName, phone, city, countryCode, timezone, avatarUrl })
      setSavedProfile(true)
      router.refresh()
      setTimeout(() => setSavedProfile(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save settings.")
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleStartupSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSavingStartup(true)
    setStartupError("")
    setSavedStartup(false)

    const res = await updateStartupSettings({
      name: startupName,
      industry,
      city: startupCity,
      countryCode: startupCountry,
      stage,
      budgetCurrency,
      estimatedBudget: Number(estimatedBudget) || 0,
      description,
      websiteUrl,
    })

    if (!res.success) {
      setStartupError(res.error)
      setSavingStartup(false)
      return
    }

    setSavedStartup(true)
    router.refresh()
    setTimeout(() => setSavedStartup(false), 3000)
    setSavingStartup(false)
  }

  return (
    <div className="space-y-8">
      {planUsage && <PlanUsageCard usage={planUsage} />}

      <form
        onSubmit={handleProfileSubmit}
        className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8"
      >
        <div className="flex items-center gap-3 border-b border-zinc-100 pb-5 dark:border-zinc-800">
          <div className="flex size-10 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/50">
            <User className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-white">Personal Information</h2>
            <p className="text-xs text-zinc-500">Update your founder profile details & avatar photo.</p>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {savedProfile && (
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-300">
            <Check className="size-4 text-green-600" /> Profile updated successfully!
          </div>
        )}

        <div className="mt-6 flex items-center gap-5">
          <div className="relative flex size-20 items-center justify-center overflow-hidden rounded-full border-2 border-green-600 bg-zinc-100 dark:bg-zinc-800">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
            ) : (
              <User className="size-8 text-zinc-400" />
            )}
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Upload Photo
            </button>
            <p className="mt-1 text-[11px] text-zinc-400">JPG, PNG, WebP or GIF. Resized automatically.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <Field label="Email Address">
            <input
              type="email"
              disabled
              value={user.email}
              className="mt-2 h-11 w-full cursor-not-allowed rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950"
            />
            <p className="mt-1 text-[11px] text-zinc-400">Email cannot be changed directly.</p>
          </Field>

          <TextField label="Full Name" value={fullName} onChange={setFullName} placeholder="e.g. Samir Rimas" />
          <TextField label="Phone Number" value={phone} onChange={setPhone} placeholder="+254 700 000 000" />
          <TextField label="City / Location" value={city} onChange={setCity} placeholder="e.g. Nairobi" />
          <Field label="Country">
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="">Select country</option>
              {AFRICAN_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {formatAfricanCountryOption(c)}
                </option>
              ))}
            </select>
          </Field>
          <TextField label="Timezone" value={timezone} onChange={setTimezone} placeholder="e.g. Africa/Nairobi" />
        </div>

        <div className="mt-6 flex justify-end">
          <SaveButton saving={savingProfile} label="Save Profile" />
        </div>
      </form>

      {startup && (
        <form
          onSubmit={handleStartupSubmit}
          className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8"
        >
          <div className="flex items-center gap-3 border-b border-zinc-100 pb-5 dark:border-zinc-800">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/50">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-white">Active Startup</h2>
              <p className="text-xs text-zinc-500">
                These fields drive Copilot, Legal, Funding, and Analytics — keep them accurate.
              </p>
            </div>
          </div>

          {startupError && (
            <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
              {startupError}
            </div>
          )}

          {savedStartup && (
            <div className="mt-6 flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-300">
              <Check className="size-4 text-green-600" /> Startup details updated — AI context refreshed.
            </div>
          )}

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <TextField label="Startup Name" value={startupName} onChange={setStartupName} placeholder="Your company" />
            <Field label="Industry / Business Type">
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="">Select Industry / Business Type</option>
                {INDUSTRY_GROUPS.map((group) => (
                  <optgroup key={group} label={group}>
                    {INDUSTRIES.filter((i) => i.group === group).map((i) => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <TextField label="City" value={startupCity} onChange={setStartupCity} placeholder="e.g. Lagos" />
            <Field label="Country">
              <select
                value={startupCountry}
                onChange={(e) => {
                  const code = e.target.value
                  setStartupCountry(code)
                  setBudgetCurrency(getAfricanCountryCurrency(code, budgetCurrency))
                }}
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="">Select country</option>
                {AFRICAN_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {formatAfricanCountryOption(c)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Stage">
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as StartupStage)}
                className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
              >
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>

            <TextField
              label="Budget Currency"
              value={budgetCurrency}
              onChange={(v) => setBudgetCurrency(v.toUpperCase().slice(0, 8))}
              placeholder="USD"
            />
            <TextField
              label="Starting Budget (amount)"
              value={estimatedBudget}
              onChange={setEstimatedBudget}
              placeholder="5000"
            />
            <TextField
              label="Website URL"
              value={websiteUrl}
              onChange={setWebsiteUrl}
              placeholder="https://..."
            />

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Short description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What you build, for whom, and where you operate…"
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-600 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
          </div>

          {canEditStartup ? (
            <div className="mt-6 flex justify-end">
              <SaveButton saving={savingStartup} label="Save Startup" />
            </div>
          ) : (
            <p className="mt-6 rounded-xl bg-zinc-50 p-4 text-xs text-zinc-500 dark:bg-zinc-950/50">
              Only the owner and co-founder admins can change startup details.
            </p>
          )}
        </form>
      )}
    </div>
  )
}

function PlanUsageCard({ usage }: { usage: PlanUsage }) {
  const percent = usage.aiLimit > 0 ? Math.min(100, Math.round((usage.aiUsed / usage.aiLimit) * 100)) : 0
  const resets = new Date(usage.resetsAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  })
  const nearLimit = percent >= 85

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
      <div className="flex items-center gap-3 border-b border-zinc-100 pb-5 dark:border-zinc-800">
        <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/50">
          <Gauge className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold text-zinc-900 dark:text-white">Plan &amp; usage</h2>
          <p className="text-xs text-zinc-500">
            You are on the <span className="font-semibold text-zinc-700 dark:text-zinc-300">{usage.tier}</span> plan.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">AI generations this month</p>
          <p className="text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
            {usage.aiUsed.toLocaleString()} / {usage.aiLimit.toLocaleString()}
          </p>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={usage.aiLimit}
          aria-valuenow={Math.min(usage.aiUsed, usage.aiLimit)}
          aria-label="AI generations used this month"
        >
          <div
            className={nearLimit ? "h-full rounded-full bg-amber-500" : "h-full rounded-full bg-green-600"}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-zinc-500">
          Counts Copilot replies and generated documents. Resets on {resets}.
        </p>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/50">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Team seats per startup</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums text-zinc-900 dark:text-white">{usage.teamSeats}</dd>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-950/50">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Businesses you can own</dt>
          <dd className="mt-1 text-lg font-bold tabular-nums text-zinc-900 dark:text-white">{usage.startupLimit}</dd>
        </div>
      </dl>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</label>
      {children}
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <Field label={label}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950"
      />
    </Field>
  )
}

function SaveButton({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-green-700 px-6 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
    >
      {saving ? (
        <>
          <Loader2 className="size-4 animate-spin" /> Saving...
        </>
      ) : (
        <>
          <Save className="size-4" /> {label}
        </>
      )}
    </button>
  )
}
