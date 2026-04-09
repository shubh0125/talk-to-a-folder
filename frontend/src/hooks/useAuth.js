import { useState, useEffect } from 'react'
import { authGoogle, logoutUser } from '../api'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const jwt = localStorage.getItem('jwt')
    const userInfo = localStorage.getItem('user_info')
    if (jwt && userInfo) {
      setUser(JSON.parse(userInfo))
    }
    setLoading(false)
  }, [])

  async function handleGoogleSuccess(tokenResponse) {
    const data = await authGoogle(tokenResponse.access_token)
    localStorage.setItem('jwt', data.jwt)
    localStorage.setItem('user_info', JSON.stringify({
      email: data.email,
      name: data.name,
      picture: data.picture
    }))
    setUser({ email: data.email, name: data.name, picture: data.picture })
  }

  async function logout() {
    await logoutUser()
    localStorage.removeItem('jwt')
    localStorage.removeItem('user_info')
    setUser(null)
  }

  return { user, loading, handleGoogleSuccess, logout }
}
