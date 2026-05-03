import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { demandeApi } from '../../api/demandeApi'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { formatDate, formatDateTime, STATUT_DEMANDE } from '../../utils/formatters'

export default function DemandesDisponibles() {
  const [demandes, setDemandes] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [accepting, setAccepting] = useState(false)
  const navigate = useNavigate()

  const charger = () => {
    setLoading(true)
    demandeApi.getDemandesDisponibles()
      .then(({ data }) => setDemandes(data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { charger() }, [])

  const handleAccepter = async () => {
    if (!selected) return
    setAccepting(true)
    try {
      await demandeApi.accepterDemande(selected.id)
      setSelected(null)
      navigate(`/technicien/missions/${selected.id}`)
    } catch (err) {
      alert(err.response?.data?.detail ?? 'Erreur lors de l\'acceptation.')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 style={styles.pageTitle}>Demandes disponibles</h1>
        <button onClick={charger} style={styles.btnRefresh}>🔄 Actualiser</button>
      </div>

      {loading ? <Spinner /> : demandes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gris)' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>📭</span>
          Aucune demande disponible dans votre catégorie pour l'instant.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {demandes.map(d => (
            <div key={d.id} style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--bleu)' }}>
                      {d.categorie?.nom}
                    </span>
                    <Badge color="orange" label={d.type_intervention === 'immediat' ? '⚡ Immédiat' : '📅 Planifié'} />
                    <Badge color="bleu" label={d.mode === 'sur_place' ? '📍 Sur place' : '💻 À distance'} />
                  </div>
                  <p style={{ fontSize: '0.87rem', margin: '0 0 0.5rem', lineHeight: 1.5 }}>{d.description}</p>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gris)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {d.adresse && <span>📍 {d.adresse}</span>}
                    {d.date_souhaitee && <span>📅 {formatDateTime(d.date_souhaitee)}</span>}
                    <span>🕒 Postée le {formatDate(d.created_at)}</span>
                    {d.client && <span>👤 {d.client.prenom} {d.client.nom}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(d)}
                  style={styles.btnAccepter}
                >
                  ✅ Accepter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation d'acceptation */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Confirmer l'acceptation" width="420px">
        <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Voulez-vous accepter cette mission : <strong>{selected?.categorie?.nom}</strong> ?
          <br />
          <span style={{ fontSize: '0.82rem', color: 'var(--gris)' }}>{selected?.description}</span>
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setSelected(null)} style={styles.btnSecondary}>Annuler</button>
          <button onClick={handleAccepter} disabled={accepting} style={styles.btnPrimary}>
            {accepting ? 'Acceptation…' : '✅ Confirmer'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

const styles = {
  pageTitle:    { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', margin: 0 },
  btnRefresh:   { background: 'white', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', padding: '6px 14px', cursor: 'pointer', fontSize: '0.85rem' },
  card:         { background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', padding: '1.25rem', boxShadow: 'var(--ombre)', animation: 'fadeIn 0.2s ease' },
  btnAccepter:  { flexShrink: 0, padding: '8px 18px', background: 'var(--vert)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' },
  btnPrimary:   { flex: 1, padding: '0.65rem', background: 'var(--bleu)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { padding: '0.65rem 1rem', background: 'white', color: 'var(--texte)', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontWeight: 600, cursor: 'pointer' },
}
