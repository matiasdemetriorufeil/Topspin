import { ChevronDown, Plus } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { mensajeDeError } from '../db/repos'
import { filtrarPorNombre, limpiarNombre, mismoNombre } from '../lib/texto'
import { claseCampo, claseError, claseEtiqueta } from './estilos'

interface Opcion {
  id: string
  nombre: string
}

interface Props<T extends Opcion> {
  etiqueta: string
  /** undefined mientras carga (lo que devuelve useLiveQuery al principio) */
  opciones: T[] | undefined
  valor: string | undefined
  onChange: (id: string) => void
  /** Crea la entidad y la devuelve; puede lanzar ErrorDeUsuario (ej. duplicado). */
  onCrear: (nombre: string) => Promise<T>
  placeholder?: string
  /** Error de validación del formulario que lo contiene */
  error?: string
}

/**
 * Combobox con búsqueda: elige una opción existente o crea una nueva
 * escribiendo el nombre. La búsqueda ignora mayúsculas y tildes, y no ofrece
 * crear un nombre que ya existe.
 */
export default function SelectorConCreacion<T extends Opcion>({
  etiqueta,
  opciones,
  valor,
  onChange,
  onCrear,
  placeholder = 'Buscar o agregar…',
  error: errorExterno,
}: Props<T>) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [abierto, setAbierto] = useState(false)
  const [consulta, setConsulta] = useState('')
  const [activo, setActivo] = useState(0)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const seleccionado = opciones?.find((o) => o.id === valor)
  const filtradas = useMemo(() => filtrarPorNombre(opciones ?? [], consulta), [opciones, consulta])
  const nombreNuevo = limpiarNombre(consulta)
  const puedeCrear =
    opciones !== undefined && nombreNuevo !== '' && !opciones.some((o) => mismoNombre(o.nombre, nombreNuevo))
  const total = filtradas.length + (puedeCrear ? 1 : 0)
  const idOpcion = (i: number) => `${id}-op-${i}`

  useEffect(() => {
    if (abierto) document.getElementById(idOpcion(activo))?.scrollIntoView({ block: 'nearest' })
  })

  function abrir() {
    setAbierto(true)
    setConsulta('')
    setActivo(0)
    setError(null)
  }

  function terminar() {
    setAbierto(false)
    setConsulta('')
    inputRef.current?.blur()
  }

  function elegir(opcion: T) {
    onChange(opcion.id)
    terminar()
  }

  async function crear() {
    setCreando(true)
    setError(null)
    try {
      const nuevo = await onCrear(nombreNuevo)
      onChange(nuevo.id)
      terminar()
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo agregar.'))
    } finally {
      setCreando(false)
    }
  }

  function confirmar(i: number) {
    if (i < filtradas.length) elegir(filtradas[i])
    else if (puedeCrear && !creando) void crear()
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!abierto) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        abrir()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActivo((a) => Math.min(a + 1, total - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActivo((a) => Math.max(a - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (total > 0) confirmar(activo)
        break
      case 'Escape':
        e.preventDefault()
        terminar()
        break
    }
  }

  const claseOpcion = (i: number) =>
    `flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 ${
      i === activo ? 'bg-stone-100 dark:bg-stone-800' : ''
    }`

  return (
    <div className="relative">
      <label htmlFor={id} className={claseEtiqueta}>
        {etiqueta}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          aria-invalid={Boolean(error ?? errorExterno)}
          aria-activedescendant={abierto && total > 0 ? idOpcion(activo) : undefined}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
          value={abierto ? consulta : (seleccionado?.nombre ?? '')}
          placeholder={abierto && seleccionado ? seleccionado.nombre : placeholder}
          onFocus={abrir}
          onBlur={() => !creando && setAbierto(false)}
          onChange={(e) => {
            setConsulta(e.target.value)
            setActivo(0)
            setError(null)
          }}
          onKeyDown={onKeyDown}
          className={`${claseCampo} w-full pr-10`}
        />
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-stone-400"
        />
      </div>

      {abierto && (
        <ul
          id={`${id}-lista`}
          role="listbox"
          aria-label={etiqueta}
          // Evita que el input pierda el foco (y se cierre la lista) antes del click
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-x-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
          {opciones === undefined && <li className="px-3 py-2 text-stone-500">Cargando…</li>}
          {filtradas.map((o, i) => (
            <li
              key={o.id}
              id={idOpcion(i)}
              role="option"
              aria-selected={o.id === valor}
              onClick={() => elegir(o)}
              onPointerEnter={() => setActivo(i)}
              className={`${claseOpcion(i)} ${o.id === valor ? 'font-semibold text-lona-600 dark:text-lona-500' : ''}`}
            >
              {o.nombre}
            </li>
          ))}
          {puedeCrear && (
            <li
              id={idOpcion(filtradas.length)}
              role="option"
              aria-selected={false}
              aria-disabled={creando}
              onClick={() => confirmar(filtradas.length)}
              onPointerEnter={() => setActivo(filtradas.length)}
              className={`${claseOpcion(filtradas.length)} text-lona-600 dark:text-lona-500`}
            >
              <Plus aria-hidden className="size-4 shrink-0" />
              {creando ? 'Agregando…' : `Agregar «${nombreNuevo}»`}
            </li>
          )}
          {opciones !== undefined && total === 0 && (
            <li className="px-3 py-2 text-stone-500">Escribí un nombre para agregarlo.</li>
          )}
        </ul>
      )}

      {(error ?? errorExterno) && (
        <p role="alert" className={claseError}>
          {error ?? errorExterno}
        </p>
      )}
    </div>
  )
}
