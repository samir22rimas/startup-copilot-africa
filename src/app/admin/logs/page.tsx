import { getAdminUsageLogs } from "@/src/app/actions/admin"
import { Activity, Clock, Terminal, User } from "lucide-react"

export default async function AdminLogsPage() {
  const res = await getAdminUsageLogs()

  if (!res.success) {
    return (
      <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
        <h2 className="font-bold text-lg">Error loading System Logs</h2>
        <p className="text-sm mt-1">{res.error}</p>
      </div>
    )
  }

  const logs = res.logs

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
          <Activity className="w-7 h-7 text-emerald-600" /> Platform Usage & System Logs
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Audit trail of usage events, AI token consumption, and system activity logs.
        </p>
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Event Name</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Quantity</th>
                <th className="py-3.5 px-4">Metadata</th>
                <th className="py-3.5 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900 font-mono">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500 italic font-sans">
                    No usage events recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {log.eventName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-zinc-800 dark:text-zinc-200">
                      {log.userEmail || log.userId || "System / Anonymous"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                      {log.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 max-w-xs truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : "{}"}
                    </td>
                    <td className="py-3.5 px-4 font-sans text-zinc-400 text-[11px]">
                      {new Date(log.occurredAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
