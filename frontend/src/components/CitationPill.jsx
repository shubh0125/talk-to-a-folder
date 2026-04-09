export default function CitationPill({ filename, page, file_id }) {
  const driveUrl = file_id
    ? `https://drive.google.com/file/d/${file_id}/view`
    : null

  const label = page ? `${filename} · p.${page}` : filename

  const classes = `
    inline-flex items-center gap-1.5 text-xs
    bg-[#1f1f2e] border border-[#7c3aed]/25 text-[#a080e8]
    rounded-full px-3 py-1 mr-1 mb-1
    transition-all duration-150
    ${driveUrl ? 'hover:bg-[#7c3aed]/15 hover:border-[#7c3aed]/50 cursor-pointer' : ''}
  `.trim()

  const content = (
    <>
      <svg className="w-3 h-3 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
      </svg>
      <span className="max-w-[180px] truncate">{label}</span>
      {driveUrl && (
        <svg className="w-2.5 h-2.5 shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
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
