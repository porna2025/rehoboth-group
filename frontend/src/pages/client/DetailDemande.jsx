import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { demandeApi } from '../../api/demandeApi'
import { paiementApi } from '../../api/paiementApi'
import { evaluationApi } from '../../api/evaluationApi'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'
import StarRating from '../../components/common/StarRating'
import Modal from '../../components/common/Modal'
import { formatDateTime, formatMontant, STATUT_DEMANDE, METHODE_PAIEMENT } from '../../utils/formatters'

export default function DetailDemande() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [demande,  setDemande]  = useState(null)
  const [messages, setMessages] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [msgInput, setMsgInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const chatEndRef = useRef(null)

  // Modals
  const [payModal,  setPayModal]  = useState(false)
  const [evalModal, setEvalModal] = useState(false)
  const [annulerConfirm, setAnnulerConfirm] = useState(false)

  const charger = () =>
    Promise.all([demandeApi.getDemande(id), demandeApi.getMessages(id)])
      .then(([d, m]) => { setDemande(d.data); setMessages(m.data ?? []) })
      .finally(() => setLoading(false))

  useEffect(() => { charger() }, [id])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleAnnuler = async () => {
    await demandeApi.annulerDemande(id)
    setAnnulerConfirm(false)
    charger()
  }

  const handleEnvoyer = async (e) => {
    e.preventDefault()
    if (!msgInput.trim()) return
    setSendingMsg(true)
    const { data } = await demandeApi.envoyerMessage(id, msgInput.trim())
    setMessages(prev => [...prev, data])
    setMsgInput('')
    setSendingMsg(false)
  }

  if (loading) return <Spinner />
  if (!demande) return <div>Demande introuvable.</div>

  const s    = STATUT_DEMANDE[demande.statut] || { label: demande.statut, color: 'gris' }
  const isClient = user?.role === 'client'
  const canPay   = isClient && demande.statut === 'terminee' && !demande.paiement
  const canEval  = isClient && demande.statut === 'terminee' && !demande.evaluation

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>← Retour</button>
        <h1 style={styles.pageTitle}>Demande : {demande.categorie?.nom}</h1>
        <Badge color={s.color} label={s.label} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem' }}>
        {/* Colonne gauche */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Informations */}
          <Card title="Informations">
            <InfoRow label="Description" value={demande.description} />
            <InfoRow label="Mode" value={demande.mode === 'sur_place' ? '📍 Sur place' : '💻 À distance'} />
            <InfoRow label="Type" value={demande.type_intervention === 'immediat' ? '⚡ Immédiat' : '📅 Planifié'} />
            {demande.adresse && <InfoRow label="Adresse" value={demande.adresse} />}
            {demande.date_souhaitee && <InfoRow label="Date souhaitée" value={formatDateTime(demande.date_souhaitee)} />}
            <InfoRow label="Créée le" value={formatDateTime(demande.created_at)} />
            {demande.montant_devis && <InfoRow label="Devis estimé" value={formatMontant(demande.montant_devis)} />}
            {demande.rapport && <InfoRow label="Rapport technicien" value={demande.rapport} />}
          </Card>

          {/* Technicien */}
          {demande.technicien && (
            <Card title="Technicien assigné">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bleu-clair)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                  👤
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{demande.technicien.prenom} {demande.technicien.nom}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--gris)' }}>{demande.technicien.email}</div>
                  {demande.technicien.telephone && <div style={{ fontSize: '0.82rem', color: 'var(--gris)' }}>📞 {demande.technicien.telephone}</div>}
                </div>
              </div>
            </Card>
          )}

          {/* Photos */}
          {demande.photos?.length > 0 && (
            <Card title="Photos">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {demande.photos.map(p => (
                  <img key={p.id} src={p.image} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 'var(--rayon)', border: '1px solid var(--bordure)' }} />
                ))}
              </div>
            </Card>
          )}

          {/* Actions */}
          {(canPay || canEval || (isClient && demande.statut === 'en_attente')) && (
            <Card title="Actions">
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {isClient && demande.statut === 'en_attente' && (
                  <button onClick={() => setAnnulerConfirm(true)} style={styles.btnDanger}>
                    ❌ Annuler la demande
                  </button>
                )}
                {canPay && (
                  <button onClick={() => setPayModal(true)} style={styles.btnPrimary}>
                    💳 Payer maintenant
                  </button>
                )}
                {canEval && (
                  <button onClick={() => setEvalModal(true)} style={{ ...styles.btnPrimary, background: 'var(--vert)' }}>
                    ⭐ Évaluer le technicien
                  </button>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Colonne droite : Chat */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', boxShadow: 'var(--ombre)', display: 'flex', flexDirection: 'column', height: 500 }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--bordure)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--bleu)' }}>
              💬 Messages
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--gris)', fontSize: '0.85rem', marginTop: '1rem' }}>
                  Aucun message pour l'instant.
                </div>
              ) : (
                messages.map(m => (
                  <div key={m.id} style={{
                    alignSelf:    m.est_mien ? 'flex-end' : 'flex-start',
                    background:   m.est_mien ? 'var(--bleu)' : 'var(--bleu-clair)',
                    color:        m.est_mien ? 'white' : 'var(--texte)',
                    padding:      '0.5rem 0.85rem',
                    borderRadius: m.est_mien ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    maxWidth:     '85%',
                    fontSize:     '0.85rem',
                    lineHeight:   1.4,
                  }}>
                    {!m.est_mien && <div style={{ fontSize: '0.72rem', fontWeight: 700, marginBottom: 2, opacity: 0.7 }}>{m.expediteur?.prenom}</div>}
                    {m.contenu}
                    <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 2, textAlign: 'right' }}>
                      {formatDateTime(m.created_at)}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            {demande.statut !== 'annulee' && demande.statut !== 'terminee' && (
              <form onSubmit={handleEnvoyer} style={{ borderTop: '1px solid var(--bordure)', padding: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                <input
                  value={msgInput}
                  onChange={e => setMsgInput(e.target.value)}
                  placeholder="Votre message…"
                  style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontSize: '0.85rem', outline: 'none' }}
                />
                <button type="submit" disabled={sendingMsg || !msgInput.trim()} style={{ ...styles.btnPrimary, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
                  ➤
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Modale Paiement */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Payer la prestation">
        <PaiementForm demandeId={id} montantDevis={demande.montant_devis} onSuccess={() => { setPayModal(false); charger() }} />
      </Modal>

      {/* Modale Évaluation */}
      <Modal open={evalModal} onClose={() => setEvalModal(false)} title="Évaluer le technicien">
        <EvaluationForm demandeId={id} technicienId={demande.technicien?.id} onSuccess={() => { setEvalModal(false); charger() }} />
      </Modal>

      {/* Confirmation annulation */}
      <Modal open={annulerConfirm} onClose={() => setAnnulerConfirm(false)} title="Confirmer l'annulation" width="380px">
        <p style={{ fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Êtes-vous sûr de vouloir annuler cette demande ?
        </p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => setAnnulerConfirm(false)} style={styles.btnSecondary}>Non</button>
          <button onClick={handleAnnuler} style={styles.btnDanger}>Oui, annuler</button>
        </div>
      </Modal>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', padding: '1.25rem', boxShadow: 'var(--ombre)' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--bleu)' }}>{title}</h3>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.88rem' }}>
      <span style={{ fontWeight: 600, minWidth: 130, color: 'var(--gris)' }}>{label} :</span>
      <span style={{ color: 'var(--texte)' }}>{value}</span>
    </div>
  )
}

function PaiementForm({ demandeId, montantDevis, onSuccess }) {
  const [form, setForm]       = useState({ montant: montantDevis ?? '', methode: 'mobile_money', telephone_paiement: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const extractApiError = (data) => {
    if (!data) return 'Erreur de paiement.'
    if (typeof data === 'string') return data
    if (data.detail) return data.detail
    if (data.error) return data.error
    if (Array.isArray(data.non_field_errors) && data.non_field_errors[0]) return data.non_field_errors[0]

    const firstFieldError = Object.values(data).find((value) => Array.isArray(value) && value[0])
    if (firstFieldError) return firstFieldError[0]

    return 'Erreur de paiement.'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      ...form,
      demande_id: demandeId,
      montant: String(form.montant).replace(',', '.').trim(),
      telephone_paiement: form.telephone_paiement.trim(),
    }

    try {
      const { data } = await paiementApi.initierPaiement(payload)

      if (data?.payment_url) {
        window.location.href = data.payment_url
        return
      }

      onSuccess()
    } catch (err) {
      setError(extractApiError(err.response?.data))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <div style={{ color: 'var(--rouge)', fontSize: '0.85rem' }}>{error}</div>}
      <div>
        <label style={fstyles.label}>Montant (FCFA) *</label>
        <input type="number" value={form.montant} onChange={e => setForm(p => ({ ...p, montant: e.target.value }))} required min="1" style={fstyles.input} />
      </div>
      <div>
        <label style={fstyles.label}>Méthode de paiement *</label>
        <select value={form.methode} onChange={e => setForm(p => ({ ...p, methode: e.target.value }))} style={fstyles.input}>
          <option value="mobile_money">Mobile Money</option>
          <option value="carte">Carte bancaire</option>
          <option value="especes">Espèces</option>
        </select>
      </div>
      {form.methode === 'mobile_money' && (
        <div>
          <label style={fstyles.label}>Numéro de téléphone *</label>
          <input type="tel" value={form.telephone_paiement} onChange={e => setForm(p => ({ ...p, telephone_paiement: e.target.value }))} required placeholder="+229 XX XX XX XX" style={fstyles.input} />
        </div>
      )}
      <button type="submit" disabled={loading} style={{ padding: '0.7rem', background: 'var(--bleu)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 700, cursor: 'pointer' }}>
        {loading ? 'Traitement…' : '💳 Confirmer le paiement'}
      </button>
    </form>
  )
}

function EvaluationForm({ demandeId, technicienId, onSuccess }) {
  const [note, setNote]           = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (note === 0) { setError('Veuillez sélectionner une note.'); return }
    setLoading(true)
    setError('')
    try {
      await evaluationApi.evaluerTechnicien({ demande_id: demandeId, technicien_id: technicienId, note, commentaire })
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Erreur lors de l\'évaluation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <div style={{ color: 'var(--rouge)', fontSize: '0.85rem' }}>{error}</div>}
      <div>
        <label style={{ ...fstyles.label, marginBottom: '0.5rem', display: 'block' }}>Note *</label>
        <StarRating value={note} onChange={setNote} size="lg" />
        {note > 0 && <span style={{ fontSize: '0.82rem', color: 'var(--gris)', marginLeft: '0.5rem' }}>{note}/5</span>}
      </div>
      <div>
        <label style={fstyles.label}>Commentaire (optionnel)</label>
        <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} rows={3} placeholder="Partagez votre expérience…" style={{ ...fstyles.input, resize: 'vertical' }} />
      </div>
      <button type="submit" disabled={loading} style={{ padding: '0.7rem', background: 'var(--vert)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 700, cursor: 'pointer' }}>
        {loading ? 'Envoi…' : '⭐ Soumettre l\'évaluation'}
      </button>
    </form>
  )
}

const fstyles = {
  label: { fontSize: '0.83rem', fontWeight: 600, color: 'var(--texte)', display: 'block', marginBottom: '0.25rem' },
  input: { width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontSize: '0.88rem', outline: 'none' },
}

const styles = {
  pageTitle:    { fontSize: '1.4rem', fontWeight: 700, color: 'var(--bleu)', margin: 0 },
  backBtn:      { background: 'white', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', padding: '5px 12px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--texte)' },
  btnPrimary:   { padding: '8px 16px', background: 'var(--bleu)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' },
  btnSecondary: { padding: '8px 16px', background: 'white', color: 'var(--texte)', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem', flex: 1 },
  btnDanger:    { padding: '8px 16px', background: 'var(--rouge)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem', flex: 1 },
}
