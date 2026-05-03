import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { demandeApi } from '../../api/demandeApi'
import { paiementApi } from '../../api/paiementApi'
import { technicienApi } from '../../api/technicienApi'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import { formatDate, formatMontant, STATUT_DEMANDE, STATUT_VALIDATION } from '../../utils/formatters'

export default function DashboardTechnicien() {
  const { user } = useAuth()
  const [profil,    setProfil]    = useState(null)
  const [missions,  setMissions]  = useState([])
  const [revenus,   setRevenus]   = useState(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      technicienApi.getMonProfil().catch(() => null),
      demandeApi.getMesMissions().catch(() => ({ data: [] })),
      paiementApi.getMesRevenus().catch(() => null),
    ])
      .then(([p, m, r]) => {
        setProfil(p?.data ?? null)
        setMissions(m.data ?? [])
        setRevenus(r?.data ?? null)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  // Pas encore de profil
  if (!profil) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '3rem' }}>
        <span style={{ fontSize: '3rem' }}>📋</span>
        <h2 style={{ color: 'var(--bleu)', margin: '1rem 0 0.5rem' }}>Profil technicien non configuré</h2>
        <p style={{ color: 'var(--gris)', marginBottom: '1.5rem' }}>
          Vous devez créer votre profil technicien pour commencer à recevoir des missions.
        </p>
        <Link to="/technicien/profil/creer" style={styles.btnPrimary}>
          Créer mon profil
        </Link>
      </div>
    )
  }

  const sv = STATUT_VALIDATION[profil.statut_validation] || { label: profil.statut_validation, color: 'gris' }
  const stats = {
    enAttente: missions.filter(m => m.statut === 'acceptee' || m.statut === 'en_route').length,
    enCours:   missions.filter(m => m.statut === 'en_cours').length,
    terminees: missions.filter(m => m.statut === 'terminee').length,
    solde:     parseFloat(revenus?.solde ?? 0),
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={styles.pageTitle}>Bonjour, {user?.prenom} 👷</h1>
        <Badge color={sv.color} label={sv.label} />
      </div>

      {profil.statut_validation !== 'valide' && (
        <div style={{ background: '#fff3cd', border: '1px solid var(--orange)', borderRadius: 'var(--rayon)', padding: '0.85rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.88rem', color: '#856404' }}>
          ⚠️ Votre profil est en cours de validation. Vous pourrez recevoir des missions une fois validé.
        </div>
      )}

      {/* Stats */}
      <div style={styles.statsGrid}>
        <StatCard icon="📋" label="Missions assignées" value={stats.enAttente}              color="bleu"   />
        <StatCard icon="🛠️" label="En cours"           value={stats.enCours}                color="orange" />
        <StatCard icon="✅" label="Terminées"          value={stats.terminees}              color="vert"   />
        <StatCard icon="💰" label="Solde disponible"   value={formatMontant(stats.solde)}   color="vert"   />
      </div>

      {/* Actions rapides */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Actions rapides</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <QuickAction to="/technicien/disponibles" icon="🔍" label="Demandes disponibles" primary />
          <QuickAction to="/technicien/missions"    icon="🛠️" label="Mes missions"         />
          <QuickAction to="/technicien/profil"      icon="👤" label="Mon profil"           />
          <QuickAction to="/technicien/revenus"     icon="💰" label="Revenus & Retrait"    />
        </div>
      </div>

      {/* Missions récentes */}
      <div style={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ ...styles.sectionTitle, margin: 0 }}>Missions récentes</h2>
          <Link to="/technicien/missions" style={{ color: 'var(--bleu2)', fontSize: '0.85rem' }}>Voir tout →</Link>
        </div>
        {missions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--gris)', fontSize: '0.88rem' }}>
            Aucune mission pour l'instant.
          </div>
        ) : (
          missions.slice(0, 5).map(m => {
            const s = STATUT_DEMANDE[m.statut] || { label: m.statut, color: 'gris' }
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid var(--bordure)' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{m.categorie?.nom}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gris)', marginLeft: '0.5rem' }}>{formatDate(m.created_at)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Badge color={s.color} label={s.label} />
                  <Link to={`/technicien/missions/${m.id}`} style={{ color: 'var(--bleu2)', fontSize: '0.82rem' }}>→</Link>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    bleu:   { bg: 'var(--bleu-clair)', text: 'var(--bleu)'  },
    vert:   { bg: 'var(--vert-clair)', text: 'var(--vert)'  },
    orange: { bg: '#fff3cd',           text: 'var(--orange)' },
  }
  const c = colors[color] || colors.bleu
  return (
    <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon)', padding: '1.25rem', flex: '1 1 180px', boxShadow: 'var(--ombre)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{icon}</div>
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
      display: 'flex', alignItems: 'center', gap: 8, padding: '0.65rem 1.2rem',
      borderRadius: 'var(--rayon)', background: primary ? 'var(--bleu)' : 'var(--blanc)',
      color: primary ? 'white' : 'var(--texte)', fontWeight: 600, fontSize: '0.88rem',
      boxShadow: 'var(--ombre)', border: primary ? 'none' : '1px solid var(--bordure)', textDecoration: 'none',
    }}>
      <span>{icon}</span>{label}
    </Link>
  )
}

const styles = {
  pageTitle:    { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', margin: 0 },
  statsGrid:    { display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' },
  section:      { background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: 'var(--ombre)' },
  sectionTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '1rem' },
  btnPrimary:   { background: 'var(--bleu)', color: 'white', padding: '10px 24px', borderRadius: 'var(--rayon)', fontWeight: 700, textDecoration: 'none', fontSize: '0.92rem' },
}
