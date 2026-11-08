import { describe, expect, it } from 'vitest'
import type { Partido, Torneo } from '../db/schema'
import { partidosACsv } from './csv'

const nombres = {
  rivales: new Map([
    ['r1', 'Martín Gómez'],
    ['r2', 'Juan "el Zurdo" Peña'],
  ]),
  clubes: new Map([['c1', 'Club Ribera; Sede Norte']]),
  torneos: new Map<string, Torneo>([['t1', { id: 't1', nombre: 'Abierto', fecha: '2026-03-01', clubId: 'c1', formato: 'eliminacion' }]]),
}

const base: Partido = {
  id: 'p1',
  fecha: '2026-03-02',
  rivalId: 'r1',
  clubId: 'c1',
  tipo: 'amistoso',
  estado: 'completado',
  sets: [{ gane: true }, { gane: true }],
  creadoEn: '2026-03-02T21:00:00.000Z',
}

const BOM = String.fromCharCode(0xfeff)
const lineas = (csv: string) => (csv.startsWith(BOM) ? csv.slice(1) : csv).trimEnd().split(/\r\n/)

describe('partidosACsv', () => {
  it('empieza con BOM y encabezado separado por ;', () => {
    const csv = partidosACsv([], nombres)
    // El BOM es un solo carácter invisible, no el texto "FEFF"
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv[1]).toBe('F')
    expect(lineas(csv)).toEqual(['Fecha;Rival;Club;Tipo;Torneo;Ronda;Estado;Resultado;Sets;Marcador;Notas'])
  })

  it('una fila por partido, fecha dd/mm/aaaa y marcador con guion medio', () => {
    const p: Partido = {
      ...base,
      tipo: 'torneo',
      torneoId: 't1',
      ronda: 'Final',
      sets: [
        { gane: true, misGames: 6, susGames: 4 },
        { gane: false, misGames: 6, susGames: 7, tiebreak: { mios: 5, suyos: 7 } },
        { gane: true, misGames: 6, susGames: 2 },
      ],
    }
    expect(lineas(partidosACsv([p], nombres))[1]).toBe(
      '02/03/2026;Martín Gómez;"Club Ribera; Sede Norte";Torneo;Abierto;Final;Completado;Victoria;2–1;6–4 6–7(5) 6–2;',
    )
  })

  it('sin games: solo los sets', () => {
    expect(lineas(partidosACsv([base], nombres))[1]).toBe(
      '02/03/2026;Martín Gómez;"Club Ribera; Sede Norte";Amistoso;;;Completado;Victoria;2–0;;',
    )
  })

  it('escapa comillas y saltos de línea', () => {
    const p: Partido = { ...base, rivalId: 'r2', notas: 'Viento fuerte\nterminamos de noche' }
    const csv = partidosACsv([p], nombres)
    expect(csv).toContain('"Juan ""el Zurdo"" Peña"')
    expect(csv).toContain('"Viento fuerte\nterminamos de noche"')
  })

  it('WO y suspendido', () => {
    const wo: Partido = { ...base, id: 'p2', estado: 'wo_perdido', sets: [] }
    const susp: Partido = { ...base, id: 'p3', fecha: '2026-03-03', estado: 'suspendido', sets: [{ gane: true, misGames: 3, susGames: 2 }] }
    const [, filaWo, filaSusp] = lineas(partidosACsv([susp, wo], nombres))
    expect(filaWo).toContain(';WO perdido;Derrota;;;')
    expect(filaSusp).toContain(';Suspendido;;1–0;3–2;')
  })

  it('ordena cronológicamente', () => {
    const tarde = { ...base, id: 'p2', fecha: '2026-05-01' }
    const filas = lineas(partidosACsv([tarde, base], nombres))
    expect(filas[1].startsWith('02/03/2026')).toBe(true)
    expect(filas[2].startsWith('01/05/2026')).toBe(true)
  })
})
