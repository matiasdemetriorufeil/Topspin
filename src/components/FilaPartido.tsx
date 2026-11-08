import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import type { Partido, Torneo } from '../db/schema'
import { formatearFecha } from '../lib/fechas'
import { etiquetaEstado, marcadorPartido } from '../lib/historial'
import { resultadoPartido } from '../lib/resultado'
import IndicadorResultado from './IndicadorResultado'

interface Props {
  partido: Partido
  nombreRival?: string
  torneo?: Torneo
  /** Dentro del detalle de un torneo: muestra solo la ronda, sin repetir el nombre del torneo */
  soloRonda?: boolean
}

export default function FilaPartido({ partido: p, nombreRival, torneo, soloRonda }: Props) {
  const marcador = marcadorPartido(p)
  const estado = etiquetaEstado(p)
  const torneoYRonda = soloRonda
    ? (p.ronda ?? null)
    : torneo
      ? [torneo.nombre, p.ronda].filter(Boolean).join(' · ')
      : null

  return (
    <li>
      <Link to={`/partidos/${p.id}`} className="flex items-center gap-3 px-3 py-3 active:bg-stone-100 dark:active:bg-stone-800">
        <IndicadorResultado resultado={resultadoPartido(p)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="min-w-0 flex-1 truncate font-medium">{nombreRival ?? '…'}</p>
            <span className="shrink-0 text-xs text-stone-500 tabular-nums dark:text-stone-400">
              {formatearFecha(p.fecha)}
            </span>
          </div>
          {(marcador || estado) && (
            <div className="mt-0.5 flex items-center gap-2">
              {marcador && <span className="truncate text-sm tabular-nums">{marcador}</span>}
              {estado && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-px text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  {estado}
                </span>
              )}
            </div>
          )}
          {torneoYRonda && (
            <p className="mt-0.5 truncate text-sm text-stone-500 dark:text-stone-400">{torneoYRonda}</p>
          )}
        </div>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-stone-400" />
      </Link>
    </li>
  )
}
