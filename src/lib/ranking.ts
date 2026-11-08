/**
 * Ranking personal tipo ELO (PLAN.md, "Ranking personal (ELO)").
 *
 * Se recalcula siempre desde cero recorriendo los partidos que cuentan en
 * orden cronológico, así editar o borrar un partido viejo da el resultado
 * correcto. No se guarda en la base.
 */
import type { ID, Partido } from '../db/schema'
import { partidosQueCuentan, type OpcionesEstadisticas } from './estadisticas'
import { resultadoPartido } from './resultado'

export const PUNTAJE_INICIAL = 1500
export const K_INICIAL = 40
export const K_NORMAL = 32
/** Cantidad de partidos míos que usan K_INICIAL */
export const PARTIDOS_K_INICIAL = 10

/** Probabilidad esperada de ganar: E = 1 / (1 + 10^((Rrival − Ryo) / 400)) */
export function probabilidadEsperada(yo: number, rival: number): number {
  return 1 / (1 + 10 ** ((rival - yo) / 400))
}

export interface PuntoRanking {
  partidoId: ID
  rivalId: ID
  fecha: string
  /** Mi puntaje después del partido */
  puntaje: number
  /** Cuánto sumé o resté en este partido */
  delta: number
  /** K usado (40 en mis primeros 10 partidos, 32 después) */
  k: number
  /** Probabilidad esperada de ganar antes del partido */
  esperado: number
}

export interface Ranking {
  /** Un punto por partido que cuenta, en orden cronológico */
  historial: PuntoRanking[]
  actual: number
  /** Máximo histórico (incluye el puntaje inicial) */
  maximo: number
  /** Puntaje estimado actual de cada rival con partidos que cuentan */
  rivales: Map<ID, number>
  /** Delta de cada partido que cuenta, para mostrar "+14 pts" en su detalle */
  deltaPorPartido: Map<ID, number>
}

/**
 * Todos arrancan en 1500. Por cada partido: Ryo += K × (resultado − E) y el
 * rival recibe el ajuste inverso (con el mismo K). Los puntajes se guardan
 * con decimales; redondear solo al mostrar.
 */
export function calcularRanking(
  partidos: Partido[],
  opciones: OpcionesEstadisticas = { incluirWO: false },
): Ranking {
  let yo = PUNTAJE_INICIAL
  let maximo = PUNTAJE_INICIAL
  const rivales = new Map<ID, number>()
  const deltaPorPartido = new Map<ID, number>()
  const historial: PuntoRanking[] = []

  for (const p of partidosQueCuentan(partidos, opciones)) {
    const rival = rivales.get(p.rivalId) ?? PUNTAJE_INICIAL
    const k = historial.length < PARTIDOS_K_INICIAL ? K_INICIAL : K_NORMAL
    const esperado = probabilidadEsperada(yo, rival)
    const resultado = resultadoPartido(p) === 'ganado' ? 1 : 0
    const delta = k * (resultado - esperado)

    yo += delta
    rivales.set(p.rivalId, rival - delta)
    maximo = Math.max(maximo, yo)
    deltaPorPartido.set(p.id, delta)
    historial.push({ partidoId: p.id, rivalId: p.rivalId, fecha: p.fecha, puntaje: yo, delta, k, esperado })
  }

  return { historial, actual: yo, maximo, rivales, deltaPorPartido }
}
