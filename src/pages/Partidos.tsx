import { useLiveQuery } from 'dexie-react-hooks'
import { ListOrdered, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import BotonFlotante from '../components/BotonFlotante'
import PantallaCargando from '../components/Cargando'
import Encabezado from '../components/Encabezado'
import { claseBotonPrimario, claseCampo } from '../components/estilos'
import FilaPartido from '../components/FilaPartido'
import PanelFiltros from '../components/PanelFiltros'
import { partidos, rivales, torneos } from '../db/repos'
import {
  agruparPorMes,
  aniosConPartidos,
  contarFiltrosActivos,
  FILTROS_VACIOS,
  filtrarPartidos,
  filtrosDesdeParams,
  ordenarRecientes,
  paramsDesdeFiltros,
  type FiltrosPartidos,
} from '../lib/historial'
import { resultadoPartido } from '../lib/resultado'

export default function Partidos() {
  const [params, setParams] = useSearchParams()
  const filtros = filtrosDesdeParams(params)
  const activos = contarFiltrosActivos(filtros)
  const [panelAbierto, setPanelAbierto] = useState(activos > 0)

  const todos = useLiveQuery(() => partidos.listar())
  const listaRivales = useLiveQuery(() => rivales.listar())
  const listaTorneos = useLiveQuery(() => torneos.listar())

  if (!todos || !listaRivales || !listaTorneos) return <PantallaCargando titulo="Partidos" />

  if (todos.length === 0) {
    return (
      <>
        <Encabezado titulo="Partidos" />
        <EstadoVacio />
        <BotonFlotante />
      </>
    )
  }

  const nombres = new Map(listaRivales.map((r) => [r.id, r.nombre]))
  const torneosPorId = new Map(listaTorneos.map((t) => [t.id, t]))
  const filtrados = ordenarRecientes(filtrarPartidos(todos, filtros, (id) => nombres.get(id)))
  const grupos = agruparPorMes(filtrados)
  const victorias = filtrados.filter((p) => resultadoPartido(p) === 'ganado').length
  const derrotas = filtrados.filter((p) => resultadoPartido(p) === 'perdido').length
  const hayFiltros = activos > 0 || filtros.busqueda !== ''

  const cambiarFiltros = (cambios: Partial<FiltrosPartidos>) =>
    setParams(paramsDesdeFiltros({ ...filtros, ...cambios }), { replace: true })
  const limpiar = () => setParams(paramsDesdeFiltros({ ...FILTROS_VACIOS }), { replace: true })

  return (
    <>
      <Encabezado titulo="Partidos" />

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={filtros.busqueda}
            onChange={(e) => cambiarFiltros({ busqueda: e.target.value })}
            placeholder="Buscar rival"
            aria-label="Buscar por nombre de rival"
            enterKeyHint="search"
            className={`${claseCampo} w-full pl-10`}
          />
        </div>
        <button
          type="button"
          onClick={() => setPanelAbierto((a) => !a)}
          aria-expanded={panelAbierto}
          className={`relative flex h-11 shrink-0 items-center gap-1 rounded-lg border px-3 font-medium ${
            activos > 0
              ? 'border-lona-600 text-lona-600 dark:text-lona-500'
              : 'border-stone-300 text-stone-600 dark:border-stone-700 dark:text-stone-300'
          }`}
        >
          <SlidersHorizontal aria-hidden className="size-5" />
          Filtros
          {activos > 0 && (
            <span className="grid size-5 place-items-center rounded-full bg-lona-600 text-xs text-white">{activos}</span>
          )}
        </button>
      </div>

      {panelAbierto && (
        <div className="mt-3">
          <PanelFiltros
            filtros={filtros}
            onChange={cambiarFiltros}
            rivales={listaRivales}
            torneos={listaTorneos}
            anios={aniosConPartidos(todos)}
          />
        </div>
      )}

      <div className="mt-3 flex min-h-11 items-center justify-between gap-2 text-sm text-stone-500 dark:text-stone-400">
        <p aria-live="polite">
          {filtrados.length} {filtrados.length === 1 ? 'partido' : 'partidos'}
          {filtrados.length > 0 && ` · ${victorias} V · ${derrotas} D`}
        </p>
        {hayFiltros && (
          <button type="button" onClick={limpiar} className="-mr-2 flex h-11 items-center gap-1 px-2 font-medium text-lona-600 dark:text-lona-500">
            <X aria-hidden className="size-4" />
            Limpiar filtros
          </button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <p className="mt-8 text-center text-stone-500 dark:text-stone-400">Ningún partido coincide con los filtros.</p>
      ) : (
        grupos.map((g) => (
          <section key={g.clave} aria-labelledby={`mes-${g.clave}`}>
            <h2
              id={`mes-${g.clave}`}
              className="sticky top-[env(safe-area-inset-top)] z-[5] -mx-4 bg-stone-50/95 px-4 pt-4 pb-2 text-sm font-semibold text-stone-500 backdrop-blur dark:bg-stone-950/95 dark:text-stone-400"
            >
              {g.titulo}
            </h2>
            <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
              {g.partidos.map((p) => (
                <FilaPartido
                  key={p.id}
                  partido={p}
                  nombreRival={nombres.get(p.rivalId)}
                  torneo={p.torneoId ? torneosPorId.get(p.torneoId) : undefined}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      <BotonFlotante />
    </>
  )
}

function EstadoVacio() {
  return (
    <div className="mt-12 flex flex-col items-center px-4 text-center">
      <div className="grid size-20 place-items-center rounded-full bg-lona-600/10 text-lona-600 dark:text-lona-500">
        <ListOrdered aria-hidden className="size-10" />
      </div>
      <h2 className="mt-4 text-xl font-semibold">Todavía no hay partidos</h2>
      <p className="mt-2 max-w-xs text-stone-500 dark:text-stone-400">
        Cargá tu primer partido y acá vas a ver tu historial, mes a mes.
      </p>
      <Link to="/partidos/nuevo" className={`${claseBotonPrimario} mt-6`}>
        <Plus aria-hidden className="size-5" />
        Cargar partido
      </Link>
    </div>
  )
}
