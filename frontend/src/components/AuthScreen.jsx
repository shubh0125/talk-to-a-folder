import { useGoogleLogin } from '@react-oauth/google'

export default function AuthScreen({ onSuccess }) {
  const login = useGoogleLogin({
    onSuccess,
    scope: 'openid email profile https://www.googleapis.com/auth/drive.readonly'
  })

  return (
    <div className="min-h-screen bg-[#16161f] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#7c3aed]/20 border border-[#7c3aed]/40 flex items-center justify-center shadow-lg shadow-[#7c3aed]/10">
            <svg className="w-8 h-8 text-[#7c3aed]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14h8M8 17h5" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Talk to a Folder</h1>
        <p className="text-[#9090aa] text-base mb-8">
          Paste any Google Drive folder link and chat with your documents using AI
        </p>

        {/* Sign in button */}
        <button
          onClick={() => login()}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-medium py-3 px-6 rounded-xl transition-colors duration-150 shadow-xl"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        {/* Feature list */}
        <div className="mt-10 grid grid-cols-1 gap-3 text-left">
          {[
            { icon: '📁', text: 'Connect any Google Drive folder' },
            { icon: '🔍', text: 'Smart semantic search across all docs' },
            { icon: '💬', text: 'Chat with AI — answers cite sources' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 bg-[#1f1f2e] rounded-xl px-4 py-3 border border-[#2e2e45]">
              <span className="text-lg">{item.icon}</span>
              <span className="text-[#b0b0c8] text-sm">{item.text}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[#55556a] text-xs">
          Your Drive files are read-only. Nothing is modified or stored permanently.
        </p>
      </div>
    </div>
  )
}
