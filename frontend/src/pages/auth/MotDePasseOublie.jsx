import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/authApi'

export default function MotDePasseOublie() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    email: '',
    reset_code: '',
    reset_token: '',
    new_password: '',
    new_password2: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleRequest = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const { data } = await authApi.demanderResetMotDePasse(form.email)
      setForm(prev => ({ ...prev, reset_token: data.reset_token || prev.reset_token }))
      setMessage(data.message)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.error ?? err.response?.data?.detail ?? 'Impossible d\'envoyer l\'email de réinitialisation.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const { data } = await authApi.confirmerResetMotDePasse(form)
      setMessage(data.message)
      setTimeout(() => navigate('/connexion'), 1800)
    } catch (err) {
      setError(
        err.response?.data?.non_field_errors?.[0]
        ?? err.response?.data?.error
        ?? err.response?.data?.detail
        ?? err.response?.data?.new_password
        ?? 'Impossible de réinitialiser le mot de passe.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoWrap}>
          <span style={{ fontSize: '2.5rem' }}>🔐</span>
          <h1 style={styles.appName}>Réinitialiser le mot de passe</h1>
          <p style={styles.subtitle}>{step === 1 ? 'Recevoir un code par email' : 'Saisir le code reçu et choisir un nouveau mot de passe'}</p>
        </div>

        {error && <div style={styles.alert}>{error}</div>}
        {message && <div style={styles.info}>{message}</div>}

        {step === 1 ? (
          <form onSubmit={handleRequest} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Adresse e-mail</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                style={styles.input}
                placeholder="exemple@email.com"
              />
            </div>
            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? 'Envoi…' : 'Envoyer le code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Adresse e-mail</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Code reçu</label>
              <input
                type="text"
                name="reset_code"
                value={form.reset_code}
                onChange={(e) => setForm(prev => ({ ...prev, reset_code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                style={{ ...styles.input, letterSpacing: '0.35rem', textAlign: 'center', fontWeight: 700 }}
                placeholder="123456"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Nouveau mot de passe</label>
              <input type="password" name="new_password" value={form.new_password} onChange={handleChange} required style={styles.input} minLength={8} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Confirmer le mot de passe</label>
              <input type="password" name="new_password2" value={form.new_password2} onChange={handleChange} required style={styles.input} minLength={8} />
            </div>
            <button type="submit" disabled={loading || form.reset_code.length !== 6} style={styles.btn}>
              {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.88rem', color: 'var(--gris)' }}>
          <Link to="/connexion" style={{ color: 'var(--bleu2)', fontWeight: 600 }}>
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, var(--bleu) 0%, var(--bleu2) 100%)',
    padding: '1rem',
  },
  card: {
    background: 'var(--blanc)',
    borderRadius: 'var(--rayon-lg)',
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: 430,
    boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
  },
  logoWrap: { textAlign: 'center', marginBottom: '1.5rem' },
  appName: { color: 'var(--bleu)', fontSize: '1.35rem', fontWeight: 700, margin: '0.25rem 0 0.1rem' },
  subtitle: { color: 'var(--gris)', fontSize: '0.88rem' },
  alert: {
    background: 'var(--rouge-clair)',
    color: 'var(--rouge)',
    border: '1px solid var(--rouge)',
    borderRadius: 'var(--rayon)',
    padding: '0.65rem 1rem',
    fontSize: '0.88rem',
    marginBottom: '1rem',
  },
  info: {
    background: 'var(--bleu-clair)',
    color: 'var(--bleu)',
    border: '1px solid var(--bleu2)',
    borderRadius: 'var(--rayon)',
    padding: '0.65rem 1rem',
    fontSize: '0.88rem',
    marginBottom: '1rem',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  label: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--texte)' },
  input: {
    padding: '0.6rem 0.85rem',
    border: '1px solid var(--bordure)',
    borderRadius: 'var(--rayon)',
    fontSize: '0.9rem',
    outline: 'none',
  },
  btn: {
    padding: '0.75rem',
    background: 'var(--bleu)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--rayon)',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
}