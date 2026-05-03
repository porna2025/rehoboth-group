import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { demandeApi } from '../../api/demandeApi'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import { formatDate, formatDateTime, STATUT_DEMANDE } from '../../utils/formatters'

const FILTRES = [
  { value: '',          label: 'Toutes' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'acceptee',   label: 'Acceptées' },
  { value: 'en_cours',   label: 'En cours' },
  { value: 'terminee',   label: 'Terminées' },
  { value: 'annulee',    label: 'Annulées' },
]

export default function MesDemandes() {
  const [demandes, setDemandes] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filtre,   setFiltre]   = useState('')

  const charger = (statut) => {
    setLoading(true)
    demandeApi.getMesDemandes(statut)
      .then(({ data }) => setDemandes(data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { charger(filtre) }, [filtre])

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 style={styles.pageTitle}>Mes demandes</h1>
        <Link to="/client/demandes/creer" style={styles.btnPrimary}>
          ➕ Nouvelle demande
        </Link>
      </div>

      {/* Filtres */}
      <div style={styles.filtreBar}>
        {FILTRES.map(f => (
          <button
            key={f.value}
            onClick={() => setFiltre(f.value)}
            style={{
              ...styles.filtreBtn,
              background:  filtre === f.value ? 'var(--bleu)' : 'white',
              color:        filtre === f.value ? 'white' : 'var(--texte)',
              borderColor:  filtre === f.value ? 'var(--bleu)' : 'var(--bordure)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : demandes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gris)' }}>
          Aucune demande trouvée.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {demandes.map(d => <DemandeRow key={d.id} demande={d} />)}
        </div>
      )}
    </div>
  )
}

function DemandeRow({ demande: d }) {
  const s = STATUT_DEMANDE[d.statut] || { label: d.statut, color: 'gris' }

  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--bleu)', fontSize: '0.95rem' }}>
              {d.categorie?.nom ?? '—'}
            </span>
            <Badge color={s.color} label={s.label} />
            <span style={{ fontSize: '0.78rem', color: 'var(--gris)', marginLeft: 'auto' }}>
              {formatDate(d.created_at)}
            </span>
          </div>
          <p style={{ fontSize: '0.87rem', color: 'var(--texte)', margin: 0, lineHeight: 1.5 }}>
            {d.description}
          </p>
          {d.technicien && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--gris)' }}>
              👷 Technicien : <strong>{d.technicien.prenom} {d.technicien.nom}</strong>
            </div>
          )}
          {d.adresse && (
            <div style={{ fontSize: '0.82rem', color: 'var(--gris)', marginTop: 2 }}>
              📍 {d.adresse}
            </div>
          )}
        </div>
        <Link to={`/client/demandes/${d.id}`} style={styles.btnDetails}>
          Détails →
        </Link>
      </div>
    </div>
  )
}

const styles = {
  pageTitle:  { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', margin: 0 },
  btnPrimary: {
    background: 'var(--bleu)', color: 'white', padding: '8px 16px',
    borderRadius: 'var(--rayon)', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none',
  },
  filtreBar: {
    display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
    marginBottom: '1.25rem',
  },
  filtreBtn: {
    padding: '5px 14px', border: '1px solid', borderRadius: '999px',
    cursor: 'pointer', fontSize: '0.83rem', fontWeight: 500, transition: 'all 0.15s',
  },
  card: {
    background: 'var(--blanc)', borderRadius: 'var(--rayon)', padding: '1rem 1.25rem',
    boxShadow: 'var(--ombre)', animation: 'fadeIn 0.2s ease',
  },
  btnDetails: {
    flexShrink: 0, color: 'var(--bleu2)', fontWeight: 600, fontSize: '0.84rem',
    textDecoration: 'none', whiteSpace: 'nowrap',
  },
}
