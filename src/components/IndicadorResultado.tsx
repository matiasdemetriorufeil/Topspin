import type { Resultado } from '../lib/resultado'

const estilos = {
  ganado: { letra: 'V', etiqueta: 'Victoria', clase: 'bg-lona-600 text-white' },
  perdido: { letra: 'D', etiqueta: 'Derrota', clase: 'bg-red-600 text-white' },
  nulo: { letra: '–', etiqueta: 'Sin resultado', clase: 'bg-stone-300 text-stone-700 dark:bg-stone-700 dark:text-stone-200' },
}

/** Círculo V (verde) / D (rojo) / – (gris). */
export default function IndicadorResultado({ resultado, grande }: { resultado: Resultado; grande?: boolean }) {
  const e = estilos[resultado ?? 'nulo']
  return (
    <span
      role="img"
      aria-label={e.etiqueta}
      className={`grid shrink-0 place-items-center rounded-full font-bold ${grande ? 'size-14 text-2xl' : 'size-9'} ${e.clase}`}
    >
      {e.letra}
    </span>
  )
}
