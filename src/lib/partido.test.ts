import { describe, expect, it } from 'vitest'
import type { Partido } from '../db/schema'
import {
  ganeDelSet,
  problemaSet,
  setVacio,
  validarPartido,
  valoresDesdePartido,
  vistaPrevia,
  type ValoresFormPartido,
  type ValoresSet,
} from './partido'

const set = (mis: string, sus: string, extra: Partial<ValoresSet> = {}): ValoresSet => ({
  ...setVacio(),
  misGames: mis,
  susGames: sus,
  ...extra,
})
const sinGames = (gane: boolean): ValoresSet => ({ ...setVacio(), gane })

const base: ValoresFormPartido = {
  fecha: '2026-10-20',
  rivalId: 'r1',
  clubId: 'c1',
  tipo: 'amistoso',
  torneoId: '',
  ronda: '',
  estado: 'completado',
  retiroDe: '',
  sets: [set('6', '4'), set('6', '3')],
  notas: '',
}

const terminado = { terminado: true, ultimo: false }

describe('ganeDelSet', () => {
  it('infiere el ganador por los games, por encima del toggle', () => {
    expect(ganeDelSet(set('6', '4', { gane: false }))).toBe(true)
    expect(ganeDelSet(set('3', '6', { gane: true }))).toBe(false)
  })

  it('usa el toggle si no hay games o están iguales', () => {
    expect(ganeDelSet(sinGames(true))).toBe(true)
    expect(ganeDelSet(set('3', '3', { gane: false }))).toBe(false)
    expect(ganeDelSet(setVacio())).toBeNull()
  })
})

describe('problemaSet', () => {
  it('acepta sets terminados normales', () => {
    for (const [a, b] of [['6', '0'], ['6', '4'], ['4', '6'], ['7', '5'], ['6', '7']]) {
      expect(problemaSet(set(a, b), terminado)).toBeNull()
    }
  })

  it('acepta un set sin games si se marcó el ganador', () => {
    expect(problemaSet(sinGames(false), terminado)).toBeNull()
  })

  it('pide marcar el ganador si no hay games', () => {
    expect(problemaSet(setVacio(), terminado)).toBe('Marcá si ganaste o perdiste el set.')
  })

  it('rechaza resultados de set imposibles', () => {
    for (const [a, b] of [['6', '5'], ['7', '3'], ['8', '6'], ['5', '3']]) {
      expect(problemaSet(set(a, b), terminado)).toMatch(/no es el resultado de un set terminado/)
    }
  })

  it('pide los dos games', () => {
    expect(problemaSet(set('6', ''), terminado)).toBe('Completá los games de los dos.')
  })

  it('rechaza games no numéricos', () => {
    expect(problemaSet(set('seis', '4'), terminado)).toBe('Los games tienen que ser números.')
  })

  it('acepta super tie-break solo como último set', () => {
    expect(problemaSet(set('10', '8'), { terminado: true, ultimo: true })).toBeNull()
    expect(problemaSet(set('12', '10'), { terminado: true, ultimo: true })).toBeNull()
    expect(problemaSet(set('12', '8'), { terminado: true, ultimo: true })).not.toBeNull()
    expect(problemaSet(set('10', '8'), terminado)).not.toBeNull()
  })

  it('un set sin terminar acepta resultados parciales pero no imposibles', () => {
    const aMedias = { terminado: false, ultimo: true }
    expect(problemaSet(set('3', '2'), aMedias)).toBeNull()
    expect(problemaSet(set('6', '5'), aMedias)).toBeNull()
    expect(problemaSet(set('8', '2'), aMedias)).toBe('8-2 no es un resultado posible.')
    expect(problemaSet(set('3', '3'), aMedias)).toBe('Marcá si ganaste o perdiste el set.')
    expect(problemaSet(set('3', '3', { gane: true }), aMedias)).toBeNull()
  })

  describe('tie-break', () => {
    it('acepta tie-breaks válidos', () => {
      expect(problemaSet(set('7', '6', { tbMios: '7', tbSuyos: '5' }), terminado)).toBeNull()
      expect(problemaSet(set('6', '7', { tbMios: '10', tbSuyos: '12' }), terminado)).toBeNull()
    })

    it('rechaza tie-breaks imposibles', () => {
      expect(problemaSet(set('7', '6', { tbMios: '7', tbSuyos: '6' }), terminado)).toBe('El tie-break 7-6 no es válido.')
      expect(problemaSet(set('7', '6', { tbMios: '11', tbSuyos: '5' }), terminado)).toBe('El tie-break 11-5 no es válido.')
    })

    it('el ganador del tie-break tiene que ser el del set', () => {
      expect(problemaSet(set('7', '6', { tbMios: '3', tbSuyos: '7' }), terminado)).toBe(
        'El tie-break lo tiene que ganar quien ganó el set.',
      )
    })

    it('pide los dos puntajes', () => {
      expect(problemaSet(set('7', '6', { tbMios: '7' }), terminado)).toBe('Completá el tie-break de los dos.')
    })

    it('ignora el tie-break si el set no es 7-6', () => {
      expect(problemaSet(set('6', '4', { tbMios: '1', tbSuyos: '1' }), terminado)).toBeNull()
    })
  })
})

describe('validarPartido', () => {
  it('convierte un partido completado válido', () => {
    expect(validarPartido({ ...base, notas: '  Buen partido ' })).toEqual({
      ok: true,
      datos: {
        fecha: '2026-10-20',
        rivalId: 'r1',
        clubId: 'c1',
        tipo: 'amistoso',
        estado: 'completado',
        sets: [
          { gane: true, misGames: 6, susGames: 4 },
          { gane: true, misGames: 6, susGames: 3 },
        ],
        notas: 'Buen partido',
      },
    })
  })

  it('guarda el tie-break solo en sets 7-6', () => {
    const r = validarPartido({ ...base, sets: [set('6', '4', { tbMios: '7', tbSuyos: '2' }), set('7', '6', { tbMios: '8', tbSuyos: '6' })] })
    expect(r.ok && r.datos.sets).toEqual([
      { gane: true, misGames: 6, susGames: 4 },
      { gane: true, misGames: 7, susGames: 6, tiebreak: { mios: 8, suyos: 6 } },
    ])
  })

  it('exige rival, club y fecha', () => {
    const r = validarPartido({ ...base, rivalId: '', clubId: '', fecha: '' })
    expect(!r.ok && r.errores).toMatchObject({ rivalId: 'Elegí el rival.', clubId: 'Elegí el club.', fecha: 'Elegí una fecha válida.' })
  })

  it('completado requiere al menos un set', () => {
    const r = validarPartido({ ...base, sets: [] })
    expect(!r.ok && r.errores.sets).toBe('Cargá al menos un set.')
  })

  it('completado requiere un ganador claro', () => {
    const r = validarPartido({ ...base, sets: [set('6', '4'), set('4', '6')] })
    expect(!r.ok && r.errores.sets).toBe('Los sets quedaron empatados: falta definir un ganador.')
  })

  it('el último set lo gana el ganador del partido', () => {
    const r = validarPartido({ ...base, sets: [set('6', '4'), set('6', '3'), set('2', '6')] })
    expect(!r.ok && r.errores.sets).toBe('El último set lo tiene que ganar quien ganó el partido.')
  })

  it('acepta remontada con super tie-break', () => {
    const r = validarPartido({ ...base, sets: [set('4', '6'), set('6', '3'), set('10', '7')] })
    expect(r.ok).toBe(true)
  })

  it('marca el error en el set correspondiente', () => {
    const r = validarPartido({ ...base, sets: [set('6', '4'), set('6', '5')] })
    expect(!r.ok && r.errores['sets.1']).toBe('6-5 no es el resultado de un set terminado.')
  })

  it('torneo requiere torneo; amistoso descarta torneo y ronda', () => {
    const sinTorneo = validarPartido({ ...base, tipo: 'torneo', ronda: 'Final' })
    expect(!sinTorneo.ok && sinTorneo.errores.torneoId).toBe('Elegí el torneo.')

    const conTorneo = validarPartido({ ...base, tipo: 'torneo', torneoId: 't1', ronda: ' Final ' })
    expect(conTorneo.ok && conTorneo.datos).toMatchObject({ torneoId: 't1', ronda: 'Final' })

    const amistoso = validarPartido({ ...base, torneoId: 't1', ronda: 'Final' })
    expect(amistoso.ok && ('torneoId' in amistoso.datos || 'ronda' in amistoso.datos)).toBe(false)
  })

  it('WO ignora los sets cargados', () => {
    const r = validarPartido({ ...base, estado: 'wo_ganado', sets: [setVacio()] })
    expect(r.ok && r.datos.sets).toEqual([])
  })

  it('retiro requiere quién se retiró y permite el último set a medias', () => {
    const sinQuien = validarPartido({ ...base, estado: 'retiro', sets: [set('6', '4'), set('2', '1')] })
    expect(!sinQuien.ok && sinQuien.errores.retiroDe).toBe('Indicá quién se retiró.')

    const ok = validarPartido({ ...base, estado: 'retiro', retiroDe: 'rival', sets: [set('6', '4'), set('2', '1')] })
    expect(ok.ok && ok.datos).toMatchObject({ retiroDe: 'rival' })
  })

  it('retiro: los sets anteriores al último tienen que estar terminados', () => {
    const r = validarPartido({ ...base, estado: 'retiro', retiroDe: 'yo', sets: [set('5', '4'), set('2', '1')] })
    expect(!r.ok && r.errores['sets.0']).toMatch(/set terminado/)
  })

  it('suspendido permite cero sets', () => {
    expect(validarPartido({ ...base, estado: 'suspendido', sets: [] }).ok).toBe(true)
  })

  it('descarta retiroDe si el estado no es retiro', () => {
    const r = validarPartido({ ...base, retiroDe: 'yo' })
    expect(r.ok && 'retiroDe' in r.datos).toBe(false)
  })
})

describe('valoresDesdePartido', () => {
  it('ida y vuelta conserva los datos', () => {
    const partido: Partido = {
      id: 'p1',
      fecha: '2026-10-01',
      rivalId: 'r1',
      clubId: 'c1',
      tipo: 'torneo',
      torneoId: 't1',
      ronda: 'Semifinal',
      estado: 'completado',
      sets: [
        { gane: false, misGames: 6, susGames: 7, tiebreak: { mios: 4, suyos: 7 } },
        { gane: true },
        { gane: true, misGames: 10, susGames: 8 },
      ],
      notas: 'Remontada',
      creadoEn: '2026-10-01T21:00:00.000Z',
    }
    const r = validarPartido(valoresDesdePartido(partido))
    const { id, creadoEn, ...resto } = partido
    expect(id && creadoEn && r.ok && r.datos).toEqual(resto)
  })
})

describe('vistaPrevia', () => {
  it('muestra el resultado con los sets que ya están definidos', () => {
    expect(vistaPrevia({ ...base, sets: [set('6', '4'), setVacio()] })).toEqual({ resultado: 'ganado', texto: 'Victoria 1-0' })
    expect(vistaPrevia({ ...base, sets: [set('4', '6'), set('6', '2'), set('6', '1')] }).texto).toBe('Victoria 2-1')
  })

  it('WO y retiro', () => {
    expect(vistaPrevia({ ...base, estado: 'wo_perdido' })).toEqual({ resultado: 'perdido', texto: 'Derrota por WO' })
    expect(vistaPrevia({ ...base, estado: 'retiro', retiroDe: 'rival', sets: [set('2', '6')] }).texto).toBe(
      'Victoria por retiro (0-1)',
    )
  })
})
