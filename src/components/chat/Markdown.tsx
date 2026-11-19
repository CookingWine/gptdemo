import { isValidElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChevronRight } from 'lucide-react'
import { CodeBlock } from './CodeBlock'

function extractCode(children: ReactNode) {
  const child = Array.isArray(children) ? children[0] : children
  if (isValidElement<{ className?: string; children?: ReactNode }>(child)) {
    const className = child.props.className ?? ''
    const match = /language-(\w+)/.exec(className)
    return {
      language: match?.[1] ?? 'text',
      code: String(child.props.children ?? '').replace(/\n$/, ''),
    }
  }
  return { language: 'text', code: String(children ?? '') }
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="markdown-body text-[13.5px] leading-[1.75] text-fg-secondary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-2.5 mt-5 text-[17px] font-semibold text-fg first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-5 text-[15px] font-semibold text-fg first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-4 text-[14px] font-semibold text-fg first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-1.5 mt-3 text-[13px] font-semibold text-fg first:mt-0">{children}</h4>
          ),
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5 marker:text-fg-dim">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-fg-dim">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-0.5">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
          em: ({ children }) => <em className="text-fg-secondary">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-accent-soft underline decoration-accent/40 underline-offset-2 hover:text-accent"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 flex gap-2 rounded-r-md border-l-2 border-accent/50 bg-ink-800/50 py-2 pl-3 pr-3 text-[12.5px] text-fg-muted">
              <ChevronRight size={13} className="mt-1 shrink-0 text-accent/70" />
              <div className="min-w-0 flex-1 [&>p]:my-0.5">{children}</div>
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-ink-700" />,
          pre: ({ children }) => {
            const { language, code } = extractCode(children)
            return <CodeBlock language={language} code={code} />
          },
          code: ({ children }) => (
            <code className="rounded border border-ink-600 bg-ink-800 px-1 py-0.5 font-mono text-[12px] text-accent-soft">
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-ink-600">
              <table className="w-full border-collapse text-[12.5px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-ink-800/70">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-ink-600 px-3 py-2 text-left font-medium text-fg">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-ink-700/60 px-3 py-2 text-fg-secondary last:border-0">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
