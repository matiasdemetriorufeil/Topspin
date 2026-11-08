import type { Partido, Torneo } from '../db/schema'
import { normalizar } from './texto'

/** Campeón en eliminación o 1.° en liga. */
export function esTitulo(t: Pick<Torneo, 'formato' | 'rondaAlcanzada' | 'posicionLiga'>): boolean {
  return t.formato === 'eliminacion' ? t.rondaAlcanzada === 'campeon' : t.posicionLiga === 1
}

export interface Contadores {
  titulos: number
  /** Finales jugadas en eliminación (ganadas o perdidas) */
  finales: number
  /** Semifinales alcanzadas en eliminación (incluye las que siguieron a la final) */
  semifinales: number
  /** Ligas terminadas entre los 3 primeros */
  podiosLiga: number
}

/**
 * Finales y semifinales son acumulativas, como en las estadísticas de tenis:
 * un título también cuenta como final y como semifinal.
 */
export function contadoresPalmares(torneos: Torneo[]): Contadores {
  const c: Contadores = { titulos: 0, finales: 0, semifinales: 0, podiosLiga: 0 }
  for (const t of torneos) {
    if (esTitulo(t)) c.titulos++
    if (t.formato === 'eliminacion') {
      const r = t.rondaAlcanzada
      if (r === 'campeon' || r === 'final') c.finales++
      if (r === 'campeon' || r === 'final' || r === 'semifinal') c.semifinales++
    } else if (t.posicionLiga !== undefined && t.posicionLiga <= 3) {
      c.podiosLiga++
    }
  }
  return c
}

/** Más recientes primero; el mismo día, por nombre. */
export function ordenarTorneosRecientes(torneos: Torneo[]): Torneo[] {
  return [...torneos].sort((a, b) => b.fecha.localeCompare(a.fecha) || a.nombre.localeCompare(b.nombre, 'es'))
}

export function aniosDeTorneos(torneos: Pick<Torneo, 'fecha'>[]): string[] {
  return [...new Set(torneos.map((t) => t.fecha.slice(0, 4)))].sort().reverse()
}

// Rondas de eliminación en el orden en que se juegan, con variantes comunes
const ORDEN_RONDAS: [number, string[]][] = [
  [0, ['primera ronda', 'primera', '1ra ronda', '1.a ronda', 'fase de grupos', 'grupos']],
  [1, ['16avos', '16avos de final', 'dieciseisavos']],
  [2, ['octavos', 'octavos de final']],
  [3, ['cuartos', 'cuartos de final']],
  [4, ['semifinal', 'semifinales', 'semis', 'semi']],
  [5, ['final']],
]

/**
 * Posición de una ronda para ordenar: eliminación de primera ronda a final,
 * liga por número de fecha ("Fecha 3" → 3). null si no se reconoce.
 */
export function ordenDeRonda(ronda: string | undefined): number | null {
  if (!ronda) return null
  const r = normalizar(ronda)
  const fecha = /^fecha\s*(\d+)$/.exec(r)
  if (fecha) return Number(fecha[1])
  return ORDEN_RONDAS.find(([, nombres]) => nombres.includes(r))?.[0] ?? null
}

/** Partidos de un torneo en orden de ronda; los de ronda desconocida van al final, por fecha. */
export function ordenarPorRonda(partidos: Partido[]): Partido[] {
  const clave = (p: Partido) => ordenDeRonda(p.ronda) ?? Number.POSITIVE_INFINITY
  return [...partidos].sort(
    (a, b) =>
      clave(a) - clave(b) ||
      a.fecha.localeCompare(b.fecha) ||
      a.creadoEn.localeCompare(b.creadoEn),
  )
}
