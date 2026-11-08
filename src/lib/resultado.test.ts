import { describe, expect, it } from 'vitest'
import type { SetJugado } from '../db/schema'
import { detalleSets, resultadoPartido, textoResultado } from './resultado'

const G: SetJugado = { gane: true, misGames: 6, susGames: 3 }
const P: SetJugado = { gane: false, misGames: 4, susGames: 6 }

describe('resultadoPartido', () => {
  describe('completado', () => {
    it('gana en dos sets', () => {
      expect(resultadoPartido({ estado: 'completado', sets: [G, G] })).toBe('ganado')
    })

    it('pierde en dos sets', () => {
      expect(resultadoPartido({ estado: 'completado', sets: [P, P] })).toBe('perdido')
    })

    it('gana en tres sets tras perder el primero', () => {
      expect(resultadoPartido({ estado: 'completado', sets: [P, G, G] })).toBe('ganado')
    })

    it('pierde en tres sets tras ganar el primero', () => {
      expect(resultadoPartido({ estado: 'completado', sets: [G, P, P] })).toBe('perdido')
    })

    it('funciona con sets sin games cargados', () => {
      expect(resultadoPartido({ estado: 'completado', sets: [{ gane: true }, { gane: true }] })).toBe(
        'ganado',
      )
    })

    it('sin sets no tiene resultado', () => {
      expect(resultadoPartido({ estado: 'completado', sets: [] })).toBeNull()
    })

    it('con sets empatados no tiene resultado', () => {
      expect(resultadoPartido({ estado: 'completado', sets: [G, P] })).toBeNull()
    })
  })

  describe('walkover', () => {
    it('wo_ganado es victoria', () => {
      expect(resultadoPartido({ estado: 'wo_ganado', sets: [] })).toBe('ganado')
    })

    it('wo_perdido es derrota', () => {
      expect(resultadoPartido({ estado: 'wo_perdido', sets: [] })).toBe('perdido')
    })
  })

  describe('retiro', () => {
    it('gano si se retira el rival, aunque fuera perdiendo', () => {
      expect(resultadoPartido({ estado: 'retiro', retiroDe: 'rival', sets: [P] })).toBe('ganado')
    })

    it('pierdo si me retiro yo, aunque fuera ganando', () => {
      expect(resultadoPartido({ estado: 'retiro', retiroDe: 'yo', sets: [G] })).toBe('perdido')
    })

    it('sin retiroDe no tiene resultado', () => {
      expect(resultadoPartido({ estado: 'retiro', sets: [G] })).toBeNull()
    })
  })

  describe('suspendido', () => {
    it('no tiene resultado aunque haya sets jugados', () => {
      expect(resultadoPartido({ estado: 'suspendido', sets: [G] })).toBeNull()
    })
  })
})

describe('textoResultado', () => {
  it('completado', () => {
    expect(textoResultado({ estado: 'completado', sets: [P, G, G] })).toBe('Victoria 2-1')
    expect(textoResultado({ estado: 'completado', sets: [P, P] })).toBe('Derrota 0-2')
    expect(textoResultado({ estado: 'completado', sets: [] })).toBe('Sin resultado')
  })

  it('walkover', () => {
    expect(textoResultado({ estado: 'wo_ganado', sets: [] })).toBe('Victoria por WO')
    expect(textoResultado({ estado: 'wo_perdido', sets: [] })).toBe('Derrota por WO')
  })

  it('retiro', () => {
    expect(textoResultado({ estado: 'retiro', retiroDe: 'rival', sets: [G] })).toBe('Victoria por retiro (1-0)')
    expect(textoResultado({ estado: 'retiro', retiroDe: 'yo', sets: [] })).toBe('Derrota por retiro')
    expect(textoResultado({ estado: 'retiro', sets: [] })).toBe('Retiro')
  })

  it('suspendido', () => {
    expect(textoResultado({ estado: 'suspendido', sets: [G, P] })).toBe('Suspendido (1-1)')
    expect(textoResultado({ estado: 'suspendido', sets: [] })).toBe('Suspendido')
  })
})

describe('detalleSets', () => {
  it('muestra games y tie-break con los puntos del perdedor', () => {
    expect(
      detalleSets([
        { gane: true, misGames: 6, susGames: 4 },
        { gane: false, misGames: 6, susGames: 7, tiebreak: { mios: 5, suyos: 7 } },
        { gane: true, misGames: 7, susGames: 6, tiebreak: { mios: 9, suyos: 7 } },
      ]),
    ).toBe('6-4 6-7(5) 7-6(7)')
  })

  it('usa G/P para sets sin games', () => {
    expect(detalleSets([{ gane: true }, { gane: false }])).toBe('G P')
  })
})
