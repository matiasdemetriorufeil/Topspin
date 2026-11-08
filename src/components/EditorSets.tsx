import { ChevronDown, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { ganeInferido, llevaTiebreak, MAX_SETS, setVacio, type ValoresSet } from '../lib/partido'
import { claseCampo, claseError } from './estilos'
import Segmentado from './Segmentado'

interface Props {
  sets: ValoresSet[]
  onChange: (sets: ValoresSet[]) => void
  /** Errores "sets" (de la lista) y "sets.N" (de cada set) */
  errores: Record<string, string>
  /** Cantidad mínima de sets (1 si el partido está completado) */
  minimo: number
}

export default function EditorSets({ sets, onChange, errores, minimo }: Props) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-sm font-medium text-stone-600 dark:text-stone-300">Sets</legend>
      <ol className="flex flex-col gap-2">
        {sets.map((s, i) => (
          <FilaSet
            key={s.clave}
            numero={i + 1}
            set={s}
            error={errores[`sets.${i}`]}
            onChange={(nuevo) => onChange(sets.map((x, j) => (j === i ? nuevo : x)))}
            onQuitar={sets.length > minimo ? () => onChange(sets.filter((_, j) => j !== i)) : undefined}
          />
        ))}
      </ol>
      {errores.sets && (
        <p data-error className={claseError}>
          {errores.sets}
        </p>
      )}
      {sets.length < MAX_SETS && (
        <button
          type="button"
          onClick={() => onChange([...sets, setVacio()])}
          className="mt-2 flex h-11 w-full items-center justify-center gap-1 rounded-lg border border-dashed border-stone-300 font-medium text-lona-600 active:bg-stone-100 dark:border-stone-700 dark:text-lona-500 dark:active:bg-stone-900"
        >
          <Plus aria-hidden className="size-5" />
          Agregar set
        </button>
      )}
    </fieldset>
  )
}

const claseGames = `${claseCampo} w-full text-center tabular-nums`

function FilaSet({
  numero,
  set,
  error,
  onChange,
  onQuitar,
}: {
  numero: number
  set: ValoresSet
  error?: string
  onChange: (set: ValoresSet) => void
  onQuitar?: () => void
}) {
  const hayGames = set.misGames !== '' || set.susGames !== ''
  const [abierto, setAbierto] = useState(hayGames)
  const inferido = ganeInferido(set)
  const gane = inferido ?? set.gane

  // Si los games definen un ganador, el toggle lo sigue
  function cambiar(cambios: Partial<ValoresSet>) {
    const nuevo = { ...set, ...cambios }
    const inf = ganeInferido(nuevo)
    onChange(inf === null ? nuevo : { ...nuevo, gane: inf })
  }

  const inputGames = (campo: keyof ValoresSet, etiqueta: string) => (
    <label className="flex-1">
      <span className="mb-1 block text-xs text-stone-500 dark:text-stone-400">{etiqueta}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        enterKeyHint="next"
        value={set[campo] as string}
        onChange={(e) => cambiar({ [campo]: e.target.value.replace(/\D/g, '') })}
        aria-invalid={Boolean(error)}
        className={claseGames}
      />
    </label>
  )

  return (
    <li className={`rounded-xl border bg-white p-2 dark:bg-stone-900 ${error ? 'border-red-500' : 'border-stone-200 dark:border-stone-800'}`}>
      <div className="flex items-center gap-1">
        <span className="w-12 shrink-0 pl-1 text-sm font-semibold">Set {numero}</span>
        <div className="min-w-0 flex-1">
          <Segmentado
            etiqueta={`Resultado del set ${numero}`}
            ocultarEtiqueta
            opciones={[
              { valor: 'si', etiqueta: 'Gané', claseActiva: 'bg-lona-600 text-white shadow-sm' },
              { valor: 'no', etiqueta: 'Perdí', claseActiva: 'bg-red-600 text-white shadow-sm' },
            ]}
            valor={gane === null ? '' : gane ? 'si' : 'no'}
            onChange={(v) => cambiar({ gane: v === 'si' })}
            deshabilitado={inferido !== null}
          />
        </div>
        <button
          type="button"
          onClick={() => setAbierto((a) => !a)}
          aria-expanded={abierto}
          aria-label={`Games del set ${numero}`}
          className="flex h-11 min-w-11 shrink-0 items-center justify-center gap-0.5 rounded-lg px-1 text-sm text-stone-600 tabular-nums active:bg-stone-100 dark:text-stone-300 dark:active:bg-stone-800"
        >
          {hayGames ? `${set.misGames || '?'}-${set.susGames || '?'}` : 'Games'}
          <ChevronDown aria-hidden className={`size-4 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </button>
        {onQuitar && (
          <button
            type="button"
            onClick={onQuitar}
            aria-label={`Quitar set ${numero}`}
            className="grid size-11 shrink-0 place-items-center rounded-lg text-stone-400 active:bg-stone-100 dark:active:bg-stone-800"
          >
            <X aria-hidden className="size-5" />
          </button>
        )}
      </div>

      {abierto && (
        <div className="mt-2 flex flex-col gap-2 px-1 pb-1">
          <div className="flex items-end gap-2">
            {inputGames('misGames', 'Mis games')}
            <span className="pb-2.5 text-stone-400">–</span>
            {inputGames('susGames', 'Sus games')}
          </div>
          {llevaTiebreak(set) && (
            <div className="flex items-end gap-2">
              {inputGames('tbMios', 'Tie-break: mis puntos')}
              <span className="pb-2.5 text-stone-400">–</span>
              {inputGames('tbSuyos', 'Sus puntos')}
            </div>
          )}
          {inferido !== null && (
            <p className="text-xs text-stone-500 dark:text-stone-400">El ganador del set sale de los games.</p>
          )}
        </div>
      )}

      {error && (
        <p data-error className={`${claseError} px-1`}>
          {error}
        </p>
      )}
    </li>
  )
}
