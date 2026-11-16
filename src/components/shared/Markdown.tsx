import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/src/lib/utils"

/**
 * Document-style markdown (headings, lists, tables). Raw HTML in the source is
 * not rendered, so AI- or user-written text cannot inject markup.
 */
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("text-sm leading-relaxed text-foreground", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h3 className="mb-2 mt-5 text-base font-semibold first:mt-0">{children}</h3>,
          h2: ({ children }) => <h3 className="mb-2 mt-5 text-base font-semibold first:mt-0">{children}</h3>,
          h3: ({ children }) => <h4 className="mb-1.5 mt-4 text-sm font-semibold first:mt-0">{children}</h4>,
          h4: ({ children }) => <h5 className="mb-1.5 mt-3 text-sm font-semibold first:mt-0">{children}</h5>,
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-primary/40 pl-3 text-muted-foreground">{children}</blockquote>
          ),
          hr: () => <hr className="my-4 border-border" />,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary underline underline-offset-4"
            >
              {children}
            </a>
          ),
          code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{children}</code>,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto rounded-lg border border-border last:mb-0">
              <table className="w-full min-w-[28rem] border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2 text-xs font-semibold">{children}</th>,
          td: ({ children }) => <td className="border-t border-border px-3 py-2 align-top">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
