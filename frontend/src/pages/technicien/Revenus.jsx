import { useState, useEffect } from 'react'
import { paiementApi } from '../../api/paiementApi'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { formatDate, formatMontant, STATUT_RETRAIT } from '../../utils/formatters'

export default function Revenus() {
  const [revenus,   setRevenus]   = useState(null)
  const [retraits,  setRetraits]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [retModal,  setRetModal]  = useState(false)

  const charger = () => {
    setLoading(true)
    paiementApi.getMesRevenus()
      .then(({ data }) => {
        setRevenus(data)
        setRetraits(data.retraits ?? [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { charger() }, [])

  if (loading) return <Spinner />

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h1 style={styles.pageTitle}>Revenus & Retraits</h1>

      {/* Carte solde */}
      <div style={{ background: 'linear-gradient(135deg, var(--bleu) 0%, var(--bleu2) 100%)', color: 'white', borderRadius: 'var(--rayon-lg)', padding: '2rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: 4 }}>Solde disponible</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{formatMontant(revenus?.solde ?? 0)}</div>
          <div style={{ fontSize: '0.82rem', opacity: 0.75, marginTop: 4 }}>
            Commission plateforme : 10% &nbsp;|&nbsp; Part technicien : 90%
          </div>
        </div>
        <button
          onClick={() => setRetModal(true)}
          disabled={parseFloat(revenus?.solde ?? 0) <= 0}
          style={{
            background: 'white',
            color: 'var(--bleu)',
            border: 'none',
            borderRadius: 'var(--rayon)',
            padding: '10px 20px',
            fontWeight: 700,
            cursor: parseFloat(revenus?.solde ?? 0) > 0 ? 'pointer' : 'not-allowed',
            opacity: parseFloat(revenus?.solde ?? 0) > 0 ? 1 : 0.6,
          }}
        >
          💸 Retirer
        </button>
      </div>

      {/* Statistiques revenus */}
      {revenus && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <StatMini label="Total gagné" value={formatMontant(revenus.total_gagne ?? 0)} />
          <StatMini label="Missions terminées" value={revenus.nb_missions ?? 0} />
          <StatMini label="Total retraits" value={formatMontant(revenus.total_retire ?? 0)} />
        </div>
      )}

      {/* Historique des retraits */}
      <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', boxShadow: 'var(--ombre)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--bordure)' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--bleu)' }}>Historique des retraits</h3>
        </div>
        {retraits.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gris)', fontSize: '0.88rem' }}>
            Aucun retrait effectué.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--bleu-clair)' }}>
                {['Date', 'Montant', 'Téléphone', 'Statut'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {retraits.map(r => {
                const s = STATUT_RETRAIT[r.statut] || { label: r.statut, color: 'gris' }
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--bordure)' }}>
                    <td style={styles.td}>{formatDate(r.created_at)}</td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{formatMontant(r.montant)}</td>
                    <td style={styles.td}>{r.telephone}</td>
                    <td style={styles.td}><Badge color={s.color} label={s.label} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modale demande de retrait */}
      <Modal open={retModal} onClose={() => setRetModal(false)} title="Demander un retrait" width="400px">
        <RetraitForm
          solde={parseFloat(revenus?.solde ?? 0)}
          onSuccess={() => { setRetModal(false); charger() }}
        />
      </Modal>
    </div>
  )
}

function StatMini({ label, value }) {
  return (
    <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon)', padding: '1rem 1.5rem', flex: '1 1 150px', boxShadow: 'var(--ombre)', textAlign: 'center' }}>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--bleu)' }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--gris)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function RetraitForm({ solde, onSuccess }) {
  const [form, setForm]       = useState({ montant: '', telephone: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const montant = parseFloat(form.montant)
    if (montant > solde) { setError(`Le montant dépasse votre solde de ${solde.toLocaleString('fr-FR')} FCFA.`); return }
    setLoading(true)
    setError('')
    try {
      await paiementApi.demanderRetrait(form.montant, form.telephone)
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail ?? err.response?.data?.montant?.[0] ?? 'Erreur lors de la demande.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ background: 'var(--bleu-clair)', borderRadius: 'var(--rayon)', padding: '0.75rem 1rem', fontSize: '0.88rem', color: 'var(--bleu)' }}>
        Solde disponible : <strong>{formatMontant(solde)}</strong>
      </div>
      {error && <div style={{ color: 'var(--rouge)', fontSize: '0.85rem' }}>{error}</div>}
      <div>
        <label style={fstyles.label}>Montant à retirer (FCFA) *</label>
        <input type="number" value={form.montant} onChange={e => setForm(p => ({ ...p, montant: e.target.value }))} required min="1" max={solde} style={fstyles.input} />
      </div>
      <div>
        <label style={fstyles.label}>Numéro Mobile Money *</label>
        <input type="tel" value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} required placeholder="+229 XX XX XX XX" style={fstyles.input} />
      </div>
      <button type="submit" disabled={loading} style={{ padding: '0.7rem', background: 'var(--bleu)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 700, cursor: 'pointer' }}>
        {loading ? 'Traitement…' : '💸 Confirmer le retrait'}
      </button>
    </form>
  )
}

const fstyles = {
  label: { fontSize: '0.83rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' },
  input: { width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontSize: '0.88rem', outline: 'none' },
}

const styles = {
  pageTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '1.5rem' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: 700, color: 'var(--bleu)' },
  td: { padding: '0.75rem 1rem' },
}
