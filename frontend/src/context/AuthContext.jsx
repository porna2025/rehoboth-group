import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axiosConfig'
import { authApi } from '../api/authApi'

const AuthContext = createContext(null)
const BACKEND_WARMUP_KEY = 'rehoboth_backend_warmup_done'
const AUTH_USER_KEY = 'rehoboth_auth_user'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionStorage.getItem(BACKEND_WARMUP_KEY) === '1') {
      return
    }

    sessionStorage.setItem(BACKEND_WARMUP_KEY, '1')
    authApi.warmupBackend().catch(() => {})
  }, [])

  // Charger le profil si un token existe au démarrage
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const cachedUser = localStorage.getItem(AUTH_USER_KEY)

    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser))
      } catch (_) {
        localStorage.removeItem(AUTH_USER_KEY)
      }
    }

    if (token) {
      api.get('/auth/profil/')
        .then(({ data }) => {
          setUser(data)
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data))
        })
        .catch(() => {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem(AUTH_USER_KEY)
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const completeLogin = useCallback((data) => {
    localStorage.setItem('access_token', data.tokens.access)
    localStorage.setItem('refresh_token', data.tokens.refresh)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const login = useCallback(async (email, motDePasse) => {
    const { data } = await authApi.connexion(email, motDePasse)
    if (data.requires_2fa) {
      return data
    }
    completeLogin(data)
    return data.user
  }, [completeLogin])

  const verifyOtpLogin = useCallback(async (payload) => {
    const { data } = await authApi.verifierOtpConnexion(payload)
    completeLogin(data)
    return data.user
  }, [completeLogin])

  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) await api.post('/auth/deconnexion/', { refresh })
    } catch (_) { /* ignore */ }
    localStorage.clear()
    setUser(null)
  }, [])

  const updateUser = useCallback((partial) => {
    setUser(prev => {
      const nextUser = { ...prev, ...partial }
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
      return nextUser
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyOtpLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
