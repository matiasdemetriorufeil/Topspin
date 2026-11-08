import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart3, Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import PantallaCargando from '../components/Cargando'
import Encabezado from '../components/Encabezado'
import GraficoEvolucion from '../components/estadisticas/GraficoEvolucion'
import GraficoMensual from '../components/estadisticas/GraficoMensual'
import GraficoRanking from '../components/estadisticas/GraficoRanking'
import { Tarjeta, TarjetaDato } from '../components/estadisticas/piezas'
import RankingRivales from '../components/estadisticas/RankingRivales'
import { claseBotonPrimario, claseCampo } from '../components/estilos'
import { partidos, rivales } from '../db/repos'
import { useOpcionesEstadisticas } from '../hooks/useOpcionesEstadisticas'
import { useRanking } from '../hooks/useRanking'
import {
  estadisticasTiebreak,
  evolucionPorcentaje,
  mejorRacha,
  partidosPorMes,
  partidosQueCuentan,
  porcentajeVictorias,
  rachaActual,
  rankingRivales,
  remontadas,
} from '../lib/estadisticas'
import { hoyISO } from '../lib/fechas'
import { formatearPorcentaje, formatearPuntaje, textoRacha } from '../lib/formato'
import { aniosConPartidos } from '../lib/historial'
import { filtrarPorRango, leerPeriodo, opcionesPeriodo, PERIODO_POR_DEFECTO, rangoPeriodo } from '../lib/periodo'

export default function Estadisticas() {
  const opciones = useOpcionesEstadisticas()
  const [params, setParams] = useSearchParams()
  const periodo = leerPeriodo(params.get('periodo'))
  const todos = useLiveQuery(() => partidos.listar())
  const listaRivales = useLiveQuery(() => rivales.listar())
  // El ranking se calcula sobre todo el historial; el período solo recorta lo que se grafica
  const ranking = useRanking()

  if (!todos || !listaRivales || !ranking) return <PantallaCargando titulo="Estadísticas" />
  if (todos.length === 0) return <SinPartidos />

  const hoy = hoyISO()
  const rango = rangoPeriodo(periodo, hoy)
  const cuentan = partidosQueCuentan(filtrarPorRango(todos, rango), opciones)
  const nombres = new Map(listaRivales.map((r) => [r.id, r.nombre]))

  const victorias = porcentajeVictorias(cuentan)
  const racha = rachaActual(cuentan)
  const mejor = mejorRacha(cuentan)
  const tiebreaks = estadisticasTiebreak(cuentan)
  const nRemontadas = remontadas(cuentan).cantidad
  const puntosRanking = filtrarPorRango(
    ranking.historial.map((h, i) => ({ numero: i + 1, fecha: h.fecha, puntaje: h.puntaje, delta: h.delta })),
    rango,
  )

  const opcionesSelector = opcionesPeriodo(aniosConPartidos(todos), hoy)
  if (!opcionesSelector.some((o) => o.valor === periodo)) opcionesSelector.push({ valor: periodo, etiqueta: periodo })

  return (
    <>
      <Encabezado titulo="Estadísticas" />

      <label className="mb-4 block">
        <span className="sr-only">Período</span>
        <select
          value={periodo}
          onChange={(e) =>
            setParams(e.target.value === PERIODO_POR_DEFECTO ? {} : { periodo: e.target.value }, { replace: true })
          }
          className={`${claseCampo} w-full font-medium`}
        >
          {opcionesSelector.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      </label>

      {cuentan.length === 0 ? (
        <p className="mt-8 text-center text-stone-500 dark:text-stone-400">No hay partidos que cuenten en este período.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <TarjetaDato
              etiqueta="Partidos jugados"
              valor={victorias.total}
              detalle={opciones.incluirWO ? 'Sin suspendidos' : 'Sin WO ni suspendidos'}
            />
            <TarjetaDato
              etiqueta="% de victorias"
              valor={formatearPorcentaje(victorias.porcentaje)}
              detalle={`${victorias.ganados} V · ${victorias.perdidos} D`}
            />
            <TarjetaDato
              etiqueta="Racha actual"
              {...textoRacha(racha)}
            />
            <TarjetaDato etiqueta="Mejor racha" valor={mejor} detalle={mejor === 1 ? 'victoria' : 'victorias seguidas'} />
            <TarjetaDato
              etiqueta="Tie-breaks"
              valor={tiebreaks.total === 0 ? '—' : `${tiebreaks.ganados}-${tiebreaks.perdidos}`}
              detalle={tiebreaks.total === 0 ? 'Sin tie-breaks cargados' : `${formatearPorcentaje(tiebreaks.porcentaje)} ganados`}
            />
            <TarjetaDato etiqueta="Remontadas" valor={nRemontadas} detalle="tras perder el 1.er set" />
          </div>

          <Tarjeta titulo="Partidos por mes">
            <GraficoMensual meses={partidosPorMes(cuentan, rango)} />
          </Tarjeta>

          <Tarjeta titulo="Evolución del % de victorias">
            <GraficoEvolucion puntos={evolucionPorcentaje(cuentan)} />
          </Tarjeta>

          <Tarjeta titulo="Evolución del ranking">
            <p className="-mt-2 mb-3 text-sm text-stone-500 dark:text-stone-400">
              Actual <span className="font-semibold text-stone-900 dark:text-stone-100">{formatearPuntaje(ranking.actual)}</span>
              {' · '}Máximo <span className="font-semibold text-stone-900 dark:text-stone-100">{formatearPuntaje(ranking.maximo)}</span>
            </p>
            <GraficoRanking puntos={puntosRanking} />
          </Tarjeta>

          <Tarjeta titulo="Rivales">
            <RankingRivales filas={rankingRivales(cuentan)} nombres={nombres} />
          </Tarjeta>
        </div>
      )}
    </>
  )
}

function SinPartidos() {
  return (
    <>
      <Encabezado titulo="Estadísticas" />
      <div className="mt-12 flex flex-col items-center px-4 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-lona-600/10 text-lona-600 dark:text-lona-500">
          <BarChart3 aria-hidden className="size-10" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Todavía no hay estadísticas</h2>
        <p className="mt-2 max-w-xs text-stone-500 dark:text-stone-400">
          Cuando cargues partidos, acá vas a ver tu % de victorias, rachas y rivales.
        </p>
        <Link to="/partidos/nuevo" className={`${claseBotonPrimario} mt-6`}>
          <Plus aria-hidden className="size-5" />
          Cargar partido
        </Link>
      </div>
    </>
  )
}
