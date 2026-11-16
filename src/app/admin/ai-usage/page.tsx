import { Cpu } from "lucide-react"

import { getAiUsageStats } from "@/src/app/actions/admin-platform"
import { Notice, Panel, PanelHeader } from "@/src/components/ui/page"

export const dynamic = "force-dynamic"

const number = (value: number) => value.toLocaleString("en")

export default async function AdminAiUsagePage() {
  const result = await getAiUsageStats(30)

  if (!result.success) {
    return (
      <div className="mx-auto max-w-7xl">
        <Notice tone="warning" title="AI usage unavailable">
          {result.error}
        </Notice>
      </div>
    )
  }

  const { stats } = result
  const totalTokens = stats.promptTokens + stats.completionTokens
  const failureRate = stats.calls ? Math.round((stats.failures / stats.calls) * 1000) / 10 : 0
  const peak = Math.max(1, ...stats.byDay.map((day) => day.tokens))

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          <Cpu className="size-7 text-primary" /> AI usage
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calls and token consumption over the last {stats.days} days, from the <code>ai_usage</code> ledger.
        </p>
      </div>

      {stats.truncated && (
        <Notice tone="warning">Showing the most recent {number(stats.calls)} calls only; totals are a lower bound.</Notice>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["AI calls", number(stats.calls), `${number(stats.failures)} failed (${failureRate}%)`],
            ["Total tokens", number(totalTokens), "Input + output"],
            ["Input tokens", number(stats.promptTokens), "Prompts and context"],
            ["Output tokens", number(stats.completionTokens), "Generated text"],
          ] as const
        ).map(([label, value, hint]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="tabular mt-1 text-xl font-semibold text-foreground">{value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>

      {stats.estimatedCalls > 0 && (
        <p className="text-xs text-muted-foreground">
          {number(stats.estimatedCalls)} calls came from providers that did not report usage; their token counts are
          estimated at about four characters per token.
        </p>
      )}

      <Panel>
        <PanelHeader title="Tokens per day" />
        {stats.byDay.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No AI calls recorded in this period.</p>
        ) : (
          <div className="overflow-x-auto p-5">
            <table className="tabular w-full min-w-[28rem] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th scope="col" className="w-28 pb-2 font-medium">Day</th>
                  <th scope="col" className="pb-2 font-medium">Tokens</th>
                  <th scope="col" className="w-24 pb-2 text-right font-medium">Calls</th>
                </tr>
              </thead>
              <tbody>
                {stats.byDay.map((day) => (
                  <tr key={day.day}>
                    <th scope="row" className="py-1 text-left text-xs font-normal text-muted-foreground">{day.day}</th>
                    <td className="py-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded-r-sm bg-primary" style={{ width: `${Math.max(1, (day.tokens / peak) * 100)}%`, maxWidth: "75%" }} />
                        <span className="text-xs text-foreground">{number(day.tokens)}</span>
                      </div>
                    </td>
                    <td className="py-1 text-right text-xs text-muted-foreground">{number(day.calls)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="By feature" />
          <div className="overflow-x-auto">
            <table className="tabular w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-5 py-2.5 font-medium">Feature</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Calls</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Tokens</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Failed</th>
                </tr>
              </thead>
              <tbody>
                {stats.byFeature.map((row) => (
                  <tr key={row.feature} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5 font-mono text-xs text-foreground">{row.feature}</td>
                    <td className="px-5 py-2.5 text-right">{number(row.calls)}</td>
                    <td className="px-5 py-2.5 text-right">{number(row.tokens)}</td>
                    <td className="px-5 py-2.5 text-right">{number(row.failures)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="By model" />
            <ul className="divide-y divide-border">
              {stats.byModel.map((row) => (
                <li key={`${row.provider}:${row.model}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <span className="min-w-0 truncate font-mono text-xs text-foreground">
                    {row.provider} / {row.model}
                  </span>
                  <span className="tabular shrink-0 text-muted-foreground">
                    {number(row.calls)} calls · {number(row.tokens)} tokens
                  </span>
                </li>
              ))}
              {stats.byModel.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No successful calls yet.</li>}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Heaviest users" />
            <ul className="divide-y divide-border">
              {stats.topUsers.map((user) => (
                <li key={user.userId} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                  <span className="min-w-0 truncate text-foreground">{user.email || user.userId}</span>
                  <span className="tabular shrink-0 text-muted-foreground">
                    {number(user.calls)} calls · {number(user.tokens)} tokens
                  </span>
                </li>
              ))}
              {stats.topUsers.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No usage yet.</li>}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelHeader title="Recent errors" description="Provider failures and rejected outputs." />
        <ul className="divide-y divide-border">
          {stats.recentErrors.map((row, index) => (
            <li key={index} className="px-5 py-2.5 text-sm">
              <p className="font-mono text-xs text-foreground">{row.feature}</p>
              <p className="mt-0.5 break-words text-xs text-muted-foreground">
                {new Date(row.createdAt).toLocaleString("en")} — {row.error}
              </p>
            </li>
          ))}
          {stats.recentErrors.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No errors in this period.</li>}
        </ul>
      </Panel>
    </div>
  )
}
