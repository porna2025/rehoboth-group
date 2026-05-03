import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { technicienApi } from '../../api/technicienApi'
import { evaluationApi } from '../../api/evaluationApi'
import Spinner from '../../components/common/Spinner'
import StarRating from '../../components/common/StarRating'
import Badge from '../../components/common/Badge'

export default function Techniciens() {
  const [categories,   setCategories]   = useState([])
  const [techniciens,  setTechniciens]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filters,      setFilters]      = useState({ categorie: '', disponible: '', note_min: '', search: '' })

  useEffect(() => {
    technicienApi.getCategories().then(({ data }) => setCategories(data))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (filters.categorie)  params.categorie  = filters.categorie
    if (filters.disponible) params.disponible = filters.disponible
    if (filters.note_min)   params.note_min   = filters.note_min
    if (filters.search)     params.search     = filters.search

    technicienApi.getTechniciens(params)
      .then(({ data }) => setTechniciens(data))
      .finally(() => setLoading(false))
  }, [filters])

  const handleFilter = (e) =>
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={styles.pageTitle}>Trouver un technicien</h1>

      {/* Filtres */}
      <div style={styles.filterBar}>
        <input
          name="search"
          value={filters.search}
          onChange={handleFilter}
          placeholder="🔍 Rechercher par spécialité…"
          style={{ ...styles.input, flex: 2 }}
        />
        <select name="categorie" value={filters.categorie} onChange={handleFilter} style={{ ...styles.input, flex: 1 }}>
          <option value="">Toutes les catégories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <select name="disponible" value={filters.disponible} onChange={handleFilter} style={{ ...styles.input, flex: 1 }}>
          <option value="">Disponibilité</option>
          <option value="true">Disponible</option>
          <option value="false">Indisponible</option>
        </select>
        <select name="note_min" value={filters.note_min} onChange={handleFilter} style={{ ...styles.input, flex: 1 }}>
          <option value="">Note minimale</option>
          <option value="3">3+ étoiles</option>
          <option value="4">4+ étoiles</option>
          <option value="4.5">4.5+ étoiles</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : techniciens.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gris)' }}>
          Aucun technicien trouvé avec ces critères.
        </div>
      ) : (
        <div style={styles.grid}>
          {techniciens.map(t => <TechnicienCard key={t.user.id} tech={t} />)}
        </div>
      )}
    </div>
  )
}

function TechnicienCard({ tech }) {
  return (
    <div style={styles.card}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={styles.avatar}>
          {tech.user?.photo_profil ? (
            <img src={tech.user.photo_profil} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '1.6rem' }}>👤</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--bleu)' }}>
              {tech.user?.prenom} {tech.user?.nom}
            </h3>
            <Badge
              color={tech.disponible ? 'vert' : 'gris'}
              label={tech.disponible ? '● Disponible' : 'Indisponible'}
            />
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--bleu2)', fontWeight: 600, marginTop: 2 }}>
            {tech.categorie?.nom} — {tech.specialite}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <StarRating value={Math.round(tech.note_moyenne ?? 0)} size="sm" />
            <span style={{ fontSize: '0.8rem', color: 'var(--gris)' }}>
              {parseFloat(tech.note_moyenne ?? 0).toFixed(1)} ({tech.nb_evaluations} avis)
            </span>
          </div>
        </div>
      </div>

      <p style={{ fontSize: '0.84rem', color: 'var(--gris)', margin: '0.75rem 0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {tech.description || 'Aucune description.'}
      </p>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--bordure)' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--gris)' }}>
          📍 {tech.zone_couverture} &nbsp;|&nbsp; {tech.annees_experience} ans exp.
          {tech.tarif_horaire && <> &nbsp;|&nbsp; {parseFloat(tech.tarif_horaire).toLocaleString('fr-FR')} FCFA/h</>}
        </div>
        <Link
          to={`/client/techniciens/${tech.user.id}`}
          style={{
            background:   'var(--bleu)',
            color:        'white',
            padding:      '5px 14px',
            borderRadius: 'var(--rayon)',
            fontSize:     '0.82rem',
            fontWeight:   600,
            textDecoration: 'none',
          }}
        >
          Voir profil
        </Link>
      </div>
    </div>
  )
}

const styles = {
  pageTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '1.25rem' },
  filterBar: {
    display:      'flex',
    flexWrap:     'wrap',
    gap:          '0.75rem',
    background:   'var(--blanc)',
    padding:      '1rem',
    borderRadius: 'var(--rayon-lg)',
    marginBottom: '1.5rem',
    boxShadow:    'var(--ombre)',
  },
  input: {
    padding:      '0.55rem 0.85rem',
    border:       '1px solid var(--bordure)',
    borderRadius: 'var(--rayon)',
    fontSize:     '0.88rem',
    outline:      'none',
    minWidth:     120,
  },
  grid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap:                 '1rem',
  },
  card: {
    background:   'var(--blanc)',
    borderRadius: 'var(--rayon-lg)',
    padding:      '1.25rem',
    boxShadow:    'var(--ombre)',
    display:      'flex',
    flexDirection:'column',
    transition:   'box-shadow 0.2s',
  },
  avatar: {
    width:       56,
    height:      56,
    borderRadius:'50%',
    background:  'var(--bleu-clair)',
    display:     'flex',
    alignItems:  'center',
    justifyContent: 'center',
    flexShrink:  0,
  },
}
