// Datos de prueba para desarrollo. Reemplaza TODO el contenido de la base.
import { db, type Club, type EstadoPartido, type Partido, type Rival, type SetJugado, type Torneo } from './schema'

// PRNG con semilla para que los datos sean siempre los mismos
function mulberry32(semilla: number) {
  return () => {
    semilla = (semilla + 0x6d2b79f5) | 0
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

function haceDias(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export async function cargarDatosPrueba(): Promise<void> {
  const rnd = mulberry32(42)
  const azar = (n: number) => Math.floor(rnd() * n)

  const clubes: Club[] = [
    { id: crypto.randomUUID(), nombre: 'Club Atlético Ribera' },
    { id: crypto.randomUUID(), nombre: 'Tenis Club Los Álamos' },
  ]
  const [ribera, alamos] = clubes

  // probGanar: qué tan seguido le gano a cada rival
  const rivalesConNivel = [
    { nombre: 'Martín Gómez', probGanar: 0.75 },
    { nombre: 'Lucas Fernández', probGanar: 0.6 },
    { nombre: 'Diego Paredes', probGanar: 0.5 },
    { nombre: 'Santiago Ruiz', probGanar: 0.45 },
    { nombre: 'Tomás Herrera', probGanar: 0.3 },
    { nombre: 'Nicolás Vidal', probGanar: 0.65 },
  ].map((r, i) => ({
    ...r,
    rival: { id: crypto.randomUUID(), nombre: r.nombre, creadoEn: `${haceDias(370 - i)}T12:00:00.000Z` } as Rival,
  }))
  const rivales = rivalesConNivel.map((r) => r.rival)

  const torneos: Torneo[] = [
    { id: crypto.randomUUID(), nombre: 'Abierto de Otoño', fecha: haceDias(300), categoria: 'Primera', clubId: ribera.id, formato: 'eliminacion', rondaAlcanzada: 'campeon' },
    { id: crypto.randomUUID(), nombre: 'Liga de Invierno', fecha: haceDias(200), categoria: 'Primera', clubId: ribera.id, formato: 'liga', posicionLiga: 2 },
    { id: crypto.randomUUID(), nombre: 'Copa Primavera', fecha: haceDias(95), clubId: alamos.id, formato: 'eliminacion', rondaAlcanzada: 'semifinal' },
    { id: crypto.randomUUID(), nombre: 'Liga de Verano', fecha: haceDias(45), clubId: alamos.id, formato: 'liga', posicionLiga: 4 },
  ]
  const [otono, invierno, primavera, verano] = torneos

  function setConGames(gane: boolean): SetJugado {
    const r = rnd()
    let ganador = 6
    let perdedor = azar(5)
    let tb: { ganador: number; perdedor: number } | undefined
    if (r < 0.15) {
      ganador = 7
      perdedor = 6
      tb = { ganador: 7, perdedor: azar(6) }
    } else if (r < 0.3) {
      ganador = 7
      perdedor = 5
    }
    return gane
      ? { gane, misGames: ganador, susGames: perdedor, ...(tb && { tiebreak: { mios: tb.ganador, suyos: tb.perdedor } }) }
      : { gane, misGames: perdedor, susGames: ganador, ...(tb && { tiebreak: { mios: tb.perdedor, suyos: tb.ganador } }) }
  }

  function generarSets(gane: boolean): SetJugado[] {
    const orden = rnd() < 0.35 ? (rnd() < 0.5 ? [!gane, gane, gane] : [gane, !gane, gane]) : [gane, gane]
    const conGames = rnd() > 0.1 // algunos partidos sin games cargados
    return orden.map((g) => (conGames ? setConGames(g) : { gane: g }))
  }

  const partidos: Partido[] = []
  function agregar(p: {
    dias: number
    rival: (typeof rivalesConNivel)[number]
    clubId: string
    gane?: boolean
    estado?: EstadoPartido
    torneo?: Torneo
    ronda?: string
    sets?: SetJugado[]
    retiroDe?: 'yo' | 'rival'
    notas?: string
  }) {
    const estado = p.estado ?? 'completado'
    const gane = p.gane ?? rnd() < p.rival.probGanar
    const fecha = haceDias(p.dias)
    partidos.push({
      id: crypto.randomUUID(),
      fecha,
      rivalId: p.rival.rival.id,
      clubId: p.clubId,
      tipo: p.torneo ? 'torneo' : 'amistoso',
      ...(p.torneo && { torneoId: p.torneo.id, ronda: p.ronda }),
      estado,
      ...(p.retiroDe && { retiroDe: p.retiroDe }),
      sets: p.sets ?? (estado === 'completado' ? generarSets(gane) : []),
      ...(p.notas && { notas: p.notas }),
      creadoEn: `${fecha}T21:00:${pad(partidos.length % 60)}.000Z`,
    })
  }
  const rivalAlAzar = () => rivalesConNivel[azar(rivalesConNivel.length)]

  // Torneos (12 partidos)
  agregar({ dias: 300, rival: rivalesConNivel[1], clubId: ribera.id, torneo: otono, ronda: 'Cuartos', gane: true })
  agregar({ dias: 298, rival: rivalesConNivel[3], clubId: ribera.id, torneo: otono, ronda: 'Semifinal', gane: true, sets: [{ gane: false, misGames: 4, susGames: 6 }, { gane: true, misGames: 6, susGames: 3 }, { gane: true, misGames: 7, susGames: 6, tiebreak: { mios: 7, suyos: 5 } }] })
  agregar({ dias: 297, rival: rivalesConNivel[4], clubId: ribera.id, torneo: otono, ronda: 'Final', gane: true, notas: 'Primer título del año.' })

  agregar({ dias: 200, rival: rivalesConNivel[0], clubId: ribera.id, torneo: invierno, ronda: 'Fecha 1', gane: true })
  agregar({ dias: 186, rival: rivalesConNivel[5], clubId: ribera.id, torneo: invierno, ronda: 'Fecha 2', gane: true })
  agregar({ dias: 172, rival: rivalesConNivel[2], clubId: ribera.id, torneo: invierno, ronda: 'Fecha 3', estado: 'wo_ganado' })
  agregar({ dias: 158, rival: rivalesConNivel[4], clubId: ribera.id, torneo: invierno, ronda: 'Fecha 4', gane: false })

  agregar({ dias: 95, rival: rivalesConNivel[5], clubId: alamos.id, torneo: primavera, ronda: 'Cuartos', gane: true })
  agregar({ dias: 93, rival: rivalesConNivel[4], clubId: alamos.id, torneo: primavera, ronda: 'Semifinal', gane: false })

  agregar({ dias: 45, rival: rivalesConNivel[1], clubId: alamos.id, torneo: verano, ronda: 'Fecha 1', gane: true })
  agregar({ dias: 31, rival: rivalesConNivel[3], clubId: alamos.id, torneo: verano, ronda: 'Fecha 2', estado: 'wo_perdido' })
  agregar({ dias: 17, rival: rivalesConNivel[2], clubId: alamos.id, torneo: verano, ronda: 'Fecha 3', gane: false })

  // Casos especiales en amistosos
  agregar({ dias: 250, rival: rivalesConNivel[2], clubId: alamos.id, estado: 'suspendido', sets: [{ gane: true, misGames: 6, susGames: 4 }, { gane: false, misGames: 2, susGames: 3 }], notas: 'Suspendido por lluvia.' })
  agregar({ dias: 140, rival: rivalesConNivel[3], clubId: ribera.id, estado: 'retiro', retiroDe: 'rival', sets: [{ gane: false, misGames: 3, susGames: 6 }, { gane: true, misGames: 2, susGames: 1 }] })
  agregar({ dias: 60, rival: rivalesConNivel[0], clubId: alamos.id, estado: 'retiro', retiroDe: 'yo', sets: [{ gane: true, misGames: 6, susGames: 2 }], notas: 'Molestia en el hombro.' })

  // Amistosos repartidos en 12 meses (25 partidos)
  for (let i = 0; i < 25; i++) {
    agregar({ dias: 2 + azar(360), rival: rivalAlAzar(), clubId: rnd() < 0.6 ? ribera.id : alamos.id })
  }

  await db.transaction('rw', [db.rivales, db.clubes, db.torneos, db.partidos], async () => {
    await Promise.all([db.rivales.clear(), db.clubes.clear(), db.torneos.clear(), db.partidos.clear()])
    await db.clubes.bulkAdd(clubes)
    await db.rivales.bulkAdd(rivales)
    await db.torneos.bulkAdd(torneos)
    await db.partidos.bulkAdd(partidos)
  })
}
