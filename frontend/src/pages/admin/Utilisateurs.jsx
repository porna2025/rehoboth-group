import { useState, useEffect } from 'react'
import { authApi } from '../../api/authApi'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { formatDate } from '../../utils/formatters'

const ROLES = [
  { value: '',           label: 'Tous' },
  { value: 'client',     label: 'Clients' },
  { value: 'technicien', label: 'Techniciens' },
  { value: 'admin',      label: 'Administrateurs' },
]

const ROLE_LABELS = {
  client:     'Client',
  technicien: 'Technicien',
  admin:      'Administrateur',
}

export default function Utilisateurs() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur,  setErreur]  = useState(null)
  const [role,    setRole]    = useState('')
  const [search,  setSearch]  = useState('')
  const [detail,  setDetail]  = useState(null)
  const [actionEnCours, setActionEnCours] = useState(false)

  const charger = (r, s = search) => {
    setLoading(true)
    setErreur(null)
    authApi.getUtilisateurs(r, s)
      .then(({ data }) => {
        // Normaliser : tableau direct ou réponse paginée {count, results:[]}
        const liste = Array.isArray(data) ? data : (data?.results ?? [])
        setUsers(liste)
      })
      .catch(() => setErreur('Impossible de charger les utilisateurs.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { charger(role, search) }, [role])   // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault()
    charger(role, search)
  }

  const handleSuspendre = async (userId) => {
    setActionEnCours(true)
    try {
      await authApi.suspendreUtilisateur(userId)
      // Mettre à jour localement sans recharger
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, est_actif: !u.est_actif, is_active: !u.est_actif } : u
      ))
      setDetail(prev => prev ? { ...prev, est_actif: !prev.est_actif } : null)
    } finally {
      setActionEnCours(false)
    }
  }

  const handleValider = async (userId) => {
    setActionEnCours(true)
    try {
      await authApi.validerUtilisateur(userId)
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, est_verifie: true, est_actif: true } : u
      ))
      setDetail(prev => prev ? { ...prev, est_verifie: true, est_actif: true } : null)
    } finally {
      setActionEnCours(false)
    }
  }

  const handleSupprimer = async (userId) => {
    if (!window.confirm('Supprimer définitivement ce compte ? Cette action est irréversible.')) return
    setActionEnCours(true)
    try {
      await authApi.supprimerUtilisateur(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
      setDetail(null)
    } finally {
      setActionEnCours(false)
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={styles.pageTitle}>Gestion des utilisateurs</h1>

      {/* Filtres + Recherche */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {ROLES.map(r => (
          <button key={r.value} onClick={() => setRole(r.value)} style={{
            ...styles.filtreBtn,
            background:  role === r.value ? 'var(--bleu)' : 'white',
            color:       role === r.value ? 'white' : 'var(--texte)',
            borderColor: role === r.value ? 'var(--bleu)' : 'var(--bordure)',
          }}>{r.label}</button>
        ))}

        <form onSubmit={handleSearch} style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher nom, email…"
            style={{ padding: '5px 12px', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontSize: '0.83rem', minWidth: 200 }}
          />
          <button type="submit" style={{ ...styles.filtreBtn, background: 'var(--bleu)', color: 'white', borderColor: 'var(--bleu)' }}>🔍</button>
        </form>
      </div>

      {erreur && (
        <div style={{ background: '#fff3f3', border: '1px solid var(--rouge)', borderRadius: 'var(--rayon)', padding: '0.75rem 1rem', marginBottom: '1rem', color: 'var(--rouge)', fontSize: '0.88rem' }}>
          {erreur}
        </div>
      )}

      {loading ? <Spinner /> : (
        <>
          <div style={{ fontSize: '0.83rem', color: 'var(--gris)', marginBottom: '0.5rem' }}>
            {users.length} utilisateur{users.length > 1 ? 's' : ''}
          </div>
          <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', boxShadow: 'var(--ombre)', overflow: 'hidden' }}>
            {users.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--gris)', fontSize: '0.92rem' }}>
                Aucun utilisateur trouvé pour ce filtre.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bleu-clair)' }}>
                    {['Nom', 'Email', 'Rôle', 'Vérifié', 'Statut', 'Depuis', ''].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderTop: '1px solid var(--bordure)', cursor: 'pointer' }} onClick={() => setDetail(u)}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bleu-clair)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--bleu)', flexShrink: 0 }}>
                            {u.prenom?.[0]?.toUpperCase()}{u.nom?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.prenom} {u.nom}</div>
                            {u.telephone && <div style={{ fontSize: '0.75rem', color: 'var(--gris)' }}>{u.telephone}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={styles.td}>{u.email}</td>
                      <td style={styles.td}>
                        <Badge
                          color={u.role === 'admin' ? 'rouge' : u.role === 'technicien' ? 'vert' : 'bleu'}
                          label={ROLE_LABELS[u.role] ?? u.role}
                        />
                      </td>
                      <td style={styles.td}><Badge color={u.est_verifie ? 'vert' : 'gris'} label={u.est_verifie ? '✓ Oui' : '✗ Non'} /></td>
                      <td style={styles.td}><Badge color={u.est_actif ? 'vert' : 'rouge'} label={u.est_actif ? 'Actif' : 'Suspendu'} /></td>
                      <td style={styles.td}>{formatDate(u.created_at)}</td>
                      <td style={styles.td}>
                        <button onClick={(e) => { e.stopPropagation(); setDetail(u) }} style={styles.btnDetail}>Voir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Modale détail utilisateur */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`${detail?.prenom} ${detail?.nom}`} width="460px">
        {detail && (
          <div style={{ padding: '0 0.25rem 0.5rem' }}>

            {/* Infos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
              {[
                ['Email',            detail.email],
                ['Téléphone',        detail.telephone || '—'],
                ['Rôle',             ROLE_LABELS[detail.role] ?? detail.role],
                ['Compte vérifié',   detail.est_verifie ? '✓ Oui' : '✗ Non'],
                ['Statut',           detail.est_actif ? 'Actif' : 'Suspendu'],
                ['Inscription',      formatDate(detail.created_at)],
              ].map(([label, val]) => (
                <div key={label} style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, minWidth: 140, color: 'var(--gris)' }}>{label} :</span>
                  <span>{val}</span>
                </div>
              ))}
            </div>

            {/* Actions (pas pour les admins) */}
            {detail.role !== 'admin' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

                {/* Valider le compte */}
                {!detail.est_verifie && (
                  <button
                    disabled={actionEnCours}
                    onClick={() => handleValider(detail.id)}
                    style={{ ...styles.btnAction, background: 'var(--vert)' }}
                  >
                    ✅ Valider le compte
                  </button>
                )}

                {/* Suspendre / Réactiver */}
                <button
                  disabled={actionEnCours}
                  onClick={() => handleSuspendre(detail.id)}
                  style={{ ...styles.btnAction, background: detail.est_actif ? '#e67e22' : 'var(--bleu)' }}
                >
                  {detail.est_actif ? '⏸ Suspendre le compte' : '▶ Réactiver le compte'}
                </button>

                {/* Supprimer */}
                <button
                  disabled={actionEnCours}
                  onClick={() => handleSupprimer(detail.id)}
                  style={{ ...styles.btnAction, background: 'var(--rouge)', marginTop: '0.25rem' }}
                >
                  🗑 Supprimer définitivement
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

const styles = {
  pageTitle:  { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '1.25rem' },
  filtreBtn:  { padding: '5px 14px', border: '1px solid', borderRadius: '999px', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 500 },
  th:         { padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: 700, color: 'var(--bleu)' },
  td:         { padding: '0.7rem 1rem' },
  btnDetail:  { background: 'var(--bleu-clair)', border: 'none', borderRadius: 'var(--rayon)', padding: '4px 12px', cursor: 'pointer', color: 'var(--bleu2)', fontWeight: 600, fontSize: '0.82rem' },
  btnAction:  { padding: '9px 16px', border: 'none', borderRadius: 'var(--rayon)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', width: '100%' },
}
