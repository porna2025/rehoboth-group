import { useState, useEffect } from 'react'
import { paiementApi } from '../../api/paiementApi'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { formatDate, formatMontant, STATUT_RETRAIT } from '../../utils/formatters'

export default function RapportFinancier() {
  const [rapport,   setRapport]   = useState(null)
  const [retraits,  setRetraits]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [detail,    setDetail]    = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [filtre,    setFiltre]    = useState('en_attente')

  const charger = () => {
    setLoading(true)
    paiementApi.getRapportFinancier()
      .then(({ data }) => {
        setRapport(data)
        setRetraits(data.retraits ?? [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { charger() }, [])

  const traiter = async (id, statut) => {
    setSaving(true)
    try {
      await paiementApi.traiterRetrait(id, statut)
      setDetail(null)
      charger()
    } catch {
      alert('Erreur lors du traitement.')
    } finally { setSaving(false) }
  }

  const filteredRetraits = filtre
    ? retraits.filter(r => r.statut === filtre)
    : retraits

  if (loading) return <Spinner />

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={styles.pageTitle}>Rapport financier</h1>

      {/* Stats financières */}
      {rapport && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
          <StatCard icon="💰" label="Volume total paiements" value={formatMontant(rapport.volume_total ?? 0)} color="bleu" />
          <StatCard icon="🏦" label="Revenus plateforme (10%)" value={formatMontant(rapport.revenu_plateforme ?? 0)} color="vert" />
          <StatCard icon="👷" label="Payé aux techniciens" value={formatMontant(rapport.total_techniciens ?? 0)} color="bleu" />
          <StatCard icon="✅" label="Paiements réussis" value={rapport.nb_paiements_reussis ?? 0} color="vert" />
          <StatCard icon="❌" label="Paiements échoués" value={rapport.nb_paiements_echoues ?? 0} color="rouge" />
          <StatCard icon="⏳" label="Retraits en attente" value={(retraits.filter(r => r.statut === 'en_attente').length)} color="orange" />
        </div>
      )}

      {/* Gestion des retraits */}
      <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', boxShadow: 'var(--ombre)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--bordure)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--bleu)' }}>Demandes de retrait</h3>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[
              { value: 'en_attente', label: 'En attente' },
              { value: 'approuve',   label: 'Approuvés'  },
              { value: 'rejete',     label: 'Rejetés'    },
              { value: '',           label: 'Tous'        },
            ].map(f => (
              <button key={f.value} onClick={() => setFiltre(f.value)} style={{
                padding: '4px 12px',
                border: `1px solid ${filtre === f.value ? 'var(--bleu)' : 'var(--bordure)'}`,
                borderRadius: '99px',
                cursor: 'pointer',
                fontSize: '0.78rem',
                background: filtre === f.value ? 'var(--bleu)' : 'white',
                color: filtre === f.value ? 'white' : 'var(--texte)',
              }}>{f.label}</button>
            ))}
          </div>
        </div>

        {filteredRetraits.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--gris)', fontSize: '0.88rem' }}>
            Aucune demande de retrait pour ce filtre.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
            <thead>
              <tr style={{ background: 'var(--bleu-clair)' }}>
                {['Technicien', 'Montant', 'Téléphone', 'Date', 'Statut', ''].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRetraits.map(r => {
                const s = STATUT_RETRAIT[r.statut] || { label: r.statut, color: 'gris' }
                return (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--bordure)' }}>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{r.technicien?.prenom} {r.technicien?.nom}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gris)' }}>{r.technicien?.email}</div>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{formatMontant(r.montant)}</td>
                    <td style={styles.td}>{r.telephone}</td>
                    <td style={styles.td}>{formatDate(r.created_at)}</td>
                    <td style={styles.td}><Badge color={s.color} label={s.label} /></td>
                    <td style={styles.td}>
                      {r.statut === 'en_attente' && (
                        <button onClick={() => setDetail(r)} style={styles.btnAction}>Traiter</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modale traitement retrait */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Traiter le retrait" width="420px">
        {detail && (
          <div>
            <div style={{ background: 'var(--bleu-clair)', borderRadius: 'var(--rayon)', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
              <div style={{ fontWeight: 600 }}>{detail.technicien?.prenom} {detail.technicien?.nom}</div>
              <div>Montant : <strong>{formatMontant(detail.montant)}</strong></div>
              <div>Téléphone : <strong>{detail.telephone}</strong></div>
              <div>Date : {formatDate(detail.created_at)}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button disabled={saving} onClick={() => traiter(detail.id, 'approuve')} style={{ flex: 1, padding: '0.65rem', background: 'var(--vert)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 700, cursor: 'pointer' }}>
                {saving ? '…' : '✅ Approuver'}
              </button>
              <button disabled={saving} onClick={() => traiter(detail.id, 'rejete')} style={{ flex: 1, padding: '0.65rem', background: 'var(--rouge)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 700, cursor: 'pointer' }}>
                {saving ? '…' : '❌ Rejeter'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  const bg = { bleu: 'var(--bleu-clair)', vert: 'var(--vert-clair)', rouge: 'var(--rouge-clair)', orange: '#fff3cd' }
  const tx = { bleu: 'var(--bleu)', vert: 'var(--vert)', rouge: 'var(--rouge)', orange: 'var(--orange)' }
  return (
    <div style={{ flex: '1 1 150px', background: 'var(--blanc)', borderRadius: 'var(--rayon)', padding: '1rem', boxShadow: 'var(--ombre)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: bg[color] ?? bg.bleu, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: tx[color] ?? tx.bleu }}>{value}</div>
        <div style={{ fontSize: '0.73rem', color: 'var(--gris)' }}>{label}</div>
      </div>
    </div>
  )
}

const styles = {
  pageTitle:  { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '1.5rem' },
  th:         { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: 700, color: 'var(--bleu)' },
  td:         { padding: '0.65rem 1rem' },
  btnAction:  { background: 'var(--bleu-clair)', border: 'none', borderRadius: 'var(--rayon)', padding: '4px 12px', cursor: 'pointer', color: 'var(--bleu2)', fontWeight: 600, fontSize: '0.82rem' },
}
