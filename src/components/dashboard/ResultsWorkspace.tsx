"use client";

import {
  generateResultsWorkspace,
  type ResultDocumentType,
  type ResultsWorkspace,
} from "@/src/app/actions/results";
import { Download, FileText, Loader2, Sparkles } from "lucide-react";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const documentTypes: ResultDocumentType[] = [
  "Business Plan",
  "SWOT",
  "Budget",
  "Marketing Strategy",
  "Roadmap",
  "Elevator Pitch",
];

export function ResultsWorkspace({
  projectId,
  startupName,
  initialWorkspace,
}: {
  projectId: string;
  startupName: string;
  initialWorkspace: ResultsWorkspace | null;
}) {
  const [workspace, setWorkspace] = React.useState(initialWorkspace);
  const [activeType, setActiveType] = React.useState<ResultDocumentType>(
    documentTypes[0],
  );
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState("");

  const activeDocument = workspace?.documents.find(
    (document) => document.type === activeType,
  );
  const generate = () => {
    setError("");
    startTransition(async () => {
      const result = await generateResultsWorkspace(projectId);
      if (result.success) {
        setWorkspace(result.workspace);
        setActiveType(documentTypes[0]);
      } else setError(result.error);
    });
  };

  const downloadWordDocument = (
    documents = workspace?.documents ?? [],
    documentName = "complete-business-plan",
  ) => {
    if (!workspace || documents.length === 0) return;
    const escapeHtml = (value: string) =>
      value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const formatContent = (content: string) =>
      content
        .split("\n")
        .map((line) => {
          const escaped = escapeHtml(line.replace(/\*\*/g, ""));
          if (line.startsWith("## ")) return `<h2>${escaped.slice(3)}</h2>`;
          if (line.startsWith("- "))
            return `<p class="bullet">${escaped.slice(2)}</p>`;
          return line ? `<p>${escaped}</p>` : "";
        })
        .join("");
    const sections = documents
      .map(
        (item, index) =>
          `<section class="${index ? "page-break" : ""}"><h1>${escapeHtml(item.type)}</h1>${formatContent(item.content)}</section>`,
      )
      .join("");
    const title =
      documents.length === 1 ? documents[0].type : "Complete Business Plan";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page { size: A4; margin: 2cm; } body { font-family: Calibri, Arial, sans-serif; color: #1f2937; font-size: 11pt; line-height: 1.55; } h1 { color: #0b5d45; font-size: 24pt; margin: 0 0 18pt; } h2 { color: #0b5d45; font-size: 15pt; margin: 18pt 0 7pt; } p { margin: 0 0 9pt; } .bullet { margin-left: 18pt; } .bullet:before { content: "• "; } .page-break { page-break-before: always; }</style></head><body><section><h1>${escapeHtml(startupName)}: ${escapeHtml(title)}</h1><p>Generated ${new Date(workspace.generatedAt).toLocaleDateString()} · ${documents.length} business-planning section${documents.length === 1 ? "" : "s"}</p><p>This document is structured for review, discussion, and iteration.</p></section><div class="page-break"></div>${sections}</body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${
      startupName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "startup"
    }-${documentName}.doc`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      <div className="flex flex-col gap-5 rounded-3xl bg-[#0b3327] p-8 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-green-200">
            Results workspace
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Your business-building kit
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-green-50/75">
            Generate six practical, connected documents for {startupName} and
            refine them as you learn from customers.
          </p>
        </div>
        <button
          onClick={generate}
          disabled={isPending}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-green-400 px-5 text-sm font-bold text-[#063126] transition hover:bg-green-300 disabled:opacity-60"
        >
          <Sparkles className="size-4" />
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Generating…
            </>
          ) : workspace ? (
            "Regenerate results"
          ) : (
            "Generate results"
          )}
        </button>
        {workspace && (
          <button
            onClick={() => downloadWordDocument()}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-green-200 px-5 text-sm font-bold text-white transition hover:bg-white/10"
          >
            <Download className="size-4" /> Download Word
          </button>
        )}
      </div>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {!workspace ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <FileText className="mx-auto size-9 text-green-700 dark:text-green-400" />
          <h2 className="mt-4 text-lg font-bold text-zinc-950 dark:text-white">
            Ready to turn your interview into action?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Click Generate to create your business plan, SWOT, budget, marketing
            strategy, roadmap, and elevator pitch.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col">
            {documentTypes.map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`whitespace-nowrap rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${activeType === type ? "bg-green-700 text-white" : "bg-white text-zinc-600 hover:bg-green-50 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"}`}
              >
                {type}
              </button>
            ))}
          </nav>
          <article className="min-h-[460px] rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-9">
            <div className="mb-7 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
                  <FileText className="size-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-zinc-950 dark:text-white">{activeDocument?.type}</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Generated{" "}
                    {new Date(workspace.generatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {activeDocument && (
                <button
                  onClick={() =>
                    downloadWordDocument(
                      [activeDocument],
                      activeDocument.type
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-"),
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-green-700 px-3 py-2 text-xs font-bold text-green-800 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-950/40"
                >
                  <Download className="size-3.5" /> Download this document
                </button>
              )}
            </div>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h3 className="mb-3 mt-8 text-2xl font-bold tracking-tight text-zinc-950 first:mt-0 dark:text-white">
                    {children}
                  </h3>
                ),
                h2: ({ children }) => (
                  <h3 className="mb-3 mt-7 text-xl font-bold text-zinc-900 first:mt-0 dark:text-zinc-100">
                    {children}
                  </h3>
                ),
                h3: ({ children }) => (
                  <h4 className="mb-2 mt-6 text-base font-bold text-green-900 first:mt-0 dark:text-green-300">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="mb-4 text-sm leading-7 text-zinc-700 last:mb-0 dark:text-zinc-200">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="mb-4 list-disc space-y-2 pl-5 text-sm leading-7 text-zinc-700 marker:text-green-700 dark:text-zinc-200 dark:marker:text-green-400">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm leading-7 text-zinc-700 marker:font-semibold marker:text-green-700 dark:text-zinc-200 dark:marker:text-green-400">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="pl-1">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-bold text-zinc-950 dark:text-white">
                    {children}
                  </strong>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-green-800 underline underline-offset-2 dark:text-green-300"
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-5 border-l-4 border-green-600 bg-green-50 py-3 pl-4 pr-4 text-sm italic leading-7 text-zinc-700 dark:border-green-500 dark:bg-green-950/40 dark:text-zinc-200">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="my-5 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-green-50 text-green-950 dark:bg-green-950/40 dark:text-green-100">
                    {children}
                  </thead>
                ),
                th: ({ children }) => (
                  <th className="border-b border-zinc-200 px-4 py-3 font-bold dark:border-zinc-700">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border-b border-zinc-100 px-4 py-3 align-top text-zinc-700 last:border-b-0 dark:border-zinc-800 dark:text-zinc-200">
                    {children}
                  </td>
                ),
                code: ({ children, className }) =>
                  className ? (
                    <code className="my-4 block overflow-x-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-6 text-zinc-100">
                      {children}
                    </code>
                  ) : (
                    <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.85em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                      {children}
                    </code>
                  ),
                hr: () => <hr className="my-7 border-zinc-200 dark:border-zinc-700" />,
              }}
            >
              {activeDocument?.content ?? ""}
            </ReactMarkdown>
          </article>
        </div>
      )}
    </div>
  );
}
