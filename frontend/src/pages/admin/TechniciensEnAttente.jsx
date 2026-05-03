import { useState, useEffect } from 'react'
import { technicienApi } from '../../api/technicienApi'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'

export default function TechniciensEnAttente() {
  const [techs,   setTechs]   = useState([])
  const [loading, setLoading] = useState(true)
  const [detail,  setDetail]  = useState(null)
  const [motif,   setMotif]   = useState('')
  const [action,  setAction]  = useState(null) // 'valider' | 'rejeter'
  const [saving,  setSaving]  = useState(false)

  const charger = () => {
    setLoading(true)
    technicienApi.getEnAttente()
      .then(({ data }) => setTechs(data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { charger() }, [])

  const handleValider = async (id, statut) => {
    setSaving(true)
    try {
      await technicienApi.validerTechnicien(id, statut, motif)
      setDetail(null); setMotif(''); setAction(null)
      charger()
    } catch {
      alert('Erreur lors de la validation.')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={styles.pageTitle}>Techniciens en attente de validation</h1>
      <p style={{ color: 'var(--gris)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
        {loading ? '…' : `${techs.length} technicien${techs.length > 1 ? 's' : ''} en attente.`}
      </p>

      {loading ? <Spinner /> : techs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gris)', background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', boxShadow: 'var(--ombre)' }}>
          ✅ Aucun technicien en attente de validation.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {techs.map(t => (
            <div key={t.id} style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                    <div style={styles.avatar}>{t.user?.prenom?.[0]}{t.user?.nom?.[0]}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.97rem' }}>{t.user?.prenom} {t.user?.nom}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gris)' }}>{t.user?.email} · {t.user?.telephone}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                    {t.categorie && <Badge color="bleu" label={t.categorie.nom} />}
                    {t.specialite && <Badge color="gris" label={t.specialite} />}
                  </div>
                  <p style={{ fontSize: '0.83rem', color: 'var(--gris)', margin: 0, lineHeight: 1.4 }}>{t.description}</p>
                  {t.annees_experience && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--gris)' }}>⏳ {t.annees_experience} ans d'expérience</span>
                  )}
                  {t.zone_couverture && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--gris)', marginLeft: '0.75rem' }}>📍 {t.zone_couverture}</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                  <button onClick={() => setDetail(t)} style={styles.btnDetail}>Voir détails</button>
                  <button onClick={() => { setDetail(t); setAction('valider') }} style={styles.btnVert}>✅ Valider</button>
                  <button onClick={() => { setDetail(t); setAction('rejeter') }} style={styles.btnRouge}>❌ Rejeter</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale détail / action */}
      <Modal open={!!detail} onClose={() => { setDetail(null); setAction(null); setMotif('') }} title={`Technicien : ${detail?.user?.prenom ?? '—'} ${detail?.user?.nom ?? ''}`} width="500px">
        {detail && (
          <div>
            {/* Documents */}
            {detail.documents && detail.documents.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--bleu)' }}>Documents fournis</label>
                <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                  {detail.documents.map(doc => (
                    <li key={doc.id}>
                      <a href={doc.fichier} target="_blank" rel="noreferrer" style={{ color: 'var(--bleu2)' }}>
                        {doc.type_doc} — {doc.nom_fichier ?? 'Voir le document'}
                      </a>
                      {' '}
                      <Badge color={doc.valide ? 'vert' : 'gris'} label={doc.valide ? 'Validé' : 'Non validé'} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disponibilités */}
            {detail.disponibilites && detail.disponibilites.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--bleu)' }}>Disponibilités déclarées</label>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                  {detail.disponibilites.map(d => (
                    <span key={d.id} style={{ fontSize: '0.78rem', background: 'var(--bleu-clair)', color: 'var(--bleu)', padding: '3px 8px', borderRadius: '99px' }}>
                      {d.jour} {d.heure_debut}–{d.heure_fin}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {!action && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button onClick={() => setAction('valider')} style={{ ...styles.btnVert, flex: 1 }}>✅ Valider le profil</button>
                <button onClick={() => setAction('rejeter')} style={{ ...styles.btnRouge, flex: 1 }}>❌ Rejeter</button>
              </div>
            )}

            {action === 'valider' && (
              <div style={{ background: 'var(--vert-clair)', borderRadius: 'var(--rayon)', padding: '1rem', marginTop: '0.5rem' }}>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', fontWeight: 600 }}>Confirmer la validation ?</p>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button disabled={saving} onClick={() => handleValider(detail.id, 'valider')} style={{ ...styles.btnVert, flex: 1 }}>
                    {saving ? 'Traitement…' : 'Confirmer'}
                  </button>
                  <button onClick={() => setAction(null)} style={{ ...styles.btnNeutre, flex: 1 }}>Annuler</button>
                </div>
              </div>
            )}

            {action === 'rejeter' && (
              <div style={{ background: 'var(--rouge-clair)', borderRadius: 'var(--rayon)', padding: '1rem', marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.83rem', fontWeight: 600 }}>Motif du rejet</label>
                <textarea
                  value={motif}
                  onChange={e => setMotif(e.target.value)}
                  rows={3}
                  required
                  placeholder="Expliquez pourquoi le profil est rejeté…"
                  style={{ width: '100%', marginTop: '0.4rem', padding: '0.5rem', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', resize: 'vertical', fontSize: '0.85rem' }}
                />
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <button disabled={saving || !motif.trim()} onClick={() => handleValider(detail.id, 'rejeter')} style={{ ...styles.btnRouge, flex: 1 }}>
                    {saving ? 'Traitement…' : 'Confirmer le rejet'}
                  </button>
                  <button onClick={() => setAction(null)} style={{ ...styles.btnNeutre, flex: 1 }}>Annuler</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

const styles = {
  pageTitle:  { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '0.5rem' },
  card:       { background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', padding: '1.25rem', boxShadow: 'var(--ombre)' },
  avatar:     { width: 44, height: 44, borderRadius: '50%', background: 'var(--bleu-clair)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--bleu)', fontSize: '1rem', flexShrink: 0 },
  btnDetail:  { background: 'var(--bleu-clair)', border: 'none', borderRadius: 'var(--rayon)', padding: '6px 14px', cursor: 'pointer', color: 'var(--bleu2)', fontWeight: 600, fontSize: '0.82rem' },
  btnVert:    { background: 'var(--vert)', border: 'none', borderRadius: 'var(--rayon)', padding: '6px 14px', cursor: 'pointer', color: 'white', fontWeight: 600, fontSize: '0.82rem' },
  btnRouge:   { background: 'var(--rouge)', border: 'none', borderRadius: 'var(--rayon)', padding: '6px 14px', cursor: 'pointer', color: 'white', fontWeight: 600, fontSize: '0.82rem' },
  btnNeutre:  { background: 'var(--gris-bg)', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' },
}
