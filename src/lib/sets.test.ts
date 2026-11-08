import { describe, expect, it } from 'vitest'
import { esMarcadorTerminado, setTerminado } from './sets'

describe('esMarcadorTerminado', () => {
  const normal = { superTiebreak: false }

  it('acepta sets normales en cualquier orden', () => {
    for (const [a, b] of [[6, 0], [6, 4], [4, 6], [7, 5], [5, 7], [7, 6], [6, 7]]) {
      expect(esMarcadorTerminado(a, b, normal)).toBe(true)
    }
  })

  it('rechaza sets sin terminar o imposibles', () => {
    for (const [a, b] of [[6, 5], [5, 4], [3, 3], [7, 4], [8, 6], [0, 0]]) {
      expect(esMarcadorTerminado(a, b, normal)).toBe(false)
    }
  })

  it('super tie-break solo si se permite', () => {
    expect(esMarcadorTerminado(10, 8, normal)).toBe(false)
    expect(esMarcadorTerminado(10, 8, { superTiebreak: true })).toBe(true)
    expect(esMarcadorTerminado(10, 0, { superTiebreak: true })).toBe(true)
    expect(esMarcadorTerminado(12, 10, { superTiebreak: true })).toBe(true)
    expect(esMarcadorTerminado(10, 9, { superTiebreak: true })).toBe(false)
    expect(esMarcadorTerminado(12, 9, { superTiebreak: true })).toBe(false)
  })
})

describe('setTerminado', () => {
  it('sin games se asume terminado', () => {
    expect(setTerminado({ gane: true }, false)).toBe(true)
  })

  it('con games usa el marcador', () => {
    expect(setTerminado({ gane: true, misGames: 6, susGames: 3 }, false)).toBe(true)
    expect(setTerminado({ gane: true, misGames: 2, susGames: 1 }, true)).toBe(false)
  })

  it('super tie-break solo como último set', () => {
    expect(setTerminado({ gane: true, misGames: 10, susGames: 7 }, true)).toBe(true)
    expect(setTerminado({ gane: true, misGames: 10, susGames: 7 }, false)).toBe(false)
  })
})
