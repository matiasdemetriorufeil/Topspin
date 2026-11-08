import { useState } from 'react'
import { formatearFecha, hoyISO } from '../lib/fechas'
import { useActualizacion, type ResultadoBusqueda } from '../pwa/contexto'
import { BotonActualizar } from './AvisoActualizacion'

const mensajes: Record<ResultadoBusqueda, string> = {
  'hay-nueva': 'Se está descargando una versión nueva…',
  'al-dia': 'Estás usando la última versión.',
  'no-disponible': 'Las actualizaciones funcionan en la app publicada, no en desarrollo.',
}

export default function SeccionVersion() {
  const { hayNueva, actualizar, buscar } = useActualizacion()
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoBusqueda | null>(null)

  async function buscarActualizacion() {
    setBuscando(true)
    try {
      setResultado(await buscar())
    } catch {
      setResultado('no-disponible')
    } finally {
      setBuscando(false)
    }
  }

  return (
    <section aria-labelledby="titulo-version" className="mt-8">
      <h2 id="titulo-version" className="mb-2 text-lg font-semibold">
        Acerca de
      </h2>
      <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
        <p>
          Mi Tenis <span className="font-semibold">v{__APP_VERSION__}</span>
        </p>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Compilada el {formatearFecha(hoyISO(new Date(__APP_FECHA_BUILD__)))} · {__APP_COMMIT__}
        </p>

        {hayNueva ? (
          <BotonActualizar onClick={actualizar} className="mt-3 w-full" />
        ) : (
          <>
            <button
              type="button"
              onClick={buscarActualizacion}
              disabled={buscando}
              className="mt-3 flex h-11 w-full items-center justify-center rounded-lg border border-stone-300 font-medium active:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:active:bg-stone-800"
            >
              {buscando ? 'Buscando…' : 'Buscar actualizaciones'}
            </button>
            {resultado && (
              <p role="status" className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                {mensajes[resultado]}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
