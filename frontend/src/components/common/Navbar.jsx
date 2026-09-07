import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { notificationApi } from '../../api/notificationApi'
import { formatDateTime } from '../../utils/formatters'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { count, refresh } = useNotifications()
  const navigate = useNavigate()

  const [notifOpen,    setNotifOpen]    = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loadingNotif,  setLoadingNotif]  = useState(false)
  const [menuOpen,      setMenuOpen]      = useState(false)

  const notifRef = useRef(null)
  const menuRef  = useRef(null)

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (menuRef.current  && !menuRef.current.contains(e.target))  setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openNotifications = async () => {
    if (!notifOpen) {
      setLoadingNotif(true)
      try {
        const { data } = await notificationApi.getNotifications()
        setNotifications(data.results ?? data)
      } catch (_) {}
      setLoadingNotif(false)
    }
    setNotifOpen(prev => !prev)
  }

  const handleLireTout = async () => {
    await notificationApi.lireTout()
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })))
    refresh()
  }

  const handleLogout = async () => {
    await logout()
    navigate('/connexion')
  }

  const dashboardLink =
    user?.role === 'admin'      ? '/admin/dashboard'
    : user?.role === 'technicien' ? '/technicien/dashboard'
    : '/client/dashboard'

  const initiales = user
    ? `${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase()
    : '?'

  return (
    <header style={{
      background:    'var(--bleu)',
      color:         'white',
      height:        60,
      display:       'flex',
      alignItems:    'center',
      padding:       '0 1.5rem',
      position:      'sticky',
      top:           0,
      zIndex:        100,
      boxShadow:     '0 2px 8px rgba(0,0,0,0.15)',
      gap:           '1rem',
    }}>
      {/* Logo */}
      <Link to={dashboardLink} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'white', fontWeight: 700, fontSize: '1.1rem' }}>
        <img
          src="/rehoboth-logo-small.svg"
          alt="Logo Rehoboth Group"
          style={{ width: 82, height: 'auto', display: 'block' }}
        />
      </Link>

      <div style={{ flex: 1 }} />

      {user ? (
        <>
          {/* Notifications */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button
              onClick={openNotifications}
              aria-label="Notifications"
              style={{
                background:   'transparent',
                border:       'none',
                cursor:       'pointer',
                color:        'white',
                position:     'relative',
                padding:      '6px',
                borderRadius: '50%',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>🔔</span>
              {count > 0 && (
                <span style={{
                  position:    'absolute',
                  top:         0,
                  right:       0,
                  background:  'var(--rouge)',
                  color:       'white',
                  borderRadius:'50%',
                  width:       18,
                  height:      18,
                  fontSize:    '0.68rem',
                  fontWeight:  700,
                  display:     'flex',
                  alignItems:  'center',
                  justifyContent: 'center',
                }}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>

            {/* Dropdown notifications */}
            {notifOpen && (
              <div style={{
                position:   'absolute',
                right:      0,
                top:        '110%',
                width:      340,
                background: 'var(--blanc)',
                borderRadius: 'var(--rayon)',
                boxShadow:  '0 8px 24px rgba(0,0,0,0.15)',
                color:      'var(--texte)',
                animation:  'fadeIn 0.15s ease',
                overflow:   'hidden',
                zIndex:     200,
              }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--bordure)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem' }}>Notifications</strong>
                  <button onClick={handleLireTout} style={{ background: 'none', border: 'none', color: 'var(--bleu2)', cursor: 'pointer', fontSize: '0.78rem' }}>
                    Tout lire
                  </button>
                </div>
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {loadingNotif ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--gris)' }}>Chargement…</div>
                  ) : notifications.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--gris)', fontSize: '0.88rem' }}>Aucune notification</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} style={{
                        padding:    '0.75rem 1rem',
                        borderBottom: '1px solid var(--bordure)',
                        background: n.lu ? 'white' : 'var(--bleu-clair)',
                      }}>
                        <div style={{ fontWeight: n.lu ? 400 : 600, fontSize: '0.85rem' }}>{n.titre}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--gris)', marginTop: 2 }}>{n.message}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--gris)', marginTop: 4 }}>{formatDateTime(n.created_at)}</div>
                      </div>
                    ))
                  )}
                </div>
                <Link to="/notifications" onClick={() => setNotifOpen(false)} style={{
                  display: 'block',
                  padding: '0.6rem 1rem',
                  textAlign: 'center',
                  fontSize: '0.82rem',
                  color: 'var(--bleu2)',
                  borderTop: '1px solid var(--bordure)',
                }}>
                  Voir toutes les notifications →
                </Link>
              </div>
            )}
          </div>

          {/* Menu utilisateur */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              style={{
                background:   'rgba(255,255,255,0.15)',
                border:       'none',
                cursor:       'pointer',
                color:        'white',
                borderRadius: '50%',
                width:        38,
                height:       38,
                fontWeight:   700,
                fontSize:     '0.9rem',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
              }}
              aria-label="Menu compte"
            >
              {user.photo_profil ? (
                <img src={user.photo_profil} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
              ) : initiales}
            </button>

            {menuOpen && (
              <div style={{
                position:   'absolute',
                right:      0,
                top:        '110%',
                minWidth:   180,
                background: 'var(--blanc)',
                borderRadius: 'var(--rayon)',
                boxShadow:  '0 8px 24px rgba(0,0,0,0.15)',
                color:      'var(--texte)',
                animation:  'fadeIn 0.15s ease',
                overflow:   'hidden',
                zIndex:     200,
              }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--bordure)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.prenom} {user.nom}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gris)' }}>{user.email}</div>
                </div>
                {[
                  { label: 'Mon profil', to: '/profil' },
                ].map(item => (
                  <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)} style={{
                    display: 'block',
                    padding: '0.65rem 1rem',
                    fontSize: '0.88rem',
                    color: 'var(--texte)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bleu-clair)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  style={{
                    display:    'block',
                    width:      '100%',
                    textAlign:  'left',
                    padding:    '0.65rem 1rem',
                    fontSize:   '0.88rem',
                    color:      'var(--rouge)',
                    background: 'none',
                    border:     'none',
                    borderTop:  '1px solid var(--bordure)',
                    cursor:     'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--rouge-clair)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <Link to="/connexion" style={{
          background: 'white',
          color: 'var(--bleu)',
          padding: '6px 16px',
          borderRadius: 'var(--rayon)',
          fontWeight: 600,
          fontSize: '0.88rem',
        }}>
          Connexion
        </Link>
      )}
    </header>
  )
}
