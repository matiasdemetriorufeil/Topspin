import { RefreshCw } from 'lucide-react'
import { useActualizacion } from '../pwa/contexto'

/** Aviso flotante arriba de la pantalla cuando hay una versión nueva. */
export default function AvisoActualizacion() {
  const { hayNueva, actualizar } = useActualizacion()
  if (!hayNueva) return null
  return (
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-30 mx-auto max-w-xl px-4">
      <BotonActualizar onClick={actualizar} className="w-full shadow-lg" />
    </div>
  )
}

export function BotonActualizar({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`animate-entrada flex min-h-12 items-center gap-3 rounded-xl bg-stone-900 px-4 py-2 text-left font-medium text-white active:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:active:bg-stone-300 ${className}`}
    >
      <RefreshCw aria-hidden className="size-5 shrink-0" />
      Hay una nueva versión, tocá para actualizar
    </button>
  )
}
