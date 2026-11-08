import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, CloudUpload, Plus } from 'lucide-react'
import { Link } from 'react-router'
import BotonFlotante from '../components/BotonFlotante'
import PantallaCargando from '../components/Cargando'
import Encabezado from '../components/Encabezado'
import { TarjetaDato } from '../components/estadisticas/piezas'
import { claseBotonPrimario } from '../components/estilos'
import FilaPartido from '../components/FilaPartido'
import VariacionRanking from '../components/VariacionRanking'
import { partidos, rivales, torneos } from '../db/repos'
import { useAjustes } from '../hooks/useAjustes'
import { useOpcionesEstadisticas } from '../hooks/useOpcionesEstadisticas'
import { useRanking } from '../hooks/useRanking'
import { avisoBackup } from '../lib/backup'
import { partidosQueCuentan, porcentajeVictorias, rachaActual } from '../lib/estadisticas'
import { formatearFecha, hoyISO } from '../lib/fechas'
import { formatearPorcentaje, formatearPuntaje, textoRacha } from '../lib/formato'
import { ordenarRecientes } from '../lib/historial'
import { filtrarPorRango, rangoPeriodo } from '../lib/periodo'

const ULTIMOS = 5

export default function Inicio() {
  const opciones = useOpcionesEstadisticas()
  const conf = useAjustes()
  const ranking = useRanking()
  const todos = useLiveQuery(() => partidos.listar())
  const listaRivales = useLiveQuery(() => rivales.listar())
  const listaTorneos = useLiveQuery(() => torneos.listar())

  if (!todos || !listaRivales || !listaTorneos || !ranking || !conf) return <PantallaCargando titulo="Inicio" />

  const aviso = avisoBackup(conf.ultimoBackup, todos.length > 0, new Date())
  if (todos.length === 0) return <Bienvenida />

  const hoy = hoyISO()
  const nombres = new Map(listaRivales.map((r) => [r.id, r.nombre]))
  const torneosPorId = new Map(listaTorneos.map((t) => [t.id, t]))
  const cuentan = partidosQueCuentan(todos, opciones)
  const racha = textoRacha(rachaActual(cuentan))
  const anio = porcentajeVictorias(filtrarPorRango(cuentan, rangoPeriodo('actual', hoy)))
  const mes = porcentajeVictorias(cuentan.filter((p) => p.fecha.startsWith(hoy.slice(0, 7))))
  const ultimos = ordenarRecientes(todos).slice(0, ULTIMOS)
  const ultimoRanking = ranking.historial[ranking.historial.length - 1]

  return (
    <>
      <Encabezado titulo="Inicio" />

      {aviso && (
        <Link
          to="/ajustes#backup"
          className="mb-4 flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 active:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:active:bg-amber-950"
        >
          <CloudUpload aria-hidden className="size-6 shrink-0 text-amber-700 dark:text-amber-400" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">{aviso.tipo === 'nunca' ? 'Todavía no hiciste un backup' : `Hace ${aviso.dias} días que no hacés un backup`}</p>
            <p className="text-stone-600 dark:text-stone-300">Si borrás la app, se pierden tus partidos.</p>
          </div>
          <ChevronRight aria-hidden className="size-5 shrink-0 text-stone-400" />
        </Link>
      )}

      <Link
        to="/estadisticas"
        className="block rounded-2xl border border-stone-200 bg-white p-4 active:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:active:bg-stone-800"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-stone-500 dark:text-stone-400">Mi ranking</h2>
          <ChevronRight aria-hidden className="size-5 text-stone-400" />
        </div>
        <div className="mt-1 flex items-baseline gap-3">
          <p className="text-5xl font-bold">{formatearPuntaje(ranking.actual)}</p>
          {ultimoRanking && <VariacionRanking delta={ultimoRanking.delta} />}
        </div>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {ultimoRanking
            ? `Último: vs ${nombres.get(ultimoRanking.rivalId) ?? '…'} · ${formatearFecha(ultimoRanking.fecha)} · Máx. ${formatearPuntaje(ranking.maximo)}`
            : 'Todavía no hay partidos que cuenten para el ranking.'}
        </p>
      </Link>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <TarjetaDato etiqueta="Racha" valor={racha.valor} detalle={racha.detalle} />
        <TarjetaDato
          etiqueta={`% ${hoy.slice(0, 4)}`}
          valor={formatearPorcentaje(anio.porcentaje)}
          detalle={anio.total ? `${anio.ganados} V · ${anio.perdidos} D` : 'Sin partidos'}
        />
        <TarjetaDato
          etiqueta="Este mes"
          valor={mes.total}
          detalle={mes.total ? `${mes.ganados} V · ${mes.perdidos} D` : 'Ninguno todavía'}
        />
      </div>

      <div className="mt-4 mb-1 flex items-center justify-between">
        <h2 className="font-semibold">Últimos partidos</h2>
        <Link to="/partidos" className="-mr-2 inline-flex h-11 items-center px-2 text-sm font-medium text-lona-600 dark:text-lona-500">
          Ver todos
        </Link>
      </div>
      <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
        {ultimos.map((p) => (
          <FilaPartido
            key={p.id}
            partido={p}
            nombreRival={nombres.get(p.rivalId)}
            torneo={p.torneoId ? torneosPorId.get(p.torneoId) : undefined}
          />
        ))}
      </ul>

      <BotonFlotante texto="Nuevo partido" />
    </>
  )
}

function Bienvenida() {
  return (
    <>
      <Encabezado titulo="Inicio" />
      <div className="mt-10 flex flex-col items-center px-4 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-lona-600/10 text-4xl" aria-hidden>
          🎾
        </div>
        <h2 className="mt-4 text-xl font-semibold">¡Te damos la bienvenida a Mi Tenis!</h2>
        <p className="mt-2 max-w-xs text-stone-500 dark:text-stone-400">
          Cargá tu primer partido y acá vas a ver tu ranking, tu racha y cómo venís en el año.
        </p>
        <Link to="/partidos/nuevo" className={`${claseBotonPrimario} mt-6`}>
          <Plus aria-hidden className="size-5" />
          Nuevo partido
        </Link>
        <Link to="/ajustes#backup" className="mt-2 inline-flex min-h-11 items-center px-2 text-sm font-medium text-lona-600 dark:text-lona-500">
          ¿Tenés un backup? Importalo desde Ajustes
        </Link>
      </div>
    </>
  )
}
