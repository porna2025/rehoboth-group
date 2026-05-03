import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { demandeApi } from '../../api/demandeApi'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { formatDate, formatDateTime, formatMontant, STATUT_DEMANDE } from '../../utils/formatters'

const FILTRES = [
  { value: '',         label: 'Toutes' },
  { value: 'acceptee', label: 'Acceptées' },
  { value: 'en_route', label: 'En route' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'terminee', label: 'Terminées' },
]

export default function MesMissions() {
  const { id } = useParams()
  const [missions, setMissions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filtre,   setFiltre]   = useState('')
  const [detail,   setDetail]   = useState(null)
  const [statutModal, setStatutModal] = useState(false)

  const charger = (statut) => {
    setLoading(true)
    demandeApi.getMesMissions(statut)
      .then(({ data }) => setMissions(data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { charger(filtre) }, [filtre])

  const openDetail = (mission) => {
    setDetail(mission)
    setStatutModal(false)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={styles.pageTitle}>Mes missions</h1>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {FILTRES.map(f => (
          <button key={f.value} onClick={() => setFiltre(f.value)} style={{
            ...styles.filtreBtn,
            background:  filtre === f.value ? 'var(--bleu)' : 'white',
            color:        filtre === f.value ? 'white' : 'var(--texte)',
            borderColor:  filtre === f.value ? 'var(--bleu)' : 'var(--bordure)',
          }}>{f.label}</button>
        ))}
      </div>

      {loading ? <Spinner /> : missions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gris)' }}>Aucune mission trouvée.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {missions.map(m => {
            const s = STATUT_DEMANDE[m.statut] || { label: m.statut, color: 'gris' }
            return (
              <div key={m.id} style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--bleu)', fontSize: '0.95rem' }}>{m.categorie?.nom}</span>
                      <Badge color={s.color} label={s.label} />
                    </div>
                    <p style={{ fontSize: '0.87rem', margin: '0 0 0.4rem' }}>{m.description}</p>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gris)' }}>
                      {m.client && <span>👤 {m.client.prenom} {m.client.nom} &nbsp;|&nbsp; </span>}
                      {m.adresse && <span>📍 {m.adresse} &nbsp;|&nbsp; </span>}
                      <span>📅 {formatDate(m.created_at)}</span>
                    </div>
                  </div>
                  <button onClick={() => openDetail(m)} style={styles.btnDetail}>Gérer →</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal détail + gestion statut */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Mission : ${detail?.categorie?.nom}`} width="560px">
        {detail && (
          <MissionDetail
            mission={detail}
            onRefresh={() => { setDetail(null); charger(filtre) }}
          />
        )}
      </Modal>
    </div>
  )
}

function MissionDetail({ mission: m, onRefresh }) {
  const [statut,     setStatut]     = useState('')
  const [rapport,    setRapport]    = useState(m.rapport ?? '')
  const [devis,      setDevis]      = useState(m.montant_devis ?? '')
  const [loading,    setLoading]    = useState(false)
  const [msgInput,   setMsgInput]   = useState('')
  const [messages,   setMessages]   = useState([])
  const chatEndRef = useRef(null)

  useEffect(() => {
    demandeApi.getMessages(m.id).then(({ data }) => setMessages(data ?? []))
  }, [m.id])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleStatut = async (e) => {
    e.preventDefault()
    if (!statut) return
    setLoading(true)
    try {
      await demandeApi.mettreAJourStatut(m.id, {
        statut,
        rapport:        rapport || undefined,
        montant_devis:  devis || undefined,
      })
      onRefresh()
    } catch (err) {
      alert(err.response?.data?.detail ?? 'Erreur lors de la mise à jour.')
    } finally {
      setLoading(false)
    }
  }

  const handleEnvoyer = async (e) => {
    e.preventDefault()
    if (!msgInput.trim()) return
    const { data } = await demandeApi.envoyerMessage(m.id, msgInput.trim())
    setMessages(prev => [...prev, data])
    setMsgInput('')
  }

  const s = STATUT_DEMANDE[m.statut] || { label: m.statut, color: 'gris' }
  const NEXT_STATUTS = {
    acceptee: [{ value: 'en_route',  label: '🚗 En route' }],
    en_route: [{ value: 'en_cours',  label: '🛠️ Commencer' }],
    en_cours: [{ value: 'terminee',  label: '✅ Terminer'  }],
  }
  const nextOptions = NEXT_STATUTS[m.statut] ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <Badge color={s.color} label={s.label} />
        <p style={{ fontSize: '0.87rem', margin: '0.5rem 0', lineHeight: 1.5 }}>{m.description}</p>
        {m.adresse && <p style={{ fontSize: '0.82rem', color: 'var(--gris)' }}>📍 {m.adresse}</p>}
        {m.client && <p style={{ fontSize: '0.82rem', color: 'var(--gris)' }}>👤 Client : {m.client.prenom} {m.client.nom} — {m.client.telephone}</p>}
        {m.montant_devis && <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>💰 Devis : {formatMontant(m.montant_devis)}</p>}
      </div>

      {/* Changer le statut */}
      {nextOptions.length > 0 && (
        <form onSubmit={handleStatut} style={{ background: 'var(--bleu-clair)', borderRadius: 'var(--rayon)', padding: '1rem' }}>
          <label style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--bleu)' }}>Mettre à jour le statut</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {nextOptions.map(o => (
              <label key={o.value} style={{
                padding: '6px 14px', border: `2px solid ${statut === o.value ? 'var(--bleu2)' : 'var(--bordure)'}`,
                borderRadius: 'var(--rayon)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: statut === o.value ? 700 : 400,
                background: statut === o.value ? 'var(--bleu-clair)' : 'white',
              }}>
                <input type="radio" name="statut" value={o.value} checked={statut === o.value} onChange={e => setStatut(e.target.value)} style={{ display: 'none' }} />
                {o.label}
              </label>
            ))}
          </div>
          {statut === 'terminee' && (
            <>
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Montant final (FCFA)</label>
                <input type="number" value={devis} onChange={e => setDevis(e.target.value)} placeholder="Ex: 25000" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', marginTop: '0.25rem' }} />
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Rapport d'intervention</label>
                <textarea value={rapport} onChange={e => setRapport(e.target.value)} rows={3} placeholder="Résumé de l'intervention effectuée…" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', marginTop: '0.25rem', resize: 'vertical' }} />
              </div>
            </>
          )}
          {statut && (
            <button type="submit" disabled={loading} style={{ marginTop: '0.75rem', padding: '0.6rem 1.25rem', background: 'var(--bleu)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 700, cursor: 'pointer' }}>
              {loading ? 'Mise à jour…' : 'Confirmer'}
            </button>
          )}
        </form>
      )}

      {/* Messages */}
      <div style={{ border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', overflow: 'hidden' }}>
        <div style={{ padding: '0.5rem 0.75rem', background: 'var(--bleu-clair)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--bleu)' }}>💬 Messages</div>
        <div style={{ maxHeight: 200, overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              alignSelf: msg.est_mien ? 'flex-end' : 'flex-start',
              background: msg.est_mien ? 'var(--bleu)' : 'var(--bleu-clair)',
              color: msg.est_mien ? 'white' : 'var(--texte)',
              padding: '0.4rem 0.75rem',
              borderRadius: msg.est_mien ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
              maxWidth: '85%', fontSize: '0.83rem',
            }}>
              {msg.contenu}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        {m.statut !== 'terminee' && m.statut !== 'annulee' && (
          <form onSubmit={handleEnvoyer} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem', borderTop: '1px solid var(--bordure)' }}>
            <input value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder="Votre message…" style={{ flex: 1, padding: '0.4rem 0.75rem', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontSize: '0.83rem', outline: 'none' }} />
            <button type="submit" style={{ background: 'var(--bleu)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', padding: '0.4rem 0.75rem', cursor: 'pointer' }}>➤</button>
          </form>
        )}
      </div>
    </div>
  )
}

const styles = {
  pageTitle:  { fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '1rem' },
  filtreBtn:  { padding: '5px 14px', border: '1px solid', borderRadius: '999px', cursor: 'pointer', fontSize: '0.83rem', fontWeight: 500 },
  card:       { background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', padding: '1.25rem', boxShadow: 'var(--ombre)' },
  btnDetail:  { flexShrink: 0, color: 'var(--bleu2)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.88rem' },
}
