import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from './Spinner'

/**
 * Protège une route selon l'état d'authentification et le rôle.
 * Props:
 *   - roles: string[] — rôles autorisés (ex: ['client', 'admin'])
 *   - redirectTo: string — où rediriger si non autorisé (défaut: /connexion)
 */
export default function ProtectedRoute({ children, roles = [], redirectTo = '/connexion' }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner fullPage />

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    // Rediriger vers le dashboard du bon rôle
    const fallback = user.role === 'admin'
      ? '/admin/dashboard'
      : user.role === 'technicien'
        ? '/technicien/dashboard'
        : '/client/dashboard'
    return <Navigate to={fallback} replace />
  }

  // Utilisé comme layout route dans App.jsx (<Route element={<ProtectedRoute />}>)
  // → doit rendre <Outlet /> pour afficher les routes enfants
  return <Outlet />
}
