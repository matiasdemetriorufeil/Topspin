import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { mensajeDeError } from '../db/repos'
import { claseBotonPrimario, claseCampo, claseError } from './estilos'

interface Item {
  id: string
  nombre: string
}

interface Props {
  titulo: string
  /** Para el placeholder: "Nuevo rival", "Nuevo club" */
  nuevoPlaceholder: string
  vacio: string
  items: Item[] | undefined
  onCrear: (nombre: string) => Promise<unknown>
  onRenombrar: (id: string, nombre: string) => Promise<unknown>
  onBorrar: (id: string) => Promise<unknown>
}

const claseInput = `${claseCampo} min-w-0 flex-1`
const claseBotonIcono =
  'grid size-11 shrink-0 place-items-center rounded-lg text-stone-500 active:bg-stone-200 dark:text-stone-400 dark:active:bg-stone-800'

/** Lista con alta, renombrado y borrado por nombre (rivales, clubes). */
export default function ListaEditable({
  titulo,
  nuevoPlaceholder,
  vacio,
  items,
  onCrear,
  onRenombrar,
  onBorrar,
}: Props) {
  const [nuevo, setNuevo] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function crear(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await onCrear(nuevo)
      setNuevo('')
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-lg font-semibold">
        {titulo}
        {items && <span className="ml-2 text-sm font-normal text-stone-500">{items.length}</span>}
      </h2>

      <form onSubmit={crear} className="flex gap-2">
        <input
          value={nuevo}
          onChange={(e) => {
            setNuevo(e.target.value)
            setError(null)
          }}
          placeholder={nuevoPlaceholder}
          aria-label={nuevoPlaceholder}
          autoCapitalize="words"
          enterKeyHint="done"
          className={claseInput}
        />
        <button
          type="submit"
          disabled={!nuevo.trim()}
          className={claseBotonPrimario}
        >
          <Plus aria-hidden className="size-5" />
          Agregar
        </button>
      </form>
      {error && (
        <p role="alert" className={claseError}>
          {error}
        </p>
      )}

      <ul className="mt-3 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
        {items === undefined && <li className="px-3 py-3 text-stone-500">Cargando…</li>}
        {items?.length === 0 && <li className="px-3 py-3 text-stone-500">{vacio}</li>}
        {items?.map((item) => (
          <Fila key={item.id} item={item} onRenombrar={onRenombrar} onBorrar={onBorrar} />
        ))}
      </ul>
    </section>
  )
}

function Fila({
  item,
  onRenombrar,
  onBorrar,
}: {
  item: Item
  onRenombrar: Props['onRenombrar']
  onBorrar: Props['onBorrar']
}) {
  const [editando, setEditando] = useState(false)
  const [nombre, setNombre] = useState(item.nombre)
  const [error, setError] = useState<string | null>(null)

  function empezarEdicion() {
    setNombre(item.nombre)
    setError(null)
    setEditando(true)
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await onRenombrar(item.id, nombre)
      setEditando(false)
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  async function borrar() {
    if (!window.confirm(`¿Borrar «${item.nombre}»?`)) return
    setError(null)
    try {
      await onBorrar(item.id)
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  return (
    <li className="px-3 py-1">
      {editando ? (
        <form onSubmit={guardar} className="flex items-center gap-1 py-1">
          <input
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => e.key === 'Escape' && setEditando(false)}
            aria-label={`Nuevo nombre para ${item.nombre}`}
            autoFocus
            autoCapitalize="words"
            enterKeyHint="done"
            className={claseInput}
          />
          <button type="submit" aria-label="Guardar" className={`${claseBotonIcono} text-lona-600 dark:text-lona-500`}>
            <Check aria-hidden className="size-5" />
          </button>
          <button type="button" aria-label="Cancelar" onClick={() => setEditando(false)} className={claseBotonIcono}>
            <X aria-hidden className="size-5" />
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-1">
          <span className="min-w-0 flex-1 truncate">{item.nombre}</span>
          <button type="button" aria-label={`Renombrar ${item.nombre}`} onClick={empezarEdicion} className={claseBotonIcono}>
            <Pencil aria-hidden className="size-5" />
          </button>
          <button type="button" aria-label={`Borrar ${item.nombre}`} onClick={borrar} className={claseBotonIcono}>
            <Trash2 aria-hidden className="size-5" />
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="pb-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </li>
  )
}
