import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { demandeApi } from '../../api/demandeApi'
import { technicienApi } from '../../api/technicienApi'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import { formatDate, formatDateTime, STATUT_DEMANDE } from '../../utils/formatters'

const STATUTS = [
  { value: '',           label: 'Tous' },
  { value: 'en_attente', label: 'En attente' },
  { value: 'acceptee',   label: 'Acceptées' },
  { value: 'en_route',   label: 'En route' },
  { value: 'en_cours',   label: 'En cours' },
  { value: 'terminee',   label: 'Terminées' },
  { value: 'annulee',    label: 'Annulées' },
]

export default function ToutesLesDemandes() {
  const [demandes,    setDemandes]    = useState([])
  const [categories,  setCategories]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [statut,      setStatut]      = useState('')
  const [categorie,   setCategorie]   = useState('')
  const [search,      setSearch]      = useState('')
  const [page,        setPage]        = useState(1)
  const [total,       setTotal]       = useState(0)
  const PAGE_SIZE = 20

  useEffect(() => {
    technicienApi.getCategories()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.results ?? [])
        setCategories(list)
      })
      .catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const controller = new AbortController()
    demandeApi.getToutesDemandes({ statut, categorie, page }, controller.signal)
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setDemandes(data)
          setTotal(data.length)
        } else if (data?.results) {
          setDemandes(data.results)
          setTotal(data.count)
        } else {
          setDemandes([])
          setTotal(0)
        }
      })
      .catch((err) => {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return
        const detail = err?.response?.data?.detail || err?.response?.data?.error
        setError(detail || 'Impossible de charger les demandes.')
        setDemandes([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [statut, categorie, page])

  const filtered = search
    ? demandes.filter(d =>
        d.description?.toLowerCase().includes(search.toLowerCase()) ||
        d.client?.nom?.toLowerCase().includes(search.toLowerCase()) ||
        d.client?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : demandes

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={styles.pageTitle}>Toutes les demandes</h1>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher (client, description)…"
          style={{ padding: '6px 12px', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontSize: '0.85rem', minWidth: 220 }}
        />
        <select value={categorie} onChange={e => { setCategorie(e.target.value); setPage(1) }} style={styles.select}>
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <select value={statut} onChange={e => { setStatut(e.target.value); setPage(1) }} style={styles.select}>
          {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--gris)', alignSelf: 'center' }}>
          {total} demande{total > 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 'var(--rayon)', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#856404', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {loading ? <Spinner /> : (
        <>
          <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', boxShadow: 'var(--ombre)', overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--gris)', fontSize: '0.9rem' }}>
                Aucune demande trouvée pour ces filtres.
              </div>
            ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bleu-clair)' }}>
                  {['#', 'Client', 'Catégorie', 'Description', 'Statut', 'Date', 'Technicien'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const s = STATUT_DEMANDE[d.statut] || { label: d.statut, color: 'gris' }
                  return (
                    <tr key={d.id} style={{ borderTop: '1px solid var(--bordure)' }}>
                      <td style={styles.td}>#{d.id}</td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600 }}>{d.client?.prenom} {d.client?.nom}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--gris)' }}>{d.client?.email}</div>
                      </td>
                      <td style={styles.td}>{d.categorie?.nom}</td>
                      <td style={{ ...styles.td, maxWidth: 200 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.description}</div>
                      </td>
                      <td style={styles.td}><Badge color={s.color} label={s.label} /></td>
                      <td style={styles.td}>{formatDate(d.created_at)}</td>
                      <td style={styles.td}>{d.technicien ? `${d.technicien.prenom} ${d.technicien.nom}` : <span style={{ color: 'var(--gris)', fontSize: '0.78rem' }}>—</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            )}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={styles.pageBtn}>‹ Précédent</button>
              <span style={{ fontSize: '0.85rem', alignSelf: 'center', color: 'var(--gris)' }}>
                Page {page} / {Math.ceil(total / PAGE_SIZE)}
              </span>
              <button disabled={page * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)} style={styles.pageBtn}>Suivant ›</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const styles = {
  pageTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '1.25rem' },
  select:    { padding: '6px 10px', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontSize: '0.85rem' },
  th:        { padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: 700, color: 'var(--bleu)' },
  td:        { padding: '0.6rem 1rem' },
  pageBtn:   { padding: '6px 14px', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', background: 'var(--blanc)', cursor: 'pointer', fontSize: '0.82rem' },
}
