import { useState } from 'react'
import ProgressStream from './ProgressStream'

export default function FolderLoader({ onFolderLoaded, sseMessages, sseLoading, startLoad }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    if (!trimmed.includes('drive.google.com/drive/folders')) {
      setError('Please enter a valid Google Drive folder URL')
      return
    }
    setError('')
    startLoad(trimmed, onFolderLoaded)
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-[#1f1f2e] border border-[#2e2e45] rounded-2xl p-6 shadow-xl shadow-black/20">
        <h2 className="text-lg font-semibold text-white mb-1">Load a Google Drive Folder</h2>
        <p className="text-[#9090aa] text-sm mb-5">
          Paste the link to a shared Google Drive folder. All supported documents will be indexed.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={e => { setUrl(e.target.value); setError('') }}
            placeholder="https://drive.google.com/drive/folders/..."
            disabled={sseLoading}
            className="flex-1 bg-[#16161f] border border-[#2e2e45] focus:border-[#7c3aed]/60 text-[#e8e8f0] placeholder-[#55556a] text-sm rounded-xl px-4 py-2.5 outline-none transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sseLoading || !url.trim()}
            className="bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shrink-0 shadow-lg shadow-[#7c3aed]/20"
          >
            {sseLoading ? 'Loading...' : 'Load'}
          </button>
        </form>

        {error && <p className="mt-2 text-red-400 text-xs">{error}</p>}

        {(sseLoading || sseMessages.length > 0) && (
          <div className="mt-5">
            <ProgressStream messages={sseMessages} loading={sseLoading} />
          </div>
        )}
      </div>
    </div>
  )
}
