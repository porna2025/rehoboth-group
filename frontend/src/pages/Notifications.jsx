import { useState, useEffect } from 'react'
import { notificationApi } from '../api/notificationApi'
import { useNotifications } from '../context/NotificationContext'
import Spinner from '../components/common/Spinner'
import { formatDateTime } from '../utils/formatters'

export default function Notifications() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const { refresh } = useNotifications()

  const charger = () => {
    setLoading(true)
    notificationApi.getNotifications()
      .then(({ data }) => {
        setItems(data.results ?? data)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { charger() }, [])

  const handleLireTout = async () => {
    await notificationApi.lireTout()
    charger(); refresh()
  }

  const handleLire = async (id) => {
    await notificationApi.lireNotification(id)
    setItems(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n))
    refresh()
  }

  const handleSupprimer = async (id) => {
    await notificationApi.supprimerNotification(id)
    setItems(prev => prev.filter(n => n.id !== id))
    refresh()
  }

  const nonLues = items.filter(n => !n.lu).length

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', margin: 0 }}>
          Notifications
          {nonLues > 0 && (
            <span style={{ marginLeft: '0.6rem', background: 'var(--rouge)', color: 'white', borderRadius: '99px', padding: '2px 8px', fontSize: '0.78rem', verticalAlign: 'middle' }}>
              {nonLues}
            </span>
          )}
        </h1>
        {nonLues > 0 && (
          <button onClick={handleLireTout} style={{ background: 'var(--bleu-clair)', color: 'var(--bleu)', border: 'none', borderRadius: 'var(--rayon)', padding: '6px 14px', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 600 }}>
            ✅ Tout marquer comme lu
          </button>
        )}
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gris)', background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', boxShadow: 'var(--ombre)' }}>
          🔔 Vous n'avez aucune notification.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {items.map(n => (
            <div key={n.id} style={{
              background: n.lu ? 'var(--blanc)' : 'var(--bleu-clair)',
              borderLeft: n.lu ? '3px solid transparent' : '3px solid var(--bleu)',
              borderRadius: 'var(--rayon)',
              padding: '1rem 1.25rem',
              boxShadow: 'var(--ombre)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1rem',
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 0.3rem', fontSize: '0.9rem', fontWeight: n.lu ? 400 : 600 }}>{n.message}</p>
                <span style={{ fontSize: '0.76rem', color: 'var(--gris)' }}>{formatDateTime(n.created_at)}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                {!n.lu && (
                  <button onClick={() => handleLire(n.id)} title="Marquer comme lu" style={styles.iconBtn}>✓</button>
                )}
                <button onClick={() => handleSupprimer(n.id)} title="Supprimer" style={{ ...styles.iconBtn, color: 'var(--rouge)' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  iconBtn: { background: 'none', border: '1px solid var(--bordure)', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
}
