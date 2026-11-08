import { createContext, useContext } from 'react'

export type ResultadoBusqueda = 'hay-nueva' | 'al-dia' | 'no-disponible'

export interface Actualizacion {
  /** Hay una versión nueva descargada esperando para activarse */
  hayNueva: boolean
  /** Activa la versión nueva y recarga la app */
  actualizar: () => void
  /** Pregunta al servidor si hay una versión nueva */
  buscar: () => Promise<ResultadoBusqueda>
}

export const ContextoActualizacion = createContext<Actualizacion>({
  hayNueva: false,
  actualizar: () => {},
  buscar: async () => 'no-disponible',
})

export const useActualizacion = () => useContext(ContextoActualizacion)
