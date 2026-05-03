import { useEffect, useRef } from 'react'

/**
 * Fenêtre modale réutilisable
 * Props:
 *   - open: bool
 *   - onClose: fn
 *   - title: string
 *   - children
 *   - width: string (ex: '480px')
 */
export default function Modal({ open, onClose, title, children, width = '480px' }) {
  const overlayRef = useRef(null)

  // Fermer sur Echap
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position:        'fixed',
        inset:           0,
        background:      'rgba(0,0,0,0.45)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        zIndex:          1000,
        padding:         '1rem',
        animation:       'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        background:   'var(--blanc)',
        borderRadius: 'var(--rayon-lg)',
        width:        '100%',
        maxWidth:     width,
        maxHeight:    '90vh',
        overflowY:    'auto',
        boxShadow:    '0 8px 32px rgba(0,0,0,0.18)',
        animation:    'fadeIn 0.2s ease',
      }}>
        {/* Header */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '1rem 1.5rem',
          borderBottom:   '1px solid var(--bordure)',
        }}>
          <h3 style={{ margin: 0, color: 'var(--bleu)', fontSize: '1.05rem' }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: 'none',
              border:     'none',
              fontSize:   '1.4rem',
              cursor:     'pointer',
              color:      'var(--gris)',
              lineHeight: 1,
            }}
          >×</button>
        </div>
        {/* Body */}
        <div style={{ padding: '1.5rem' }}>{children}</div>
      </div>
    </div>
  )
}
