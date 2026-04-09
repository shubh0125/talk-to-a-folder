const BASE_URL = import.meta.env.VITE_BACKEND_URL

function getHeaders() {
  const token = localStorage.getItem('jwt')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

export async function authGoogle(access_token) {
  const res = await fetch(`${BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token })
  })
  if (!res.ok) throw new Error('Authentication failed')
  return res.json()
}

export async function getFolderStatus() {
  const res = await fetch(`${BASE_URL}/folder/status`, { headers: getHeaders() })
  if (res.status === 401) {
    const err = new Error('Unauthorized')
    err.status = 401
    throw err
  }
  if (!res.ok) throw new Error('Failed to get folder status')
  return res.json()
}

export function loadFolderStream(folder_url, onProgress, onDone, onError) {
  const token = localStorage.getItem('jwt')
  fetch(`${BASE_URL}/folder/load`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ folder_url })
  }).then(res => {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    function read() {
      reader.read().then(({ done, value }) => {
        if (done) return
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        let event = 'progress'
        for (const line of lines) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim()
            if (event === 'done') onDone(JSON.parse(data))
            else if (event === 'error') onError(data)
            else onProgress(data)
            event = 'progress'
          }
        }
        read()
      })
    }
    read()
  }).catch(onError)
}

export async function sendChat(question) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ question })
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Chat failed')
  }
  return res.json()
}

export async function clearFolder() {
  const res = await fetch(`${BASE_URL}/folder/clear`, {
    method: 'DELETE',
    headers: getHeaders()
  })
  if (!res.ok) throw new Error('Failed to clear folder')
  return res.json()
}

export async function logoutUser() {
  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getHeaders()
    })
  } catch {
    // Best-effort — always clear local state regardless
  }
}
