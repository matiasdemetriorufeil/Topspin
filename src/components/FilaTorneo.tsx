import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import type { Torneo } from '../db/schema'
import { formatearFecha } from '../lib/fechas'
import { esTitulo } from '../lib/palmares'
import { etiquetaResultado, FORMATOS } from '../lib/torneo'

export default function FilaTorneo({ torneo: t, nombreClub }: { torneo: Torneo; nombreClub?: string }) {
  const resultado = etiquetaResultado(t)
  return (
    <li>
      <Link to={`/palmares/torneos/${t.id}`} className="flex items-center gap-3 px-3 py-3 active:bg-stone-100 dark:active:bg-stone-800">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{t.nombre}</p>
          <p className="truncate text-sm text-stone-500 dark:text-stone-400">
            {[formatearFecha(t.fecha), nombreClub, FORMATOS.find((f) => f.valor === t.formato)?.etiqueta, t.categoria]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-sm ${
            esTitulo(t)
              ? 'bg-amber-100 font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              : resultado
                ? 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
                : 'text-stone-400'
          }`}
        >
          {resultado ?? 'Sin resultado'}
        </span>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-stone-400" />
      </Link>
    </li>
  )
}
