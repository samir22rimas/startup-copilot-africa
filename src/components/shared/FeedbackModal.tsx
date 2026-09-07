"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { MessageSquare, Star, Send, Loader2, Check, X } from "lucide-react"
import { submitUserFeedback, type FeedbackCategory } from "@/src/app/actions/feedback"

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: "improvement", label: "Idea / Improvement" },
  { value: "bug", label: "Bug / Issue" },
  { value: "feature", label: "Feature Request" },
  { value: "other", label: "Other" },
]

export function FeedbackModal() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)
  const [category, setCategory] = React.useState<FeedbackCategory>("improvement")
  const [rating, setRating] = React.useState<number>(0)
  const [hoverRating, setHoverRating] = React.useState<number>(0)
  const [message, setMessage] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [error, setError] = React.useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) {
      setError("Please describe your feedback.")
      return
    }

    setSubmitting(true)
    setError("")

    const res = await submitUserFeedback({
      category,
      message,
      rating: rating > 0 ? rating : undefined,
      pageUrl: pathname,
    })

    setSubmitting(false)

    if (!res.success) {
      setError(res.error)
      return
    }

    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setIsOpen(false)
      setMessage("")
      setRating(0)
      setCategory("improvement")
    }, 2000)
  }

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-green-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xl transition-all hover:bg-green-800 hover:scale-105 active:scale-95 dark:bg-green-600 dark:hover:bg-green-700"
      >
        <MessageSquare className="size-4" />
        <span>Feedback</span>
      </button>

      {/* Feedback Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-5 top-5 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X className="size-5" />
            </button>

            {submitted ? (
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-400">
                  <Check className="size-6" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Thank You!</h3>
                <p className="text-xs text-zinc-500">Your feedback helps us make Anza better for founders.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
                    <MessageSquare className="size-4" /> User Feedback
                  </div>
                  <h3 className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">
                    Share your thoughts
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Encountered an issue or have an idea to improve Anza? We&apos;d love to hear it.
                  </p>
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    {error}
                  </div>
                )}

                {/* Rating Stars */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    How would you rate your experience? (Optional)
                  </label>
                  <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-zinc-300 transition hover:scale-110 dark:text-zinc-700"
                      >
                        <Star
                          className={`size-6 ${
                            (hoverRating || rating) >= star
                              ? "fill-amber-400 text-amber-400"
                              : "text-zinc-300 dark:text-zinc-700"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Select */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-800 outline-none transition focus:border-green-600 focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Your Feedback
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Tell us what's working well or what we can improve..."
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-800 outline-none transition focus:border-green-600 focus:bg-white dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" /> Submit Feedback
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
