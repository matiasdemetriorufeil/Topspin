import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import PantallaCargando from '../components/Cargando'
import Encabezado from '../components/Encabezado'
import { claseBotonPrimario, claseError } from '../components/estilos'
import IndicadorResultado from '../components/IndicadorResultado'
import VariacionRanking from '../components/VariacionRanking'
import { clubes, mensajeDeError, partidos, rivales, torneos } from '../db/repos'
import type { SetJugado } from '../db/schema'
import { useRanking } from '../hooks/useRanking'
import { useVolver } from '../hooks/useVolver'
import { formatearFecha } from '../lib/fechas'
import { etiquetaEstado } from '../lib/historial'
import { ESTADOS } from '../lib/partido'
import { resultadoPartido, textoResultado } from '../lib/resultado'
import { etiquetaTorneo } from '../lib/torneo'

const colorResultado = {
  ganado: 'text-lona-600 dark:text-lona-500',
  perdido: 'text-red-600 dark:text-red-400',
  nulo: 'text-stone-500 dark:text-stone-400',
}

export default function PartidoDetalle() {
  const { id = '' } = useParams()
  const volver = useVolver('/partidos')
  const [error, setError] = useState<string | null>(null)
  const [borrando, setBorrando] = useState(false)

  // null mientras carga; undefined si no existe
  const datos = useLiveQuery(
    async () => {
      const p = await partidos.obtener(id)
      if (!p) return undefined
      const [rival, club, torneo] = await Promise.all([
        rivales.obtener(p.rivalId),
        clubes.obtener(p.clubId),
        p.torneoId ? torneos.obtener(p.torneoId) : undefined,
      ])
      return { p, rival, club, torneo }
    },
    [id],
    null,
  )
  const ranking = useRanking()
  const atras = { texto: 'Partidos', onClick: volver }

  if (datos === null) return <PantallaCargando titulo="Partido" volver={atras} />
  if (datos === undefined) {
    return (
      <>
        <Encabezado titulo="Partido no encontrado" volver={atras} />
        <p className="text-stone-500 dark:text-stone-400">Puede que lo hayas borrado.</p>
      </>
    )
  }

  const { p, rival, club, torneo } = datos
  const resultado = resultadoPartido(p)
  const estado = etiquetaEstado(p)
  // undefined si el partido no cuenta (WO sin el ajuste, suspendido, sin resultado)
  const delta = ranking?.deltaPorPartido.get(p.id)

  async function borrar() {
    if (!window.confirm('¿Borrar este partido? No se puede deshacer.')) return
    setBorrando(true)
    try {
      await partidos.borrar(p.id)
      volver()
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo borrar el partido.'))
      setBorrando(false)
    }
  }

  return (
    <>
      <Encabezado titulo={rival?.nombre ?? 'Partido'} volver={atras} />

      <div className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
        <IndicadorResultado resultado={resultado} grande />
        <div className="min-w-0">
          <p className={`text-xl font-bold ${colorResultado[resultado ?? 'nulo']}`}>{textoResultado(p)}</p>
          <p className="text-stone-500 dark:text-stone-400">{formatearFecha(p.fecha)}</p>
          {delta !== undefined ? (
            <p className="mt-1 text-sm">
              <VariacionRanking delta={delta} /> <span className="text-stone-500 dark:text-stone-400">de ranking</span>
            </p>
          ) : (
            ranking && <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">No suma al ranking</p>
          )}
        </div>
      </div>

      {p.sets.length > 0 && <TablaSets sets={p.sets} nombreRival={rival?.nombre ?? 'Rival'} />}

      <dl className="mt-4 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
        {rival && (
          <Dato termino="Rival">
            <Link to={`/estadisticas/rivales/${rival.id}`} className="-my-3 inline-block py-3 text-lona-600 underline-offset-2 active:underline dark:text-lona-500">
              {rival.nombre} · head to head
            </Link>
          </Dato>
        )}
        <Dato termino="Club">{club?.nombre ?? '—'}</Dato>
        <Dato termino="Tipo">{p.tipo === 'torneo' ? 'Torneo' : 'Amistoso'}</Dato>
        {torneo && (
          <Dato termino="Torneo">
            <Link to={`/palmares/torneos/${torneo.id}`} className="-my-3 inline-block py-3 text-lona-600 underline-offset-2 active:underline dark:text-lona-500">
              {etiquetaTorneo(torneo)}
            </Link>
          </Dato>
        )}
        {p.ronda && <Dato termino="Ronda">{p.ronda}</Dato>}
        <Dato termino="Estado">{estado ?? ESTADOS.find((e) => e.valor === p.estado)?.etiqueta}</Dato>
        {p.notas && (
          <Dato termino="Notas">
            <span className="whitespace-pre-wrap">{p.notas}</span>
          </Dato>
        )}
      </dl>

      {error && (
        <p role="alert" className={claseError}>
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link to={`/partidos/${p.id}/editar`} className={claseBotonPrimario}>
          <Pencil aria-hidden className="size-5" />
          Editar
        </Link>
        <button
          type="button"
          onClick={borrar}
          disabled={borrando}
          className="flex h-11 items-center justify-center gap-1 rounded-lg border border-red-300 font-medium text-red-600 active:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:active:bg-red-950"
        >
          <Trash2 aria-hidden className="size-5" />
          Borrar
        </button>
      </div>
    </>
  )
}

function TablaSets({ sets, nombreRival }: { sets: SetJugado[]; nombreRival: string }) {
  const hayGames = sets.some((s) => s.misGames !== undefined)
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <table className="w-full text-center tabular-nums">
        <caption className="sr-only">Resultado por set</caption>
        <thead>
          <tr className="text-xs text-stone-500 dark:text-stone-400">
            <th scope="col" className="px-3 py-2 text-left font-medium">
              <span className="sr-only">Jugador</span>
            </th>
            {sets.map((_, i) => (
              <th key={i} scope="col" className="px-2 py-2 font-medium">
                Set {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hayGames ? (
            <>
              <FilaJugador nombre="Yo" sets={sets} lado="mios" />
              <FilaJugador nombre={nombreRival} sets={sets} lado="suyos" />
            </>
          ) : (
            <tr className="border-t border-stone-200 dark:border-stone-800">
              <th scope="row" className="px-3 py-2 text-left font-medium">
                Yo
              </th>
              {sets.map((s, i) => (
                <td key={i} className={`px-2 py-2 font-semibold ${s.gane ? 'text-lona-600 dark:text-lona-500' : 'text-red-600 dark:text-red-400'}`}>
                  {s.gane ? 'Gané' : 'Perdí'}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function FilaJugador({ nombre, sets, lado }: { nombre: string; sets: SetJugado[]; lado: 'mios' | 'suyos' }) {
  return (
    <tr className="border-t border-stone-200 dark:border-stone-800">
      <th scope="row" className="max-w-32 truncate px-3 py-2 text-left font-medium">
        {nombre}
      </th>
      {sets.map((s, i) => {
        const games = lado === 'mios' ? s.misGames : s.susGames
        const ganoEsteLado = lado === 'mios' ? s.gane : !s.gane
        const tb = s.tiebreak?.[lado]
        return (
          <td key={i} className={`px-2 py-2 text-lg ${ganoEsteLado ? 'font-bold' : 'text-stone-500 dark:text-stone-400'}`}>
            {games ?? '–'}
            {tb !== undefined && <sup className="ml-0.5 text-xs">{tb}</sup>}
          </td>
        )
      })}
    </tr>
  )
}

function Dato({ termino, children }: { termino: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 px-4 py-3">
      <dt className="w-20 shrink-0 text-stone-500 dark:text-stone-400">{termino}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  )
}
