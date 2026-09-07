import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/authApi'

const ROLES = [
  { value: 'client',     label: 'Client — Je cherche un technicien' },
  { value: 'technicien', label: 'Technicien — Je propose mes services' },
]

export default function Inscription() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '',
    role: 'client', password: '', password2: '',
  })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      await authApi.inscription(form)
      setSuccess(true)
      setTimeout(() => navigate('/connexion'), 2500)
    } catch (err) {
      setErrors(err.response?.data ?? { non_field_errors: ['Une erreur est survenue.'] })
    } finally {
      setLoading(false)
    }
  }

  const fieldError = (name) =>
    errors[name]?.[0] ?? null

  if (success) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: 'center' }}>
          <span style={{ fontSize: '3rem' }}>✅</span>
          <h2 style={{ color: 'var(--vert)', margin: '1rem 0 0.5rem' }}>Inscription réussie !</h2>
          <p style={{ color: 'var(--gris)', fontSize: '0.9rem' }}>
            Vous allez être redirigé vers la page de connexion…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '2.5rem' }}>🔧</span>
          <h1 style={{ color: 'var(--bleu)', fontSize: '1.4rem', fontWeight: 700, margin: '0.25rem 0 0.1rem' }}>
            Rehoboth Group
          </h1>
          <p style={{ color: 'var(--gris)', fontSize: '0.88rem' }}>Créer votre compte</p>
        </div>

        {errors.non_field_errors && (
          <div style={styles.alert}>{errors.non_field_errors[0]}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* Rôle */}
          <div>
            <label style={styles.label}>Je suis</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
              {ROLES.map(r => (
                <label key={r.value} style={{
                  flex:         1,
                  padding:      '0.6rem',
                  border:       `2px solid ${form.role === r.value ? 'var(--bleu2)' : 'var(--bordure)'}`,
                  borderRadius: 'var(--rayon)',
                  cursor:       'pointer',
                  textAlign:    'center',
                  fontSize:     '0.82rem',
                  fontWeight:   form.role === r.value ? 700 : 400,
                  color:        form.role === r.value ? 'var(--bleu2)' : 'var(--texte)',
                  background:   form.role === r.value ? 'var(--bleu-clair)' : 'white',
                  transition:   'all 0.15s',
                }}>
                  <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={handleChange} style={{ display: 'none' }} />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          {/* Nom & Prénom */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Field label="Prénom" name="prenom" value={form.prenom} onChange={handleChange} error={fieldError('prenom')} placeholder="" />
            <Field label="Nom" name="nom" value={form.nom} onChange={handleChange} error={fieldError('nom')} placeholder="" />
          </div>

          <Field label="E-mail" name="email" type="email" value={form.email} onChange={handleChange} error={fieldError('email')} placeholder="jean@email.com" autoComplete="email" />
          <Field label="Téléphone (optionnel)" name="telephone" type="tel" value={form.telephone} onChange={handleChange} error={fieldError('telephone')} placeholder="+225 XX XX XX XX" />
          <Field label="Mot de passe" name="password" type="password" value={form.password} onChange={handleChange} error={fieldError('password')} placeholder="8 caractères minimum" autoComplete="new-password" />
          <Field label="Confirmer le mot de passe" name="password2" type="password" value={form.password2} onChange={handleChange} error={fieldError('password2')} placeholder="••••••••" autoComplete="new-password" />

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Inscription…' : 'Créer mon compte'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.88rem', color: 'var(--gris)' }}>
          Déjà un compte ?{' '}
          <Link to="/connexion" style={{ color: 'var(--bleu2)', fontWeight: 600 }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, name, type = 'text', value, onChange, error, ...rest }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        style={{
          ...styles.input,
          borderColor: error ? 'var(--rouge)' : 'var(--bordure)',
        }}
        {...rest}
      />
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--rouge)' }}>{error}</span>}
    </div>
  )
}

const styles = {
  page: {
    minHeight:      '100vh',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    background:     'linear-gradient(135deg, var(--bleu) 0%, var(--bleu2) 100%)',
    padding:        '1.5rem 1rem',
  },
  card: {
    background:   'var(--blanc)',
    borderRadius: 'var(--rayon-lg)',
    padding:      '2rem 2rem',
    width:        '100%',
    maxWidth:     480,
    boxShadow:    '0 16px 48px rgba(0,0,0,0.18)',
    animation:    'fadeIn 0.3s ease',
  },
  alert: {
    background:   'var(--rouge-clair)',
    color:        'var(--rouge)',
    border:       '1px solid var(--rouge)',
    borderRadius: 'var(--rayon)',
    padding:      '0.65rem 1rem',
    fontSize:     '0.88rem',
    marginBottom: '0.5rem',
  },
  label: { fontSize: '0.83rem', fontWeight: 600, color: 'var(--texte)' },
  input: {
    padding:      '0.6rem 0.85rem',
    border:       '1px solid var(--bordure)',
    borderRadius: 'var(--rayon)',
    fontSize:     '0.88rem',
    outline:      'none',
  },
  btn: {
    padding:      '0.75rem',
    background:   'var(--bleu)',
    color:        'white',
    border:       'none',
    borderRadius: 'var(--rayon)',
    fontSize:     '0.95rem',
    fontWeight:   700,
    cursor:       'pointer',
    marginTop:    '0.25rem',
  },
}
