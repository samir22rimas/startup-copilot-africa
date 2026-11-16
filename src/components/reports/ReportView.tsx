"use client"

import { ExternalLink } from "lucide-react"
import * as React from "react"

import { ExportMenu } from "@/src/components/shared/ExportMenu"
import { Badge, Notice, Panel, secondaryButtonClass, type BadgeTone } from "@/src/components/ui/page"
import { useI18n } from "@/src/lib/i18n/client"
import { fmt } from "@/src/lib/i18n/config"
import { reportToExportSections } from "@/src/lib/reports/markdown"
import { countByBasis, type Basis, type Report, type ReportMeta } from "@/src/lib/reports/schema"

const BASIS_TONE: Record<Basis, BadgeTone> = {
  verified: "green",
  estimate: "blue",
  assumption: "amber",
}

export function BasisBadge({ basis }: { basis: Basis }) {
  const { t } = useI18n()
  return (
    <Badge tone={BASIS_TONE[basis]} title={t.basis[`${basis}Hint`]}>
      {t.basis[basis]}
    </Badge>
  )
}

export function BasisLegend() {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{t.basis.legend}</span>
      {(["verified", "estimate", "assumption"] as const).map((basis) => (
        <span key={basis} className="flex items-center gap-1.5">
          <BasisBadge basis={basis} />
          <span className="hidden sm:inline">{t.basis[`${basis}Hint`]}</span>
        </span>
      ))}
    </div>
  )
}

/** Renders a structured report with its provenance, and offers PDF / Word export. */
export function ReportView({
  report,
  meta,
  startupName,
  actions,
}: {
  report: Report
  meta: ReportMeta
  startupName: string
  actions?: React.ReactNode
}) {
  const { t, locale } = useI18n()
  const counts = countByBasis(report)

  const exportPayload = React.useCallback(
    () => ({
      startupName,
      title: report.title,
      generatedAt: meta.generatedAt || new Date().toISOString(),
      sections: reportToExportSections(report, meta, {
        basis: { verified: t.basis.verified, estimate: t.basis.estimate, assumption: t.basis.assumption },
        nextSteps: t.reports.nextSteps,
        limitations: t.reports.limitations,
        sources: t.reports.sources,
        retrieved: t.reports.retrieved,
        noSources: t.reports.noSourcesBody,
      }),
    }),
    [report, meta, startupName, t],
  )

  const dateLabel = meta.generatedAt
    ? new Date(meta.generatedAt).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
    : ""

  return (
    <article className="space-y-5">
      <Panel className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={meta.grounded ? "green" : "neutral"}>
                {meta.grounded ? t.reports.withSources : t.reports.noSourcesBadge}
              </Badge>
              {dateLabel && <span className="text-xs text-muted-foreground">{dateLabel}</span>}
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{report.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{report.summary}</p>
            <p className="mt-3 text-xs text-muted-foreground">{fmt(t.reports.findingsCount, counts)}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ExportMenu
              label={t.common.download}
              className={secondaryButtonClass}
              options={[
                {
                  id: "pdf",
                  label: t.common.pdf,
                  hint: t.common.pdfHint,
                  run: async () => {
                    const { exportReport } = await import("@/src/lib/export")
                    await exportReport("pdf", exportPayload(), report.title)
                  },
                },
                {
                  id: "docx",
                  label: t.common.docx,
                  hint: t.common.docxHint,
                  run: async () => {
                    const { exportReport } = await import("@/src/lib/export")
                    await exportReport("docx", exportPayload(), report.title)
                  },
                },
              ]}
            />
            {actions}
          </div>
        </div>
      </Panel>

      {meta.grounded ? (
        <Notice tone="info">{t.reports.groundedBody}</Notice>
      ) : (
        <Notice tone="warning" title={t.reports.noSourcesTitle}>
          {t.reports.noSourcesBody}
        </Notice>
      )}

      <BasisLegend />

      {report.sections.map((section, index) => (
        <Panel key={`${section.heading}-${index}`} className="p-5 sm:p-6">
          <h3 className="text-base font-semibold text-foreground">{section.heading}</h3>
          {section.summary && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.summary}</p>}

          {section.findings.length > 0 && (
            <ul className="mt-4 space-y-3">
              {section.findings.map((finding, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <span className="mt-0.5 shrink-0">
                    <BasisBadge basis={finding.basis} />
                  </span>
                  <span className="min-w-0 text-foreground">
                    {finding.text}
                    {finding.note && <span className="mt-0.5 block text-xs text-muted-foreground">{finding.note}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {section.table && section.table.rows.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-muted/60">
                    {section.table.columns.map((column, i) => (
                      <th key={i} scope="col" className="px-3 py-2 text-xs font-semibold text-foreground">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row, r) => (
                    <tr key={r} className="border-t border-border align-top">
                      {row.map((value, c) => (
                        <td key={c} className="px-3 py-2 text-foreground">
                          {value || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ))}

      {report.nextSteps.length > 0 && (
        <Panel className="p-5 sm:p-6">
          <h3 className="text-base font-semibold text-foreground">{t.reports.nextSteps}</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground">
            {report.nextSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </Panel>
      )}

      {report.limitations.length > 0 && (
        <Panel className="p-5 sm:p-6">
          <h3 className="text-base font-semibold text-foreground">{t.reports.limitations}</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            {report.limitations.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Panel>
      )}

      {meta.grounded && meta.sources.length > 0 && (
        <Panel className="p-5 sm:p-6">
          <h3 className="text-base font-semibold text-foreground">{t.reports.sources}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t.reports.retrieved} {dateLabel}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {meta.sources.map((source, i) => (
              <li key={i}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
                >
                  {source.title} <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </article>
  )
}
