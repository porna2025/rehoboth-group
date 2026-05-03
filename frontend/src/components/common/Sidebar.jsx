import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = {
  client: [
    { to: '/client/dashboard',      icon: '🏠', label: 'Tableau de bord' },
    { to: '/client/techniciens',    icon: '👷', label: 'Trouver un technicien' },
    { to: '/client/demandes/creer', icon: '➕', label: 'Nouvelle demande' },
    { to: '/client/demandes',       icon: '📋', label: 'Mes demandes' },
    { to: '/client/paiements',      icon: '💳', label: 'Mes paiements' },
  ],
  technicien: [
    { to: '/technicien/dashboard',   icon: '🏠', label: 'Tableau de bord' },
    { to: '/technicien/disponibles', icon: '🔍', label: 'Demandes disponibles' },
    { to: '/technicien/missions',    icon: '🛠️', label: 'Mes missions' },
    { to: '/technicien/profil',      icon: '👤', label: 'Mon profil' },
    { to: '/technicien/revenus',     icon: '💰', label: 'Revenus & Retrait' },
  ],
  admin: [
    { to: '/admin/dashboard',      icon: '🏠', label: 'Tableau de bord' },
    { to: '/admin/utilisateurs',   icon: '👥', label: 'Utilisateurs' },
    { to: '/admin/categories',     icon: '🗂️', label: 'Catégories' },
    { to: '/admin/techniciens',    icon: '✅', label: 'Validations' },
    { to: '/admin/demandes',       icon: '📋', label: 'Demandes' },
    { to: '/admin/finances',       icon: '📊', label: 'Rapport financier' },
  ],
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const items = NAV_ITEMS[user?.role] ?? []

  const handleLogout = async () => {
    await logout()
    navigate('/connexion')
  }

  return (
    <aside style={{
      width:      240,
      minHeight:  'calc(100vh - 60px)',
      background: 'var(--blanc)',
      borderRight:'1px solid var(--bordure)',
      display:    'flex',
      flexDirection: 'column',
      padding:    '1rem 0',
      flexShrink: 0,
    }}>
      {/* Rôle badge */}
      <div style={{ padding: '0 1rem 1rem', borderBottom: '1px solid var(--bordure)', marginBottom: '0.5rem' }}>
        <span style={{
          display:      'inline-block',
          padding:      '3px 10px',
          borderRadius: '999px',
          fontSize:     '0.75rem',
          fontWeight:   700,
          textTransform:'uppercase',
          letterSpacing:'0.05em',
          background:   user?.role === 'admin' ? 'var(--rouge-clair)' : user?.role === 'technicien' ? 'var(--vert-clair)' : 'var(--bleu-clair)',
          color:        user?.role === 'admin' ? 'var(--rouge)' : user?.role === 'technicien' ? 'var(--vert)' : 'var(--bleu2)',
        }}>
          {user?.role}
        </span>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display:     'flex',
              alignItems:  'center',
              gap:         10,
              padding:     '0.65rem 1.2rem',
              fontSize:    '0.9rem',
              color:       isActive ? 'var(--bleu2)' : 'var(--texte)',
              background:  isActive ? 'var(--bleu-clair)' : 'transparent',
              borderRight: isActive ? '3px solid var(--bleu2)' : '3px solid transparent',
              fontWeight:  isActive ? 600 : 400,
              transition:  'all 0.15s',
              textDecoration: 'none',
            })}
          >
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        10,
          margin:     '0 1rem',
          padding:    '0.65rem 0.8rem',
          fontSize:   '0.88rem',
          color:      'var(--rouge)',
          background: 'none',
          border:     '1px solid var(--rouge)',
          borderRadius: 'var(--rayon)',
          cursor:     'pointer',
          fontWeight: 500,
        }}
      >
        <span>🚪</span> Déconnexion
      </button>
    </aside>
  )
}
