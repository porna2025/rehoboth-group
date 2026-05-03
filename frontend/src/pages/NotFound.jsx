import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NotFound() {
  const { user } = useAuth()
  const home = user?.role === 'client' ? '/client/dashboard'
             : user?.role === 'technicien' ? '/technicien/dashboard'
             : user?.role === 'admin' ? '/admin/dashboard'
             : '/connexion'
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
      <div style={{ fontSize: '5rem', lineHeight: 1, marginBottom: '0.5rem' }}>404</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '0.75rem' }}>Page introuvable</h1>
      <p style={{ color: 'var(--gris)', marginBottom: '1.5rem' }}>La page que vous cherchez n'existe pas ou a été déplacée.</p>
      <Link to={home} style={{ background: 'var(--bleu)', color: 'white', padding: '0.65rem 1.5rem', borderRadius: 'var(--rayon)', textDecoration: 'none', fontWeight: 700 }}>
        Retour à l'accueil
      </Link>
    </div>
  )
}
