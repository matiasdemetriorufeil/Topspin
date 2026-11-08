import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { clubes, mensajeDeError } from '../db/repos'
import type { Torneo } from '../db/schema'
import { FORMATOS, RONDAS, validarTorneo, type ErroresForm, type ValoresFormTorneo } from '../lib/torneo'
import Campo from './Campo'
import { claseBotonPrimario, claseCampo, claseError } from './estilos'
import Segmentado from './Segmentado'
import SelectorConCreacion from './SelectorConCreacion'

interface Props {
  inicial: ValoresFormTorneo
  onGuardar: (datos: Omit<Torneo, 'id'>) => Promise<void>
}

export default function FormularioTorneo({ inicial, onGuardar }: Props) {
  const [valores, setValores] = useState(inicial)
  const [errores, setErrores] = useState<ErroresForm<ValoresFormTorneo>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const listaClubes = useLiveQuery(() => clubes.listar())

  function cambiar<K extends keyof ValoresFormTorneo>(campo: K, valor: ValoresFormTorneo[K]) {
    setValores((v) => ({ ...v, [campo]: valor }))
    setErrores((e) => ({ ...e, [campo]: undefined }))
    setErrorGeneral(null)
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    const r = validarTorneo(valores)
    if (!r.ok) {
      setErrores(r.errores)
      return
    }
    setEnviando(true)
    try {
      await onGuardar(r.datos)
    } catch (err) {
      setErrorGeneral(mensajeDeError(err, 'No se pudo guardar el torneo.'))
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
      <Campo etiqueta="Nombre" error={errores.nombre}>
        {(props) => (
          <input
            {...props}
            value={valores.nombre}
            onChange={(e) => cambiar('nombre', e.target.value)}
            autoCapitalize="words"
            className={`${claseCampo} w-full`}
          />
        )}
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Fecha" error={errores.fecha}>
          {(props) => (
            <input
              {...props}
              type="date"
              value={valores.fecha}
              onChange={(e) => cambiar('fecha', e.target.value)}
              className={`${claseCampo} w-full`}
            />
          )}
        </Campo>
        <Campo etiqueta="Categoría (opcional)" error={errores.categoria}>
          {(props) => (
            <input
              {...props}
              value={valores.categoria}
              onChange={(e) => cambiar('categoria', e.target.value)}
              placeholder="Ej. Primera"
              className={`${claseCampo} w-full`}
            />
          )}
        </Campo>
      </div>

      <SelectorConCreacion
        etiqueta="Club"
        opciones={listaClubes}
        valor={valores.clubId || undefined}
        onChange={(id) => cambiar('clubId', id)}
        onCrear={(nombre) => clubes.crear({ nombre })}
        error={errores.clubId}
      />

      <Segmentado
        etiqueta="Formato"
        opciones={FORMATOS}
        valor={valores.formato}
        onChange={(f) => cambiar('formato', f)}
      />

      {valores.formato === 'eliminacion' ? (
        <Campo etiqueta="Ronda alcanzada (opcional)" error={errores.rondaAlcanzada}>
          {(props) => (
            <select
              {...props}
              value={valores.rondaAlcanzada}
              onChange={(e) => cambiar('rondaAlcanzada', e.target.value)}
              className={`${claseCampo} w-full`}
            >
              <option value="">Sin resultado todavía</option>
              {RONDAS.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {r.etiqueta}
                </option>
              ))}
            </select>
          )}
        </Campo>
      ) : (
        <Campo etiqueta="Posición final (opcional)" error={errores.posicionLiga}>
          {(props) => (
            <input
              {...props}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={valores.posicionLiga}
              onChange={(e) => cambiar('posicionLiga', e.target.value)}
              placeholder="Ej. 2"
              className={`${claseCampo} w-full`}
            />
          )}
        </Campo>
      )}

      {errorGeneral && (
        <p role="alert" className={claseError}>
          {errorGeneral}
        </p>
      )}

      <button type="submit" disabled={enviando} className={`${claseBotonPrimario} mt-2`}>
        Guardar
      </button>
    </form>
  )
}
