import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/authApi'
import Spinner from '../components/common/Spinner'

export default function Profil() {
  const { user, updateUser } = useAuth()
  const [form,      setForm]      = useState({ prenom: user?.prenom ?? '', nom: user?.nom ?? '', telephone: user?.telephone ?? '' })
  const [photo,     setPhoto]     = useState(null)
  const [preview,   setPreview]   = useState(user?.photo_profil ?? null)
  const [saving,    setSaving]    = useState(false)
  const [succesInfo, setSuccesInfo] = useState(false)
  const fileRef = useRef()

  const [pwForm,    setPwForm]    = useState({ ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirmer_mot_de_passe: '' })
  const [savingPw,  setSavingPw]  = useState(false)
  const [succesPw,  setSuccesPw]  = useState(false)
  const [errPw,     setErrPw]     = useState('')

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSaveInfo = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSuccesInfo(false)
    try {
      const fd = new FormData()
      fd.append('prenom',    form.prenom)
      fd.append('nom',       form.nom)
      fd.append('telephone', form.telephone)
      if (photo) fd.append('photo_profil', photo)
      const { data } = await authApi.modifierProfil(fd)
      updateUser(data)
      setSuccesInfo(true)
    } catch {
      alert('Erreur lors de la mise à jour.')
    } finally { setSaving(false) }
  }

  const handleChangePw = async (e) => {
    e.preventDefault()
    setErrPw('')
    if (pwForm.nouveau_mot_de_passe !== pwForm.confirmer_mot_de_passe) {
      setErrPw('Les mots de passe ne correspondent pas.')
      return
    }
    setSavingPw(true)
    try {
      await authApi.changerMotDePasse({
        ancien_mot_de_passe:   pwForm.ancien_mot_de_passe,
        nouveau_mot_de_passe:  pwForm.nouveau_mot_de_passe,
      })
      setSuccesPw(true)
      setPwForm({ ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirmer_mot_de_passe: '' })
    } catch (err) {
      setErrPw(err.response?.data?.detail ?? err.response?.data?.ancien_mot_de_passe?.[0] ?? 'Erreur.')
    } finally { setSavingPw(false) }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--bleu)', marginBottom: '1.5rem' }}>Mon profil</h1>

      {/* Informations personnelles */}
      <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', padding: '1.75rem', boxShadow: 'var(--ombre)', marginBottom: '1.5rem' }}>
        <h2 style={styles.sectionTitle}>Informations personnelles</h2>
        <form onSubmit={handleSaveInfo}>
          {/* Photo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
              {preview ? (
                <img src={preview} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--bleu-clair)' }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--bleu-clair)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', fontWeight: 700, color: 'var(--bleu)' }}>
                  {user?.prenom?.[0]}{user?.nom?.[0]}
                </div>
              )}
            </div>
            <button type="button" onClick={() => fileRef.current.click()} style={styles.btnSecondaire}>Changer la photo</button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={styles.label}>Prénom</label>
                <input value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>Nom</label>
                <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} style={styles.input} />
              </div>
            </div>
            <div>
              <label style={styles.label}>Téléphone</label>
              <input value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Email</label>
              <input value={user?.email ?? ''} readOnly style={{ ...styles.input, background: 'var(--gris-bg)', cursor: 'not-allowed' }} />
            </div>
          </div>

          {succesInfo && <div style={styles.success}>✅ Profil mis à jour avec succès.</div>}
          <button type="submit" disabled={saving} style={{ ...styles.btnPrimaire, marginTop: '1.25rem' }}>
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </form>
      </div>

      {/* Changer le mot de passe */}
      <div style={{ background: 'var(--blanc)', borderRadius: 'var(--rayon-lg)', padding: '1.75rem', boxShadow: 'var(--ombre)' }}>
        <h2 style={styles.sectionTitle}>Changer le mot de passe</h2>
        <form onSubmit={handleChangePw} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={styles.label}>Mot de passe actuel</label>
            <input type="password" value={pwForm.ancien_mot_de_passe} onChange={e => setPwForm(p => ({ ...p, ancien_mot_de_passe: e.target.value }))} required style={styles.input} />
          </div>
          <div>
            <label style={styles.label}>Nouveau mot de passe</label>
            <input type="password" value={pwForm.nouveau_mot_de_passe} onChange={e => setPwForm(p => ({ ...p, nouveau_mot_de_passe: e.target.value }))} required style={styles.input} />
          </div>
          <div>
            <label style={styles.label}>Confirmer le nouveau mot de passe</label>
            <input type="password" value={pwForm.confirmer_mot_de_passe} onChange={e => setPwForm(p => ({ ...p, confirmer_mot_de_passe: e.target.value }))} required style={styles.input} />
          </div>
          {errPw     && <div style={styles.error}>{errPw}</div>}
          {succesPw  && <div style={styles.success}>✅ Mot de passe modifié avec succès.</div>}
          <button type="submit" disabled={savingPw} style={styles.btnPrimaire}>
            {savingPw ? 'Modification…' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  sectionTitle:    { fontSize: '1rem', fontWeight: 700, color: 'var(--bleu)', margin: '0 0 1.25rem' },
  label:           { fontSize: '0.83rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' },
  input:           { width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--bordure)', borderRadius: 'var(--rayon)', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' },
  btnPrimaire:     { padding: '0.7rem', background: 'var(--bleu)', color: 'white', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 700, cursor: 'pointer', width: '100%' },
  btnSecondaire:   { padding: '6px 14px', background: 'var(--bleu-clair)', color: 'var(--bleu)', border: 'none', borderRadius: 'var(--rayon)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' },
  success:         { background: 'var(--vert-clair)', color: 'var(--vert)', padding: '0.6rem 1rem', borderRadius: 'var(--rayon)', fontSize: '0.85rem' },
  error:           { background: 'var(--rouge-clair)', color: 'var(--rouge)', padding: '0.6rem 1rem', borderRadius: 'var(--rayon)', fontSize: '0.85rem' },
}
