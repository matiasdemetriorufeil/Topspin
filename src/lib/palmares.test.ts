import { describe, expect, it } from 'vitest'
import type { Partido, Torneo } from '../db/schema'
import {
  aniosDeTorneos,
  contadoresPalmares,
  esTitulo,
  ordenarPorRonda,
  ordenarTorneosRecientes,
  ordenDeRonda,
} from './palmares'

let n = 0
const torneo = (extra: Partial<Torneo>): Torneo => ({
  id: `t${++n}`,
  nombre: `Torneo ${n}`,
  fecha: '2026-01-01',
  clubId: 'c1',
  formato: 'eliminacion',
  ...extra,
})

const partido = (ronda: string | undefined, fecha: string, extra: Partial<Partido> = {}): Partido => ({
  id: `p${++n}`,
  fecha,
  rivalId: 'r1',
  clubId: 'c1',
  tipo: 'torneo',
  torneoId: 't1',
  ...(ronda !== undefined ? { ronda } : {}),
  estado: 'completado',
  sets: [{ gane: true }],
  creadoEn: `2026-01-01T00:00:00.${String(n).padStart(3, '0')}Z`,
  ...extra,
})

describe('esTitulo', () => {
  it('campeón en eliminación', () => {
    expect(esTitulo({ formato: 'eliminacion', rondaAlcanzada: 'campeon' })).toBe(true)
    expect(esTitulo({ formato: 'eliminacion', rondaAlcanzada: 'final' })).toBe(false)
    expect(esTitulo({ formato: 'eliminacion' })).toBe(false)
  })

  it('1.° en liga', () => {
    expect(esTitulo({ formato: 'liga', posicionLiga: 1 })).toBe(true)
    expect(esTitulo({ formato: 'liga', posicionLiga: 2 })).toBe(false)
    expect(esTitulo({ formato: 'liga' })).toBe(false)
  })

  it('no confunde datos del otro formato', () => {
    expect(esTitulo({ formato: 'liga', rondaAlcanzada: 'campeon' })).toBe(false)
    expect(esTitulo({ formato: 'eliminacion', posicionLiga: 1 })).toBe(false)
  })
})

describe('contadoresPalmares', () => {
  it('sin torneos', () => {
    expect(contadoresPalmares([])).toEqual({ titulos: 0, finales: 0, semifinales: 0, podiosLiga: 0 })
  })

  it('finales y semifinales son acumulativas', () => {
    const ts = [
      torneo({ rondaAlcanzada: 'campeon' }),
      torneo({ rondaAlcanzada: 'final' }),
      torneo({ rondaAlcanzada: 'semifinal' }),
      torneo({ rondaAlcanzada: 'cuartos' }),
      torneo({}), // sin resultado cargado
    ]
    expect(contadoresPalmares(ts)).toEqual({ titulos: 1, finales: 2, semifinales: 3, podiosLiga: 0 })
  })

  it('ligas: el 1.° es título y podio; hasta el 3.° es podio', () => {
    const ts = [
      torneo({ formato: 'liga', posicionLiga: 1 }),
      torneo({ formato: 'liga', posicionLiga: 3 }),
      torneo({ formato: 'liga', posicionLiga: 4 }),
      torneo({ formato: 'liga' }),
    ]
    expect(contadoresPalmares(ts)).toEqual({ titulos: 1, finales: 0, semifinales: 0, podiosLiga: 2 })
  })
})

describe('ordenarTorneosRecientes y aniosDeTorneos', () => {
  it('más recientes primero, mismo día por nombre', () => {
    const a = torneo({ fecha: '2025-05-01', nombre: 'A' })
    const b = torneo({ fecha: '2026-03-01', nombre: 'Zeta' })
    const c = torneo({ fecha: '2026-03-01', nombre: 'Álamo' })
    expect(ordenarTorneosRecientes([a, b, c]).map((t) => t.nombre)).toEqual(['Álamo', 'Zeta', 'A'])
  })

  it('años únicos, más reciente primero', () => {
    expect(aniosDeTorneos([{ fecha: '2024-01-01' }, { fecha: '2026-01-01' }, { fecha: '2024-09-01' }])).toEqual(['2026', '2024'])
  })
})

describe('ordenDeRonda', () => {
  it('rondas de eliminación en orden, con variantes', () => {
    const rondas = ['Primera ronda', '16avos', 'Octavos de final', 'Cuartos', 'Semis', 'Final']
    expect(rondas.map(ordenDeRonda)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('ignora mayúsculas, tildes y espacios', () => {
    expect(ordenDeRonda('  SEMIFINAL ')).toBe(4)
    expect(ordenDeRonda('cuartos de final')).toBe(3)
  })

  it('fechas de liga por número', () => {
    expect(ordenDeRonda('Fecha 3')).toBe(3)
    expect(ordenDeRonda('fecha 12')).toBe(12)
  })

  it('desconocida o vacía es null', () => {
    expect(ordenDeRonda(undefined)).toBeNull()
    expect(ordenDeRonda('')).toBeNull()
    expect(ordenDeRonda('Repechaje')).toBeNull()
  })
})

describe('ordenarPorRonda', () => {
  it('eliminación: de primera ronda a final aunque la fecha diga otra cosa', () => {
    const final = partido('Final', '2026-01-05')
    const cuartos = partido('Cuartos', '2026-01-03')
    const semi = partido('Semifinal', '2026-01-03')
    expect(ordenarPorRonda([final, semi, cuartos]).map((p) => p.ronda)).toEqual(['Cuartos', 'Semifinal', 'Final'])
  })

  it('liga: por número de fecha, no alfabético', () => {
    const ps = [partido('Fecha 10', '2026-03-10'), partido('Fecha 2', '2026-01-02'), partido('Fecha 1', '2026-01-01')]
    expect(ordenarPorRonda(ps).map((p) => p.ronda)).toEqual(['Fecha 1', 'Fecha 2', 'Fecha 10'])
  })

  it('rondas desconocidas o vacías al final, por fecha y orden de carga', () => {
    const sinRonda = partido(undefined, '2026-01-01')
    const rara2 = partido('Repechaje', '2026-01-02')
    const rara1 = partido('Repechaje', '2026-01-02')
    const octavos = partido('Octavos', '2026-01-09')
    expect(ordenarPorRonda([rara1, octavos, rara2, sinRonda]).map((p) => p.id)).toEqual([
      octavos.id,
      sinRonda.id,
      rara2.id,
      rara1.id,
    ])
  })

  it('sin partidos', () => {
    expect(ordenarPorRonda([])).toEqual([])
  })
})
