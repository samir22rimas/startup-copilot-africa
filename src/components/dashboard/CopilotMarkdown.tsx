"use client"

import ReactMarkdown from "react-markdown"
import { cn } from "@/src/lib/utils"

export function CopilotMarkdown({
  content,
  variant = "assistant",
}: {
  content: string
  variant?: "assistant" | "user"
}) {
  const isUser = variant === "user"

  return (
    <div
      className={cn(
        "copilot-md text-xs leading-relaxed sm:text-sm",
        isUser ? "text-white" : "text-zinc-800 dark:text-zinc-200",
      )}
    >
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className={cn("font-bold", isUser ? "text-white" : "text-zinc-950 dark:text-white")}>
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic opacity-90">{children}</em>,
          h1: ({ children }) => (
            <h3
              className={cn(
                "mb-2 mt-1 text-sm font-bold sm:text-base",
                isUser ? "text-white" : "text-zinc-950 dark:text-white",
              )}
            >
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3
              className={cn(
                "mb-2 mt-3 text-sm font-bold first:mt-0",
                isUser ? "text-white" : "text-zinc-950 dark:text-white",
              )}
            >
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4
              className={cn(
                "mb-1.5 mt-3 text-[11px] font-bold uppercase tracking-wide first:mt-0 sm:text-xs",
                isUser ? "text-green-100" : "text-green-800 dark:text-green-300",
              )}
            >
              {children}
            </h4>
          ),
          ul: ({ children }) => <ul className="mb-3 space-y-2 pl-0 last:mb-0">{children}</ul>,
          ol: ({ children }) => (
            <ol
              className={cn(
                "mb-3 list-decimal space-y-2 pl-5 last:mb-0",
                isUser ? "marker:font-bold marker:text-green-100" : "marker:font-bold marker:text-green-700 dark:marker:text-green-400",
              )}
            >
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li
              className={cn(
                "relative leading-relaxed pl-5 [ol>&]:pl-1",
                "before:absolute before:left-0 before:top-[0.4em] before:size-1.5 before:rounded-full [ol>&]:before:hidden",
                isUser ? "before:bg-green-200" : "before:bg-green-600 dark:before:bg-green-400",
              )}
            >
              {children}
            </li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "underline underline-offset-2",
                isUser ? "text-green-100" : "text-green-700 dark:text-green-400",
              )}
            >
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const inline = !className
            if (inline) {
              return (
                <code
                  className={cn(
                    "rounded px-1 py-0.5 font-mono text-[11px]",
                    isUser
                      ? "bg-green-800/60 text-green-50"
                      : "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100",
                  )}
                >
                  {children}
                </code>
              )
            }
            return (
              <code className="block overflow-x-auto rounded-xl bg-zinc-900/90 p-3 text-[11px] text-zinc-100">
                {children}
              </code>
            )
          },
          blockquote: ({ children }) => (
            <blockquote
              className={cn(
                "my-2 border-l-2 pl-3 text-[11px] sm:text-xs",
                isUser
                  ? "border-green-300/60 text-green-50/90"
                  : "border-green-600 text-zinc-600 dark:text-zinc-300",
              )}
            >
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr
              className={cn(
                "my-3 border-0 border-t",
                isUser ? "border-green-500/40" : "border-zinc-200 dark:border-zinc-700",
              )}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
