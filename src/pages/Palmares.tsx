import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Trophy } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import PantallaCargando from '../components/Cargando'
import Encabezado from '../components/Encabezado'
import { claseBotonPrimario, claseCampo } from '../components/estilos'
import FilaTorneo from '../components/FilaTorneo'
import { clubes, torneos } from '../db/repos'
import type { Torneo } from '../db/schema'
import { formatearFecha } from '../lib/fechas'
import { aniosDeTorneos, contadoresPalmares, esTitulo, ordenarTorneosRecientes } from '../lib/palmares'
import { etiquetaResultado } from '../lib/torneo'

const botonNuevo = (
  <Link to="/palmares/torneos/nuevo" className={claseBotonPrimario}>
    <Plus aria-hidden className="size-5" />
    Torneo
  </Link>
)

export default function Palmares() {
  const [params, setParams] = useSearchParams()
  const lista = useLiveQuery(() => torneos.listar())
  const listaClubes = useLiveQuery(() => clubes.listar())

  if (!lista || !listaClubes) return <PantallaCargando titulo="Palmarés" accion={botonNuevo} />
  if (lista.length === 0) return <SinTorneos />

  const nombresClubes = new Map(listaClubes.map((c) => [c.id, c.nombre]))
  const ordenados = ordenarTorneosRecientes(lista)
  const titulos = ordenados.filter(esTitulo)
  const c = contadoresPalmares(lista)
  const anios = aniosDeTorneos(lista)
  const anio = params.get('anio') ?? ''
  const participaciones = anio ? ordenados.filter((t) => t.fecha.startsWith(`${anio}-`)) : ordenados

  return (
    <>
      <Encabezado titulo="Palmarés" accion={botonNuevo} />

      <section aria-labelledby="titulos" className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/30">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-full bg-amber-400 text-amber-950">
            <Trophy aria-hidden className="size-6" />
          </div>
          <div>
            <h2 id="titulos" className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Títulos
            </h2>
            <p className="text-3xl leading-none font-bold">{titulos.length}</p>
          </div>
        </div>
        {titulos.length === 0 ? (
          <p className="mt-3 text-sm text-amber-900/80 dark:text-amber-200/80">Todavía no hay títulos. ¡El primero ya va a llegar!</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {titulos.map((t) => (
              <TarjetaTitulo key={t.id} torneo={t} nombreClub={nombresClubes.get(t.clubId)} />
            ))}
          </ul>
        )}
      </section>

      <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
        <Contador etiqueta="Títulos" valor={c.titulos} />
        <Contador etiqueta="Finales" valor={c.finales} />
        <Contador etiqueta="Semis" valor={c.semifinales} />
        <Contador etiqueta="Podios liga" valor={c.podiosLiga} />
      </dl>

      <div className="mt-6 mb-2 flex items-center justify-between gap-3">
        <h2 className="font-semibold">
          Participaciones <span className="font-normal text-stone-500">{participaciones.length}</span>
        </h2>
        {anios.length > 1 && (
          <label>
            <span className="sr-only">Año</span>
            <select
              value={anio}
              onChange={(e) => setParams(e.target.value ? { anio: e.target.value } : {}, { replace: true })}
              className={claseCampo}
            >
              <option value="">Todos los años</option>
              {anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {participaciones.length === 0 ? (
        <p className="text-stone-500 dark:text-stone-400">No hay torneos en {anio}.</p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
          {participaciones.map((t) => (
            <FilaTorneo key={t.id} torneo={t} nombreClub={nombresClubes.get(t.clubId)} />
          ))}
        </ul>
      )}
    </>
  )
}

function TarjetaTitulo({ torneo: t, nombreClub }: { torneo: Torneo; nombreClub?: string }) {
  return (
    <li>
      <Link
        to={`/palmares/torneos/${t.id}`}
        className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm active:bg-amber-100 dark:bg-stone-900 dark:active:bg-stone-800"
      >
        <Trophy aria-hidden className="size-7 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{t.nombre}</p>
          <p className="truncate text-sm text-stone-500 dark:text-stone-400">
            {[formatearFecha(t.fecha), t.categoria, nombreClub].filter(Boolean).join(' · ')}
          </p>
        </div>
        {t.formato === 'liga' && (
          <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">{etiquetaResultado(t)}</span>
        )}
      </Link>
    </li>
  )
}

function Contador({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="flex flex-col-reverse rounded-xl border border-stone-200 bg-white px-1 py-2 dark:border-stone-800 dark:bg-stone-900">
      <dt className="text-xs leading-tight text-stone-500 dark:text-stone-400">{etiqueta}</dt>
      <dd className="text-2xl font-semibold">{valor}</dd>
    </div>
  )
}

function SinTorneos() {
  return (
    <>
      <Encabezado titulo="Palmarés" accion={botonNuevo} />
      <div className="mt-12 flex flex-col items-center px-4 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-amber-400/20 text-amber-600 dark:text-amber-400">
          <Trophy aria-hidden className="size-10" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Tu palmarés está vacío</h2>
        <p className="mt-2 max-w-xs text-stone-500 dark:text-stone-400">
          Cargá los torneos que jugaste y acá vas a ver tus títulos, finales y participaciones.
        </p>
        <Link to="/palmares/torneos/nuevo" className={`${claseBotonPrimario} mt-6`}>
          <Plus aria-hidden className="size-5" />
          Cargar torneo
        </Link>
      </div>
    </>
  )
}
