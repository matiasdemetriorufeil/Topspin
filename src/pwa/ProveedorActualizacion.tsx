import { useMemo, useRef, type ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { ContextoActualizacion, type ResultadoBusqueda } from './contexto'

const UNA_HORA = 60 * 60 * 1000

/**
 * Registra el service worker (una sola vez para toda la app) y expone si hay
 * una versión nueva. Con registerType "prompt", la versión nueva se descarga
 * sola pero espera a que el usuario toque "actualizar".
 */
export default function ProveedorActualizacion({ children }: { children: ReactNode }) {
  const registro = useRef<ServiceWorkerRegistration | undefined>(undefined)
  const {
    needRefresh: [hayNueva],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, r) {
      registro.current = r
      // La app instalada puede quedar abierta días: chequeo periódico
      if (r) setInterval(() => navigator.onLine && r.update(), UNA_HORA)
    },
  })

  const valor = useMemo(
    () => ({
      hayNueva,
      actualizar: () => void updateServiceWorker(true),
      async buscar(): Promise<ResultadoBusqueda> {
        const r = registro.current
        // En desarrollo no hay service worker
        if (!r) return 'no-disponible'
        await r.update()
        return r.installing || r.waiting ? 'hay-nueva' : 'al-dia'
      },
    }),
    [hayNueva, updateServiceWorker],
  )

  return <ContextoActualizacion.Provider value={valor}>{children}</ContextoActualizacion.Provider>
}
