import type { ReactNode } from 'react'

/** Contenedor de cada bloque de la pantalla (superficie de los gráficos). */
export function Tarjeta({ titulo, children, className = '' }: { titulo?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 ${className}`}>
      {titulo && <h2 className="mb-3 font-semibold">{titulo}</h2>}
      {children}
    </section>
  )
}

/** Stat tile: etiqueta, valor y una línea de detalle. */
export function TarjetaDato({ etiqueta, valor, detalle }: { etiqueta: string; valor: ReactNode; detalle?: ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
      <p className="text-sm text-stone-500 dark:text-stone-400">{etiqueta}</p>
      <p className="mt-1 text-2xl font-semibold">{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{detalle}</p>}
    </div>
  )
}

/** Muestra de color + texto. El texto va siempre en color de texto, nunca en el de la serie. */
export function Leyenda({ items }: { items: { color: string; etiqueta: string; forma?: 'cuadrado' | 'linea' }[] }) {
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600 dark:text-stone-300">
      {items.map((i) => (
        <li key={i.etiqueta} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={i.forma === 'linea' ? 'h-0.5 w-4 rounded-full' : 'size-3 rounded-sm'}
            style={{ background: i.color }}
          />
          {i.etiqueta}
        </li>
      ))}
    </ul>
  )
}

/** Caja del tooltip de los gráficos. */
export function CajaTooltip({ titulo, filas }: { titulo: string; filas: { color: string; etiqueta: string; valor: string }[] }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-stone-700 dark:bg-stone-800">
      <p className="mb-1 font-medium">{titulo}</p>
      {filas.map((f) => (
        <p key={f.etiqueta} className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
          <span aria-hidden className="size-2.5 rounded-sm" style={{ background: f.color }} />
          <span className="flex-1">{f.etiqueta}</span>
          <span className="font-medium text-stone-900 tabular-nums dark:text-stone-100">{f.valor}</span>
        </p>
      ))}
    </div>
  )
}

/** Vista de tabla de un gráfico, colapsada (accesibilidad y valores exactos). */
export function VerTabla({ children }: { children: ReactNode }) {
  return (
    <details className="mt-2 text-sm">
      <summary className="flex h-11 cursor-pointer items-center text-lona-600 dark:text-lona-500">Ver tabla</summary>
      <div className="max-h-64 overflow-y-auto">{children}</div>
    </details>
  )
}
