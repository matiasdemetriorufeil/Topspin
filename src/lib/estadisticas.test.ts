import { describe, expect, it } from 'vitest'
import type { Partido, SetJugado } from '../db/schema'
import {
  estadisticasTiebreak,
  evolucionPorcentaje,
  headToHead,
  mejorRacha,
  ordenarCronologico,
  partidosPorMes,
  partidosQueCuentan,
  porcentajeVictorias,
  rachaActual,
  rankingRivales,
  remontadas,
} from './estadisticas'

// ---------- Fábrica de partidos ----------

let secuencia = 0

/** creadoEn crece con cada llamada: el orden de creación desempata el mismo día. */
function partido(fecha: string, extra: Partial<Partido> = {}): Partido {
  secuencia++
  return {
    id: `p${secuencia}`,
    fecha,
    rivalId: 'r1',
    clubId: 'c1',
    tipo: 'amistoso',
    estado: 'completado',
    sets: [{ gane: true }, { gane: true }],
    creadoEn: `2026-01-01T00:00:00.${String(secuencia).padStart(3, '0')}Z`,
    ...extra,
  }
}

const g = (a: number, b: number, extra: Partial<SetJugado> = {}): SetJugado => ({ gane: a > b, misGames: a, susGames: b, ...extra })

/** Victoria / derrota completada en sets sin games */
const V = (fecha: string, extra: Partial<Partido> = {}) => partido(fecha, { sets: [{ gane: true }, { gane: true }], ...extra })
const D = (fecha: string, extra: Partial<Partido> = {}) => partido(fecha, { sets: [{ gane: false }, { gane: false }], ...extra })
const woGanado = (fecha: string, extra: Partial<Partido> = {}) => partido(fecha, { estado: 'wo_ganado', sets: [], ...extra })
const woPerdido = (fecha: string, extra: Partial<Partido> = {}) => partido(fecha, { estado: 'wo_perdido', sets: [], ...extra })
const suspendido = (fecha: string, extra: Partial<Partido> = {}) =>
  partido(fecha, { estado: 'suspendido', sets: [g(3, 2)], ...extra })
const retiroRival = (fecha: string, extra: Partial<Partido> = {}) =>
  partido(fecha, { estado: 'retiro', retiroDe: 'rival', sets: [g(6, 4), g(1, 2)], ...extra })
const retiroMio = (fecha: string, extra: Partial<Partido> = {}) =>
  partido(fecha, { estado: 'retiro', retiroDe: 'yo', sets: [g(6, 4)], ...extra })

const sinWO = { incluirWO: false }
const conWO = { incluirWO: true }
const ids = (ps: Partido[]) => ps.map((p) => p.id)

// ---------- partidosQueCuentan ----------

describe('partidosQueCuentan', () => {
  it('sin partidos devuelve vacío', () => {
    expect(partidosQueCuentan([], sinWO)).toEqual([])
    expect(partidosQueCuentan([], conWO)).toEqual([])
  })

  it('cuenta completados y retiros; deja afuera WO y suspendidos', () => {
    const v = V('2026-01-01')
    const r1 = retiroRival('2026-01-02')
    const r2 = retiroMio('2026-01-03')
    const todos = [v, r1, r2, woGanado('2026-01-04'), woPerdido('2026-01-05'), suspendido('2026-01-06')]
    expect(ids(partidosQueCuentan(todos, sinWO))).toEqual(ids([v, r1, r2]))
  })

  it('con el ajuste incluye los WO, pero nunca los suspendidos', () => {
    const v = V('2026-01-01')
    const wg = woGanado('2026-01-02')
    const wp = woPerdido('2026-01-03')
    expect(ids(partidosQueCuentan([v, wg, wp, suspendido('2026-01-04')], conWO))).toEqual(ids([v, wg, wp]))
  })

  it('solo WO: no cuenta nada por defecto, todo con el ajuste', () => {
    const todos = [woGanado('2026-01-01'), woPerdido('2026-01-02')]
    expect(partidosQueCuentan(todos, sinWO)).toEqual([])
    expect(partidosQueCuentan(todos, conWO)).toHaveLength(2)
  })

  it('descarta partidos sin resultado definido', () => {
    const sinSets = partido('2026-01-01', { sets: [] })
    const empatado = partido('2026-01-02', { sets: [{ gane: true }, { gane: false }] })
    const retiroSinQuien = partido('2026-01-03', { estado: 'retiro', sets: [] })
    expect(partidosQueCuentan([sinSets, empatado, retiroSinQuien], conWO)).toEqual([])
  })

  it('ordena por fecha y, el mismo día, por orden de carga', () => {
    const tarde = V('2026-03-01')
    const primero = V('2026-02-01')
    const mismoDia1 = V('2026-02-15')
    const mismoDia2 = D('2026-02-15')
    expect(ids(partidosQueCuentan([tarde, mismoDia2, primero, mismoDia1], sinWO))).toEqual(
      ids([primero, mismoDia1, mismoDia2, tarde]),
    )
  })

  it('no modifica el array recibido', () => {
    const lista = [V('2026-02-01'), V('2026-01-01')]
    const copia = [...lista]
    partidosQueCuentan(lista, sinWO)
    expect(lista).toEqual(copia)
  })
})

describe('ordenarCronologico', () => {
  it('desempata el mismo día por creadoEn, no por el orden de entrada', () => {
    const a = V('2026-05-05')
    const b = V('2026-05-05')
    expect(ids(ordenarCronologico([b, a]))).toEqual(ids([a, b]))
  })
})

// ---------- porcentajeVictorias ----------

describe('porcentajeVictorias', () => {
  it('sin partidos: todo en cero y porcentaje null', () => {
    expect(porcentajeVictorias([])).toEqual({ ganados: 0, perdidos: 0, total: 0, porcentaje: null })
  })

  it('ganados / total', () => {
    const r = porcentajeVictorias([V('2026-01-01'), V('2026-01-02'), D('2026-01-03')])
    expect(r).toMatchObject({ ganados: 2, perdidos: 1, total: 3 })
    expect(r.porcentaje).toBeCloseTo(66.667, 2)
  })

  it('100% y 0%', () => {
    expect(porcentajeVictorias([V('2026-01-01')]).porcentaje).toBe(100)
    expect(porcentajeVictorias([D('2026-01-01')]).porcentaje).toBe(0)
  })

  it('los retiros cuentan según quién se retiró', () => {
    expect(porcentajeVictorias([retiroRival('2026-01-01'), retiroMio('2026-01-02')])).toMatchObject({
      ganados: 1,
      perdidos: 1,
      porcentaje: 50,
    })
  })

  it('WO cuentan solo si vienen incluidos desde partidosQueCuentan', () => {
    const todos = [V('2026-01-01'), woPerdido('2026-01-02')]
    expect(porcentajeVictorias(partidosQueCuentan(todos, sinWO)).porcentaje).toBe(100)
    expect(porcentajeVictorias(partidosQueCuentan(todos, conWO)).porcentaje).toBe(50)
  })

  describe('por período', () => {
    const ps = [V('2025-12-31'), V('2026-01-01'), D('2026-06-15'), D('2026-12-31'), V('2027-01-01')]

    it('incluye ambos extremos', () => {
      expect(porcentajeVictorias(ps, { desde: '2026-01-01', hasta: '2026-12-31' })).toMatchObject({
        ganados: 1,
        perdidos: 2,
        total: 3,
      })
    })

    it('solo desde o solo hasta', () => {
      expect(porcentajeVictorias(ps, { desde: '2026-06-15' }).total).toBe(3)
      expect(porcentajeVictorias(ps, { hasta: '2026-01-01' }).total).toBe(2)
    })

    it('período sin partidos devuelve porcentaje null', () => {
      expect(porcentajeVictorias(ps, { desde: '2030-01-01' }).porcentaje).toBeNull()
    })
  })
})

// ---------- rachaActual / mejorRacha ----------

describe('rachaActual', () => {
  it('sin partidos es null', () => {
    expect(rachaActual([])).toBeNull()
  })

  it('cuenta victorias consecutivas desde el más reciente', () => {
    expect(rachaActual([D('2026-01-01'), V('2026-01-02'), V('2026-01-03'), V('2026-01-04')])).toEqual({
      tipo: 'victorias',
      cantidad: 3,
    })
  })

  it('cuenta derrotas consecutivas', () => {
    expect(rachaActual([V('2026-01-01'), D('2026-01-02'), D('2026-01-03')])).toEqual({ tipo: 'derrotas', cantidad: 2 })
  })

  it('todo el historial en la misma racha', () => {
    expect(rachaActual([V('2026-01-01'), V('2026-01-02')])).toEqual({ tipo: 'victorias', cantidad: 2 })
  })

  it('no depende del orden de entrada', () => {
    expect(rachaActual([V('2026-01-03'), D('2026-01-01'), V('2026-01-02')])).toEqual({ tipo: 'victorias', cantidad: 2 })
  })

  it('el mismo día manda el último cargado', () => {
    const ganadoPrimero = V('2026-01-05')
    const perdidoDespues = D('2026-01-05')
    expect(rachaActual([perdidoDespues, ganadoPrimero])).toEqual({ tipo: 'derrotas', cantidad: 1 })
  })

  it('un retiro mío corta una racha de victorias', () => {
    expect(rachaActual([V('2026-01-01'), V('2026-01-02'), retiroMio('2026-01-03')])).toEqual({
      tipo: 'derrotas',
      cantidad: 1,
    })
  })

  it('un retiro del rival suma a la racha', () => {
    expect(rachaActual([V('2026-01-01'), retiroRival('2026-01-02')])).toEqual({ tipo: 'victorias', cantidad: 2 })
  })

  it('los WO solo afectan la racha si se incluyen', () => {
    const todos = [V('2026-01-01'), woPerdido('2026-01-02')]
    expect(rachaActual(partidosQueCuentan(todos, sinWO))).toEqual({ tipo: 'victorias', cantidad: 1 })
    expect(rachaActual(partidosQueCuentan(todos, conWO))).toEqual({ tipo: 'derrotas', cantidad: 1 })
  })
})

describe('mejorRacha', () => {
  it('sin partidos es 0', () => {
    expect(mejorRacha([])).toBe(0)
  })

  it('solo derrotas es 0', () => {
    expect(mejorRacha([D('2026-01-01'), D('2026-01-02')])).toBe(0)
  })

  it('máxima secuencia de victorias en todo el historial', () => {
    const ps = [
      V('2026-01-01'), V('2026-01-02'), D('2026-01-03'),
      V('2026-01-04'), V('2026-01-05'), V('2026-01-06'), D('2026-01-07'), V('2026-01-08'),
    ]
    expect(mejorRacha(ps)).toBe(3)
  })

  it('la racha más larga puede ser la actual', () => {
    expect(mejorRacha([D('2026-01-01'), V('2026-01-02'), V('2026-01-03')])).toBe(2)
  })

  it('el orden del mismo día define si la racha se corta', () => {
    // V (día 1), V (día 2, cargado antes), D (día 2, cargado después), V (día 3) → mejor = 2
    const a = V('2026-01-01')
    const b = V('2026-01-02')
    const c = D('2026-01-02')
    const d = V('2026-01-03')
    expect(mejorRacha([d, c, b, a])).toBe(2)
  })
})

// ---------- estadisticasTiebreak ----------

describe('estadisticasTiebreak', () => {
  it('sin partidos: cero y porcentaje null', () => {
    expect(estadisticasTiebreak([])).toEqual({ ganados: 0, perdidos: 0, total: 0, porcentaje: null })
  })

  it('cuenta sets 7-6 y 6-7, con o sin tie-break cargado', () => {
    const ps = [
      partido('2026-01-01', { sets: [g(7, 6, { tiebreak: { mios: 7, suyos: 4 } }), g(6, 3)] }),
      partido('2026-01-02', { sets: [g(6, 7), g(7, 6), g(6, 2)] }),
    ]
    expect(estadisticasTiebreak(ps)).toEqual({ ganados: 2, perdidos: 1, total: 3, porcentaje: (2 / 3) * 100 })
  })

  it('ignora sets que no son tie-break', () => {
    const ps = [partido('2026-01-01', { sets: [g(7, 5), g(6, 4)] }), partido('2026-01-02', { sets: [g(4, 6), g(6, 0), g(10, 8)] })]
    expect(estadisticasTiebreak(ps).total).toBe(0)
  })

  it('el super tie-break (10-8) no cuenta como tie-break', () => {
    expect(estadisticasTiebreak([partido('2026-01-01', { sets: [g(4, 6), g(6, 3), g(10, 8)] })]).total).toBe(0)
  })

  it('cuenta un set con tie-break cargado aunque los games no sean 7-6', () => {
    const ps = [partido('2026-01-01', { estado: 'retiro', retiroDe: 'rival', sets: [g(6, 6, { gane: false, tiebreak: { mios: 3, suyos: 5 } })] })]
    expect(estadisticasTiebreak(ps)).toMatchObject({ ganados: 0, perdidos: 1 })
  })

  it('ignora sets sin games, aunque tengan tie-break', () => {
    const ps = [partido('2026-01-01', { sets: [{ gane: true }, { gane: true, tiebreak: { mios: 7, suyos: 5 } }] })]
    expect(estadisticasTiebreak(ps).total).toBe(0)
  })

  it('mezcla de sets con y sin games', () => {
    const ps = [partido('2026-01-01', { sets: [{ gane: false }, g(7, 6), g(6, 7)] })]
    // no es un partido válido de formulario, pero el conteo es por set
    expect(estadisticasTiebreak(ps)).toMatchObject({ ganados: 1, perdidos: 1 })
  })

  it('solo WO: no hay sets', () => {
    expect(estadisticasTiebreak(partidosQueCuentan([woGanado('2026-01-01')], conWO)).total).toBe(0)
  })
})

// ---------- remontadas ----------

describe('remontadas', () => {
  it('sin partidos', () => {
    expect(remontadas([])).toEqual({ cantidad: 0, partidos: [] })
  })

  it('ganados habiendo perdido el primer set', () => {
    const remontada = partido('2026-01-01', { sets: [g(4, 6), g(6, 3), g(6, 2)] })
    const directo = partido('2026-01-02', { sets: [g(6, 4), g(6, 3)] })
    const ganoPrimeroPerdioPartido = partido('2026-01-03', { sets: [g(6, 4), g(3, 6), g(2, 6)] })
    const perdioPrimeroYPartido = partido('2026-01-04', { sets: [g(4, 6), g(3, 6)] })
    const r = remontadas([remontada, directo, ganoPrimeroPerdioPartido, perdioPrimeroYPartido])
    expect(r.cantidad).toBe(1)
    expect(ids(r.partidos)).toEqual([remontada.id])
  })

  it('funciona con sets sin games', () => {
    const p = partido('2026-01-01', { sets: [{ gane: false }, { gane: true }, { gane: true }] })
    expect(remontadas([p]).cantidad).toBe(1)
  })

  it('con super tie-break en el último set', () => {
    expect(remontadas([partido('2026-01-01', { sets: [g(3, 6), g(6, 4), g(10, 7)] })]).cantidad).toBe(1)
  })

  it('retiro del rival después de perder yo el primer set cuenta', () => {
    const p = partido('2026-01-01', { estado: 'retiro', retiroDe: 'rival', sets: [g(3, 6), g(2, 1)] })
    expect(remontadas([p]).cantidad).toBe(1)
  })

  it('retiro del rival durante el primer set (a medias) no cuenta', () => {
    const p = partido('2026-01-01', { estado: 'retiro', retiroDe: 'rival', sets: [{ gane: false, misGames: 2, susGames: 4 }] })
    expect(remontadas([p]).cantidad).toBe(0)
  })

  it('retiro mío no es remontada', () => {
    expect(remontadas([partido('2026-01-01', { estado: 'retiro', retiroDe: 'yo', sets: [g(3, 6), g(6, 2)] })]).cantidad).toBe(0)
  })

  it('WO ganado no tiene sets, no es remontada', () => {
    expect(remontadas(partidosQueCuentan([woGanado('2026-01-01')], conWO)).cantidad).toBe(0)
  })

  it('devuelve en orden cronológico', () => {
    const tarde = partido('2026-05-01', { sets: [{ gane: false }, { gane: true }, { gane: true }] })
    const temprano = partido('2026-02-01', { sets: [{ gane: false }, { gane: true }, { gane: true }] })
    expect(ids(remontadas([tarde, temprano]).partidos)).toEqual(ids([temprano, tarde]))
  })
})

// ---------- partidosPorMes ----------

describe('partidosPorMes', () => {
  it('sin partidos devuelve vacío', () => {
    expect(partidosPorMes([])).toEqual([])
  })

  it('cuenta ganados y perdidos por mes', () => {
    const ps = [V('2026-03-01'), D('2026-03-15'), V('2026-03-31'), retiroMio('2026-04-02')]
    expect(partidosPorMes(ps)).toEqual([
      { mes: '2026-03', titulo: 'Marzo 2026', ganados: 2, perdidos: 1 },
      { mes: '2026-04', titulo: 'Abril 2026', ganados: 0, perdidos: 1 },
    ])
  })

  it('completa en cero los meses sin partidos, cruzando el año', () => {
    const r = partidosPorMes([V('2025-11-10'), D('2026-02-03')])
    expect(r.map((m) => [m.mes, m.ganados, m.perdidos])).toEqual([
      ['2025-11', 1, 0],
      ['2025-12', 0, 0],
      ['2026-01', 0, 0],
      ['2026-02', 0, 1],
    ])
  })

  it('un solo mes', () => {
    expect(partidosPorMes([V('2026-07-01')])).toHaveLength(1)
  })

  it('no depende del orden de entrada', () => {
    expect(partidosPorMes([D('2026-02-01'), V('2026-01-01')]).map((m) => m.mes)).toEqual(['2026-01', '2026-02'])
  })

  it('ignora partidos sin resultado si se pasan por error', () => {
    expect(partidosPorMes([suspendido('2026-01-01'), V('2026-02-01')]).map((m) => m.mes)).toEqual(['2026-02'])
  })
})

// ---------- evolucionPorcentaje ----------

describe('evolucionPorcentaje', () => {
  it('sin partidos devuelve vacío', () => {
    expect(evolucionPorcentaje([])).toEqual([])
  })

  it('porcentaje acumulado partido a partido', () => {
    const ps = [V('2026-01-01'), D('2026-01-02'), V('2026-01-03'), V('2026-01-04')]
    expect(evolucionPorcentaje(ps).map((p) => p.acumulado)).toEqual([100, 50, (2 / 3) * 100, 75])
  })

  it('numera y conserva id y fecha', () => {
    const a = V('2026-01-01')
    const b = D('2026-01-02')
    expect(evolucionPorcentaje([b, a]).map(({ numero, partidoId, fecha }) => ({ numero, partidoId, fecha }))).toEqual([
      { numero: 1, partidoId: a.id, fecha: '2026-01-01' },
      { numero: 2, partidoId: b.id, fecha: '2026-01-02' },
    ])
  })

  it('el móvil es null hasta tener 10 partidos', () => {
    const ps = Array.from({ length: 9 }, (_, i) => V(`2026-01-${String(i + 1).padStart(2, '0')}`))
    expect(evolucionPorcentaje(ps).every((p) => p.movil === null)).toBe(true)
  })

  it('móvil de los últimos 10', () => {
    // 10 victorias y después 3 derrotas
    const ps = [
      ...Array.from({ length: 10 }, (_, i) => V(`2026-01-${String(i + 1).padStart(2, '0')}`)),
      D('2026-02-01'),
      D('2026-02-02'),
      D('2026-02-03'),
    ]
    const e = evolucionPorcentaje(ps)
    expect(e.map((p) => p.movil)).toEqual([null, null, null, null, null, null, null, null, null, 100, 90, 80, 70])
    expect(e[12].acumulado).toBeCloseTo((10 / 13) * 100)
  })

  it('el móvil se recupera cuando las derrotas salen de la ventana', () => {
    const ps = [
      ...Array.from({ length: 10 }, (_, i) => D(`2026-01-${String(i + 1).padStart(2, '0')}`)),
      ...Array.from({ length: 10 }, (_, i) => V(`2026-02-${String(i + 1).padStart(2, '0')}`)),
    ]
    const e = evolucionPorcentaje(ps)
    expect(e[9].movil).toBe(0)
    expect(e[14].movil).toBe(50)
    expect(e[19].movil).toBe(100)
    expect(e[19].acumulado).toBe(50)
  })

  it('el mismo día se ordena por carga', () => {
    const v = V('2026-01-01')
    const d = D('2026-01-01')
    expect(evolucionPorcentaje([d, v]).map((p) => p.acumulado)).toEqual([100, 50])
  })

  it('retiros cuentan; suspendidos se ignoran si se pasan por error', () => {
    expect(evolucionPorcentaje([retiroRival('2026-01-01'), suspendido('2026-01-02'), retiroMio('2026-01-03')]).map((p) => p.acumulado)).toEqual([100, 50])
  })
})

// ---------- headToHead ----------

describe('headToHead', () => {
  it('rival sin partidos', () => {
    expect(headToHead([V('2026-01-01', { rivalId: 'otro' })], 'r1', sinWO)).toEqual({
      ganados: 0,
      perdidos: 0,
      porcentaje: null,
      racha: null,
      setsAFavor: 0,
      setsEnContra: 0,
      ultimo: null,
      partidos: [],
    })
  })

  it('sin partidos en absoluto', () => {
    expect(headToHead([], 'r1', sinWO).ultimo).toBeNull()
  })

  it('G-P, sets a favor y en contra, último resultado', () => {
    const a = partido('2026-01-01', { sets: [g(6, 4), g(3, 6), g(6, 2)] }) // V 2-1
    const b = partido('2026-02-01', { sets: [g(4, 6), g(6, 7)] }) // D 0-2
    const c = partido('2026-03-01', { sets: [{ gane: true }, { gane: true }] }) // V 2-0 sin games
    const otroRival = V('2026-04-01', { rivalId: 'r2' })
    const h = headToHead([c, otroRival, a, b], 'r1', sinWO)
    expect(h).toMatchObject({ ganados: 2, perdidos: 1, setsAFavor: 4, setsEnContra: 3 })
    expect(h.ultimo).toEqual({ partido: c, resultado: 'ganado' })
  })

  it('la lista incluye todos los partidos del rival (WO y suspendidos), más recientes primero', () => {
    const a = V('2026-01-01')
    const wo = woPerdido('2026-02-01')
    const s = suspendido('2026-03-01')
    const h = headToHead([a, s, wo], 'r1', sinWO)
    expect(ids(h.partidos)).toEqual(ids([s, wo, a]))
    expect(h).toMatchObject({ ganados: 1, perdidos: 0 })
    expect(h.ultimo?.partido.id).toBe(a.id)
  })

  it('los WO cuentan para G-P y último resultado solo con el ajuste', () => {
    const a = V('2026-01-01')
    const wo = woPerdido('2026-02-01')
    const h = headToHead([a, wo], 'r1', conWO)
    expect(h).toMatchObject({ ganados: 1, perdidos: 1, setsAFavor: 2, setsEnContra: 0 })
    expect(h.ultimo).toEqual({ partido: wo, resultado: 'perdido' })
  })

  it('los suspendidos no suman sets', () => {
    expect(headToHead([suspendido('2026-01-01', { sets: [g(6, 4), g(2, 3)] })], 'r1', conWO)).toMatchObject({
      setsAFavor: 0,
      setsEnContra: 0,
    })
  })

  it('en un retiro no suma el set que quedó a medias', () => {
    // 6-4 terminado, 1-2 a medias
    expect(headToHead([retiroRival('2026-01-01')], 'r1', sinWO)).toMatchObject({
      ganados: 1,
      perdidos: 0,
      setsAFavor: 1,
      setsEnContra: 0,
    })
  })

  it('retiro con todos los sets terminados los suma', () => {
    const p = partido('2026-01-01', { estado: 'retiro', retiroDe: 'yo', sets: [g(6, 3), g(4, 6)] })
    expect(headToHead([p], 'r1', sinWO)).toMatchObject({ ganados: 0, perdidos: 1, setsAFavor: 1, setsEnContra: 1 })
  })

  it('cuenta el super tie-break como set', () => {
    const p = partido('2026-01-01', { sets: [g(4, 6), g(6, 3), g(10, 8)] })
    expect(headToHead([p], 'r1', sinWO)).toMatchObject({ setsAFavor: 2, setsEnContra: 1 })
  })

  it('el último resultado respeta el orden del mismo día', () => {
    const primero = V('2026-05-01')
    const segundo = D('2026-05-01')
    expect(headToHead([segundo, primero], 'r1', sinWO).ultimo?.partido.id).toBe(segundo.id)
  })
})

describe('partidosPorMes con rango', () => {
  it('extiende el eje a los meses del rango aunque estén vacíos', () => {
    const r = partidosPorMes([V('2026-03-10')], { mesDesde: '2026-01', mesHasta: '2026-05' })
    expect(r.map((m) => [m.mes, m.ganados])).toEqual([
      ['2026-01', 0],
      ['2026-02', 0],
      ['2026-03', 1],
      ['2026-04', 0],
      ['2026-05', 0],
    ])
  })

  it('con rango y sin partidos devuelve los meses en cero', () => {
    expect(partidosPorMes([], { mesDesde: '2025-12', mesHasta: '2026-01' })).toEqual([
      { mes: '2025-12', titulo: 'Diciembre 2025', ganados: 0, perdidos: 0 },
      { mes: '2026-01', titulo: 'Enero 2026', ganados: 0, perdidos: 0 },
    ])
  })
})

describe('rankingRivales', () => {
  it('sin partidos', () => {
    expect(rankingRivales([])).toEqual([])
  })

  it('G-P y % por rival, ordenado por cantidad y después por %', () => {
    const ps = [
      V('2026-01-01', { rivalId: 'a' }),
      D('2026-01-02', { rivalId: 'a' }),
      V('2026-01-03', { rivalId: 'b' }),
      V('2026-01-04', { rivalId: 'b' }),
      D('2026-01-05', { rivalId: 'c' }),
      V('2026-01-06', { rivalId: 'd' }),
      retiroMio('2026-01-07', { rivalId: 'a' }),
    ]
    expect(rankingRivales(ps).map((f) => [f.rivalId, f.ganados, f.perdidos])).toEqual([
      ['a', 1, 2],
      ['b', 2, 0],
      ['d', 1, 0],
      ['c', 0, 1],
    ])
    expect(rankingRivales(ps)[0].porcentaje).toBeCloseTo(33.33, 1)
  })
})

describe('headToHead: % y racha', () => {
  it('porcentaje y racha contra el rival, sin mezclar otros rivales', () => {
    const ps = [
      D('2026-01-01'),
      V('2026-02-01'),
      V('2026-03-01'),
      D('2026-04-01', { rivalId: 'otro' }),
    ]
    const h = headToHead(ps, 'r1', sinWO)
    expect(h.porcentaje).toBeCloseTo((2 / 3) * 100)
    expect(h.racha).toEqual({ tipo: 'victorias', cantidad: 2 })
  })

  it('la racha contra el rival respeta el ajuste de WO', () => {
    const ps = [V('2026-01-01'), woPerdido('2026-02-01')]
    expect(headToHead(ps, 'r1', sinWO).racha).toEqual({ tipo: 'victorias', cantidad: 1 })
    expect(headToHead(ps, 'r1', conWO).racha).toEqual({ tipo: 'derrotas', cantidad: 1 })
  })
})
