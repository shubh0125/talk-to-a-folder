const MIME_ICONS = {
  'application/vnd.google-apps.document':      { icon: '📄', label: 'Doc' },
  'application/vnd.google-apps.spreadsheet':   { icon: '📊', label: 'Sheet' },
  'application/vnd.google-apps.presentation':  { icon: '📑', label: 'Slides' },
  'application/pdf':                           { icon: '📕', label: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':   { icon: '📄', label: 'DOCX' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: '📑', label: 'PPTX' },
  'text/plain':                                { icon: '📃', label: 'TXT' },
}

export default function FileList({ files }) {
  if (!files || files.length === 0) return null

  return (
    <div className="mt-1">
      <p className="text-xs text-[#55556a] uppercase tracking-wider font-medium mb-2">
        {files.length} file{files.length !== 1 ? 's' : ''} indexed
      </p>
      <div className="space-y-1.5">
        {files.map((file) => {
          const { icon, label } = MIME_ICONS[file.mime_type] || { icon: '📎', label: 'File' }
          return (
            <div
              key={file.file_id}
              className="flex items-center gap-3 bg-[#262638] border border-[#2e2e45] hover:border-[#3e3e58] rounded-xl px-3 py-2.5 transition-colors"
            >
              <span className="text-base shrink-0">{icon}</span>
              <span className="text-[#c8c8e0] text-sm truncate flex-1">{file.name}</span>
              <span className="text-xs text-[#7c3aed] bg-[#7c3aed]/10 border border-[#7c3aed]/20 px-2 py-0.5 rounded-full shrink-0">
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
