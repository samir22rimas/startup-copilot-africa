import { ScrollText } from "lucide-react"

import { getAuditLogs } from "@/src/app/actions/admin-platform"
import { Notice, Panel } from "@/src/components/ui/page"

export const dynamic = "force-dynamic"

export default async function AdminAuditPage() {
  const result = await getAuditLogs()

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          <ScrollText className="size-7 text-primary" /> Audit trail
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What platform administrators changed: plans, published opportunities and feature switches.
        </p>
      </div>

      {!result.success ? (
        <Notice tone="warning" title="Unavailable">
          {result.error}
        </Notice>
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th scope="col" className="px-5 py-2.5 font-medium">When</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Administrator</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Action</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Target</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {result.logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                    No administrative changes recorded yet.
                  </td>
                </tr>
              )}
              {result.logs.map((log) => (
                <tr key={log.id} className="border-b border-border align-top last:border-0">
                  <td className="tabular whitespace-nowrap px-5 py-2.5 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("en")}</td>
                  <td className="px-5 py-2.5 text-foreground">{log.actor_email ?? "—"}</td>
                  <td className="px-5 py-2.5 font-mono text-xs text-foreground">{log.action}</td>
                  <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">
                    {log.target_type}
                    {log.target_id ? ` · ${log.target_id.slice(0, 13)}` : ""}
                  </td>
                  <td className="max-w-xs break-words px-5 py-2.5 font-mono text-xs text-muted-foreground">{JSON.stringify(log.details)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  )
}
