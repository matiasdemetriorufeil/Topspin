import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight } from 'lucide-react'
import { Link, useParams } from 'react-router'
import PantallaCargando from '../components/Cargando'
import Encabezado from '../components/Encabezado'
import { TarjetaDato } from '../components/estadisticas/piezas'
import FilaPartido from '../components/FilaPartido'
import IndicadorResultado from '../components/IndicadorResultado'
import { partidos, rivales, torneos } from '../db/repos'
import { useOpcionesEstadisticas } from '../hooks/useOpcionesEstadisticas'
import { useRanking } from '../hooks/useRanking'
import { useVolver } from '../hooks/useVolver'
import { headToHead } from '../lib/estadisticas'
import { formatearFecha } from '../lib/fechas'
import { formatearPorcentaje, formatearPuntaje, textoRacha } from '../lib/formato'
import { marcadorPartido } from '../lib/historial'

/** Detalle de rival: head to head (historial completo), puntaje ELO estimado y todos los partidos. */
export default function RivalDetalle() {
  const { id = '' } = useParams()
  const opciones = useOpcionesEstadisticas()
  // Se llega desde Estadísticas o desde el detalle de un partido: "volver" va a donde estabas
  const volver = useVolver('/estadisticas')
  // null mientras carga; undefined si el rival no existe
  const rival = useLiveQuery(() => rivales.obtener(id), [id], null)
  const todos = useLiveQuery(() => partidos.listar())
  const listaTorneos = useLiveQuery(() => torneos.listar())
  const ranking = useRanking()
  const atras = { texto: 'Volver', onClick: volver }

  if (rival === null || !todos || !listaTorneos) return <PantallaCargando titulo="Rival" volver={atras} />
  if (rival === undefined) {
    return (
      <>
        <Encabezado titulo="Rival no encontrado" volver={atras} />
        <p className="text-stone-500 dark:text-stone-400">Puede que lo hayas borrado.</p>
      </>
    )
  }

  const h = headToHead(todos, id, opciones)
  const torneosPorId = new Map(listaTorneos.map((t) => [t.id, t]))
  const racha = textoRacha(h.racha)
  const eloRival = ranking?.rivales.get(id)

  return (
    <>
      <Encabezado titulo={rival.nombre} volver={atras} />

      <section
        aria-label="Balance contra este rival"
        className="rounded-xl border border-stone-200 bg-white p-4 text-center dark:border-stone-800 dark:bg-stone-900"
      >
        <p className="text-sm text-stone-500 dark:text-stone-400">Head to head · historial completo</p>
        <p className="mt-1 text-5xl font-semibold" aria-label={`${h.ganados} ganados, ${h.perdidos} perdidos`}>
          {h.ganados}
          <span aria-hidden className="mx-2 text-stone-400">
            –
          </span>
          {h.perdidos}
        </p>
        <p className="mt-1 text-stone-500 dark:text-stone-400">
          {h.porcentaje === null ? 'Sin partidos que cuenten' : `${formatearPorcentaje(h.porcentaje)} de victorias`}
        </p>
      </section>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <TarjetaDato etiqueta="Sets" valor={`${h.setsAFavor}-${h.setsEnContra}`} detalle="a favor - en contra" />
        <TarjetaDato
          etiqueta="ELO estimado"
          valor={eloRival === undefined ? '—' : formatearPuntaje(eloRival)}
          detalle={eloRival === undefined ? 'Sin partidos que cuenten' : 'puntos'}
        />
        <TarjetaDato etiqueta="Racha actual" valor={racha.valor} detalle={racha.detalle} />
        {h.ultimo ? (
          <Link
            to={`/partidos/${h.ultimo.partido.id}`}
            aria-label={`Último resultado: ${h.ultimo.resultado === 'ganado' ? 'victoria' : 'derrota'} el ${formatearFecha(h.ultimo.partido.fecha)}. Ver partido`}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-3 active:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:active:bg-stone-800"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-stone-500 dark:text-stone-400">Último resultado</p>
              <div className="mt-1 flex items-center gap-2">
                <IndicadorResultado resultado={h.ultimo.resultado} />
                <p className="truncate text-sm tabular-nums">{marcadorPartido(h.ultimo.partido) || formatearFecha(h.ultimo.partido.fecha)}</p>
              </div>
              <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{formatearFecha(h.ultimo.partido.fecha)}</p>
            </div>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-stone-400" />
          </Link>
        ) : (
          <TarjetaDato etiqueta="Último resultado" valor="—" detalle="Sin partidos" />
        )}
      </div>

      <h2 className="mt-6 mb-2 font-semibold">
        Partidos <span className="font-normal text-stone-500">{h.partidos.length}</span>
      </h2>
      {h.partidos.length === 0 ? (
        <p className="text-stone-500 dark:text-stone-400">Todavía no jugaste contra {rival.nombre}.</p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
          {h.partidos.map((p) => (
            <FilaPartido
              key={p.id}
              partido={p}
              nombreRival={rival.nombre}
              torneo={p.torneoId ? torneosPorId.get(p.torneoId) : undefined}
            />
          ))}
        </ul>
      )}
    </>
  )
}
