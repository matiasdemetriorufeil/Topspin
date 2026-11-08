import { describe, expect, it } from 'vitest'
import type { Partido } from '../db/schema'
import { avisoBackup, crearBackup, diasEntre, leerBackup, nombreArchivo, resumenDatos, type DatosBackup } from './backup'

const datos = (): DatosBackup => ({
  rivales: [{ id: 'r1', nombre: 'Martín Gómez', creadoEn: '2026-01-01T10:00:00.000Z' }],
  clubes: [{ id: 'c1', nombre: 'Club Ribera' }],
  torneos: [{ id: 't1', nombre: 'Abierto', fecha: '2026-03-01', clubId: 'c1', formato: 'eliminacion', rondaAlcanzada: 'campeon' }],
  partidos: [
    {
      id: 'p1',
      fecha: '2026-03-02',
      rivalId: 'r1',
      clubId: 'c1',
      tipo: 'torneo',
      torneoId: 't1',
      ronda: 'Final',
      estado: 'completado',
      sets: [{ gane: true, misGames: 7, susGames: 6, tiebreak: { mios: 7, suyos: 3 } }, { gane: true }],
      notas: 'Título',
      creadoEn: '2026-03-02T21:00:00.000Z',
    },
  ],
})

const ahora = new Date('2026-11-01T15:30:00.000Z')
const texto = (b: unknown) => JSON.stringify(b)

/** Backup válido con cambios en datos */
function conDatos(cambiar: (d: DatosBackup) => void) {
  const d = datos()
  cambiar(d)
  return texto(crearBackup(d, { incluirWO: false }, ahora))
}

describe('crearBackup', () => {
  it('incluye app, versión, fecha, ajustes y todas las tablas', () => {
    const b = crearBackup(datos(), { incluirWO: true }, ahora)
    expect(b).toEqual({
      app: 'mi-tenis',
      version: 1,
      exportadoEn: '2026-11-01T15:30:00.000Z',
      ajustes: { incluirWO: true },
      datos: datos(),
    })
  })
})

describe('leerBackup', () => {
  it('ida y vuelta: lo exportado se importa igual', () => {
    const b = crearBackup(datos(), { incluirWO: true }, ahora)
    expect(leerBackup(texto(b))).toEqual({ ok: true, backup: b })
  })

  it('backup vacío es válido', () => {
    const r = leerBackup(texto(crearBackup({ rivales: [], clubes: [], torneos: [], partidos: [] }, { incluirWO: false }, ahora)))
    expect(r.ok).toBe(true)
  })

  it('sin ajustes usa los valores por defecto', () => {
    const { ajustes: _ajustes, ...sinAjustes } = crearBackup(datos(), { incluirWO: true }, ahora)
    void _ajustes
    const r = leerBackup(texto(sinAjustes))
    expect(r.ok && r.backup.ajustes).toEqual({ incluirWO: false })
  })

  it('rechaza un archivo que no es JSON', () => {
    expect(leerBackup('hola')).toEqual({ ok: false, error: 'El archivo no es un JSON válido.' })
  })

  it('rechaza un JSON que no es de la app', () => {
    expect(leerBackup(texto({ app: 'otra', version: 1 }))).toEqual({ ok: false, error: 'No es un backup de Mi Tenis.' })
  })

  it('rechaza una versión más nueva', () => {
    const b = { ...crearBackup(datos(), { incluirWO: false }, ahora), version: 99 }
    const r = leerBackup(texto(b))
    expect(!r.ok && r.error).toMatch(/versión más nueva/)
  })

  it('indica dónde está el campo inválido', () => {
    const r = leerBackup(conDatos((d) => ((d.partidos[0] as { fecha: string }).fecha = '02/03/2026')))
    expect(r).toEqual({ ok: false, error: 'El archivo no es un backup válido (en partidos.0.fecha).' })
  })

  it('rechaza estados y sets inválidos', () => {
    expect(leerBackup(conDatos((d) => ((d.partidos[0] as { estado: string }).estado = 'ganado'))).ok).toBe(false)
    expect(leerBackup(conDatos((d) => (d.partidos[0].sets[0].misGames = 1.5))).ok).toBe(false)
    expect(
      leerBackup(conDatos((d) => (d.partidos[0].sets = Array.from({ length: 6 }, () => ({ gane: true }))))).ok,
    ).toBe(false)
  })

  describe('referencias entre tablas', () => {
    it('partido con rival inexistente', () => {
      const r = leerBackup(conDatos((d) => (d.partidos[0].rivalId = 'x')))
      expect(r).toEqual({ ok: false, error: 'El partido del 2026-03-02 apunta a un rival que no está en el backup.' })
    })

    it('partido con club o torneo inexistente', () => {
      expect(leerBackup(conDatos((d) => (d.partidos[0].clubId = 'x'))).ok).toBe(false)
      expect(leerBackup(conDatos((d) => (d.partidos[0].torneoId = 'x'))).ok).toBe(false)
    })

    it('partido de torneo sin torneo', () => {
      const r = leerBackup(conDatos((d) => delete (d.partidos[0] as Partial<Partido>).torneoId))
      expect(!r.ok && r.error).toMatch(/es de torneo pero no tiene torneo/)
    })

    it('torneo con club inexistente', () => {
      const r = leerBackup(conDatos((d) => (d.torneos[0].clubId = 'x')))
      expect(!r.ok && r.error).toMatch(/torneo «Abierto» apunta a un club/)
    })

    it('ids repetidos', () => {
      const r = leerBackup(conDatos((d) => d.rivales.push({ ...d.rivales[0], nombre: 'Otro' })))
      expect(r).toEqual({ ok: false, error: 'Hay rivales con el mismo id (r1).' })
    })
  })
})

describe('resumenDatos', () => {
  it('plurales y conjunción', () => {
    expect(resumenDatos({ partidos: { length: 120 }, rivales: { length: 15 }, clubes: { length: 2 }, torneos: { length: 4 } })).toBe(
      '120 partidos, 15 rivales, 2 clubes y 4 torneos',
    )
  })

  it('singulares', () => {
    expect(resumenDatos({ partidos: { length: 1 }, rivales: { length: 1 }, clubes: { length: 1 }, torneos: { length: 0 } })).toBe(
      '1 partido, 1 rival, 1 club y 0 torneos',
    )
  })
})

describe('nombreArchivo', () => {
  it('usa la fecha local', () => {
    expect(nombreArchivo('backup', new Date(2026, 10, 1, 23, 50), 'json')).toBe('mi-tenis-backup-2026-11-01.json')
    expect(nombreArchivo('partidos', new Date(2026, 0, 5), 'csv')).toBe('mi-tenis-partidos-2026-01-05.csv')
  })
})

describe('avisoBackup', () => {
  it('sin partidos no avisa', () => {
    expect(avisoBackup(undefined, false, ahora)).toBeNull()
  })

  it('con partidos y sin ningún backup', () => {
    expect(avisoBackup(undefined, true, ahora)).toEqual({ tipo: 'nunca' })
  })

  it('30 días o menos no avisa; más de 30 sí', () => {
    expect(avisoBackup('2026-10-02T15:30:00.000Z', true, ahora)).toBeNull() // 30 días
    expect(avisoBackup('2026-10-01T15:30:00.000Z', true, ahora)).toEqual({ tipo: 'viejo', dias: 31 })
  })

  it('diasEntre cuenta días completos', () => {
    expect(diasEntre(new Date('2026-11-01T00:00:00Z'), new Date('2026-11-01T23:59:00Z'))).toBe(0)
    expect(diasEntre(new Date('2026-10-01T12:00:00Z'), new Date('2026-11-01T12:00:00Z'))).toBe(31)
  })
})
