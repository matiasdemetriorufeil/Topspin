import { useId, type ReactNode } from 'react'
import { claseError, claseEtiqueta } from './estilos'

interface Opcion<V extends string> {
  valor: V
  etiqueta: ReactNode
  /** Clases cuando está elegida (por defecto, fondo blanco) */
  claseActiva?: string
}

interface Props<V extends string> {
  etiqueta: string
  /** La etiqueta queda solo para lectores de pantalla */
  ocultarEtiqueta?: boolean
  opciones: Opcion<V>[]
  /** '' = ninguna elegida */
  valor: V | ''
  onChange: (valor: V) => void
  columnas?: number
  deshabilitado?: boolean
  error?: string
}

const claseActivaPorDefecto = 'bg-white shadow-sm dark:bg-stone-950'

/** Control segmentado (radios con estilo de botones), cómodo para el pulgar. */
export default function Segmentado<V extends string>({
  etiqueta,
  ocultarEtiqueta,
  opciones,
  valor,
  onChange,
  columnas = opciones.length,
  deshabilitado,
  error,
}: Props<V>) {
  const nombre = useId()
  return (
    <fieldset disabled={deshabilitado} aria-describedby={error ? `${nombre}-error` : undefined} className="min-w-0">
      <legend className={ocultarEtiqueta ? 'sr-only' : claseEtiqueta}>{etiqueta}</legend>
      <div
        className={`grid gap-1 rounded-lg bg-stone-200 p-1 dark:bg-stone-800 ${error ? 'ring-2 ring-red-500' : ''}`}
        style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}
      >
        {opciones.map((o) => {
          const activa = o.valor === valor
          return (
            <label
              key={o.valor}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md px-1 transition-colors duration-150 text-center text-sm leading-tight font-medium has-focus-visible:ring-2 has-focus-visible:ring-lona-600 ${
                activa ? (o.claseActiva ?? claseActivaPorDefecto) : 'text-stone-600 dark:text-stone-300'
              } ${deshabilitado ? 'cursor-default opacity-70' : ''}`}
            >
              <input
                type="radio"
                name={nombre}
                value={o.valor}
                checked={activa}
                onChange={() => onChange(o.valor)}
                className="sr-only"
              />
              {o.etiqueta}
            </label>
          )
        })}
      </div>
      {error && (
        <p id={`${nombre}-error`} data-error className={claseError}>
          {error}
        </p>
      )}
    </fieldset>
  )
}
