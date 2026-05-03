/**
 * Badge de statut coloré
 * Props:
 *   - color: 'vert' | 'rouge' | 'orange' | 'bleu' | 'gris'
 *   - label: string
 */
export default function Badge({ color = 'gris', label }) {
  const colors = {
    vert:   { bg: 'var(--vert-clair)',  text: 'var(--vert)'  },
    rouge:  { bg: 'var(--rouge-clair)', text: 'var(--rouge)' },
    orange: { bg: '#fff3cd',            text: 'var(--orange)' },
    bleu:   { bg: 'var(--bleu-clair)',  text: 'var(--bleu2)' },
    gris:   { bg: '#e9ecef',            text: 'var(--gris)'  },
  }
  const c = colors[color] || colors.gris

  return (
    <span style={{
      display:      'inline-block',
      padding:      '2px 10px',
      borderRadius: '999px',
      fontSize:     '0.78rem',
      fontWeight:   600,
      background:   c.bg,
      color:        c.text,
      whiteSpace:   'nowrap',
    }}>
      {label}
    </span>
  )
}
