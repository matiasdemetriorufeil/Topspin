import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

interface Props {
  titulo: string
  /** "Volver" arriba del título: un link a una ruta o una acción (ej. volver atrás en el historial) */
  volver?: { texto: string } & ({ a: string } | { onClick: () => void })
  /** Acción a la derecha del título (ej. botón "+ Torneo") */
  accion?: ReactNode
}

const claseVolver = '-ml-2 inline-flex h-11 items-center pr-2 text-lona-600 dark:text-lona-500'

export default function Encabezado({ titulo, volver, accion }: Props) {
  return (
    <header className="pt-4 pb-4">
      {volver &&
        ('a' in volver ? (
          <Link to={volver.a} className={claseVolver}>
            <ChevronLeft aria-hidden className="size-6" />
            {volver.texto}
          </Link>
        ) : (
          <button type="button" onClick={volver.onClick} className={claseVolver}>
            <ChevronLeft aria-hidden className="size-6" />
            {volver.texto}
          </button>
        ))}
      <div className={`flex items-center justify-between gap-3 ${volver ? '' : 'pt-2'}`}>
        <h1 className="text-3xl font-bold">{titulo}</h1>
        {accion}
      </div>
    </header>
  )
}
