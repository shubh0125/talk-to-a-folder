import { useState } from 'react'
import { loadFolderStream } from '../api'

export function useSSE() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)

  function appendMessage(msg) {
    setMessages(prev => [...prev, msg])
  }

  function startLoad(folder_url, onDone) {
    setLoading(true)
    setMessages([])
    loadFolderStream(
      folder_url,
      (msg) => appendMessage(msg),
      (data) => { setLoading(false); onDone(data) },
      (err) => { setLoading(false); appendMessage(`Error: ${err}`) }
    )
  }

  function clearMessages() {
    setMessages([])
  }

  return { messages, loading, startLoad, clearMessages }
}
