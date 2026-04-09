import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { useSSE } from './hooks/useSSE'
import AuthScreen from './components/AuthScreen'
import FolderLoader from './components/FolderLoader'
import FileList from './components/FileList'
import ChatWindow from './components/ChatWindow'
import ProgressStream from './components/ProgressStream'
import { getFolderStatus, sendChat, clearFolder } from './api'

const STORAGE_CHAT_KEY = 'chat_messages'

export default function App() {
  const { user, loading, handleGoogleSuccess, logout } = useAuth()
  const { messages: progressMessages, loading: sseLoading, startLoad, clearMessages } = useSSE()

  const [folderLoaded, setFolderLoaded] = useState(false)
  const [statusChecking, setStatusChecking] = useState(true)
  const [files, setFiles] = useState([])
  const [folderUrl, setFolderUrl] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // On login: check Pinecone for existing folder — works on any device
  useEffect(() => {
    if (!user) {
      setStatusChecking(false)
      return
    }

    // Always set true at the start so the spinner shows while we check
    setStatusChecking(true)

    const savedChat = localStorage.getItem(STORAGE_CHAT_KEY)
    if (savedChat) {
      try { setChatMessages(JSON.parse(savedChat)) } catch { /* ignore */ }
    }

    getFolderStatus().then(status => {
      if (status.loaded) {
        setFolderLoaded(true)
        setFiles(status.files || [])
        if (status.folder_url) setFolderUrl(status.folder_url)
      } else {
        setFolderLoaded(false)
        localStorage.removeItem(STORAGE_CHAT_KEY)
      }
    }).catch((err) => {
      if (err.status === 401) {
        localStorage.removeItem('jwt')
        localStorage.removeItem('user_info')
        localStorage.removeItem(STORAGE_CHAT_KEY)
        window.location.reload()
      }
    }).finally(() => {
      setStatusChecking(false)
    })
  }, [user])

  function persistChat(messages) {
    localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages))
  }

  async function handleSendMessage(question) {
    const updated = [...chatMessages, { role: 'user', content: question }]
    setChatMessages(updated)
    persistChat(updated)
    setChatLoading(true)
    try {
      const data = await sendChat(question)
      const withReply = [...updated, {
        role: 'assistant',
        content: data.answer,
        citations: data.citations
      }]
      setChatMessages(withReply)
      persistChat(withReply)
    } catch (e) {
      const withError = [...updated, {
        role: 'assistant',
        content: `Error: ${e.message}`,
        citations: []
      }]
      setChatMessages(withError)
      persistChat(withError)
    }
    setChatLoading(false)
  }

  async function handleClearFolder() {
    await clearFolder()
    setFolderLoaded(false)
    setFiles([])
    setFolderUrl('')
    setChatMessages([])
    setShowLoader(true)
    clearMessages()
    localStorage.removeItem(STORAGE_CHAT_KEY)
  }

  function handleFolderLoaded(data) {
    setFiles(data.files)
    setFolderLoaded(true)
    setShowLoader(false)
    setIsRefreshing(false)
    // Clear chat only when loading a brand new folder URL
    if (data.folder_url !== folderUrl) {
      setChatMessages([])
      localStorage.removeItem(STORAGE_CHAT_KEY)
    }
    if (data.folder_url) setFolderUrl(data.folder_url)
  }

  function handleRefresh() {
    setIsRefreshing(true)
    setShowLoader(false)
    // Re-run ingestion on the same folder URL — picks up any new files
    startLoad(folderUrl, (data) => {
      setFiles(data.files)
      setIsRefreshing(false)
    })
  }

  if (loading || statusChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f0f13]">
        <div className="w-8 h-8 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <AuthScreen onSuccess={handleGoogleSuccess} />
  }

  return (
    <div className="flex flex-col h-screen bg-[#16161f]">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[#2e2e45] bg-[#1a1a28] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#7c3aed]/20 border border-[#7c3aed]/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#7c3aed]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <span className="font-semibold text-white text-sm">Talk to a Folder</span>
        </div>
        <div className="flex items-center gap-3">
          {user.picture ? (
            <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#7c3aed] flex items-center justify-center text-white text-xs font-medium">
              {user.name?.[0] || user.email?.[0] || '?'}
            </div>
          )}
          <span className="text-[#9090aa] text-sm hidden sm:inline">{user.name || user.email}</span>
          <button
            onClick={logout}
            className="text-[#55556a] hover:text-[#9090aa] text-xs transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      {!folderLoaded || showLoader ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-[#16161f]">
          <FolderLoader
            onFolderLoaded={handleFolderLoaded}
            sseMessages={progressMessages}
            sseLoading={sseLoading}
            startLoad={startLoad}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar */}
          <aside className="w-72 shrink-0 border-r border-[#2e2e45] bg-[#1a1a28] flex flex-col p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-[#55556a] uppercase tracking-wider">Loaded Folder</h2>
              <button
                onClick={handleClearFolder}
                className="text-xs text-[#55556a] hover:text-[#7c3aed] transition-colors"
              >
                Load new
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <FileList files={files} />
            </div>

            {/* Refresh progress — inline in sidebar */}
            {isRefreshing && progressMessages.length > 0 && (
              <div className="mt-3 bg-[#16161f] border border-[#2e2e45] rounded-xl p-3">
                <p className="text-xs text-[#7c3aed] font-medium mb-2">Refreshing folder...</p>
                <ProgressStream messages={progressMessages} loading={sseLoading} />
              </div>
            )}

            {/* Refresh folder button — at the bottom of the sidebar */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || sseLoading}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-[#262638] hover:bg-[#7c3aed]/10 border border-[#2e2e45] hover:border-[#7c3aed]/40 disabled:opacity-40 disabled:cursor-not-allowed text-[#9090aa] hover:text-[#7c3aed] text-sm py-2.5 rounded-xl transition-colors"
            >
              <svg
                className={`w-4 h-4 ${isRefreshing || sseLoading ? 'animate-spin' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isRefreshing || sseLoading ? 'Refreshing...' : 'Refresh Folder Contents'}
            </button>
          </aside>

          {/* Chat area */}
          <main className="flex-1 overflow-hidden">
            <ChatWindow
              messages={chatMessages}
              onSend={handleSendMessage}
              loading={chatLoading}
              onNewChat={() => {
                setChatMessages([])
                localStorage.removeItem(STORAGE_CHAT_KEY)
              }}
            />
          </main>
        </div>
      )}

    </div>
  )
}
