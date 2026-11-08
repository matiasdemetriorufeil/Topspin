import { Plus } from 'lucide-react'
import { Link } from 'react-router'

/**
 * Botón "+" para cargar un partido, abajo a la derecha sobre la barra de
 * navegación. Con `texto` se muestra extendido (ej. "Nuevo partido" en Inicio).
 */
export default function BotonFlotante({ texto }: { texto?: string }) {
  return (
    <>
      {/* Espacio para que el botón no tape lo último de la página */}
      <div aria-hidden className="h-20" />
      <Link
        to="/partidos/nuevo"
        aria-label={texto ? undefined : 'Cargar partido'}
        className={`fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 flex h-14 items-center justify-center gap-2 rounded-full bg-lona-600 text-white shadow-lg shadow-lona-700/30 active:bg-lona-700 ${
          texto ? 'pr-6 pl-5 font-semibold' : 'w-14'
        }`}
      >
        <Plus aria-hidden className="size-7" />
        {texto}
      </Link>
    </>
  )
}
