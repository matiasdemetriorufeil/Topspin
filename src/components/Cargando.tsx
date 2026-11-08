import { useEffect, useState, type ComponentProps } from 'react'
import Encabezado from './Encabezado'

/**
 * Esqueleto de carga. Aparece recién a los 250 ms: IndexedDB casi siempre
 * responde antes y así no hay un parpadeo en cada cambio de pantalla.
 */
export function Cargando({ bloques = 3 }: { bloques?: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 250)
    return () => clearTimeout(t)
  }, [])

  return (
    <div role="status" className={visible ? 'animate-entrada' : 'invisible'}>
      <span className="sr-only">Cargando…</span>
      <div aria-hidden className="flex flex-col gap-3">
        {Array.from({ length: bloques }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-stone-200/70 dark:bg-stone-800/70" />
        ))}
      </div>
    </div>
  )
}

/** Pantalla mientras cargan sus datos: el encabezado real + el esqueleto. */
export default function PantallaCargando(props: ComponentProps<typeof Encabezado>) {
  return (
    <>
      <Encabezado {...props} />
      <Cargando />
    </>
  )
}
