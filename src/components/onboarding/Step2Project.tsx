"use client"

import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Select } from "@/src/components/ui/select"
import type { OnboardingInput } from "@/src/features/business/actions"

interface Step2ProjectProps {
  data: OnboardingInput
  onChange: <K extends keyof OnboardingInput>(field: K, value: OnboardingInput[K]) => void
  onNext: () => void
  onBack: () => void
}

export function Step2Project({ data, onChange, onNext, onBack }: Step2ProjectProps) {
  const canContinue = data.projectTitle.trim().length > 1

  return (
    <div className="flex flex-col gap-8 w-full max-w-md mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Project Details
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Tell us more about the product you are building.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="project-title">PROJECT TITLE</Label>
          <Input
            id="project-title"
            placeholder="e.g. NilePay App"
            value={data.projectTitle}
            onChange={(e) => onChange("projectTitle", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">SHORT DESCRIPTION</Label>
          <textarea
            id="description"
            placeholder="What does your project do in one sentence?"
            value={data.projectDescription}
            onChange={(e) => onChange("projectDescription", e.target.value)}
            className="flex w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 ring-offset-white placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 transition-all min-h-[100px] resize-y"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target-audience">TARGET AUDIENCE</Label>
          <Select
            id="target-audience"
            value={data.targetAudience}
            onChange={(e) => onChange("targetAudience", e.target.value)}
          >
            <option value="" disabled hidden>Select Audience</option>
            <option value="b2b">B2B (Business to Business)</option>
            <option value="b2c">B2C (Business to Consumer)</option>
            <option value="b2b2c">B2B2C</option>
            <option value="enterprise">Enterprise</option>
          </Select>
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            variant="outline"
            className="w-1/2 h-14 text-base font-semibold rounded-xl"
            onClick={onBack}
          >
            Back
          </Button>
          <Button
            className="w-1/2 h-14 text-base font-semibold rounded-xl bg-green-800 hover:bg-green-900 text-white shadow-xl shadow-green-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={onNext}
            disabled={!canContinue}
          >
            Continue to AI Config
          </Button>
        </div>
      </div>
    </div>
  )
}