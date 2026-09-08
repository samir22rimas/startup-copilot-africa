import { getAdminFeedbackList } from "@/src/app/actions/admin"
import { FeedbackManagementList } from "@/src/components/admin/FeedbackManagementList"
import { MessageSquare } from "lucide-react"

export default async function AdminFeedbackPage() {
  const res = await getAdminFeedbackList()

  if (!res.success) {
    return (
      <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
        <h2 className="font-bold text-lg">Error loading Feedback Inbox</h2>
        <p className="text-sm mt-1">{res.error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
          <MessageSquare className="w-7 h-7 text-purple-600" /> User Feedback Inbox
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Review, categorize, and act on feedback, feature requests, and bug reports submitted by platform users.
        </p>
      </div>

      <FeedbackManagementList initialFeedback={res.feedback} />
    </div>
  )
}
