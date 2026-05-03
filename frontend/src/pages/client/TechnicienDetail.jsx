import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { technicienApi } from '../../api/technicienApi'
import { evaluationApi } from '../../api/evaluationApi'
import Spinner from '../../components/common/Spinner'
import StarRating from '../../components/common/StarRating'
import { formatMontant } from '../../utils/formatters'

export default function TechnicienDetail() {
  const { id } = useParams()
  const [tech, setTech]   = useState(null)
  const [evals, setEvals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      technicienApi.getTechnicien(id),
      evaluationApi.getEvaluationsTechnicien(id),
    ])
      .then(([t, e]) => { setTech(t.data); setEvals(e.data.avis ?? []) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Spinner />
  if (!tech)   return <div style={{ padding: '2rem', color: 'var(--rouge)' }}>Technicien introuvable.</div>

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Entête */}
      <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', padding: '1.75rem', boxShadow: 'var(--ombre)', marginBottom: '1.25rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {tech.user?.photo_profil ? (
          <img src={tech.user.photo_profil} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bleu-clair)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.6rem', color: 'var(--bleu)', flexShrink: 0 }}>
            {tech.user?.prenom?.[0]}{tech.user?.nom?.[0]}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--bleu)' }}>
            {tech.user?.prenom} {tech.user?.nom}
          </h1>
          <div style={{ fontSize: '0.88rem', color: 'var(--gris)', marginBottom: '0.4rem' }}>
            {tech.categorie?.nom}{tech.specialite ? ` · ${tech.specialite}` : ''}
          </div>
          <StarRating value={tech.note_moyenne ?? 0} />
          <div style={{ fontSize: '0.8rem', color: 'var(--gris)', marginTop: 2 }}>
            {tech.nb_evaluations ?? 0} avis
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
            {tech.tarif_horaire && <span style={chip}>💰 {formatMontant(tech.tarif_horaire)}/h</span>}
            {tech.annees_experience && <span style={chip}>⏳ {tech.annees_experience} ans</span>}
            {tech.zone_couverture && <span style={chip}>📍 {tech.zone_couverture}</span>}
            <span style={{ ...chip, background: tech.disponible ? 'var(--vert-clair)' : 'var(--rouge-clair)', color: tech.disponible ? 'var(--vert)' : 'var(--rouge)' }}>
              {tech.disponible ? '✅ Disponible' : '⏸ Non disponible'}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      {tech.description && (
        <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', padding: '1.25rem 1.75rem', boxShadow: 'var(--ombre)', marginBottom: '1.25rem' }}>
          <h2 style={sectionTitle}>À propos</h2>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{tech.description}</p>
        </div>
      )}

      {/* CTA */}
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <Link
          to={`/client/demandes/creer?technicien=${tech.id}&categorie=${tech.categorie?.id}`}
          style={{ display: 'inline-block', background: 'var(--bleu)', color: 'white', padding: '0.75rem 2rem', borderRadius: 'var(--rayon)', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem' }}
        >
          📋 Faire une demande à ce technicien
        </Link>
      </div>

      {/* Évaluations */}
      {evals.length > 0 && (
        <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', padding: '1.25rem 1.75rem', boxShadow: 'var(--ombre)' }}>
          <h2 style={sectionTitle}>Avis clients ({evals.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {evals.map(ev => (
              <div key={ev.id} style={{ borderTop: '1px solid var(--bordure)', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.87rem' }}>{ev.client?.prenom} {ev.client?.nom}</div>
                  <StarRating value={ev.note} size="sm" />
                </div>
                {ev.commentaire && <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--gris)' }}>{ev.commentaire}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const chip = { background: 'var(--bleu-clair)', color: 'var(--bleu)', padding: '3px 10px', borderRadius: '99px', fontSize: '0.78rem' }
const sectionTitle = { fontSize: '1rem', fontWeight: 700, color: 'var(--bleu)', margin: '0 0 0.75rem' }
