import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axiosConfig'
import { useAuth } from './AuthContext'

const NotificationContext = createContext({ count: 0, refresh: () => {} })

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  const refresh = useCallback(() => {
    if (!user || document.hidden) { setCount(prev => user ? prev : 0); return }
    api.get('/notifications/non-lues/')
      .then(({ data }) => setCount(data.non_lues ?? 0))
      .catch(() => {})
  }, [user])

  useEffect(() => {
    refresh()
    if (!user) return undefined

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refresh()
      }
    }

    const id = setInterval(() => {
      if (!document.hidden) {
        refresh()
      }
    }, 60_000)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refresh])

  return (
    <NotificationContext.Provider value={{ count, refresh }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
