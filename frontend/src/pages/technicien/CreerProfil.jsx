import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { technicienApi } from '../../api/technicienApi'
import Spinner from '../../components/common/Spinner'

export default function CreerProfil() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    categorie_id:       '',
    specialite:         '',
    description:        '',
    tarif_horaire:      '',
    zone_couverture:    '',
    annees_experience:  '',
  })
  const [errors,      setErrors]  = useState({})
  const [loading,     setLoading] = useState(false)
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
    setLoading(true)
    setErrors({})
    try {
      await technicienApi.creerMonProfil(form)
      navigate('/technicien/dashboard')
    } catch (err) {
      setErrors(err.response?.data ?? {})
    } finally {
      setLoading(false)
    }
  }

  if (loadingCats) return <Spinner />

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={styles.pageTitle}>Créer mon profil technicien</h1>
      <p style={{ color: 'var(--gris)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Remplissez ce formulaire pour créer votre profil. Votre compte sera ensuite validé par un administrateur.
      </p>

      {errors.non_field_errors && (
        <div style={styles.alert}>{errors.non_field_errors[0]}</div>
      )}

      <div style={styles.card}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <FormField label="Catégorie de service *" error={errors.categorie_id?.[0]}>
            <select name="categorie_id" value={form.categorie_id} onChange={handleChange} required style={styles.input}>
              <option value="">Sélectionner une catégorie</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icone} {c.nom}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Spécialité *" error={errors.specialite?.[0]}>
            <input
              type="text"
              name="specialite"
              value={form.specialite}
              onChange={handleChange}
              required
              placeholder="Ex: Plomberie sanitaire, Électricité basse tension…"
              style={styles.input}
            />
          </FormField>

          <FormField label="Description de vos services *" error={errors.description?.[0]}>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              rows={4}
              placeholder="Décrivez vos compétences, votre expérience et vos services proposés…"
              style={{ ...styles.input, resize: 'vertical' }}
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <FormField label="Tarif horaire (FCFA)" error={errors.tarif_horaire?.[0]}>
              <input
                type="number"
                name="tarif_horaire"
                value={form.tarif_horaire}
                onChange={handleChange}
                placeholder="5000"
                min="0"
                style={styles.input}
              />
            </FormField>
            <FormField label="Années d'expérience *" error={errors.annees_experience?.[0]}>
              <input
                type="number"
                name="annees_experience"
                value={form.annees_experience}
                onChange={handleChange}
                required
                placeholder="3"
                min="0"
                style={styles.input}
              />
            </FormField>
          </div>

          <FormField label="Zone de couverture *" error={errors.zone_couverture?.[0]}>
            <input
              type="text"
              name="zone_couverture"
              value={form.zone_couverture}
              onChange={handleChange}
              required
              placeholder="Ex: Cotonou, Abomey-Calavi et environs"
              style={styles.input}
            />
          </FormField>

          <button type="submit" disabled={loading} style={styles.btnPrimary}>
            {loading ? 'Création…' : '✅ Créer mon profil'}
          </button>
        </form>
      </div>
    </div>
  )
}

function FormField({ label, children, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--texte)' }}>{label}</label>
      {children}
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--rouge)' }}>{error}</span>}
    </div>
  )
}

const styles = {
  pageTitle:  { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '0.5rem' },
  card:       { background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', padding: '2rem', boxShadow: 'var(--ombre)' },
  alert:      { background: 'var(--rouge-clair)', color: 'var(--rouge)', border: '1px solid var(--rouge)', borderRadius: 'var(--rayon)', padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.88rem' },
  input:      { padding: '0.6rem 0.85rem', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontSize: '0.88rem', outline: 'none', width: '100%' },
  btnPrimary: { padding: '0.75rem', background: 'var(--bleu)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 700, cursor: 'pointer', fontSize: '0.92rem' },
}
