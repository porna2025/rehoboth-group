import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../api/authApi'
import Spinner from '../../components/common/Spinner'

const OTP_RESEND_DELAY = 30

export default function Connexion() {
  const { login, verifyOtpLogin, user, loading: authLoading } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from?.pathname

  const [form, setForm]       = useState({ email: '', password: '' })
  const [otpState, setOtpState] = useState({ active: false, email: '', otp_session_token: '', otp_code: '' })
  const [error, setError]     = useState('')
  const [message, setMessage] = useState('')
  const [debugOtpCode, setDebugOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)

  useEffect(() => {
    if (resendCountdown <= 0) return undefined
    const timer = window.setTimeout(() => setResendCountdown(prev => prev - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendCountdown])

  // Si l'utilisateur est déjà connecté, le rediriger vers son dashboard
  if (authLoading) return <Spinner fullPage />
  if (user) {
    const to = user.role === 'admin'
      ? '/admin/dashboard'
      : user.role === 'technicien'
        ? '/technicien/dashboard'
        : '/client/dashboard'
    return <Navigate to={to} replace />
  }

  const getApiErrorMessage = (err, fallback) => {
    if (!err.response) {
      return 'Serveur indisponible. Vérifiez que le backend Django est bien démarré.'
    }

    const { status, data } = err.response
    const message = data?.non_field_errors?.[0]
      ?? data?.error
      ?? data?.detail

    if (message) {
      return message
    }

    if (status === 503) {
      return 'Le service email est momentanément indisponible. Réessayez dans quelques instants.'
    }

    if (status >= 500) {
      return 'Erreur interne du serveur. Réessayez plus tard.'
    }

    return fallback
  }

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setDebugOtpCode('')
    setLoading(true)
    try {
      const result = await login(form.email, form.password)
      if (result?.requires_2fa) {
        setOtpState({
          active: true,
          email: result.email,
          otp_session_token: result.otp_session_token,
          otp_code: '',
        })
        setMessage(result.message)
        setDebugOtpCode(result.debug_otp_code || '')
        setResendCountdown(OTP_RESEND_DELAY)
        return
      }

      const user = result
      const redirect = from || (
        user.role === 'admin'      ? '/admin/dashboard'
        : user.role === 'technicien' ? '/technicien/dashboard'
        : '/client/dashboard'
      )
      navigate(redirect, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Identifiants incorrects.'))
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setError('')
    setMessage('')
    setDebugOtpCode('')
    setLoading(true)

    try {
      const { data } = await authApi.renvoyerOtpConnexion({
        email: otpState.email,
        otp_session_token: otpState.otp_session_token,
      })
      setOtpState(prev => ({ ...prev, otp_session_token: data.otp_session_token, otp_code: '' }))
      setMessage(data.message)
      setDebugOtpCode(data.debug_otp_code || '')
      setResendCountdown(OTP_RESEND_DELAY)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Impossible de renvoyer le code.'))
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const user = await verifyOtpLogin({
        email: otpState.email,
        otp_code: otpState.otp_code,
        otp_session_token: otpState.otp_session_token,
      })
      const redirect = from || (
        user.role === 'admin'      ? '/admin/dashboard'
        : user.role === 'technicien' ? '/technicien/dashboard'
        : '/client/dashboard'
      )
      navigate(redirect, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, 'Code de vérification invalide.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <img
            src="/rehoboth-logo-small.svg"
            alt="Logo Rehoboth Group"
            style={styles.logoImage}
          />
          <p style={styles.subtitle}>Connexion à votre espace</p>
        </div>

        {error && <div style={styles.alert}>{error}</div>}
        {message && <div style={styles.info}>{message}</div>}
        {debugOtpCode && (
          <div style={styles.debugBox}>
            Code OTP de secours : <strong>{debugOtpCode}</strong>
          </div>
        )}

        {!otpState.active ? (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Adresse e-mail</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
                placeholder="exemple@email.com"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Mot de passe</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Code de vérification</label>
              <input
                type="text"
                name="otp_code"
                value={otpState.otp_code}
                onChange={(e) => setOtpState(prev => ({ ...prev, otp_code: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                placeholder="123456"
                style={{ ...styles.input, letterSpacing: '0.35rem', textAlign: 'center', fontWeight: 700 }}
              />
            </div>

            <button type="submit" disabled={loading || otpState.otp_code.length !== 6} style={styles.btn}>
              {loading ? 'Vérification…' : 'Valider le code'}
            </button>

            <button
              type="button"
              disabled={loading || resendCountdown > 0}
              onClick={handleResendOtp}
              style={{ ...styles.linkBtn, opacity: loading || resendCountdown > 0 ? 0.6 : 1 }}
            >
              {resendCountdown > 0 ? `Renvoyer le code dans ${resendCountdown}s` : 'Renvoyer le code OTP'}
            </button>

            <button
              type="button"
              onClick={() => {
                setOtpState({ active: false, email: '', otp_session_token: '', otp_code: '' })
                setMessage('')
                setError('')
                setResendCountdown(0)
              }}
              style={styles.linkBtn}
            >
              Revenir à la connexion
            </button>
          </form>
        )}

        <p style={styles.secondaryLinkWrap}>
          <Link to="/mot-de-passe-oublie" style={styles.secondaryLink}>
            Mot de passe oublié ?
          </Link>
        </p>

        <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.88rem', color: 'var(--gris)' }}>
          Pas encore de compte ?{' '}
          <Link to="/inscription" style={{ color: 'var(--bleu2)', fontWeight: 600 }}>
            S'inscrire
          </Link>
        </p>
      </div>
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
    padding:        '1rem',
  },
  card: {
    background:   'var(--blanc)',
    borderRadius: 'var(--rayon-lg)',
    padding:      '2.5rem 2rem',
    width:        '100%',
    maxWidth:     400,
    boxShadow:    '0 16px 48px rgba(0,0,0,0.18)',
    animation:    'fadeIn 0.3s ease',
  },
  logoWrap: {
    textAlign:    'center',
    marginBottom: '1.75rem',
  },
  logoImage: {
    width:      '100%',
    maxWidth:   '210px',
    height:     'auto',
    display:    'block',
    margin:     '0 auto 0.2rem',
  },
  appName: {
    color:      'var(--bleu)',
    fontSize:   '1.4rem',
    fontWeight: 700,
    margin:     '0.25rem 0 0.1rem',
  },
  subtitle: {
    color:    'var(--gris)',
    fontSize: '0.88rem',
  },
  alert: {
    background:   'var(--rouge-clair)',
    color:        'var(--rouge)',
    border:       '1px solid var(--rouge)',
    borderRadius: 'var(--rayon)',
    padding:      '0.65rem 1rem',
    fontSize:     '0.88rem',
    marginBottom: '1rem',
  },
  info: {
    background:   'var(--bleu-clair)',
    color:        'var(--bleu)',
    border:       '1px solid var(--bleu2)',
    borderRadius: 'var(--rayon)',
    padding:      '0.65rem 1rem',
    fontSize:     '0.88rem',
    marginBottom: '1rem',
  },
  debugBox: {
    background:   '#fff8d6',
    color:        '#6b5200',
    border:       '1px solid #f0d36a',
    borderRadius: 'var(--rayon)',
    padding:      '0.75rem 1rem',
    fontSize:     '0.95rem',
    marginBottom: '1rem',
    textAlign:    'center',
    letterSpacing:'0.08rem',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  label: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--texte)' },
  input: {
    padding:      '0.6rem 0.85rem',
    border:       '1px solid var(--bordure)',
    borderRadius: 'var(--rayon)',
    fontSize:     '0.9rem',
    outline:      'none',
    transition:   'border-color 0.2s',
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
    transition:   'background 0.2s',
  },
  linkBtn: {
    padding: '0.25rem 0',
    border: 'none',
    background: 'transparent',
    color: 'var(--bleu2)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.88rem',
  },
  secondaryLinkWrap: {
    textAlign: 'right',
    marginTop: '0.75rem',
    marginBottom: 0,
  },
  secondaryLink: {
    color: 'var(--bleu2)',
    fontSize: '0.86rem',
    fontWeight: 600,
    textDecoration: 'none',
  },
}
