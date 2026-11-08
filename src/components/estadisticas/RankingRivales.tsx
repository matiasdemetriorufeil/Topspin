import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import type { FilaRankingRival } from '../../lib/estadisticas'
import { formatearPorcentaje } from '../../lib/formato'

export default function RankingRivales({ filas, nombres }: { filas: FilaRankingRival[]; nombres: Map<string, string> }) {
  if (filas.length === 0) return <p className="text-sm text-stone-500 dark:text-stone-400">Sin partidos en este período.</p>

  return (
    <div className="-mx-4 -mb-4">
      <div aria-hidden className="grid grid-cols-[1fr_3.5rem_3rem_1.25rem] gap-2 px-4 pb-1 text-xs text-stone-500 dark:text-stone-400">
        <span>Rival</span>
        <span className="text-right">G-P</span>
        <span className="text-right">%</span>
      </div>
      <ul className="divide-y divide-stone-100 border-t border-stone-100 dark:divide-stone-800 dark:border-stone-800">
        {filas.map((f) => {
          const nombre = nombres.get(f.rivalId) ?? '…'
          return (
            <li key={f.rivalId}>
              <Link
                to={`/estadisticas/rivales/${f.rivalId}`}
                aria-label={`${nombre}: ${f.ganados} ganados, ${f.perdidos} perdidos, ${formatearPorcentaje(f.porcentaje)}. Ver head to head`}
                className="grid min-h-12 grid-cols-[1fr_3.5rem_3rem_1.25rem] items-center gap-2 px-4 py-2 active:bg-stone-100 dark:active:bg-stone-800"
              >
                <span className="truncate font-medium">{nombre}</span>
                <span className="text-right tabular-nums">
                  {f.ganados}-{f.perdidos}
                </span>
                <span className="text-right font-semibold tabular-nums">{formatearPorcentaje(f.porcentaje)}</span>
                <ChevronRight aria-hidden className="size-5 text-stone-400" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
