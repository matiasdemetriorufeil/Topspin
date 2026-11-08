import { describe, expect, it } from 'vitest'
import { etiquetaMesCorta, filtrarPorRango, leerPeriodo, opcionesPeriodo, rangoPeriodo } from './periodo'

describe('leerPeriodo', () => {
  it('acepta los valores conocidos', () => {
    for (const v of ['12m', 'actual', 'todo', '2025']) expect(leerPeriodo(v)).toBe(v)
  })

  it('cualquier otra cosa vuelve a 12m', () => {
    for (const v of [null, '', 'x', '25', '2025-01']) expect(leerPeriodo(v)).toBe('12m')
  })
})

describe('rangoPeriodo', () => {
  it('últimos 12 meses: mes actual y los 11 anteriores completos', () => {
    expect(rangoPeriodo('12m', '2026-11-01')).toEqual({
      desde: '2025-12-01',
      hasta: '2026-11-01',
      mesDesde: '2025-12',
      mesHasta: '2026-11',
    })
  })

  it('12 meses en diciembre y en enero', () => {
    expect(rangoPeriodo('12m', '2026-12-31').mesDesde).toBe('2026-01')
    expect(rangoPeriodo('12m', '2026-01-15').mesDesde).toBe('2025-02')
  })

  it('año actual hasta hoy', () => {
    expect(rangoPeriodo('actual', '2026-11-01')).toEqual({
      desde: '2026-01-01',
      hasta: '2026-11-01',
      mesDesde: '2026-01',
      mesHasta: '2026-11',
    })
  })

  it('año específico completo', () => {
    expect(rangoPeriodo('2024', '2026-11-01')).toEqual({
      desde: '2024-01-01',
      hasta: '2024-12-31',
      mesDesde: '2024-01',
      mesHasta: '2024-12',
    })
  })

  it('todo no tiene límites', () => {
    expect(rangoPeriodo('todo', '2026-11-01')).toEqual({})
  })
})

describe('filtrarPorRango', () => {
  const ps = [{ fecha: '2025-12-31' }, { fecha: '2026-01-01' }, { fecha: '2026-06-30' }, { fecha: '2026-07-01' }]

  it('incluye ambos extremos', () => {
    expect(filtrarPorRango(ps, { desde: '2026-01-01', hasta: '2026-06-30' })).toEqual([ps[1], ps[2]])
  })

  it('sin límites devuelve todo', () => {
    expect(filtrarPorRango(ps, {})).toEqual(ps)
  })
})

describe('opcionesPeriodo', () => {
  it('años anteriores con partidos entre "este año" y "todo"; no repite el año actual', () => {
    expect(opcionesPeriodo(['2024', '2026', '2025'], '2026-11-01').map((o) => o.valor)).toEqual([
      '12m',
      'actual',
      '2025',
      '2024',
      'todo',
    ])
  })

  it('sin partidos', () => {
    expect(opcionesPeriodo([], '2026-11-01').map((o) => o.etiqueta)).toEqual([
      'Últimos 12 meses',
      'Este año (2026)',
      'Todo',
    ])
  })
})

describe('etiquetaMesCorta', () => {
  it('mes abreviado, sin año', () => {
    expect(etiquetaMesCorta('2026-10')).toBe('oct')
    expect(etiquetaMesCorta('2026-01')).toBe('ene')
  })
})
