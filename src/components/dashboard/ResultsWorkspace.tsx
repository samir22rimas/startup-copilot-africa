"use client";

import {
  generateResultsWorkspace,
  type ResultDocumentType,
  type ResultsWorkspace,
} from "@/src/app/actions/results";
import { Download, FileText, Loader2, Sparkles } from "lucide-react";
import * as React from "react";

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
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <FileText className="mx-auto size-9 text-green-700" />
          <h2 className="mt-4 text-lg font-bold">
            Ready to turn your interview into action?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
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
                className={`whitespace-nowrap rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${activeType === type ? "bg-green-700 text-white" : "bg-white text-zinc-600 hover:bg-green-50"}`}
              >
                {type}
              </button>
            ))}
          </nav>
          <article className="min-h-[460px] rounded-3xl border border-zinc-200 p-7 shadow-sm sm:p-9">
            <div className="mb-7 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
                  <FileText className="size-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold">{activeDocument?.type}</h2>
                  <p className="text-xs text-zinc-500">
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
                  className="inline-flex items-center gap-2 rounded-lg border border-green-700 px-3 py-2 text-xs font-bold text-green-800 hover:bg-green-50"
                >
                  <Download className="size-3.5" /> Download this document
                </button>
              )}
            </div>
            <div className="prose prose-zinc max-w-none whitespace-pre-line text-sm leading-7">
              {activeDocument?.content}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
