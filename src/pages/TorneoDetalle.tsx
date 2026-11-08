import { useLiveQuery } from 'dexie-react-hooks'
import { Pencil, Trash2, Trophy } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import PantallaCargando from '../components/Cargando'
import Encabezado from '../components/Encabezado'
import { claseBotonPrimario, claseError } from '../components/estilos'
import FilaPartido from '../components/FilaPartido'
import { clubes, mensajeDeError, partidos, rivales, torneos } from '../db/repos'
import { useVolver } from '../hooks/useVolver'
import { formatearFecha } from '../lib/fechas'
import { esTitulo, ordenarPorRonda } from '../lib/palmares'
import { etiquetaResultado, FORMATOS } from '../lib/torneo'

export default function TorneoDetalle() {
  const { id = '' } = useParams()
  const volver = useVolver('/palmares')
  const [error, setError] = useState<string | null>(null)
  const [borrando, setBorrando] = useState(false)

  // null mientras carga; undefined si no existe
  const datos = useLiveQuery(
    async () => {
      const torneo = await torneos.obtener(id)
      if (!torneo) return undefined
      const [club, jugados, listaRivales] = await Promise.all([
        clubes.obtener(torneo.clubId),
        partidos.porTorneo(id),
        rivales.listar(),
      ])
      return { torneo, club, jugados, nombres: new Map(listaRivales.map((r) => [r.id, r.nombre])) }
    },
    [id],
    null,
  )
  const atras = { texto: 'Palmarés', onClick: volver }

  if (datos === null) return <PantallaCargando titulo="Torneo" volver={atras} />
  if (datos === undefined) {
    return (
      <>
        <Encabezado titulo="Torneo no encontrado" volver={atras} />
        <p className="text-stone-500 dark:text-stone-400">Puede que lo hayas borrado.</p>
      </>
    )
  }

  const { torneo: t, club, jugados, nombres } = datos
  const titulo = esTitulo(t)
  const resultado = etiquetaResultado(t)

  async function borrar() {
    if (!window.confirm(`¿Borrar el torneo «${t.nombre}»? No se puede deshacer.`)) return
    setBorrando(true)
    setError(null)
    try {
      await torneos.borrar(t.id)
      volver()
    } catch (e) {
      // Ej. tiene partidos asociados
      setError(mensajeDeError(e, 'No se pudo borrar el torneo.'))
      setBorrando(false)
    }
  }

  return (
    <>
      <Encabezado titulo={t.nombre} volver={atras} />

      <div
        className={`flex items-center gap-4 rounded-xl p-4 ${
          titulo
            ? 'bg-amber-50 dark:bg-amber-950/30'
            : 'border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900'
        }`}
      >
        <div
          className={`grid size-14 shrink-0 place-items-center rounded-full ${
            titulo ? 'bg-amber-400 text-amber-950' : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
          }`}
        >
          <Trophy aria-hidden className="size-7" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-stone-500 dark:text-stone-400">Resultado</p>
          <p className="text-xl font-bold">{resultado ?? 'Sin resultado todavía'}</p>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
        <Dato termino="Fecha">{formatearFecha(t.fecha)}</Dato>
        <Dato termino="Club">{club?.nombre ?? '—'}</Dato>
        <Dato termino="Formato">{FORMATOS.find((f) => f.valor === t.formato)?.etiqueta}</Dato>
        {t.categoria && <Dato termino="Categoría">{t.categoria}</Dato>}
      </dl>

      <h2 className="mt-6 mb-2 font-semibold">
        Partidos <span className="font-normal text-stone-500">{jugados.length}</span>
      </h2>
      {jugados.length === 0 ? (
        <p className="text-stone-500 dark:text-stone-400">
          No hay partidos cargados en este torneo. Al cargar un partido, elegí Tipo: Torneo y este torneo.
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
          {ordenarPorRonda(jugados).map((p) => (
            <FilaPartido key={p.id} partido={p} nombreRival={nombres.get(p.rivalId)} soloRonda />
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className={claseError}>
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link to={`/palmares/torneos/${t.id}/editar`} className={claseBotonPrimario}>
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

function Dato({ termino, children }: { termino: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 px-4 py-3">
      <dt className="w-24 shrink-0 text-stone-500 dark:text-stone-400">{termino}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  )
}
