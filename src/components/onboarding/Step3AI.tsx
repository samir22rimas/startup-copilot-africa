"use client"

import { Button } from "@/src/components/ui/button"
import { Label } from "@/src/components/ui/label"
import { Select } from "@/src/components/ui/select"
import type { OnboardingInput } from "@/src/features/business/actions"

interface Step3AIProps {
  data: OnboardingInput
  onChange: <K extends keyof OnboardingInput>(field: K, value: OnboardingInput[K]) => void
  onBack: () => void
  onComplete: () => void | Promise<void>
  submitting: boolean
}

export function Step3AI({ data, onChange, onBack, onComplete, submitting }: Step3AIProps) {
  const canComplete = data.primaryUseCase.trim().length > 0 && data.toneOfVoice.trim().length > 0

  return (
    <div className="flex flex-col gap-8 w-full max-w-md mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          AI Configuration
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Set up how your AI assistant will interact and perform.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="primary-usecase">PRIMARY USE CASE</Label>
          <Select
            id="primary-usecase"
            value={data.primaryUseCase}
            onChange={(e) => onChange("primaryUseCase", e.target.value)}
          >
            <option value="" disabled hidden>Select Use Case</option>
            <option value="customer-support">Customer Support</option>
            <option value="sales">Sales & Lead Gen</option>
            <option value="internal-knowledge">Internal Knowledge Base</option>
            <option value="onboarding">User Onboarding</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tone-of-voice">TONE OF VOICE</Label>
          <Select
            id="tone-of-voice"
            value={data.toneOfVoice}
            onChange={(e) => onChange("toneOfVoice", e.target.value)}
          >
            <option value="" disabled hidden>Select Tone</option>
            <option value="professional">Professional & Formal</option>
            <option value="friendly">Friendly & Casual</option>
            <option value="enthusiastic">Enthusiastic & Energetic</option>
            <option value="technical">Technical & Precise</option>
          </Select>
        </div>

        <div className="p-4 rounded-xl bg-green-50 border border-green-100 dark:bg-green-950/20 dark:border-green-900/30">
          <h4 className="text-sm font-semibold text-green-900 dark:text-green-400 mb-1">Configuration Ready</h4>
          <p className="text-xs text-green-700/80 dark:text-green-500/80">
            Based on your selections, we will provision a custom AI agent tailored to your startup&apos;s profile and needs.
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <Button
            variant="outline"
            className="w-1/2 h-14 text-base font-semibold rounded-xl"
            onClick={onBack}
            disabled={submitting}
          >
            Back
          </Button>
          <Button
            className="w-1/2 h-14 text-base font-semibold rounded-xl bg-green-800 hover:bg-green-900 text-white shadow-xl shadow-green-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={onComplete}
            disabled={!canComplete || submitting}
          >
            {submitting ? "Saving…" : "Complete Configuration"}
          </Button>
        </div>
      </div>
    </div>
  )
}