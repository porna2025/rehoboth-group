import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axiosConfig'
import { useAuth } from './AuthContext'

const NotificationContext = createContext({ count: 0, refresh: () => {} })

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  const refresh = useCallback(() => {
    if (!user) { setCount(0); return }
    api.get('/notifications/non-lues/')
      .then(({ data }) => setCount(data.non_lues ?? 0))
      .catch(() => {})
  }, [user])

  // Rafraîchir toutes les 30 secondes
  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 30_000)
    return () => clearInterval(id)
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
