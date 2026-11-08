/**
 * Estadísticas según la tabla "Reglas de estadísticas y ranking" de PLAN.md.
 *
 * Salvo partidosQueCuentan y headToHead, las funciones reciben los partidos
 * que cuentan (la salida de partidosQueCuentan). Las que dependen del orden
 * lo resuelven solas, así que el orden de entrada no importa.
 */
import type { ID, Partido } from '../db/schema'
import { tituloMes } from './historial'
import { resultadoPartido } from './resultado'
import { setTerminado, tieneGames } from './sets'

export interface OpcionesEstadisticas {
  /** Ajuste para que los walkovers cuenten (por defecto quedan afuera) */
  incluirWO: boolean
}

/** Orden cronológico: por fecha y, el mismo día, por orden de carga (creadoEn). */
export function ordenarCronologico(partidos: Partido[]): Partido[] {
  return [...partidos].sort((a, b) =>
    a.fecha === b.fecha ? a.creadoEn.localeCompare(b.creadoEn) : a.fecha.localeCompare(b.fecha),
  )
}

/**
 * Completados y retiros (y WO si `incluirWO`); suspendidos nunca.
 * Además se descartan los que no tienen un resultado definido (ej. un retiro
 * sin `retiroDe`), porque no se pueden contar como victoria ni derrota.
 * Devuelve en orden cronológico.
 */
export function partidosQueCuentan(partidos: Partido[], { incluirWO }: OpcionesEstadisticas): Partido[] {
  return ordenarCronologico(
    partidos.filter((p) => {
      const estadoCuenta =
        p.estado === 'completado' ||
        p.estado === 'retiro' ||
        (incluirWO && (p.estado === 'wo_ganado' || p.estado === 'wo_perdido'))
      return estadoCuenta && resultadoPartido(p) !== null
    }),
  )
}

export interface ResumenVictorias {
  ganados: number
  perdidos: number
  total: number
  /** 0 a 100; null si no hay partidos */
  porcentaje: number | null
}

function resumen(ganados: number, perdidos: number): ResumenVictorias {
  const total = ganados + perdidos
  return { ganados, perdidos, total, porcentaje: total === 0 ? null : (ganados / total) * 100 }
}

/** Ganados / partidos que cuentan. `periodo` filtra por fecha (yyyy-mm-dd, ambos extremos incluidos). */
export function porcentajeVictorias(
  cuentan: Partido[],
  periodo: { desde?: string; hasta?: string } = {},
): ResumenVictorias {
  let ganados = 0
  let perdidos = 0
  for (const p of cuentan) {
    if (periodo.desde && p.fecha < periodo.desde) continue
    if (periodo.hasta && p.fecha > periodo.hasta) continue
    const r = resultadoPartido(p)
    if (r === 'ganado') ganados++
    else if (r === 'perdido') perdidos++
  }
  return resumen(ganados, perdidos)
}

export type Racha = { tipo: 'victorias' | 'derrotas'; cantidad: number }

/** Victorias (o derrotas) consecutivas desde el partido más reciente. null si no hay partidos. */
export function rachaActual(cuentan: Partido[]): Racha | null {
  const resultados = ordenarCronologico(cuentan)
    .map(resultadoPartido)
    .filter((r) => r !== null)
  const ultimo = resultados[resultados.length - 1]
  if (!ultimo) return null
  let cantidad = 0
  for (let i = resultados.length - 1; i >= 0 && resultados[i] === ultimo; i--) cantidad++
  return { tipo: ultimo === 'ganado' ? 'victorias' : 'derrotas', cantidad }
}

/** Máxima secuencia de victorias consecutivas en todo el historial. */
export function mejorRacha(cuentan: Partido[]): number {
  let mejor = 0
  let actual = 0
  for (const p of ordenarCronologico(cuentan)) {
    const r = resultadoPartido(p)
    if (r === null) continue
    actual = r === 'ganado' ? actual + 1 : 0
    mejor = Math.max(mejor, actual)
  }
  return mejor
}

/**
 * Sets con 7-6 o 6-7, o con tie-break cargado. Solo cuentan sets con games
 * cargados. Un super tie-break (10-8) no es un set 7-6, así que no cuenta.
 */
export function estadisticasTiebreak(cuentan: Partido[]): ResumenVictorias {
  let ganados = 0
  let perdidos = 0
  for (const p of cuentan) {
    for (const s of p.sets) {
      if (!tieneGames(s)) continue
      const es76 = Math.max(s.misGames, s.susGames) === 7 && Math.min(s.misGames, s.susGames) === 6
      if (!es76 && !s.tiebreak) continue
      if (s.gane) ganados++
      else perdidos++
    }
  }
  return resumen(ganados, perdidos)
}

/**
 * Partidos ganados habiendo perdido el primer set. Si el primer set quedó a
 * medias (retiro durante el primer set), no se considera perdido.
 * Devuelve en orden cronológico.
 */
export function remontadas(cuentan: Partido[]): { cantidad: number; partidos: Partido[] } {
  const lista = ordenarCronologico(cuentan).filter((p) => {
    const primero = p.sets[0]
    return (
      resultadoPartido(p) === 'ganado' && primero !== undefined && !primero.gane && setTerminado(primero, p.sets.length === 1)
    )
  })
  return { cantidad: lista.length, partidos: lista }
}

export interface Mes {
  mes: string // 'yyyy-mm'
  titulo: string // 'Octubre 2026'
  ganados: number
  perdidos: number
}

/**
 * Ganados/perdidos por mes, en orden cronológico, para barras apiladas.
 * Incluye en cero los meses sin partidos entre el primero y el último, para
 * que el eje del gráfico no saltee meses. `rango` (yyyy-mm) extiende el eje
 * hasta esos meses aunque no tengan partidos (ej. "últimos 12 meses").
 */
export function partidosPorMes(cuentan: Partido[], rango: { mesDesde?: string; mesHasta?: string } = {}): Mes[] {
  const conteo = new Map<string, { ganados: number; perdidos: number }>()
  for (const p of cuentan) {
    const r = resultadoPartido(p)
    if (r === null) continue
    const mes = p.fecha.slice(0, 7)
    const c = conteo.get(mes) ?? { ganados: 0, perdidos: 0 }
    if (r === 'ganado') c.ganados++
    else c.perdidos++
    conteo.set(mes, c)
  }
  const meses = [...conteo.keys(), rango.mesDesde, rango.mesHasta].filter((m): m is string => !!m).sort()
  if (meses.length === 0) return []

  const resultado: Mes[] = []
  let [anio, mes] = (rango.mesDesde ?? meses[0]).split('-').map(Number)
  const ultimo = rango.mesHasta ?? meses[meses.length - 1]
  for (;;) {
    const clave = `${anio}-${String(mes).padStart(2, '0')}`
    resultado.push({ mes: clave, titulo: tituloMes(clave), ...(conteo.get(clave) ?? { ganados: 0, perdidos: 0 }) })
    if (clave === ultimo) return resultado
    mes++
    if (mes > 12) {
      mes = 1
      anio++
    }
  }
}

export const VENTANA_MOVIL = 10

export interface PuntoEvolucion {
  /** 1, 2, 3… (número de partido que cuenta) */
  numero: number
  partidoId: ID
  fecha: string
  /** % de victorias acumulado hasta este partido inclusive */
  acumulado: number
  /** % de victorias de los últimos 10 partidos; null hasta tener 10 */
  movil: number | null
}

/** Un punto por partido, en orden cronológico: % acumulado y % móvil de los últimos 10. */
export function evolucionPorcentaje(cuentan: Partido[]): PuntoEvolucion[] {
  const ordenados = ordenarCronologico(cuentan).filter((p) => resultadoPartido(p) !== null)
  const gano = ordenados.map((p) => resultadoPartido(p) === 'ganado')
  const puntos: PuntoEvolucion[] = []
  let ganadosAcumulados = 0
  let ganadosVentana = 0
  gano.forEach((g, i) => {
    if (g) ganadosAcumulados++
    if (g) ganadosVentana++
    if (i >= VENTANA_MOVIL && gano[i - VENTANA_MOVIL]) ganadosVentana--
    puntos.push({
      numero: i + 1,
      partidoId: ordenados[i].id,
      fecha: ordenados[i].fecha,
      acumulado: (ganadosAcumulados / (i + 1)) * 100,
      movil: i + 1 >= VENTANA_MOVIL ? (ganadosVentana / VENTANA_MOVIL) * 100 : null,
    })
  })
  return puntos
}

export interface HeadToHead {
  ganados: number
  perdidos: number
  /** 0 a 100; null si no hay partidos que cuenten */
  porcentaje: number | null
  /** Racha actual contra este rival */
  racha: Racha | null
  setsAFavor: number
  setsEnContra: number
  /** Último partido que cuenta contra este rival */
  ultimo: { partido: Partido; resultado: 'ganado' | 'perdido' } | null
  /** Todos los partidos contra el rival (también WO y suspendidos), más recientes primero */
  partidos: Partido[]
}

/**
 * Head to head contra un rival. G-P, sets y último resultado salen de los
 * partidos que cuentan; los sets que quedaron a medias (retiro) no suman.
 * La lista incluye todos los partidos, para mostrarlos en el historial.
 */
export function headToHead(partidos: Partido[], rivalId: ID, opciones: OpcionesEstadisticas): HeadToHead {
  const delRival = partidos.filter((p) => p.rivalId === rivalId)
  const cuentan = partidosQueCuentan(delRival, opciones)

  let setsAFavor = 0
  let setsEnContra = 0
  for (const p of cuentan) {
    p.sets.forEach((s, i) => {
      if (!setTerminado(s, i === p.sets.length - 1)) return
      if (s.gane) setsAFavor++
      else setsEnContra++
    })
  }

  const { ganados, perdidos, porcentaje } = porcentajeVictorias(cuentan)
  const ultimoPartido = cuentan[cuentan.length - 1]
  return {
    ganados,
    perdidos,
    porcentaje,
    racha: rachaActual(cuentan),
    setsAFavor,
    setsEnContra,
    ultimo: ultimoPartido
      ? { partido: ultimoPartido, resultado: resultadoPartido(ultimoPartido) as 'ganado' | 'perdido' }
      : null,
    partidos: ordenarCronologico(delRival).reverse(),
  }
}

export interface FilaRankingRival extends ResumenVictorias {
  rivalId: ID
}

/**
 * G-P y % contra cada rival con al menos un partido que cuenta.
 * Orden: más partidos primero; a igual cantidad, mejor % primero.
 */
export function rankingRivales(cuentan: Partido[]): FilaRankingRival[] {
  const porRival = new Map<ID, Partido[]>()
  for (const p of cuentan) porRival.set(p.rivalId, [...(porRival.get(p.rivalId) ?? []), p])
  return [...porRival]
    .map(([rivalId, ps]) => ({ rivalId, ...porcentajeVictorias(ps) }))
    .filter((f) => f.total > 0)
    .sort((a, b) => b.total - a.total || (b.porcentaje ?? 0) - (a.porcentaje ?? 0))
}
