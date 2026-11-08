import { describe, expect, it } from 'vitest'
import type { Partido } from '../db/schema'
import {
  agruparPorMes,
  aniosConPartidos,
  contarFiltrosActivos,
  etiquetaEstado,
  FILTROS_VACIOS,
  filtrarPartidos,
  filtrosDesdeParams,
  marcadorPartido,
  ordenarRecientes,
  paramsDesdeFiltros,
  tituloMes,
} from './historial'

let n = 0
function partido(extra: Partial<Partido>): Partido {
  n++
  return {
    id: `p${n}`,
    fecha: '2026-10-01',
    rivalId: 'r1',
    clubId: 'c1',
    tipo: 'amistoso',
    estado: 'completado',
    sets: [{ gane: true }, { gane: true }],
    creadoEn: `2026-10-01T10:00:${String(n).padStart(2, '0')}.000Z`,
    ...extra,
  }
}

describe('tituloMes', () => {
  it('formatea mes y año en español', () => {
    expect(tituloMes('2026-10')).toBe('Octubre 2026')
    expect(tituloMes('2025-01')).toBe('Enero 2025')
  })
})

describe('ordenarRecientes y agruparPorMes', () => {
  it('ordena por fecha descendente y, el mismo día, por orden de carga', () => {
    const a = partido({ fecha: '2026-09-15', creadoEn: '2026-09-15T10:00:00Z' })
    const b = partido({ fecha: '2026-10-02', creadoEn: '2026-10-02T10:00:00Z' })
    const c = partido({ fecha: '2026-09-15', creadoEn: '2026-09-15T12:00:00Z' })
    expect(ordenarRecientes([a, b, c]).map((p) => p.id)).toEqual([b.id, c.id, a.id])
  })

  it('agrupa por mes con título', () => {
    const ps = ordenarRecientes([
      partido({ fecha: '2026-10-02' }),
      partido({ fecha: '2026-09-15' }),
      partido({ fecha: '2026-10-20' }),
      partido({ fecha: '2025-12-31' }),
    ])
    expect(agruparPorMes(ps).map((g) => [g.titulo, g.partidos.length])).toEqual([
      ['Octubre 2026', 2],
      ['Septiembre 2026', 1],
      ['Diciembre 2025', 1],
    ])
  })

  it('sin partidos no hay grupos', () => {
    expect(agruparPorMes([])).toEqual([])
  })
})

describe('marcadorPartido', () => {
  it('con games muestra el detalle', () => {
    expect(
      marcadorPartido({
        sets: [
          { gane: true, misGames: 6, susGames: 4 },
          { gane: false, misGames: 3, susGames: 6 },
          { gane: true, misGames: 7, susGames: 6, tiebreak: { mios: 7, suyos: 5 } },
        ],
      }),
    ).toBe('6-4 3-6 7-6(5)')
  })

  it('sin games muestra sets', () => {
    expect(marcadorPartido({ sets: [{ gane: true }, { gane: false }, { gane: true }] })).toBe('2-1 en sets')
  })

  it('sin sets queda vacío', () => {
    expect(marcadorPartido({ sets: [] })).toBe('')
  })
})

describe('etiquetaEstado', () => {
  it('etiqueta los estados especiales', () => {
    expect(etiquetaEstado({ estado: 'completado' })).toBeNull()
    expect(etiquetaEstado({ estado: 'wo_ganado' })).toBe('WO')
    expect(etiquetaEstado({ estado: 'wo_perdido' })).toBe('WO')
    expect(etiquetaEstado({ estado: 'suspendido' })).toBe('Suspendido')
    expect(etiquetaEstado({ estado: 'retiro', retiroDe: 'yo' })).toBe('Me retiré')
    expect(etiquetaEstado({ estado: 'retiro', retiroDe: 'rival' })).toBe('Retiro del rival')
  })
})

describe('filtrarPartidos', () => {
  const nombres: Record<string, string> = { r1: 'Martín Gómez', r2: 'Diego Paredes' }
  const nombre = (id: string) => nombres[id]
  const ganado = partido({ rivalId: 'r1', fecha: '2026-03-01' })
  const perdido = partido({ rivalId: 'r2', sets: [{ gane: false }], tipo: 'torneo', torneoId: 't1', fecha: '2025-06-01' })
  const suspendido = partido({ rivalId: 'r1', estado: 'suspendido', sets: [] })
  const wo = partido({ rivalId: 'r2', estado: 'wo_ganado', sets: [] })
  const todos = [ganado, perdido, suspendido, wo]
  const ids = (f: Partial<typeof FILTROS_VACIOS>) =>
    filtrarPartidos(todos, { ...FILTROS_VACIOS, ...f }, nombre).map((p) => p.id)

  it('sin filtros devuelve todo', () => {
    expect(ids({})).toHaveLength(4)
  })

  it('por rival, tipo, torneo y año', () => {
    expect(ids({ rivalId: 'r1' })).toEqual([ganado.id, suspendido.id])
    expect(ids({ tipo: 'torneo' })).toEqual([perdido.id])
    expect(ids({ torneoId: 't1' })).toEqual([perdido.id])
    expect(ids({ anio: '2025' })).toEqual([perdido.id])
  })

  it('por resultado (WO ganado cuenta como victoria)', () => {
    expect(ids({ resultado: 'ganado' })).toEqual([ganado.id, wo.id])
    expect(ids({ resultado: 'perdido' })).toEqual([perdido.id])
    expect(ids({ resultado: 'sin_resultado' })).toEqual([suspendido.id])
  })

  it('búsqueda por nombre de rival sin tildes ni mayúsculas', () => {
    expect(ids({ busqueda: 'MARTIN' })).toEqual([ganado.id, suspendido.id])
    expect(ids({ busqueda: 'pare' })).toEqual([perdido.id, wo.id])
  })

  it('combina filtros', () => {
    expect(ids({ rivalId: 'r1', resultado: 'ganado' })).toEqual([ganado.id])
  })
})

describe('contarFiltrosActivos', () => {
  it('no cuenta la búsqueda', () => {
    expect(contarFiltrosActivos({ ...FILTROS_VACIOS, busqueda: 'x', tipo: 'torneo', anio: '2026' })).toBe(2)
  })
})

describe('aniosConPartidos', () => {
  it('devuelve años únicos, más reciente primero', () => {
    expect(aniosConPartidos([{ fecha: '2025-01-01' }, { fecha: '2026-05-01' }, { fecha: '2025-12-01' }])).toEqual(['2026', '2025'])
  })
})

describe('filtros en la URL', () => {
  it('ida y vuelta', () => {
    const f = { ...FILTROS_VACIOS, busqueda: 'mar', rivalId: 'r1', tipo: 'torneo' as const, resultado: 'perdido' as const, anio: '2026' }
    expect(filtrosDesdeParams(paramsDesdeFiltros(f))).toEqual(f)
  })

  it('omite los vacíos', () => {
    expect(paramsDesdeFiltros({ ...FILTROS_VACIOS, anio: '2026' }).toString()).toBe('anio=2026')
  })

  it('ignora valores inválidos', () => {
    expect(filtrosDesdeParams(new URLSearchParams('tipo=x&resultado=y&anio=20'))).toEqual(FILTROS_VACIOS)
  })
})
