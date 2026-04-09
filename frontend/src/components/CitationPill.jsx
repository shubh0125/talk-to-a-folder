export default function CitationPill({ index, filename, page, file_id }) {
  const driveUrl = file_id
    ? `https://drive.google.com/file/d/${file_id}/view`
    : null

  const classes = `
    relative group inline-flex items-center gap-1.5 text-xs
    bg-[#1f1f2e] border border-[#7c3aed]/25 text-[#a080e8]
    rounded-full px-3 py-1 mr-1 mb-1
    transition-all duration-150
    ${driveUrl ? 'hover:bg-[#7c3aed]/15 hover:border-[#7c3aed]/50 cursor-pointer' : ''}
  `.trim()

  const content = (
    <>
      {index != null && (
        <span className="font-semibold text-[#7c3aed]">[{index}]</span>
      )}
      <span className="max-w-[180px] truncate">{filename}</span>
      {driveUrl && (
        <svg className="w-2.5 h-2.5 shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )}

      {/* Hover tooltip showing page number */}
      {page > 0 && (
        <span className="
          pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2
          bg-[#0f0f13] border border-[#2e2e45] text-[#c8c8e0] text-[11px]
          rounded-lg px-2.5 py-1 whitespace-nowrap shadow-lg
          opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10
        ">
          Page {page}
        </span>
      )}
    </>
  )

  if (driveUrl) {
    return (
      <a href={driveUrl} target="_blank" rel="noopener noreferrer" className={classes}>
        {content}
      </a>
    )
  }

  return <span className={classes}>{content}</span>
}
