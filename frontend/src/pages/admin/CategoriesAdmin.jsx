import { useEffect, useState } from 'react'
import Modal from '../../components/common/Modal'
import Spinner from '../../components/common/Spinner'
import { technicienApi } from '../../api/technicienApi'

const EMPTY_FORM = {
  nom: '',
  description: '',
  icone: '',
}

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const charger = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await technicienApi.getCategories()
      setCategories(Array.isArray(data) ? data : (data.results ?? []))
    } catch (err) {
      setError(err?.response?.data?.error || 'Impossible de charger les catégories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    charger()
  }, [])

  const ouvrirCreation = () => {
    setEditingCategory(null)
    setForm(EMPTY_FORM)
    setError('')
    setModalOpen(true)
  }

  const ouvrirEdition = (categorie) => {
    setEditingCategory(categorie)
    setForm({
      nom: categorie.nom || '',
      description: categorie.description || '',
      icone: categorie.icone || '',
    })
    setError('')
    setModalOpen(true)
  }

  const fermerModal = () => {
    if (saving) return
    setModalOpen(false)
    setEditingCategory(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editingCategory) {
        await technicienApi.modifierCategorie(editingCategory.id, form)
      } else {
        await technicienApi.creerCategorie(form)
      }
      fermerModal()
      await charger()
    } catch (err) {
      const apiErrors = err?.response?.data
      if (typeof apiErrors === 'object' && apiErrors !== null) {
        const firstMessage = Object.values(apiErrors).flat().find(Boolean)
        setError(firstMessage || 'Enregistrement impossible.')
      } else {
        setError('Enregistrement impossible.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (categorie) => {
    const confirmed = window.confirm(`Supprimer la catégorie "${categorie.nom}" ?`)
    if (!confirmed) return

    setSaving(true)
    setError('')
    try {
      await technicienApi.supprimerCategorie(categorie.id)
      await charger()
    } catch (err) {
      setError(err?.response?.data?.error || 'Suppression impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.pageTitle}>Gestion des catégories</h1>
          <p style={styles.subtitle}>
            Créez, modifiez et supprimez les catégories de services visibles par les clients et techniciens.
          </p>
        </div>
        <button onClick={ouvrirCreation} style={styles.primaryButton}>
          + Nouvelle catégorie
        </button>
      </div>

      {error && !modalOpen && (
        <div style={styles.errorBox}>{error}</div>
      )}

      {loading ? <Spinner /> : categories.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗂️</div>
          <div style={{ fontWeight: 700, color: 'var(--bleu)', marginBottom: '0.35rem' }}>Aucune catégorie</div>
          <div style={{ color: 'var(--gris)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Commencez par créer une catégorie de service.
          </div>
          <button onClick={ouvrirCreation} style={styles.primaryButton}>Créer la première catégorie</button>
        </div>
      ) : (
        <div style={styles.grid}>
          {categories.map((categorie) => (
            <article key={categorie.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div style={styles.iconBubble}>{categorie.icone || '🧰'}</div>
                <div style={{ flex: 1 }}>
                  <h2 style={styles.cardTitle}>{categorie.nom}</h2>
                  <p style={styles.cardDescription}>{categorie.description || 'Aucune description fournie.'}</p>
                </div>
              </div>

              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Icône</span>
                <span style={styles.metaValue}>{categorie.icone || '—'}</span>
              </div>

              <div style={styles.actionsRow}>
                <button onClick={() => ouvrirEdition(categorie)} style={styles.secondaryButton}>Modifier</button>
                <button onClick={() => handleDelete(categorie)} style={styles.deleteButton} disabled={saving}>Supprimer</button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={fermerModal}
        title={editingCategory ? `Modifier : ${editingCategory.nom}` : 'Nouvelle catégorie'}
        width="540px"
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={styles.errorBox}>{error}</div>}

          <label style={styles.fieldBlock}>
            <span style={styles.fieldLabel}>Nom</span>
            <input
              name="nom"
              value={form.nom}
              onChange={handleChange}
              required
              placeholder="Ex: Plomberie"
              style={styles.input}
            />
          </label>

          <label style={styles.fieldBlock}>
            <span style={styles.fieldLabel}>Icône</span>
            <input
              name="icone"
              value={form.icone}
              onChange={handleChange}
              placeholder="Ex: 🔧"
              style={styles.input}
            />
          </label>

          <label style={styles.fieldBlock}>
            <span style={styles.fieldLabel}>Description</span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Décrivez les services associés à cette catégorie."
              style={styles.textarea}
            />
          </label>

          <div style={styles.modalActions}>
            <button type="button" onClick={fermerModal} style={styles.secondaryButton} disabled={saving}>
              Annuler
            </button>
            <button type="submit" style={styles.primaryButton} disabled={saving}>
              {saving ? 'Enregistrement…' : editingCategory ? 'Enregistrer les modifications' : 'Créer la catégorie'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
    marginBottom: '1.5rem',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--bleu)',
    marginBottom: '0.4rem',
  },
  subtitle: {
    color: 'var(--gris)',
    fontSize: '0.92rem',
    maxWidth: 680,
    lineHeight: 1.5,
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: 'var(--blanc)',
    borderRadius: 'var(--rayon-lg)',
    padding: '1.2rem',
    boxShadow: 'var(--ombre)',
    border: '1px solid rgba(31, 93, 154, 0.08)',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.9rem',
    marginBottom: '1rem',
  },
  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #e8f1fb 0%, #d7e8ff 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.55rem',
    flexShrink: 0,
  },
  cardTitle: {
    margin: '0 0 0.35rem',
    fontSize: '1.05rem',
    color: 'var(--bleu)',
  },
  cardDescription: {
    margin: 0,
    color: 'var(--gris)',
    fontSize: '0.88rem',
    lineHeight: 1.5,
    minHeight: 42,
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.7rem 0',
    borderTop: '1px solid var(--bordure)',
    borderBottom: '1px solid var(--bordure)',
    marginBottom: '1rem',
    fontSize: '0.84rem',
  },
  metaLabel: {
    color: 'var(--gris)',
    fontWeight: 600,
  },
  metaValue: {
    color: 'var(--texte)',
  },
  actionsRow: {
    display: 'flex',
    gap: '0.75rem',
  },
  primaryButton: {
    background: 'var(--bleu)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--rayon)',
    padding: '0.75rem 1rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '0.88rem',
  },
  secondaryButton: {
    background: 'var(--bleu-clair)',
    color: 'var(--bleu2)',
    border: 'none',
    borderRadius: 'var(--rayon)',
    padding: '0.7rem 0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.85rem',
    flex: 1,
  },
  deleteButton: {
    background: 'var(--rouge-clair)',
    color: 'var(--rouge)',
    border: 'none',
    borderRadius: 'var(--rayon)',
    padding: '0.7rem 0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '0.85rem',
    flex: 1,
  },
  emptyState: {
    background: 'var(--blanc)',
    borderRadius: 'var(--rayon-lg)',
    boxShadow: 'var(--ombre)',
    textAlign: 'center',
    padding: '3rem 1.5rem',
  },
  fieldBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  fieldLabel: {
    fontWeight: 700,
    fontSize: '0.84rem',
    color: 'var(--bleu)',
  },
  input: {
    width: '100%',
    padding: '0.8rem 0.9rem',
    borderRadius: 'var(--rayon)',
    border: '1px solid var(--bordure)',
    fontSize: '0.9rem',
  },
  textarea: {
    width: '100%',
    padding: '0.8rem 0.9rem',
    borderRadius: 'var(--rayon)',
    border: '1px solid var(--bordure)',
    fontSize: '0.9rem',
    resize: 'vertical',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  errorBox: {
    background: '#fff1f1',
    color: '#c53030',
    border: '1px solid #feb2b2',
    borderRadius: 'var(--rayon)',
    padding: '0.8rem 1rem',
    marginBottom: '1rem',
    fontSize: '0.88rem',
  },
}