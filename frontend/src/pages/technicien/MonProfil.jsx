import { useState, useEffect } from 'react'
import { technicienApi } from '../../api/technicienApi'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { STATUT_VALIDATION, JOURS_SEMAINE } from '../../utils/formatters'

export default function MonProfil() {
  const [profil,    setProfil]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState(false)
  const [docModal,  setDocModal]  = useState(false)
  const [dispModal, setDispModal] = useState(false)

  const charger = () =>
    technicienApi.getMonProfil()
      .then(({ data }) => setProfil(data))
      .finally(() => setLoading(false))

  useEffect(() => { charger() }, [])

  if (loading) return <Spinner />
  if (!profil) return <div>Profil introuvable.</div>

  const sv = STATUT_VALIDATION[profil.statut_validation] || { label: profil.statut_validation, color: 'gris' }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={styles.pageTitle}>Mon profil technicien</h1>
        <Badge color={sv.color} label={sv.label} />
      </div>

      {/* Disponibilité rapide */}
      <div style={{ ...styles.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <span style={{ fontWeight: 600 }}>Statut de disponibilité</span>
          <p style={{ fontSize: '0.82rem', color: 'var(--gris)', marginTop: 2 }}>
            Vous êtes actuellement <strong>{profil.disponible ? 'disponible ✅' : 'indisponible ❌'}</strong>
          </p>
        </div>
        <ToggleDisponible profil={profil} onUpdate={setProfil} />
      </div>

      {/* Infos principales */}
      {editing ? (
        <EditForm profil={profil} onSave={(updated) => { setProfil(updated); setEditing(false) }} onCancel={() => setEditing(false)} />
      ) : (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <h3 style={styles.cardTitle}>Informations</h3>
            <button onClick={() => setEditing(true)} style={styles.btnEdit}>✏️ Modifier</button>
          </div>
          <InfoRow label="Catégorie"          value={`${profil.categorie?.icone ?? ''} ${profil.categorie?.nom ?? '—'}`} />
          <InfoRow label="Spécialité"         value={profil.specialite} />
          <InfoRow label="Zone de couverture" value={profil.zone_couverture} />
          <InfoRow label="Expérience"         value={`${profil.annees_experience} ans`} />
          <InfoRow label="Tarif horaire"      value={profil.tarif_horaire ? `${parseFloat(profil.tarif_horaire).toLocaleString('fr-FR')} FCFA/h` : '—'} />
          <InfoRow label="Note moyenne"       value={`★ ${parseFloat(profil.note_moyenne ?? 0).toFixed(1)} / 5 (${profil.nb_evaluations} avis)`} />
          <InfoRow label="Missions"           value={`${profil.nb_missions} total`} />
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--gris)', marginBottom: '0.25rem' }}>Description :</div>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>{profil.description}</p>
          </div>
        </div>
      )}

      {/* Documents */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={styles.cardTitle}>Documents justificatifs</h3>
          <button onClick={() => setDocModal(true)} style={styles.btnEdit}>➕ Ajouter</button>
        </div>
        {profil.documents?.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--gris)' }}>Aucun document uploadé.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {profil.documents?.map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--bordure)' }}>
                <span style={{ fontSize: '0.88rem' }}>
                  {d.type_doc === 'cni' ? '🪪' : d.type_doc === 'certificat' ? '📜' : '📄'} {DOC_LABELS[d.type_doc] ?? d.type_doc}
                </span>
                <a href={d.fichier} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--bleu2)' }}>Télécharger</a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disponibilités */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={styles.cardTitle}>Plages de disponibilité</h3>
          <button onClick={() => setDispModal(true)} style={styles.btnEdit}>✏️ Gérer</button>
        </div>
        {!profil.disponibilites?.length ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--gris)' }}>Aucune plage définie.</p>
        ) : (
          profil.disponibilites.map((d, i) => (
            <div key={i} style={{ fontSize: '0.88rem', padding: '0.3rem 0', borderBottom: '1px solid var(--bordure)' }}>
              <strong>{JOURS_SEMAINE[d.jour_semaine]}</strong> : {d.heure_debut} — {d.heure_fin}
            </div>
          ))
        )}
      </div>

      {/* Modal upload document */}
      <Modal open={docModal} onClose={() => setDocModal(false)} title="Ajouter un document">
        <UploadDocForm onSuccess={() => { setDocModal(false); charger() }} />
      </Modal>

      {/* Modal disponibilités */}
      <Modal open={dispModal} onClose={() => setDispModal(false)} title="Gérer les disponibilités" width="520px">
        <DisponibiliteForm current={profil.disponibilites ?? []} onSuccess={() => { setDispModal(false); charger() }} />
      </Modal>
    </div>
  )
}

const DOC_LABELS = { cni: 'Carte d\'identité', certificat: 'Certificat', diplome: 'Diplôme', autre: 'Autre' }

function ToggleDisponible({ profil, onUpdate }) {
  const [loading, setLoading] = useState(false)
  const toggle = async () => {
    setLoading(true)
    try {
      const { data } = await technicienApi.mettreAJourPosition(profil.latitude, profil.longitude, !profil.disponible)
      onUpdate(prev => ({ ...prev, disponible: !prev.disponible }))
    } catch (_) {}
    setLoading(false)
  }
  return (
    <button onClick={toggle} disabled={loading} style={{
      padding: '8px 16px', borderRadius: 'var(--rayon)', border: 'none', fontWeight: 700, cursor: 'pointer',
      background: profil.disponible ? 'var(--vert-clair)' : 'var(--rouge-clair)',
      color: profil.disponible ? 'var(--vert)' : 'var(--rouge)',
    }}>
      {loading ? '…' : profil.disponible ? '✅ Disponible' : '❌ Indisponible'}
    </button>
  )
}

function EditForm({ profil, onSave, onCancel }) {
  const [form, setForm]       = useState({ specialite: profil.specialite, description: profil.description, tarif_horaire: profil.tarif_horaire ?? '', zone_couverture: profil.zone_couverture, annees_experience: profil.annees_experience })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    try {
      const { data } = await technicienApi.modifierMonProfil(fd)
      onSave(data)
    } catch (err) {
      setError('Erreur lors de la mise à jour.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Modifier le profil</h3>
      {error && <div style={{ color: 'var(--rouge)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {[['specialite', 'Spécialité *'], ['zone_couverture', 'Zone de couverture *'], ['tarif_horaire', 'Tarif horaire (FCFA)'], ['annees_experience', "Années d'expérience *"]].map(([name, label]) => (
          <div key={name}>
            <label style={{ fontSize: '0.83rem', fontWeight: 600 }}>{label}</label>
            <input
              type={name === 'tarif_horaire' || name === 'annees_experience' ? 'number' : 'text'}
              value={form[name]}
              onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
              style={styles.input}
            />
          </div>
        ))}
        <div>
          <label style={{ fontSize: '0.83rem', fontWeight: 600 }}>Description *</label>
          <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} style={{ ...styles.input, resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" onClick={onCancel} style={styles.btnSecondary}>Annuler</button>
          <button type="submit" disabled={loading} style={styles.btnPrimary}>{loading ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  )
}

function UploadDocForm({ onSuccess }) {
  const [type, setType]       = useState('cni')
  const [file, setFile]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    const fd = new FormData()
    fd.append('type_doc', type)
    fd.append('fichier', file)
    try {
      await technicienApi.uploadDocument(fd)
      onSuccess()
    } catch (_) {
      setError('Erreur lors de l\'upload.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <div style={{ color: 'var(--rouge)', fontSize: '0.85rem' }}>{error}</div>}
      <div>
        <label style={fstyles.label}>Type de document</label>
        <select value={type} onChange={e => setType(e.target.value)} style={fstyles.input}>
          <option value="cni">Carte d'identité</option>
          <option value="certificat">Certificat professionnel</option>
          <option value="diplome">Diplôme</option>
          <option value="autre">Autre</option>
        </select>
      </div>
      <div>
        <label style={fstyles.label}>Fichier *</label>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])} required style={{ fontSize: '0.85rem' }} />
      </div>
      <button type="submit" disabled={loading || !file} style={{ padding: '0.7rem', background: 'var(--bleu)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 700, cursor: 'pointer' }}>
        {loading ? 'Upload…' : '📤 Uploader le document'}
      </button>
    </form>
  )
}

function DisponibiliteForm({ current, onSuccess }) {
  const [slots, setSlots]     = useState(current.length > 0 ? current : [{ jour_semaine: 0, heure_debut: '08:00', heure_fin: '17:00' }])
  const [loading, setLoading] = useState(false)

  const addSlot = () => setSlots(prev => [...prev, { jour_semaine: 0, heure_debut: '08:00', heure_fin: '17:00' }])
  const removeSlot = (i) => setSlots(prev => prev.filter((_, idx) => idx !== i))
  const updateSlot = (i, key, val) => setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [key]: val } : s))

  const handleSave = async () => {
    setLoading(true)
    try {
      await technicienApi.setDisponibilites(slots)
      onSuccess()
    } catch (_) {}
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {slots.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select value={s.jour_semaine} onChange={e => updateSlot(i, 'jour_semaine', parseInt(e.target.value))} style={{ ...fstyles.input, flex: 2 }}>
            {JOURS_SEMAINE.map((j, idx) => <option key={idx} value={idx}>{j}</option>)}
          </select>
          <input type="time" value={s.heure_debut} onChange={e => updateSlot(i, 'heure_debut', e.target.value)} style={{ ...fstyles.input, flex: 1 }} />
          <span style={{ color: 'var(--gris)' }}>—</span>
          <input type="time" value={s.heure_fin} onChange={e => updateSlot(i, 'heure_fin', e.target.value)} style={{ ...fstyles.input, flex: 1 }} />
          <button onClick={() => removeSlot(i)} style={{ background: 'var(--rouge-clair)', border: 'none', borderRadius: 'var(--rayon)', padding: '4px 8px', cursor: 'pointer', color: 'var(--rouge)', fontWeight: 700 }}>×</button>
        </div>
      ))}
      <button onClick={addSlot} style={{ background: 'var(--bleu-clair)', border: '1px dashed var(--bleu2)', borderRadius: 'var(--rayon)', padding: '0.5rem', cursor: 'pointer', color: 'var(--bleu2)', fontSize: '0.85rem' }}>
        ➕ Ajouter un créneau
      </button>
      <button onClick={handleSave} disabled={loading} style={{ padding: '0.7rem', background: 'var(--bleu)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 700, cursor: 'pointer' }}>
        {loading ? 'Enregistrement…' : '✅ Enregistrer les disponibilités'}
      </button>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.45rem', fontSize: '0.88rem' }}>
      <span style={{ fontWeight: 600, minWidth: 150, color: 'var(--gris)' }}>{label} :</span>
      <span>{value}</span>
    </div>
  )
}

const fstyles = {
  label: { fontSize: '0.83rem', fontWeight: 600, color: 'var(--texte)', display: 'block', marginBottom: '0.25rem' },
  input: { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontSize: '0.85rem', outline: 'none' },
}

const styles = {
  pageTitle:    { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', margin: 0 },
  card:         { background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', padding: '1.5rem', boxShadow: 'var(--ombre)', marginBottom: '1.25rem' },
  cardTitle:    { fontSize: '0.95rem', fontWeight: 700, color: 'var(--bleu)', margin: '0 0 1rem' },
  btnEdit:      { background: 'var(--bleu-clair)', border: '1px solid var(--bleu2)', borderRadius: 'var(--rayon)', padding: '5px 12px', cursor: 'pointer', color: 'var(--bleu2)', fontWeight: 600, fontSize: '0.82rem' },
  btnPrimary:   { flex: 1, padding: '0.65rem', background: 'var(--bleu)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { padding: '0.65rem 1rem', background: 'white', color: 'var(--texte)', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontWeight: 600, cursor: 'pointer' },
  input:        { width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontSize: '0.85rem', outline: 'none', marginTop: '0.25rem' },
}
