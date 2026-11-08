import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { clubes, ErrorValidacion, mensajeDeError, partidos, rivales, torneos } from '../db/repos'
import type { Partido } from '../db/schema'
import { hoyISO } from '../lib/fechas'
import {
  ESTADOS,
  esWO,
  RONDAS_PARTIDO,
  setVacio,
  validarPartido,
  vistaPrevia,
  type ErroresPartido,
  type ValoresFormPartido,
} from '../lib/partido'
import { etiquetaTorneo } from '../lib/torneo'
import Campo from './Campo'
import EditorSets from './EditorSets'
import { claseBotonPrimario, claseCampo, claseError } from './estilos'
import Segmentado from './Segmentado'
import SelectorConCreacion from './SelectorConCreacion'

interface Props {
  inicial: ValoresFormPartido
  /** Al editar, para no contarse a sí mismo al sugerir "Fecha N" */
  partidoId?: string
  onGuardar: (datos: Omit<Partido, 'id' | 'creadoEn'>) => Promise<void>
}

const colorResultado = {
  ganado: 'text-lona-600 dark:text-lona-500',
  perdido: 'text-red-600 dark:text-red-400',
  nulo: 'text-stone-500 dark:text-stone-400',
}

export default function FormularioPartido({ inicial, partidoId, onGuardar }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [valores, setValores] = useState(inicial)
  const [errores, setErrores] = useState<ErroresPartido>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const listaRivales = useLiveQuery(() => rivales.listar())
  const listaClubes = useLiveQuery(() => clubes.listar())
  const listaTorneos = useLiveQuery(() => torneos.listar())
  const opcionesTorneo = useMemo(
    () => listaTorneos?.map((t) => ({ id: t.id, nombre: etiquetaTorneo(t) })),
    [listaTorneos],
  )
  const torneoElegido = listaTorneos?.find((t) => t.id === valores.torneoId)
  const partidosPreviosEnTorneo = useLiveQuery(
    async () =>
      valores.torneoId ? (await partidos.porTorneo(valores.torneoId)).filter((p) => p.id !== partidoId).length : 0,
    [valores.torneoId, partidoId],
  )
  const sugerenciasRonda =
    torneoElegido?.formato === 'liga' ? [`Fecha ${(partidosPreviosEnTorneo ?? 0) + 1}`] : RONDAS_PARTIDO

  const vista = vistaPrevia(valores)

  function cambiar(cambios: Partial<ValoresFormPartido>) {
    setValores((v) => ({ ...v, ...cambios }))
    // Limpia los errores de los campos tocados (y de los sets si cambian)
    setErrores((e) => {
      const resto = { ...e }
      for (const campo of Object.keys(cambios)) {
        for (const clave of Object.keys(resto)) {
          if (clave === campo || clave.startsWith(`${campo}.`)) delete resto[clave]
        }
      }
      return resto
    })
    setErrorGeneral(null)
  }

  function cambiarEstado(estado: ValoresFormPartido['estado']) {
    // Un partido completado necesita al menos un set para empezar a cargar
    const sets = estado === 'completado' && valores.sets.length === 0 ? [setVacio()] : valores.sets
    cambiar({ estado, sets })
  }

  function elegirTorneo(id: string) {
    const torneo = listaTorneos?.find((t) => t.id === id)
    // El partido de un torneo normalmente se juega en el club del torneo
    cambiar(torneo ? { torneoId: id, clubId: torneo.clubId } : { torneoId: id })
  }

  async function crearTorneoRapido(nombre: string) {
    if (!valores.clubId) throw new ErrorValidacion('Elegí primero el club para crear el torneo.')
    const t = await torneos.crear({
      nombre,
      fecha: valores.fecha || hoyISO(),
      clubId: valores.clubId,
      formato: 'eliminacion',
    })
    return { id: t.id, nombre: etiquetaTorneo(t) }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const r = validarPartido(valores)
    if (!r.ok) {
      setErrores(r.errores)
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector('[aria-invalid="true"], [data-error]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      )
      return
    }
    setEnviando(true)
    try {
      await onGuardar(r.datos)
    } catch (err) {
      setErrorGeneral(mensajeDeError(err, 'No se pudo guardar el partido.'))
      setEnviando(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={guardar} noValidate className="flex flex-col gap-4">
      <Campo etiqueta="Fecha" error={errores.fecha}>
        {(props) => (
          <input
            {...props}
            type="date"
            value={valores.fecha}
            onChange={(e) => cambiar({ fecha: e.target.value })}
            className={`${claseCampo} w-full`}
          />
        )}
      </Campo>

      <SelectorConCreacion
        etiqueta="Rival"
        opciones={listaRivales}
        valor={valores.rivalId || undefined}
        onChange={(id) => cambiar({ rivalId: id })}
        onCrear={(nombre) => rivales.crear({ nombre })}
        error={errores.rivalId}
      />

      <SelectorConCreacion
        etiqueta="Club"
        opciones={listaClubes}
        valor={valores.clubId || undefined}
        onChange={(id) => cambiar({ clubId: id })}
        onCrear={(nombre) => clubes.crear({ nombre })}
        error={errores.clubId}
      />

      <Segmentado
        etiqueta="Tipo"
        opciones={[
          { valor: 'amistoso', etiqueta: 'Amistoso' },
          { valor: 'torneo', etiqueta: 'Torneo' },
        ]}
        valor={valores.tipo}
        onChange={(tipo) => cambiar({ tipo })}
      />

      {valores.tipo === 'torneo' && (
        <>
          <div>
            <SelectorConCreacion
              etiqueta="Torneo"
              opciones={opcionesTorneo}
              valor={valores.torneoId || undefined}
              onChange={elegirTorneo}
              onCrear={crearTorneoRapido}
              error={errores.torneoId}
            />
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Si lo creás desde acá queda como eliminación; podés completarlo después en Palmarés.
            </p>
          </div>

          <Campo etiqueta="Ronda (opcional)" error={errores.ronda}>
            {(props) => (
              <>
                <input
                  {...props}
                  value={valores.ronda}
                  onChange={(e) => cambiar({ ronda: e.target.value })}
                  placeholder="Ej. Cuartos"
                  autoCapitalize="sentences"
                  className={`${claseCampo} w-full`}
                />
                <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
                  {sugerenciasRonda.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => cambiar({ ronda: s })}
                      className={`h-11 shrink-0 rounded-full border px-4 text-sm ${
                        valores.ronda === s
                          ? 'border-lona-600 bg-lona-600 text-white'
                          : 'border-stone-300 active:bg-stone-100 dark:border-stone-700 dark:active:bg-stone-800'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </Campo>
        </>
      )}

      <Segmentado
        etiqueta="Estado"
        opciones={ESTADOS}
        valor={valores.estado}
        onChange={cambiarEstado}
        columnas={3}
      />

      {valores.estado === 'retiro' && (
        <Segmentado
          etiqueta="Se retiró"
          opciones={[
            { valor: 'yo', etiqueta: 'Yo' },
            { valor: 'rival', etiqueta: 'El rival' },
          ]}
          valor={valores.retiroDe}
          onChange={(retiroDe) => cambiar({ retiroDe })}
          error={errores.retiroDe}
        />
      )}

      {!esWO(valores.estado) && (
        <EditorSets
          sets={valores.sets}
          onChange={(sets) => cambiar({ sets })}
          errores={errores}
          minimo={valores.estado === 'completado' ? 1 : 0}
        />
      )}

      <Campo etiqueta="Notas (opcional)" error={errores.notas}>
        {(props) => (
          <textarea
            {...props}
            value={valores.notas}
            onChange={(e) => cambiar({ notas: e.target.value })}
            rows={3}
            className={`${claseCampo} h-auto w-full py-2`}
          />
        )}
      </Campo>

      {/* Barra fija sobre la navegación: resultado en vivo + Guardar, al alcance del pulgar */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
        {errorGeneral && (
          <p role="alert" className={`${claseError} mt-0 mb-2`}>
            {errorGeneral}
          </p>
        )}
        <div className="flex items-center gap-3">
          <p aria-live="polite" className={`min-w-0 flex-1 truncate font-semibold ${colorResultado[vista.resultado ?? 'nulo']}`}>
            {vista.texto}
          </p>
          <button type="submit" disabled={enviando} className={`${claseBotonPrimario} min-w-28`}>
            Guardar
          </button>
        </div>
      </div>
    </form>
  )
}
