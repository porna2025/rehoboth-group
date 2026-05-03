import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { demandeApi } from '../../api/demandeApi'
import { paiementApi } from '../../api/paiementApi'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import { formatDate, formatMontant, STATUT_DEMANDE } from '../../utils/formatters'

export default function DashboardClient() {
  const { user } = useAuth()
  const [demandes, setDemandes]   = useState([])
  const [paiements, setPaiements] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      demandeApi.getMesDemandes(),
      paiementApi.getMesPaiements(),
    ])
      .then(([d, p]) => {
        setDemandes(d.data ?? [])
        setPaiements(p.data ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const stats = {
    total:     demandes.length,
    enCours:   demandes.filter(d => ['acceptee','en_route','en_cours'].includes(d.statut)).length,
    terminees: demandes.filter(d => d.statut === 'terminee').length,
    depenses:  paiements.filter(p => p.statut === 'reussi').reduce((s, p) => s + parseFloat(p.montant), 0),
  }

  const recentes = demandes.slice(0, 5)

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={styles.pageTitle}>
        Bonjour, {user?.prenom} 👋
      </h1>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <StatCard icon="📋" label="Total demandes"   value={stats.total}     color="bleu"   />
        <StatCard icon="🛠️" label="En cours"         value={stats.enCours}   color="orange" />
        <StatCard icon="✅" label="Terminées"        value={stats.terminees} color="vert"   />
        <StatCard icon="💳" label="Total dépensé"    value={formatMontant(stats.depenses)} color="bleu" />
      </div>

      {/* Actions rapides */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Actions rapides</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <QuickAction to="/client/demandes/creer"   icon="➕" label="Nouvelle demande"   primary />
          <QuickAction to="/client/techniciens"      icon="👷" label="Chercher un tech"   />
          <QuickAction to="/client/demandes"         icon="📋" label="Mes demandes"       />
          <QuickAction to="/client/paiements"        icon="💳" label="Mes paiements"      />
        </div>
      </div>

      {/* Demandes récentes */}
      <div style={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Demandes récentes</h2>
          <Link to="/client/demandes" style={{ color: 'var(--bleu2)', fontSize: '0.85rem' }}>Voir tout →</Link>
        </div>

        {recentes.length === 0 ? (
          <EmptyState message="Aucune demande pour l'instant." cta="Créer une demande" to="/client/demandes/creer" />
        ) : (
          <div style={styles.table}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--bleu-clair)' }}>
                  {['Catégorie', 'Description', 'Date', 'Statut', ''].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentes.map(d => {
                  const s = STATUT_DEMANDE[d.statut] || { label: d.statut, color: 'gris' }
                  return (
                    <tr key={d.id} style={styles.tr}>
                      <td style={styles.td}>{d.categorie?.nom ?? '—'}</td>
                      <td style={{ ...styles.td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.description}
                      </td>
                      <td style={styles.td}>{formatDate(d.created_at)}</td>
                      <td style={styles.td}><Badge color={s.color} label={s.label} /></td>
                      <td style={styles.td}>
                        <Link to={`/client/demandes/${d.id}`} style={{ color: 'var(--bleu2)', fontSize: '0.82rem' }}>Détails</Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    bleu:   { bg: 'var(--bleu-clair)',  text: 'var(--bleu)'   },
    vert:   { bg: 'var(--vert-clair)',  text: 'var(--vert)'   },
    orange: { bg: '#fff3cd',            text: 'var(--orange)'  },
  }
  const c = colors[color] || colors.bleu

  return (
    <div style={{
      background:   'var(--blanc)',
      borderRadius: 'var(--rayon)',
      padding:      '1.25rem',
      flex:         '1 1 180px',
      boxShadow:    'var(--ombre)',
      display:      'flex',
      alignItems:   'center',
      gap:          '1rem',
    }}>
      <div style={{
        width:       48,
        height:      48,
        borderRadius:'50%',
        background:  c.bg,
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'center',
        fontSize:    '1.4rem',
        flexShrink:  0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: c.text }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--gris)' }}>{label}</div>
      </div>
    </div>
  )
}

function QuickAction({ to, icon, label, primary }) {
  return (
    <Link to={to} style={{
      display:      'flex',
      alignItems:   'center',
      gap:          8,
      padding:      '0.65rem 1.2rem',
      borderRadius: 'var(--rayon)',
      background:   primary ? 'var(--bleu)' : 'var(--blanc)',
      color:        primary ? 'white' : 'var(--texte)',
      fontWeight:   600,
      fontSize:     '0.88rem',
      boxShadow:    'var(--ombre)',
      border:       primary ? 'none' : '1px solid var(--bordure)',
      textDecoration: 'none',
    }}>
      <span>{icon}</span>{label}
    </Link>
  )
}

function EmptyState({ message, cta, to }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gris)' }}>
      <p style={{ marginBottom: '1rem' }}>{message}</p>
      {cta && <Link to={to} style={{ color: 'var(--bleu2)', fontWeight: 600 }}>{cta}</Link>}
    </div>
  )
}

const styles = {
  pageTitle:    { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '1.5rem' },
  statsGrid:    { display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' },
  section:      { background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: 'var(--ombre)' },
  sectionTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '1rem' },
  table:        { borderRadius: 'var(--rayon)', overflow: 'hidden', border: '1px solid var(--bordure)' },
  th:           { padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.82rem', color: 'var(--bleu)' },
  td:           { padding: '0.65rem 1rem', borderTop: '1px solid var(--bordure)' },
  tr:           { transition: 'background 0.15s', cursor: 'default' },
}
