import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { technicienApi } from '../../api/technicienApi'
import { demandeApi } from '../../api/demandeApi'
import Spinner from '../../components/common/Spinner'

const TYPES = [
  { value: 'immediat',  label: '⚡ Immédiat — Intervention urgente' },
  { value: 'planifie',  label: '📅 Planifié — Choisir une date' },
]
const MODES = [
  { value: 'sur_place',  label: '📍 Sur place' },
  { value: 'a_distance', label: '💻 À distance' },
]

export default function CreerDemande() {
  const navigate = useNavigate()

  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    categorie_id:      '',
    description:       '',
    adresse:           '',
    latitude:          '',
    longitude:         '',
    type_intervention: 'immediat',
    mode:              'sur_place',
    date_souhaitee:    '',
  })
  const [photos, setPhotos] = useState([])
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [loadingCats, setLoadingCats] = useState(true)

  useEffect(() => {
    technicienApi.getCategories()
      .then(({ data }) => setCategories(data))
      .finally(() => setLoadingCats(false))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v !== '') fd.append(k, v)
    })
    photos.forEach(p => fd.append('photos', p))

    try {
      const { data } = await demandeApi.creerDemande(fd)
      navigate(`/client/demandes/${data.id}`)
    } catch (err) {
      setErrors(err.response?.data ?? { non_field_errors: ['Erreur lors de la création.'] })
    } finally {
      setLoading(false)
    }
  }

  if (loadingCats) return <Spinner />

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={styles.pageTitle}>Nouvelle demande d'intervention</h1>

      {errors.non_field_errors && (
        <div style={styles.alert}>{errors.non_field_errors[0]}</div>
      )}

      <div style={styles.card}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          {/* Catégorie */}
          <FormField label="Catégorie de service *" error={errors.categorie_id?.[0]}>
            <select name="categorie_id" value={form.categorie_id} onChange={handleChange} required style={styles.input}>
              <option value="">Sélectionner une catégorie</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>
              ))}
            </select>
          </FormField>

          {/* Description */}
          <FormField label="Description du problème *" error={errors.description?.[0]}>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Décrivez le problème en détail : symptômes, depuis quand, etc."
              style={{ ...styles.input, resize: 'vertical' }}
            />
          </FormField>

          {/* Type d'intervention */}
          <FormField label="Type d'intervention *">
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {TYPES.map(t => (
                <RadioCard key={t.value} name="type_intervention" value={t.value} current={form.type_intervention} onChange={handleChange} label={t.label} />
              ))}
            </div>
          </FormField>

          {/* Mode */}
          <FormField label="Mode d'intervention *">
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {MODES.map(m => (
                <RadioCard key={m.value} name="mode" value={m.value} current={form.mode} onChange={handleChange} label={m.label} />
              ))}
            </div>
          </FormField>

          {/* Adresse (si sur_place) */}
          {form.mode === 'sur_place' && (
            <FormField label="Adresse *" error={errors.adresse?.[0]}>
              <input
                type="text"
                name="adresse"
                value={form.adresse}
                onChange={handleChange}
                required
                placeholder="Numéro, rue, quartier, ville"
                style={styles.input}
              />
            </FormField>
          )}

          {/* Date souhaitée (si planifié) */}
          {form.type_intervention === 'planifie' && (
            <FormField label="Date et heure souhaitées *" error={errors.date_souhaitee?.[0]}>
              <input
                type="datetime-local"
                name="date_souhaitee"
                value={form.date_souhaitee}
                onChange={handleChange}
                required
                style={styles.input}
                min={new Date().toISOString().slice(0, 16)}
              />
            </FormField>
          )}

          {/* Photos */}
          <FormField label="Photos (optionnel)">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotos(Array.from(e.target.files))}
              style={{ fontSize: '0.88rem' }}
            />
            {photos.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {photos.map((f, i) => (
                  <img
                    key={i}
                    src={URL.createObjectURL(f)}
                    alt=""
                    style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 'var(--rayon)', border: '1px solid var(--bordure)' }}
                  />
                ))}
              </div>
            )}
          </FormField>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => navigate(-1)} style={styles.btnSecondary}>
              Annuler
            </button>
            <button type="submit" disabled={loading} style={styles.btnPrimary}>
              {loading ? 'Envoi…' : '📤 Envoyer la demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FormField({ label, children, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--texte)' }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--rouge)' }}>{error}</span>}
    </div>
  )
}

function RadioCard({ name, value, current, onChange, label }) {
  const active = current === value
  return (
    <label style={{
      flex:         1,
      padding:      '0.6rem 1rem',
      border:       `2px solid ${active ? 'var(--bleu2)' : 'var(--bordure)'}`,
      borderRadius: 'var(--rayon)',
      cursor:       'pointer',
      fontSize:     '0.85rem',
      fontWeight:   active ? 700 : 400,
      color:        active ? 'var(--bleu2)' : 'var(--texte)',
      background:   active ? 'var(--bleu-clair)' : 'white',
      textAlign:    'center',
      transition:   'all 0.15s',
    }}>
      <input type="radio" name={name} value={value} checked={active} onChange={onChange} style={{ display: 'none' }} />
      {label}
    </label>
  )
}

const styles = {
  pageTitle:    { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '1.5rem' },
  card:         { background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', padding: '2rem', boxShadow: 'var(--ombre)' },
  alert:        { background: 'var(--rouge-clair)', color: 'var(--rouge)', border: '1px solid var(--rouge)', borderRadius: 'var(--rayon)', padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.88rem' },
  input:        { padding: '0.6rem 0.85rem', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontSize: '0.88rem', outline: 'none', width: '100%' },
  btnPrimary:   { flex: 1, padding: '0.75rem', background: 'var(--bleu)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 700, cursor: 'pointer', fontSize: '0.92rem' },
  btnSecondary: { padding: '0.75rem 1.5rem', background: 'white', color: 'var(--texte)', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontWeight: 600, cursor: 'pointer', fontSize: '0.92rem' },
}
