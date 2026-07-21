"use client"

import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Select } from "@/src/components/ui/select"
import { Slider } from "@/src/components/ui/slider"
import type { OnboardingInput } from "@/src/features/business/actions"

interface Step1CompanyProps {
  data: OnboardingInput
  onChange: <K extends keyof OnboardingInput>(field: K, value: OnboardingInput[K]) => void
  onNext: () => void
}

export function Step1Company({ data, onChange, onNext }: Step1CompanyProps) {
  const budget = data.estimatedBudgetUsd ?? 50000

  const formattedBudget = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(budget)

  const canContinue = data.businessName.trim().length > 1 && data.countryCode.trim().length > 0

  return (
    <div className="flex flex-col gap-8 w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Let&apos;s build your profile
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Enter your initial business details to start the AI configuration.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="business-name">BUSINESS NAME</Label>
          <Input
            id="business-name"
            placeholder="e.g. Nile Fintech Solutions"
            value={data.businessName}
            onChange={(e) => onChange("businessName", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country">COUNTRY</Label>
            <Select
              id="country"
              value={data.countryCode}
              onChange={(e) => onChange("countryCode", e.target.value)}
            >
              <option value="" disabled hidden>Select Country</option>
              <option value="KE">Kenya</option>
              <option value="NG">Nigeria</option>
              <option value="CM">Cameroon</option>
              <option value="ZA">South Africa</option>
              <option value="RW">Rwanda</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">CITY</Label>
            <Input
              id="city"
              placeholder="e.g. Nairobi"
              value={data.city}
              onChange={(e) => onChange("city", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">INDUSTRY</Label>
          <Select
            id="industry"
            value={data.industry}
            onChange={(e) => onChange("industry", e.target.value)}
          >
            <option value="" disabled hidden>Select Industry</option>
            <option value="fintech">Fintech</option>
            <option value="healthtech">Healthtech</option>
            <option value="agritech">Agritech</option>
            <option value="edtech">Edtech</option>
          </Select>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <Label>ESTIMATED BUDGET (USD)</Label>
            <span className="text-sm font-bold text-green-700 dark:text-green-500">
              {formattedBudget}
            </span>
          </div>
          <Slider
            min={5000}
            max={500000}
            step={5000}
            value={budget}
            onChange={(e) => onChange("estimatedBudgetUsd", Number(e.target.value))}
          />
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>$5k</span>
            <span>$500k+</span>
          </div>
        </div>

        <div className="pt-4">
          <Button
            className="w-full h-14 text-base font-semibold rounded-xl bg-green-800 hover:bg-green-900 text-white shadow-xl shadow-green-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={onNext}
            disabled={!canContinue}
          >
            Continue to Project Details
            <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  )
}