import { describe, expect, it } from 'vitest'
import { etiquetaResultado, validarTorneo, valoresDesdeTorneo, type ValoresFormTorneo } from './torneo'

const base: ValoresFormTorneo = {
  nombre: '  Abierto de Otoño ',
  fecha: '2026-04-10',
  categoria: '',
  clubId: 'club-1',
  formato: 'eliminacion',
  rondaAlcanzada: '',
  posicionLiga: '',
}

describe('validarTorneo', () => {
  it('acepta un torneo mínimo y limpia el nombre', () => {
    expect(validarTorneo(base)).toEqual({
      ok: true,
      datos: { nombre: 'Abierto de Otoño', fecha: '2026-04-10', clubId: 'club-1', formato: 'eliminacion' },
    })
  })

  it('guarda la categoría solo si tiene texto', () => {
    const r = validarTorneo({ ...base, categoria: ' Primera ' })
    expect(r.ok && r.datos.categoria).toBe('Primera')
    const sin = validarTorneo({ ...base, categoria: '   ' })
    expect(sin.ok && 'categoria' in sin.datos).toBe(false)
  })

  it('exige nombre, fecha y club', () => {
    const r = validarTorneo({ ...base, nombre: ' ', fecha: '', clubId: '' })
    expect(r).toEqual({
      ok: false,
      errores: { nombre: 'Poné un nombre.', fecha: 'Elegí una fecha válida.', clubId: 'Elegí un club.' },
    })
  })

  it('en eliminación guarda la ronda y descarta la posición', () => {
    const r = validarTorneo({ ...base, rondaAlcanzada: 'semifinal', posicionLiga: '3' })
    expect(r.ok && r.datos).toMatchObject({ rondaAlcanzada: 'semifinal' })
    expect(r.ok && 'posicionLiga' in r.datos).toBe(false)
  })

  it('en liga guarda la posición como número y descarta la ronda', () => {
    const r = validarTorneo({ ...base, formato: 'liga', rondaAlcanzada: 'campeon', posicionLiga: '2' })
    expect(r.ok && r.datos).toMatchObject({ posicionLiga: 2 })
    expect(r.ok && 'rondaAlcanzada' in r.datos).toBe(false)
  })

  it('rechaza posiciones inválidas', () => {
    for (const posicionLiga of ['0', '-1', '2.5', 'abc']) {
      const r = validarTorneo({ ...base, formato: 'liga', posicionLiga })
      expect(r.ok).toBe(false)
      expect(!r.ok && r.errores.posicionLiga).toBeTruthy()
    }
  })

  it('rechaza una ronda desconocida', () => {
    const r = validarTorneo({ ...base, rondaAlcanzada: 'mundial' })
    expect(!r.ok && r.errores.rondaAlcanzada).toBe('Elegí una ronda válida.')
  })

  it('ida y vuelta con valoresDesdeTorneo', () => {
    const torneo = { id: 't1', nombre: 'Liga', fecha: '2026-01-01', clubId: 'c', formato: 'liga' as const, posicionLiga: 4 }
    const r = validarTorneo(valoresDesdeTorneo(torneo))
    expect(r.ok && { id: 't1', ...r.datos }).toEqual(torneo)
  })
})

describe('etiquetaResultado', () => {
  it('muestra la ronda en eliminación', () => {
    expect(etiquetaResultado({ formato: 'eliminacion', rondaAlcanzada: 'campeon' })).toBe('Campeón')
  })

  it('muestra la posición en liga', () => {
    expect(etiquetaResultado({ formato: 'liga', posicionLiga: 2 })).toBe('2° en liga')
  })

  it('devuelve null sin resultado', () => {
    expect(etiquetaResultado({ formato: 'eliminacion' })).toBeNull()
    expect(etiquetaResultado({ formato: 'liga' })).toBeNull()
  })
})
