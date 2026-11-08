import { describe, expect, it } from 'vitest'
import { formatearFecha, hoyISO } from './fechas'

describe('formatearFecha', () => {
  it('convierte ISO a dd/mm/aaaa', () => {
    expect(formatearFecha('2026-03-07')).toBe('07/03/2026')
  })

  it('ignora la parte de hora', () => {
    expect(formatearFecha('2026-12-31T23:59:00.000Z')).toBe('31/12/2026')
  })
})

describe('hoyISO', () => {
  it('usa la fecha local', () => {
    expect(hoyISO(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })
})
