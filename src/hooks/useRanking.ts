import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { partidos } from '../db/repos'
import { calcularRanking, type Ranking } from '../lib/ranking'
import { useOpcionesEstadisticas } from './useOpcionesEstadisticas'

/**
 * Ranking ELO calculado en memoria sobre todos los partidos (nunca se guarda).
 * Se recalcula solo cuando cambian los partidos. undefined mientras carga.
 */
export function useRanking(): Ranking | undefined {
  const opciones = useOpcionesEstadisticas()
  const todos = useLiveQuery(() => partidos.listar())
  return useMemo(() => (todos ? calcularRanking(todos, opciones) : undefined), [todos, opciones])
}
