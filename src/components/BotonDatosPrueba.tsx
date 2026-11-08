import { useState } from 'react'

/** Solo se muestra en desarrollo (ver Ajustes). */
export default function BotonDatosPrueba() {
  const [estado, setEstado] = useState<'listo' | 'cargando' | 'ok' | 'error'>('listo')

  async function cargar() {
    if (!window.confirm('Esto borra todos los datos y carga datos de prueba. ¿Seguir?')) return
    setEstado('cargando')
    try {
      const { cargarDatosPrueba } = await import('../db/datosPrueba')
      await cargarDatosPrueba()
      setEstado('ok')
    } catch (e) {
      console.error(e)
      setEstado('error')
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-dashed border-amber-500/60 p-4">
      <h2 className="font-semibold">Desarrollo</h2>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Reemplaza la base con 40 partidos, 6 rivales, 2 clubes y 4 torneos.
      </p>
      <button
        type="button"
        onClick={cargar}
        disabled={estado === 'cargando'}
        className="mt-3 h-11 rounded-lg bg-amber-500 px-4 font-medium text-stone-950 active:bg-amber-600 disabled:opacity-50"
      >
        {estado === 'cargando' ? 'Cargando…' : 'Cargar datos de prueba'}
      </button>
      {estado === 'ok' && <p className="mt-2 text-sm text-lona-600 dark:text-lona-500">Datos cargados.</p>}
      {estado === 'error' && <p className="mt-2 text-sm text-red-600">No se pudieron cargar los datos.</p>}
    </section>
  )
}
