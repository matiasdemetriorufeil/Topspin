import type { Partido, SetJugado } from '../db/schema'

export type Resultado = 'ganado' | 'perdido' | null

/**
 * Deriva el resultado de un partido. Nunca se guarda: se calcula siempre
 * desde `estado` y `sets` (ver PLAN.md, "Ganador del partido").
 *
 * - Completado: gana quien ganó más sets. Sets empatados o vacíos → null.
 * - WO: según el tipo de walkover.
 * - Retiro: gana quien no se retiró, sin importar los sets. Sin `retiroDe` → null.
 * - Suspendido: sin resultado.
 */
export function resultadoPartido(partido: Pick<Partido, 'estado' | 'sets' | 'retiroDe'>): Resultado {
  switch (partido.estado) {
    case 'completado': {
      const ganados = partido.sets.filter((s) => s.gane).length
      const perdidos = partido.sets.length - ganados
      if (ganados === perdidos) return null
      return ganados > perdidos ? 'ganado' : 'perdido'
    }
    case 'wo_ganado':
      return 'ganado'
    case 'wo_perdido':
      return 'perdido'
    case 'retiro':
      if (!partido.retiroDe) return null
      return partido.retiroDe === 'rival' ? 'ganado' : 'perdido'
    case 'suspendido':
      return null
  }
}

/** Sets ganados-perdidos, ej. "2-1". */
export function marcadorSets(sets: Pick<SetJugado, 'gane'>[]): string {
  const ganados = sets.filter((s) => s.gane).length
  return `${ganados}-${sets.length - ganados}`
}

/** "Victoria 2-1", "Derrota por WO", "Victoria por retiro (1-0)", "Suspendido"… */
export function textoResultado(partido: Pick<Partido, 'estado' | 'sets' | 'retiroDe'>): string {
  const resultado = resultadoPartido(partido)
  const palabra = resultado === 'ganado' ? 'Victoria' : 'Derrota'
  const marcador = partido.sets.length > 0 ? marcadorSets(partido.sets) : ''
  switch (partido.estado) {
    case 'wo_ganado':
    case 'wo_perdido':
      return `${palabra} por WO`
    case 'suspendido':
      return marcador ? `Suspendido (${marcador})` : 'Suspendido'
    case 'retiro':
      if (resultado === null) return 'Retiro'
      return marcador ? `${palabra} por retiro (${marcador})` : `${palabra} por retiro`
    case 'completado':
      return resultado === null ? 'Sin resultado' : `${palabra} ${marcador}`
  }
}

/**
 * Games de cada set desde mi lado: "6-4 3-6 7-6(5)". El número entre
 * paréntesis son los puntos del perdedor del tie-break. Sets sin games: G / P.
 */
export function detalleSets(sets: SetJugado[]): string {
  return sets
    .map((s) => {
      if (s.misGames === undefined || s.susGames === undefined) return s.gane ? 'G' : 'P'
      const tb = s.tiebreak ? `(${Math.min(s.tiebreak.mios, s.tiebreak.suyos)})` : ''
      return `${s.misGames}-${s.susGames}${tb}`
    })
    .join(' ')
}
