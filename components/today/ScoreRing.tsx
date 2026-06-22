import { scoreLabel } from '@/lib/copy'

interface ScoreRingProps {
  pct:      number   // 0–100
  size?:    number   // outer diameter in px; defaults to 80
  compact?: boolean  // when true: tiny ring for the header, no label
}

/**
 * Reusable score ring SVG.
 * compact=false (default): full ring with percentage + label text below.
 * compact=true:            small header ring, percentage only.
 *
 * Colour scale: white/dim for 0–19%, gold for 20–79%, teal for 80–100%.
 */
export function ScoreRing({ pct, size = 80, compact = false }: ScoreRingProps) {
  const stroke = compact ? 3 : 5
  const r      = (size - stroke) / 2
  const circ   = 2 * Math.PI * r
  const dash   = Math.max(0, Math.min(1, pct / 100)) * circ

  const color =
    pct >= 80 ? '#2DD4BF' :
    pct >= 20 ? '#D9A653' :
                'rgba(255,255,255,0.2)'

  if (compact) {
    return (
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.4s ease, stroke 0.4s ease' }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center"
          style={{ color, fontSize: size * 0.28, fontFamily: 'var(--font-geist)', fontWeight: 600 }}>
          {pct}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0 -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.4s ease, stroke 0.4s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading font-bold" style={{ color, fontSize: size * 0.28 }}>
            {pct}%
          </span>
        </div>
      </div>
      <p className="text-xs font-body text-center" style={{ color: 'rgba(255,255,255,0.45)', maxWidth: 160 }}>
        {scoreLabel(pct)}
      </p>
    </div>
  )
}
