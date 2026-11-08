import type { SetJugado } from '../db/schema'

/**
 * ¿Es el marcador final de un set? 6-0 a 6-4, 7-5 y 7-6 (en cualquier orden).
 * Con superTiebreak también acepta un super tie-break: 10 con 2 de diferencia
 * o, pasando 10, exactamente 2 (10-8, 11-9, 12-10).
 */
export function esMarcadorTerminado(a: number, b: number, { superTiebreak }: { superTiebreak: boolean }): boolean {
  const max = Math.max(a, b)
  const min = Math.min(a, b)
  if ((max === 6 && min <= 4) || (max === 7 && (min === 5 || min === 6))) return true
  return superTiebreak && max >= 10 && max - min >= 2 && (max === 10 || max - min === 2)
}

export function tieneGames(s: SetJugado): s is SetJugado & { misGames: number; susGames: number } {
  return s.misGames !== undefined && s.susGames !== undefined
}

/**
 * ¿El set se terminó de jugar? Sin games no hay forma de saberlo y se asume
 * que sí. Solo el último set puede ser un super tie-break.
 */
export function setTerminado(s: SetJugado, esUltimo: boolean): boolean {
  if (!tieneGames(s)) return true
  return esMarcadorTerminado(s.misGames, s.susGames, { superTiebreak: esUltimo })
}
