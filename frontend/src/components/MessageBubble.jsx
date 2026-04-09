import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import CitationPill from './CitationPill'

const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,

  h1: ({ children }) => <h1 className="text-lg font-bold text-white mb-2 mt-3 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold text-white mb-2 mt-3 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-white mb-1 mt-2 first:mt-0">{children}</h3>,

  ul: ({ children }) => <ul className="list-disc list-outside pl-4 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside pl-4 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,

  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-[#c8c8e0]">{children}</em>,

  code: ({ inline, children }) =>
    inline ? (
      <code className="bg-[#16161f] border border-[#2e2e45] text-[#a78bfa] text-xs px-1.5 py-0.5 rounded font-mono">
        {children}
      </code>
    ) : (
      <pre className="bg-[#16161f] border border-[#2e2e45] rounded-xl p-3 overflow-x-auto my-2">
        <code className="text-[#a78bfa] text-xs font-mono">{children}</code>
      </pre>
    ),

  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#7c3aed] pl-3 my-2 text-[#9090aa] italic">
      {children}
    </blockquote>
  ),

  table: ({ children }) => (
    <div className="overflow-x-auto my-2 rounded-xl border border-[#2e2e45]">
      <table className="w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-[#2e2e45] last:border-0">{children}</tr>,
  th: ({ children }) => (
    <th className="text-left text-[#7c3aed] font-semibold px-3 py-2 bg-[#16161f]">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2 text-[#c8c8e0]">{children}</td>,

  hr: () => <hr className="border-[#2e2e45] my-3" />,

  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#a78bfa] underline underline-offset-2 hover:text-[#7c3aed] transition-colors"
    >
      {children}
    </a>
  ),
}

export default function MessageBubble({ role, content, citations }) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5`}>
      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm ${
            isUser
              ? 'bg-[#7c3aed] text-white rounded-br-sm shadow-lg shadow-[#7c3aed]/20'
              : 'bg-[#1f1f2e] text-[#c8c8e0] border border-[#2e2e45] rounded-bl-sm shadow-md shadow-black/20'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          )}
        </div>

        {!isUser && citations && citations.length > 0 && (
          <div className="flex flex-wrap mt-2 max-w-full">
            {citations.map((c, i) => (
              <CitationPill key={i} filename={c.filename} page={c.page} file_id={c.file_id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
