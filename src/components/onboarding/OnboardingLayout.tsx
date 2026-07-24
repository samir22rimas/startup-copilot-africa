"use client"

import { completeOnboardingWizard, type OnboardingInput } from "@/src/features/business/actions"
import { useRouter } from "next/navigation"
import * as React from "react"
import { Step1Company } from "./Step1Company"
import { Step2Project } from "./Step2Project"
import { Step3AI } from "./Step3AI"

const stepTitles = [
  "STEP 1 OF 3: COMPANY FOUNDATION",
  "STEP 2 OF 3: PROJECT DETAILS",
  "STEP 3 OF 3: AI CONFIGURATION"
]

const initialData: OnboardingInput = {
  businessName: "",
  countryCode: "",
  city: "",
  industry: "",
  estimatedBudgetUsd: 0,
  projectTitle: "",
  projectDescription: "",
  targetAudience: "",
  primaryUseCase: "",
  toneOfVoice: "",
}

export function OnboardingLayout() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = React.useState(1)
  const [data, setData] = React.useState<OnboardingInput>(initialData)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function updateField<K extends keyof OnboardingInput>(field: K, value: OnboardingInput[K]) {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, 3))
  const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  const handleComplete = async () => {
    setError(null)
    setSubmitting(true)
    const result = await completeOnboardingWizard(data)
    setSubmitting(false)

    if (!result.success) {
      setError(result.error)
      return
    }
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen w-full bg-[#f4f8f5] dark:bg-zinc-950 flex flex-col relative overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 dark:bg-blue-900/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-green-200/50 dark:bg-green-900/20 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 items-center justify-center p-6 sm:p-12">
        {/* Header */}
        <div className="mb-8 text-center space-y-6">
          <h1 className="text-xl font-bold text-green-900 dark:text-green-500 tracking-tight">
            Startup Copilot Africa
          </h1>

          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    step === currentStep
                      ? "w-6 bg-green-700 dark:bg-green-500"
                      : step < currentStep
                        ? "w-2 bg-green-700/50 dark:bg-green-500/50"
                        : "w-2 bg-zinc-300 dark:bg-zinc-700"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
              {stepTitles[currentStep - 1]}
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl shadow-green-900/5 border border-zinc-100 dark:border-zinc-800 p-8 sm:p-12 overflow-hidden relative">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </div>
          )}
          {currentStep === 1 && (
            <Step1Company data={data} onChange={updateField} onNext={handleNext} />
          )}
          {currentStep === 2 && (
            <Step2Project data={data} onChange={updateField} onNext={handleNext} onBack={handleBack} />
          )}
          {currentStep === 3 && (
            <Step3AI
              data={data}
              onChange={updateField}
              onBack={handleBack}
              onComplete={handleComplete}
              submitting={submitting}
            />
          )}
        </div>

        {/* Footer Link */}
        <div className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
          Need help with your startup profile? <a href="#" className="font-semibold text-green-700 dark:text-green-500 hover:underline">Contact Support</a>
        </div>
      </div>
    </div>
  )
}
