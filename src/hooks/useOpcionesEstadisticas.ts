import { useMemo } from 'react'
import type { OpcionesEstadisticas } from '../lib/estadisticas'
import { useAjustes } from './useAjustes'

/** Opciones que afectan estadísticas y ranking, según el ajuste guardado en la base. */
export function useOpcionesEstadisticas(): OpcionesEstadisticas {
  const incluirWO = useAjustes()?.incluirWO ?? false
  // Misma referencia mientras el ajuste no cambie, para no recalcular de más
  return useMemo(() => ({ incluirWO }), [incluirWO])
}
