/**
 * Spinner de chargement
 * Props:
 *   - fullPage: bool — centré dans toute la page
 *   - size: 'sm' | 'md' | 'lg'
 */
export default function Spinner({ fullPage = false, size = 'md' }) {
  const sizes = { sm: 20, md: 36, lg: 56 }
  const px = sizes[size] || 36

  const spinner = (
    <span
      style={{
        display:      'inline-block',
        width:        px,
        height:       px,
        border:       `3px solid var(--bleu-clair)`,
        borderTop:    `3px solid var(--bleu2)`,
        borderRadius: '50%',
        animation:    'spin 0.7s linear infinite',
      }}
    />
  )

  if (fullPage) {
    return (
      <div style={{
        position:       'fixed',
        inset:          0,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        background:     'rgba(255,255,255,0.8)',
        zIndex:         9999,
      }}>
        {spinner}
      </div>
    )
  }

  return <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>{spinner}</div>
}
