import { describe, expect, it } from 'vitest'
import { formatearDelta, formatearPorcentaje, formatearPuntaje, textoRacha } from './formato'

describe('formatearPorcentaje', () => {
  it('redondea al entero', () => {
    expect(formatearPorcentaje(66.666)).toBe('67%')
    expect(formatearPorcentaje(0)).toBe('0%')
    expect(formatearPorcentaje(100)).toBe('100%')
  })

  it('sin dato muestra una raya', () => {
    expect(formatearPorcentaje(null)).toBe('—')
  })
})

describe('textoRacha', () => {
  it('singular y plural de victorias y derrotas', () => {
    expect(textoRacha({ tipo: 'victorias', cantidad: 1 })).toEqual({ valor: '1', detalle: 'victoria' })
    expect(textoRacha({ tipo: 'victorias', cantidad: 3 })).toEqual({ valor: '3', detalle: 'victorias seguidas' })
    expect(textoRacha({ tipo: 'derrotas', cantidad: 1 })).toEqual({ valor: '1', detalle: 'derrota' })
    expect(textoRacha({ tipo: 'derrotas', cantidad: 2 })).toEqual({ valor: '2', detalle: 'derrotas seguidas' })
  })

  it('sin racha', () => {
    expect(textoRacha(null)).toEqual({ valor: '—', detalle: 'Sin partidos' })
  })
})

describe('formatearDelta', () => {
  it('redondea y agrega el signo', () => {
    expect(formatearDelta(14.4)).toBe('+14 pts')
    expect(formatearDelta(-8.6)).toBe('-9 pts')
    expect(formatearDelta(20)).toBe('+20 pts')
  })

  it('casi cero se muestra como 0, sin signo', () => {
    expect(formatearDelta(0.3)).toBe('0 pts')
    expect(formatearDelta(-0.3)).toBe('0 pts')
  })
})

describe('formatearPuntaje', () => {
  it('redondea al entero', () => {
    expect(formatearPuntaje(1537.7075)).toBe('1538')
    expect(formatearPuntaje(1500)).toBe('1500')
  })
})
