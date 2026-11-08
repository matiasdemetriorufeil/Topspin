import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatearDelta } from '../lib/formato'

/** "+14 pts" / "-9 pts" con flecha (el color no es la única señal). */
export default function VariacionRanking({ delta, className = '' }: { delta: number; className?: string }) {
  const sube = Math.round(delta) >= 0
  const Icono = sube ? TrendingUp : TrendingDown
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
        sube ? 'text-lona-600 dark:text-lona-500' : 'text-red-600 dark:text-red-400'
      } ${className}`}
    >
      <Icono aria-hidden className="size-4" />
      {formatearDelta(delta)}
    </span>
  )
}
