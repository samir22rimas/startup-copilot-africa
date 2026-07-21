"use client"

import * as React from "react"
import { User, Building2, Save, Loader2, Check } from "lucide-react"
import { updateUserSettings } from "@/src/app/actions/settings"

interface SettingsFormProps {
  user: {
    email: string
    fullName: string
    phone: string
    city: string
    timezone: string
  }
  startup: {
    name: string
    industry: string
    countryCode: string
    budgetCurrency: string
    estimatedBudgetCents: number
  } | null
}

export function SettingsForm({ user, startup }: SettingsFormProps) {
  const [fullName, setFullName] = React.useState(user.fullName)
  const [phone, setPhone] = React.useState(user.phone)
  const [city, setCity] = React.useState(user.city)
  const [timezone, setTimezone] = React.useState(user.timezone)

  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [error, setError] = React.useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSaved(false)

    try {
      await updateUserSettings({ fullName, phone, city, timezone })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || "Failed to save settings.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <form onSubmit={handleSubmit} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="flex items-center gap-3 border-b border-zinc-100 pb-5 dark:border-zinc-800">
          <div className="flex size-10 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/50">
            <User className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-white">Personal Information</h2>
            <p className="text-xs text-zinc-500">Update your founder profile details.</p>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {saved && (
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-300">
            <Check className="size-4 text-green-600" /> Settings updated successfully!
          </div>
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Email Address</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-500 cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-950"
            />
            <p className="mt-1 text-[11px] text-zinc-400">Email cannot be changed directly.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Samir Rimas"
              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 700 000 000"
              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">City / Location</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Nairobi"
              className="mt-2 h-11 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
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
                <Save className="size-4" /> Save Profile
              </>
            )}
          </button>
        </div>
      </form>

      {/* Startup Details Card */}
      {startup && (
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          <div className="flex items-center gap-3 border-b border-zinc-100 pb-5 dark:border-zinc-800">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/50">
              <Building2 className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-white">Active Startup</h2>
              <p className="text-xs text-zinc-500">Details configured during onboarding.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Startup Name</span>
              <span className="mt-1 block text-base font-bold text-zinc-800 dark:text-zinc-100">{startup.name}</span>
            </div>

            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Industry / Sector</span>
              <span className="mt-1 block text-base font-bold text-zinc-800 dark:text-zinc-100">{startup.industry}</span>
            </div>

            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Country Code</span>
              <span className="mt-1 block text-base font-bold text-zinc-800 dark:text-zinc-100">{startup.countryCode}</span>
            </div>

            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">Starting Budget</span>
              <span className="mt-1 block text-base font-bold text-zinc-800 dark:text-zinc-100">
                {startup.estimatedBudgetCents / 100} {startup.budgetCurrency}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
