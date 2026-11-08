import { describe, expect, it } from 'vitest'
import type { Partido } from '../db/schema'
import { calcularRanking, probabilidadEsperada } from './ranking'

let secuencia = 0
function partido(fecha: string, gane: boolean, extra: Partial<Partido> = {}): Partido {
  secuencia++
  return {
    id: `p${secuencia}`,
    fecha,
    rivalId: 'r1',
    clubId: 'c1',
    tipo: 'amistoso',
    estado: 'completado',
    sets: [{ gane }, { gane }],
    creadoEn: `2026-01-01T00:00:00.${String(secuencia).padStart(3, '0')}Z`,
    ...extra,
  }
}
const V = (fecha: string, extra: Partial<Partido> = {}) => partido(fecha, true, extra)
const D = (fecha: string, extra: Partial<Partido> = {}) => partido(fecha, false, extra)

/*
 * Valores calculados a mano:
 *   E(1500 vs 1500) = 0.5
 *   E(1520 vs 1480) = 1 / (1 + 10^(-40/400)) = 1 / (1 + 0.794328) = 0.557312
 *   E(1520 vs 1500) = 1 / (1 + 10^(-20/400)) = 1 / (1 + 0.891251) = 0.528751
 *   E(1480 vs 1520) = 1 - 0.557312          = 0.442688
 */

describe('probabilidadEsperada', () => {
  it('a igual puntaje es 0.5', () => {
    expect(probabilidadEsperada(1500, 1500)).toBe(0.5)
  })

  it('valores calculados a mano', () => {
    expect(probabilidadEsperada(1520, 1480)).toBeCloseTo(0.557312, 6)
    expect(probabilidadEsperada(1520, 1500)).toBeCloseTo(0.528751, 6)
    expect(probabilidadEsperada(1480, 1520)).toBeCloseTo(0.442688, 6)
  })

  it('400 puntos de diferencia es 10 a 1', () => {
    expect(probabilidadEsperada(1900, 1500)).toBeCloseTo(10 / 11, 10)
  })

  it('es simétrica: E(a,b) + E(b,a) = 1', () => {
    expect(probabilidadEsperada(1612, 1433) + probabilidadEsperada(1433, 1612)).toBeCloseTo(1, 12)
  })
})

describe('calcularRanking', () => {
  it('sin partidos: todos en 1500', () => {
    const r = calcularRanking([])
    expect(r.actual).toBe(1500)
    expect(r.maximo).toBe(1500)
    expect(r.historial).toEqual([])
    expect(r.rivales.size).toBe(0)
  })

  it('primera victoria contra un rival nuevo: +20 (K=40, E=0.5)', () => {
    const p = V('2026-01-01')
    const r = calcularRanking([p])
    expect(r.actual).toBe(1520)
    expect(r.rivales.get('r1')).toBe(1480)
    expect(r.deltaPorPartido.get(p.id)).toBe(20)
    expect(r.historial).toEqual([
      { partidoId: p.id, rivalId: 'r1', fecha: '2026-01-01', puntaje: 1520, delta: 20, k: 40, esperado: 0.5 },
    ])
  })

  it('primera derrota: −20, el rival sube 20', () => {
    const r = calcularRanking([D('2026-01-01')])
    expect(r.actual).toBe(1480)
    expect(r.rivales.get('r1')).toBe(1520)
  })

  it('segunda victoria contra el mismo rival: +40 × (1 − 0.557312) = +17.7075', () => {
    const r = calcularRanking([V('2026-01-01'), V('2026-01-02')])
    expect(r.historial[1].delta).toBeCloseTo(17.7075, 3)
    expect(r.actual).toBeCloseTo(1537.7075, 3)
    expect(r.rivales.get('r1')).toBeCloseTo(1462.2925, 3)
  })

  it('victoria contra otro rival nuevo: +40 × (1 − 0.528751) = +18.8500', () => {
    const r = calcularRanking([V('2026-01-01'), V('2026-01-02', { rivalId: 'r2' })])
    expect(r.historial[1].delta).toBeCloseTo(18.85, 3)
    expect(r.actual).toBeCloseTo(1538.85, 3)
    // el primer rival no cambia
    expect(r.rivales.get('r1')).toBe(1480)
    expect(r.rivales.get('r2')).toBeCloseTo(1481.15, 3)
  })

  it('derrota contra un rival que me había ganado: 40 × (0 − 0.442688) = −17.7075', () => {
    const r = calcularRanking([D('2026-01-01'), D('2026-01-02')])
    expect(r.historial[1].delta).toBeCloseTo(-17.7075, 3)
    expect(r.actual).toBeCloseTo(1462.2925, 3)
  })

  it('el rival recibe siempre el ajuste inverso: la suma total se conserva', () => {
    const ps = [V('2026-01-01'), D('2026-01-02', { rivalId: 'r2' }), V('2026-01-03', { rivalId: 'r3' }), D('2026-01-04')]
    const r = calcularRanking(ps)
    const sumaRivales = [...r.rivales.values()].reduce((a, b) => a + b, 0)
    expect(r.actual + sumaRivales).toBeCloseTo(1500 * (1 + r.rivales.size), 9)
  })

  it('K = 40 en mis primeros 10 partidos y 32 desde el 11', () => {
    const ps = Array.from({ length: 12 }, (_, i) =>
      (i % 2 ? D : V)(`2026-01-${String(i + 1).padStart(2, '0')}`, { rivalId: `r${i}` }),
    )
    const r = calcularRanking(ps)
    expect(r.historial.map((h) => h.k)).toEqual([40, 40, 40, 40, 40, 40, 40, 40, 40, 40, 32, 32])
    for (const h of r.historial) {
      const resultado = h.delta > 0 ? 1 : 0
      expect(h.delta).toBeCloseTo(h.k * (resultado - h.esperado), 12)
    }
  })

  it('el partido 11 usa K=32 sobre el puntaje que dejaron los 10 anteriores', () => {
    const previos = Array.from({ length: 10 }, (_, i) => V(`2026-01-${String(i + 1).padStart(2, '0')}`, { rivalId: `r${i}` }))
    const antes = calcularRanking(previos)
    const p11 = V('2026-02-01', { rivalId: 'nuevo' })
    const r = calcularRanking([...previos, p11])
    const e = probabilidadEsperada(antes.actual, 1500)
    expect(r.historial[10].k).toBe(32)
    expect(r.historial[10].delta).toBeCloseTo(32 * (1 - e), 12)
  })

  it('máximo histórico: el pico, no el actual', () => {
    const r = calcularRanking([V('2026-01-01'), D('2026-01-02', { rivalId: 'r2' }), D('2026-01-03', { rivalId: 'r3' })])
    expect(r.maximo).toBe(1520)
    expect(r.actual).toBeLessThan(1500)
  })

  it('máximo histórico incluye el puntaje inicial si solo hubo derrotas', () => {
    const r = calcularRanking([D('2026-01-01'), D('2026-01-02')])
    expect(r.maximo).toBe(1500)
  })

  it('recorre en orden cronológico sin importar el orden de entrada', () => {
    const a = V('2026-01-01')
    const b = D('2026-02-01', { rivalId: 'r2' })
    const c = V('2026-03-01', { rivalId: 'r3' })
    const ordenado = calcularRanking([a, b, c])
    const desordenado = calcularRanking([c, a, b])
    expect(desordenado.actual).toBe(ordenado.actual)
    expect(desordenado.historial.map((h) => h.partidoId)).toEqual([a.id, b.id, c.id])
  })

  it('el mismo día se ordena por carga', () => {
    const primero = V('2026-01-01')
    const segundo = V('2026-01-01')
    const r = calcularRanking([segundo, primero])
    expect(r.deltaPorPartido.get(primero.id)).toBe(20)
    expect(r.deltaPorPartido.get(segundo.id)).toBeCloseTo(17.7075, 3)
  })

  it('borrar un partido viejo recalcula todo lo que sigue', () => {
    const viejo = D('2026-01-01')
    const nuevo = V('2026-02-01')
    expect(calcularRanking([viejo, nuevo]).deltaPorPartido.get(nuevo.id)).toBeCloseTo(40 * (1 - 0.442688), 4)
    expect(calcularRanking([nuevo]).deltaPorPartido.get(nuevo.id)).toBe(20)
  })

  describe('qué partidos cuentan', () => {
    it('WO y suspendidos no cuentan por defecto', () => {
      const wo = partido('2026-01-01', true, { estado: 'wo_ganado', sets: [] })
      const susp = partido('2026-01-02', true, { estado: 'suspendido' })
      const r = calcularRanking([wo, susp])
      expect(r.actual).toBe(1500)
      expect(r.deltaPorPartido.has(wo.id)).toBe(false)
      expect(r.rivales.size).toBe(0)
    })

    it('con el ajuste, los WO cuentan; los suspendidos nunca', () => {
      const wo = partido('2026-01-01', true, { estado: 'wo_perdido', sets: [] })
      const susp = partido('2026-01-02', true, { estado: 'suspendido' })
      const r = calcularRanking([wo, susp], { incluirWO: true })
      expect(r.actual).toBe(1480)
      expect(r.historial).toHaveLength(1)
    })

    it('los retiros cuentan según quién se retiró', () => {
      const retiroRival = partido('2026-01-01', false, { estado: 'retiro', retiroDe: 'rival', sets: [{ gane: false, misGames: 2, susGames: 6 }] })
      expect(calcularRanking([retiroRival]).actual).toBe(1520)
      const retiroMio = partido('2026-01-01', true, { estado: 'retiro', retiroDe: 'yo', sets: [{ gane: true, misGames: 6, susGames: 2 }] })
      expect(calcularRanking([retiroMio]).actual).toBe(1480)
    })

    it('un WO sin el ajuste no consume uno de los 10 partidos con K=40', () => {
      const ps = [
        partido('2025-12-31', true, { estado: 'wo_ganado', sets: [] }),
        ...Array.from({ length: 10 }, (_, i) => V(`2026-01-${String(i + 1).padStart(2, '0')}`, { rivalId: `r${i}` })),
      ]
      expect(calcularRanking(ps).historial.every((h) => h.k === 40)).toBe(true)
    })
  })
})
