/**
 * Affichage d'étoiles (lecture seule ou interactif)
 * Props:
 *   - value: number (1-5)
 *   - onChange: fn(note) — si fourni, rendu interactif
 *   - size: 'sm' | 'md' | 'lg'
 */
export default function StarRating({ value = 0, onChange, size = 'md' }) {
  const sizes = { sm: 16, md: 22, lg: 30 }
  const px = sizes[size] || 22

  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          onClick={() => onChange && onChange(star)}
          style={{
            fontSize:   px,
            cursor:     onChange ? 'pointer' : 'default',
            color:      star <= value ? '#f59e0b' : '#d1d5db',
            transition: 'color 0.15s',
            userSelect: 'none',
          }}
          title={onChange ? `${star} étoile${star > 1 ? 's' : ''}` : undefined}
        >
          ★
        </span>
      ))}
    </span>
  )
}
