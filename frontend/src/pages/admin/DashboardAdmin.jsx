import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../api/authApi'
import { demandeApi } from '../../api/demandeApi'
import { technicienApi } from '../../api/technicienApi'
import { paiementApi } from '../../api/paiementApi'
import Spinner from '../../components/common/Spinner'
import { formatMontant } from '../../utils/formatters'

export default function DashboardAdmin() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [erreur,  setErreur]  = useState('')

  useEffect(() => {
    const labels = ['utilisateurs', 'demandes', 'categories', 'techniciens_en_attente', 'rapport_financier']
    Promise.allSettled([
      authApi.getUtilisateurs(),
      demandeApi.getToutesDemandes(),
      technicienApi.getCategories(),
      technicienApi.getEnAttente(),
      paiementApi.getRapportFinancier(),
    ]).then(([users, demandes, categories, pending, finances]) => {
      // Log tous les résultats pour diagnostic
      ;[users, demandes, categories, pending, finances].forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`[DashboardAdmin] Échec de l'appel "${labels[i]}":`, r.reason?.response?.status, r.reason?.message, r.reason?.response?.data)
        }
      })

      // Si toutes les requêtes échouent — afficher erreur générique
      if ([users, demandes, categories, pending, finances].every(r => r.status === 'rejected')) {
        const firstErr = users.reason
        setErreur(
          firstErr?.response?.status === 403
            ? 'Accès refusé. Vérifiez que votre compte a bien le rôle administrateur.'
            : firstErr?.response?.status === 401
              ? 'Session expirée. Veuillez vous reconnecter.'
              : `Erreur lors du chargement (${firstErr?.response?.status ?? 'réseau'}). Vérifiez que le serveur backend est démarré.`
        )
        return
      }

      const usersArr    = users.status    === 'fulfilled' ? (Array.isArray(users.value.data)    ? users.value.data    : (users.value.data.results    ?? [])) : []
      const demandesArr = demandes.status === 'fulfilled' ? (Array.isArray(demandes.value.data) ? demandes.value.data : (demandes.value.data.results ?? [])) : []
      const categoriesArr = categories.status === 'fulfilled' ? (Array.isArray(categories.value.data) ? categories.value.data : (categories.value.data.results ?? [])) : []
      const pendingArr  = pending.status  === 'fulfilled' ? (Array.isArray(pending.value.data)  ? pending.value.data  : (pending.value.data.results  ?? [])) : []
      const financesData = finances.status === 'fulfilled' ? finances.value.data : null

      setStats({
        totalUsers:        usersArr.length,
        totalClients:      usersArr.filter(u => u.role === 'client').length,
        totalTechs:        usersArr.filter(u => u.role === 'technicien').length,
        totalCategories:   categoriesArr.length,
        techEnAttente:     pendingArr.length,
        totalDemandes:     demandesArr.length,
        demandesEnCours:   demandesArr.filter(d => ['acceptee','en_route','en_cours'].includes(d.statut)).length,
        demandesTerminees: demandesArr.filter(d => d.statut === 'terminee').length,
        finances:          financesData,
      })
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  if (erreur) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--rouge, #e53e3e)' }}>
      <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>⚠️ {erreur}</p>
      <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1.5rem', cursor: 'pointer' }}>
        Réessayer
      </button>
    </div>
  )

  if (!stats) return null

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={styles.pageTitle}>Tableau de bord Administrateur</h1>

      {/* Stats utilisateurs */}
      <h2 style={styles.sectionTitle}>👥 Utilisateurs</h2>
      <div style={styles.grid}>
        <StatCard icon="👥" label="Total utilisateurs" value={stats.totalUsers} color="bleu" to="/admin/utilisateurs" />
        <StatCard icon="🧑" label="Clients"            value={stats.totalClients} color="bleu" to="/admin/utilisateurs?role=client" />
        <StatCard icon="👷" label="Techniciens"        value={stats.totalTechs} color="vert" to="/admin/utilisateurs?role=technicien" />
        <StatCard icon="⏳" label="En attente validation" value={stats.techEnAttente} color="orange" to="/admin/techniciens" cta={stats.techEnAttente > 0} />
      </div>

      <h2 style={styles.sectionTitle}>🗂️ Catégories</h2>
      <div style={styles.grid}>
        <StatCard icon="🗂️" label="Catégories actives" value={stats.totalCategories} color="bleu" to="/admin/categories" />
      </div>

      {/* Stats demandes */}
      <h2 style={styles.sectionTitle}>📋 Demandes</h2>
      <div style={styles.grid}>
        <StatCard icon="📋" label="Total demandes"   value={stats.totalDemandes}       color="bleu"   to="/admin/demandes" />
        <StatCard icon="🛠️" label="En cours"         value={stats.demandesEnCours}      color="orange" to="/admin/demandes?statut=en_cours" />
        <StatCard icon="✅" label="Terminées"        value={stats.demandesTerminees}    color="vert"   to="/admin/demandes?statut=terminee" />
      </div>

      {/* Finances */}
      {stats.finances && (
        <>
          <h2 style={styles.sectionTitle}>💰 Finances</h2>
          <div style={styles.grid}>
            <FinanceCard label="Revenus plateforme" value={formatMontant(stats.finances.revenu_plateforme ?? 0)} icon="🏦" />
            <FinanceCard label="Payé aux techniciens" value={formatMontant(stats.finances.total_techniciens ?? 0)} icon="💸" />
            <FinanceCard label="Transactions réussies" value={stats.finances.nb_paiements_reussis ?? 0} icon="✅" />
            <FinanceCard label="Retraits en attente" value={stats.finances.retraits_en_attente ?? 0} icon="⏳" to="/admin/finances" />
          </div>
        </>
      )}

      {/* Liens rapides */}
      <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', padding: '1.5rem', boxShadow: 'var(--ombre)', marginTop: '0.5rem' }}>
        <h2 style={styles.sectionTitle}>Actions admin</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            { to: '/admin/categories',   label: '🗂️ Gérer les catégories'    },
            { to: '/admin/techniciens',  label: '✅ Valider des techniciens', badge: stats.techEnAttente },
            { to: '/admin/utilisateurs', label: '👥 Gérer les utilisateurs' },
            { to: '/admin/demandes',     label: '📋 Toutes les demandes'    },
            { to: '/admin/finances',     label: '📊 Rapport financier'       },
          ].map(item => (
            <Link key={item.to} to={item.to} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '0.65rem 1.2rem',
              borderRadius: 'var(--rayon)', background: 'var(--bleu-clair)', color: 'var(--bleu)',
              fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none', position: 'relative',
            }}>
              {item.label}
              {item.badge > 0 && (
                <span style={{ background: 'var(--rouge)', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700 }}>
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color, to, cta }) {
  const colors = {
    bleu:   { bg: 'var(--bleu-clair)',  text: 'var(--bleu)'   },
    vert:   { bg: 'var(--vert-clair)',  text: 'var(--vert)'   },
    orange: { bg: '#fff3cd',            text: 'var(--orange)'  },
  }
  const c = colors[color] || colors.bleu
  return (
    <Link to={to} style={{
      background: 'var(--blanc)', borderRadius: 'var(--rayon)', padding: '1.25rem',
      flex: '1 1 180px', boxShadow: 'var(--ombre)', display: 'flex', alignItems: 'center',
      gap: '1rem', textDecoration: 'none', color: 'inherit',
      border: cta ? '2px solid var(--orange)' : '2px solid transparent',
    }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: c.text }}>{value}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--gris)' }}>{label}</div>
      </div>
    </Link>
  )
}

function FinanceCard({ icon, label, value, to }) {
  const inner = (
    <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon)', padding: '1.25rem', flex: '1 1 180px', boxShadow: 'var(--ombre)', textAlign: 'center' }}>
      <div style={{ fontSize: '1.6rem', marginBottom: '0.4rem' }}>{icon}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--bleu)' }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--gris)', marginTop: 2 }}>{label}</div>
    </div>
  )
  return to ? <Link to={to} style={{ flex: '1 1 180px', textDecoration: 'none' }}>{inner}</Link> : inner
}

const styles = {
  pageTitle:    { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '1.5rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--bleu)', margin: '1.5rem 0 0.75rem' },
  grid:         { display: 'flex', flexWrap: 'wrap', gap: '1rem' },
}
