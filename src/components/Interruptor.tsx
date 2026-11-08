import { useId } from 'react'

interface Props {
  etiqueta: string
  descripcion?: string
  activado: boolean
  onChange: (activado: boolean) => void
}

/** Switch estilo iOS, con toda la fila tocable. */
export default function Interruptor({ etiqueta, descripcion, activado, onChange }: Props) {
  const id = useId()
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="font-medium">
          {etiqueta}
        </label>
        {descripcion && (
          <p id={`${id}-desc`} className="text-sm text-stone-500 dark:text-stone-400">
            {descripcion}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={activado}
        aria-describedby={descripcion ? `${id}-desc` : undefined}
        onClick={() => onChange(!activado)}
        className={`relative h-8 w-13 shrink-0 rounded-full transition-colors after:absolute after:-inset-1.5 after:content-[''] focus-visible:ring-2 focus-visible:ring-lona-600 focus-visible:ring-offset-2 focus-visible:outline-none ${
          activado ? 'bg-lona-600' : 'bg-stone-300 dark:bg-stone-700'
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform ${activado ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}
