import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { paiementApi } from '../../api/paiementApi'
import Spinner from '../../components/common/Spinner'
import { formatMontant, STATUT_PAIEMENT } from '../../utils/formatters'

const MAX_ATTEMPTS = 8
const POLL_DELAY_MS = 3000

export default function PaiementSucces() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const transactionId = searchParams.get('txn')

  const [paiement, setPaiement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const timeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!transactionId) {
      setLoading(false)
      setError('Transaction introuvable dans le lien de retour.')
      return
    }

    let cancelled = false

    const verifier = async (currentAttempt = 0) => {
      setLoading(true)
      setError('')

      try {
        const { data } = await paiementApi.verifierPaiement(transactionId)
        if (cancelled) return

        setPaiement(data)

        if (data.statut === 'en_attente' && currentAttempt < MAX_ATTEMPTS - 1) {
          setAttempt(currentAttempt + 1)
          timeoutRef.current = setTimeout(() => {
            verifier(currentAttempt + 1)
          }, POLL_DELAY_MS)
          return
        }
      } catch (err) {
        if (cancelled) return
        setError(
          err.response?.data?.error ||
          err.response?.data?.detail ||
          'Impossible de vérifier le paiement pour le moment.'
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    verifier(0)

    return () => {
      cancelled = true
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [transactionId])

  if (loading && !paiement) {
    return <Spinner />
  }

  const statutInfo = paiement ? (STATUT_PAIEMENT[paiement.statut] || { label: paiement.statut, color: 'gris' }) : null
  const isSuccess = paiement?.statut === 'reussi'
  const isFailed = paiement?.statut === 'echoue'
  const isPending = paiement?.statut === 'en_attente'

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>Retour de paiement</h1>

        {error ? <p style={styles.error}>{error}</p> : null}

        {!error && paiement ? (
          <>
            <div style={{ ...styles.statusBox, ...(isSuccess ? styles.successBox : isFailed ? styles.failedBox : styles.pendingBox) }}>
              <div style={styles.statusTitle}>
                {isSuccess ? 'Paiement confirmé' : isFailed ? 'Paiement échoué' : 'Paiement en cours de confirmation'}
              </div>
              <div style={styles.statusText}>
                Statut : <strong>{statutInfo?.label}</strong>
              </div>
              {isPending ? (
                <div style={styles.statusText}>
                  Vérification automatique en cours{attempt > 0 ? ` (${attempt}/${MAX_ATTEMPTS - 1})` : ''}.
                </div>
              ) : null}
            </div>

            <div style={styles.infoGrid}>
              <InfoRow label="Transaction" value={paiement.transaction_id || transactionId} />
              <InfoRow label="Montant" value={formatMontant(paiement.montant)} />
              <InfoRow label="Méthode" value={paiement.methode_label} />
            </div>
          </>
        ) : null}

        <div style={styles.actions}>
          {paiement?.demande ? (
            <button type="button" onClick={() => navigate(`/client/demandes/${paiement.demande}`)} style={styles.primaryButton}>
              Voir la demande
            </button>
          ) : null}
          <Link to="/client/paiements" style={styles.secondaryButton}>Voir mes paiements</Link>
          {isPending ? (
            <button type="button" onClick={() => window.location.reload()} style={styles.secondaryButton}>
              Revérifier maintenant
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value || '—'}</span>
    </div>
  )
}

const styles = {
  wrapper: {
    maxWidth: 720,
    margin: '0 auto',
  },
  card: {
    background: 'var(--blanc)',
    borderRadius: 'var(--rayon-lg)',
    boxShadow: 'var(--ombre)',
    padding: '2rem',
  },
  title: {
    margin: '0 0 1.25rem',
    color: 'var(--bleu)',
    fontSize: '1.6rem',
    fontWeight: 700,
  },
  error: {
    margin: '0 0 1rem',
    color: 'var(--rouge)',
    fontSize: '0.95rem',
  },
  statusBox: {
    borderRadius: 'var(--rayon)',
    padding: '1rem 1.1rem',
    marginBottom: '1.25rem',
  },
  successBox: {
    background: 'var(--vert-clair)',
    color: 'var(--vert)',
  },
  failedBox: {
    background: 'var(--rouge-clair)',
    color: 'var(--rouge)',
  },
  pendingBox: {
    background: 'var(--bleu-clair)',
    color: 'var(--bleu)',
  },
  statusTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    marginBottom: '0.35rem',
  },
  statusText: {
    fontSize: '0.9rem',
    lineHeight: 1.5,
  },
  infoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '1rem',
    padding: '0.8rem 0',
    borderBottom: '1px solid var(--bordure)',
    fontSize: '0.92rem',
  },
  infoLabel: {
    color: 'var(--gris)',
    fontWeight: 600,
  },
  infoValue: {
    color: 'var(--texte)',
    textAlign: 'right',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  primaryButton: {
    padding: '0.8rem 1.15rem',
    borderRadius: 'var(--rayon)',
    border: 'none',
    background: 'var(--bleu)',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '0.9rem',
  },
  secondaryButton: {
    padding: '0.8rem 1.15rem',
    borderRadius: 'var(--rayon)',
    border: '1px solid var(--bordure)',
    background: 'white',
    color: 'var(--texte)',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}