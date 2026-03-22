"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const proseClasses = {
  div: "prose-soul",
  h1: "mt-6 mb-3 text-lg font-semibold text-slate-900 first:mt-0",
  h2: "mt-5 mb-2 text-base font-semibold text-slate-900 first:mt-0",
  h3: "mt-4 mb-1.5 text-sm font-semibold text-slate-800 first:mt-0",
  p: "text-sm text-slate-700 leading-relaxed my-2",
  ul: "my-3 list-disc pl-5 space-y-1 text-sm text-slate-700",
  ol: "my-3 list-decimal pl-5 space-y-1 text-sm text-slate-700",
  li: "leading-relaxed",
  strong: "font-semibold text-slate-800",
  code: "rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700",
  pre: "my-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700",
  blockquote: "border-l-4 border-slate-200 pl-4 my-3 text-slate-600 text-sm italic",
  hr: "my-4 border-slate-200",
  a: "text-indigo-600 underline-offset-2 hover:underline",
};

export function MarkdownViewer({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("font-sans", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className={proseClasses.h1}>{children}</h1>,
          h2: ({ children }) => <h2 className={proseClasses.h2}>{children}</h2>,
          h3: ({ children }) => <h3 className={proseClasses.h3}>{children}</h3>,
          p: ({ children }) => <p className={proseClasses.p}>{children}</p>,
          ul: ({ children }) => <ul className={proseClasses.ul}>{children}</ul>,
          ol: ({ children }) => <ol className={proseClasses.ol}>{children}</ol>,
          li: ({ children }) => <li className={proseClasses.li}>{children}</li>,
          strong: ({ children }) => <strong className={proseClasses.strong}>{children}</strong>,
          code: ({ className: c, ...props }) => {
            const isBlock = c?.startsWith("language-");
            if (isBlock) {
              return <code className={cn(proseClasses.pre, "block p-3")} {...props} />;
            }
            return <code className={proseClasses.code} {...props} />;
          },
          pre: ({ children }) => <pre className={proseClasses.pre}>{children}</pre>,
          blockquote: ({ children }) => <blockquote className={proseClasses.blockquote}>{children}</blockquote>,
          hr: () => <hr className={proseClasses.hr} />,
          a: ({ href, children }) => (
            <a href={href} className={proseClasses.a} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
