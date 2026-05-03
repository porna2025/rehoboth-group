import { useState, useEffect } from 'react'
import { paiementApi } from '../../api/paiementApi'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import { formatDate, formatMontant, STATUT_PAIEMENT, METHODE_PAIEMENT } from '../../utils/formatters'

export default function MesPaiements() {
  const [paiements, setPaiements] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    paiementApi.getMesPaiements()
      .then(({ data }) => setPaiements(data))
      .finally(() => setLoading(false))
  }, [])

  const total = paiements
    .filter(p => p.statut === 'reussi')
    .reduce((s, p) => s + parseFloat(p.montant), 0)

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={styles.pageTitle}>Mes paiements</h1>

      {/* Résumé */}
      <div style={{ background: 'var(--bleu)', color: 'white', borderRadius: 'var(--rayon-lg)', padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: 4 }}>Total dépensé</div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{formatMontant(total)}</div>
        </div>
        <div style={{ opacity: 0.8, fontSize: '3rem' }}>💳</div>
      </div>

      {loading ? <Spinner /> : paiements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gris)' }}>
          Aucun paiement effectué pour l'instant.
        </div>
      ) : (
        <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', boxShadow: 'var(--ombre)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--bleu-clair)' }}>
                {['Date', 'Demande', 'Montant', 'Méthode', 'Statut', 'N° Transaction'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paiements.map(p => {
                const s = STATUT_PAIEMENT[p.statut] || { label: p.statut, color: 'gris' }
                return (
                  <tr key={p.id} style={{ borderTop: '1px solid var(--bordure)' }}>
                    <td style={styles.td}>{formatDate(p.created_at)}</td>
                    <td style={styles.td}>{p.demande?.categorie?.nom ?? '—'}</td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{formatMontant(p.montant)}</td>
                    <td style={styles.td}>{METHODE_PAIEMENT[p.methode] ?? p.methode}</td>
                    <td style={styles.td}><Badge color={s.color} label={s.label} /></td>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--gris)' }}>
                      {p.transaction_id || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const styles = {
  pageTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '1.5rem' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: 700, color: 'var(--bleu)' },
  td: { padding: '0.75rem 1rem' },
}
